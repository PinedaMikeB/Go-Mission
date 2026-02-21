/**
 * Go Mission - Chat Inbox Module
 * Unified entry point for group chats and direct messages.
 */

const ChatApp = {
  initialized: false,
  isOpen: false,
  activeTab: 'groups',
  searchTerm: '',

  groups: [],
  groupThreads: [],
  friendships: [],
  directThreads: [],
  incomingRequests: [],
  outgoingRequests: [],
  memberCache: new Map(),

  peopleSearchPool: [],
  findMeEnabled: true,
  isPeopleFinderOpen: false,

  activeDmThreadId: null,
  activeDmPeerId: null,
  dmMessages: [],
  dmPollTimer: null,
  dmNotificationUnsubscribe: null,
  dmLastSeenAt: null,
  activeDmHeartbeatTimer: null,

  /**
   * Initialize module
   */
  async init() {
    if (this.initialized) {
      await this.refresh();
      if (!this.dmNotificationUnsubscribe) {
        this.initDirectMessageNotifier();
      }
      return;
    }
    this.initialized = true;
    this.setTab('groups');
    await this.refresh();
    this.initDirectMessageNotifier();
  },

  /**
   * Open messages inbox
   */
  async open() {
    if (!window.currentUser) {
      alert('Please sign in first');
      return;
    }

    const screen = document.getElementById('messagesInboxScreen');
    if (!screen) return;

    await this.refresh();
    screen.classList.remove('hidden');
    this.isOpen = true;
  },

  /**
   * Close messages inbox
   */
  close() {
    const screen = document.getElementById('messagesInboxScreen');
    if (screen) screen.classList.add('hidden');
    this.isOpen = false;
  },

  /**
   * Cleanup listeners/state (used on sign-out)
   */
  cleanup() {
    this.close();
    this.closeDirectChat();
    this.closePeopleFinder();
    if (this.dmNotificationUnsubscribe) {
      this.dmNotificationUnsubscribe();
      this.dmNotificationUnsubscribe = null;
    }
    this.initialized = false;
    this.dmLastSeenAt = null;
  },

  /**
   * Refresh data for all tabs
   */
  async refresh() {
    if (!window.currentUser || !window.db) return;

    await this.loadGroups();
    await this.loadFriendData();
    this.renderCurrentTab();
    this.updateBadges();
  },

  /**
   * Change active tab
   */
  setTab(tab) {
    this.activeTab = ['groups', 'direct', 'requests'].includes(tab) ? tab : 'groups';
    this.renderTabButtons();

    const groupsPanel = document.getElementById('messagesGroupsPanel');
    const directPanel = document.getElementById('messagesDirectPanel');
    const requestsPanel = document.getElementById('messagesRequestsPanel');
    if (groupsPanel) groupsPanel.classList.toggle('hidden', this.activeTab !== 'groups');
    if (directPanel) directPanel.classList.toggle('hidden', this.activeTab !== 'direct');
    if (requestsPanel) requestsPanel.classList.toggle('hidden', this.activeTab !== 'requests');

    this.renderCurrentTab();
  },

  /**
   * Handle search input in the inbox
   */
  handleSearchInput(value) {
    this.searchTerm = (value || '').trim().toLowerCase();
    this.renderCurrentTab();
  },

  /**
   * Render active tab content
   */
  renderCurrentTab() {
    if (this.activeTab === 'groups') this.renderGroups();
    else if (this.activeTab === 'direct') this.renderDirect();
    else this.renderRequests();
  },

  /**
   * Render tab button states
   */
  renderTabButtons() {
    const map = {
      groups: document.getElementById('messagesTabGroups'),
      direct: document.getElementById('messagesTabDirect'),
      requests: document.getElementById('messagesTabRequests')
    };

    for (const key of Object.keys(map)) {
      const button = map[key];
      if (!button) continue;
      const active = this.activeTab === key;
      button.style.background = active ? 'var(--mission-gold)' : 'transparent';
      button.style.color = active ? 'var(--mission-red-deep)' : 'var(--text-muted)';
      button.style.boxShadow = active ? '0 8px 18px rgba(251, 191, 36, 0.22)' : 'none';
    }
  },

  /**
   * Load groups and build list previews
   */
  async loadGroups() {
    if (!window.currentUser || !window.db) return;

    if (typeof MyGroups !== 'undefined' && typeof MyGroups.loadGroups === 'function') {
      await MyGroups.loadGroups();
    }

    const dedupe = new Map();
    const pushGroup = (group) => {
      if (!group?.id || dedupe.has(group.id)) return;
      dedupe.set(group.id, group);
    };

    if (typeof MyGroups !== 'undefined') {
      pushGroup(MyGroups.uplineGroup);
      (MyGroups.guestGroups || []).forEach(pushGroup);
      (MyGroups.downlineGroups || []).forEach(pushGroup);
    }

    this.groups = Array.from(dedupe.values());

    const threads = await Promise.all(this.groups.map(async (group) => {
      let previewText = group.lastChatMessageText || '';
      let senderName = group.lastChatSenderName || '';
      let lastAt = this.parseTimestamp(group.lastChatMessageAt) || this.parseTimestamp(group.updatedAt);
      let type = group.lastChatMessageType || 'text';

      if (!previewText) {
        const fallback = await this.fetchLatestGroupMessage(group.id);
        if (fallback) {
          previewText = fallback.text;
          senderName = fallback.senderName;
          lastAt = fallback.createdAt || lastAt;
          type = fallback.type || type;
        }
      }

      return {
        id: group.id,
        name: group.name || 'Mission Group',
        memberCount: (group.members || []).length || group.currentCount || 0,
        previewText: previewText || 'No messages yet',
        senderName: senderName || '',
        lastAt,
        type,
        group
      };
    }));

    threads.sort((a, b) => {
      const aTime = a.lastAt ? a.lastAt.getTime() : 0;
      const bTime = b.lastAt ? b.lastAt.getTime() : 0;
      if (aTime !== bTime) return bTime - aTime;
      return (a.name || '').localeCompare(b.name || '');
    });

    this.groupThreads = threads;
  },

  /**
   * Fetch latest message for a group (fallback when group doc has no preview metadata)
   */
  async fetchLatestGroupMessage(groupId) {
    if (!groupId || !window.db) return null;
    try {
      const q = window.query(
        window.collection(window.db, 'goMission_chats'),
        window.where('groupId', '==', groupId),
        window.limit(60)
      );
      const snapshot = await window.getDocs(q);
      let latest = null;
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const createdAt = this.parseTimestamp(data.createdAt);
        if (!latest || (createdAt && latest.createdAt && createdAt > latest.createdAt) || (createdAt && !latest.createdAt)) {
          latest = {
            text: data.type === 'devotion' ? 'Shared a devotion' : (data.text || ''),
            senderName: data.senderName || '',
            createdAt,
            type: data.type || 'text'
          };
        }
      });
      return latest;
    } catch (error) {
      console.warn('[ChatApp] Could not fetch latest group message:', groupId, error);
      return null;
    }
  },

  /**
   * Load friendship and request records
   */
  async loadFriendData() {
    const uid = window.currentUser?.uid;
    if (!uid || !window.db) return;

    try {
      const friendshipsQ = window.query(
        window.collection(window.db, 'goMission_friendships'),
        window.where('users', 'array-contains', uid),
        window.limit(200)
      );
      const incomingQ = window.query(
        window.collection(window.db, 'goMission_friendRequests'),
        window.where('toId', '==', uid),
        window.limit(200)
      );
      const outgoingQ = window.query(
        window.collection(window.db, 'goMission_friendRequests'),
        window.where('fromId', '==', uid),
        window.limit(200)
      );

      const [friendshipsSnap, incomingSnap, outgoingSnap] = await Promise.all([
        window.getDocs(friendshipsQ),
        window.getDocs(incomingQ),
        window.getDocs(outgoingQ)
      ]);

      this.friendships = friendshipsSnap.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data()
      }));

      this.incomingRequests = incomingSnap.docs
        .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
        .filter((request) => request.status === 'pending');

      this.outgoingRequests = outgoingSnap.docs
        .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
        .filter((request) => request.status === 'pending');

      const friendIds = this.friendships
        .map((friendship) => (friendship.users || []).find((id) => id !== uid))
        .filter(Boolean);
      const requestUserIds = [
        ...this.incomingRequests.map((request) => request.fromId),
        ...this.outgoingRequests.map((request) => request.toId)
      ];
      await this.ensureMembersLoaded([...friendIds, ...requestUserIds, uid]);
      await this.loadCurrentFindMeSetting();
      await this.buildDirectThreads();
    } catch (error) {
      console.error('[ChatApp] Failed loading friend data:', error);
      this.friendships = [];
      this.incomingRequests = [];
      this.outgoingRequests = [];
      this.directThreads = [];
    }
  },

  /**
   * Ensure member profiles are loaded into cache
   */
  async ensureMembersLoaded(ids) {
    const uniqueIds = Array.from(new Set((ids || []).filter(Boolean)));
    const toLoad = uniqueIds.filter((id) => !this.memberCache.has(id));
    if (toLoad.length === 0) return;

    await Promise.all(toLoad.map(async (id) => {
      try {
        const docSnap = await window.getDoc(window.doc(window.db, 'goMission_members', id));
        if (docSnap.exists()) {
          this.memberCache.set(id, { id, ...docSnap.data() });
        }
      } catch (error) {
        console.warn('[ChatApp] Could not load member', id, error);
      }
    }));
  },

  /**
   * Build direct-thread list from friendships
   */
  async buildDirectThreads() {
    const uid = window.currentUser?.uid;
    if (!uid || !window.db) {
      this.directThreads = [];
      return;
    }

    const threads = await Promise.all(this.friendships.map(async (friendship) => {
      const users = friendship.users || [];
      const peerId = users.find((id) => id !== uid);
      if (!peerId) return null;

      const peer = this.memberCache.get(peerId) || {};
      const threadId = this.pairKey(uid, peerId);
      let threadData = null;
      try {
        const threadDoc = await window.getDoc(window.doc(window.db, 'goMission_dmThreads', threadId));
        if (threadDoc.exists()) {
          threadData = threadDoc.data();
        }
      } catch (error) {
        console.warn('[ChatApp] Failed loading DM thread', threadId, error);
      }

      return {
        friendId: peerId,
        threadId,
        name: this.getMemberDisplayName(peer) || 'Friend',
        photoURL: this.getMemberPhoto(peer),
        email: peer.email || '',
        lastMessageText: threadData?.lastMessageText || 'No messages yet',
        lastMessageAt: this.parseTimestamp(threadData?.lastMessageAt) || this.parseTimestamp(friendship.createdAt),
        lastMessageSenderId: threadData?.lastMessageSenderId || null
      };
    }));

    this.directThreads = threads
      .filter(Boolean)
      .sort((a, b) => {
        const aTime = a.lastMessageAt ? a.lastMessageAt.getTime() : 0;
        const bTime = b.lastMessageAt ? b.lastMessageAt.getTime() : 0;
        if (aTime !== bTime) return bTime - aTime;
        return (a.name || '').localeCompare(b.name || '');
      });
  },

  /**
   * Render group list
   */
  renderGroups() {
    const container = document.getElementById('messagesGroupsList');
    if (!container) return;

    const filtered = this.groupThreads.filter((thread) => {
      if (!this.searchTerm) return true;
      return `${thread.name} ${thread.previewText} ${thread.senderName}`.toLowerCase().includes(this.searchTerm);
    });

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="text-center py-10">
          <p class="text-sm text-[var(--text-muted)]">No matching group chats.</p>
          <p class="text-xs text-[var(--text-muted)] opacity-70 mt-1">Join or create a mission group to start chatting.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = filtered.map((thread) => {
      const subtitle = thread.senderName
        ? `${this.escapeHtml(thread.senderName)}: ${this.escapeHtml(thread.previewText)}`
        : this.escapeHtml(thread.previewText);
      return `
        <button onclick="window.ChatApp.openGroupChat('${thread.id}')" class="w-full text-left mission-card rounded-2xl border border-[var(--card-border)] p-4 hover:border-[var(--mission-gold)]/45 transition-colors">
          <div class="flex items-center justify-between gap-3">
            <div class="min-w-0">
              <p class="font-bold text-[var(--text-color)] truncate">${this.escapeHtml(thread.name)}</p>
              <p class="text-[11px] text-[var(--text-muted)]">${thread.memberCount} members</p>
            </div>
            <p class="text-[10px] text-[var(--text-muted)] shrink-0">${this.formatTime(thread.lastAt)}</p>
          </div>
          <p class="text-sm text-[var(--text-color)]/90 truncate mt-2">${subtitle}</p>
        </button>
      `;
    }).join('');
  },

  /**
   * Render direct-message list
   */
  renderDirect() {
    const container = document.getElementById('messagesDirectList');
    if (!container) return;

    const filtered = this.directThreads.filter((thread) => {
      if (!this.searchTerm) return true;
      return `${thread.name} ${thread.email} ${thread.lastMessageText}`.toLowerCase().includes(this.searchTerm);
    });

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="text-center py-10">
          <p class="text-sm text-[var(--text-muted)]">No direct chats yet.</p>
          <p class="text-xs text-[var(--text-muted)] opacity-70 mt-1">Tap "Find People" to add friends and start messaging.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = filtered.map((thread) => `
      <button onclick="window.ChatApp.openDirectChat('${thread.friendId}')" class="w-full text-left mission-card rounded-2xl border border-[var(--card-border)] p-4 hover:border-[var(--mission-gold)]/45 transition-colors">
        <div class="flex items-center gap-3">
          <img src="${this.escapeHtml(thread.photoURL)}" alt="${this.escapeHtml(thread.name)}" class="w-11 h-11 rounded-full border border-[var(--card-border)]">
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between gap-2">
              <p class="font-bold text-[var(--text-color)] truncate">${this.escapeHtml(thread.name)}</p>
              <p class="text-[10px] text-[var(--text-muted)] shrink-0">${this.formatTime(thread.lastMessageAt)}</p>
            </div>
            <p class="text-xs text-[var(--text-muted)] truncate">${this.escapeHtml(thread.lastMessageText || 'No messages yet')}</p>
          </div>
        </div>
      </button>
    `).join('');
  },

  /**
   * Render incoming/outgoing requests
   */
  renderRequests() {
    const container = document.getElementById('messagesRequestsList');
    if (!container) return;

    const incoming = this.incomingRequests.filter((request) => {
      if (!this.searchTerm) return true;
      const member = this.memberCache.get(request.fromId) || {};
      return `${this.getMemberDisplayName(member)} ${member.email || ''}`.toLowerCase().includes(this.searchTerm);
    });

    const outgoing = this.outgoingRequests.filter((request) => {
      if (!this.searchTerm) return true;
      const member = this.memberCache.get(request.toId) || {};
      return `${this.getMemberDisplayName(member)} ${member.email || ''}`.toLowerCase().includes(this.searchTerm);
    });

    if (incoming.length === 0 && outgoing.length === 0) {
      container.innerHTML = `
        <div class="text-center py-10">
          <p class="text-sm text-[var(--text-muted)]">No pending requests.</p>
          <p class="text-xs text-[var(--text-muted)] opacity-70 mt-1">New friend requests will appear here for approval.</p>
        </div>
      `;
      return;
    }

    const incomingHtml = incoming.map((request) => {
      const member = this.memberCache.get(request.fromId) || {};
      const name = this.getMemberDisplayName(member) || request.fromName || 'User';
      return `
        <div class="mission-card rounded-2xl border border-[var(--card-border)] p-4">
          <div class="flex items-start gap-3">
            <img src="${this.escapeHtml(this.getMemberPhoto(member))}" alt="${this.escapeHtml(name)}" class="w-10 h-10 rounded-full border border-[var(--card-border)]">
            <div class="flex-1 min-w-0">
              <p class="font-bold text-[var(--text-color)] truncate">${this.escapeHtml(name)}</p>
              <p class="text-xs text-[var(--text-muted)] truncate">${this.escapeHtml(member.email || request.fromEmail || '')}</p>
              <p class="text-[10px] text-[var(--text-muted)] mt-1">Incoming request</p>
            </div>
          </div>
          <div class="mt-3 grid grid-cols-2 gap-2">
            <button onclick="window.ChatApp.acceptFriendRequest('${request.id}')" class="py-2 rounded-lg bg-[var(--mission-gold)] text-[var(--mission-red-deep)] text-xs font-bold">Accept</button>
            <button onclick="window.ChatApp.declineFriendRequest('${request.id}')" class="py-2 rounded-lg border border-[var(--card-border)] text-xs font-bold text-[var(--text-muted)] hover:text-[var(--text-color)]">Decline</button>
          </div>
        </div>
      `;
    }).join('');

    const outgoingHtml = outgoing.map((request) => {
      const member = this.memberCache.get(request.toId) || {};
      const name = this.getMemberDisplayName(member) || request.toName || 'User';
      return `
        <div class="mission-card rounded-2xl border border-[var(--card-border)] p-4">
          <div class="flex items-start gap-3">
            <img src="${this.escapeHtml(this.getMemberPhoto(member))}" alt="${this.escapeHtml(name)}" class="w-10 h-10 rounded-full border border-[var(--card-border)]">
            <div class="flex-1 min-w-0">
              <p class="font-bold text-[var(--text-color)] truncate">${this.escapeHtml(name)}</p>
              <p class="text-xs text-[var(--text-muted)] truncate">${this.escapeHtml(member.email || request.toEmail || '')}</p>
              <p class="text-[10px] text-amber-500 mt-1">Pending approval</p>
            </div>
            <button onclick="window.ChatApp.cancelFriendRequest('${request.id}')" class="text-[10px] px-2 py-1 rounded-md border border-[var(--card-border)] text-[var(--text-muted)] hover:text-red-400">Cancel</button>
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = `
      ${incoming.length ? `<p class="text-xs font-bold text-[var(--text-muted)] uppercase tracking-[0.12em]">Incoming</p>${incomingHtml}` : ''}
      ${outgoing.length ? `<p class="text-xs font-bold text-[var(--text-muted)] uppercase tracking-[0.12em] mt-1">Sent by you</p>${outgoingHtml}` : ''}
    `;
  },

  /**
   * Open selected group chat
   */
  openGroupChat(groupId, focusMessageId = null) {
    if (!groupId) return false;
    let groupThread = this.groupThreads.find((thread) => thread.id === groupId);
    if (!groupThread) {
      const group = this.groups.find((item) => item?.id === groupId);
      if (group) {
        groupThread = { id: groupId, group };
      }
    }
    if (!groupThread?.group) return false;

    if (typeof Groups !== 'undefined') {
      Groups.currentGroup = groupThread.group;
    }

    this.close();
    if (typeof GroupChat !== 'undefined' && typeof GroupChat.open === 'function') {
      if (focusMessageId) {
        GroupChat.pendingFocusMessageId = focusMessageId;
      }
      GroupChat.open();
      if (typeof Notifications !== 'undefined') {
        Notifications.markAsRead();
      }
    }
    return true;
  },

  /**
   * Open DM modal with a friend
   */
  async openDirectChat(friendId) {
    const uid = window.currentUser?.uid;
    if (!uid || !friendId) return;

    const thread = this.directThreads.find((item) => item.friendId === friendId);
    if (!thread) {
      alert('You can only message accepted friends.');
      return;
    }

    this.activeDmPeerId = friendId;
    this.activeDmThreadId = this.pairKey(uid, friendId);
    const peer = this.memberCache.get(friendId) || {};

    const photo = document.getElementById('dmChatPhoto');
    const name = document.getElementById('dmChatName');
    const input = document.getElementById('dmChatInput');
    if (photo) photo.src = this.getMemberPhoto(peer);
    if (name) name.textContent = this.getMemberDisplayName(peer) || 'Direct Message';
    if (input) input.value = '';

    const modal = document.getElementById('dmChatModal');
    if (modal) modal.classList.remove('hidden');

    await this.setActiveDmThread(this.activeDmThreadId);
    this.startActiveDmHeartbeat(this.activeDmThreadId);
    this.markDmSeenNow();
    await this.loadDirectMessages(true);
    this.startDmPolling();
  },

  /**
   * Close DM modal
   */
  closeDirectChat() {
    const previousThreadId = this.activeDmThreadId;
    const modal = document.getElementById('dmChatModal');
    if (modal) modal.classList.add('hidden');
    this.activeDmThreadId = null;
    this.activeDmPeerId = null;
    this.dmMessages = [];
    this.stopDmPolling();
    this.stopActiveDmHeartbeat();
    if (previousThreadId) {
      this.setActiveDmThread(null);
    }
  },

  /**
   * Load messages for active DM thread
   */
  async loadDirectMessages(scrollToBottom = false) {
    if (!this.activeDmThreadId || !window.db) return;

    const container = document.getElementById('dmChatMessages');
    if (!container) return;

    try {
      const q = window.query(
        window.collection(window.db, 'goMission_dmMessages'),
        window.where('threadId', '==', this.activeDmThreadId),
        window.limit(120)
      );
      const snapshot = await window.getDocs(q);
      const messages = [];
      snapshot.forEach((docSnap) => messages.push({ id: docSnap.id, ...docSnap.data() }));
      messages.sort((a, b) => {
        const aTime = this.parseTimestamp(a.createdAt)?.getTime() || 0;
        const bTime = this.parseTimestamp(b.createdAt)?.getTime() || 0;
        return aTime - bTime;
      });
      this.dmMessages = messages;
      this.renderDirectMessages(scrollToBottom);
      this.markDmSeenNow();
    } catch (error) {
      console.error('[ChatApp] Failed loading direct messages:', error);
      container.innerHTML = '<p class="text-red-400 text-sm text-center py-8">Could not load messages.</p>';
    }
  },

  /**
   * Render DM messages
   */
  renderDirectMessages(scrollToBottom = false) {
    const container = document.getElementById('dmChatMessages');
    if (!container) return;

    if (!this.dmMessages.length) {
      container.innerHTML = `
        <div class="text-center py-10">
          <p class="text-sm text-[var(--text-muted)]">No messages yet.</p>
          <p class="text-xs text-[var(--text-muted)] opacity-70 mt-1">Say hello and start the conversation.</p>
        </div>
      `;
      return;
    }

    const uid = window.currentUser?.uid;
    let html = '';
    let lastDate = '';

    for (const message of this.dmMessages) {
      const isMe = message.senderId === uid;
      const messageDate = this.parseTimestamp(message.createdAt) || new Date();
      const dateLabel = messageDate.toLocaleDateString();
      const timeLabel = messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      if (dateLabel !== lastDate) {
        html += `
          <div class="text-center my-3">
            <span class="text-[10px] text-[var(--text-muted)] bg-[var(--input-bg)] border border-[var(--card-border)] px-3 py-1 rounded-full">${dateLabel}</span>
          </div>
        `;
        lastDate = dateLabel;
      }

      html += `
        <div class="flex ${isMe ? 'justify-end' : 'justify-start'}">
          <div class="max-w-[80%] rounded-2xl border ${isMe ? 'bg-amber-500/20 border-amber-500/30' : 'bg-[var(--card-bg)] border-[var(--card-border)]'} px-3 py-2">
            <p class="text-sm text-[var(--text-color)] whitespace-pre-wrap break-words">${this.escapeHtml(message.text || '')}</p>
            <p class="text-[10px] text-[var(--text-muted)] mt-1 ${isMe ? 'text-right' : ''}">${timeLabel}</p>
          </div>
        </div>
      `;
    }

    container.innerHTML = html;
    if (scrollToBottom) {
      container.scrollTop = container.scrollHeight;
    }
  },

  /**
   * Send a direct message
   */
  async sendDirectMessage() {
    const input = document.getElementById('dmChatInput');
    if (!input) return;
    const text = (input.value || '').trim();
    if (!text) return;
    if (!this.activeDmThreadId || !this.activeDmPeerId) return;

    const uid = window.currentUser?.uid;
    if (!uid || !window.db) return;

    try {
      const senderName = window.currentUser.displayName || window.currentUser.email || 'User';
      const senderPhoto = window.currentUser.photoURL || '';
      const participants = [uid, this.activeDmPeerId].sort();

      await window.addDoc(window.collection(window.db, 'goMission_dmMessages'), {
        threadId: this.activeDmThreadId,
        participants,
        senderId: uid,
        senderName,
        senderPhoto,
        text,
        type: 'text',
        createdAt: window.serverTimestamp()
      });

      await window.setDoc(
        window.doc(window.db, 'goMission_dmThreads', this.activeDmThreadId),
        {
          participants,
          pairKey: this.activeDmThreadId,
          lastMessageText: text,
          lastMessageSenderId: uid,
          lastMessageSenderName: senderName,
          lastMessageAt: window.serverTimestamp(),
          updatedAt: window.serverTimestamp()
        },
        { merge: true }
      );

      input.value = '';
      await this.loadDirectMessages(true);
      await this.buildDirectThreads();
      this.renderDirect();
    } catch (error) {
      console.error('[ChatApp] Failed sending direct message:', error);
      alert('Could not send message. Please try again.');
    }
  },

  /**
   * Enter key send for DM input
   */
  handleDmKeyPress(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendDirectMessage();
    }
  },

  /**
   * Start polling for DM updates
   */
  startDmPolling() {
    this.stopDmPolling();
    this.dmPollTimer = setInterval(() => {
      if (!this.activeDmThreadId) return;
      this.loadDirectMessages();
    }, 4000);
  },

  /**
   * Stop DM polling
   */
  stopDmPolling() {
    if (this.dmPollTimer) {
      clearInterval(this.dmPollTimer);
      this.dmPollTimer = null;
    }
  },

  /**
   * Subscribe to direct message stream for in-app notifications
   */
  initDirectMessageNotifier() {
    const uid = window.currentUser?.uid;
    if (!uid || !window.db || !window.onSnapshot) return;

    if (this.dmNotificationUnsubscribe) {
      this.dmNotificationUnsubscribe();
      this.dmNotificationUnsubscribe = null;
    }

    const key = `dmLastSeen_${uid}`;
    const saved = localStorage.getItem(key);
    const parsed = saved ? this.parseTimestamp(saved) : null;
    this.dmLastSeenAt = parsed || new Date();

    const q = window.query(
      window.collection(window.db, 'goMission_dmMessages'),
      window.where('participants', 'array-contains', uid),
      window.limit(150)
    );

    this.dmNotificationUnsubscribe = window.onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type !== 'added') return;
        const message = { id: change.doc.id, ...change.doc.data() };
        this.handleIncomingDirectMessageNotification(message);
      });
    }, (error) => {
      console.error('[ChatApp] DM notification listener error:', error);
    });
  },

  /**
   * Handle a newly-observed DM for in-app alerting
   */
  handleIncomingDirectMessageNotification(message) {
    const uid = window.currentUser?.uid;
    if (!uid || !message) return;
    if (message.senderId === uid) return;

    const messageTime = this.parseTimestamp(message.createdAt);
    if (!messageTime) return;
    if (this.dmLastSeenAt && messageTime <= this.dmLastSeenAt) return;

    if (this.activeDmThreadId && message.threadId === this.activeDmThreadId) {
      this.setDmLastSeen(messageTime);
      return;
    }

    if (typeof Notifications !== 'undefined' && typeof Notifications.addNotification === 'function') {
      Notifications.addNotification({
        title: message.senderName || 'Direct message',
        body: this.truncateText(message.text || 'Sent you a message', 100),
        icon: message.senderPhoto || null,
        type: 'dm',
        data: {
          type: 'dm',
          threadId: message.threadId,
          senderId: message.senderId,
          messageId: message.id
        }
      });
    }

    this.setDmLastSeen(messageTime);
  },

  /**
   * Save "last seen DM" marker
   */
  setDmLastSeen(value) {
    const uid = window.currentUser?.uid;
    if (!uid) return;
    const date = value instanceof Date ? value : this.parseTimestamp(value) || new Date();
    this.dmLastSeenAt = date;
    localStorage.setItem(`dmLastSeen_${uid}`, date.toISOString());
  },

  /**
   * Mark current time as DM seen
   */
  markDmSeenNow() {
    this.setDmLastSeen(new Date());
  },

  /**
   * Track active DM thread in profile so push can skip while open
   */
  async setActiveDmThread(threadId) {
    const uid = window.currentUser?.uid;
    if (!uid || !window.db) return;
    try {
      await window.setDoc(
        window.doc(window.db, 'goMission_members', uid),
        {
          activeDmThread: threadId || null,
          activeDmThreadUpdatedAt: window.serverTimestamp()
        },
        { merge: true }
      );
    } catch (error) {
      console.warn('[ChatApp] Failed setting active DM thread:', error);
    }
  },

  /**
   * Keep DM active state fresh to avoid stale notification suppression.
   */
  startActiveDmHeartbeat(threadId) {
    this.stopActiveDmHeartbeat();
    if (!threadId) return;
    this.activeDmHeartbeatTimer = setInterval(() => {
      if (!this.activeDmThreadId || this.activeDmThreadId !== threadId) {
        this.stopActiveDmHeartbeat();
        return;
      }
      this.setActiveDmThread(threadId);
    }, 60000);
  },

  /**
   * Stop DM active state heartbeat.
   */
  stopActiveDmHeartbeat() {
    if (this.activeDmHeartbeatTimer) {
      clearInterval(this.activeDmHeartbeatTimer);
      this.activeDmHeartbeatTimer = null;
    }
  },

  /**
   * Open people finder modal
   */
  async openPeopleFinder() {
    const modal = document.getElementById('peopleFinderModal');
    if (!modal) return;

    await this.loadPeopleSearchPool();
    this.updateFindMeToggleUI();
    this.searchPeople((document.getElementById('peopleFinderInput')?.value || '').trim());
    modal.classList.remove('hidden');
    this.isPeopleFinderOpen = true;
  },

  /**
   * Close people finder modal
   */
  closePeopleFinder() {
    const modal = document.getElementById('peopleFinderModal');
    if (modal) modal.classList.add('hidden');
    this.isPeopleFinderOpen = false;
  },

  /**
   * Load searchable users
   */
  async loadPeopleSearchPool() {
    if (!window.currentUser?.uid || !window.db) return;
    try {
      const q = window.query(
        window.collection(window.db, 'goMission_members'),
        window.limit(250)
      );
      const snapshot = await window.getDocs(q);
      this.peopleSearchPool = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
      for (const member of this.peopleSearchPool) {
        this.memberCache.set(member.id, member);
      }
    } catch (error) {
      console.error('[ChatApp] Failed loading people search pool:', error);
      this.peopleSearchPool = [];
    }
  },

  /**
   * Search people by name/email
   */
  searchPeople(term) {
    const container = document.getElementById('peopleFinderResults');
    if (!container) return;

    const uid = window.currentUser?.uid;
    const queryTerm = (term || '').trim().toLowerCase();
    const isFriend = new Set(this.friendships.map((f) => (f.users || []).find((id) => id !== uid)));
    const incomingMap = new Map(this.incomingRequests.map((r) => [r.fromId, r]));
    const outgoingMap = new Map(this.outgoingRequests.map((r) => [r.toId, r]));

    const candidates = this.peopleSearchPool
      .filter((member) => member.id && member.id !== uid)
      .filter((member) => member.findMeEnabled !== false)
      .filter((member) => {
        if (!queryTerm) return true;
        const text = `${this.getMemberDisplayName(member)} ${member.email || ''}`.toLowerCase();
        return text.includes(queryTerm);
      })
      .slice(0, 40);

    if (candidates.length === 0) {
      container.innerHTML = '<p class="text-[var(--text-muted)] text-sm text-center py-8">No matching users found.</p>';
      return;
    }

    container.innerHTML = candidates.map((member) => {
      const name = this.getMemberDisplayName(member) || 'User';
      let actionHtml = '';
      if (isFriend.has(member.id)) {
        actionHtml = '<span class="text-[11px] font-bold text-green-500">Friends</span>';
      } else if (incomingMap.has(member.id)) {
        const request = incomingMap.get(member.id);
        actionHtml = `<button onclick="window.ChatApp.acceptFriendRequest('${request.id}')" class="px-3 py-1.5 text-[11px] font-bold rounded-md bg-[var(--mission-gold)] text-[var(--mission-red-deep)]">Accept</button>`;
      } else if (outgoingMap.has(member.id)) {
        actionHtml = '<span class="text-[11px] font-bold text-amber-500">Pending</span>';
      } else {
        actionHtml = `<button onclick="window.ChatApp.sendFriendRequest('${member.id}')" class="px-3 py-1.5 text-[11px] font-bold rounded-md border border-[var(--mission-gold)]/50 text-[var(--mission-gold)] hover:bg-[var(--mission-gold)]/10">Add Friend</button>`;
      }

      return `
        <div class="flex items-center justify-between gap-2 mission-card rounded-xl border border-[var(--card-border)] p-3">
          <div class="flex items-center gap-3 min-w-0">
            <img src="${this.escapeHtml(this.getMemberPhoto(member))}" alt="${this.escapeHtml(name)}" class="w-9 h-9 rounded-full border border-[var(--card-border)]">
            <div class="min-w-0">
              <p class="text-sm font-bold text-[var(--text-color)] truncate">${this.escapeHtml(name)}</p>
              <p class="text-[11px] text-[var(--text-muted)] truncate">${this.escapeHtml(member.email || '')}</p>
            </div>
          </div>
          <div class="shrink-0">${actionHtml}</div>
        </div>
      `;
    }).join('');
  },

  /**
   * Send friend request
   */
  async sendFriendRequest(targetUserId) {
    const uid = window.currentUser?.uid;
    if (!uid || !targetUserId || uid === targetUserId || !window.db) return;

    const target = this.memberCache.get(targetUserId);
    if (target && target.findMeEnabled === false) {
      alert('This user is not discoverable right now.');
      return;
    }

    const requestId = this.pairKey(uid, targetUserId);
    const requestRef = window.doc(window.db, 'goMission_friendRequests', requestId);
    const existingRequest = await window.getDoc(requestRef);
    if (existingRequest.exists() && existingRequest.data().status === 'pending') {
      alert('Friend request already pending.');
      return;
    }

    const senderName = window.currentUser.displayName || window.currentUser.email || 'User';
    const senderPhoto = window.currentUser.photoURL || '';
    const payload = {
      pairKey: requestId,
      fromId: uid,
      toId: targetUserId,
      fromName: senderName,
      fromPhoto: senderPhoto,
      toName: this.getMemberDisplayName(target) || '',
      toEmail: target?.email || '',
      status: 'pending',
      updatedAt: window.serverTimestamp()
    };
    if (!existingRequest.exists()) payload.createdAt = window.serverTimestamp();

    try {
      await window.setDoc(requestRef, payload, { merge: true });
      await this.loadFriendData();
      this.renderRequests();
      this.searchPeople(document.getElementById('peopleFinderInput')?.value || '');
      this.updateBadges();
    } catch (error) {
      console.error('[ChatApp] Failed sending friend request:', error);
      alert('Could not send request. Please try again.');
    }
  },

  /**
   * Accept request and create friendship
   */
  async acceptFriendRequest(requestId) {
    const uid = window.currentUser?.uid;
    if (!uid || !requestId || !window.db) return;

    try {
      const requestRef = window.doc(window.db, 'goMission_friendRequests', requestId);
      const requestDoc = await window.getDoc(requestRef);
      if (!requestDoc.exists()) return;
      const request = requestDoc.data();
      if (request.toId !== uid) return;

      const users = [request.fromId, request.toId].sort();
      const friendshipId = this.pairKey(users[0], users[1]);
      await window.setDoc(
        window.doc(window.db, 'goMission_friendships', friendshipId),
        {
          pairKey: friendshipId,
          users,
          createdAt: window.serverTimestamp(),
          updatedAt: window.serverTimestamp()
        },
        { merge: true }
      );

      await window.setDoc(requestRef, {
        status: 'accepted',
        acceptedAt: window.serverTimestamp(),
        updatedAt: window.serverTimestamp()
      }, { merge: true });

      await this.loadFriendData();
      this.renderCurrentTab();
      this.searchPeople(document.getElementById('peopleFinderInput')?.value || '');
      this.updateBadges();
    } catch (error) {
      console.error('[ChatApp] Failed accepting friend request:', error);
      alert('Could not accept request. Please try again.');
    }
  },

  /**
   * Decline incoming request
   */
  async declineFriendRequest(requestId) {
    if (!requestId || !window.db) return;
    try {
      await window.setDoc(
        window.doc(window.db, 'goMission_friendRequests', requestId),
        {
          status: 'declined',
          updatedAt: window.serverTimestamp()
        },
        { merge: true }
      );
      await this.loadFriendData();
      this.renderCurrentTab();
      this.searchPeople(document.getElementById('peopleFinderInput')?.value || '');
      this.updateBadges();
    } catch (error) {
      console.error('[ChatApp] Failed declining request:', error);
      alert('Could not decline request. Please try again.');
    }
  },

  /**
   * Cancel outgoing request
   */
  async cancelFriendRequest(requestId) {
    if (!requestId || !window.db) return;
    try {
      await window.setDoc(
        window.doc(window.db, 'goMission_friendRequests', requestId),
        {
          status: 'canceled',
          updatedAt: window.serverTimestamp()
        },
        { merge: true }
      );
      await this.loadFriendData();
      this.renderCurrentTab();
      this.searchPeople(document.getElementById('peopleFinderInput')?.value || '');
      this.updateBadges();
    } catch (error) {
      console.error('[ChatApp] Failed canceling request:', error);
      alert('Could not cancel request. Please try again.');
    }
  },

  /**
   * Load current user's discoverability setting
   */
  async loadCurrentFindMeSetting() {
    const uid = window.currentUser?.uid;
    if (!uid || !window.db) return;
    const current = this.memberCache.get(uid);
    if (current) {
      this.findMeEnabled = current.findMeEnabled !== false;
      this.updateFindMeToggleUI();
      return;
    }
    try {
      const docSnap = await window.getDoc(window.doc(window.db, 'goMission_members', uid));
      if (docSnap.exists()) {
        const data = { id: uid, ...docSnap.data() };
        this.memberCache.set(uid, data);
        this.findMeEnabled = data.findMeEnabled !== false;
      } else {
        this.findMeEnabled = true;
      }
      this.updateFindMeToggleUI();
    } catch (error) {
      console.warn('[ChatApp] Failed loading findMe setting:', error);
    }
  },

  /**
   * Toggle discoverability
   */
  async toggleFindMe() {
    const uid = window.currentUser?.uid;
    if (!uid || !window.db) return;
    const next = !this.findMeEnabled;
    try {
      await window.setDoc(
        window.doc(window.db, 'goMission_members', uid),
        {
          findMeEnabled: next,
          updatedAt: window.serverTimestamp()
        },
        { merge: true }
      );
      this.findMeEnabled = next;
      const cached = this.memberCache.get(uid) || { id: uid };
      cached.findMeEnabled = next;
      this.memberCache.set(uid, cached);
      this.updateFindMeToggleUI();
    } catch (error) {
      console.error('[ChatApp] Failed updating findMe:', error);
      alert('Could not update setting. Please try again.');
    }
  },

  /**
   * Update discoverability toggle button
   */
  updateFindMeToggleUI() {
    const button = document.getElementById('findMeToggleBtn');
    if (!button) return;
    const enabled = this.findMeEnabled === true;
    button.textContent = enabled ? 'ON' : 'OFF';
    button.style.borderColor = enabled ? 'rgba(251, 191, 36, 0.45)' : 'var(--card-border)';
    button.style.color = enabled ? 'var(--mission-gold)' : 'var(--text-muted)';
    button.style.background = enabled ? 'rgba(251, 191, 36, 0.08)' : 'transparent';
  },

  /**
   * Update nav + tab badges
   */
  updateBadges() {
    const incomingCount = this.incomingRequests.length;
    const requestsBadge = document.getElementById('messagesRequestsBadge');
    if (requestsBadge) {
      if (incomingCount > 0) {
        requestsBadge.textContent = incomingCount > 99 ? '99+' : String(incomingCount);
        requestsBadge.classList.remove('hidden');
      } else {
        requestsBadge.classList.add('hidden');
      }
    }

    const navBadge = document.getElementById('messagesNavBadge');
    if (navBadge) {
      const notifCount = typeof Notifications !== 'undefined' ? (Notifications.unreadCount || 0) : 0;
      const total = incomingCount + notifCount;
      if (total > 0) {
        navBadge.textContent = total > 99 ? '99+' : String(total);
        navBadge.classList.remove('hidden');
      } else {
        navBadge.classList.add('hidden');
      }
    }
  },

  /**
   * Pair key for user IDs
   */
  pairKey(a, b) {
    return [a, b].sort().join('__');
  },

  /**
   * Truncate helper for preview strings
   */
  truncateText(text, max = 80) {
    const value = (text || '').toString();
    if (value.length <= max) return value;
    return `${value.slice(0, max - 1)}…`;
  },

  /**
   * Parse Firestore timestamp-like values
   */
  parseTimestamp(value) {
    if (!value) return null;
    if (typeof value.toDate === 'function') {
      const date = value.toDate();
      return Number.isNaN(date?.getTime?.()) ? null : date;
    }
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
    if (typeof value === 'number') {
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? null : date;
    }
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  },

  /**
   * Friendly date/time labels for lists
   */
  formatTime(date) {
    if (!date) return '';
    const now = new Date();
    const target = date instanceof Date ? date : this.parseTimestamp(date);
    if (!target) return '';
    const sameDay = now.toDateString() === target.toDateString();
    if (sameDay) return target.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return target.toLocaleDateString([], { month: 'short', day: 'numeric' });
  },

  /**
   * Member name helper
   */
  getMemberDisplayName(member) {
    if (!member) return '';
    return member.displayName || member.name || (member.email ? member.email.split('@')[0] : '');
  },

  /**
   * Member photo helper
   */
  getMemberPhoto(member) {
    const name = this.getMemberDisplayName(member) || 'User';
    return member?.photoURL || member?.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=4a0404&color=fbbf24`;
  },

  /**
   * Escape helper for HTML rendering
   */
  escapeHtml(value) {
    const str = (value ?? '').toString();
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
};

window.ChatApp = ChatApp;
