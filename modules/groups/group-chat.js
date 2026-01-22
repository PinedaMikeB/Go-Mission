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
    
    this.isOpen = true;
    
    // Show chat modal
    const modal = document.getElementById('chatModal');
    if (modal) {
      modal.classList.remove('hidden');
    }
    
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
    
    // Hide modal
    const modal = document.getElementById('chatModal');
    if (modal) {
      modal.classList.add('hidden');
    }
    
    // Unsubscribe from updates
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
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
    
    try {
      const message = {
        groupId: Groups.currentGroup.id,
        senderId: window.currentUser.uid,
        senderName: window.currentUser.displayName || 'Unknown',
        senderPhoto: window.currentUser.photoURL || '',
        text: text.trim(),
        type: 'text',
        createdAt: window.serverTimestamp()
      };
      
      await window.addDoc(window.collection(window.db, 'goMission_chats'), message);
      
      // Clear input
      const input = document.getElementById('chatInput');
      if (input) input.value = '';
      
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
        senderName: window.currentUser.displayName || 'Unknown',
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
          <div class="mb-3 ${isMe ? 'ml-8' : 'mr-8'}">
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
              </div>
            </div>
          </div>
        `;
      } else {
        // Regular text message
        html += `
          <div class="mb-3 ${isMe ? 'ml-8' : 'mr-8'}">
            <div class="flex items-start gap-2 ${isMe ? 'flex-row-reverse' : ''}">
              <img src="${msg.senderPhoto || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(msg.senderName) + '&background=4a0404&color=fbbf24'}" 
                   class="w-8 h-8 rounded-full flex-shrink-0">
              <div class="${isMe ? 'bg-amber-500/20' : 'bg-[var(--card-bg)]'} rounded-xl p-3 max-w-[85%] border border-[var(--card-border)]">
                <p class="text-[10px] text-[var(--text-muted)] mb-1">${isMe ? 'You' : msg.senderName}</p>
                <p class="text-sm text-[var(--text-color)]">${this.escapeHtml(msg.text)}</p>
                <p class="text-[10px] text-[var(--text-muted)] mt-1 opacity-60">${timeStr}</p>
              </div>
            </div>
          </div>
        `;
      }
    }
    
    container.innerHTML = html;
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
  showMembers() {
    if (!Groups.currentGroup || !Groups.members) {
      alert('Unable to load members');
      return;
    }
    
    const group = Groups.currentGroup;
    const members = Groups.members;
    const isLeader = Groups.isLeader;
    
    // Create modal
    const modal = document.createElement('div');
    modal.id = 'membersModal';
    modal.className = 'fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4';
    
    let membersHtml = '';
    for (const member of members) {
      const isCurrentUser = member.odId === window.currentUser?.uid;
      const isMemberLeader = member.odId === group.leaderId;
      
      membersHtml += `
        <div class="flex items-center justify-between p-3 bg-black/30 rounded-xl border border-white/5 ${isCurrentUser ? 'border-amber-500/30' : ''}">
          <div class="flex items-center gap-3">
            <img src="${member.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.displayName || 'User')}&background=4a0404&color=fbbf24`}" 
                 class="w-10 h-10 rounded-full border ${isMemberLeader ? 'border-amber-500' : 'border-white/10'}" 
                 alt="${member.displayName}">
            <div>
              <p class="text-[var(--text-color)] font-bold text-sm">
                ${member.displayName || 'Unknown'}
                ${isCurrentUser ? '<span class="text-amber-500 text-xs">(You)</span>' : ''}
              </p>
              <p class="text-xs ${isMemberLeader ? 'text-amber-500' : 'text-[var(--text-muted)]'}">
                ${isMemberLeader ? '👑 Leader' : 'Member'}
              </p>
            </div>
          </div>
          ${isLeader && !isMemberLeader && !isCurrentUser ? `
            <button onclick="Groups.removeMember('${member.odId}', '${member.displayName?.replace(/'/g, "\\'")}')" 
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
    
    document.body.appendChild(modal);
    
    // Close on backdrop click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });
  }
};

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GroupChat;
}
