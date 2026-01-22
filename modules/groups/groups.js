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
  
  // Admin email (can bypass disciple-first rule)
  ADMIN_EMAIL: 'michael.marga@gmail.com',
  
  // Check if current user is admin
  isAdmin() {
    return window.currentUser?.email === this.ADMIN_EMAIL;
  },
  
  // Check if user has been a group member (disciple) before
  async hasBeenDisciple() {
    if (!window.currentUser || !window.db) return false;
    
    try {
      const userRef = window.doc(window.db, 'goMission_members', window.currentUser.uid);
      const userDoc = await window.getDoc(userRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        // User is/was a disciple if they have groupId or discipleHistory
        return !!(userData.groupId || userData.discipleHistory?.length > 0);
      }
      return false;
    } catch (error) {
      console.error('[Groups] Error checking disciple status:', error);
      return false;
    }
  },
  
  // Check if user can create a group
  async canCreateGroup() {
    // Admin can always create
    if (this.isAdmin()) return { allowed: true, reason: 'admin' };
    
    // Check if user has been a disciple
    const wasDisciple = await this.hasBeenDisciple();
    if (wasDisciple) return { allowed: true, reason: 'disciple' };
    
    // Otherwise, need endorsement code
    return { allowed: false, reason: 'not_disciple' };
  },
  
  // Validate endorsement code
  async validateEndorsementCode(code) {
    if (!window.db || !code) return { valid: false, message: 'Invalid code' };
    
    try {
      // Check goMission_endorsementCodes collection
      const codeRef = window.doc(window.db, 'goMission_endorsementCodes', code.toUpperCase());
      const codeDoc = await window.getDoc(codeRef);
      
      if (!codeDoc.exists()) {
        return { valid: false, message: 'Code not found' };
      }
      
      const codeData = codeDoc.data();
      
      // Check if code is still valid
      if (codeData.used) {
        return { valid: false, message: 'Code has already been used' };
      }
      
      if (codeData.expiresAt && new Date(codeData.expiresAt) < new Date()) {
        return { valid: false, message: 'Code has expired' };
      }
      
      // Check if code is for this user (if restricted)
      if (codeData.forEmail && codeData.forEmail !== window.currentUser?.email) {
        return { valid: false, message: 'Code is not valid for your account' };
      }
      
      return { 
        valid: true, 
        message: 'Code verified',
        endorsedBy: codeData.createdBy,
        endorserName: codeData.createdByName
      };
    } catch (error) {
      console.error('[Groups] Error validating endorsement code:', error);
      return { valid: false, message: 'Error validating code' };
    }
  },
  
  // Validate group invite code (for joining a group)
  async validateGroupInviteCode(code) {
    if (!window.db || !code) return { valid: false, message: 'Invalid code' };
    
    try {
      // Check goMission_groupInviteCodes collection
      const codeRef = window.doc(window.db, 'goMission_groupInviteCodes', code.toUpperCase());
      const codeDoc = await window.getDoc(codeRef);
      
      if (!codeDoc.exists()) {
        return { valid: false, message: 'Invalid invite code' };
      }
      
      const codeData = codeDoc.data();
      
      // Check if code is still valid
      if (codeData.expiresAt && new Date(codeData.expiresAt) < new Date()) {
        return { valid: false, message: 'This invite code has expired' };
      }
      
      // Check usage limit
      if (codeData.maxUses && codeData.usedCount >= codeData.maxUses) {
        return { valid: false, message: 'This invite code has reached its usage limit' };
      }
      
      // Get group info
      const groupRef = window.doc(window.db, 'goMission_groups', codeData.groupId);
      const groupDoc = await window.getDoc(groupRef);
      
      if (!groupDoc.exists()) {
        return { valid: false, message: 'Group not found' };
      }
      
      const groupData = groupDoc.data();
      
      // Check if group is full
      if (groupData.currentCount >= groupData.capacity) {
        return { valid: false, message: 'This group is already full' };
      }
      
      // Check if user is already a member
      if (groupData.members?.includes(window.currentUser?.uid)) {
        return { valid: false, message: 'You are already a member of this group' };
      }
      
      return { 
        valid: true, 
        message: 'Code verified',
        groupId: codeData.groupId,
        groupName: groupData.name,
        groupData: groupData,
        codeData: codeData
      };
    } catch (error) {
      console.error('[Groups] Error validating invite code:', error);
      return { valid: false, message: 'Error validating code' };
    }
  },
  
  // Join group using invite code
  async joinWithInviteCode(code) {
    if (!window.currentUser || !window.db) {
      alert('Please sign in first');
      return false;
    }
    
    const validation = await this.validateGroupInviteCode(code);
    
    if (!validation.valid) {
      alert(validation.message);
      return false;
    }
    
    try {
      const groupRef = window.doc(window.db, 'goMission_groups', validation.groupId);
      const groupData = validation.groupData;
      
      // Add user to members
      const members = groupData.members || [];
      if (!members.includes(window.currentUser.uid)) {
        members.push(window.currentUser.uid);
      }
      
      // Update group
      await window.setDoc(groupRef, {
        members: members,
        currentCount: members.length
      }, { merge: true });
      
      // Update user's profile
      const userRef = window.doc(window.db, 'goMission_members', window.currentUser.uid);
      await window.setDoc(userRef, {
        groupId: validation.groupId,
        groupRole: 'member',
        joinedGroupAt: new Date().toISOString(),
        joinedVia: 'invite_code',
        // Track disciple history
        discipleHistory: window.arrayUnion ? window.arrayUnion({
          groupId: validation.groupId,
          groupName: validation.groupName,
          joinedAt: new Date().toISOString()
        }) : [{
          groupId: validation.groupId,
          groupName: validation.groupName,
          joinedAt: new Date().toISOString()
        }]
      }, { merge: true });
      
      // Increment code usage count
      const codeRef = window.doc(window.db, 'goMission_groupInviteCodes', code.toUpperCase());
      await window.setDoc(codeRef, {
        usedCount: (validation.codeData.usedCount || 0) + 1,
        lastUsedAt: new Date().toISOString(),
        lastUsedBy: window.currentUser.uid
      }, { merge: true });
      
      // Refresh local data
      await this.loadUserGroup();
      this.updateUI();
      
      alert(`Welcome to ${validation.groupName}! 🎉`);
      return true;
      
    } catch (error) {
      console.error('[Groups] Error joining group:', error);
      alert('Error joining group. Please try again.');
      return false;
    }
  },
  
  // Generate group invite code (for leaders)
  async generateGroupInviteCode(expiresInDays = 30, maxUses = null) {
    if (!window.currentUser || !window.db) {
      alert('Please sign in first');
      return null;
    }
    
    if (!this.isLeader && !this.isAdmin()) {
      alert('Only group leaders can generate invite codes');
      return null;
    }
    
    if (!this.currentGroup) {
      alert('You must be in a group to generate invite codes');
      return null;
    }
    
    try {
      // Generate random 6-character code (shorter for easy sharing)
      const code = this.generateRandomCode(6);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);
      
      const codeData = {
        code: code,
        groupId: this.currentGroup.id,
        groupName: this.currentGroup.name,
        createdBy: window.currentUser.uid,
        createdByName: window.currentUser.displayName || window.currentUser.email,
        createdAt: new Date().toISOString(),
        expiresAt: expiresAt.toISOString(),
        maxUses: maxUses, // null = unlimited
        usedCount: 0
      };
      
      const codeRef = window.doc(window.db, 'goMission_groupInviteCodes', code);
      await window.setDoc(codeRef, codeData);
      
      console.log('[Groups] Generated group invite code:', code);
      return code;
      
    } catch (error) {
      console.error('[Groups] Error generating invite code:', error);
      alert('Error generating code. Please try again.');
      return null;
    }
  },
  
  // Mark endorsement code as used (for creating groups)
  async markCodeUsed(code, groupId) {
    if (!window.db || !code) return;
    
    try {
      const codeRef = window.doc(window.db, 'goMission_endorsementCodes', code.toUpperCase());
      await window.setDoc(codeRef, {
        used: true,
        usedBy: window.currentUser?.uid,
        usedByEmail: window.currentUser?.email,
        usedAt: new Date().toISOString(),
        groupCreated: groupId
      }, { merge: true });
    } catch (error) {
      console.error('[Groups] Error marking code as used:', error);
    }
  },
  
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
            
            // If leader, load pending requests and sync member groupIds
            if (this.isLeader) {
              await this.loadPendingRequests();
              // Auto-fix any members who don't have groupId set
              await this.syncMemberGroupIds();
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
          const memberData = memberDoc.data();
          console.log('[Groups] Member data:', memberId, memberData);
          this.members.push({ id: memberId, ...memberData });
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
   * Remove a member from the group (leader only)
   */
  async removeMember(memberId, memberName) {
    if (!this.isLeader || !this.currentGroup) {
      alert('Only leaders can remove members');
      return false;
    }
    
    if (!confirm(`Remove ${memberName} from the group?`)) {
      return false;
    }
    
    try {
      const groupRef = window.doc(window.db, 'goMission_groups', this.currentGroup.id);
      const groupDoc = await window.getDoc(groupRef);
      const groupData = groupDoc.data();
      
      let members = groupData.members || [];
      members = members.filter(m => m !== memberId);
      
      // Update group
      await window.setDoc(groupRef, {
        members: members,
        currentCount: members.length
      }, { merge: true });
      
      // Clear member's groupId
      const memberRef = window.doc(window.db, 'goMission_members', memberId);
      await window.setDoc(memberRef, {
        groupId: null,
        groupRole: null
      }, { merge: true });
      
      // Refresh local data
      await this.loadUserGroup();
      this.updateUI();
      
      // Close members modal if open
      const modal = document.getElementById('membersModal');
      if (modal) modal.remove();
      
      alert(`${memberName} has been removed from the group`);
      return true;
      
    } catch (error) {
      console.error('[Groups] Error removing member:', error);
      alert('Error removing member. Please try again.');
      return false;
    }
  },
  
  /**
   * Sync groupId for all members in the group's members array
   * Fixes inconsistency where member is in group but doesn't have groupId set
   */
  async syncMemberGroupIds() {
    if (!this.currentGroup || !window.db) return;
    
    const groupId = this.currentGroup.id;
    const memberIds = this.currentGroup.members || [];
    
    console.log('[Groups] Syncing groupId for', memberIds.length, 'members');
    
    for (const memberId of memberIds) {
      try {
        const memberRef = window.doc(window.db, 'goMission_members', memberId);
        const memberDoc = await window.getDoc(memberRef);
        
        if (memberDoc.exists()) {
          const memberData = memberDoc.data();
          if (memberData.groupId !== groupId) {
            console.log('[Groups] Fixing groupId for member:', memberId);
            await window.setDoc(memberRef, {
              groupId: groupId,
              groupRole: memberId === this.currentGroup.leaderId ? 'leader' : 'member'
            }, { merge: true });
          }
        }
      } catch (error) {
        console.error('[Groups] Error syncing member:', memberId, error);
      }
    }
  },
  
  /**
   * Create a new group (for leaders)
   * Requires: user was a disciple OR has valid endorsement code OR is admin
   */
  async createGroup(groupData, endorsementCode = null) {
    if (!window.currentUser || !window.db) {
      alert('Please sign in first');
      return null;
    }
    
    // Check if user can create a group
    const canCreate = await this.canCreateGroup();
    
    if (!canCreate.allowed) {
      // Need endorsement code
      if (!endorsementCode) {
        alert('You need an endorsement code to create a group. Please join a group first to become a disciple, or enter an endorsement code from your leader.');
        return null;
      }
      
      // Validate the code
      const validation = await this.validateEndorsementCode(endorsementCode);
      if (!validation.valid) {
        alert(validation.message);
        return null;
      }
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
        createdAt: window.serverTimestamp(),
        // Track how group was created
        createdVia: endorsementCode ? 'endorsement' : (this.isAdmin() ? 'admin' : 'disciple'),
        endorsementCode: endorsementCode || null
      };
      
      // Create group
      const groupRef = window.doc(window.db, 'goMission_groups', groupId);
      await window.setDoc(groupRef, newGroup);
      
      // Update user's profile
      const userRef = window.doc(window.db, 'goMission_members', window.currentUser.uid);
      await window.setDoc(userRef, {
        groupId: groupId,
        groupRole: 'leader',
        'roles.isGroupLeader': true,
        // Track that user became a disciple-maker
        becameLeaderAt: new Date().toISOString()
      }, { merge: true });
      
      // Mark endorsement code as used
      if (endorsementCode) {
        await this.markCodeUsed(endorsementCode, groupId);
      }
      
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
  async renderGroupCard() {
    const container = document.getElementById('groupCardContent');
    if (!container) return;
    
    if (this.currentGroup) {
      // Show group info
      container.innerHTML = this.renderGroupInfo();
    } else {
      // Show join/create options
      container.innerHTML = await this.renderJoinOptions();
    }
  },
  
  /**
   * Render group info for members
   */
  renderGroupInfo() {
    const group = this.currentGroup;
    
    // Use GroupMeeting module for meeting section
    let html = '';
    if (typeof GroupMeeting !== 'undefined' && GroupMeeting.renderMeetingSection) {
      html += GroupMeeting.renderMeetingSection(group, this.isLeader);
    } else {
      // Simple fallback - just show schedule text without join button
      const schedule = group.meetingSchedule || group.schedule || {};
      const meetingTime = schedule.day && schedule.time 
        ? `${this.capitalizeFirst(schedule.day)}, ${this.formatTime(schedule.time)}`
        : 'No meeting scheduled';
      html += `
        <div class="bg-[var(--card-bg)] rounded-xl p-4 border border-[var(--card-border)] mb-4">
          <h3 class="font-bold text-[var(--text-color)] flex items-center gap-2 mb-2">
            <span class="text-xl">📹</span> Weekly Meeting
          </h3>
          <p class="text-[var(--text-color)]">${meetingTime}</p>
          <p class="text-xs text-[var(--text-muted)] mt-1">Loading meeting module...</p>
        </div>
      `;
    }
    
    html += '<div class="mt-4">';  // Spacing after meeting section
    
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
    
    // Chat button with notification badge
    html += `
      <button onclick="GroupChat.open(); Notifications?.markAsRead();" class="mission-button w-full py-4 rounded-xl font-black text-sm uppercase tracking-wide flex items-center justify-center gap-2 mb-3 relative">
        💬 Group Chat
        <span id="chatNotificationBadge" class="hidden absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">0</span>
      </button>
    `;
    
    // Leader tools
    if (this.isLeader || this.isAdmin()) {
      html += `
        <div class="space-y-2 mb-3">
          <button onclick="Groups.showGroupInviteCodeModal()" class="w-full py-3 border border-green-500/30 rounded-xl text-green-400 text-sm font-bold hover:bg-green-500/10 transition-colors flex items-center justify-center gap-2">
            🔑 Invite Members
          </button>
          <button onclick="Groups.showEndorsementCodeModal()" class="w-full py-2 border border-amber-500/20 rounded-xl text-amber-400/70 text-xs hover:bg-amber-500/10 transition-colors">
            🎫 Endorse New Leader
          </button>
        </div>
      `;
    }
    
    // Leave group button (for non-leaders)
    if (!this.isLeader) {
      html += `
        <button onclick="Groups.leaveGroup()" class="w-full py-2 text-xs text-slate-500 hover:text-red-400 transition-colors">
          Leave Group
        </button>
      `;
    }
    
    html += '</div>';  // Close wrapper div
    
    return html;
  },
  
  /**
   * Render join/create options for users without a group
   */
  async renderJoinOptions() {
    const canCreate = await this.canCreateGroup();
    
    let createButtonHtml = '';
    
    if (canCreate.allowed) {
      // User can create directly (admin or former disciple)
      createButtonHtml = `
        <button onclick="Groups.showCreateModal()" class="w-full py-3 border border-amber-500/30 rounded-xl text-amber-500 text-sm font-bold hover:bg-amber-500/10 transition-colors">
          ➕ Create New Group
        </button>
      `;
    } else {
      // User needs endorsement code or must join first
      createButtonHtml = `
        <button onclick="Groups.showCreateModal(true)" class="w-full py-3 border border-slate-600/30 rounded-xl text-slate-400 text-sm font-bold hover:bg-slate-500/10 transition-colors">
          ➕ Create Group (Need Code)
        </button>
        <p class="text-[10px] text-slate-500 text-center mt-2">
          Join a group first to become a disciple, or use an endorsement code from your leader
        </p>
      `;
    }
    
    return `
      <div class="text-center py-6">
        <p class="text-slate-400 text-sm mb-2">You're not in a Mission Group yet</p>
        <p class="text-slate-500 text-xs mb-4">Ask your leader for an invite code</p>
        
        <button onclick="Groups.showJoinWithCodeModal()" class="mission-button w-full py-4 rounded-xl font-black text-sm uppercase tracking-wide flex items-center justify-center gap-2 mb-3">
          🔑 Join with Code
        </button>
        
        ${createButtonHtml}
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
   * Show modal to join with invite code
   */
  showJoinWithCodeModal() {
    const modal = document.getElementById('groupModal');
    const content = document.getElementById('groupModalContent');
    
    if (!modal || !content) return;
    
    content.innerHTML = `
      <div class="p-4">
        <h3 class="text-lg font-bold text-amber-400 mb-4">Join with Invite Code</h3>
        
        <p class="text-slate-400 text-sm mb-4">
          Enter the invite code given by your Mission Group leader.
        </p>
        
        <div class="mb-4">
          <label class="block text-xs text-slate-400 mb-1">Invite Code</label>
          <input type="text" id="groupInviteCode" placeholder="Enter 6-character code" 
                 class="w-full bg-black/40 border border-amber-500/30 rounded-xl p-4 text-xl text-amber-400 placeholder-slate-500 uppercase tracking-widest text-center font-bold"
                 style="text-transform: uppercase;" maxlength="6"
                 oninput="this.value = this.value.toUpperCase()">
        </div>
        
        <div id="inviteCodePreview" class="hidden mb-4 p-3 bg-green-500/10 rounded-xl border border-green-500/30">
          <!-- Will show group info after validation -->
        </div>
        
        <div class="flex gap-3">
          <button onclick="Groups.closeModal()" class="flex-1 py-3 border border-white/10 rounded-xl text-slate-400 text-sm hover:bg-white/5">
            Cancel
          </button>
          <button onclick="Groups.submitJoinWithCode()" class="flex-1 py-3 bg-amber-500 text-[#2a0505] rounded-xl text-sm font-bold hover:bg-amber-400">
            Join Group
          </button>
        </div>
      </div>
    `;
    
    modal.classList.remove('hidden');
    
    // Focus on input
    setTimeout(() => {
      document.getElementById('groupInviteCode')?.focus();
    }, 100);
  },
  
  /**
   * Submit join with code
   */
  async submitJoinWithCode() {
    const code = document.getElementById('groupInviteCode')?.value?.trim()?.toUpperCase();
    
    if (!code || code.length < 4) {
      alert('Please enter a valid invite code');
      return;
    }
    
    const success = await this.joinWithInviteCode(code);
    
    if (success) {
      this.closeModal();
    }
  },
  
  /**
   * Show modal to generate group invite code (for leaders)
   */
  showGroupInviteCodeModal() {
    if (!this.isLeader && !this.isAdmin()) {
      alert('Only group leaders can generate invite codes');
      return;
    }
    
    const modal = document.getElementById('groupModal');
    const content = document.getElementById('groupModalContent');
    
    if (!modal || !content) return;
    
    content.innerHTML = `
      <div class="p-4">
        <h3 class="text-lg font-bold text-amber-400 mb-4">Generate Invite Code</h3>
        
        <p class="text-slate-400 text-sm mb-4">
          Create a code to invite seekers to join <strong class="text-amber-400">${this.currentGroup?.name || 'your group'}</strong>.
        </p>
        
        <div class="mb-4">
          <label class="block text-xs text-slate-400 mb-1">Code valid for</label>
          <select id="inviteExpiresDays" class="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-slate-200">
            <option value="1">1 day</option>
            <option value="3">3 days</option>
            <option value="7" selected>7 days</option>
            <option value="14">14 days</option>
            <option value="30">30 days</option>
          </select>
        </div>
        
        <div class="flex gap-3">
          <button onclick="Groups.closeModal()" class="flex-1 py-3 border border-white/10 rounded-xl text-slate-400 text-sm hover:bg-white/5">
            Cancel
          </button>
          <button onclick="Groups.submitGenerateInviteCode()" class="flex-1 py-3 bg-amber-500 text-[#2a0505] rounded-xl text-sm font-bold hover:bg-amber-400">
            Generate Code
          </button>
        </div>
      </div>
    `;
    
    modal.classList.remove('hidden');
  },
  
  /**
   * Submit generate invite code
   */
  async submitGenerateInviteCode() {
    const expiresDays = parseInt(document.getElementById('inviteExpiresDays')?.value) || 7;
    
    const code = await this.generateGroupInviteCode(expiresDays);
    
    if (code) {
      // Show the generated code
      const content = document.getElementById('groupModalContent');
      const appLink = `https://gomission.netlify.app/?join=${code}`;
      
      content.innerHTML = `
        <div class="p-4 text-center">
          <h3 class="text-lg font-bold text-green-400 mb-4">✅ Invite Code Ready!</h3>
          
          <div class="bg-black/40 border border-amber-500/30 rounded-xl p-4 mb-4">
            <p class="text-[10px] text-slate-500 uppercase mb-2">Invite Code</p>
            <p class="text-3xl font-black text-amber-400 tracking-widest">${code}</p>
          </div>
          
          <p class="text-slate-400 text-sm mb-4">
            Share this code with seekers to join <strong class="text-amber-400">${this.currentGroup?.name}</strong>
          </p>
          
          <div class="bg-black/30 rounded-xl p-3 mb-4">
            <p class="text-[10px] text-slate-500 uppercase mb-1">Or share this link</p>
            <p class="text-xs text-amber-400 break-all">${appLink}</p>
          </div>
          
          <button onclick="Groups.copyInvite('${code}', '${appLink}')" class="w-full py-3 bg-amber-500/20 text-amber-400 rounded-xl text-sm font-bold hover:bg-amber-500/30 mb-3">
            📋 Copy Code & Link
          </button>
          
          <button onclick="Groups.closeModal()" class="w-full py-3 border border-white/10 rounded-xl text-slate-400 text-sm hover:bg-white/5">
            Done
          </button>
        </div>
      `;
    }
  },
  
  /**
   * Copy invite code and link
   */
  copyInvite(code, link) {
    const text = `Join my Mission Group! 🙏\n\nCode: ${code}\nLink: ${link}`;
    navigator.clipboard.writeText(text).then(() => {
      alert('Copied to clipboard!');
    }).catch(() => {
      alert(`Code: ${code}\nLink: ${link}`);
    });
  },

  /**
   * Show modal to find and join groups (DEPRECATED - kept for backwards compatibility)
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
   * @param {boolean} requireCode - If true, show endorsement code field
   */
  async showCreateModal(requireCode = false) {
    const modal = document.getElementById('groupModal');
    const content = document.getElementById('groupModalContent');
    
    if (!modal || !content) return;
    
    // Check if user can create without code
    const canCreate = await this.canCreateGroup();
    const needsCode = requireCode || !canCreate.allowed;
    
    let endorsementCodeHtml = '';
    if (needsCode) {
      endorsementCodeHtml = `
        <div class="mb-4 p-3 bg-amber-500/10 rounded-xl border border-amber-500/30">
          <p class="text-amber-400 text-xs mb-2">⚠️ You need an endorsement code to create a group</p>
          <p class="text-slate-400 text-[10px]">Ask your Mission Group leader or admin for a code, or join a group first to become a disciple.</p>
        </div>
        <div class="mb-4">
          <label class="block text-xs text-slate-400 mb-1">Endorsement Code *</label>
          <input type="text" id="endorsementCode" placeholder="Enter code from your leader" 
                 class="w-full bg-black/40 border border-amber-500/30 rounded-xl p-3 text-sm text-amber-400 placeholder-slate-500 uppercase tracking-wider"
                 style="text-transform: uppercase;">
        </div>
      `;
    }
    
    content.innerHTML = `
      <div class="p-4">
        <h3 class="text-lg font-bold text-amber-400 mb-4">Create Mission Group</h3>
        
        ${endorsementCodeHtml}
        
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
    const endorsementCode = document.getElementById('endorsementCode')?.value?.trim()?.toUpperCase() || null;
    
    if (!name) {
      alert('Please enter a group name');
      return;
    }
    
    const groupId = await this.createGroup({
      name: name,
      meetingDay: day,
      meetingTime: time,
      meetingLink: link
    }, endorsementCode);
    
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
   * Generate an endorsement code (admin or group leaders only)
   */
  async generateEndorsementCode(forEmail = null, expiresInDays = 30) {
    if (!window.currentUser || !window.db) {
      alert('Please sign in first');
      return null;
    }
    
    // Only admin or group leaders can generate codes
    if (!this.isAdmin() && !this.isLeader) {
      alert('Only admins or group leaders can generate endorsement codes');
      return null;
    }
    
    try {
      // Generate random 8-character code
      const code = this.generateRandomCode(8);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);
      
      const codeData = {
        code: code,
        createdBy: window.currentUser.uid,
        createdByName: window.currentUser.displayName || window.currentUser.email,
        createdByEmail: window.currentUser.email,
        createdAt: new Date().toISOString(),
        expiresAt: expiresAt.toISOString(),
        forEmail: forEmail || null, // If set, only this email can use the code
        used: false,
        usedBy: null,
        usedAt: null,
        groupCreated: null
      };
      
      const codeRef = window.doc(window.db, 'goMission_endorsementCodes', code);
      await window.setDoc(codeRef, codeData);
      
      console.log('[Groups] Generated endorsement code:', code);
      return code;
      
    } catch (error) {
      console.error('[Groups] Error generating endorsement code:', error);
      alert('Error generating code. Please try again.');
      return null;
    }
  },
  
  /**
   * Generate random alphanumeric code
   */
  generateRandomCode(length) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluded confusing chars: I, O, 0, 1
    let code = '';
    for (let i = 0; i < length; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  },
  
  /**
   * Show endorsement code generator modal (for admin/leaders)
   */
  showEndorsementCodeModal() {
    if (!this.isAdmin() && !this.isLeader) {
      alert('Only admins or group leaders can generate endorsement codes');
      return;
    }
    
    const modal = document.getElementById('groupModal');
    const content = document.getElementById('groupModalContent');
    
    if (!modal || !content) return;
    
    content.innerHTML = `
      <div class="p-4">
        <h3 class="text-lg font-bold text-amber-400 mb-4">Generate Endorsement Code</h3>
        
        <p class="text-slate-400 text-sm mb-4">
          Create a code to endorse someone to start their own Mission Group.
        </p>
        
        <div class="space-y-4">
          <div>
            <label class="block text-xs text-slate-400 mb-1">For Email (optional)</label>
            <input type="email" id="codeForEmail" placeholder="Leave blank for anyone to use" 
                   class="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-slate-200 placeholder-slate-500">
            <p class="text-[10px] text-slate-500 mt-1">If set, only this email can use the code</p>
          </div>
          
          <div>
            <label class="block text-xs text-slate-400 mb-1">Expires In (days)</label>
            <input type="number" id="codeExpiresDays" value="30" min="1" max="365"
                   class="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-slate-200">
          </div>
        </div>
        
        <div class="flex gap-3 mt-6">
          <button onclick="Groups.closeModal()" class="flex-1 py-3 border border-white/10 rounded-xl text-slate-400 text-sm hover:bg-white/5">
            Cancel
          </button>
          <button onclick="Groups.submitGenerateCode()" class="flex-1 py-3 bg-amber-500 text-[#2a0505] rounded-xl text-sm font-bold hover:bg-amber-400">
            Generate Code
          </button>
        </div>
      </div>
    `;
    
    modal.classList.remove('hidden');
  },
  
  /**
   * Submit generate code form
   */
  async submitGenerateCode() {
    const forEmail = document.getElementById('codeForEmail')?.value?.trim() || null;
    const expiresDays = parseInt(document.getElementById('codeExpiresDays')?.value) || 30;
    
    const code = await this.generateEndorsementCode(forEmail, expiresDays);
    
    if (code) {
      // Show the generated code
      const content = document.getElementById('groupModalContent');
      content.innerHTML = `
        <div class="p-4 text-center">
          <h3 class="text-lg font-bold text-green-400 mb-4">✅ Code Generated!</h3>
          
          <div class="bg-black/40 border border-amber-500/30 rounded-xl p-4 mb-4">
            <p class="text-[10px] text-slate-500 uppercase mb-2">Endorsement Code</p>
            <p class="text-2xl font-black text-amber-400 tracking-widest">${code}</p>
          </div>
          
          <p class="text-slate-400 text-sm mb-4">
            Share this code with the person you want to endorse to create their own Mission Group.
          </p>
          
          <button onclick="Groups.copyCode('${code}')" class="w-full py-3 bg-amber-500/20 text-amber-400 rounded-xl text-sm font-bold hover:bg-amber-500/30 mb-3">
            📋 Copy Code
          </button>
          
          <button onclick="Groups.closeModal()" class="w-full py-3 border border-white/10 rounded-xl text-slate-400 text-sm hover:bg-white/5">
            Done
          </button>
        </div>
      `;
    }
  },
  
  /**
   * Copy code to clipboard
   */
  copyCode(code) {
    navigator.clipboard.writeText(code).then(() => {
      alert('Code copied to clipboard!');
    }).catch(() => {
      alert('Copy this code: ' + code);
    });
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
