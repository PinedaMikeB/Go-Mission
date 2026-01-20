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
          <p class="text-slate-500 text-sm">No messages yet</p>
          <p class="text-slate-600 text-xs mt-1">Start the conversation!</p>
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
            <span class="text-[10px] text-slate-600 bg-slate-800/50 px-3 py-1 rounded-full">${dateStr}</span>
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
              <div class="${isMe ? 'bg-amber-500/20' : 'bg-black/40'} rounded-xl p-3 max-w-[85%]">
                <p class="text-[10px] text-slate-500 mb-1">${isMe ? 'You' : msg.senderName}</p>
                <div class="border-l-2 border-amber-500/50 pl-2 mb-2">
                  <p class="text-xs text-amber-400 font-bold">${msg.devotion.book} ${msg.devotion.chapter}:${msg.devotion.verses?.join(',') || ''}</p>
                  <p class="text-xs text-slate-400 italic mt-1">"${msg.devotion.reflection}"</p>
                </div>
                <p class="text-[10px] text-slate-600">${timeStr}</p>
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
              <div class="${isMe ? 'bg-amber-500/20' : 'bg-black/40'} rounded-xl p-3 max-w-[85%]">
                <p class="text-[10px] text-slate-500 mb-1">${isMe ? 'You' : msg.senderName}</p>
                <p class="text-sm text-slate-200">${this.escapeHtml(msg.text)}</p>
                <p class="text-[10px] text-slate-600 mt-1">${timeStr}</p>
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
  }
};

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GroupChat;
}
