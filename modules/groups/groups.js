/**
 * Go Mission - Groups Module
 * Handles Mission Group membership, join requests, and management
 * 
 * Features:
 * - Join/Leave group
 * - Leader approval of join requests
 * - Group member list
 * - Group info management
 */

const Groups = {
  // Current user's group data
  currentGroup: null,
  isLeader: false,
  pendingRequests: [],
  members: [],
  
  // Available groups (for joining)
  availableGroups: [],
  
  /**
   * Initialize the groups module
   */
  async init() {
    console.log('[Groups] Initializing...');
    
    if (!window.currentUser) {
      console.log('[Groups] No user logged in');
      return;
    }
    
    // Load user's current group
    await this.loadUserGroup();
    
    // Update UI
    this.updateUI();
    
    console.log('[Groups] Ready');
  },
  
  /**
   * Load the current user's group membership
   */
  async loadUserGroup() {
    if (!window.currentUser || !window.db) return;
    
    try {
      const userRef = window.doc(window.db, 'goMission_members', window.currentUser.uid);
      const userDoc = await window.getDoc(userRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const groupId = userData.groupId;
        
        if (groupId) {
          // Load group data
          const groupRef = window.doc(window.db, 'goMission_groups', groupId);
          const groupDoc = await window.getDoc(groupRef);
          
          if (groupDoc.exists()) {
            this.currentGroup = { id: groupId, ...groupDoc.data() };
            this.isLeader = this.currentGroup.leaderId === window.currentUser.uid;
            
            // If leader, load pending requests
            if (this.isLeader) {
              await this.loadPendingRequests();
            }
            
            // Load members
            await this.loadMembers();
          }
        }
      }
    } catch (error) {
      console.error('[Groups] Error loading user group:', error);
    }
  },
  
  /**
   * Load pending join requests (for leaders)
   */
  async loadPendingRequests() {
    if (!this.currentGroup || !this.isLeader) return;
    
    this.pendingRequests = this.currentGroup.pendingRequests || [];
    console.log('[Groups] Pending requests:', this.pendingRequests.length);
  },
  
  /**
   * Load group members
   */
  async loadMembers() {
    if (!this.currentGroup) return;
    
    try {
      const memberIds = this.currentGroup.members || [];
      this.members = [];
      
      for (const memberId of memberIds) {
        const memberRef = window.doc(window.db, 'goMission_members', memberId);
        const memberDoc = await window.getDoc(memberRef);
        
        if (memberDoc.exists()) {
          this.members.push({ id: memberId, ...memberDoc.data() });
        }
      }
      
      console.log('[Groups] Loaded members:', this.members.length);
    } catch (error) {
      console.error('[Groups] Error loading members:', error);
    }
  },
  
  /**
   * Search for available groups to join
   */
  async searchGroups(query = '') {
    if (!window.db) return [];
    
    try {
      const groupsRef = window.collection(window.db, 'goMission_groups');
      const snapshot = await window.getDocs(groupsRef);
      
      this.availableGroups = [];
      snapshot.forEach(doc => {
        const group = { id: doc.id, ...doc.data() };
        // Filter by query if provided
        if (!query || group.name.toLowerCase().includes(query.toLowerCase())) {
          // Don't show user's current group
          if (!this.currentGroup || group.id !== this.currentGroup.id) {
            this.availableGroups.push(group);
          }
        }
      });
      
      return this.availableGroups;
    } catch (error) {
      console.error('[Groups] Error searching groups:', error);
      return [];
    }
  },
  
  /**
   * Request to join a group
   */
  async requestJoinGroup(groupId) {
    if (!window.currentUser || !window.db) {
      alert('Please sign in first');
      return false;
    }
    
    try {
      const groupRef = window.doc(window.db, 'goMission_groups', groupId);
      const groupDoc = await window.getDoc(groupRef);
      
      if (!groupDoc.exists()) {
        alert('Group not found');
        return false;
      }
      
      const groupData = groupDoc.data();
      const pendingRequests = groupData.pendingRequests || [];
      
      // Check if already requested
      if (pendingRequests.some(r => r.uid === window.currentUser.uid)) {
        alert('You have already requested to join this group');
        return false;
      }
      
      // Check if already a member
      const members = groupData.members || [];
      if (members.includes(window.currentUser.uid)) {
        alert('You are already a member of this group');
        return false;
      }
      
      // Add join request
      const request = {
        uid: window.currentUser.uid,
        name: window.currentUser.displayName || 'Unknown',
        email: window.currentUser.email || '',
        photoURL: window.currentUser.photoURL || '',
        requestedAt: new Date().toISOString()
      };
      
      pendingRequests.push(request);
      
      await window.setDoc(groupRef, {
        pendingRequests: pendingRequests
      }, { merge: true });
      
      alert('Join request sent! The leader will review your request.');
      return true;
      
    } catch (error) {
      console.error('[Groups] Error requesting to join:', error);
      alert('Error sending request. Please try again.');
      return false;
    }
  },
  
  /**
   * Accept a join request (leader only)
   */
  async acceptRequest(requestUid) {
    if (!this.isLeader || !this.currentGroup) {
      alert('Only leaders can accept requests');
      return false;
    }
    
    try {
      const groupRef = window.doc(window.db, 'goMission_groups', this.currentGroup.id);
      
      // Get current data
      const groupDoc = await window.getDoc(groupRef);
      const groupData = groupDoc.data();
      
      let pendingRequests = groupData.pendingRequests || [];
      let members = groupData.members || [];
      
      // Find the request
      const request = pendingRequests.find(r => r.uid === requestUid);
      if (!request) {
        alert('Request not found');
        return false;
      }
      
      // Remove from pending, add to members
      pendingRequests = pendingRequests.filter(r => r.uid !== requestUid);
      if (!members.includes(requestUid)) {
        members.push(requestUid);
      }
      
      // Update group
      await window.setDoc(groupRef, {
        pendingRequests: pendingRequests,
        members: members,
        currentCount: members.length
      }, { merge: true });
      
      // Update member's profile
      const memberRef = window.doc(window.db, 'goMission_members', requestUid);
      await window.setDoc(memberRef, {
        groupId: this.currentGroup.id,
        groupRole: 'member'
      }, { merge: true });
      
      // Refresh local data
      await this.loadUserGroup();
      this.updateUI();
      
      alert(`${request.name} has been added to the group!`);
      return true;
      
    } catch (error) {
      console.error('[Groups] Error accepting request:', error);
      alert('Error accepting request. Please try again.');
      return false;
    }
  },
  
  /**
   * Reject a join request (leader only)
   */
  async rejectRequest(requestUid) {
    if (!this.isLeader || !this.currentGroup) {
      alert('Only leaders can reject requests');
      return false;
    }
    
    try {
      const groupRef = window.doc(window.db, 'goMission_groups', this.currentGroup.id);
      
      // Get current data
      const groupDoc = await window.getDoc(groupRef);
      const groupData = groupDoc.data();
      
      let pendingRequests = groupData.pendingRequests || [];
      
      // Remove from pending
      pendingRequests = pendingRequests.filter(r => r.uid !== requestUid);
      
      // Update group
      await window.setDoc(groupRef, {
        pendingRequests: pendingRequests
      }, { merge: true });
      
      // Refresh local data
      await this.loadUserGroup();
      this.updateUI();
      
      alert('Request rejected');
      return true;
      
    } catch (error) {
      console.error('[Groups] Error rejecting request:', error);
      alert('Error rejecting request. Please try again.');
      return false;
    }
  },
  
  /**
   * Leave current group
   */
  async leaveGroup() {
    if (!this.currentGroup || !window.currentUser) return false;
    
    if (this.isLeader) {
      alert('Leaders cannot leave their group. Please assign a new leader first.');
      return false;
    }
    
    if (!confirm('Are you sure you want to leave this group?')) {
      return false;
    }
    
    try {
      const groupRef = window.doc(window.db, 'goMission_groups', this.currentGroup.id);
      
      // Get current data
      const groupDoc = await window.getDoc(groupRef);
      const groupData = groupDoc.data();
      
      let members = groupData.members || [];
      members = members.filter(m => m !== window.currentUser.uid);
      
      // Update group
      await window.setDoc(groupRef, {
        members: members,
        currentCount: members.length
      }, { merge: true });
      
      // Update user's profile
      const userRef = window.doc(window.db, 'goMission_members', window.currentUser.uid);
      await window.setDoc(userRef, {
        groupId: null,
        groupRole: null
      }, { merge: true });
      
      // Clear local data
      this.currentGroup = null;
      this.isLeader = false;
      this.members = [];
      
      this.updateUI();
      alert('You have left the group');
      return true;
      
    } catch (error) {
      console.error('[Groups] Error leaving group:', error);
      alert('Error leaving group. Please try again.');
      return false;
    }
  },
  
  /**
   * Create a new group (for leaders)
   */
  async createGroup(groupData) {
    if (!window.currentUser || !window.db) {
      alert('Please sign in first');
      return null;
    }
    
    try {
      // Generate group ID
      const groupId = 'group_' + Date.now();
      
      const newGroup = {
        id: groupId,
        name: groupData.name,
        schedule: {
          day: groupData.meetingDay || 'saturday',
          time: groupData.meetingTime || '19:00',
          timezone: 'GMT+8',
          platform: groupData.platform || 'zoom',
          meetingLink: groupData.meetingLink || ''
        },
        leaderId: window.currentUser.uid,
        leaderName: window.currentUser.displayName || '',
        members: [window.currentUser.uid],
        pendingRequests: [],
        currentCount: 1,
        capacity: 12,
        status: 'active',
        createdAt: window.serverTimestamp()
      };
      
      // Create group
      const groupRef = window.doc(window.db, 'goMission_groups', groupId);
      await window.setDoc(groupRef, newGroup);
      
      // Update user's profile
      const userRef = window.doc(window.db, 'goMission_members', window.currentUser.uid);
      await window.setDoc(userRef, {
        groupId: groupId,
        groupRole: 'leader',
        'roles.isGroupLeader': true
      }, { merge: true });
      
      // Refresh local data
      await this.loadUserGroup();
      this.updateUI();
      
      alert('Group created successfully!');
      return groupId;
      
    } catch (error) {
      console.error('[Groups] Error creating group:', error);
      alert('Error creating group. Please try again.');
      return null;
    }
  },
  
  /**
   * Update the UI based on current state
   */
  updateUI() {
    // Update Mission Group card
    this.renderGroupCard();
    
    // Update pending requests badge (for leaders)
    this.updatePendingBadge();
  },
  
  /**
   * Render the group card content
   */
  renderGroupCard() {
    const container = document.getElementById('groupCardContent');
    if (!container) return;
    
    if (this.currentGroup) {
      // Show group info
      container.innerHTML = this.renderGroupInfo();
    } else {
      // Show join/create options
      container.innerHTML = this.renderJoinOptions();
    }
  },
  
  /**
   * Render group info for members
   */
  renderGroupInfo() {
    const group = this.currentGroup;
    const schedule = group.schedule || {};
    const meetingTime = `${this.capitalizeFirst(schedule.day || 'Saturday')}, ${this.formatTime(schedule.time || '19:00')}`;
    
    let html = `
      <div class="bg-[#4a0404] p-4 rounded-xl text-center border border-amber-500/20 mb-4 shadow-inner">
        <p class="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Weekly Meeting</p>
        <p class="text-amber-400 font-black tracking-widest uppercase">${meetingTime}</p>
        <p class="text-[10px] text-slate-500 mt-1">${group.name}</p>
      </div>
    `;
    
    // Show members count
    html += `
      <div class="flex items-center justify-between p-3 bg-black/30 rounded-xl border border-white/5 mb-3">
        <span class="text-sm text-slate-200">Members</span>
        <span class="text-amber-500 font-bold">${this.members.length}/${group.capacity || 12}</span>
      </div>
    `;
    
    // Leader badge and pending requests
    if (this.isLeader && this.pendingRequests.length > 0) {
      html += `
        <div class="mb-4 p-3 bg-amber-500/10 rounded-xl border border-amber-500/30">
          <p class="text-amber-400 text-sm font-bold mb-2">📬 ${this.pendingRequests.length} Pending Request${this.pendingRequests.length > 1 ? 's' : ''}</p>
          <button onclick="Groups.showPendingRequests()" class="text-xs text-amber-500 hover:text-amber-400 underline">
            Review Requests
          </button>
        </div>
      `;
    }
    
    // Chat button
    html += `
      <button onclick="GroupChat.open()" class="mission-button w-full py-4 rounded-xl font-black text-sm uppercase tracking-wide flex items-center justify-center gap-2 mb-3">
        💬 Group Chat
      </button>
    `;
    
    // Leave group button (for non-leaders)
    if (!this.isLeader) {
      html += `
        <button onclick="Groups.leaveGroup()" class="w-full py-2 text-xs text-slate-500 hover:text-red-400 transition-colors">
          Leave Group
        </button>
      `;
    }
    
    return html;
  },
  
  /**
   * Render join/create options for users without a group
   */
  renderJoinOptions() {
    return `
      <div class="text-center py-6">
        <p class="text-slate-400 text-sm mb-4">You're not in a Mission Group yet</p>
        
        <button onclick="Groups.showJoinModal()" class="mission-button w-full py-4 rounded-xl font-black text-sm uppercase tracking-wide flex items-center justify-center gap-2 mb-3">
          🔍 Find a Group
        </button>
        
        <button onclick="Groups.showCreateModal()" class="w-full py-3 border border-amber-500/30 rounded-xl text-amber-500 text-sm font-bold hover:bg-amber-500/10 transition-colors">
          ➕ Create New Group
        </button>
      </div>
    `;
  },
  
  /**
   * Update pending requests badge
   */
  updatePendingBadge() {
    const badge = document.getElementById('pendingRequestsBadge');
    if (badge) {
      if (this.isLeader && this.pendingRequests.length > 0) {
        badge.textContent = this.pendingRequests.length;
        badge.classList.remove('hidden');
      } else {
        badge.classList.add('hidden');
      }
    }
  },
  
  /**
   * Show modal to find and join groups
   */
  async showJoinModal() {
    // Search for available groups
    await this.searchGroups();
    
    const modal = document.getElementById('groupModal');
    const content = document.getElementById('groupModalContent');
    
    if (!modal || !content) {
      console.error('[Groups] Modal elements not found');
      return;
    }
    
    let html = `
      <div class="p-4">
        <h3 class="text-lg font-bold text-amber-400 mb-4">Find a Mission Group</h3>
        
        <input type="text" id="groupSearchInput" placeholder="Search groups..." 
               class="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-slate-200 placeholder-slate-500 mb-4"
               oninput="Groups.filterGroups(this.value)">
        
        <div id="groupSearchResults" class="space-y-3 max-h-60 overflow-y-auto">
    `;
    
    if (this.availableGroups.length === 0) {
      html += `<p class="text-slate-500 text-sm text-center py-4">No groups found</p>`;
    } else {
      for (const group of this.availableGroups) {
        const schedule = group.schedule || {};
        html += `
          <div class="p-3 bg-black/30 rounded-xl border border-white/5 flex items-center justify-between">
            <div>
              <p class="text-slate-200 font-bold text-sm">${group.name}</p>
              <p class="text-slate-500 text-xs">${this.capitalizeFirst(schedule.day || 'TBD')} ${this.formatTime(schedule.time)}</p>
              <p class="text-slate-600 text-xs">${group.currentCount || 0}/${group.capacity || 12} members</p>
            </div>
            <button onclick="Groups.requestJoinGroup('${group.id}')" 
                    class="px-3 py-1.5 bg-amber-500/20 text-amber-400 rounded-lg text-xs font-bold hover:bg-amber-500/30">
              Join
            </button>
          </div>
        `;
      }
    }
    
    html += `
        </div>
        
        <button onclick="Groups.closeModal()" class="w-full mt-4 py-3 border border-white/10 rounded-xl text-slate-400 text-sm hover:bg-white/5">
          Cancel
        </button>
      </div>
    `;
    
    content.innerHTML = html;
    modal.classList.remove('hidden');
  },
  
  /**
   * Filter groups in search results
   */
  async filterGroups(query) {
    await this.searchGroups(query);
    
    const results = document.getElementById('groupSearchResults');
    if (!results) return;
    
    let html = '';
    
    if (this.availableGroups.length === 0) {
      html = `<p class="text-slate-500 text-sm text-center py-4">No groups found</p>`;
    } else {
      for (const group of this.availableGroups) {
        const schedule = group.schedule || {};
        html += `
          <div class="p-3 bg-black/30 rounded-xl border border-white/5 flex items-center justify-between">
            <div>
              <p class="text-slate-200 font-bold text-sm">${group.name}</p>
              <p class="text-slate-500 text-xs">${this.capitalizeFirst(schedule.day || 'TBD')} ${this.formatTime(schedule.time)}</p>
              <p class="text-slate-600 text-xs">${group.currentCount || 0}/${group.capacity || 12} members</p>
            </div>
            <button onclick="Groups.requestJoinGroup('${group.id}')" 
                    class="px-3 py-1.5 bg-amber-500/20 text-amber-400 rounded-lg text-xs font-bold hover:bg-amber-500/30">
              Join
            </button>
          </div>
        `;
      }
    }
    
    results.innerHTML = html;
  },
  
  /**
   * Show modal to create a new group
   */
  showCreateModal() {
    const modal = document.getElementById('groupModal');
    const content = document.getElementById('groupModalContent');
    
    if (!modal || !content) return;
    
    content.innerHTML = `
      <div class="p-4">
        <h3 class="text-lg font-bold text-amber-400 mb-4">Create Mission Group</h3>
        
        <div class="space-y-4">
          <div>
            <label class="block text-xs text-slate-400 mb-1">Group Name</label>
            <input type="text" id="newGroupName" placeholder="e.g., Taytay Youth Group" 
                   class="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-slate-200 placeholder-slate-500">
          </div>
          
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs text-slate-400 mb-1">Meeting Day</label>
              <select id="newGroupDay" class="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-slate-200">
                <option value="sunday">Sunday</option>
                <option value="monday">Monday</option>
                <option value="tuesday">Tuesday</option>
                <option value="wednesday">Wednesday</option>
                <option value="thursday">Thursday</option>
                <option value="friday">Friday</option>
                <option value="saturday" selected>Saturday</option>
              </select>
            </div>
            <div>
              <label class="block text-xs text-slate-400 mb-1">Time</label>
              <input type="time" id="newGroupTime" value="19:00"
                     class="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-slate-200">
            </div>
          </div>
          
          <div>
            <label class="block text-xs text-slate-400 mb-1">Meeting Link (optional)</label>
            <input type="url" id="newGroupLink" placeholder="https://zoom.us/j/..." 
                   class="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-slate-200 placeholder-slate-500">
          </div>
        </div>
        
        <div class="flex gap-3 mt-6">
          <button onclick="Groups.closeModal()" class="flex-1 py-3 border border-white/10 rounded-xl text-slate-400 text-sm hover:bg-white/5">
            Cancel
          </button>
          <button onclick="Groups.submitCreateGroup()" class="flex-1 py-3 bg-amber-500 text-[#2a0505] rounded-xl text-sm font-bold hover:bg-amber-400">
            Create Group
          </button>
        </div>
      </div>
    `;
    
    modal.classList.remove('hidden');
  },
  
  /**
   * Submit create group form
   */
  async submitCreateGroup() {
    const name = document.getElementById('newGroupName')?.value?.trim();
    const day = document.getElementById('newGroupDay')?.value;
    const time = document.getElementById('newGroupTime')?.value;
    const link = document.getElementById('newGroupLink')?.value?.trim();
    
    if (!name) {
      alert('Please enter a group name');
      return;
    }
    
    const groupId = await this.createGroup({
      name: name,
      meetingDay: day,
      meetingTime: time,
      meetingLink: link
    });
    
    if (groupId) {
      this.closeModal();
    }
  },
  
  /**
   * Show pending requests modal (for leaders)
   */
  showPendingRequests() {
    if (!this.isLeader || this.pendingRequests.length === 0) return;
    
    const modal = document.getElementById('groupModal');
    const content = document.getElementById('groupModalContent');
    
    if (!modal || !content) return;
    
    let html = `
      <div class="p-4">
        <h3 class="text-lg font-bold text-amber-400 mb-4">Pending Requests</h3>
        
        <div class="space-y-3 max-h-80 overflow-y-auto">
    `;
    
    for (const request of this.pendingRequests) {
      const requestDate = new Date(request.requestedAt).toLocaleDateString();
      html += `
        <div class="p-3 bg-black/30 rounded-xl border border-white/5">
          <div class="flex items-center gap-3 mb-3">
            <img src="${request.photoURL || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(request.name) + '&background=4a0404&color=fbbf24'}" 
                 class="w-10 h-10 rounded-full border border-amber-500/30">
            <div>
              <p class="text-slate-200 font-bold text-sm">${request.name}</p>
              <p class="text-slate-500 text-xs">${request.email}</p>
              <p class="text-slate-600 text-[10px]">Requested: ${requestDate}</p>
            </div>
          </div>
          <div class="flex gap-2">
            <button onclick="Groups.acceptRequest('${request.uid}')" 
                    class="flex-1 py-2 bg-green-500/20 text-green-400 rounded-lg text-xs font-bold hover:bg-green-500/30">
              ✓ Accept
            </button>
            <button onclick="Groups.rejectRequest('${request.uid}')" 
                    class="flex-1 py-2 bg-red-500/20 text-red-400 rounded-lg text-xs font-bold hover:bg-red-500/30">
              ✕ Reject
            </button>
          </div>
        </div>
      `;
    }
    
    html += `
        </div>
        
        <button onclick="Groups.closeModal()" class="w-full mt-4 py-3 border border-white/10 rounded-xl text-slate-400 text-sm hover:bg-white/5">
          Close
        </button>
      </div>
    `;
    
    content.innerHTML = html;
    modal.classList.remove('hidden');
  },
  
  /**
   * Close modal
   */
  closeModal() {
    const modal = document.getElementById('groupModal');
    if (modal) modal.classList.add('hidden');
  },
  
  // Utility functions
  capitalizeFirst(str) {
    return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
  },
  
  formatTime(time) {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${minutes} ${ampm}`;
  }
};

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Groups;
}
