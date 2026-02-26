/**
 * Go Mission - Group Chat Module
 * Real-time chat for Mission Groups
 * 
 * Features:
 * - Send/receive messages
 * - Real-time updates
 * - Share devotions to group
 */

const GroupChat = {
  // Chat state
  messages: [],
  unsubscribe: null,
  isOpen: false,
  composeEmojiPickerOpen: false,
  activeReactionPickerMessageId: null,
  reactionOptions: ['❤️', '😂', '👍', '🙌', '🙏', '😢', '😮'],
  emojiCatalog: [
    { emoji: '😀', keywords: 'grinning smile happy joy' },
    { emoji: '😃', keywords: 'smile happy joy' },
    { emoji: '😄', keywords: 'smile laugh happy' },
    { emoji: '😁', keywords: 'grin smile happy' },
    { emoji: '😆', keywords: 'laugh funny lol' },
    { emoji: '😂', keywords: 'laugh lol funny cry' },
    { emoji: '🤣', keywords: 'rofl laugh funny' },
    { emoji: '😊', keywords: 'blush smile happy' },
    { emoji: '🙂', keywords: 'smile calm' },
    { emoji: '😉', keywords: 'wink playful' },
    { emoji: '😍', keywords: 'love heart eyes' },
    { emoji: '🥰', keywords: 'love hearts smile' },
    { emoji: '😘', keywords: 'kiss love heart' },
    { emoji: '😇', keywords: 'angel blessed' },
    { emoji: '🙏', keywords: 'pray prayer thanks amen' },
    { emoji: '🙌', keywords: 'praise hands worship celebrate' },
    { emoji: '👏', keywords: 'clap applause good job' },
    { emoji: '👍', keywords: 'like yes approve' },
    { emoji: '👎', keywords: 'dislike no' },
    { emoji: '🤝', keywords: 'agree handshake unity' },
    { emoji: '💪', keywords: 'strong courage faith' },
    { emoji: '🔥', keywords: 'fire lit passion' },
    { emoji: '✨', keywords: 'sparkles praise glory' },
    { emoji: '❤️', keywords: 'heart love care' },
    { emoji: '💛', keywords: 'heart yellow love' },
    { emoji: '💙', keywords: 'heart blue love' },
    { emoji: '💜', keywords: 'heart purple love' },
    { emoji: '🤍', keywords: 'heart white love' },
    { emoji: '🕊️', keywords: 'dove peace holy spirit' },
    { emoji: '😮', keywords: 'wow surprise amazed' },
    { emoji: '😢', keywords: 'cry sad tears' },
    { emoji: '😭', keywords: 'crying tears sad' },
    { emoji: '😅', keywords: 'relief sweat smile' },
    { emoji: '🤗', keywords: 'hug support comfort' },
    { emoji: '🤔', keywords: 'think question' },
    { emoji: '😴', keywords: 'sleep tired' },
    { emoji: '😎', keywords: 'cool sunglasses' },
    { emoji: '🤩', keywords: 'star struck wow' },
    { emoji: '😡', keywords: 'angry upset' },
    { emoji: '🎉', keywords: 'party celebrate congrats' },
    { emoji: '🙋', keywords: 'raise hand yes me' },
    { emoji: '💯', keywords: 'hundred perfect true' },
    { emoji: '📖', keywords: 'bible word devotion' },
    { emoji: '⛪', keywords: 'church worship' },
    { emoji: '✝️', keywords: 'cross jesus faith' }
  ],
  groupMemberDirectory: [],
  groupMemberDirectoryForGroupId: null,
  mentionPickerOpen: false,
  mentionQuery: '',
  mentionRange: null,
  selectedMentionsByToken: {},
  pendingFocusMessageId: null,
  composerReplyTo: null,
  composerReplyToMessageId: null,
  pendingAttachment: null,
  isSendingAttachment: false,
  isFullscreenComposerOpen: false,
  suppressNextComposerFocusOverlay: false,
  forwardSourceMessageId: null,
  forwardGroupTargets: {},
  forwardDmTargets: {},
  activeChatHeartbeatTimer: null,
  loadMessagesRequestSeq: 0,
  isLoadingMessages: false,
  isSyncingLatestMessages: false,
  messagePageSize: 10,
  historyCursorDoc: null,
  hasMoreHistory: true,
  isLoadingHistory: false,
  historyScrollHandler: null,
  
  /**
   * Initialize chat module
   */
  init() {
    console.log('[GroupChat] Initializing...');
  },
  
  /**
   * Open the chat modal
   */
  async open() {
    if (!Groups.currentGroup) {
      alert('You need to join a group first');
      return;
    }
    
    // Verify user is still a member or guest - refetch group data
    try {
      const groupDoc = await window.getDoc(window.doc(window.db, 'goMission_groups', Groups.currentGroup.id));
      if (!groupDoc.exists()) {
        alert('This group no longer exists.');
        return;
      }
      
      const groupData = groupDoc.data();
      const isMember = groupData.members?.includes(window.currentUser.uid);
      const isGuest = groupData.guests?.some(g => g.odId === window.currentUser.uid);
      
      if (!isMember && !isGuest) {
        alert('You are no longer a member of this group.');
        // Clear user's reference to this group
        await window.setDoc(
          window.doc(window.db, 'goMission_members', window.currentUser.uid),
          { uplineGroupId: null },
          { merge: true }
        );
        
        // Clear local group reference
        Groups.currentGroup = null;
        
        // Reload MyGroups to reflect changes
        if (typeof MyGroups !== 'undefined') {
          MyGroups.uplineGroup = null;
          await MyGroups.loadGroups();
          MyGroups.render();
          MyGroups.updateMissionCard();
        }
        return;
      }
      
      // Update local group data with fresh data
      Groups.currentGroup = { id: groupDoc.id, ...groupData };
    } catch (error) {
      console.error('[GroupChat] Error verifying membership:', error);
    }
    
    const groupId = Groups.currentGroup.id;
    console.log('[GroupChat] Opening chat for group:', groupId);
    
    this.isOpen = true;
    this.currentGroupId = groupId; // Store for reference
    this.updateGroupHeader();

    // Show modal immediately for faster perceived open time.
    const modal = document.getElementById('chatModal');
    if (modal) {
      modal.classList.remove('hidden');
    }
    this.resetMessagePaginationState();
    this.bindHistoryScroll();

    // Keep mention directory fresh, but don't block chat open on this.
    Promise.resolve(this.loadGroupMemberDirectory(true)).catch((error) => {
      console.warn('[GroupChat] Could not preload member directory:', error);
    });

    // Set active chat in Firestore (prevents notifications while chat is open).
    // Do not block the UI open on this network call.
    Promise.resolve(this.setActiveChat(groupId)).catch((error) => {
      console.warn('[GroupChat] Active chat set failed (non-blocking):', error);
    });
    this.startActiveChatHeartbeat(groupId);
    this.composeEmojiPickerOpen = false;
    this.activeReactionPickerMessageId = null;
    this.mentionPickerOpen = false;
    this.selectedMentionsByToken = {};
    this.composerReplyTo = null;
    this.composerReplyToMessageId = null;
    this.releasePendingAttachmentPreview();
    this.pendingAttachment = null;
    this.isSendingAttachment = false;
    this.forwardSourceMessageId = null;
    this.closeComposeEmojiPicker();
    this.closeMentionPicker();
    this.closeForwardModal(true);
    this.closeFullscreenComposer(true, true);
    this.renderEmojiPicker();
    const input = document.getElementById('chatInput');
    if (input) input.value = '';
    this.renderComposerPreview('');
    this.renderReplyDraft();
    this.renderAttachmentDraft();
    this.syncComposerPreviewScroll({ target: input });
    
    // Update member count in header
    this.updateMemberCount();
    
    // Mark notifications as read
    if (typeof Notifications !== 'undefined') {
      Notifications.markAsRead();
    }
    
    // Load messages
    await this.loadMessages();
    
    // Subscribe to real-time updates
    this.subscribeToMessages();
    
    // Scroll to bottom
    this.scrollToBottom();
  },
  
  /**
   * Close the chat modal
   */
  close() {
    this.isOpen = false;
    this.composeEmojiPickerOpen = false;
    this.activeReactionPickerMessageId = null;
    this.mentionPickerOpen = false;
    this.selectedMentionsByToken = {};
    this.pendingFocusMessageId = null;
    this.composerReplyTo = null;
    this.composerReplyToMessageId = null;
    this.releasePendingAttachmentPreview();
    this.pendingAttachment = null;
    this.isSendingAttachment = false;
    this.forwardSourceMessageId = null;
    this.closeComposeEmojiPicker();
    this.closeMentionPicker();
    this.closeForwardModal(true);
    this.closeFullscreenComposer(true, true);
    const input = document.getElementById('chatInput');
    if (input) input.value = '';
    this.renderComposerPreview('');
    this.renderReplyDraft();
    this.renderAttachmentDraft();
    this.syncComposerPreviewScroll({ target: input });
    
    // Hide modal
    const modal = document.getElementById('chatModal');
    if (modal) {
      modal.classList.add('hidden');
    }
    
    // Clear active chat in Firestore (re-enable notifications)
    this.stopActiveChatHeartbeat();
    this.clearActiveChat();
    this.unbindHistoryScroll();
    this.resetMessagePaginationState();
    
    // Unsubscribe from updates
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    
    // Clear poll interval
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  },
  
  /**
   * Set active chat in Firestore (to prevent notifications)
   */
  async setActiveChat(groupId) {
    if (!window.db || !window.currentUser) return;
    
    try {
      await window.setDoc(
        window.doc(window.db, 'goMission_members', window.currentUser.uid),
        {
          activeChat: groupId,
          activeChatUpdatedAt: window.serverTimestamp()
        },
        { merge: true }
      );
      console.log('[GroupChat] Active chat set:', groupId);
    } catch (error) {
      console.error('[GroupChat] Error setting active chat:', error);
    }
  },
  
  /**
   * Clear active chat in Firestore (re-enable notifications)
   */
  async clearActiveChat() {
    if (!window.db || !window.currentUser) return;
    
    try {
      await window.setDoc(
        window.doc(window.db, 'goMission_members', window.currentUser.uid),
        {
          activeChat: null,
          activeChatUpdatedAt: window.serverTimestamp()
        },
        { merge: true }
      );
      console.log('[GroupChat] Active chat cleared');
    } catch (error) {
      console.error('[GroupChat] Error clearing active chat:', error);
    }
  },

  /**
   * Keep active chat freshness updated to avoid stale suppression in push routing.
   */
  startActiveChatHeartbeat(groupId) {
    this.stopActiveChatHeartbeat();
    if (!groupId) return;
    this.activeChatHeartbeatTimer = setInterval(() => {
      if (!this.isOpen || this.currentGroupId !== groupId) {
        this.stopActiveChatHeartbeat();
        return;
      }
      this.setActiveChat(groupId);
    }, 60000);
  },

  /**
   * Stop active chat heartbeat.
   */
  stopActiveChatHeartbeat() {
    if (this.activeChatHeartbeatTimer) {
      clearInterval(this.activeChatHeartbeatTimer);
      this.activeChatHeartbeatTimer = null;
    }
  },

  /**
   * Reset pagination state for a new/opening chat thread.
   */
  resetMessagePaginationState() {
    this.historyCursorDoc = null;
    this.hasMoreHistory = true;
    this.isLoadingHistory = false;
    this.isLoadingMessages = false;
    this.isSyncingLatestMessages = false;
    this.loadMessagesRequestSeq += 1;
  },

  /**
   * Attach scroll listener that loads older history only when user scrolls up.
   */
  bindHistoryScroll() {
    const container = document.getElementById('chatMessages');
    if (!container) return;
    if (this.historyScrollHandler) {
      container.removeEventListener('scroll', this.historyScrollHandler);
    }
    this.historyScrollHandler = () => {
      if (!this.isOpen) return;
      if (container.scrollTop > 80) return;
      if (!this.hasMoreHistory || this.isLoadingHistory || this.isLoadingMessages) return;
      this.loadOlderMessages();
    };
    container.addEventListener('scroll', this.historyScrollHandler, { passive: true });
  },

  /**
   * Remove scroll listener when chat closes.
   */
  unbindHistoryScroll() {
    const container = document.getElementById('chatMessages');
    if (container && this.historyScrollHandler) {
      container.removeEventListener('scroll', this.historyScrollHandler);
    }
    this.historyScrollHandler = null;
  },

  /**
   * Build ordered query for chat history/latest messages.
   */
  buildOrderedMessageQuery(groupId, extraConstraints = []) {
    return window.query(
      window.collection(window.db, 'goMission_chats'),
      window.where('groupId', '==', groupId),
      window.orderBy('createdAt', 'desc'),
      ...extraConstraints
    );
  },

  /**
   * Convert message createdAt to comparable timestamp.
   */
  getMessageTimestampMs(message) {
    const raw = message?.createdAt;
    if (raw?.toDate) {
      const dt = raw.toDate();
      const time = dt?.getTime?.();
      return Number.isFinite(time) ? time : 0;
    }
    if (raw instanceof Date) {
      const time = raw.getTime();
      return Number.isFinite(time) ? time : 0;
    }
    if (typeof raw === 'string' || typeof raw === 'number') {
      const parsed = new Date(raw).getTime();
      return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
  },

  /**
   * Sort messages oldest -> newest for chat rendering.
   */
  sortMessagesAsc(messages) {
    return [...messages].sort((a, b) => this.getMessageTimestampMs(a) - this.getMessageTimestampMs(b));
  },

  /**
   * Merge a batch of messages into current thread state by id.
   */
  mergeMessages(batch) {
    if (!Array.isArray(batch) || batch.length === 0) return false;
    const byId = new Map(this.messages.map((message) => [message.id, message]));
    let changed = false;
    batch.forEach((message) => {
      if (!message?.id) return;
      const prev = byId.get(message.id);
      if (!prev) {
        byId.set(message.id, message);
        changed = true;
        return;
      }
      const prevJson = JSON.stringify(prev);
      const nextJson = JSON.stringify(message);
      if (prevJson !== nextJson) {
        byId.set(message.id, { ...prev, ...message });
        changed = true;
      }
    });
    if (!changed) return false;
    this.messages = this.sortMessagesAsc(Array.from(byId.values()));
    return true;
  },

  /**
   * Read latest batch (descending in Firestore, reversed for UI).
   */
  async fetchLatestMessagesPage(groupId) {
    const q = this.buildOrderedMessageQuery(groupId, [window.limit(this.messagePageSize)]);
    const snapshot = await window.getDocs(q);
    const docs = Array.from(snapshot.docs || []);
    const messages = docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })).reverse();
    return {
      snapshot,
      docs,
      messages,
      oldestDoc: docs.length ? docs[docs.length - 1] : null,
      hasMoreHistory: docs.length === this.messagePageSize
    };
  },
  
  /**
   * Load recent messages
   */
  async loadMessages() {
    if (!Groups.currentGroup || !window.db) {
      console.log('[GroupChat] No group or db available');
      return;
    }
    if (this.isLoadingMessages) return;
    
    const groupId = Groups.currentGroup.id;
    const requestSeq = ++this.loadMessagesRequestSeq;
    this.isLoadingMessages = true;

    try {
      const { messages, oldestDoc, hasMoreHistory } = await this.fetchLatestMessagesPage(groupId);

      // Ignore stale responses if user already switched groups.
      if (!this.isOpen || this.currentGroupId !== groupId || this.loadMessagesRequestSeq !== requestSeq) {
        return;
      }
      this.messages = messages;
      this.historyCursorDoc = oldestDoc;
      this.hasMoreHistory = hasMoreHistory;
      this.renderMessages();
      this.updateMemberCount();
    } catch (error) {
      console.error('[GroupChat] Error loading messages:', error);
      // Show error in chat area
      const container = document.getElementById('chatMessages');
      if (container) {
        container.innerHTML = `
          <div class="text-center py-8">
            <p class="text-red-400 text-sm">Error loading messages</p>
            <p class="text-slate-600 text-xs mt-1">${error.message}</p>
          </div>
        `;
      }
    } finally {
      // Only release loading flag for the latest request.
      if (this.loadMessagesRequestSeq === requestSeq) {
        this.isLoadingMessages = false;
      }
    }
  },

  /**
   * Fetch and prepend older message history when user scrolls upward.
   */
  async loadOlderMessages() {
    if (!this.isOpen || !this.currentGroupId || !window.db) return;
    if (!this.hasMoreHistory || this.isLoadingHistory || !this.historyCursorDoc) return;
    if (typeof window.startAfter !== 'function') return;

    const groupId = this.currentGroupId;
    const requestSeq = ++this.loadMessagesRequestSeq;
    this.isLoadingHistory = true;

    const container = document.getElementById('chatMessages');
    const prevScrollTop = container ? container.scrollTop : 0;
    const prevScrollHeight = container ? container.scrollHeight : 0;

    try {
      const q = this.buildOrderedMessageQuery(groupId, [
        window.startAfter(this.historyCursorDoc),
        window.limit(this.messagePageSize)
      ]);
      const snapshot = await window.getDocs(q);
      const docs = Array.from(snapshot.docs || []);

      if (!this.isOpen || this.currentGroupId !== groupId || this.loadMessagesRequestSeq !== requestSeq) {
        return;
      }

      const olderMessages = docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })).reverse();
      if (olderMessages.length > 0) {
        const merged = [...olderMessages, ...this.messages];
        const seen = new Set();
        this.messages = merged.filter((message) => {
          if (!message?.id || seen.has(message.id)) return false;
          seen.add(message.id);
          return true;
        });
        this.messages = this.sortMessagesAsc(this.messages);
        this.renderMessages();
        if (container) {
          const nextHeight = container.scrollHeight;
          container.scrollTop = Math.max(0, prevScrollTop + (nextHeight - prevScrollHeight));
        }
      }

      this.historyCursorDoc = docs.length ? docs[docs.length - 1] : this.historyCursorDoc;
      this.hasMoreHistory = docs.length === this.messagePageSize;
    } catch (error) {
      console.warn('[GroupChat] Error loading older messages:', error);
    } finally {
      if (this.loadMessagesRequestSeq === requestSeq) {
        this.isLoadingHistory = false;
      } else {
        this.isLoadingHistory = false;
      }
    }
  },

  /**
   * Refresh only the latest message page and merge into current thread.
   */
  async refreshLatestMessages() {
    if (!this.isOpen || !this.currentGroupId || !window.db) return;
    if (this.isSyncingLatestMessages) return;

    const groupId = this.currentGroupId;
    const requestSeq = ++this.loadMessagesRequestSeq;
    this.isSyncingLatestMessages = true;

    const container = document.getElementById('chatMessages');
    const wasNearBottom = !!container && (container.scrollHeight - container.scrollTop - container.clientHeight) < 120;
    const prevScrollTop = container ? container.scrollTop : 0;
    const prevScrollHeight = container ? container.scrollHeight : 0;

    try {
      const { messages, oldestDoc, hasMoreHistory } = await this.fetchLatestMessagesPage(groupId);
      if (!this.isOpen || this.currentGroupId !== groupId || this.loadMessagesRequestSeq !== requestSeq) {
        return;
      }
      const changed = this.mergeMessages(messages);
      if (!this.historyCursorDoc && oldestDoc) {
        this.historyCursorDoc = oldestDoc;
      }
      if (this.messages.length <= this.messagePageSize) {
        this.hasMoreHistory = hasMoreHistory;
        this.historyCursorDoc = oldestDoc || this.historyCursorDoc;
      }
      if (!changed) return;
      this.renderMessages();
      if (container) {
        if (wasNearBottom) {
          this.scrollToBottom();
        } else {
          const nextHeight = container.scrollHeight;
          container.scrollTop = Math.max(0, prevScrollTop + (nextHeight - prevScrollHeight));
        }
      }
      this.updateMemberCount();
    } catch (error) {
      console.warn('[GroupChat] Error refreshing latest messages:', error);
    } finally {
      if (this.loadMessagesRequestSeq === requestSeq) {
        this.isSyncingLatestMessages = false;
      } else {
        this.isSyncingLatestMessages = false;
      }
    }
  },
  
  /**
   * Update member count in header
   */
  updateMemberCount() {
    const memberCount = document.getElementById('chatMemberCount');
    if (memberCount && Groups.currentGroup) {
      const count = Groups.currentGroup.members?.length || Groups.currentGroup.currentCount || 0;
      memberCount.textContent = `${count} member${count !== 1 ? 's' : ''}`;
    }
  },
  
  /**
   * Subscribe to real-time message updates
   */
  subscribeToMessages() {
    if (!Groups.currentGroup || !window.db) return;
    const groupId = Groups.currentGroup.id;

    if (this.unsubscribe) {
      try { this.unsubscribe(); } catch (_) {}
      this.unsubscribe = null;
    }
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }

    // Prefer realtime updates to avoid full-thread polling reloads every 5s.
    if (typeof window.onSnapshot === 'function') {
      try {
        const q = this.buildOrderedMessageQuery(groupId, [window.limit(this.messagePageSize)]);

        this.unsubscribe = window.onSnapshot(q, (snapshot) => {
          if (!this.isOpen || this.currentGroupId !== groupId) return;
          const docs = Array.from(snapshot.docs || []);
          const latestMessages = docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })).reverse();
          const oldestDoc = docs.length ? docs[docs.length - 1] : null;
          const hasMoreHistory = docs.length === this.messagePageSize;

          const container = document.getElementById('chatMessages');
          const wasNearBottom = !!container && (container.scrollHeight - container.scrollTop - container.clientHeight) < 120;
          const prevScrollTop = container ? container.scrollTop : 0;
          const prevScrollHeight = container ? container.scrollHeight : 0;

          let changed = false;
          if (this.messages.length === 0) {
            this.messages = latestMessages;
            changed = true;
          } else {
            changed = this.mergeMessages(latestMessages);
          }

          if (!this.historyCursorDoc && oldestDoc) {
            this.historyCursorDoc = oldestDoc;
          }
          if (this.messages.length <= this.messagePageSize) {
            this.hasMoreHistory = hasMoreHistory;
            this.historyCursorDoc = oldestDoc || this.historyCursorDoc;
          }

          if (!changed) {
            this.updateMemberCount();
            return;
          }

          this.renderMessages();
          if (container) {
            if (wasNearBottom) {
              this.scrollToBottom();
            } else {
              const nextHeight = container.scrollHeight;
              container.scrollTop = Math.max(0, prevScrollTop + (nextHeight - prevScrollHeight));
            }
          }
          this.updateMemberCount();
        }, (error) => {
          console.warn('[GroupChat] Realtime subscribe failed, falling back to polling:', error);
          if (!this.pollInterval) {
            this.pollInterval = setInterval(() => {
              if (this.isOpen && this.currentGroupId === groupId && !this.isLoadingMessages && !this.isSyncingLatestMessages) {
                this.refreshLatestMessages();
              }
            }, 6000);
          }
        });
        return;
      } catch (error) {
        console.warn('[GroupChat] Could not start realtime listener, using polling:', error);
      }
    }

    this.pollInterval = setInterval(() => {
      if (this.isOpen && this.currentGroupId === groupId && !this.isLoadingMessages && !this.isSyncingLatestMessages) {
        this.refreshLatestMessages();
      }
    }, 6000);
  },
  
  /**
   * Send a message
   */
  async sendMessage(text) {
    if (!Groups.currentGroup || !window.currentUser || !window.db) return;
    const groupId = Groups.currentGroup.id;
    const trimmedText = String(text || '').trim();
    const attachment = this.pendingAttachment;
    if (!trimmedText && !attachment?.file) return;
    if (this.isSendingAttachment) return;
    
    // Verify user is still a member or guest of the group
    const isMember = Groups.currentGroup.members?.includes(window.currentUser.uid);
    const isGuest = Groups.currentGroup.guests?.some(g => g.odId === window.currentUser.uid);
    
    if (!isMember && !isGuest) {
      alert('You are no longer a member of this group.');
      this.close();
      return;
    }
    
    try {
      let imagePayload = null;
      if (attachment?.file) {
        this.isSendingAttachment = true;
        imagePayload = await this.uploadImageAttachment(attachment.file);
      }

      const mentions = (trimmedText && /@[a-zA-Z0-9._-]{2,32}/.test(trimmedText))
        ? await this.extractMentionsFromText(trimmedText)
        : [];
      const replySource = this.composerReplyToMessageId
        ? (this.messages.find((item) => item.id === this.composerReplyToMessageId) || this.composerReplyTo)
        : this.composerReplyTo;
      const replyTo = this.normalizeReplyPayload(replySource);
      const hasImage = !!imagePayload?.url;
      const messageText = trimmedText || (hasImage ? '📷 Photo' : '');
      const message = {
        groupId,
        senderId: window.currentUser.uid,
        senderName: window.currentUser.displayName || window.currentUser.email || 'Unknown',
        senderPhoto: window.currentUser.photoURL || '',
        text: messageText,
        type: hasImage ? 'image' : 'text',
        imageUrl: imagePayload?.url || '',
        imagePath: imagePayload?.path || '',
        imageName: imagePayload?.name || '',
        imageSize: imagePayload?.size || 0,
        imageMimeType: imagePayload?.mimeType || '',
        imageCaption: trimmedText || '',
        replyTo: replyTo || null,
        replyToMessageId: replyTo?.messageId || this.composerReplyToMessageId || null,
        replyToSenderName: replyTo?.senderName || '',
        replyToText: replyTo?.text || '',
        mentions,
        mentionedUserIds: mentions.map((mention) => mention.uid),
        createdAt: window.serverTimestamp()
      };
      
      await window.addDoc(window.collection(window.db, 'goMission_chats'), message);
      await this.updateGroupThreadPreview({
        groupId,
        type: hasImage ? 'image' : 'text',
        text: trimmedText || (hasImage ? '📷 Photo' : ''),
        senderName: message.senderName
      });
      
      // Clear input
      const input = document.getElementById('chatInput');
      if (input) input.value = '';
      this.closeComposeEmojiPicker(true);
      this.closeMentionPicker();
      this.selectedMentionsByToken = {};
      this.composerReplyTo = null;
      this.composerReplyToMessageId = null;
      this.releasePendingAttachmentPreview();
      this.pendingAttachment = null;
      this.resetAttachmentInputs();
      this.renderComposerPreview('');
      this.renderReplyDraft();
      this.renderAttachmentDraft();
      
      // Realtime listener will render the new message. Only force reload in polling mode.
      if (!this.unsubscribe) {
        await this.refreshLatestMessages();
      }
      this.scrollToBottom();
      
    } catch (error) {
      console.error('[GroupChat] Error sending message:', error);
      alert('Error sending message. Please try again.');
    } finally {
      this.isSendingAttachment = false;
    }
  },
  
  /**
   * Share a devotion to the group chat
   */
  async shareDevotionToChat(devotionData) {
    if (!Groups.currentGroup || !window.currentUser || !window.db) return;
    
    try {
      const message = {
        groupId: Groups.currentGroup.id,
        senderId: window.currentUser.uid,
        senderName: window.currentUser.displayName || window.currentUser.email || 'Unknown',
        senderPhoto: window.currentUser.photoURL || '',
        type: 'devotion',
        devotion: {
          book: devotionData.book,
          chapter: devotionData.chapter,
          verses: devotionData.highlightedVerses,
          question: devotionData.question,
          reflection: devotionData.reflection,
          commitment: devotionData.commitment || '',
          language: devotionData.language || (window.i18n?.getLang?.() || 'tl'),
          godSaidTitle: devotionData.godSaidTitle || '',
          godSaidReference: devotionData.godSaidReference || '',
          godSaidText: devotionData.godSaidText || '',
          understandingTitle: devotionData.understandingTitle || devotionData.reflectionTitle || '',
          understandingText: devotionData.understandingText || devotionData.reflectionText || devotionData.reflection || '',
          reflectionTitle: devotionData.reflectionTitle || '',
          reflectionText: devotionData.reflectionText || devotionData.reflection || '',
          actionTitle: devotionData.actionTitle || '',
          actionText: devotionData.actionText || devotionData.commitment || '',
          prayerRequests: Array.isArray(devotionData.prayerRequests) ? devotionData.prayerRequests : []
        },
        createdAt: window.serverTimestamp()
      };
      
      await window.addDoc(window.collection(window.db, 'goMission_chats'), message);
      await this.updateGroupThreadPreview({
        groupId: Groups.currentGroup.id,
        type: 'devotion',
        text: 'Shared a devotion',
        senderName: message.senderName
      });
      
      return true;
      
    } catch (error) {
      console.error('[GroupChat] Error sharing devotion:', error);
      return false;
    }
  },

  getDevotionLabels(lang = 'tl') {
    if (lang === 'en') {
      return {
        godSaidTitle: 'What did God say',
        understandingTitle: 'What is my understanding',
        actionTitle: 'What will I do',
        prayerRequestTitle: 'Prayer Requests',
        prayAction: 'I prayed',
        prayedBy: 'People praying'
      };
    }
    return {
      godSaidTitle: 'Ano ang sinabi ng Diyos',
      understandingTitle: 'Ano ang aking pagkaunawa',
      actionTitle: 'Ano ang aking gagawin',
      prayerRequestTitle: 'Mga Prayer Request',
      prayAction: 'Nananalangin ako',
      prayedBy: 'Mga nananalangin'
    };
  },

  getDevotionReference(devotion = {}) {
    if (devotion.godSaidReference) return String(devotion.godSaidReference);
    const book = String(devotion.book || '').trim();
    const chapter = String(devotion.chapter || '').trim();
    const verseNumbers = Array.isArray(devotion.verses)
      ? devotion.verses
        .map(v => (typeof v === 'object' ? Number(v.verse) : Number(v)))
        .filter(v => Number.isFinite(v))
      : [];
    const verses = verseNumbers.length ? `:${verseNumbers.join(',')}` : '';
    return `${book} ${chapter}${verses}`.trim();
  },

  formatDevotionMultiline(text) {
    return this.escapeHtml(String(text || '')).replace(/\n/g, '<br>');
  },

  normalizeDevotionPrayerRequests(rawPrayerRequests) {
    if (!Array.isArray(rawPrayerRequests)) return [];
    const seen = new Set();
    const list = [];
    rawPrayerRequests.forEach((item) => {
      const text = String(item?.text || '').trim();
      if (!text) return;
      const id = String(item?.id || `prayer_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
      if (seen.has(id)) return;
      seen.add(id);
      list.push({
        id,
        text,
        answered: !!item?.answered,
        answeredAt: item?.answeredAt || null,
        remarks: String(item?.remarks || '').trim()
      });
    });
    return list;
  },

  normalizePrayerSupportMap(rawSupports) {
    if (!rawSupports || typeof rawSupports !== 'object') return {};
    const normalized = {};
    Object.entries(rawSupports).forEach(([prayerId, users]) => {
      const id = String(prayerId || '').trim();
      if (!id || !Array.isArray(users)) return;
      const dedupe = new Map();
      users.forEach((user) => {
        const uid = String(user?.uid || '').trim();
        if (!uid) return;
        dedupe.set(uid, {
          uid,
          name: String(user?.name || 'Member').trim() || 'Member',
          senderPhoto: String(user?.senderPhoto || '').trim(),
          prayedAt: user?.prayedAt || null
        });
      });
      if (dedupe.size > 0) normalized[id] = Array.from(dedupe.values());
    });
    return normalized;
  },

  getPrayerSupportSummary(supportMap, prayerId) {
    const users = Array.isArray(supportMap?.[prayerId]) ? supportMap[prayerId] : [];
    const uid = window.currentUser?.uid;
    const count = users.length;
    const isMine = !!uid && users.some(user => user.uid === uid);
    const names = users
      .map(user => String(user.name || '').trim())
      .filter(Boolean);
    return { count, isMine, names };
  },

  renderDevotionSections(devotion = {}, messageId = '') {
    const lang = devotion.language === 'en' ? 'en' : 'tl';
    const labels = this.getDevotionLabels(lang);
    const godSaidTitle = devotion.godSaidTitle || labels.godSaidTitle;
    const understandingTitle = devotion.understandingTitle || devotion.reflectionTitle || labels.understandingTitle;
    const actionTitle = devotion.actionTitle || labels.actionTitle;
    const reference = this.getDevotionReference(devotion);
    const godSaidText = String(devotion.godSaidText || '').trim();
    const understandingText = String(devotion.understandingText || devotion.reflectionText || devotion.reflection || '').trim();
    const actionText = String(devotion.actionText || devotion.commitment || '').trim();
    const prayerRequests = this.normalizeDevotionPrayerRequests(devotion.prayerRequests || []);
    const prayerSupports = this.normalizePrayerSupportMap(devotion.prayerSupports || {});
    const messageIdForJs = String(messageId || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");

    return `
      <div class="space-y-2">
        <div class="rounded-lg border border-amber-500/30 bg-amber-500/8 p-2.5">
          <p class="text-[11px] font-bold text-amber-500 uppercase tracking-wide">${this.escapeHtml(godSaidTitle)}</p>
          ${reference ? `<p class="text-[11px] text-[var(--text-muted)] mt-0.5">${this.escapeHtml(reference)}</p>` : ''}
          ${godSaidText ? `<p class="text-xs text-[var(--text-color)] leading-relaxed mt-1">${this.formatDevotionMultiline(godSaidText)}</p>` : ''}
        </div>
        <div class="rounded-lg border border-[var(--card-border)] bg-[var(--bg-color)]/35 p-2.5">
          <p class="text-[11px] font-bold text-amber-500 uppercase tracking-wide">${this.escapeHtml(understandingTitle)}</p>
          <p class="text-xs text-[var(--text-color)] leading-relaxed mt-1">${this.formatDevotionMultiline(understandingText)}</p>
        </div>
        <div class="rounded-lg border border-[var(--card-border)] bg-[var(--bg-color)]/35 p-2.5">
          <p class="text-[11px] font-bold text-amber-500 uppercase tracking-wide">${this.escapeHtml(actionTitle)}</p>
          <p class="text-xs text-[var(--text-color)] leading-relaxed mt-1">${this.formatDevotionMultiline(actionText)}</p>
        </div>
        ${prayerRequests.length > 0 ? `
          <div class="rounded-lg border border-[var(--card-border)] bg-[var(--bg-color)]/35 p-2.5">
            <p class="text-[11px] font-bold text-amber-500 uppercase tracking-wide mb-1">${this.escapeHtml(labels.prayerRequestTitle)}</p>
            <div class="space-y-2">
              ${prayerRequests.map((item) => {
                const prayerIdForJs = String(item.id || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
                const support = this.getPrayerSupportSummary(prayerSupports, item.id);
                const namesPreview = support.names.slice(0, 3).join(', ');
                const moreCount = support.names.length > 3 ? ` +${support.names.length - 3}` : '';
                return `
                  <div class="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] p-2">
                    <p class="text-xs text-[var(--text-color)] leading-relaxed">${this.formatDevotionMultiline(item.text)}</p>
                    ${item.remarks ? `<p class="text-[11px] text-[var(--text-muted)] mt-1">${this.formatDevotionMultiline(item.remarks)}</p>` : ''}
                    <div class="flex items-center justify-between gap-2 mt-2 flex-wrap">
                      <button onclick="GroupChat.togglePrayerSupport('${messageIdForJs}', '${prayerIdForJs}')" class="inline-flex items-center gap-1 px-2 py-1 rounded-full border text-[11px] transition-colors ${support.isMine ? 'border-amber-500/70 bg-amber-500/20 text-amber-500' : 'border-[var(--card-border)] bg-[var(--input-bg)] text-[var(--text-muted)] hover:text-[var(--text-color)]'}">
                        <span>🙏</span>
                        <span>${this.escapeHtml(labels.prayAction)}</span>
                        <span>${support.count > 0 ? `(${support.count})` : ''}</span>
                      </button>
                      ${support.count > 0 ? `<p class="text-[10px] text-[var(--text-muted)]">${this.escapeHtml(labels.prayedBy)}: ${this.escapeHtml(namesPreview)}${this.escapeHtml(moreCount)}</p>` : ''}
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    `;
  },

  async togglePrayerSupport(messageId, prayerId) {
    const uid = window.currentUser?.uid;
    if (!uid || !window.db || !messageId || !prayerId) return;

    const message = this.messages.find((item) => item.id === messageId);
    if (!message || message.type !== 'devotion') return;

    const devotion = message.devotion || {};
    const prayerRequests = this.normalizeDevotionPrayerRequests(devotion.prayerRequests || []);
    const targetPrayer = prayerRequests.find(item => String(item.id) === String(prayerId));
    if (!targetPrayer) return;

    const supportMap = this.normalizePrayerSupportMap(devotion.prayerSupports || {});
    const current = Array.isArray(supportMap[prayerId]) ? [...supportMap[prayerId]] : [];
    const existingIndex = current.findIndex(user => user.uid === uid);

    if (existingIndex >= 0) {
      current.splice(existingIndex, 1);
    } else {
      current.push({
        uid,
        name: window.currentUser.displayName || window.currentUser.email || 'Member',
        senderPhoto: window.currentUser.photoURL || '',
        prayedAt: new Date().toISOString()
      });
    }

    if (current.length > 0) {
      supportMap[prayerId] = current;
    } else {
      delete supportMap[prayerId];
    }

    const updatedDevotion = {
      ...devotion,
      prayerSupports: supportMap
    };

    try {
      await window.setDoc(
        window.doc(window.db, 'goMission_chats', messageId),
        {
          devotion: updatedDevotion,
          reactionsUpdatedAt: window.serverTimestamp()
        },
        { merge: true }
      );

      message.devotion = updatedDevotion;
      this.renderMessages();
    } catch (error) {
      console.error('[GroupChat] Error updating prayer support:', error);
    }
  },
  
  /**
   * Render messages in the chat window
   */
  renderMessages() {
    const container = document.getElementById('chatMessages');
    if (!container) return;
    
    if (this.messages.length === 0) {
      container.innerHTML = `
        <div class="text-center py-8">
          <p class="text-[var(--text-muted)] text-sm">No messages yet</p>
          <p class="text-[var(--text-muted)] text-xs mt-1 opacity-60">Start the conversation!</p>
        </div>
      `;
      return;
    }
    
    let html = '';
    let lastDate = '';
    
    for (const msg of this.messages) {
      const isMe = msg.senderId === window.currentUser?.uid;
      const msgDate = msg.createdAt?.toDate ? msg.createdAt.toDate() : new Date();
      const dateStr = msgDate.toLocaleDateString();
      const timeStr = msgDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      // Date separator
      if (dateStr !== lastDate) {
        html += `
          <div class="text-center my-4">
            <span class="text-[10px] text-[var(--text-muted)] bg-[var(--card-bg)] px-3 py-1 rounded-full">${dateStr}</span>
          </div>
        `;
        lastDate = dateStr;
      }
      
      if (msg.type === 'devotion') {
        // Devotion share
        html += `
          <div id="chatMessage_${msg.id}" class="group mb-3 ${isMe ? 'ml-8' : 'mr-8'}">
            <div class="flex items-start gap-2 ${isMe ? 'flex-row-reverse' : ''}">
              <img src="${msg.senderPhoto || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(msg.senderName) + '&background=4a0404&color=fbbf24'}" 
                   class="w-8 h-8 rounded-full flex-shrink-0">
              <div class="${isMe ? 'bg-amber-500/20' : 'bg-[var(--card-bg)]'} rounded-xl p-3 max-w-[85%] border border-[var(--card-border)]">
                <p class="text-[10px] text-[var(--text-muted)] mb-1">${isMe ? 'You' : msg.senderName}</p>
                ${this.renderForwardedFlag(msg.forwardedFrom)}
                ${this.renderReplyBlock(msg)}
                ${this.renderDevotionSections(msg.devotion || {}, msg.id)}
                <p class="text-[10px] text-[var(--text-muted)] opacity-60">${timeStr}${this.renderEditedMeta(msg)}</p>
                ${this.renderReactionControls(msg, isMe)}
              </div>
            </div>
          </div>
        `;
      } else {
        // Regular text message
        html += `
          <div id="chatMessage_${msg.id}" class="group mb-3 ${isMe ? 'ml-8' : 'mr-8'}">
            <div class="flex items-start gap-2 ${isMe ? 'flex-row-reverse' : ''}">
              <img src="${msg.senderPhoto || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(msg.senderName) + '&background=4a0404&color=fbbf24'}" 
                   class="w-8 h-8 rounded-full flex-shrink-0">
              <div class="${isMe ? 'bg-amber-500/20' : 'bg-[var(--card-bg)]'} rounded-xl p-3 max-w-[85%] border border-[var(--card-border)]">
                <p class="text-[10px] text-[var(--text-muted)] mb-1">${isMe ? 'You' : msg.senderName}</p>
                ${this.renderForwardedFlag(msg.forwardedFrom)}
                ${this.renderReplyBlock(msg)}
                ${this.renderImageContent(msg)}
                ${this.renderMessageText(msg)}
                <p class="text-[10px] text-[var(--text-muted)] mt-1 opacity-60">${timeStr}${this.renderEditedMeta(msg)}</p>
                ${this.renderReactionControls(msg, isMe)}
              </div>
            </div>
          </div>
        `;
      }
    }
    
    container.innerHTML = html;
    if (this.pendingFocusMessageId) {
      this.focusMessage(this.pendingFocusMessageId);
      this.pendingFocusMessageId = null;
    }
  },

  /**
   * Bring a specific message into view and pulse-highlight it briefly.
   */
  focusMessage(messageId) {
    if (!messageId) return;
    const messageEl = document.getElementById(`chatMessage_${messageId}`);
    if (!messageEl) return;
    messageEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    messageEl.classList.add('ring-2', 'ring-amber-500/70', 'rounded-xl');
    setTimeout(() => {
      messageEl.classList.remove('ring-2', 'ring-amber-500/70', 'rounded-xl');
    }, 2200);
  },

  /**
   * Render "forwarded" label for forwarded messages.
   */
  renderForwardedFlag(forwardedFrom) {
    if (!forwardedFrom) return '';
    const sourceName = this.escapeHtml(forwardedFrom.senderName || 'Someone');
    return `
      <p class="text-[10px] text-[var(--text-muted)] mb-1">
        ↪ Forwarded${sourceName ? ` from ${sourceName}` : ''}
      </p>
    `;
  },

  /**
   * Render quoted reply block shown inside message bubble.
   */
  renderReplyBlock(message) {
    const replyTo = (message && typeof message.replyTo === 'object') ? message.replyTo : null;
    const replySenderRaw = replyTo?.senderName || message?.replyToSenderName || '';
    const replyTextRaw = replyTo?.text || message?.replyToText || '';
    if (!replySenderRaw && !replyTextRaw) return '';

    const replySender = this.escapeHtml(replySenderRaw || 'Someone');
    const preview = this.highlightMentions(this.escapeHtml(replyTextRaw || ''));
    const isOwnMessage = message?.senderId === window.currentUser?.uid;
    const headline = isOwnMessage ? `↩ You replied to ${replySender}` : `↩ Replied to ${replySender}`;
    return `
      <div class="mb-2 rounded-lg border border-[var(--card-border)] bg-[var(--input-bg)] px-2 py-1">
        <p class="text-[10px] text-[var(--text-muted)] font-bold">${headline}</p>
        <p class="text-[11px] text-[var(--text-color)]/90 max-h-9 overflow-hidden">${preview || '<span class="italic text-[var(--text-muted)]">Original message</span>'}</p>
      </div>
    `;
  },

  /**
   * Render image payload in message bubble.
   */
  renderImageContent(message) {
    const imageUrl = message?.imageUrl || '';
    if (!imageUrl) return '';
    const safeUrl = this.escapeHtml(imageUrl);
    const altText = this.escapeHtml(message?.imageName || 'Chat image');
    return `
      <button onclick="GroupChat.openImagePreview('${safeUrl}')" class="block mb-2 rounded-xl overflow-hidden border border-[var(--card-border)] bg-black/10">
        <img src="${safeUrl}" alt="${altText}" class="max-h-64 w-full object-cover">
      </button>
    `;
  },

  /**
   * Render message text body, skipping synthetic label for image-only messages.
   */
  renderMessageText(message) {
    const rawText = String(message?.text || '').trim();
    const hasImage = !!message?.imageUrl;
    const caption = String(message?.imageCaption || '').trim();

    if (hasImage) {
      if (caption) {
        return `<p class="text-sm text-[var(--text-color)]">${this.highlightMentions(this.escapeHtml(caption))}</p>`;
      }
      if (rawText === '📷 Photo' || !rawText) return '';
    }

    if (!rawText) return '';
    return `<p class="text-sm text-[var(--text-color)]">${this.highlightMentions(this.escapeHtml(rawText))}</p>`;
  },

  /**
   * Render "edited" metadata next to time when applicable.
   */
  renderEditedMeta(message) {
    if (!message?.editedAt) return '';
    return ' <span class="text-[10px] text-amber-500/90">(edited)</span>';
  },
  
  /**
   * Scroll chat to bottom
   */
  scrollToBottom() {
    const container = document.getElementById('chatMessages');
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  },
  
  /**
   * Handle send button click
   */
  handleSend() {
    const input = document.getElementById('chatInput');
    if (input) {
      this.closeComposeEmojiPicker();
      this.closeMentionPicker();
      this.syncFullscreenComposerToMainInput();
      this.sendMessage(input.value);
    }
  },
  
  /**
   * Handle enter key in input
   */
  handleKeyPress(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.handleSend();
    }
  },

  /**
   * Open unified attachment picker (shows library/camera/file options on supported devices).
   */
  openAttachmentPicker() {
    this.captureAttachmentFromCamera();
  },

  /**
   * Open gallery picker for image attachment.
   */
  pickAttachmentFromGallery() {
    const input = document.getElementById('chatGalleryInput');
    if (input) input.click();
  },

  /**
   * Open camera capture for image attachment.
   */
  captureAttachmentFromCamera() {
    const input = document.getElementById('chatCameraInput');
    if (input) input.click();
  },

  /**
   * Handle selected/captured image attachment.
   */
  handleAttachmentSelected(event, source = 'gallery') {
    const input = event?.target;
    const file = input?.files?.[0];
    if (!file) return;

    if (!file.type?.startsWith('image/')) {
      alert('Only image files are supported.');
      this.resetAttachmentInputs();
      return;
    }

    const maxBytes = 10 * 1024 * 1024; // 10 MB
    if (file.size > maxBytes) {
      alert('Image is too large. Please select a photo under 10 MB.');
      this.resetAttachmentInputs();
      return;
    }

    this.releasePendingAttachmentPreview();
    this.pendingAttachment = {
      file,
      source,
      name: file.name || 'photo.jpg',
      size: file.size || 0,
      mimeType: file.type || 'image/jpeg',
      previewUrl: URL.createObjectURL(file)
    };
    this.renderAttachmentDraft();
    this.syncMainInputToFullscreenComposer();
    this.resetAttachmentInputs();
  },

  /**
   * Revoke blob URL for pending attachment preview.
   */
  releasePendingAttachmentPreview() {
    const previewUrl = this.pendingAttachment?.previewUrl;
    if (previewUrl && typeof previewUrl === 'string' && previewUrl.startsWith('blob:')) {
      try { URL.revokeObjectURL(previewUrl); } catch (_) {}
    }
  },

  /**
   * Clear selected image attachment.
   */
  clearAttachmentDraft() {
    this.releasePendingAttachmentPreview();
    this.pendingAttachment = null;
    this.renderAttachmentDraft();
    this.syncMainInputToFullscreenComposer();
    this.resetAttachmentInputs();
  },

  /**
   * Keep file inputs reset so same file can be selected repeatedly.
   */
  resetAttachmentInputs() {
    const gallery = document.getElementById('chatGalleryInput');
    const camera = document.getElementById('chatCameraInput');
    if (gallery) gallery.value = '';
    if (camera) camera.value = '';
  },

  /**
   * Render image attachment preview in composer.
   */
  renderAttachmentDraft() {
    const container = document.getElementById('chatAttachmentDraft');
    if (!container) return;

    if (!this.pendingAttachment?.previewUrl) {
      container.classList.add('hidden');
      container.innerHTML = '<p class="text-xs text-[var(--text-muted)]">Photo attachment</p>';
      return;
    }

    const sizeKb = Math.max(1, Math.round((this.pendingAttachment.size || 0) / 1024));
    const name = this.escapeHtml(this.pendingAttachment.name || 'photo.jpg');
    const preview = this.escapeHtml(this.pendingAttachment.previewUrl);
    container.classList.remove('hidden');
    container.innerHTML = `
      <div class="flex items-start justify-between gap-3">
        <div class="flex items-start gap-2 min-w-0">
          <img src="${preview}" alt="${name}" class="w-14 h-14 rounded-lg object-cover border border-[var(--card-border)]">
          <div class="min-w-0">
            <p class="text-[10px] font-bold text-amber-500">📷 Photo ready to send</p>
            <p class="text-xs text-[var(--text-color)] truncate">${name}</p>
            <p class="text-[10px] text-[var(--text-muted)]">${sizeKb} KB</p>
          </div>
        </div>
        <button onclick="GroupChat.clearAttachmentDraft()" class="text-[var(--text-muted)] hover:text-[var(--text-color)] rounded-full p-1" title="Remove photo">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
    `;
  },

  /**
   * Upload selected image to Firebase Storage.
   */
  async uploadImageAttachment(file) {
    if (!file || !window.storage || !window.storageRef || !window.uploadBytes || !window.getDownloadURL) {
      throw new Error('Storage is not initialized');
    }
    const groupId = Groups.currentGroup?.id || 'group';
    const uid = window.currentUser?.uid || 'user';
    const safeName = String(file.name || 'photo.jpg').replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `chat-attachments/${groupId}/${uid}/${Date.now()}_${safeName}`;
    const ref = window.storageRef(window.storage, path);
    const result = await window.uploadBytes(ref, file, {
      contentType: file.type || 'image/jpeg',
      cacheControl: 'public,max-age=3600'
    });
    const url = await window.getDownloadURL(result.ref);
    return {
      url,
      path,
      name: file.name || safeName,
      size: file.size || 0,
      mimeType: file.type || 'image/jpeg'
    };
  },

  /**
   * Open image in a new tab for full-screen view.
   */
  openImagePreview(url) {
    if (!url) return;
    window.open(url, '_blank', 'noopener,noreferrer');
  },

  /**
   * Set reply target from a message.
   */
  replyToMessage(messageId) {
    const message = this.messages.find((item) => item.id === messageId);
    if (!message) return;
    this.composerReplyToMessageId = messageId;
    this.composerReplyTo = this.normalizeReplyPayload(message);
    this.renderReplyDraft();
    this.syncMainInputToFullscreenComposer();
    const input = document.getElementById('chatInput');
    if (input) input.focus();
  },

  /**
   * Clear current reply draft.
   */
  clearReplyDraft() {
    this.composerReplyTo = null;
    this.composerReplyToMessageId = null;
    this.renderReplyDraft();
    this.syncMainInputToFullscreenComposer();
  },

  /**
   * Use fullscreen composer on small screens to avoid cramped typing.
   */
  shouldUseFullscreenComposer() {
    return !!(window.matchMedia && window.matchMedia('(max-width: 768px)').matches);
  },

  /**
   * Intercept focus on the compact composer and open fullscreen editor on mobile.
   */
  handleComposerInputFocus(event) {
    if (!this.shouldUseFullscreenComposer()) return;
    if (this.suppressNextComposerFocusOverlay) {
      this.suppressNextComposerFocusOverlay = false;
      return;
    }
    event?.preventDefault?.();
    event?.target?.blur?.();
    this.openFullscreenComposer();
  },

  /**
   * Open fullscreen composer overlay and sync current text value.
   */
  openFullscreenComposer() {
    const overlay = document.getElementById('chatFullscreenComposer');
    const fullscreenInput = document.getElementById('chatFullscreenInput');
    const input = document.getElementById('chatInput');
    if (!overlay || !fullscreenInput || !input) return;

    fullscreenInput.value = input.value || '';
    overlay.classList.remove('hidden');
    this.isFullscreenComposerOpen = true;
    requestAnimationFrame(() => fullscreenInput.focus());
  },

  /**
   * Close fullscreen composer overlay.
   * preserveFocus=true skips refocusing the compact input (used during chat open/close cleanup).
   */
  closeFullscreenComposer(syncBack = true, preserveFocus = false) {
    const overlay = document.getElementById('chatFullscreenComposer');
    const fullscreenInput = document.getElementById('chatFullscreenInput');
    const input = document.getElementById('chatInput');
    if (!overlay) return;

    if (syncBack && fullscreenInput && input) {
      input.value = fullscreenInput.value || '';
      this.handleInputChange({ target: input });
      this.syncComposerPreviewScroll({ target: input });
    }

    overlay.classList.add('hidden');
    this.isFullscreenComposerOpen = false;

    if (!preserveFocus && input && this.shouldUseFullscreenComposer()) {
      this.suppressNextComposerFocusOverlay = true;
      setTimeout(() => input.focus(), 0);
    }
  },

  /**
   * Keep the hidden compact composer input in sync while typing fullscreen.
   */
  handleFullscreenComposerInput(event) {
    const fullscreenInput = event?.target || document.getElementById('chatFullscreenInput');
    const input = document.getElementById('chatInput');
    if (!fullscreenInput || !input) return;
    input.value = fullscreenInput.value || '';
    this.handleInputChange({ target: input });
  },

  /**
   * Copy fullscreen value into main input if overlay is open.
   */
  syncFullscreenComposerToMainInput() {
    if (!this.isFullscreenComposerOpen) return;
    const fullscreenInput = document.getElementById('chatFullscreenInput');
    const input = document.getElementById('chatInput');
    if (!fullscreenInput || !input) return;
    input.value = fullscreenInput.value || '';
    this.handleInputChange({ target: input });
  },

  /**
   * Mirror compact input into fullscreen textarea when overlay is open.
   */
  syncMainInputToFullscreenComposer() {
    if (!this.isFullscreenComposerOpen) return;
    const fullscreenInput = document.getElementById('chatFullscreenInput');
    const input = document.getElementById('chatInput');
    if (!fullscreenInput || !input) return;
    fullscreenInput.value = input.value || '';
  },

  /**
   * Send message directly from fullscreen composer.
   */
  sendFromFullscreenComposer() {
    this.syncFullscreenComposerToMainInput();
    this.closeFullscreenComposer(true, true);
    this.handleSend();
  },

  /**
   * Render reply attachment shown above the composer.
   */
  renderReplyDraft() {
    const container = document.getElementById('chatReplyDraft');
    if (!container) return;

    if (!this.composerReplyTo) {
      container.classList.add('hidden');
      container.innerHTML = '<p class="text-xs text-[var(--text-muted)]">Replying...</p>';
      return;
    }

    const senderName = this.escapeHtml(this.composerReplyTo.senderName || 'Someone');
    const preview = this.highlightMentions(this.escapeHtml(this.composerReplyTo.text || ''));
    container.classList.remove('hidden');
    container.innerHTML = `
      <div class="flex items-start justify-between gap-2">
        <div class="min-w-0">
          <p class="text-[10px] font-bold text-amber-500">↩ Replying to ${senderName}</p>
          <p class="text-xs text-[var(--text-color)] truncate">${preview || '<span class="text-[var(--text-muted)] italic">Original message</span>'}</p>
        </div>
        <button onclick="GroupChat.clearReplyDraft()" class="text-[var(--text-muted)] hover:text-[var(--text-color)] rounded-full p-1" title="Cancel reply">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
    `;
  },

  /**
   * Build reply metadata payload to store on outgoing message.
   */
  normalizeReplyPayload(message) {
    if (!message || typeof message !== 'object') return null;
    const previewText = this.buildMessagePreviewText(message, 150);
    return {
      messageId: message.id || message.messageId || message.replyToMessageId || null,
      senderId: message.senderId || message.replyToSenderId || '',
      senderName: message.senderName || message.replyToSenderName || 'Someone',
      type: message.type || message.replyToType || 'text',
      text: previewText
    };
  },

  /**
   * Handle text input changes for mention suggestions
   */
  async handleInputChange(event) {
    const input = event?.target || document.getElementById('chatInput');
    if (!input) return;
    this.renderComposerPreview(input.value || '');
    this.syncComposerPreviewScroll({ target: input });
    await this.renderMentionSuggestions(input.value || '', input.selectionStart ?? input.value.length);
    this.syncMainInputToFullscreenComposer();
  },

  /**
   * Keep highlighted preview aligned with horizontal input scrolling.
   */
  syncComposerPreviewScroll(event) {
    const input = event?.target || document.getElementById('chatInput');
    const previewText = document.getElementById('chatInputPreviewText');
    if (!input || !previewText) return;
    previewText.style.transform = `translateX(${-1 * (input.scrollLeft || 0)}px)`;
  },

  /**
   * Render compose text preview with mention highlighting.
   */
  renderComposerPreview(text = null) {
    const input = document.getElementById('chatInput');
    const previewText = document.getElementById('chatInputPreviewText');
    if (!previewText) return;

    const value = text !== null ? String(text) : (input?.value || '');
    previewText.innerHTML = this.renderComposerPreviewHtml(value);
  },

  /**
   * Build highlighted HTML for compose preview layer.
   */
  renderComposerPreviewHtml(text = '') {
    const escaped = this.escapeHtml(String(text || ''));
    if (!escaped) return '';

    return escaped.replace(
      /(^|\s)(@[a-zA-Z0-9._-]{2,32})/g,
      (match, prefix, mention) => {
        const token = this.normalizeMentionToken(mention);
        const isResolved = this.isMentionTokenResolved(token);
        const mentionClass = isResolved ? 'text-amber-500 font-semibold' : 'text-[var(--text-color)]';
        return `${prefix}<span class="${mentionClass}">${mention}</span>`;
      }
    );
  },

  /**
   * Determine if a typed mention token resolves to a group member.
   */
  isMentionTokenResolved(token) {
    if (!token) return false;
    if (this.selectedMentionsByToken[token]) return true;

    const senderId = window.currentUser?.uid;
    return (this.groupMemberDirectory || []).some((member) => {
      if (!member || member.uid === senderId) return false;
      return (member.aliases || []).includes(token) || (member.aliases || []).some((alias) => alias.startsWith(token));
    });
  },

  /**
   * Extract active mention query near cursor
   */
  getActiveMentionQuery(text, cursorPos) {
    const value = String(text || '');
    const cursor = Math.max(0, Math.min(cursorPos ?? value.length, value.length));
    const prefix = value.slice(0, cursor);
    const atIndex = prefix.lastIndexOf('@');
    if (atIndex < 0) return null;

    // Require start or whitespace before '@'
    if (atIndex > 0) {
      const prevChar = prefix.charAt(atIndex - 1);
      if (!/\s/.test(prevChar)) return null;
    }

    const raw = prefix.slice(atIndex + 1);
    if (raw.length > 32 || /\s/.test(raw)) return null;
    if (!raw.length) {
      return { query: '', start: atIndex, end: cursor };
    }
    if (!/^[a-zA-Z0-9._-]{1,32}$/.test(raw)) return null;

    return { query: raw.toLowerCase(), start: atIndex, end: cursor };
  },

  /**
   * Render mention suggestions dropdown
   */
  async renderMentionSuggestions(text, cursorPos) {
    const picker = document.getElementById('chatMentionPicker');
    const list = document.getElementById('chatMentionList');
    if (!picker || !list) return;

    const mention = this.getActiveMentionQuery(text, cursorPos);
    if (!mention) {
      this.closeMentionPicker();
      return;
    }

    await this.loadGroupMemberDirectory();
    this.renderComposerPreview(text);
    const directory = this.groupMemberDirectory || [];
    const senderId = window.currentUser?.uid;
    const query = mention.query || '';

    const matches = directory
      .filter((member) => member.uid !== senderId)
      .filter((member) => {
        if (!query) return true;
        if ((member.displayName || '').toLowerCase().includes(query)) return true;
        return (member.aliases || []).some((alias) => alias.startsWith(query));
      })
      .slice(0, 8);

    if (!matches.length) {
      this.closeMentionPicker();
      return;
    }

    this.mentionPickerOpen = true;
    this.mentionQuery = query;
    this.mentionRange = { start: mention.start, end: mention.end };
    this.closeComposeEmojiPicker();
    picker.classList.remove('hidden');

    list.innerHTML = matches.map((member) => {
      const shortName = (member.displayName || 'Member').split(/\s+/)[0] || member.displayName || 'member';
      const token = this.normalizeMentionToken(shortName) || this.normalizeMentionToken(member.aliases?.[0]) || 'member';
      return `
        <button onclick="GroupChat.selectMention('${member.uid}', '${(member.displayName || '').replace(/'/g, "\\'")}', '${token.replace(/'/g, "\\'")}')" class="w-full text-left flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-amber-500/10 transition-colors">
          <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(member.displayName || 'Member')}&background=4a0404&color=fbbf24" class="w-8 h-8 rounded-full border border-[var(--card-border)]" alt="${this.escapeHtml(member.displayName || 'Member')}">
          <div class="min-w-0">
            <p class="text-sm text-[var(--text-color)] font-semibold truncate">${this.escapeHtml(member.displayName || 'Member')}</p>
            <p class="text-[11px] text-[var(--text-muted)] truncate">@${this.escapeHtml(token)}</p>
          </div>
        </button>
      `;
    }).join('');
  },

  /**
   * Insert selected mention from picker
   */
  selectMention(uid, displayName, token) {
    const input = document.getElementById('chatInput');
    if (!input || !uid) return;

    const safeToken = this.normalizeMentionToken(token) || this.normalizeMentionToken(displayName) || 'member';
    const mentionText = `@${safeToken}`;
    const range = this.mentionRange || { start: input.value.length, end: input.value.length };
    const value = input.value || '';
    const nextValue = `${value.slice(0, range.start)}${mentionText} ${value.slice(range.end)}`;
    const cursorPos = range.start + mentionText.length + 1;
    input.value = nextValue;
    input.setSelectionRange(cursorPos, cursorPos);
    input.focus();

    this.selectedMentionsByToken[safeToken] = {
      uid,
      name: displayName || safeToken
    };

    this.closeMentionPicker();
    this.renderComposerPreview(nextValue);
    this.syncComposerPreviewScroll({ target: input });
    this.syncMainInputToFullscreenComposer();
  },

  /**
   * Hide mention picker
   */
  closeMentionPicker() {
    const picker = document.getElementById('chatMentionPicker');
    if (picker) picker.classList.add('hidden');
    this.mentionPickerOpen = false;
    this.mentionQuery = '';
    this.mentionRange = null;
  },

  /**
   * Toggle compose emoji picker
   */
  toggleEmojiPicker() {
    const picker = document.getElementById('chatEmojiPicker');
    if (!picker) return;
    this.composeEmojiPickerOpen = !this.composeEmojiPickerOpen;
    if (this.composeEmojiPickerOpen) {
      this.closeMentionPicker();
    }
    picker.classList.toggle('hidden', !this.composeEmojiPickerOpen);
    if (this.composeEmojiPickerOpen) {
      this.renderEmojiPicker();
      const search = document.getElementById('chatEmojiSearch');
      if (search) search.focus();
    }
  },

  /**
   * Close compose emoji picker
   */
  closeComposeEmojiPicker(clearSearch = false) {
    const picker = document.getElementById('chatEmojiPicker');
    if (picker) picker.classList.add('hidden');
    this.composeEmojiPickerOpen = false;
    if (clearSearch) {
      const search = document.getElementById('chatEmojiSearch');
      if (search) search.value = '';
    }
  },

  /**
   * Render emoji grid for compose picker
   */
  renderEmojiPicker() {
    const grid = document.getElementById('chatEmojiGrid');
    if (!grid) return;
    const search = (document.getElementById('chatEmojiSearch')?.value || '').toLowerCase().trim();
    const filtered = this.emojiCatalog.filter((item) => {
      if (!search) return true;
      return item.emoji.includes(search) || item.keywords.includes(search);
    });

    if (!filtered.length) {
      grid.innerHTML = '<p class="col-span-8 text-xs text-[var(--text-muted)] text-center py-4">No matching emoji.</p>';
      return;
    }

    grid.innerHTML = filtered.map((item) => `
      <button onclick="GroupChat.insertEmoji('${item.emoji.replace(/'/g, "\\'")}')" class="h-9 w-9 rounded-lg hover:bg-amber-500/15 transition-colors text-xl leading-none flex items-center justify-center" title="${this.escapeHtml(item.keywords)}">
        ${item.emoji}
      </button>
    `).join('');
  },

  /**
   * Insert selected emoji into compose input
   */
  insertEmoji(emoji) {
    const input = document.getElementById('chatInput');
    if (!input || !emoji) return;

    const start = typeof input.selectionStart === 'number' ? input.selectionStart : input.value.length;
    const end = typeof input.selectionEnd === 'number' ? input.selectionEnd : input.value.length;
    const value = input.value || '';
    input.value = value.slice(0, start) + emoji + value.slice(end);

    const nextPos = start + emoji.length;
    input.setSelectionRange(nextPos, nextPos);
    input.focus();
    this.renderComposerPreview(input.value);
    this.syncComposerPreviewScroll({ target: input });
    this.renderMentionSuggestions(input.value, nextPos);
    this.syncMainInputToFullscreenComposer();
  },

  /**
   * Render reaction controls under each message bubble
   */
  renderReactionControls(message, isMe) {
    const reactions = this.getReactionSummary(message?.reactions);
    const reactionsHtml = reactions.map((reaction) => `
      <button onclick="GroupChat.toggleReaction('${message.id}', '${reaction.emoji.replace(/'/g, "\\'")}')" class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] transition-colors ${reaction.isMine ? 'border-amber-500/60 bg-amber-500/20 text-amber-500' : 'border-[var(--card-border)] bg-[var(--input-bg)] text-[var(--text-muted)] hover:text-[var(--text-color)]'}">
        <span>${reaction.emoji}</span><span>${reaction.count}</span>
      </button>
    `).join('');

    const pickerOpen = this.activeReactionPickerMessageId === message.id;
    const pickerHtml = `
      <div id="reactionPicker_${message.id}" class="${pickerOpen ? 'inline-flex' : 'hidden'} mt-1 flex-wrap gap-1 rounded-full border border-[var(--card-border)] bg-[var(--input-bg)] px-2 py-1">
        ${this.reactionOptions.map((emoji) => `
          <button onclick="GroupChat.toggleReaction('${message.id}', '${emoji.replace(/'/g, "\\'")}')" class="h-7 w-7 rounded-full hover:bg-amber-500/20 transition-colors text-base leading-none flex items-center justify-center" title="React ${emoji}">
            ${emoji}
          </button>
        `).join('')}
      </div>
    `;

    return `
      <div class="mt-2 ${isMe ? 'text-right' : ''}">
        <div class="flex items-center gap-1 flex-wrap ${isMe ? 'justify-end' : ''}">
          ${reactionsHtml}
          <button data-reaction-toggle="1" onclick="GroupChat.toggleReactionPicker('${message.id}')" class="inline-flex items-center justify-center h-6 px-2 rounded-full border border-[var(--card-border)] text-[11px] text-[var(--text-muted)] hover:text-[var(--text-color)] hover:border-amber-500/40">
            😊 React
          </button>
          <button onclick="GroupChat.replyToMessage('${message.id}')" class="inline-flex items-center justify-center h-6 px-2 rounded-full border border-[var(--card-border)] text-[11px] text-[var(--text-muted)] hover:text-[var(--text-color)] hover:border-amber-500/40 transition-colors md:opacity-0 md:group-hover:opacity-100">
            ↩ Reply
          </button>
          ${isMe && this.canEditMessage(message) ? `
          <button onclick="GroupChat.editMessage('${message.id}')" class="inline-flex items-center justify-center h-6 px-2 rounded-full border border-[var(--card-border)] text-[11px] text-[var(--text-muted)] hover:text-[var(--text-color)] hover:border-amber-500/40 transition-colors md:opacity-0 md:group-hover:opacity-100">
            ✎ Edit
          </button>
          ` : ''}
          <button onclick="GroupChat.openForwardModal('${message.id}')" class="inline-flex items-center justify-center h-6 px-2 rounded-full border border-[var(--card-border)] text-[11px] text-[var(--text-muted)] hover:text-[var(--text-color)] hover:border-amber-500/40 transition-colors md:opacity-0 md:group-hover:opacity-100">
            ↪ Forward
          </button>
        </div>
        ${pickerHtml}
      </div>
    `;
  },

  /**
   * Open/close reaction picker for a message
   */
  toggleReactionPicker(messageId) {
    if (!messageId) return;
    this.activeReactionPickerMessageId = this.activeReactionPickerMessageId === messageId ? null : messageId;
    this.renderMessages();
  },

  /**
   * Only allow editing for own text/image messages (including captions).
   */
  canEditMessage(message) {
    if (!message || typeof message !== 'object') return false;
    if (message.senderId !== window.currentUser?.uid) return false;
    return message.type === 'text' || message.type === 'image';
  },

  /**
   * Get editable text value for a message.
   */
  getEditableMessageText(message) {
    if (!message) return '';
    if (message.type === 'image') {
      return String(message.imageCaption || '').trim();
    }
    return String(message.text || '').trim();
  },

  /**
   * Edit a sent message (text/image caption) using a simple prompt dialog.
   */
  async editMessage(messageId) {
    const message = this.messages.find((item) => item.id === messageId);
    if (!message) return;
    if (!this.canEditMessage(message)) {
      alert('Only your text messages or photo captions can be edited.');
      return;
    }
    if (!window.db || !window.currentUser) return;

    const isImage = message.type === 'image';
    const currentValue = this.getEditableMessageText(message);
    const promptLabel = isImage ? 'Edit photo caption:' : 'Edit message:';
    const nextValueRaw = window.prompt(promptLabel, currentValue);
    if (nextValueRaw === null) return;

    const nextValue = String(nextValueRaw);
    const trimmedValue = nextValue.trim();

    if (!isImage && !trimmedValue) {
      alert('Message cannot be empty.');
      return;
    }

    try {
      const mentions = (trimmedValue && /@[a-zA-Z0-9._-]{2,32}/.test(trimmedValue))
        ? await this.extractMentionsFromText(trimmedValue)
        : [];
      const payload = {
        mentions,
        mentionedUserIds: mentions.map((mention) => mention.uid),
        editedAt: window.serverTimestamp(),
        updatedAt: window.serverTimestamp()
      };

      if (isImage) {
        payload.imageCaption = trimmedValue;
        payload.text = trimmedValue || '📷 Photo';
      } else {
        payload.text = trimmedValue;
      }

      await window.setDoc(
        window.doc(window.db, 'goMission_chats', messageId),
        payload,
        { merge: true }
      );

      message.mentions = payload.mentions;
      message.mentionedUserIds = payload.mentionedUserIds;
      message.editedAt = new Date();
      if (isImage) {
        message.imageCaption = trimmedValue;
        message.text = trimmedValue || '📷 Photo';
      } else {
        message.text = trimmedValue;
      }

      this.renderMessages();

      // Keep inbox preview accurate if the user edited the latest message in this thread.
      const lastMessage = this.messages[this.messages.length - 1];
      if (lastMessage?.id === messageId) {
        await this.updateGroupThreadPreview({
          groupId: this.currentGroupId || Groups.currentGroup?.id || null,
          type: message.type === 'image' ? 'image' : 'text',
          text: trimmedValue || (isImage ? '📷 Photo' : ''),
          senderName: message.senderName || 'Unknown'
        });
      }
    } catch (error) {
      console.error('[GroupChat] Error editing message:', error);
      alert('Could not edit message. Please try again.');
    }
  },

  /**
   * Build normalized reaction summary
   */
  getReactionSummary(rawReactions) {
    const reactions = this.normalizeReactions(rawReactions);
    const uid = window.currentUser?.uid;
    const summary = [];
    const seen = new Set();

    for (const emoji of this.reactionOptions) {
      const users = reactions[emoji];
      if (!users || !users.length) continue;
      summary.push({ emoji, count: users.length, isMine: !!(uid && users.includes(uid)) });
      seen.add(emoji);
    }

    // Render additional non-standard emojis if present in data.
    Object.entries(reactions).forEach(([emoji, users]) => {
      if (seen.has(emoji) || !users.length) return;
      summary.push({ emoji, count: users.length, isMine: !!(uid && users.includes(uid)) });
    });

    return summary;
  },

  /**
   * Normalize reactions object shape
   */
  normalizeReactions(rawReactions) {
    if (!rawReactions || typeof rawReactions !== 'object') return {};
    const normalized = {};
    Object.entries(rawReactions).forEach(([emoji, users]) => {
      if (!Array.isArray(users)) return;
      const cleanUsers = [...new Set(users.filter((id) => typeof id === 'string' && id))];
      if (cleanUsers.length) {
        normalized[emoji] = cleanUsers;
      }
    });
    return normalized;
  },

  /**
   * Toggle own reaction for a message
   */
  async toggleReaction(messageId, emoji) {
    const uid = window.currentUser?.uid;
    if (!uid || !window.db || !messageId || !emoji) return;

    const message = this.messages.find((item) => item.id === messageId);
    if (!message) return;

    const reactions = this.normalizeReactions(message.reactions);
    const users = [...(reactions[emoji] || [])];
    const existingIndex = users.indexOf(uid);

    if (existingIndex >= 0) users.splice(existingIndex, 1);
    else users.push(uid);

    if (users.length) reactions[emoji] = users;
    else delete reactions[emoji];

    try {
      await window.setDoc(
        window.doc(window.db, 'goMission_chats', messageId),
        {
          reactions,
          reactionsUpdatedAt: window.serverTimestamp()
        },
        { merge: true }
      );

      message.reactions = reactions;
      this.activeReactionPickerMessageId = null;
      this.renderMessages();
    } catch (error) {
      console.error('[GroupChat] Error toggling reaction:', error);
    }
  },

  /**
   * Open forward modal for selected source message.
   */
  async openForwardModal(messageId) {
    const message = this.messages.find((item) => item.id === messageId);
    if (!message) return;

    this.forwardSourceMessageId = messageId;
    const modal = document.getElementById('chatForwardModal');
    const source = document.getElementById('chatForwardSource');
    if (!modal || !source) return;

    const senderName = this.escapeHtml(message.senderName || 'Someone');
    const preview = this.highlightMentions(this.escapeHtml(this.buildMessagePreviewText(message, 220)));
    source.innerHTML = `
      <p class="text-[11px] text-[var(--text-muted)] mb-1">${senderName}</p>
      <p class="text-sm text-[var(--text-color)]">${preview}</p>
    `;

    modal.classList.remove('hidden');
    await this.loadForwardTargets();
    this.renderForwardTargets();
  },

  /**
   * Close forward modal.
   */
  closeForwardModal(silent = false) {
    const modal = document.getElementById('chatForwardModal');
    if (modal) modal.classList.add('hidden');
    this.forwardSourceMessageId = null;
    this.forwardGroupTargets = {};
    this.forwardDmTargets = {};
    if (!silent && this.isOpen) {
      const input = document.getElementById('chatInput');
      if (input) input.focus();
    }
  },

  /**
   * Gather groups and direct-message threads available for forwarding.
   */
  async loadForwardTargets() {
    const groupMap = new Map();
    const pushGroup = (group) => {
      if (!group?.id) return;
      if (group.id === Groups.currentGroup?.id) return;
      if (groupMap.has(group.id)) return;
      groupMap.set(group.id, group);
    };

    if (typeof MyGroups !== 'undefined') {
      pushGroup(MyGroups.uplineGroup);
      (MyGroups.downlineGroups || []).forEach(pushGroup);
      (MyGroups.guestGroups || []).forEach(pushGroup);
    }

    const groups = Array.from(groupMap.values())
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    this.forwardGroupTargets = {};
    groups.forEach((group) => {
      this.forwardGroupTargets[group.id] = {
        id: group.id,
        name: group.name || 'Mission Group',
        memberCount: (group.members || []).length || group.currentCount || 0
      };
    });

    let directThreads = [];
    if (typeof ChatApp !== 'undefined') {
      try {
        if (typeof ChatApp.loadFriendData === 'function') {
          await ChatApp.loadFriendData();
        }
        directThreads = Array.isArray(ChatApp.directThreads) ? ChatApp.directThreads : [];
      } catch (error) {
        console.warn('[GroupChat] Could not load direct threads for forwarding:', error);
      }
    }

    this.forwardDmTargets = {};
    directThreads.forEach((thread) => {
      if (!thread?.friendId || !thread?.threadId) return;
      this.forwardDmTargets[thread.friendId] = {
        friendId: thread.friendId,
        threadId: thread.threadId,
        name: thread.name || 'Friend'
      };
    });
  },

  /**
   * Render forward target buttons inside modal.
   */
  renderForwardTargets() {
    const groupList = document.getElementById('chatForwardGroupList');
    const dmList = document.getElementById('chatForwardDmList');
    if (!groupList || !dmList) return;

    const groups = Object.values(this.forwardGroupTargets);
    const dms = Object.values(this.forwardDmTargets);

    if (!groups.length) {
      groupList.innerHTML = '<p class="text-xs text-[var(--text-muted)]">No other groups available.</p>';
    } else {
      groupList.innerHTML = groups.map((group) => `
        <button onclick="GroupChat.forwardMessageToTarget('group', '${String(group.id).replace(/'/g, "\\'")}')" class="w-full text-left rounded-xl border border-[var(--card-border)] bg-[var(--input-bg)] px-3 py-2 hover:border-amber-500/45 transition-colors">
          <p class="text-sm font-bold text-[var(--text-color)] truncate">${this.escapeHtml(group.name)}</p>
          <p class="text-[11px] text-[var(--text-muted)]">${group.memberCount} members</p>
        </button>
      `).join('');
    }

    if (!dms.length) {
      dmList.innerHTML = '<p class="text-xs text-[var(--text-muted)]">No direct chats yet. Add friends first.</p>';
    } else {
      dmList.innerHTML = dms.map((dm) => `
        <button onclick="GroupChat.forwardMessageToTarget('dm', '${String(dm.friendId).replace(/'/g, "\\'")}')" class="w-full text-left rounded-xl border border-[var(--card-border)] bg-[var(--input-bg)] px-3 py-2 hover:border-amber-500/45 transition-colors">
          <p class="text-sm font-bold text-[var(--text-color)] truncate">${this.escapeHtml(dm.name)}</p>
          <p class="text-[11px] text-[var(--text-muted)]">Direct message</p>
        </button>
      `).join('');
    }
  },

  /**
   * Forward selected message to a group or direct thread.
   */
  async forwardMessageToTarget(kind, targetId) {
    const message = this.messages.find((item) => item.id === this.forwardSourceMessageId);
    if (!message || !targetId || !window.db || !window.currentUser) return;

    const forwardText = this.buildMessagePreviewText(message, 900);
    if (!forwardText) return;

    try {
      const senderName = window.currentUser.displayName || window.currentUser.email || 'Unknown';
      const senderPhoto = window.currentUser.photoURL || '';
      const forwardedFrom = {
        messageId: message.id || null,
        groupId: Groups.currentGroup?.id || null,
        senderId: message.senderId || null,
        senderName: message.senderName || 'Someone',
        type: message.type || 'text'
      };

      if (kind === 'group') {
        const target = this.forwardGroupTargets[targetId];
        if (!target) return;

        await window.addDoc(window.collection(window.db, 'goMission_chats'), {
          groupId: target.id,
          senderId: window.currentUser.uid,
          senderName,
          senderPhoto,
          text: forwardText,
          type: 'text',
          forwardedFrom,
          mentions: [],
          mentionedUserIds: [],
          createdAt: window.serverTimestamp()
        });

        await this.updateGroupThreadPreview({
          groupId: target.id,
          type: 'text',
          text: forwardText,
          senderName
        });
      } else if (kind === 'dm') {
        const target = this.forwardDmTargets[targetId];
        if (!target) return;
        const participants = [window.currentUser.uid, target.friendId].sort();

        await window.addDoc(window.collection(window.db, 'goMission_dmMessages'), {
          threadId: target.threadId,
          participants,
          senderId: window.currentUser.uid,
          senderName,
          senderPhoto,
          text: forwardText,
          type: 'text',
          forwardedFrom,
          createdAt: window.serverTimestamp()
        });

        await window.setDoc(
          window.doc(window.db, 'goMission_dmThreads', target.threadId),
          {
            participants,
            pairKey: target.threadId,
            lastMessageText: forwardText,
            lastMessageSenderId: window.currentUser.uid,
            lastMessageSenderName: senderName,
            lastMessageAt: window.serverTimestamp(),
            updatedAt: window.serverTimestamp()
          },
          { merge: true }
        );
      } else {
        return;
      }

      this.closeForwardModal();
      alert('Message forwarded.');
    } catch (error) {
      console.error('[GroupChat] Failed forwarding message:', error);
      alert('Could not forward message. Please try again.');
    }
  },

  /**
   * Load member profile directory for mention resolution
   */
  async loadGroupMemberDirectory(force = false) {
    const groupId = Groups.currentGroup?.id;
    if (!groupId || !window.db) {
      this.groupMemberDirectory = [];
      this.groupMemberDirectoryForGroupId = null;
      return [];
    }

    if (!force && this.groupMemberDirectoryForGroupId === groupId && this.groupMemberDirectory.length) {
      return this.groupMemberDirectory;
    }

    const group = Groups.currentGroup || {};
    const memberIds = [
      ...(Array.isArray(group.members) ? group.members : []),
      ...((Array.isArray(group.guests) ? group.guests : []).map((guest) => guest?.odId).filter(Boolean))
    ];
    const uniqueIds = [...new Set(memberIds)];

    const directory = [];
    for (const uid of uniqueIds) {
      try {
        const memberDoc = await window.getDoc(window.doc(window.db, 'goMission_members', uid));
        if (!memberDoc.exists()) continue;
        const data = memberDoc.data() || {};
        const displayName = data.displayName || data.name || data.email?.split('@')[0] || 'Member';
        const email = data.email || '';

        const aliasSet = new Set();
        const addAlias = (value) => {
          const normalized = this.normalizeMentionToken(value);
          if (!normalized) return;
          aliasSet.add(normalized);
        };

        addAlias(displayName);
        addAlias(data.username || '');
        displayName.split(/\s+/).forEach(addAlias);
        if (email) {
          addAlias(email.split('@')[0]);
        }

        directory.push({
          uid,
          displayName,
          email,
          aliases: Array.from(aliasSet)
        });
      } catch (error) {
        console.warn('[GroupChat] Failed loading member for mention directory:', uid, error);
      }
    }

    this.groupMemberDirectory = directory;
    this.groupMemberDirectoryForGroupId = groupId;
    return directory;
  },

  /**
   * Normalize potential mention token
   */
  normalizeMentionToken(value) {
    return String(value || '')
      .trim()
      .replace(/^@+/, '')
      .toLowerCase()
      .replace(/[^a-z0-9._-]/g, '');
  },

  /**
   * Extract mention targets from outgoing message text
   */
  async extractMentionsFromText(text) {
    if (!text) return [];

    await this.loadGroupMemberDirectory();
    const directory = this.groupMemberDirectory || [];
    if (!directory.length) return [];

    const senderId = window.currentUser?.uid;
    const matches = String(text).match(/@([a-zA-Z0-9._-]{2,32})/g) || [];
    const seen = new Set();
    const mentions = [];

    for (const raw of matches) {
      const token = this.normalizeMentionToken(raw);
      if (!token || seen.has(token)) continue;
      seen.add(token);

      const selected = this.selectedMentionsByToken[token];
      if (selected?.uid && selected.uid !== senderId) {
        mentions.push({
          uid: selected.uid,
          name: selected.name || token,
          token
        });
        continue;
      }

      const rankedMembers = directory.filter((entry) => {
        if (entry.uid === senderId) return false;
        return entry.aliases.includes(token) || entry.aliases.some((alias) => alias.startsWith(token));
      });
      rankedMembers.sort((a, b) => {
        const aExact = a.aliases.includes(token) ? 1 : 0;
        const bExact = b.aliases.includes(token) ? 1 : 0;
        if (aExact !== bExact) return bExact - aExact;
        return (a.displayName || '').localeCompare(b.displayName || '');
      });
      const member = rankedMembers[0];
      if (!member) continue;

      mentions.push({
        uid: member.uid,
        name: member.displayName,
        token
      });
    }

    return mentions;
  },

  /**
   * Style @mentions in rendered message text
   */
  highlightMentions(escapedText) {
    return String(escapedText || '').replace(
      /(^|\s)(@[a-zA-Z0-9._-]{2,32})/g,
      '$1<span class="text-amber-500 font-semibold">$2</span>'
    );
  },

  /**
   * Build a plain-text preview for text/devotion messages.
   */
  buildMessagePreviewText(message, maxLength = 220) {
    if (!message || typeof message !== 'object') return '';
    let text = '';

    if (message.type === 'devotion' && message.devotion) {
      const devotion = message.devotion || {};
      const ref = this.getDevotionReference(devotion);
      const reflection = String(devotion.reflectionText || devotion.reflection || '').trim();
      text = `📖 ${ref}${reflection ? ` — ${reflection}` : ''}`.trim();
    } else if (typeof message.replyToText === 'string' && message.replyToText.trim()) {
      text = message.replyToText.trim();
    } else {
      text = String(message.text || '').trim();
    }

    if (!text) return '';
    if (text.length <= maxLength) return text;
    return `${text.slice(0, Math.max(1, maxLength - 1))}…`;
  },
  
  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },
  
  /**
   * Show members list modal
   */
  async showMembers() {
    if (!Groups.currentGroup) {
      alert('Unable to load members');
      return;
    }
    
    const group = Groups.currentGroup;
    const memberIds = group.members || [];
    const isLeader = group.leaderId === window.currentUser?.uid;
    
    // Create modal with loading state
    const modal = document.createElement('div');
    modal.id = 'membersModal';
    modal.className = 'fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4';
    modal.innerHTML = `
      <div class="bg-[var(--card-bg)] rounded-2xl w-full max-w-md p-6 text-center">
        <p class="text-[var(--text-muted)]">Loading members...</p>
      </div>
    `;
    document.body.appendChild(modal);
    
    // Load member details from Firestore
    const members = [];
    for (const memberId of memberIds) {
      try {
        const memberDoc = await window.getDoc(window.doc(window.db, 'goMission_members', memberId));
        if (memberDoc.exists()) {
          const data = memberDoc.data();
          members.push({
            id: memberId,
            displayName: data.displayName || data.email?.split('@')[0] || 'Unknown',
            photoURL: data.photoURL || ''
          });
        }
      } catch (e) {
        console.error('[GroupChat] Error loading member:', memberId, e);
      }
    }
    
    let membersHtml = '';
    for (const member of members) {
      const memberId = member.id;
      const memberName = member.displayName || 'Unknown';
      const memberPhoto = member.photoURL;
      
      const isCurrentUser = memberId === window.currentUser?.uid;
      const isMemberLeader = memberId === group.leaderId;
      
      membersHtml += `
        <div class="flex items-center justify-between p-3 bg-black/30 rounded-xl border border-white/5 ${isMemberLeader ? 'border-amber-500/30 bg-amber-500/5' : ''} ${isCurrentUser && !isMemberLeader ? 'border-blue-500/30' : ''}">
          <div class="flex items-center gap-3">
            <img src="${memberPhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(memberName)}&background=4a0404&color=fbbf24`}" 
                 class="w-10 h-10 rounded-full border-2 ${isMemberLeader ? 'border-amber-500' : 'border-white/10'}" 
                 alt="${memberName}">
            <div>
              <p class="text-[var(--text-color)] font-bold text-sm">
                ${memberName}
                ${isCurrentUser ? '<span class="text-amber-500 text-xs">(You)</span>' : ''}
              </p>
              <p class="text-xs ${isMemberLeader ? 'text-amber-500' : 'text-[var(--text-muted)]'}">
                ${isMemberLeader ? '👑 Leader' : 'Member'}
              </p>
            </div>
          </div>
          ${isLeader && !isMemberLeader && !isCurrentUser ? `
            <button onclick="GroupChat.removeMemberFromChat('${memberId}', '${memberName.replace(/'/g, "\\'")}')" 
                    class="text-xs text-red-400 hover:text-red-300 px-2 py-1">
              Remove
            </button>
          ` : ''}
        </div>
      `;
    }
    
    modal.innerHTML = `
      <div class="bg-[var(--card-bg)] rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden border border-[var(--card-border)]">
        <div class="p-4 border-b border-[var(--card-border)] flex items-center justify-between">
          <h3 class="font-bold text-[var(--text-color)]">👥 Group Members (${members.length})</h3>
          <button onclick="document.getElementById('membersModal').remove()" 
                  class="text-[var(--text-muted)] hover:text-[var(--text-color)]">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        <div class="p-4 overflow-y-auto max-h-[60vh] space-y-2">
          ${membersHtml || '<p class="text-[var(--text-muted)] text-center py-4">No members yet</p>'}
        </div>
      </div>
    `;
    
    // Close on backdrop click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });
  },
  
  /**
   * Remove member from chat (delegates to MyGroups)
   */
  async removeMemberFromChat(memberId, memberName) {
    if (!Groups.currentGroup) return;
    
    if (!confirm(`Remove ${memberName} from the group?`)) return;
    
    try {
      const groupId = Groups.currentGroup.id;
      
      // Remove member from group
      await window.setDoc(
        window.doc(window.db, 'goMission_groups', groupId),
        { members: window.arrayRemove(memberId) },
        { merge: true }
      );
      
      // Clear member's uplineGroupId
      await window.setDoc(
        window.doc(window.db, 'goMission_members', memberId),
        { uplineGroupId: null },
        { merge: true }
      );
      
      alert(`${memberName} has been removed.`);
      
      // Close members modal and refresh
      document.getElementById('membersModal')?.remove();
      
      // Refresh group data
      const groupDoc = await window.getDoc(window.doc(window.db, 'goMission_groups', groupId));
      if (groupDoc.exists()) {
        Groups.currentGroup = { id: groupDoc.id, ...groupDoc.data() };
      }
      
      // Update chat header
      this.updateChatHeader();
      
    } catch (error) {
      console.error('[GroupChat] Remove member error:', error);
      alert('Failed to remove member');
    }
  },
  
  /**
   * Update chat header with current member count
   */
  updateChatHeader() {
    const memberCount = Groups.currentGroup?.members?.length || 0;
    const headerSubtitle = document.querySelector('#chatModal .text-xs.text-\\[var\\(--text-muted\\)\\]');
    if (headerSubtitle) {
      headerSubtitle.textContent = `${memberCount} member${memberCount !== 1 ? 's' : ''}`;
    }
  },

  /**
   * Update chat title/subtitle for selected group
   */
  updateGroupHeader() {
    const groupNameEl = document.getElementById('chatGroupName');
    if (groupNameEl) {
      groupNameEl.textContent = Groups.currentGroup?.name || 'Group Chat';
    }
    this.updateMemberCount();
  },

  /**
   * Save latest group-message preview data for inbox thread list
   */
  async updateGroupThreadPreview({ groupId = null, type = 'text', text = '', senderName = '' } = {}) {
    const targetGroupId = groupId || Groups.currentGroup?.id;
    if (!targetGroupId || !window.db) return;
    try {
      await window.setDoc(
        window.doc(window.db, 'goMission_groups', targetGroupId),
        {
          lastChatMessageType: type,
          lastChatMessageText: text || '',
          lastChatSenderName: senderName || '',
          lastChatMessageAt: window.serverTimestamp(),
          updatedAt: window.serverTimestamp()
        },
        { merge: true }
      );
    } catch (error) {
      console.warn('[GroupChat] Could not update group thread preview:', error);
    }
  }
};

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GroupChat;
}
