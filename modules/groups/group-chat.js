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
    await this.loadGroupMemberDirectory(true);
    
    // FIRST: Set active chat in Firestore (prevents notifications while chat is open)
    // Wait for this to complete before proceeding
    await this.setActiveChat(groupId);
    
    // THEN: Show chat modal
    const modal = document.getElementById('chatModal');
    if (modal) {
      modal.classList.remove('hidden');
    }
    this.composeEmojiPickerOpen = false;
    this.activeReactionPickerMessageId = null;
    this.mentionPickerOpen = false;
    this.selectedMentionsByToken = {};
    this.closeComposeEmojiPicker();
    this.closeMentionPicker();
    this.renderEmojiPicker();
    const input = document.getElementById('chatInput');
    if (input) input.value = '';
    this.renderComposerPreview('');
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
    this.closeComposeEmojiPicker();
    this.closeMentionPicker();
    const input = document.getElementById('chatInput');
    if (input) input.value = '';
    this.renderComposerPreview('');
    this.syncComposerPreviewScroll({ target: input });
    
    // Hide modal
    const modal = document.getElementById('chatModal');
    if (modal) {
      modal.classList.add('hidden');
    }
    
    // Clear active chat in Firestore (re-enable notifications)
    this.clearActiveChat();
    
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
        { activeChat: groupId },
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
        { activeChat: null },
        { merge: true }
      );
      console.log('[GroupChat] Active chat cleared');
    } catch (error) {
      console.error('[GroupChat] Error clearing active chat:', error);
    }
  },
  
  /**
   * Load recent messages
   */
  async loadMessages() {
    if (!Groups.currentGroup || !window.db) {
      console.log('[GroupChat] No group or db available');
      return;
    }
    
    console.log('[GroupChat] Loading messages for group:', Groups.currentGroup.id);
    
    try {
      const chatRef = window.collection(window.db, 'goMission_chats');
      
      // Simple query first - just filter by groupId
      const q = window.query(
        chatRef,
        window.where('groupId', '==', Groups.currentGroup.id),
        window.limit(50)
      );
      
      const snapshot = await window.getDocs(q);
      
      console.log('[GroupChat] Found messages:', snapshot.size);
      
      this.messages = [];
      snapshot.forEach(doc => {
        this.messages.push({ id: doc.id, ...doc.data() });
      });
      
      // Sort by createdAt client-side to avoid index requirement
      this.messages.sort((a, b) => {
        const aTime = a.createdAt?.toDate?.() || new Date(a.createdAt) || new Date(0);
        const bTime = b.createdAt?.toDate?.() || new Date(b.createdAt) || new Date(0);
        return aTime - bTime;
      });
      
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
    
    // Note: This requires Firestore real-time listeners
    // For now, we'll use polling as a simpler approach
    // In production, use onSnapshot for real-time updates
    
    // Poll every 5 seconds
    this.pollInterval = setInterval(() => {
      if (this.isOpen) {
        this.loadMessages();
      }
    }, 5000);
  },
  
  /**
   * Send a message
   */
  async sendMessage(text) {
    if (!text || !text.trim()) return;
    if (!Groups.currentGroup || !window.currentUser || !window.db) return;
    const trimmedText = text.trim();
    
    // Verify user is still a member or guest of the group
    const isMember = Groups.currentGroup.members?.includes(window.currentUser.uid);
    const isGuest = Groups.currentGroup.guests?.some(g => g.odId === window.currentUser.uid);
    
    if (!isMember && !isGuest) {
      alert('You are no longer a member of this group.');
      this.close();
      return;
    }
    
    try {
      const mentions = await this.extractMentionsFromText(trimmedText);
      const message = {
        groupId: Groups.currentGroup.id,
        senderId: window.currentUser.uid,
        senderName: window.currentUser.displayName || window.currentUser.email || 'Unknown',
        senderPhoto: window.currentUser.photoURL || '',
        text: trimmedText,
        type: 'text',
        mentions,
        mentionedUserIds: mentions.map((mention) => mention.uid),
        createdAt: window.serverTimestamp()
      };
      
      await window.addDoc(window.collection(window.db, 'goMission_chats'), message);
      await this.updateGroupThreadPreview({
        type: 'text',
        text: trimmedText,
        senderName: message.senderName
      });
      
      // Clear input
      const input = document.getElementById('chatInput');
      if (input) input.value = '';
      this.closeComposeEmojiPicker(true);
      this.closeMentionPicker();
      this.selectedMentionsByToken = {};
      this.renderComposerPreview('');
      
      // Reload messages
      await this.loadMessages();
      this.scrollToBottom();
      
    } catch (error) {
      console.error('[GroupChat] Error sending message:', error);
      alert('Error sending message. Please try again.');
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
          reflection: devotionData.reflection
        },
        createdAt: window.serverTimestamp()
      };
      
      await window.addDoc(window.collection(window.db, 'goMission_chats'), message);
      await this.updateGroupThreadPreview({
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
          <div id="chatMessage_${msg.id}" class="mb-3 ${isMe ? 'ml-8' : 'mr-8'}">
            <div class="flex items-start gap-2 ${isMe ? 'flex-row-reverse' : ''}">
              <img src="${msg.senderPhoto || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(msg.senderName) + '&background=4a0404&color=fbbf24'}" 
                   class="w-8 h-8 rounded-full flex-shrink-0">
              <div class="${isMe ? 'bg-amber-500/20' : 'bg-[var(--card-bg)]'} rounded-xl p-3 max-w-[85%] border border-[var(--card-border)]">
                <p class="text-[10px] text-[var(--text-muted)] mb-1">${isMe ? 'You' : msg.senderName}</p>
                <div class="border-l-2 border-amber-500/50 pl-2 mb-2">
                  <p class="text-xs text-amber-500 font-bold">${msg.devotion.book} ${msg.devotion.chapter}:${msg.devotion.verses?.join(',') || ''}</p>
                  <p class="text-xs text-[var(--text-muted)] italic mt-1">"${msg.devotion.reflection}"</p>
                </div>
                <p class="text-[10px] text-[var(--text-muted)] opacity-60">${timeStr}</p>
                ${this.renderReactionControls(msg, isMe)}
              </div>
            </div>
          </div>
        `;
      } else {
        // Regular text message
        html += `
          <div id="chatMessage_${msg.id}" class="mb-3 ${isMe ? 'ml-8' : 'mr-8'}">
            <div class="flex items-start gap-2 ${isMe ? 'flex-row-reverse' : ''}">
              <img src="${msg.senderPhoto || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(msg.senderName) + '&background=4a0404&color=fbbf24'}" 
                   class="w-8 h-8 rounded-full flex-shrink-0">
              <div class="${isMe ? 'bg-amber-500/20' : 'bg-[var(--card-bg)]'} rounded-xl p-3 max-w-[85%] border border-[var(--card-border)]">
                <p class="text-[10px] text-[var(--text-muted)] mb-1">${isMe ? 'You' : msg.senderName}</p>
                <p class="text-sm text-[var(--text-color)]">${this.highlightMentions(this.escapeHtml(msg.text || ''))}</p>
                <p class="text-[10px] text-[var(--text-muted)] mt-1 opacity-60">${timeStr}</p>
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
   * Handle text input changes for mention suggestions
   */
  async handleInputChange(event) {
    const input = event?.target || document.getElementById('chatInput');
    if (!input) return;
    this.renderComposerPreview(input.value || '');
    this.syncComposerPreviewScroll({ target: input });
    await this.renderMentionSuggestions(input.value || '', input.selectionStart ?? input.value.length);
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
  async updateGroupThreadPreview({ type = 'text', text = '', senderName = '' } = {}) {
    if (!Groups.currentGroup?.id || !window.db) return;
    try {
      await window.setDoc(
        window.doc(window.db, 'goMission_groups', Groups.currentGroup.id),
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
