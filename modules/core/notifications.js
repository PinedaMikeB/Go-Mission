/**
 * Go Mission - Notifications Module
 * In-app notifications with toast messages and badge counts
 * 
 * Features:
 * - Toast notifications (bottom popup)
 * - Badge count on icons
 * - Sound alerts (optional)
 * - Real-time listener for new messages
 */

const Notifications = {
  // State
  unreadCount: 0,
  lastReadTimestamp: null,
  unsubscribe: null,
  toastQueue: [],
  isProcessingQueue: false,
  
  // Settings
  settings: {
    sound: true,
    toast: true,
    vibrate: true
  },
  
  /**
   * Initialize notifications
   */
  async init() {
    console.log('[Notifications] Initializing...');
    
    if (!window.currentUser) {
      console.log('[Notifications] No user logged in');
      return;
    }
    
    // Load last read timestamp from localStorage
    this.lastReadTimestamp = localStorage.getItem(`lastRead_${window.currentUser.uid}`) 
      ? new Date(localStorage.getItem(`lastRead_${window.currentUser.uid}`))
      : new Date();
    
    // Load settings
    this.loadSettings();
    
    // Create notification container if not exists
    this.createNotificationContainer();
    
    // Show header chat button if user is in a group
    if (Groups?.currentGroup) {
      const headerBtn = document.getElementById('headerChatBadge');
      if (headerBtn) {
        headerBtn.classList.remove('hidden');
      }
      // Start listening for new messages
      this.subscribeToGroupMessages();
    }
    
    console.log('[Notifications] Ready');
  },
  
  /**
   * Load notification settings from localStorage
   */
  loadSettings() {
    const saved = localStorage.getItem('notificationSettings');
    if (saved) {
      this.settings = { ...this.settings, ...JSON.parse(saved) };
    }
  },
  
  /**
   * Save notification settings
   */
  saveSettings() {
    localStorage.setItem('notificationSettings', JSON.stringify(this.settings));
  },
  
  /**
   * Create the notification toast container
   */
  createNotificationContainer() {
    if (document.getElementById('notificationContainer')) return;
    
    const container = document.createElement('div');
    container.id = 'notificationContainer';
    container.className = 'fixed bottom-20 left-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none';
    document.body.appendChild(container);
  },
  
  /**
   * Subscribe to real-time group messages
   */
  subscribeToGroupMessages() {
    if (!Groups?.currentGroup || !window.db) return;
    
    // Unsubscribe from previous listener
    if (this.unsubscribe) {
      this.unsubscribe();
    }
    
    console.log('[Notifications] Subscribing to group messages:', Groups.currentGroup.id);
    
    try {
      const chatRef = window.collection(window.db, 'goMission_chats');
      
      // Simple query - just filter by groupId (no orderBy to avoid index requirement)
      const q = window.query(
        chatRef,
        window.where('groupId', '==', Groups.currentGroup.id)
      );
      
      // Use onSnapshot for real-time updates
      if (window.onSnapshot) {
        this.unsubscribe = window.onSnapshot(q, (snapshot) => {
          console.log('[Notifications] Snapshot received, changes:', snapshot.docChanges().length);
          snapshot.docChanges().forEach((change) => {
            if (change.type === 'added') {
              const message = { id: change.doc.id, ...change.doc.data() };
              console.log('[Notifications] New message detected:', message.senderName);
              this.handleNewMessage(message);
            }
          });
        }, (error) => {
          console.error('[Notifications] Snapshot error:', error);
        });
        console.log('[Notifications] Subscribed successfully');
      } else {
        console.warn('[Notifications] onSnapshot not available, falling back to polling');
        // Fallback to polling
        this.startPolling();
      }
    } catch (error) {
      console.error('[Notifications] Error subscribing:', error);
    }
  },
  
  /**
   * Fallback polling for notifications
   */
  startPolling() {
    if (this.pollInterval) clearInterval(this.pollInterval);
    
    this.pollInterval = setInterval(async () => {
      if (!Groups?.currentGroup || GroupChat?.isOpen) return;
      
      try {
        const chatRef = window.collection(window.db, 'goMission_chats');
        const q = window.query(
          chatRef,
          window.where('groupId', '==', Groups.currentGroup.id),
          window.limit(10)
        );
        
        const snapshot = await window.getDocs(q);
        snapshot.forEach(doc => {
          const message = { id: doc.id, ...doc.data() };
          this.handleNewMessage(message);
        });
      } catch (e) {
        console.error('[Notifications] Polling error:', e);
      }
    }, 5000);
  },
  
  /**
   * Handle new incoming message
   */
  handleNewMessage(message) {
    // Don't notify for own messages
    if (message.senderId === window.currentUser?.uid) return;
    
    // Don't notify for old messages (before last read)
    const msgTime = message.createdAt?.toDate?.() || new Date(message.createdAt);
    if (msgTime <= this.lastReadTimestamp) return;
    
    // Don't notify if chat is currently open
    if (GroupChat?.isOpen) {
      this.markAsRead();
      return;
    }
    
    console.log('[Notifications] New message from:', message.senderName);
    
    // Increment unread count
    this.unreadCount++;
    this.updateBadge();
    
    // Show toast notification
    if (this.settings.toast) {
      this.showToast({
        title: message.senderName,
        body: message.type === 'devotion' 
          ? '📖 Shared a devotion' 
          : this.truncate(message.text, 50),
        icon: message.senderPhoto,
        onClick: () => GroupChat?.open()
      });
    }
    
    // Play sound
    if (this.settings.sound) {
      this.playSound();
    }
    
    // Vibrate (mobile)
    if (this.settings.vibrate && navigator.vibrate) {
      navigator.vibrate(200);
    }
  },

  /**
   * Add a generic in-app notification (used by push notification foreground handler)
   */
  addNotification(notification = {}) {
    const title = notification.title || 'New notification';
    const body = notification.body || '';
    const icon = notification.icon || null;
    const data = notification.data || {};
    const type = notification.type || notification.data?.type || 'general';
    let onClick = typeof notification.onClick === 'function' ? notification.onClick : null;

    if (!onClick && (type === 'dm' || type === 'direct_message') && data.senderId) {
      onClick = () => {
        if (typeof ChatApp !== 'undefined' && typeof ChatApp.openDirectChat === 'function') {
          Promise.resolve(ChatApp.open())
            .then(() => {
              ChatApp.setTab?.('direct');
              return ChatApp.openDirectChat(data.senderId);
            })
            .catch((error) => {
              console.warn('[Notifications] DM click handler failed:', error);
            });
        }
      };
    }

    if (!onClick && (type === 'chat' || type === 'chat_mention') && data.groupId) {
      onClick = () => {
        const group = (typeof MyGroups !== 'undefined' && typeof MyGroups.getGroupById === 'function')
          ? MyGroups.getGroupById(data.groupId)
          : null;
        if (group && typeof Groups !== 'undefined') {
          Groups.currentGroup = group;
          GroupChat?.open?.();
          return;
        }
        if (typeof ChatApp !== 'undefined') {
          Promise.resolve(ChatApp.open())
            .then(() => ChatApp.setTab?.('groups'))
            .catch((error) => {
              console.warn('[Notifications] Group click fallback failed:', error);
            });
        }
      };
    }

    // Prevent duplicate chat alerts when chat module already handles them.
    if (type === 'chat' && typeof GroupChat !== 'undefined' && GroupChat?.isOpen) {
      return;
    }

    this.unreadCount++;
    this.updateBadge();

    if (this.settings.toast) {
      this.showToast({
        title,
        body,
        icon,
        onClick
      });
    }

    if (document.hidden) {
      this.showBrowserNotification(title, body, icon);
    }

    if (this.settings.sound) {
      this.playSound();
    }

    if (this.settings.vibrate && navigator.vibrate) {
      navigator.vibrate(200);
    }
  },
  
  /**
   * Show a toast notification
   */
  showToast({ title, body, icon, onClick, duration = 4000 }) {
    this.toastQueue.push({ title, body, icon, onClick, duration });
    this.processToastQueue();
  },
  
  /**
   * Process toast queue (show one at a time)
   */
  processToastQueue() {
    if (this.isProcessingQueue || this.toastQueue.length === 0) return;
    
    this.isProcessingQueue = true;
    const { title, body, icon, onClick, duration } = this.toastQueue.shift();
    
    const container = document.getElementById('notificationContainer');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `
      bg-[#2a0505] border border-amber-500/30 rounded-xl p-3 shadow-lg 
      transform translate-y-full opacity-0 transition-all duration-300
      pointer-events-auto cursor-pointer flex items-center gap-3
    `;
    toast.innerHTML = `
      <img src="${icon || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(title) + '&background=4a0404&color=fbbf24'}" 
           class="w-10 h-10 rounded-full flex-shrink-0 border border-amber-500/30">
      <div class="flex-1 min-w-0">
        <p class="text-amber-400 font-bold text-sm truncate">${this.escapeHtml(title)}</p>
        <p class="text-slate-300 text-xs truncate">${this.escapeHtml(body)}</p>
      </div>
      <button class="text-slate-500 hover:text-slate-300 p-1" onclick="event.stopPropagation(); this.parentElement.remove();">
        ✕
      </button>
    `;
    
    if (onClick) {
      toast.addEventListener('click', () => {
        toast.remove();
        onClick();
      });
    }
    
    container.appendChild(toast);
    
    // Animate in
    requestAnimationFrame(() => {
      toast.classList.remove('translate-y-full', 'opacity-0');
    });
    
    // Auto remove
    setTimeout(() => {
      toast.classList.add('translate-y-full', 'opacity-0');
      setTimeout(() => {
        toast.remove();
        this.isProcessingQueue = false;
        this.processToastQueue();
      }, 300);
    }, duration);
  },
  
  /**
   * Update badge count on UI elements
   */
  updateBadge() {
    const count = this.unreadCount;
    const badgeText = count > 99 ? '99+' : count.toString();
    
    // Update header notification badge (next to language toggle)
    const headerBadge = document.getElementById('headerNotificationBadge');
    const headerBtn = document.getElementById('headerChatBadge');
    if (headerBadge && headerBtn) {
      if (count > 0) {
        headerBadge.textContent = badgeText;
        headerBadge.classList.remove('hidden');
        headerBtn.classList.remove('hidden');
      } else {
        headerBadge.classList.add('hidden');
        // Keep button visible if user is in a group
        if (Groups?.currentGroup) {
          headerBtn.classList.remove('hidden');
        }
      }
    }
    
    // Update chat badge in Mission Group card
    const chatBadge = document.getElementById('chatNotificationBadge');
    if (chatBadge) {
      if (count > 0) {
        chatBadge.textContent = badgeText;
        chatBadge.classList.remove('hidden');
      } else {
        chatBadge.classList.add('hidden');
      }
    }
    
    // Update group card badge
    const groupBadge = document.getElementById('groupNotificationBadge');
    if (groupBadge) {
      if (count > 0) {
        groupBadge.textContent = badgeText;
        groupBadge.classList.remove('hidden');
      } else {
        groupBadge.classList.add('hidden');
      }
    }
    
    // Update page title with unread count
    if (count > 0) {
      document.title = `(${count}) Go Mission`;
    } else {
      document.title = 'Go Mission - Making Disciple-Makers';
    }

    // Keep Messages inbox badge in sync with notification state.
    if (typeof ChatApp !== 'undefined' && typeof ChatApp.updateBadges === 'function') {
      ChatApp.updateBadges();
    }
  },
  
  /**
   * Mark messages as read
   */
  markAsRead() {
    this.unreadCount = 0;
    this.lastReadTimestamp = new Date();
    localStorage.setItem(`lastRead_${window.currentUser?.uid}`, this.lastReadTimestamp.toISOString());
    this.updateBadge();
  },
  
  /**
   * Play notification sound
   */
  playSound() {
    try {
      // Use Web Audio API for a simple notification sound
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      gainNode.gain.value = 0.1;
      
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.1);
      
      // Second beep
      setTimeout(() => {
        const osc2 = audioContext.createOscillator();
        osc2.connect(gainNode);
        osc2.frequency.value = 1000;
        osc2.type = 'sine';
        osc2.start();
        osc2.stop(audioContext.currentTime + 0.1);
      }, 150);
    } catch (e) {
      console.log('[Notifications] Sound not available');
    }
  },
  
  /**
   * Request browser notification permission
   */
  async requestPermission() {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  },
  
  /**
   * Show browser notification (when app is in background)
   */
  showBrowserNotification(title, body, icon) {
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification(title, {
        body: body,
        icon: icon || '/icons/icon-192.png',
        badge: '/icons/icon-72.png',
        tag: 'gomission-chat',
        renotify: true
      });
      
      notification.onclick = () => {
        window.focus();
        GroupChat?.open();
        notification.close();
      };
    }
  },
  
  /**
   * Cleanup
   */
  destroy() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  },
  
  // Utility functions
  truncate(str, length) {
    if (!str) return '';
    return str.length > length ? str.substring(0, length) + '...' : str;
  },
  
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
  }
};

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Notifications;
}
