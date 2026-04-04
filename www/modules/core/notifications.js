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
  inboxUnsubscribe: null,
  groupUnsubscribes: [],
  groupWatchSignature: '',
  groupWatchSyncInterval: null,
  seenMessageIds: new Set(),
  seenMessageOrder: [],
  lastUnreadTarget: null,
  notificationItems: [],
  maxNotificationItems: 40,
  staleUnreadTtlDays: 7,
  staleUnreadSyncLimit: 200,
  hasRunStaleUnreadCleanup: false,
  toastQueue: [],
  isProcessingQueue: false,
  notificationCenter: {
    overlay: null,
    panel: null,
    list: null,
    empty: null,
    count: null
  },
  isCenterOpen: false,
  
  // Settings
  settings: {
    sound: true,
    toast: true,
    vibrate: true
  },

  /**
   * Storage key for per-user last read timestamp
   */
  getLastReadStorageKey() {
    const uid = window.currentUser?.uid;
    return uid ? `lastRead_${uid}` : null;
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
    const lastReadKey = this.getLastReadStorageKey();
    const storedLastRead = lastReadKey ? localStorage.getItem(lastReadKey) : null;
    const parsedLastRead = this.toDateOrNull(storedLastRead);
    this.lastReadTimestamp = parsedLastRead || new Date();
    if (lastReadKey && !parsedLastRead) {
      localStorage.setItem(lastReadKey, this.lastReadTimestamp.toISOString());
    }
    
    // Load settings
    this.loadSettings();
    
    // Create notification container if not exists
    this.createNotificationContainer();
    this.createNotificationCenter();
    this.loadNotificationHistory();
    this.subscribeToInbox();
    
    await this.refreshGroupSubscriptions();
    this.startGroupWatchSync();
    this.lastUnreadTarget = this.loadStoredUnreadTarget();
    this.updateBadge();
    await this.cleanupStaleUnreadNotifications();
    
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
   * Create the notification center shell once and reuse it.
   */
  createNotificationCenter() {
    if (document.getElementById('notificationCenterOverlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'notificationCenterOverlay';
    overlay.className = 'hidden fixed inset-0 z-[210] bg-black/55 backdrop-blur-[2px]';

    const panel = document.createElement('div');
    panel.id = 'notificationCenterPanel';
    panel.className = 'absolute inset-x-3 top-20 bottom-4 rounded-[28px] border border-amber-500/25 bg-[var(--card-bg-solid)] shadow-2xl overflow-hidden flex flex-col sm:left-auto sm:right-4 sm:inset-x-auto sm:w-[400px] sm:top-20 sm:bottom-auto sm:max-h-[75vh]';

    panel.innerHTML = `
      <div class="px-5 pt-5 pb-4 border-b border-amber-500/15 bg-[linear-gradient(180deg,rgba(245,158,11,0.10),rgba(245,158,11,0.02))]">
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-[11px] uppercase tracking-[0.28em] text-amber-400/80 font-bold">Notification Center</p>
            <h3 class="mt-1 text-lg font-black text-[var(--text-color)]">Recent updates</h3>
          </div>
          <button type="button" data-notification-close class="rounded-full border border-amber-500/25 px-3 py-1.5 text-xs font-bold text-amber-300 hover:bg-amber-500/10">Close</button>
        </div>
        <div class="mt-3 flex items-center justify-between gap-3">
          <p id="notificationCenterCount" class="text-xs text-[var(--text-muted)]">No unread notifications</p>
          <button type="button" data-notification-mark-all class="text-xs font-bold text-amber-300 hover:text-amber-200">Mark all read</button>
        </div>
      </div>
      <div id="notificationCenterList" class="flex-1 overflow-y-auto px-3 py-3 space-y-2"></div>
      <div id="notificationCenterEmpty" class="hidden flex-1 items-center justify-center px-6 py-10 text-center">
        <div>
          <div class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-amber-500/20 bg-amber-500/8 text-amber-300">
            <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path>
            </svg>
          </div>
          <p class="text-sm font-bold text-[var(--text-color)]">No notifications yet</p>
          <p class="mt-1 text-xs text-[var(--text-muted)]">New messages, announcements, and reminders will appear here.</p>
        </div>
      </div>
    `;

    overlay.appendChild(panel);
    document.body.appendChild(overlay);

    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) this.closeCenter();
    });
    panel.querySelector('[data-notification-close]')?.addEventListener('click', () => this.closeCenter());
    panel.querySelector('[data-notification-mark-all]')?.addEventListener('click', () => {
      this.markAsRead({ scope: 'all' });
      this.renderNotificationCenter();
    });

    this.notificationCenter = {
      overlay,
      panel,
      list: panel.querySelector('#notificationCenterList'),
      empty: panel.querySelector('#notificationCenterEmpty'),
      count: panel.querySelector('#notificationCenterCount')
    };
  },

  /**
   * Subscribe to the server-backed inbox so notification history is shared across devices.
   */
  subscribeToInbox() {
    if (this.inboxUnsubscribe) {
      try { this.inboxUnsubscribe(); } catch (_) {}
      this.inboxUnsubscribe = null;
    }

    if (!window.db || !window.currentUser || !window.onSnapshot || !window.collection || !window.query || !window.orderBy || !window.limit) {
      return;
    }

    const inboxQuery = window.query(
      window.collection(window.db, 'goMission_members', window.currentUser.uid, 'notifications'),
      window.orderBy('createdAt', 'desc'),
      window.limit(this.maxNotificationItems)
    );

    this.inboxUnsubscribe = window.onSnapshot(inboxQuery, (snapshot) => {
      const items = snapshot.docs
        .map((docSnap) => this.normalizeNotificationItem({ id: docSnap.id, ...(docSnap.data() || {}) }))
        .filter(Boolean);
      this.notificationItems = items;
      const staleIds = this.expireStaleUnreadNotifications();
      this.persistNotificationHistory();
      this.updateBadge();
      if (staleIds.length) {
        this.syncNotificationsReadState(staleIds, true);
        this.syncUnreadCountToProfile();
      }
      if (this.isCenterOpen) {
        this.renderNotificationCenter();
      }
    }, (error) => {
      console.warn('[Notifications] Failed subscribing to server inbox:', error);
    });
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
   * Notification history storage key
   */
  getNotificationHistoryStorageKey() {
    const uid = window.currentUser?.uid;
    return uid ? `notificationHistory_${uid}` : null;
  },

  /**
   * Restore persisted notification history.
   */
  loadNotificationHistory() {
    try {
      const key = this.getNotificationHistoryStorageKey();
      if (!key) return;
      const raw = localStorage.getItem(key);
      if (!raw) {
        this.notificationItems = [];
        this.syncUnreadCount();
        return;
      }
      const parsed = JSON.parse(raw);
      this.notificationItems = Array.isArray(parsed)
        ? parsed
            .map((item) => this.normalizeNotificationItem(item))
            .filter(Boolean)
            .slice(0, this.maxNotificationItems)
        : [];
      const staleIds = this.expireStaleUnreadNotifications();
      if (staleIds.length) {
        this.persistNotificationHistory();
      }
      this.syncUnreadCount();
    } catch (error) {
      console.warn('[Notifications] Could not load notification history:', error);
      this.notificationItems = [];
      this.syncUnreadCount();
    }
  },

  /**
   * Persist notification history for the current user.
   */
  persistNotificationHistory() {
    try {
      const key = this.getNotificationHistoryStorageKey();
      if (!key) return;
      localStorage.setItem(key, JSON.stringify(this.notificationItems.slice(0, this.maxNotificationItems)));
    } catch (error) {
      console.warn('[Notifications] Could not persist notification history:', error);
    }
  },

  /**
   * Normalize stored notification entries.
   */
  normalizeNotificationItem(item) {
    if (!item || typeof item !== 'object') return null;
    const action = (item.action && typeof item.action === 'object') ? item.action : {};
    return {
      id: String(item.id || `notif_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`),
      title: String(item.title || 'Notification').trim(),
      body: String(item.body || '').trim(),
      icon: item.icon ? String(item.icon) : '',
      type: String(item.type || 'general'),
      unread: item.read === true ? false : item.unread !== false,
      createdAt: item.createdAt || new Date().toISOString(),
      sourceKey: item.sourceKey ? String(item.sourceKey) : '',
      action: {
        kind: String(action.kind || ''),
        groupId: action.groupId ? String(action.groupId) : '',
        senderId: action.senderId ? String(action.senderId) : '',
        threadId: action.threadId ? String(action.threadId) : '',
        messageId: action.messageId ? String(action.messageId) : '',
        announcementId: action.announcementId ? String(action.announcementId) : '',
        episodeId: action.episodeId ? String(action.episodeId) : '',
        url: action.url ? String(action.url) : '',
        title: action.title ? String(action.title) : '',
        body: action.body ? String(action.body) : ''
      }
    };
  },

  /**
   * Capture a push tap so the bell history includes notifications opened from the OS tray.
   */
  capturePushTap(payload = {}) {
    if (!payload || typeof payload !== 'object') return;
    this.recordNotification({
      title: payload.notificationTitle || 'Go Mission Update',
      body: payload.notificationBody || '',
      type: payload.type || 'announcement',
      data: {
        type: payload.type || 'announcement',
        groupId: payload.groupId || null,
        senderId: payload.senderId || null,
        threadId: payload.threadId || null,
        messageId: payload.messageId || null,
        announcementId: payload.announcementId || null
      }
    }, {
      unread: false,
      createdAt: payload.ts || Date.now()
    });
  },

  /**
   * Save a notification into the in-app history.
   */
  recordNotification(notification = {}, options = {}) {
    const title = String(notification.title || 'Notification').trim();
    const body = String(notification.body || '').trim();
    const icon = notification.icon ? String(notification.icon) : '';
    const data = (notification.data && typeof notification.data === 'object') ? notification.data : {};
    const type = String(notification.type || data.type || 'general');
    const unread = options.unread !== false;
    const createdAtRaw = options.createdAt || Date.now();
    const createdAt = this.toDateOrNull(createdAtRaw)?.toISOString() || new Date().toISOString();
    const action = this.buildNotificationAction(type, data, title, body);
    const sourceKey = this.buildNotificationSourceKey(type, action, title, body);
    const entry = this.normalizeNotificationItem({
      id: String(options.id || `notif_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`),
      title,
      body,
      icon,
      type,
      unread,
      createdAt,
      sourceKey,
      action
    });

    if (!entry) return null;

    const existingIndex = sourceKey
      ? this.notificationItems.findIndex((item) => item.sourceKey === sourceKey)
      : -1;
    if (existingIndex >= 0) {
      const existing = this.notificationItems[existingIndex];
      entry.id = existing.id;
      entry.unread = existing.unread || unread;
      this.notificationItems.splice(existingIndex, 1);
    }

    this.notificationItems.unshift(entry);
    this.notificationItems = this.notificationItems.slice(0, this.maxNotificationItems);
    this.syncUnreadCount();
    this.persistNotificationHistory();
    this.updateBadge();
    if (this.isCenterOpen) this.renderNotificationCenter();
    return entry;
  },

  /**
   * Build a stable action object for notification navigation.
   */
  buildNotificationAction(type, data = {}, title = '', body = '') {
    if ((type === 'watch_episode' || type === 'video_episode') && data.episodeId) {
      return {
        kind: 'watch',
        episodeId: data.episodeId
      };
    }

    if (type === 'friend_request') {
      return { kind: 'friend_requests' };
    }

    if ((type === 'dm' || type === 'direct_message' || type === 'friend_request_accepted') && (data.senderId || data.fromId || data.friendId)) {
      return {
        kind: 'dm',
        senderId: data.senderId || data.fromId || data.friendId,
        threadId: data.threadId || '',
        messageId: data.messageId || ''
      };
    }

    if ((type === 'chat' || type === 'chat_mention') && data.groupId) {
      return {
        kind: 'group',
        groupId: data.groupId,
        messageId: data.messageId || ''
      };
    }

    if (data.url) {
      return {
        kind: 'url',
        url: data.url
      };
    }

    if (type === 'announcement' || data.announcementId || title || body) {
      return {
        kind: 'announcement',
        announcementId: data.announcementId || '',
        title,
        body
      };
    }

    if (type === 'devotion') {
      return { kind: 'devotion' };
    }

    return { kind: 'general' };
  },

  /**
   * Create a source key so repeated updates for the same event do not duplicate endlessly.
   */
  buildNotificationSourceKey(type, action = {}, title = '', body = '') {
    if (action.kind === 'watch' && action.episodeId) {
      return `watch:${action.episodeId}`;
    }
    if (action.kind === 'friend_requests') {
      return `friend-requests:${title}|${body}`;
    }
    if (action.kind === 'url' && action.url) {
      return `url:${action.url}`;
    }
    if (action.kind === 'group' && action.groupId) {
      return `group:${action.groupId}:${action.messageId || title}`;
    }
    if (action.kind === 'dm' && action.senderId) {
      return `dm:${action.threadId || action.senderId}:${action.messageId || title}`;
    }
    if (action.kind === 'announcement') {
      return `announcement:${action.announcementId || `${title}|${body}`}`;
    }
    if (action.kind === 'devotion') {
      return `devotion:${title}|${body}`;
    }
    return `${type}:${title}|${body}`;
  },

  /**
   * Keep the public unread count in sync with persisted items.
   */
  syncUnreadCount() {
    this.unreadCount = this.notificationItems.filter((item) => item.unread).length;
    return this.unreadCount;
  },

  /**
   * Determine whether an unread notification is old enough to stop badging the user.
   * We keep history visible, but stale items should not stay unread forever.
   */
  isPastUnreadWindow(item, nowMs = Date.now()) {
    if (!item?.unread) return false;
    const createdAt = this.toDateOrNull(item.createdAt);
    if (!createdAt) return false;
    const ttlDays = Math.max(1, Number(this.staleUnreadTtlDays || 0));
    const ttlMs = ttlDays * 24 * 60 * 60 * 1000;
    return (nowMs - createdAt.getTime()) >= ttlMs;
  },

  /**
   * Auto-mark stale unread notifications as read while keeping them in history.
   */
  expireStaleUnreadNotifications() {
    if (!Array.isArray(this.notificationItems) || !this.notificationItems.length) {
      return [];
    }

    const nowMs = Date.now();
    const idsToSync = [];
    let changed = false;

    this.notificationItems = this.notificationItems.map((item) => {
      if (!this.isPastUnreadWindow(item, nowMs)) return item;
      changed = true;
      if (item.id) idsToSync.push(item.id);
      return { ...item, unread: false };
    });

    return changed ? idsToSync : [];
  },

  /**
   * Cleanup stale unread items on boot so old badges do not keep returning.
   */
  async cleanupStaleUnreadNotifications() {
    if (this.hasRunStaleUnreadCleanup) return;
    this.hasRunStaleUnreadCleanup = true;

    if (!window.db || !window.currentUser || !window.collection || !window.query || !window.orderBy || !window.limit || !window.getDocs) {
      return;
    }

    try {
      const inboxQuery = window.query(
        window.collection(window.db, 'goMission_members', window.currentUser.uid, 'notifications'),
        window.orderBy('createdAt', 'desc'),
        window.limit(this.staleUnreadSyncLimit)
      );
      const snapshot = await window.getDocs(inboxQuery);
      const staleIds = snapshot.docs
        .map((docSnap) => this.normalizeNotificationItem({ id: docSnap.id, ...(docSnap.data() || {}) }))
        .filter((item) => item && this.isPastUnreadWindow(item))
        .map((item) => item.id)
        .filter(Boolean);

      if (!staleIds.length) return;

      const staleIdSet = new Set(staleIds);
      let localChanged = false;
      this.notificationItems = this.notificationItems.map((item) => {
        if (!item?.unread || !staleIdSet.has(item.id)) return item;
        localChanged = true;
        return { ...item, unread: false };
      });

      if (localChanged) {
        this.persistNotificationHistory();
        this.updateBadge();
        if (this.isCenterOpen) this.renderNotificationCenter();
      }

      this.syncNotificationsReadState(staleIds, true);
      this.syncUnreadCountToProfile();

      if (this.unreadCount === 0 && typeof PushNotifications !== 'undefined' && typeof PushNotifications.clearBadge === 'function') {
        Promise.resolve(PushNotifications.clearBadge()).catch((error) => {
          console.warn('[Notifications] Could not clear push badge state:', error);
        });
      }
    } catch (error) {
      console.warn('[Notifications] Failed stale unread cleanup:', error);
    }
  },

  /**
   * Count unread conversation notifications for chat-specific badges.
   */
  getConversationUnreadCount() {
    return this.notificationItems.filter((item) => {
      if (!item.unread) return false;
      return item.action?.kind === 'group' || item.action?.kind === 'dm';
    }).length;
  },

  /**
   * Open the notification center.
   */
  openCenter() {
    this.createNotificationCenter();
    this.renderNotificationCenter();
    const { overlay } = this.notificationCenter;
    if (!overlay) return;
    overlay.classList.remove('hidden');
    this.isCenterOpen = true;
    const bellButton = document.getElementById('headerBellButton');
    if (bellButton) bellButton.setAttribute('aria-expanded', 'true');
    this.markAsRead({ scope: 'all' });
    this.renderNotificationCenter();
  },

  /**
   * Close the notification center.
   */
  closeCenter() {
    const { overlay } = this.notificationCenter;
    if (overlay) overlay.classList.add('hidden');
    this.isCenterOpen = false;
    const bellButton = document.getElementById('headerBellButton');
    if (bellButton) bellButton.setAttribute('aria-expanded', 'false');
  },

  /**
   * Toggle the notification center.
   */
  toggleCenter() {
    if (this.isCenterOpen) {
      this.closeCenter();
      return;
    }
    this.openCenter();
  },

  /**
   * Paint the notification center contents.
   */
  renderNotificationCenter() {
    const { list, empty, count } = this.notificationCenter;
    if (!list || !empty || !count) return;

    const totalUnread = this.syncUnreadCount();
    count.textContent = totalUnread > 0
      ? `${totalUnread} unread notification${totalUnread === 1 ? '' : 's'}`
      : 'All caught up';

    if (!this.notificationItems.length) {
      list.innerHTML = '';
      empty.classList.remove('hidden');
      empty.classList.add('flex');
      return;
    }

    empty.classList.add('hidden');
    empty.classList.remove('flex');
    list.innerHTML = this.notificationItems.map((item) => {
      const unreadClass = item.unread
        ? 'border-amber-500/35 bg-amber-500/10'
        : 'border-white/8 bg-black/10';
      const icon = item.icon || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(item.title || 'Go Mission') + '&background=4a0404&color=fbbf24';
      return `
        <button
          type="button"
          data-notification-item="${this.escapeHtml(item.id)}"
          class="w-full text-left rounded-2xl border ${unreadClass} px-3 py-3 transition hover:border-amber-400/35 hover:bg-amber-500/10"
        >
          <div class="flex items-start gap-3">
            <div class="relative shrink-0">
              <img src="${icon}" alt="" class="h-11 w-11 rounded-full border border-amber-500/20 object-cover bg-[#2a0505]">
              ${item.unread ? '<span class="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-red-500 ring-2 ring-[var(--card-bg-solid)]"></span>' : ''}
            </div>
            <div class="min-w-0 flex-1">
              <div class="flex items-start justify-between gap-3">
                <p class="truncate text-sm font-bold text-[var(--text-color)]">${this.escapeHtml(item.title)}</p>
                <span class="shrink-0 text-[11px] uppercase tracking-wide text-[var(--text-muted)]">${this.escapeHtml(this.formatNotificationTime(item.createdAt))}</span>
              </div>
              <p class="mt-1 text-xs leading-relaxed text-[var(--text-muted)]" style="display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${this.escapeHtml(item.body || 'Open to view details.')}</p>
            </div>
          </div>
        </button>
      `;
    }).join('');

    list.querySelectorAll('[data-notification-item]').forEach((button) => {
      button.addEventListener('click', () => {
        const itemId = button.getAttribute('data-notification-item');
        this.openNotificationItem(itemId);
      });
    });
  },

  /**
   * Open a notification from the center.
   */
  openNotificationItem(itemId) {
    const item = this.notificationItems.find((entry) => entry.id === itemId);
    if (!item) return;
    this.markSingleNotificationRead(itemId);
    this.closeCenter();
    this.openNotificationAction(item.action || {});
  },

  /**
   * Mark a specific notification as read.
   */
  markSingleNotificationRead(itemId) {
    let changed = false;
    const idsToSync = [];
    this.notificationItems = this.notificationItems.map((item) => {
      if (item.id !== itemId || !item.unread) return item;
      changed = true;
      idsToSync.push(item.id);
      return { ...item, unread: false };
    });
    if (!changed) return;
    this.syncUnreadCount();
    this.persistNotificationHistory();
    this.updateBadge();
    this.syncNotificationsReadState(idsToSync, true);
    this.syncUnreadCountToProfile();
    if (this.isCenterOpen) this.renderNotificationCenter();
    if (this.unreadCount === 0 && typeof PushNotifications !== 'undefined' && typeof PushNotifications.clearBadge === 'function') {
      Promise.resolve(PushNotifications.clearBadge()).catch((error) => {
        console.warn('[Notifications] Could not clear push badge state:', error);
      });
    }
  },

  /**
   * Route notification actions into the right app surface.
   */
  openNotificationAction(action = {}) {
    const kind = String(action.kind || '');
    if (kind === 'group' && action.groupId) {
      this.setLastUnreadTarget({
        type: 'group',
        groupId: action.groupId,
        messageId: action.messageId || null
      });
      this.openGroupFromNotification(action.groupId, action.messageId || null);
      return;
    }

    if (kind === 'dm' && action.senderId) {
      this.setLastUnreadTarget({
        type: 'dm',
        senderId: action.senderId,
        threadId: action.threadId || null,
        messageId: action.messageId || null
      });
      if (typeof ChatApp !== 'undefined' && typeof ChatApp.openDirectChat === 'function') {
        Promise.resolve(ChatApp.open())
          .then(() => {
            ChatApp.setTab?.('direct');
            return ChatApp.openDirectChat(action.senderId);
          })
          .catch((error) => {
            console.warn('[Notifications] Could not open DM from notification center:', error);
          });
      }
      return;
    }

    if (kind === 'friend_requests') {
      if (typeof ChatApp !== 'undefined' && typeof ChatApp.open === 'function') {
        Promise.resolve(ChatApp.open())
          .then(() => {
            ChatApp.setTab?.('requests');
          })
          .catch((error) => {
            console.warn('[Notifications] Could not open friend requests:', error);
          });
      }
      return;
    }

    if (kind === 'watch' && action.episodeId) {
      window.location.assign(`/watch/player.html?episodeId=${encodeURIComponent(action.episodeId)}`);
      return;
    }

    if (kind === 'url' && action.url) {
      window.location.assign(action.url);
      return;
    }

    if (kind === 'announcement') {
      if (typeof window.showAnnouncementFromPush === 'function') {
        window.showAnnouncementFromPush(action.title || 'Go Mission Update', action.body || 'Open the app for the latest update.');
      }
      return;
    }

    if (kind === 'devotion') {
      const url = new URL(window.location.href);
      url.searchParams.set('openDevotion', 'true');
      window.location.assign(url.toString());
    }
  },

  /**
   * Open the most recent unread target; fallback to Messages inbox.
   */
  openLastUnreadTarget() {
    const target = this.lastUnreadTarget;
    this.markAsRead({ scope: 'conversation' });

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
    const msgTime = this.toDateOrNull(message.createdAt);
    if (!msgTime) return;
    if (this.lastReadTimestamp && msgTime.getTime() <= this.lastReadTimestamp.getTime()) return;
    
    // Don't notify for active group thread unless user was directly mentioned.
    if (GroupChat?.isOpen && groupId && GroupChat.currentGroupId === groupId && !isMention) {
      return;
    }
    
    const senderLabel = message.senderName || 'Someone';

    console.log('[Notifications] New message from:', senderLabel, 'group:', groupId, 'mention:', isMention);
    
    this.setLastUnreadTarget({
      type: 'group',
      groupId,
      messageId: message.id || null
    });
    this.recordNotification({
      title: isMention ? `Mention by ${senderLabel}` : senderLabel,
      body: message.type === 'devotion'
        ? 'Shared a devotion'
        : isMention
          ? `mentioned you: ${this.truncate(message.text, 70)}`
          : this.truncate(message.text, 50),
      icon: message.senderPhoto || null,
      type: isMention ? 'chat_mention' : 'chat',
      data: {
        type: isMention ? 'chat_mention' : 'chat',
        groupId,
        messageId: message.id || null
      }
    });
    
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

    this.recordNotification({
      title,
      body,
      icon,
      type,
      data
    });

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
    const count = this.syncUnreadCount();
    const conversationCount = this.getConversationUnreadCount();
    const badgeText = count > 99 ? '99+' : count.toString();
    const conversationBadgeText = conversationCount > 99 ? '99+' : conversationCount.toString();
    
    // Update header bell badge.
    const headerBadge = document.getElementById('headerNotificationBadge');
    const headerBtn = document.getElementById('headerBellButton');
    if (headerBadge && headerBtn) {
      if (count > 0) {
        headerBadge.textContent = badgeText;
        headerBadge.classList.remove('hidden');
      } else {
        headerBadge.classList.add('hidden');
      }
    }
    
    // Update chat badge in Mission Group card
    const chatBadge = document.getElementById('chatNotificationBadge');
    if (chatBadge) {
      if (conversationCount > 0) {
        chatBadge.textContent = conversationBadgeText;
        chatBadge.classList.remove('hidden');
      } else {
        chatBadge.classList.add('hidden');
      }
    }
    
    // Update group card badge
    const groupBadge = document.getElementById('groupNotificationBadge');
    if (groupBadge) {
      if (conversationCount > 0) {
        groupBadge.textContent = conversationBadgeText;
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
  markAsRead(options = {}) {
    const scope = options.scope || 'conversation';
    let changed = false;
    const idsToSync = [];
    this.notificationItems = this.notificationItems.map((item) => {
      if (!item.unread) return item;
      const isConversation = item.action?.kind === 'group' || item.action?.kind === 'dm';
      const shouldMark = scope === 'all' || (scope === 'conversation' && isConversation);
      if (!shouldMark) return item;
      changed = true;
      idsToSync.push(item.id);
      return { ...item, unread: false };
    });
    if (scope === 'all' || scope === 'conversation') {
      this.lastUnreadTarget = null;
      this.persistUnreadTarget();
    }
    this.lastReadTimestamp = new Date();
    const lastReadKey = this.getLastReadStorageKey();
    if (lastReadKey) {
      localStorage.setItem(lastReadKey, this.lastReadTimestamp.toISOString());
    }
    if (changed) {
      this.persistNotificationHistory();
      this.syncNotificationsReadState(idsToSync, true);
      this.syncUnreadCountToProfile();
    }
    this.updateBadge();
    if (this.isCenterOpen) {
      this.renderNotificationCenter();
    }
    if (this.unreadCount === 0 && typeof PushNotifications !== 'undefined' && typeof PushNotifications.clearBadge === 'function') {
      Promise.resolve(PushNotifications.clearBadge()).catch((error) => {
        console.warn('[Notifications] Could not clear push badge state:', error);
      });
    }
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
    if (this.inboxUnsubscribe) {
      try { this.inboxUnsubscribe(); } catch (_) {}
      this.inboxUnsubscribe = null;
    }
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
    this.closeCenter();
  },
  
  // Utility functions
  truncate(str, length) {
    if (!str) return '';
    return str.length > length ? str.substring(0, length) + '...' : str;
  },

  /**
   * Persist read/unread changes to Firestore.
   */
  syncNotificationsReadState(notificationIds = [], read = true) {
    if (!window.db || !window.currentUser || !window.setDoc || !window.doc || !window.serverTimestamp) return;
    const ids = [...new Set((notificationIds || []).filter(Boolean))];
    if (!ids.length) return;
    Promise.all(ids.map((notificationId) => (
      window.setDoc(
        window.doc(window.db, 'goMission_members', window.currentUser.uid, 'notifications', notificationId),
        {
          read: !!read,
          readAt: read ? window.serverTimestamp() : null,
          updatedAt: window.serverTimestamp()
        },
        { merge: true }
      )
    ))).catch((error) => {
      console.warn('[Notifications] Failed syncing read state:', error);
    });
  },

  /**
   * Keep the profile unread count close to the actual inbox unread count for badge consistency.
   */
  syncUnreadCountToProfile() {
    if (!window.db || !window.currentUser || !window.setDoc || !window.doc) return;
    Promise.resolve(window.setDoc(
      window.doc(window.db, 'goMission_members', window.currentUser.uid),
      {
        unreadCount: this.unreadCount,
        updatedAt: window.serverTimestamp ? window.serverTimestamp() : new Date().toISOString()
      },
      { merge: true }
    )).catch((error) => {
      console.warn('[Notifications] Failed syncing unreadCount to profile:', error);
    });
  },

  toDateOrNull(value) {
    if (!value) return null;
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
    if (typeof value.toDate === 'function') {
      const date = value.toDate();
      return Number.isNaN(date?.getTime?.()) ? null : date;
    }
    if (typeof value === 'number') {
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? null : date;
    }
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  },
  
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
  },

  formatNotificationTime(value) {
    const date = this.toDateOrNull(value);
    if (!date) return '';
    const diffMs = Date.now() - date.getTime();
    const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));
    if (diffMinutes < 1) return 'Now';
    if (diffMinutes < 60) return `${diffMinutes}m`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }
};

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Notifications;
}
