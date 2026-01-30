/**
 * Go Mission - Leader Dashboard Module
 * Comprehensive shepherding tools for Mission Leaders
 * 
 * Features:
 * - Member overview with spiritual health indicators
 * - Weekly accountability rotation
 * - Attendance tracking
 * - Prayer list management
 * - Needs attention alerts
 * - Quick actions (message, encourage, pray)
 * 
 * @version 1.0.0
 * @author Go Mission Team
 */

const LeaderDashboard = {
  // State
  isOpen: false,
  myGroups: [],           // Groups where user is leader
  selectedGroup: null,    // Currently viewing group
  members: [],            // Members of selected group
  memberStats: {},        // Cached member statistics
  prayerList: [],         // Prayer requests
  
  // User roles
  ROLES: {
    SUPER_ADMIN: 'super_admin',
    LEADER: 'leader',
    ASSISTANT: 'assistant',
    MEMBER: 'member'
  },
  
  // Alert thresholds
  THRESHOLDS: {
    INACTIVE_DAYS: 5,           // Days without app activity
    MISSED_MEETINGS: 2,         // Consecutive missed meetings
    NO_DEVOTION_DAYS: 7,        // Days without devotion
    NEW_MEMBER_DAYS: 14         // Days to consider someone "new"
  },

  /**
   * Initialize the dashboard
   */
  async init() {
    console.log('[LeaderDashboard] Initializing...');
    
    if (!window.currentUser) {
      console.log('[LeaderDashboard] No user logged in');
      return;
    }
    
    // Check if user is a leader
    const userRole = await this.getUserRole();
    if (!['super_admin', 'leader', 'assistant'].includes(userRole)) {
      console.log('[LeaderDashboard] User is not a leader');
      return;
    }
    
    // Load groups where user is leader
    await this.loadMyGroups();
    
    // Show dashboard card if user has groups
    if (this.myGroups.length > 0) {
      this.showDashboardCard();
    }
    
    console.log('[LeaderDashboard] Ready');
  },

  /**
   * Get user's role
   */
  async getUserRole() {
    if (!window.currentUser || !window.db) return 'member';
    
    try {
      const userRef = window.doc(window.db, 'goMission_members', window.currentUser.uid);
      const userDoc = await window.getDoc(userRef);
      
      if (userDoc.exists()) {
        const data = userDoc.data();
        
        // Check for super admin
        if (data.email === 'michael.marga@gmail.com' || data.isSuperAdmin) {
          return 'super_admin';
        }
        
        // Check roles array
        if (data.roles?.includes('leader') || data.roles?.includes('shepherd')) {
          return 'leader';
        }
        
        if (data.roles?.includes('assistant')) {
          return 'assistant';
        }
      }
      
      // Check if user leads any groups
      const leaderQuery = window.query(
        window.collection(window.db, 'goMission_groups'),
        window.where('leaderId', '==', window.currentUser.uid)
      );
      const leaderSnapshot = await window.getDocs(leaderQuery);
      
      if (!leaderSnapshot.empty) {
        return 'leader';
      }
      
      return 'member';
    } catch (error) {
      console.error('[LeaderDashboard] Error getting user role:', error);
      return 'member';
    }
  },

  /**
   * Load groups where current user is leader or assistant
   */
  async loadMyGroups() {
    if (!window.currentUser || !window.db) return;
    
    try {
      // Groups where user is leader
      const leaderQuery = window.query(
        window.collection(window.db, 'goMission_groups'),
        window.where('leaderId', '==', window.currentUser.uid)
      );
      const leaderSnapshot = await window.getDocs(leaderQuery);
      
      this.myGroups = leaderSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        role: 'leader'
      }));
      
      // Groups where user is assistant
      const assistantQuery = window.query(
        window.collection(window.db, 'goMission_groups'),
        window.where('assistantIds', 'array-contains', window.currentUser.uid)
      );
      const assistantSnapshot = await window.getDocs(assistantQuery);
      
      assistantSnapshot.docs.forEach(doc => {
        if (!this.myGroups.find(g => g.id === doc.id)) {
          this.myGroups.push({
            id: doc.id,
            ...doc.data(),
            role: 'assistant'
          });
        }
      });
      
      console.log(`[LeaderDashboard] Loaded ${this.myGroups.length} groups`);
      
      // Select first group by default
      if (this.myGroups.length > 0 && !this.selectedGroup) {
        await this.selectGroup(this.myGroups[0].id);
      }
      
    } catch (error) {
      console.error('[LeaderDashboard] Error loading groups:', error);
    }
  },

  /**
   * Select a group to view
   */
  async selectGroup(groupId) {
    const group = this.myGroups.find(g => g.id === groupId);
    if (!group) return;
    
    this.selectedGroup = group;
    await this.loadGroupMembers();
    await this.loadPrayerList();
    
    if (this.isOpen) {
      this.render();
    }
  },

  /**
   * Load members of the selected group with their stats
   */
  async loadGroupMembers() {
    if (!this.selectedGroup || !window.db) return;
    
    const memberIds = this.selectedGroup.members || [];
    this.members = [];
    
    for (const memberId of memberIds) {
      try {
        const memberDoc = await window.getDoc(
          window.doc(window.db, 'goMission_members', memberId)
        );
        
        if (memberDoc.exists()) {
          const data = memberDoc.data();
          const stats = await this.getMemberStats(memberId, data);
          
          this.members.push({
            id: memberId,
            ...data,
            stats
          });
        }
      } catch (error) {
        console.error(`[LeaderDashboard] Error loading member ${memberId}:`, error);
      }
    }
    
    // Sort: needs attention first, then by name
    this.members.sort((a, b) => {
      const aNeeds = this.needsAttention(a).length;
      const bNeeds = this.needsAttention(b).length;
      if (aNeeds !== bNeeds) return bNeeds - aNeeds;
      return (a.fullName || '').localeCompare(b.fullName || '');
    });
    
    console.log(`[LeaderDashboard] Loaded ${this.members.length} members`);
  },

  /**
   * Get statistics for a member
   */
  async getMemberStats(memberId, memberData) {
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    
    // Calculate days since last active
    const lastActive = memberData.lastActive?.toDate?.() || memberData.lastActive;
    const daysSinceActive = lastActive 
      ? Math.floor((now - new Date(lastActive).getTime()) / dayMs)
      : 999;
    
    // Devotion streak
    const devotionStreak = memberData.bibleProgress?.currentStreak || 0;
    const lastDevotion = memberData.bibleProgress?.lastReadAt;
    const daysSinceDevotion = lastDevotion
      ? Math.floor((now - lastDevotion) / dayMs)
      : 999;
    
    // Meeting attendance (last 4 meetings)
    const attendance = memberData.meetingAttendance || [];
    const recentAttendance = attendance.slice(-4);
    const missedMeetings = recentAttendance.filter(a => a.status === 'absent').length;
    
    // Days since joined
    const joinedAt = memberData.joinedAt?.toDate?.() || memberData.joinedAt || memberData.createdAt;
    const daysSinceJoined = joinedAt
      ? Math.floor((now - new Date(joinedAt).getTime()) / dayMs)
      : 0;
    
    // Last check-in from leader
    const lastCheckIn = memberData.leaderCheckIns?.slice(-1)[0];
    const daysSinceCheckIn = lastCheckIn?.date
      ? Math.floor((now - new Date(lastCheckIn.date).getTime()) / dayMs)
      : 999;
    
    return {
      daysSinceActive,
      devotionStreak,
      daysSinceDevotion,
      missedMeetings,
      daysSinceJoined,
      daysSinceCheckIn,
      isNew: daysSinceJoined <= this.THRESHOLDS.NEW_MEMBER_DAYS,
      gospelShared: memberData.gospelSharedCount || 0,
      journeyPhase: memberData.currentPhase || 'unknown'
    };
  },

  /**
   * Check if member needs attention and why
   */
  needsAttention(member) {
    const alerts = [];
    const stats = member.stats || {};
    
    if (stats.daysSinceActive >= this.THRESHOLDS.INACTIVE_DAYS) {
      alerts.push({
        type: 'inactive',
        message: `Inactive for ${stats.daysSinceActive} days`,
        priority: 'high',
        icon: '😴'
      });
    }
    
    if (stats.daysSinceDevotion >= this.THRESHOLDS.NO_DEVOTION_DAYS) {
      alerts.push({
        type: 'no_devotion',
        message: `No devotion for ${stats.daysSinceDevotion} days`,
        priority: 'medium',
        icon: '📖'
      });
    }
    
    if (stats.missedMeetings >= this.THRESHOLDS.MISSED_MEETINGS) {
      alerts.push({
        type: 'missed_meetings',
        message: `Missed ${stats.missedMeetings} meetings`,
        priority: 'high',
        icon: '📅'
      });
    }
    
    if (stats.isNew) {
      alerts.push({
        type: 'new_member',
        message: 'New member - needs follow-up',
        priority: 'medium',
        icon: '🆕'
      });
    }
    
    return alerts;
  },

  /**
   * Load prayer list for the group
   */
  async loadPrayerList() {
    if (!this.selectedGroup || !window.db) return;
    
    try {
      const prayerQuery = window.query(
        window.collection(window.db, 'goMission_groups', this.selectedGroup.id, 'prayerRequests'),
        window.orderBy('createdAt', 'desc'),
        window.limit(20)
      );
      
      const snapshot = await window.getDocs(prayerQuery);
      this.prayerList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      // Collection might not exist yet
      this.prayerList = [];
    }
  },

  /**
   * Get this week's accountability partner
   */
  getThisWeeksAccountability() {
    if (!this.selectedGroup || !this.members.length) return null;
    
    const schedule = this.selectedGroup.accountabilitySchedule || {};
    const currentMemberId = schedule.currentMember;
    
    if (currentMemberId) {
      return this.members.find(m => m.id === currentMemberId);
    }
    
    // Default to first member if no schedule
    return this.members[0];
  },

  /**
   * Rotate accountability to next member
   */
  async rotateAccountability() {
    if (!this.selectedGroup || !this.members.length || !window.db) return;
    
    const rotation = this.selectedGroup.accountabilitySchedule?.rotation || 
                     this.members.map(m => m.id);
    const currentIndex = rotation.indexOf(
      this.selectedGroup.accountabilitySchedule?.currentMember
    );
    const nextIndex = (currentIndex + 1) % rotation.length;
    const nextMemberId = rotation[nextIndex];
    
    try {
      await window.setDoc(
        window.doc(window.db, 'goMission_groups', this.selectedGroup.id),
        {
          accountabilitySchedule: {
            currentMember: nextMemberId,
            rotation: rotation,
            lastRotated: new Date().toISOString(),
            week: this.getCurrentWeekNumber()
          }
        },
        { merge: true }
      );
      
      this.selectedGroup.accountabilitySchedule = {
        currentMember: nextMemberId,
        rotation: rotation,
        lastRotated: new Date().toISOString()
      };
      
      this.render();
      this.showToast('Accountability rotated to next member');
    } catch (error) {
      console.error('[LeaderDashboard] Error rotating accountability:', error);
    }
  },

  /**
   * Get current week number of the year
   */
  getCurrentWeekNumber() {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const diff = now - start;
    const oneWeek = 604800000;
    return Math.ceil(diff / oneWeek);
  },

  /**
   * Record a check-in with a member
   */
  async recordCheckIn(memberId, notes = '') {
    if (!window.db) return;
    
    try {
      const memberRef = window.doc(window.db, 'goMission_members', memberId);
      
      await window.setDoc(memberRef, {
        leaderCheckIns: window.arrayUnion({
          date: new Date().toISOString(),
          leaderId: window.currentUser.uid,
          notes: notes
        })
      }, { merge: true });
      
      // Update local state
      const member = this.members.find(m => m.id === memberId);
      if (member) {
        member.stats.daysSinceCheckIn = 0;
      }
      
      this.showToast('Check-in recorded');
      this.render();
    } catch (error) {
      console.error('[LeaderDashboard] Error recording check-in:', error);
    }
  },

  /**
   * Add a prayer request
   */
  async addPrayerRequest(memberId, request) {
    if (!this.selectedGroup || !window.db) return;
    
    try {
      const member = this.members.find(m => m.id === memberId);
      
      await window.addDoc(
        window.collection(window.db, 'goMission_groups', this.selectedGroup.id, 'prayerRequests'),
        {
          memberId: memberId,
          memberName: member?.fullName || 'Unknown',
          request: request,
          createdAt: new Date().toISOString(),
          createdBy: window.currentUser.uid,
          answered: false
        }
      );
      
      await this.loadPrayerList();
      this.render();
      this.showToast('Prayer request added');
    } catch (error) {
      console.error('[LeaderDashboard] Error adding prayer request:', error);
    }
  },

  /**
   * Mark prayer request as answered
   */
  async markPrayerAnswered(requestId) {
    if (!this.selectedGroup || !window.db) return;
    
    try {
      await window.setDoc(
        window.doc(window.db, 'goMission_groups', this.selectedGroup.id, 'prayerRequests', requestId),
        { answered: true, answeredAt: new Date().toISOString() },
        { merge: true }
      );
      
      const request = this.prayerList.find(p => p.id === requestId);
      if (request) request.answered = true;
      
      this.render();
      this.showToast('Praise God! Prayer marked as answered');
    } catch (error) {
      console.error('[LeaderDashboard] Error marking prayer answered:', error);
    }
  },

  /**
   * Send encouragement message to a member
   */
  async sendEncouragement(memberId) {
    const member = this.members.find(m => m.id === memberId);
    if (!member) return;
    
    // Open chat with pre-filled encouragement
    if (typeof Groups !== 'undefined' && Groups.openChat) {
      Groups.openChat(this.selectedGroup.id, memberId);
    } else {
      // Fallback: show modal to compose message
      this.showEncouragementModal(member);
    }
  },

  /**
   * Show encouragement modal
   */
  showEncouragementModal(member) {
    const encouragements = [
      `Hi ${member.fullName?.split(' ')[0] || 'kapatid'}! Just checking in on you. How are you doing? 🙏`,
      `Hey ${member.fullName?.split(' ')[0] || 'kapatid'}! I've been praying for you. Is there anything I can help you with?`,
      `Hello! I noticed we haven't connected in a while. Just want you to know I'm here for you. God bless! 💛`,
      `Kumusta ka? I'm thinking of you and praying for you today. Let's catch up soon! 🤗`
    ];
    
    const randomEncouragement = encouragements[Math.floor(Math.random() * encouragements.length)];
    
    // For now, just copy to clipboard
    navigator.clipboard?.writeText(randomEncouragement);
    this.showToast('Encouragement copied! Paste it in your chat.');
  },

  /**
   * Show the dashboard card on main screen
   */
  showDashboardCard() {
    const card = document.getElementById('leaderDashboardCard');
    if (card) {
      card.classList.remove('hidden');
      this.updateDashboardCardStats();
    }
  },
  
  /**
   * Update the mini stats on the dashboard card
   */
  updateDashboardCardStats() {
    const memberCountEl = document.getElementById('dashboardMemberCount');
    const activeCountEl = document.getElementById('dashboardActiveCount');
    const needsAttentionEl = document.getElementById('dashboardNeedsAttention');
    
    const stats = this.calculateGroupStats();
    const needsAttention = this.members.filter(m => this.needsAttention(m).length > 0).length;
    
    if (memberCountEl) memberCountEl.textContent = this.members.length || '0';
    if (activeCountEl) activeCountEl.textContent = stats.activeCount || '0';
    if (needsAttentionEl) needsAttentionEl.textContent = needsAttention || '0';
  },

  /**
   * Open full dashboard modal
   */
  open() {
    this.isOpen = true;
    this.render();
    
    const modal = document.getElementById('leaderDashboardModal');
    if (modal) {
      modal.classList.remove('hidden');
      document.body.style.overflow = 'hidden';
    }
  },

  /**
   * Close dashboard modal
   */
  close() {
    this.isOpen = false;
    
    const modal = document.getElementById('leaderDashboardModal');
    if (modal) {
      modal.classList.add('hidden');
      document.body.style.overflow = '';
    }
  },

  /**
   * Render the dashboard
   */
  render() {
    let modal = document.getElementById('leaderDashboardModal');
    
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'leaderDashboardModal';
      modal.className = 'fixed inset-0 z-[70] hidden';
      document.body.appendChild(modal);
    }
    
    const needsAttentionMembers = this.members.filter(m => this.needsAttention(m).length > 0);
    const thisWeekAccountability = this.getThisWeeksAccountability();
    const groupStats = this.calculateGroupStats();
    
    modal.innerHTML = `
      <div class="absolute inset-0 bg-[var(--bg-color)]">
        <!-- Header -->
        <div class="flex items-center justify-between p-4 border-b border-[var(--card-border)] bg-[var(--nav-bg)]">
          <button onclick="LeaderDashboard.close()" class="flex items-center gap-2 text-amber-500">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
            </svg>
            <span class="text-sm">Back</span>
          </button>
          <h1 class="text-lg font-bold text-[var(--text-color)]">📊 Leader Dashboard</h1>
          <div class="w-16"></div>
        </div>
        
        <!-- Content -->
        <div class="h-[calc(100vh-60px)] overflow-y-auto p-4 space-y-4">
          
          <!-- Group Selector (if multiple groups) -->
          ${this.myGroups.length > 1 ? `
          <div class="flex gap-2 overflow-x-auto pb-2">
            ${this.myGroups.map(g => `
              <button onclick="LeaderDashboard.selectGroup('${g.id}')"
                      class="px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all
                             ${this.selectedGroup?.id === g.id 
                               ? 'bg-amber-500 text-white' 
                               : 'bg-[var(--card-bg)] text-[var(--text-muted)] border border-[var(--card-border)]'}">
                ${g.name || 'My Group'}
              </button>
            `).join('')}
          </div>
          ` : ''}
          
          <!-- This Week's Focus -->
          <div class="bg-[var(--card-bg)] rounded-2xl border border-[var(--card-border)] overflow-hidden">
            <div class="p-4 border-b border-[var(--card-border)]">
              <h2 class="font-bold text-amber-500 flex items-center gap-2">
                <span>📅</span> This Week's Focus
              </h2>
            </div>
            <div class="p-4 space-y-4">
              ${thisWeekAccountability ? `
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <img src="${thisWeekAccountability.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(thisWeekAccountability.fullName || 'U')}&background=4a0404&color=fbbf24`}" 
                       class="w-12 h-12 rounded-full border-2 border-amber-500">
                  <div>
                    <p class="font-bold text-[var(--text-color)]">${thisWeekAccountability.fullName || 'Unknown'}</p>
                    <p class="text-xs text-[var(--text-muted)]">🎯 Accountability Partner</p>
                    <p class="text-xs text-amber-500 mt-1">
                      ${thisWeekAccountability.stats?.devotionStreak || 0}-day devotion streak
                    </p>
                  </div>
                </div>
                <div class="flex gap-2">
                  <button onclick="LeaderDashboard.sendEncouragement('${thisWeekAccountability.id}')"
                          class="p-2 rounded-full bg-amber-500/20 text-amber-500">
                    💬
                  </button>
                  <button onclick="LeaderDashboard.recordCheckIn('${thisWeekAccountability.id}')"
                          class="p-2 rounded-full bg-green-500/20 text-green-500">
                    ✓
                  </button>
                </div>
              </div>
              <button onclick="LeaderDashboard.rotateAccountability()"
                      class="w-full py-2 text-xs text-amber-500/70 hover:text-amber-500">
                ↻ Rotate to next member
              </button>
              ` : `
              <p class="text-center text-[var(--text-muted)] py-4">No members yet</p>
              `}
            </div>
          </div>
          
          <!-- Needs Attention -->
          ${needsAttentionMembers.length > 0 ? `
          <div class="bg-[var(--card-bg)] rounded-2xl border border-red-500/30 overflow-hidden">
            <div class="p-4 border-b border-red-500/20 bg-red-500/10">
              <h2 class="font-bold text-red-400 flex items-center gap-2">
                <span>🚨</span> Needs Attention (${needsAttentionMembers.length})
              </h2>
            </div>
            <div class="divide-y divide-[var(--card-border)]">
              ${needsAttentionMembers.slice(0, 5).map(member => {
                const alerts = this.needsAttention(member);
                return `
                <div class="p-4">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-3">
                      <img src="${member.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.fullName || 'U')}&background=4a0404&color=fbbf24`}" 
                           class="w-10 h-10 rounded-full">
                      <div>
                        <p class="font-medium text-[var(--text-color)]">${member.fullName || 'Unknown'}</p>
                        <div class="flex flex-wrap gap-1 mt-1">
                          ${alerts.map(a => `
                            <span class="text-[10px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">
                              ${a.icon} ${a.message}
                            </span>
                          `).join('')}
                        </div>
                      </div>
                    </div>
                    <div class="flex gap-1">
                      <button onclick="LeaderDashboard.sendEncouragement('${member.id}')"
                              class="p-2 rounded-full bg-amber-500/20 text-amber-500 text-sm">
                        💬
                      </button>
                    </div>
                  </div>
                </div>
              `}).join('')}
            </div>
          </div>
          ` : ''}
          
          <!-- Group Stats -->
          <div class="bg-[var(--card-bg)] rounded-2xl border border-[var(--card-border)] overflow-hidden">
            <div class="p-4 border-b border-[var(--card-border)]">
              <h2 class="font-bold text-amber-500 flex items-center gap-2">
                <span>📈</span> Group Health
              </h2>
            </div>
            <div class="p-4 grid grid-cols-2 gap-4">
              <div class="text-center">
                <p class="text-3xl font-bold text-[var(--text-color)]">${this.members.length}</p>
                <p class="text-xs text-[var(--text-muted)]">Members</p>
              </div>
              <div class="text-center">
                <p class="text-3xl font-bold text-green-500">${groupStats.activeCount}</p>
                <p class="text-xs text-[var(--text-muted)]">Active (7d)</p>
              </div>
              <div class="text-center">
                <p class="text-3xl font-bold text-amber-500">${groupStats.devotionActiveCount}</p>
                <p class="text-xs text-[var(--text-muted)]">Reading Bible</p>
              </div>
              <div class="text-center">
                <p class="text-3xl font-bold text-blue-500">${groupStats.newCount}</p>
                <p class="text-xs text-[var(--text-muted)]">New Members</p>
              </div>
            </div>
          </div>
          
          <!-- All Members -->
          <div class="bg-[var(--card-bg)] rounded-2xl border border-[var(--card-border)] overflow-hidden">
            <div class="p-4 border-b border-[var(--card-border)] flex items-center justify-between">
              <h2 class="font-bold text-amber-500 flex items-center gap-2">
                <span>👥</span> All Members
              </h2>
              <span class="text-xs text-[var(--text-muted)]">${this.members.length} total</span>
            </div>
            <div class="divide-y divide-[var(--card-border)] max-h-80 overflow-y-auto">
              ${this.members.map(member => `
                <div class="p-3 flex items-center justify-between hover:bg-[var(--input-bg)]">
                  <div class="flex items-center gap-3">
                    <img src="${member.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.fullName || 'U')}&background=4a0404&color=fbbf24`}" 
                         class="w-8 h-8 rounded-full">
                    <div>
                      <p class="text-sm font-medium text-[var(--text-color)]">${member.fullName || 'Unknown'}</p>
                      <p class="text-[10px] text-[var(--text-muted)]">
                        ${member.stats?.devotionStreak > 0 
                          ? `🔥 ${member.stats.devotionStreak}-day streak` 
                          : '📖 No recent devotion'}
                      </p>
                    </div>
                  </div>
                  <div class="flex items-center gap-2">
                    ${member.stats?.isNew ? '<span class="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400">NEW</span>' : ''}
                    ${this.needsAttention(member).length > 0 ? '<span class="w-2 h-2 rounded-full bg-red-500"></span>' : ''}
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
          
          <!-- Prayer List -->
          <div class="bg-[var(--card-bg)] rounded-2xl border border-[var(--card-border)] overflow-hidden">
            <div class="p-4 border-b border-[var(--card-border)] flex items-center justify-between">
              <h2 class="font-bold text-amber-500 flex items-center gap-2">
                <span>🙏</span> Prayer List
              </h2>
              <button onclick="LeaderDashboard.showAddPrayerModal()"
                      class="text-xs px-3 py-1 bg-amber-500/20 text-amber-500 rounded-full">
                + Add
              </button>
            </div>
            <div class="divide-y divide-[var(--card-border)] max-h-60 overflow-y-auto">
              ${this.prayerList.length > 0 ? this.prayerList.map(prayer => `
                <div class="p-3 ${prayer.answered ? 'bg-green-500/10' : ''}">
                  <div class="flex items-start justify-between">
                    <div>
                      <p class="text-xs text-amber-500 font-medium">${prayer.memberName}</p>
                      <p class="text-sm text-[var(--text-color)] mt-1 ${prayer.answered ? 'line-through opacity-60' : ''}">${prayer.request}</p>
                    </div>
                    ${!prayer.answered ? `
                    <button onclick="LeaderDashboard.markPrayerAnswered('${prayer.id}')"
                            class="text-xs px-2 py-1 bg-green-500/20 text-green-500 rounded">
                      ✓ Answered
                    </button>
                    ` : `
                    <span class="text-xs text-green-500">✓ Answered</span>
                    `}
                  </div>
                </div>
              `).join('') : `
                <div class="p-6 text-center text-[var(--text-muted)]">
                  <p>No prayer requests yet</p>
                  <p class="text-xs mt-1">Add prayer needs for your members</p>
                </div>
              `}
            </div>
          </div>
          
          <!-- Quick Actions -->
          <div class="grid grid-cols-2 gap-3">
            <button onclick="LeaderDashboard.openGroupChat()"
                    class="p-4 bg-[var(--card-bg)] rounded-xl border border-[var(--card-border)] text-center">
              <span class="text-2xl">💬</span>
              <p class="text-sm text-[var(--text-color)] mt-1">Group Chat</p>
            </button>
            <button onclick="LeaderDashboard.startMeeting()"
                    class="p-4 bg-[var(--card-bg)] rounded-xl border border-[var(--card-border)] text-center">
              <span class="text-2xl">📹</span>
              <p class="text-sm text-[var(--text-color)] mt-1">Start Meeting</p>
            </button>
            <button onclick="LeaderDashboard.sendGroupAnnouncement()"
                    class="p-4 bg-[var(--card-bg)] rounded-xl border border-[var(--card-border)] text-center">
              <span class="text-2xl">📢</span>
              <p class="text-sm text-[var(--text-color)] mt-1">Announcement</p>
            </button>
            <button onclick="LeaderDashboard.viewReports()"
                    class="p-4 bg-[var(--card-bg)] rounded-xl border border-[var(--card-border)] text-center">
              <span class="text-2xl">📊</span>
              <p class="text-sm text-[var(--text-color)] mt-1">Reports</p>
            </button>
          </div>
          
        </div>
      </div>
    `;
  },

  /**
   * Calculate group statistics
   */
  calculateGroupStats() {
    const activeCount = this.members.filter(m => 
      (m.stats?.daysSinceActive || 999) <= 7
    ).length;
    
    const devotionActiveCount = this.members.filter(m => 
      (m.stats?.daysSinceDevotion || 999) <= 7
    ).length;
    
    const newCount = this.members.filter(m => m.stats?.isNew).length;
    
    return { activeCount, devotionActiveCount, newCount };
  },

  /**
   * Open group chat
   */
  openGroupChat() {
    if (this.selectedGroup && typeof Groups !== 'undefined') {
      this.close();
      Groups.openChat(this.selectedGroup.id);
    }
  },

  /**
   * Start Jitsi meeting
   */
  startMeeting() {
    if (this.selectedGroup && typeof GroupMeeting !== 'undefined') {
      this.close();
      GroupMeeting.start(this.selectedGroup.id);
    } else {
      this.showToast('Meeting feature coming soon');
    }
  },

  /**
   * Send group announcement
   */
  sendGroupAnnouncement() {
    // TODO: Implement announcement modal
    this.showToast('Announcement feature coming soon');
  },

  /**
   * View reports
   */
  viewReports() {
    // TODO: Implement reports view
    this.showToast('Reports feature coming soon');
  },

  /**
   * Show add prayer modal
   */
  showAddPrayerModal() {
    const memberOptions = this.members.map(m => 
      `<option value="${m.id}">${m.fullName || 'Unknown'}</option>`
    ).join('');
    
    const modalHtml = `
      <div id="addPrayerModal" class="fixed inset-0 z-[80] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/60" onclick="document.getElementById('addPrayerModal').remove()"></div>
        <div class="relative bg-[var(--card-bg)] rounded-2xl p-6 w-full max-w-md border border-[var(--card-border)]">
          <h3 class="text-lg font-bold text-amber-500 mb-4">🙏 Add Prayer Request</h3>
          <select id="prayerMemberId" class="w-full p-3 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-xl text-[var(--text-color)] mb-3">
            <option value="">Select member...</option>
            ${memberOptions}
          </select>
          <textarea id="prayerRequest" rows="3" placeholder="Prayer request..."
                    class="w-full p-3 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-xl text-[var(--text-color)] mb-4"></textarea>
          <div class="flex gap-3">
            <button onclick="document.getElementById('addPrayerModal').remove()"
                    class="flex-1 py-3 border border-[var(--card-border)] rounded-xl text-[var(--text-muted)]">
              Cancel
            </button>
            <button onclick="LeaderDashboard.submitPrayerRequest()"
                    class="flex-1 py-3 bg-amber-500 text-white rounded-xl font-bold">
              Add Prayer
            </button>
          </div>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
  },

  /**
   * Submit prayer request from modal
   */
  async submitPrayerRequest() {
    const memberId = document.getElementById('prayerMemberId')?.value;
    const request = document.getElementById('prayerRequest')?.value?.trim();
    
    if (!memberId || !request) {
      this.showToast('Please select a member and enter a prayer request');
      return;
    }
    
    await this.addPrayerRequest(memberId, request);
    document.getElementById('addPrayerModal')?.remove();
  },

  /**
   * Show toast notification
   */
  showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-20 left-1/2 -translate-x-1/2 px-6 py-3 bg-amber-500 text-white rounded-full text-sm font-medium z-[100] animate-fade-up';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => toast.remove(), 3000);
  }
};

// Initialize when DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    // Wait for auth to be ready
    setTimeout(() => LeaderDashboard.init(), 2000);
  });
} else {
  setTimeout(() => LeaderDashboard.init(), 2000);
}

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = LeaderDashboard;
}
