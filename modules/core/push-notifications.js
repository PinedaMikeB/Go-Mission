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
  messaging: null,
  isSupported: false,
  permissionStatus: 'default', // 'default', 'granted', 'denied'
  
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
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      console.log('[PushNotifications] Service Worker registered:', registration.scope);
      
      // Initialize Firebase Messaging
      if (typeof firebase !== 'undefined' && firebase.messaging) {
        this.messaging = firebase.messaging();
        
        // Handle foreground messages
        this.messaging.onMessage((payload) => {
          console.log('[PushNotifications] Foreground message:', payload);
          this.showForegroundNotification(payload);
        });
      }
      
      // If already granted, get token
      if (this.permissionStatus === 'granted') {
        await this.getToken();
      }
      
      console.log('[PushNotifications] Ready. Permission:', this.permissionStatus);
      return true;
      
    } catch (error) {
      console.error('[PushNotifications] Init error:', error);
      return false;
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
    if (!this.messaging) {
      console.log('[PushNotifications] Messaging not initialized');
      return null;
    }
    
    try {
      // Get the VAPID key from Firebase Console > Project Settings > Cloud Messaging
      // For now, we'll use the default method
      const token = await this.messaging.getToken({
        vapidKey: window.FIREBASE_VAPID_KEY || undefined,
        serviceWorkerRegistration: await navigator.serviceWorker.ready
      });
      
      if (token) {
        console.log('[PushNotifications] Token:', token.substring(0, 20) + '...');
        this.token = token;
        
        // Register token with backend
        await this.registerTokenWithBackend(token);
        
        return token;
      } else {
        console.log('[PushNotifications] No token available');
        return null;
      }
    } catch (error) {
      console.error('[PushNotifications] Token error:', error);
      return null;
    }
  },
  
  /**
   * Register FCM token with Firebase
   */
  async registerTokenWithBackend(token) {
    if (!window.currentUser || !window.db) {
      console.log('[PushNotifications] User not logged in');
      return;
    }
    
    try {
      // Add token to user's document
      await window.setDoc(window.doc(window.db, 'goMission_members', window.currentUser.uid), {
        fcmTokens: window.arrayUnion(token),
        lastTokenUpdate: window.serverTimestamp()
      }, { merge: true });
      
      console.log('[PushNotifications] Token registered with backend');
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
      await window.setDoc(window.doc(window.db, 'goMission_members', window.currentUser.uid), {
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
        title: notification.title,
        body: notification.body,
        type: data?.type || 'general',
        data: data
      });
    }
    
    // Show toast notification
    this.showToast(notification.title, notification.body);
  },
  
  /**
   * Show toast notification in app
   */
  showToast(title, body) {
    // Create toast element
    const toast = document.createElement('div');
    toast.className = 'fixed top-4 right-4 z-[100] bg-[var(--card-bg)] border border-amber-500/30 rounded-xl p-4 shadow-xl max-w-sm animate-slide-in';
    toast.innerHTML = `
      <div class="flex items-start gap-3">
        <span class="text-2xl">🔔</span>
        <div class="flex-1">
          <p class="font-bold text-[var(--text-color)] text-sm">${title}</p>
          <p class="text-[var(--text-muted)] text-xs mt-1">${body}</p>
        </div>
        <button onclick="this.parentElement.parentElement.remove()" class="text-[var(--text-muted)] hover:text-[var(--text-color)]">
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
    prompt.className = 'fixed bottom-20 left-4 right-4 z-[100] bg-[var(--card-bg)] border border-amber-500/30 rounded-xl p-4 shadow-xl md:left-auto md:right-4 md:max-w-sm';
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
  }
};

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => PushNotifications.init(), 1000);
  });
} else {
  setTimeout(() => PushNotifications.init(), 1000);
}

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PushNotifications;
}
