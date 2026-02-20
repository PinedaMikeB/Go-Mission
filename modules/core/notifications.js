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
  unsubscribe: null, // legacy single listener
  groupUnsubscribes: [],
  groupWatchSignature: '',
  groupWatchSyncInterval: null,
  seenMessageIds: new Set(),
  seenMessageOrder: [],
  lastUnreadTarget: null,
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
    
    await this.refreshGroupSubscriptions();
    this.startGroupWatchSync();
    this.lastUnreadTarget = this.loadStoredUnreadTarget();
    
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
   * Resolve all groups user should watch for chat notifications
   */
  getWatchGroupIds() {
    const ids = [];
    const push = (id) => {
      if (!id || ids.includes(id)) return;
      ids.push(id);
    };

    if (Groups?.currentGroup?.id) {
      push(Groups.currentGroup.id);
    }

    if (typeof MyGroups !== 'undefined') {
      if (MyGroups.uplineGroup?.id) push(MyGroups.uplineGroup.id);
      (MyGroups.downlineGroups || []).forEach((group) => push(group?.id));
      (MyGroups.guestGroups || []).forEach((group) => push(group?.id));
    }

    return ids;
  },

  /**
   * Build stable hash key for watched group IDs
   */
  getWatchGroupSignature(groupIds = []) {
    return [...new Set(groupIds.filter(Boolean))].sort().join('|');
  },

  /**
   * Keep subscriptions in sync if group membership changes while app is open
   */
  startGroupWatchSync() {
    if (this.groupWatchSyncInterval) {
      clearInterval(this.groupWatchSyncInterval);
      this.groupWatchSyncInterval = null;
    }

    this.groupWatchSyncInterval = setInterval(() => {
      const nextSignature = this.getWatchGroupSignature(this.getWatchGroupIds());
      if (nextSignature === this.groupWatchSignature) return;
      Promise.resolve(this.refreshGroupSubscriptions()).catch((error) => {
        console.warn('[Notifications] Failed to refresh group subscriptions:', error);
      });
    }, 4000);
  },

  /**
   * Refresh real-time subscriptions for group messages
   */
  async refreshGroupSubscriptions() {
    if (!window.db || !window.currentUser) return;

    const groupIds = this.getWatchGroupIds();
    this.groupWatchSignature = this.getWatchGroupSignature(groupIds);
    this.clearGroupSubscriptions();

    const headerBtn = document.getElementById('headerChatBadge');
    if (headerBtn) {
      if (groupIds.length > 0) headerBtn.classList.remove('hidden');
      else headerBtn.classList.add('hidden');
    }

    if (!groupIds.length) return;

    if (!window.onSnapshot) {
      console.warn('[Notifications] onSnapshot not available, falling back to polling');
      this.startPolling();
      return;
    }

    console.log('[Notifications] Subscribing to group messages:', groupIds);
    for (const groupId of groupIds) {
      try {
        const q = window.query(
          window.collection(window.db, 'goMission_chats'),
          window.where('groupId', '==', groupId)
        );

        const unsubscribe = window.onSnapshot(q, (snapshot) => {
          snapshot.docChanges().forEach((change) => {
            if (change.type !== 'added') return;
            const message = { id: change.doc.id, ...change.doc.data() };
            if (!this.rememberSeenMessage(message.id)) return;
            this.handleNewMessage(message, groupId);
          });
        }, (error) => {
          console.error('[Notifications] Snapshot error:', groupId, error);
        });

        this.groupUnsubscribes.push(unsubscribe);
      } catch (error) {
        console.error('[Notifications] Error subscribing to group:', groupId, error);
      }
    }
  },

  /**
   * Keep a bounded set of recently-seen message IDs to avoid duplicate toasts
   */
  rememberSeenMessage(messageId) {
    if (!messageId) return true;
    if (this.seenMessageIds.has(messageId)) return false;
    this.seenMessageIds.add(messageId);
    this.seenMessageOrder.push(messageId);
    if (this.seenMessageOrder.length > 800) {
      const oldest = this.seenMessageOrder.shift();
      if (oldest) this.seenMessageIds.delete(oldest);
    }
    return true;
  },

  /**
   * Clear active group subscriptions
   */
  clearGroupSubscriptions() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    if (this.groupUnsubscribes.length) {
      this.groupUnsubscribes.forEach((fn) => {
        try { fn(); } catch (_) {}
      });
      this.groupUnsubscribes = [];
    }
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  },
  
  /**
   * Fallback polling for notifications
   */
  startPolling() {
    if (this.pollInterval) clearInterval(this.pollInterval);
    
    this.pollInterval = setInterval(async () => {
      const groupIds = this.getWatchGroupIds();
      if (!groupIds.length) return;
      
      try {
        for (const groupId of groupIds) {
          const q = window.query(
            window.collection(window.db, 'goMission_chats'),
            window.where('groupId', '==', groupId),
            window.limit(25)
          );
          
          const snapshot = await window.getDocs(q);
          snapshot.forEach(doc => {
            const message = { id: doc.id, ...doc.data() };
            if (!this.rememberSeenMessage(message.id)) return;
            this.handleNewMessage(message, groupId);
          });
        }
      } catch (e) {
        console.error('[Notifications] Polling error:', e);
      }
    }, 5000);
  },
  
  /**
   * Remember the newest unread thread target for quick navigation.
   */
  setLastUnreadTarget(target = null) {
    if (!target || typeof target !== 'object') return;
    this.lastUnreadTarget = {
      ...target,
      capturedAt: Date.now()
    };
    this.persistUnreadTarget();
  },

  /**
   * Storage key for latest unread target
   */
  getUnreadTargetStorageKey() {
    const uid = window.currentUser?.uid;
    return uid ? `lastUnreadTarget_${uid}` : null;
  },

  /**
   * Persist unread target so badge routing survives refresh/reopen.
   */
  persistUnreadTarget() {
    try {
      const key = this.getUnreadTargetStorageKey();
      if (!key) return;
      if (!this.lastUnreadTarget) {
        localStorage.removeItem(key);
        return;
      }
      localStorage.setItem(key, JSON.stringify(this.lastUnreadTarget));
    } catch (_) {}
  },

  /**
   * Load unread target from storage.
   */
  loadStoredUnreadTarget() {
    try {
      const key = this.getUnreadTargetStorageKey();
      if (!key) return null;
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return (parsed && typeof parsed === 'object') ? parsed : null;
    } catch (_) {
      return null;
    }
  },

  /**
   * Open the most recent unread target; fallback to Messages inbox.
   */
  openLastUnreadTarget() {
    const target = this.lastUnreadTarget;
    this.lastUnreadTarget = null;
    this.persistUnreadTarget();

    if (!target) {
      if (typeof ChatApp !== 'undefined' && typeof ChatApp.open === 'function') {
        ChatApp.open();
      }
      return;
    }

    if (target.type === 'group' && target.groupId) {
      this.openGroupFromNotification(target.groupId, target.messageId || null);
      return;
    }

    if (target.type === 'dm' && target.senderId) {
      if (typeof ChatApp !== 'undefined' && typeof ChatApp.openDirectChat === 'function') {
        Promise.resolve(ChatApp.open())
          .then(() => {
            ChatApp.setTab?.('direct');
            return ChatApp.openDirectChat(target.senderId);
          })
          .catch((error) => {
            console.warn('[Notifications] Could not open DM from unread target:', error);
          });
      }
      return;
    }

    if (typeof ChatApp !== 'undefined' && typeof ChatApp.open === 'function') {
      ChatApp.open();
    }
  },

  /**
   * Handle new incoming message
   */
  handleNewMessage(message, groupIdOverride = null) {
    const groupId = groupIdOverride || message.groupId || null;

    // Don't notify for own messages
    if (message.senderId === window.currentUser?.uid) return;

    const currentUid = window.currentUser?.uid;
    const mentionIds = Array.isArray(message.mentionedUserIds)
      ? message.mentionedUserIds
      : Array.isArray(message.mentions)
        ? message.mentions.map((mention) => (typeof mention === 'string' ? mention : mention?.uid)).filter(Boolean)
        : [];
    const isMention = !!(currentUid && mentionIds.includes(currentUid));
    
    // Don't notify for old messages (before last read)
    const msgTime = message.createdAt?.toDate?.() || new Date(message.createdAt);
    if (msgTime <= this.lastReadTimestamp) return;
    
    // Don't notify for active group thread unless user was directly mentioned.
    if (GroupChat?.isOpen && groupId && GroupChat.currentGroupId === groupId && !isMention) {
      return;
    }
    
    const senderLabel = message.senderName || 'Someone';

    console.log('[Notifications] New message from:', senderLabel, 'group:', groupId, 'mention:', isMention);
    
    // Increment unread count
    this.unreadCount++;
    this.setLastUnreadTarget({
      type: 'group',
      groupId,
      messageId: message.id || null
    });
    this.updateBadge();
    
    // Show toast notification
    if (this.settings.toast) {
      this.showToast({
        title: isMention ? `📣 Mention by ${senderLabel}` : senderLabel,
        body: message.type === 'devotion'
          ? '📖 Shared a devotion'
          : isMention
            ? `mentioned you: ${this.truncate(message.text, 70)}`
            : this.truncate(message.text, 50),
        icon: message.senderPhoto,
        onClick: () => this.openGroupFromNotification(groupId, message.id || null)
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
   * Open a specific group thread from notification context
   */
  openGroupFromNotification(groupId, messageId = null) {
    if (!groupId) return;

    const group = (typeof MyGroups !== 'undefined' && typeof MyGroups.getGroupById === 'function')
      ? MyGroups.getGroupById(groupId)
      : null;

    if (group && typeof Groups !== 'undefined') {
      Groups.currentGroup = group;
      if (typeof GroupChat !== 'undefined') {
        GroupChat.pendingFocusMessageId = messageId || null;
      }
      GroupChat?.open?.();
      return;
    }

    if (typeof ChatApp !== 'undefined') {
      Promise.resolve(ChatApp.open())
        .then(() => {
          if (typeof ChatApp.openGroupChat === 'function') {
            const opened = ChatApp.openGroupChat(groupId, messageId || null);
            if (opened) return;
          }
          ChatApp.setTab?.('groups');
        })
        .catch((error) => {
          console.warn('[Notifications] Could not open group from notification:', error);
        });
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
      this.setLastUnreadTarget({
        type: 'dm',
        senderId: data.senderId,
        threadId: data.threadId || null,
        messageId: data.messageId || null
      });
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
      this.setLastUnreadTarget({
        type: 'group',
        groupId: data.groupId,
        messageId: data.messageId || null
      });
      onClick = () => this.openGroupFromNotification(data.groupId, data.messageId || null);
    }

    // Prevent duplicate chat alerts when chat module already handles them.
    if (
      type === 'chat'
      && typeof GroupChat !== 'undefined'
      && GroupChat?.isOpen
      && (!data.groupId || GroupChat.currentGroupId === data.groupId)
    ) {
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
    this.lastUnreadTarget = null;
    this.persistUnreadTarget();
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
    this.clearGroupSubscriptions();
    if (this.groupWatchSyncInterval) {
      clearInterval(this.groupWatchSyncInterval);
      this.groupWatchSyncInterval = null;
    }
    this.groupWatchSignature = '';
    this.seenMessageIds.clear();
    this.seenMessageOrder = [];
    this.lastUnreadTarget = null;
    this.persistUnreadTarget();
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
