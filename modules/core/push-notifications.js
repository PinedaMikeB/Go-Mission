/**
 * Go Mission - Push Notifications Module
 * Handles FCM token registration and notification permissions
 * 
 * Usage:
 * - PushNotifications.init() - Initialize on app load
 * - PushNotifications.requestPermission() - Ask user for permission
 * - PushNotifications.getToken() - Get current FCM token
 */

const PushNotifications = {
  // State
  token: null,
  isSupported: false,
  permissionStatus: 'default',
  swRegistration: null,
  
  /**
   * Initialize push notifications
   */
  async init() {
    console.log('[PushNotifications] Initializing...');
    
    // Check browser support
    if (!('Notification' in window)) {
      console.log('[PushNotifications] Notifications not supported');
      return false;
    }
    
    if (!('serviceWorker' in navigator)) {
      console.log('[PushNotifications] Service Workers not supported');
      return false;
    }
    
    this.isSupported = true;
    this.permissionStatus = Notification.permission;
    
    // Register service worker
    try {
      this.swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      console.log('[PushNotifications] Service Worker registered:', this.swRegistration.scope);
      
      // Wait for service worker to be ready
      await navigator.serviceWorker.ready;
      console.log('[PushNotifications] Service Worker ready');
      
      // If already granted, get token
      if (this.permissionStatus === 'granted') {
        await this.getToken();
      }
      
      // Set up foreground message handler
      this.setupForegroundHandler();
      
      console.log('[PushNotifications] Ready. Permission:', this.permissionStatus);
      return true;
      
    } catch (error) {
      console.error('[PushNotifications] Init error:', error);
      return false;
    }
  },
  
  /**
   * Setup foreground message handler using the modular SDK
   */
  setupForegroundHandler() {
    if (window.firebaseMessaging && window.onMessagingMessage) {
      window.onMessagingMessage(window.firebaseMessaging, (payload) => {
        console.log('[PushNotifications] Foreground message:', payload);
        this.showForegroundNotification(payload);
      });
    }
  },
  
  /**
   * Request notification permission from user
   */
  async requestPermission() {
    if (!this.isSupported) {
      console.log('[PushNotifications] Not supported');
      return false;
    }
    
    try {
      const permission = await Notification.requestPermission();
      this.permissionStatus = permission;
      
      console.log('[PushNotifications] Permission:', permission);
      
      if (permission === 'granted') {
        await this.getToken();
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('[PushNotifications] Permission error:', error);
      return false;
    }
  },
  
  /**
   * Get FCM token and register with backend
   */
  async getToken() {
    if (!window.firebaseMessaging || !window.getMessagingToken) {
      console.log('[PushNotifications] Firebase Messaging not initialized');
      return null;
    }
    
    if (!this.swRegistration) {
      console.log('[PushNotifications] Service Worker not registered');
      return null;
    }
    
    try {
      // First, try to get existing subscription and unsubscribe if problematic
      const existingSub = await this.swRegistration.pushManager.getSubscription();
      if (existingSub) {
        console.log('[PushNotifications] Found existing subscription, keeping it');
      }
      
      const token = await window.getMessagingToken(window.firebaseMessaging, {
        vapidKey: window.FIREBASE_VAPID_KEY,
        serviceWorkerRegistration: this.swRegistration
      });
      
      if (token) {
        console.log('[PushNotifications] Token obtained:', token.substring(0, 20) + '...');
        this.token = token;
        
        // Register token with backend
        await this.registerTokenWithBackend(token);
        
        return token;
      } else {
        console.log('[PushNotifications] No token available');
        return null;
      }
    } catch (error) {
      console.error('[PushNotifications] Token error:', error.name, error.message);
      
      // If subscription error, try to reset
      if (error.name === 'AbortError' || error.message.includes('push subscription')) {
        console.log('[PushNotifications] Attempting to reset subscription...');
        await this.resetSubscription();
      }
      
      return null;
    }
  },
  
  /**
   * Reset push subscription (for fixing broken subscriptions)
   */
  async resetSubscription() {
    try {
      if (this.swRegistration) {
        const subscription = await this.swRegistration.pushManager.getSubscription();
        if (subscription) {
          await subscription.unsubscribe();
          console.log('[PushNotifications] Old subscription removed');
        }
      }
      
      // Try getting token again after short delay
      setTimeout(async () => {
        try {
          const token = await window.getMessagingToken(window.firebaseMessaging, {
            vapidKey: window.FIREBASE_VAPID_KEY,
            serviceWorkerRegistration: this.swRegistration
          });
          if (token) {
            console.log('[PushNotifications] Token obtained after reset:', token.substring(0, 20) + '...');
            this.token = token;
            await this.registerTokenWithBackend(token);
          }
        } catch (e) {
          console.error('[PushNotifications] Still failed after reset:', e.message);
        }
      }, 1000);
    } catch (error) {
      console.error('[PushNotifications] Reset error:', error);
    }
  },
  
  /**
   * Register FCM token with Firebase
   */
  async registerTokenWithBackend(token) {
    if (!window.currentUser || !window.db) {
      console.log('[PushNotifications] User not logged in, will register later');
      return;
    }
    
    try {
      // Add token to user's document
      const userRef = window.doc(window.db, 'goMission_members', window.currentUser.uid);
      await window.setDoc(userRef, {
        fcmTokens: window.arrayUnion(token),
        lastTokenUpdate: window.serverTimestamp()
      }, { merge: true });
      
      console.log('[PushNotifications] Token registered with backend for user:', window.currentUser.uid);
    } catch (error) {
      console.error('[PushNotifications] Backend registration error:', error);
    }
  },
  
  /**
   * Unregister token (on logout)
   */
  async unregisterToken() {
    if (!this.token || !window.currentUser || !window.db) return;
    
    try {
      const userRef = window.doc(window.db, 'goMission_members', window.currentUser.uid);
      await window.setDoc(userRef, {
        fcmTokens: window.arrayRemove(this.token)
      }, { merge: true });
      
      console.log('[PushNotifications] Token unregistered');
      this.token = null;
    } catch (error) {
      console.error('[PushNotifications] Unregister error:', error);
    }
  },
  
  /**
   * Show notification when app is in foreground
   */
  showForegroundNotification(payload) {
    const { notification, data } = payload;
    
    // Update in-app notification badge
    if (typeof Notifications !== 'undefined') {
      Notifications.addNotification({
        title: notification?.title || 'New notification',
        body: notification?.body || '',
        type: data?.type || 'general',
        data: data
      });
    }
    
    // Show toast notification
    this.showToast(notification?.title || 'New notification', notification?.body || '');
  },
  
  /**
   * Show toast notification in app
   */
  showToast(title, body) {
    // Create toast element
    const toast = document.createElement('div');
    toast.className = 'fixed top-4 right-4 left-4 md:left-auto md:right-4 md:max-w-sm z-[100] bg-[var(--card-bg-solid)] border border-amber-500/30 rounded-xl p-4 shadow-xl animate-slide-in';
    toast.style.animation = 'slideIn 0.3s ease-out';
    toast.innerHTML = `
      <div class="flex items-start gap-3">
        <span class="text-2xl">🔔</span>
        <div class="flex-1 min-w-0">
          <p class="font-bold text-[var(--text-color)] text-sm truncate">${title}</p>
          <p class="text-[var(--text-muted)] text-xs mt-1 line-clamp-2">${body}</p>
        </div>
        <button onclick="this.parentElement.parentElement.remove()" class="text-[var(--text-muted)] hover:text-[var(--text-color)] flex-shrink-0">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
    `;
    
    document.body.appendChild(toast);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 0.3s ease-out';
      setTimeout(() => toast.remove(), 300);
    }, 5000);
  },
  
  /**
   * Show permission prompt UI
   */
  showPermissionPrompt() {
    if (this.permissionStatus !== 'default') return;
    
    const prompt = document.createElement('div');
    prompt.id = 'notificationPrompt';
    prompt.className = 'fixed bottom-20 left-4 right-4 z-[100] bg-[var(--card-bg-solid)] border border-amber-500/30 rounded-xl p-4 shadow-xl md:left-auto md:right-4 md:max-w-sm';
    prompt.innerHTML = `
      <div class="flex items-start gap-3">
        <span class="text-2xl">🔔</span>
        <div class="flex-1">
          <p class="font-bold text-[var(--text-color)] text-sm">Enable Notifications?</p>
          <p class="text-[var(--text-muted)] text-xs mt-1">Get notified when your group members share reflections or send messages.</p>
          <div class="flex gap-2 mt-3">
            <button onclick="PushNotifications.handlePermissionResponse(true)" class="px-4 py-2 bg-amber-500 text-[#2a0505] rounded-lg text-xs font-bold hover:bg-amber-400 transition-colors">
              Enable
            </button>
            <button onclick="PushNotifications.handlePermissionResponse(false)" class="px-4 py-2 bg-[var(--input-bg)] text-[var(--text-muted)] rounded-lg text-xs hover:bg-amber-500/10 transition-colors">
              Not Now
            </button>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(prompt);
  },
  
  /**
   * Handle permission prompt response
   */
  async handlePermissionResponse(allow) {
    const prompt = document.getElementById('notificationPrompt');
    if (prompt) prompt.remove();
    
    if (allow) {
      const granted = await this.requestPermission();
      if (granted) {
        this.showToast('Notifications Enabled! 🎉', 'You\'ll now receive updates from your group.');
      } else {
        this.showToast('Notifications Blocked', 'You can enable them later in your browser settings.');
      }
    } else {
      // Remember that user dismissed (don't show again for a while)
      localStorage.setItem('notificationPromptDismissed', Date.now().toString());
    }
  },
  
  /**
   * Check if should show permission prompt
   */
  shouldShowPrompt() {
    if (!this.isSupported) return false;
    if (this.permissionStatus !== 'default') return false;
    
    // Check if dismissed recently (within 7 days)
    const dismissed = localStorage.getItem('notificationPromptDismissed');
    if (dismissed) {
      const daysSinceDismissed = (Date.now() - parseInt(dismissed)) / (1000 * 60 * 60 * 24);
      if (daysSinceDismissed < 7) return false;
    }
    
    return true;
  },
  
  /**
   * Debug: Check current status
   */
  debug() {
    console.log('[PushNotifications] Debug Info:');
    console.log('  - Supported:', this.isSupported);
    console.log('  - Permission:', this.permissionStatus);
    console.log('  - Token:', this.token ? this.token.substring(0, 20) + '...' : 'none');
    console.log('  - SW Registration:', this.swRegistration ? 'yes' : 'no');
    console.log('  - Firebase Messaging:', window.firebaseMessaging ? 'yes' : 'no');
    console.log('  - VAPID Key:', window.FIREBASE_VAPID_KEY ? 'set' : 'missing');
    return {
      supported: this.isSupported,
      permission: this.permissionStatus,
      hasToken: !!this.token,
      hasSW: !!this.swRegistration
    };
  }
};

// Add CSS for toast animation
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateX(100%);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
`;
document.head.appendChild(style);

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => PushNotifications.init(), 2000);
  });
} else {
  setTimeout(() => PushNotifications.init(), 2000);
}
