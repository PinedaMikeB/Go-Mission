/**
 * Go Mission - My Groups Module
 * Manages Upline (being discipled) and Downline (discipling others) groups
 */

const MyGroups = {
    // State
    uplineGroup: null,
    downlineGroups: [],
    guestGroups: [],  // Groups where user is a guest
    isOpen: false,
    isDashboardOpen: false,
    openedFromDashboard: false,
    pendingRequestsCount: 0,
    
    /**
     * Initialize module
     */
    async init() {
        console.log('[MyGroups] Initializing...');
        await this.loadGroups();
        this.updateMissionCard();
        this.updateBadges();
        this.subscribeToJoinRequests();
    },
    
    /**
     * Load user's groups from Firestore
     */
    async loadGroups() {
        if (!window.currentUser) return;
        
        try {
            const userDoc = await window.getDoc(
                window.doc(window.db, 'goMission_members', window.currentUser.uid)
            );
            
            if (!userDoc.exists()) return;
            
            const userData = userDoc.data();
            
            // Load upline group
            if (userData.uplineGroupId) {
                const uplineDoc = await window.getDoc(
                    window.doc(window.db, 'goMission_groups', userData.uplineGroupId)
                );
                if (uplineDoc.exists()) {
                    const groupData = uplineDoc.data();
                    // Verify user is still a member of this group
                    const isMember = groupData.members?.includes(window.currentUser.uid);
                    const isGuest = groupData.guests?.some(g => g.odId === window.currentUser.uid);
                    
                    if (isMember || isGuest) {
                        this.uplineGroup = { id: uplineDoc.id, ...groupData };
                        // Also set Groups.currentGroup for chat
                        if (typeof Groups !== 'undefined') {
                            Groups.currentGroup = this.uplineGroup;
                        }
                    } else {
                        // User was removed - clear their uplineGroupId
                        console.log('[MyGroups] User was removed from upline group, clearing reference');
                        this.uplineGroup = null;
                        await window.setDoc(
                            window.doc(window.db, 'goMission_members', window.currentUser.uid),
                            { uplineGroupId: null },
                            { merge: true }
                        );
                    }
                } else {
                    // Group doesn't exist anymore
                    this.uplineGroup = null;
                    await window.setDoc(
                        window.doc(window.db, 'goMission_members', window.currentUser.uid),
                        { uplineGroupId: null },
                        { merge: true }
                    );
                }
            }
            
            // Load downline groups (where user is leader)
            const downlineQuery = window.query(
                window.collection(window.db, 'goMission_groups'),
                window.where('leaderId', '==', window.currentUser.uid)
            );
            const downlineSnapshot = await window.getDocs(downlineQuery);
            this.downlineGroups = downlineSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            // Load guest groups (where user is in guests array)
            this.guestGroups = [];
            if (userData.guestGroups?.length > 0) {
                for (const groupId of userData.guestGroups) {
                    try {
                        const guestGroupDoc = await window.getDoc(
                            window.doc(window.db, 'goMission_groups', groupId)
                        );
                        if (guestGroupDoc.exists()) {
                            const groupData = guestGroupDoc.data();
                            // Verify user is still a guest
                            if (groupData.guests?.some(g => g.odId === window.currentUser.uid)) {
                                this.guestGroups.push({ id: guestGroupDoc.id, ...groupData });
                            }
                        }
                    } catch (e) {
                        console.log('[MyGroups] Error loading guest group:', groupId, e);
                    }
                }
            }
            
            console.log('[MyGroups] Loaded:', {
                upline: this.uplineGroup?.name || 'None',
                downline: this.downlineGroups.length,
                guest: this.guestGroups.length
            });
            
        } catch (error) {
            console.error('[MyGroups] Load error:', error);
        }
    },
    
    /**
     * Update the My Mission card on home screen
     */
    updateMissionCard() {
        // Update verse
        if (window.DiscipleshipContent) {
            const verse = window.DiscipleshipContent.getMissionVerse();
            const verseText = document.getElementById('missionVerseText');
            const verseRef = document.getElementById('missionVerseRef');
            if (verseText) verseText.textContent = `"${verse.text}"`;
            if (verseRef) verseRef.textContent = `— ${verse.verse}`;
        }
        
        // Update group count
        const countEl = document.getElementById('missionGroupCount');
        if (countEl) {
            const total = (this.uplineGroup ? 1 : 0) + this.downlineGroups.length;
            countEl.textContent = `${total} group${total !== 1 ? 's' : ''}`;
        }
    },
    
    /**
     * Count total pending join requests across all downline groups
     */
    countPendingRequests() {
        let total = 0;
        for (const group of this.downlineGroups) {
            total += (group.joinRequests?.length || 0);
        }
        this.pendingRequestsCount = total;
        return total;
    },
    
    /**
     * Update badges for pending requests
     */
    updateBadges() {
        const count = this.countPendingRequests();
        
        // Update Groups footer nav badge
        const groupsNavBadge = document.getElementById('groupsNavBadge');
        if (groupsNavBadge) {
            if (count > 0) {
                groupsNavBadge.textContent = count;
                groupsNavBadge.classList.remove('hidden');
            } else {
                groupsNavBadge.classList.add('hidden');
            }
        }
        
        console.log('[MyGroups] Pending requests:', count);
    },
    
    /**
     * Subscribe to real-time updates for join requests (for leaders)
     */
    subscribeToJoinRequests() {
        if (!window.currentUser || !window.db || !window.onSnapshot) return;
        
        // Unsubscribe from previous listener
        if (this.joinRequestsUnsubscribe) {
            this.joinRequestsUnsubscribe();
        }
        
        // Listen to groups where user is leader
        const groupsQuery = window.query(
            window.collection(window.db, 'goMission_groups'),
            window.where('leaderId', '==', window.currentUser.uid)
        );
        
        this.joinRequestsUnsubscribe = window.onSnapshot(groupsQuery, (snapshot) => {
            // Update downline groups with latest data
            this.downlineGroups = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            // Update badges
            this.updateBadges();
            
            // Re-render if screen is open
            if (this.isOpen) {
                this.render();
            }
            if (this.isDashboardOpen) {
                this.renderDashboard();
            }
            
            console.log('[MyGroups] Real-time update, groups:', this.downlineGroups.length);
        }, (error) => {
            console.error('[MyGroups] Snapshot error:', error);
        });
    },
    
    /**
     * Open My Groups screen
     */
    open() {
        const fromDashboard = arguments[0] === true;
        this.openedFromDashboard = fromDashboard;

        // If opening from dashboard, hide dashboard screen first.
        if (fromDashboard) {
            const dashboard = document.getElementById('missionGroupsDashboardScreen');
            if (dashboard) dashboard.classList.add('hidden');
        }

        const screen = document.getElementById('myGroupsScreen');
        if (screen) {
            screen.classList.remove('hidden');
            this.isOpen = true;
            this.render();
        }
    },
    
    /**
     * Close My Groups screen
     */
    close() {
        const screen = document.getElementById('myGroupsScreen');
        if (screen) {
            screen.classList.add('hidden');
            this.isOpen = false;
        }

        // Return to dashboard if user opened My Groups from dashboard.
        if (this.openedFromDashboard) {
            this.openedFromDashboard = false;
            this.openDashboard();
        }
    },

    /**
     * Open mission groups dashboard screen (entry point from footer)
     */
    async openDashboard() {
        const dashboard = document.getElementById('missionGroupsDashboardScreen');
        if (!dashboard) return;

        // Refresh latest group data before rendering dashboard cards.
        await this.loadGroups();
        this.updateBadges();

        // Ensure My Groups detail screen is closed.
        const groupsScreen = document.getElementById('myGroupsScreen');
        if (groupsScreen) groupsScreen.classList.add('hidden');
        this.isOpen = false;

        dashboard.classList.remove('hidden');
        this.isDashboardOpen = true;
        await this.renderDashboard();
    },

    /**
     * Close mission groups dashboard screen
     */
    closeDashboard() {
        const dashboard = document.getElementById('missionGroupsDashboardScreen');
        if (dashboard) {
            dashboard.classList.add('hidden');
        }
        this.isDashboardOpen = false;
    },

    /**
     * Escape user-provided strings for safe HTML rendering
     */
    escapeHtml(value) {
        const str = (value ?? '').toString();
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    },

    /**
     * Format meeting date in short readable form
     */
    formatMeetingDate(dateStr) {
        if (!dateStr) return 'No meeting yet';
        const date = new Date(`${dateStr}T00:00:00`);
        if (Number.isNaN(date.getTime())) return dateStr;
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
        });
    },

    /**
     * Find group from any dashboard-visible collection
     */
    getGroupById(groupId) {
        if (!groupId) return null;
        if (this.uplineGroup?.id === groupId) return this.uplineGroup;
        if (this.guestGroups?.length) {
            const guestGroup = this.guestGroups.find((g) => g.id === groupId);
            if (guestGroup) return guestGroup;
        }
        return this.downlineGroups.find((g) => g.id === groupId) || null;
    },

    /**
     * Load current user member profile from Firestore
     */
    async getCurrentMemberData() {
        if (!window.currentUser?.uid || !window.db) return null;
        const userRef = window.doc(window.db, 'goMission_members', window.currentUser.uid);
        const userDoc = await window.getDoc(userRef);
        return userDoc.exists() ? userDoc.data() : null;
    },

    /**
     * Determine if user completed leadership training milestone
     */
    hasCompletedLeadershipTraining(userData) {
        if (!userData) return false;
        const training = userData.training || {};
        const phase1 = training?.phases?.phase1 || {};

        return !!(
            training.completed === true
            || training.isCompleted === true
            || training.trainingCompleted === true
            || userData.trainingCompleted === true
            || phase1.status === 'completed'
            || phase1.completed === true
            || phase1.exitRequirementMet === true
            || userData.trainingPhaseCompleted === true
        );
    },

    /**
     * Determine if user has endorsement for leadership
     */
    hasLeadershipEndorsement(userData) {
        if (!userData) return false;
        const training = userData.training || {};
        const phase1 = training?.phases?.phase1 || {};

        return !!(
            userData.leaderEndorsed === true
            || userData.endorsedToLead === true
            || userData.endorsementApproved === true
            || userData.canCreateGroup === true
            || phase1.endorsed === true
            || phase1.exitRequirementMet === true
            || training.leaderEndorsed === true
        );
    },

    /**
     * Evaluate whether "Create a Group" action should be shown in dashboard
     */
    async canShowCreateGroupAction() {
        let profile = null;
        try {
            profile = await this.getCurrentMemberData();
        } catch (error) {
            console.warn('[MyGroups] Could not load member profile for create action:', error);
        }

        let groupsEligibility = { allowed: false, reason: 'unknown' };
        if (typeof Groups !== 'undefined' && typeof Groups.canCreateGroup === 'function') {
            try {
                groupsEligibility = await Groups.canCreateGroup();
            } catch (error) {
                console.warn('[MyGroups] Groups.canCreateGroup() failed:', error);
            }
        }

        const trainingCompleted = this.hasCompletedLeadershipTraining(profile);
        const endorsed = this.hasLeadershipEndorsement(profile);
        const allowedByTrainingAndEndorsement = trainingCompleted && endorsed;
        const isCurrentLeader = (this.downlineGroups?.length || 0) > 0;

        return {
            allowed: !!(groupsEligibility.allowed || allowedByTrainingAndEndorsement || isCurrentLeader),
            reason: groupsEligibility.reason || 'unknown',
            trainingCompleted,
            endorsed
        };
    },

    /**
     * Render dashboard-level action buttons
     */
    async renderDashboardActions() {
        const actionsWrap = document.getElementById('missionGroupsActionBar');
        const createBtn = document.getElementById('missionGroupsCreateBtn');
        const joinBtn = document.getElementById('missionGroupsJoinBtn');
        if (!actionsWrap || !createBtn || !joinBtn) return;

        const eligibility = await this.canShowCreateGroupAction();

        if (eligibility.allowed) {
            createBtn.classList.remove('hidden');
            joinBtn.classList.remove('w-full');
            actionsWrap.classList.add('grid', 'grid-cols-2');
            actionsWrap.classList.remove('block');
        } else {
            createBtn.classList.add('hidden');
            joinBtn.classList.add('w-full');
            actionsWrap.classList.remove('grid', 'grid-cols-2');
            actionsWrap.classList.add('block');
        }
    },

    /**
     * Collect meeting metrics for mission dashboard
     */
	    async getDashboardMeetingData(groupIds) {
	        const uid = window.currentUser?.uid;
	        if (!uid || !window.db || !groupIds.length) {
            return {
                attendanceRate: 0,
                attendedThisMonth: 0,
                meetingsThisMonth: 0,
                streak: 0,
                lastMeeting: null,
                perGroupLastMeeting: {}
            };
        }

	        const allMeetings = [];
	        const perGroupLastMeeting = {};
	        const monthKey = new Date().toISOString().slice(0, 7);
	        const isPermissionDenied = (err) => (
	            err?.code === 'permission-denied' ||
	            /missing or insufficient permissions/i.test(err?.message || '')
	        );

        for (const groupId of groupIds) {
            let meetings = [];

	            try {
	                const meetingsRef = window.collection(window.db, 'goMission_meetings');
	                const q = window.query(
	                    meetingsRef,
	                    window.where('groupId', '==', groupId),
	                    window.orderBy('date', 'desc'),
	                    window.limit(15)
	                );
	                const snapshot = await window.getDocs(q);
	                meetings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
	            } catch (error) {
	                // If Firestore rules deny reads, keep metrics empty without spamming console.
	                if (isPermissionDenied(error)) {
	                    meetings = [];
	                    continue;
	                }
	                // Fallback for environments lacking index support
	                try {
	                    const meetingsRef = window.collection(window.db, 'goMission_meetings');
	                    const qFallback = window.query(
	                        meetingsRef,
                        window.where('groupId', '==', groupId),
                        window.limit(25)
                    );
	                    const fallbackSnapshot = await window.getDocs(qFallback);
	                    meetings = fallbackSnapshot.docs
	                        .map(doc => ({ id: doc.id, ...doc.data() }))
	                        .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
	                } catch (fallbackError) {
	                    if (!isPermissionDenied(fallbackError)) {
	                        console.warn('[MyGroups] Meeting metrics fallback failed for group', groupId, fallbackError);
	                    }
	                }
	            }

            meetings.forEach((meeting) => {
                const attended = (meeting.attendees || []).some((attendee) => attendee.odId === uid);
                allMeetings.push({
                    groupId,
                    date: meeting.date || '',
                    attended
                });
            });

            const latest = meetings[0] || null;
            perGroupLastMeeting[groupId] = latest
                ? {
                    date: latest.date || '',
                    attended: (latest.attendees || []).some((attendee) => attendee.odId === uid)
                }
                : null;
        }

        allMeetings.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

        const meetingsThisMonth = allMeetings.filter((meeting) => (meeting.date || '').startsWith(monthKey));
        const attendedThisMonth = meetingsThisMonth.filter((meeting) => meeting.attended).length;
        const attendanceRate = meetingsThisMonth.length > 0
            ? Math.round((attendedThisMonth / meetingsThisMonth.length) * 100)
            : 0;

        let streak = 0;
        for (const meeting of allMeetings) {
            if (meeting.attended) {
                streak += 1;
            } else {
                break;
            }
        }

        return {
            attendanceRate,
            attendedThisMonth,
            meetingsThisMonth: meetingsThisMonth.length,
            streak,
            lastMeeting: allMeetings[0] || null,
            perGroupLastMeeting
        };
    },

    /**
     * Render mission groups dashboard data
     */
    async renderDashboard() {
        const allGroups = [];
        if (this.uplineGroup) allGroups.push({ ...this.uplineGroup, role: 'upline' });
        this.downlineGroups.forEach((group) => allGroups.push({ ...group, role: 'downline' }));
        this.guestGroups.forEach((group) => allGroups.push({ ...group, role: 'guest' }));

        const uniqueGroups = [];
        const seen = new Set();
        for (const group of allGroups) {
            if (!group?.id || seen.has(group.id)) continue;
            seen.add(group.id);
            uniqueGroups.push(group);
        }

        const groupIds = uniqueGroups.map((group) => group.id);
        const meetingData = await this.getDashboardMeetingData(groupIds);

        const totalGroupsEl = document.getElementById('missionGroupsTotalGroups');
        const attendanceRateEl = document.getElementById('missionGroupsAttendanceRate');
        const meetingsMonthEl = document.getElementById('missionGroupsMeetingsMonth');
        const lastMeetingEl = document.getElementById('missionGroupsLastMeeting');
        const heroStreakEl = document.getElementById('missionGroupsHeroStreak');
        const encouragementEl = document.getElementById('missionGroupsEncouragement');
        const statusListEl = document.getElementById('missionGroupsStatusList');

        await this.renderDashboardActions();

        if (totalGroupsEl) totalGroupsEl.textContent = String(groupIds.length);
        if (attendanceRateEl) attendanceRateEl.textContent = `${meetingData.attendanceRate}%`;
        if (meetingsMonthEl) meetingsMonthEl.textContent = String(meetingData.attendedThisMonth);
        if (heroStreakEl) heroStreakEl.textContent = String(meetingData.streak);

        if (lastMeetingEl) {
            if (!meetingData.lastMeeting) {
                lastMeetingEl.textContent = 'No meeting yet';
            } else {
                const attendanceLabel = meetingData.lastMeeting.attended ? 'attended' : 'missed';
                lastMeetingEl.textContent = `${this.formatMeetingDate(meetingData.lastMeeting.date)} (${attendanceLabel})`;
            }
        }

        if (encouragementEl) {
            let message = 'Join a mission group and take your next faithful step today.';
            if (groupIds.length > 0) {
                if (meetingData.streak >= 4) {
                    message = 'Strong consistency. Keep helping others by showing up faithfully each meeting.';
                } else if (meetingData.streak >= 1) {
                    message = 'Good momentum. Protect your rhythm and attend the next meeting.';
                } else {
                    message = 'Fresh start this week. Attend your next meeting and build a new streak.';
                }
            }
            encouragementEl.textContent = message;
        }

        if (!statusListEl) return;

        if (uniqueGroups.length === 0) {
            statusListEl.innerHTML = `
                <div class="mission-groups-status-item p-4">
                    <p class="text-[var(--text-muted)] text-sm">No mission groups yet.</p>
                    <button onclick="window.MyGroups.showJoinModal()" class="mt-3 w-full bg-[var(--mission-gold)] text-[var(--mission-red-deep)] font-bold py-2.5 rounded-lg text-sm">
                        Join with Invite Code
                    </button>
                </div>
            `;
            return;
        }

        statusListEl.innerHTML = uniqueGroups.map((group) => {
            const roleLabel = group.role === 'upline'
                ? 'Upline'
                : (group.role === 'downline' ? 'Downline' : 'Guest');
            const roleColor = group.role === 'upline'
                ? 'text-[var(--mission-gold)]'
                : (group.role === 'downline' ? 'text-green-500' : 'text-blue-400');

            const scheduleConfig = group.meetingSchedule || group.schedule || null;
            const schedule = scheduleConfig?.day && scheduleConfig?.time
                ? `${scheduleConfig.day} • ${this.formatTime(scheduleConfig.time)}`
                : 'No meeting schedule yet';
            const isMeetingNow = !!(scheduleConfig && typeof GroupMeeting !== 'undefined' && GroupMeeting.isMeetingTime(scheduleConfig));
            const groupIdForJs = String(group.id || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
            const isLeaderOfGroup = group.leaderId === window.currentUser?.uid;

            const last = meetingData.perGroupLastMeeting[group.id];
            const lastLine = last
                ? `${this.formatMeetingDate(last.date)} • ${last.attended ? 'You attended' : 'You missed'}`
                : 'No recorded meeting yet';

            const memberCount = group.members?.length || 0;

            return `
                <div class="mission-groups-status-item p-4">
                    <div class="flex items-start justify-between gap-2">
                        <div>
                            <p class="font-bold text-[var(--text-color)]">${this.escapeHtml(group.name || 'Mission Group')}</p>
                            <p class="text-xs ${roleColor} uppercase tracking-wider mt-1">${roleLabel}</p>
                        </div>
                        <span class="text-xs text-[var(--text-muted)]">${memberCount}/12 members</span>
                    </div>
                    <div class="mt-3 text-xs text-[var(--text-muted)] space-y-1.5">
                        <p>📅 ${this.escapeHtml(schedule)}</p>
                        <p>✅ ${this.escapeHtml(lastLine)}</p>
                    </div>
                    <div class="mt-4 grid ${isLeaderOfGroup ? 'grid-cols-3' : 'grid-cols-2'} gap-2">
                        <button onclick="window.MyGroups.joinMeeting('${groupIdForJs}')"
                                class="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold border transition-colors ${isMeetingNow
                                    ? 'bg-green-600 text-white border-green-500 shadow-[0_0_16px_rgba(34,197,94,0.35)]'
                                    : 'bg-[var(--input-bg)] text-[var(--text-color)] border-[var(--card-border)] hover:border-[var(--mission-gold)]/40'}">
                            <span>🎥</span>
                            <span>${isMeetingNow ? 'Join Meeting (Live)' : 'Join Meeting'}</span>
                        </button>
                        <button onclick="window.MyGroups.openGroupChat('${groupIdForJs}')"
                                class="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold border bg-[var(--input-bg)] text-[var(--mission-gold)] border-[var(--mission-gold)]/35 hover:bg-[var(--mission-gold)]/10 transition-colors">
                            <span>💬</span>
                            <span>Chat</span>
                        </button>
                        ${isLeaderOfGroup ? `
                        <button onclick="window.MyGroups.viewGroupDetails('${groupIdForJs}')"
                                class="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold border bg-[var(--input-bg)] text-[var(--text-color)] border-[var(--card-border)] hover:border-[var(--mission-gold)]/40 transition-colors">
                            <span>👁</span>
                            <span>View</span>
                        </button>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');
    },

    /**
     * Open detailed group settings/member view from mission dashboard (leader-focused)
     */
    async viewGroupDetails(groupId) {
        const group = this.getGroupById(groupId);
        if (!group) {
            alert('Group not found');
            return;
        }

        const isLeader = group.leaderId === window.currentUser?.uid;
        if (!isLeader) {
            // Keep member flow simple: no advanced settings view.
            this.showGroupMembers(groupId);
            return;
        }

        const modal = document.getElementById('groupModal');
        const content = document.getElementById('groupModalContent');
        if (!modal || !content) return;

        content.innerHTML = `
            <div class="p-6 text-center">
                <p class="text-[var(--text-muted)]">Loading group details...</p>
            </div>
        `;
        modal.classList.remove('hidden');

        try {
            const memberData = await this.getCurrentMemberData();
            const reminderConfig = memberData?.meetingReminders?.[groupId] || {};
            const reminderEnabled = reminderConfig.enabled !== false;
            const reminderMinutes = Number(reminderConfig.minutesBefore || 30);
            const alarmEnabled = reminderConfig.alarmEnabled !== false;
            const pushEnabled = reminderConfig.pushEnabled !== false;

            const memberIds = Array.isArray(group.members) ? group.members : [];
            const uniqueMemberIds = [...new Set(memberIds)];
            const memberProfiles = await Promise.all(uniqueMemberIds.map(async (memberId) => {
                try {
                    const snap = await window.getDoc(window.doc(window.db, 'goMission_members', memberId));
                    return {
                        id: memberId,
                        data: snap.exists() ? snap.data() : {}
                    };
                } catch (error) {
                    console.warn('[MyGroups] Failed loading member profile:', memberId, error);
                    return { id: memberId, data: {} };
                }
            }));

            const scheduleConfig = group.meetingSchedule || group.schedule || null;
            const scheduleLabel = scheduleConfig?.day && scheduleConfig?.time
                ? `${scheduleConfig.day} • ${this.formatTime(scheduleConfig.time)}`
                : 'No meeting schedule set';
            const meetingLive = !!(scheduleConfig && typeof GroupMeeting !== 'undefined' && GroupMeeting.isMeetingTime(scheduleConfig));
            const groupNameSafe = this.escapeHtml(group.name || 'Mission Group');

            const membersHtml = memberProfiles.map(({ id, data }) => {
                const displayName = this.escapeHtml(data.displayName || data.name || data.email?.split('@')[0] || 'Member');
                const email = this.escapeHtml(data.email || 'Not set');
                const mobile = this.escapeHtml(data.mobile || data.phone || 'Not set');
                const birthday = this.escapeHtml(data.birthday || data.birthDate || 'Not set');
                const spouse = this.escapeHtml(data.spouseName || data.spouse?.name || data.family?.spouseName || 'Not set');
                const childrenRaw = data.childrenNames || data.children || data.family?.childrenNames || data.family?.children;
                const children = Array.isArray(childrenRaw)
                    ? childrenRaw.join(', ')
                    : (childrenRaw || 'Not set');

                return `
                    <div class="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4">
                        <div class="flex items-center justify-between gap-2">
                            <p class="font-bold text-[var(--text-color)]">${displayName}</p>
                            <span class="text-[10px] uppercase tracking-wider ${id === group.leaderId ? 'text-[var(--mission-gold)]' : 'text-[var(--text-muted)]'}">${id === group.leaderId ? 'Leader' : 'Member'}</span>
                        </div>
                        <div class="mt-3 grid grid-cols-1 gap-1.5 text-xs text-[var(--text-muted)]">
                            <p>📧 ${email}</p>
                            <p>📱 ${mobile}</p>
                            <p>🎂 ${birthday}</p>
                            <p>💍 ${spouse}</p>
                            <p>👶 ${this.escapeHtml(children)}</p>
                        </div>
                    </div>
                `;
            }).join('');

            content.innerHTML = `
                <div class="p-6">
                    <div class="flex items-center justify-between mb-4">
                        <h3 class="text-lg font-bold text-[var(--text-color)]">👥 ${groupNameSafe}</h3>
                        <button onclick="window.MyGroups.closeModal()" class="text-[var(--text-muted)] text-xl">✕</button>
                    </div>

                    <div class="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
                        <div class="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4">
                            <div class="flex items-center justify-between gap-2">
                                <div>
                                    <p class="text-xs uppercase tracking-wider text-[var(--text-muted)]">Group Settings</p>
                                    <p class="font-semibold text-[var(--text-color)] mt-1">📅 ${this.escapeHtml(scheduleLabel)}</p>
                                </div>
                                <span class="text-[10px] uppercase tracking-wider ${meetingLive ? 'text-green-500' : 'text-[var(--text-muted)]'}">
                                    ${meetingLive ? 'Live now' : 'Waiting'}
                                </span>
                            </div>
                            <div class="mt-3">
                                <label class="block text-xs text-[var(--text-muted)] mb-1">Group Name</label>
                                <div class="flex items-center gap-2">
                                    <input id="groupNameInput" type="text" value="${groupNameSafe}" maxlength="80"
                                           class="flex-1 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-3 py-2 text-sm text-[var(--text-color)]">
                                    <button onclick="window.MyGroups.saveGroupName('${String(groupId).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}')"
                                            class="px-3 py-2 rounded-lg text-xs font-bold bg-[var(--mission-red-bright)] text-white whitespace-nowrap">
                                        Save Name
                                    </button>
                                </div>
                            </div>
                            <div class="mt-3 flex items-center gap-2">
                                <button onclick="window.MyGroups.editSchedule('${String(groupId).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}')"
                                        class="px-3 py-2 rounded-lg text-xs font-bold bg-[var(--mission-gold)] text-[var(--mission-red-deep)]">
                                    Edit Day & Time
                                </button>
                                <button onclick="window.MyGroups.joinMeeting('${String(groupId).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}')"
                                        class="px-3 py-2 rounded-lg text-xs font-bold border ${meetingLive ? 'bg-green-600 text-white border-green-500' : 'bg-[var(--input-bg)] text-[var(--text-color)] border-[var(--card-border)]'}">
                                    ${meetingLive ? 'Join Meeting (Live)' : 'Join Meeting'}
                                </button>
                            </div>
                        </div>

                        <div class="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4">
                            <p class="text-xs uppercase tracking-wider text-[var(--text-muted)] mb-3">My Meeting Reminder</p>
                            <label class="flex items-center justify-between text-sm text-[var(--text-color)]">
                                <span>Enable reminder</span>
                                <input id="meetingReminderEnabled" type="checkbox" class="accent-[var(--mission-gold)]" ${reminderEnabled ? 'checked' : ''}>
                            </label>
                            <div class="mt-3">
                                <label class="block text-xs text-[var(--text-muted)] mb-1">Notify me before meeting</label>
                                <select id="meetingReminderMinutes" class="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-3 py-2 text-sm text-[var(--text-color)]">
                                    <option value="10" ${reminderMinutes === 10 ? 'selected' : ''}>10 minutes</option>
                                    <option value="30" ${reminderMinutes === 30 ? 'selected' : ''}>30 minutes</option>
                                    <option value="60" ${reminderMinutes === 60 ? 'selected' : ''}>1 hour</option>
                                    <option value="1440" ${reminderMinutes === 1440 ? 'selected' : ''}>1 day</option>
                                </select>
                            </div>
                            <div class="mt-3 grid grid-cols-1 gap-2 text-sm text-[var(--text-color)]">
                                <label class="flex items-center justify-between">
                                    <span>In-app notification</span>
                                    <input id="meetingReminderPush" type="checkbox" class="accent-[var(--mission-gold)]" ${pushEnabled ? 'checked' : ''}>
                                </label>
                                <label class="flex items-center justify-between">
                                    <span>Alarm-style alert</span>
                                    <input id="meetingReminderAlarm" type="checkbox" class="accent-[var(--mission-gold)]" ${alarmEnabled ? 'checked' : ''}>
                                </label>
                            </div>
                            <button onclick="window.MyGroups.saveMeetingReminder('${String(groupId).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}')"
                                    class="mt-4 w-full py-2.5 rounded-lg text-sm font-bold bg-[var(--mission-red-bright)] text-white">
                                Save Reminder Settings
                            </button>
                        </div>

                        <div class="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4">
                            <div class="flex items-center justify-between mb-3">
                                <p class="text-xs uppercase tracking-wider text-[var(--text-muted)]">Members</p>
                                <span class="text-xs text-[var(--mission-gold)] font-semibold">${memberProfiles.length} total</span>
                            </div>
                            <div class="space-y-3">
                                ${membersHtml || '<p class="text-sm text-[var(--text-muted)]">No members found.</p>'}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('[MyGroups] viewGroupDetails error:', error);
            content.innerHTML = `
                <div class="p-6 text-center">
                    <p class="text-[var(--mission-red-bright)] mb-3">Failed to load group details.</p>
                    <button onclick="window.MyGroups.closeModal()" class="text-[var(--text-muted)]">Close</button>
                </div>
            `;
        }
    },

    /**
     * Save reminder/alarm preferences for current user per group
     */
    async saveMeetingReminder(groupId) {
        if (!window.currentUser?.uid || !window.db) return;

        const enabled = !!document.getElementById('meetingReminderEnabled')?.checked;
        const pushEnabled = !!document.getElementById('meetingReminderPush')?.checked;
        const alarmEnabled = !!document.getElementById('meetingReminderAlarm')?.checked;
        const minutesBeforeRaw = parseInt(document.getElementById('meetingReminderMinutes')?.value || '30', 10);
        const minutesBefore = Number.isFinite(minutesBeforeRaw) ? minutesBeforeRaw : 30;

        try {
            await window.setDoc(
                window.doc(window.db, 'goMission_members', window.currentUser.uid),
                {
                    meetingReminders: {
                        [groupId]: {
                            enabled,
                            pushEnabled,
                            alarmEnabled,
                            minutesBefore,
                            updatedAt: new Date().toISOString()
                        }
                    }
                },
                { merge: true }
            );

            alert('Reminder settings saved');
        } catch (error) {
            console.error('[MyGroups] saveMeetingReminder error:', error);
            alert('Could not save reminder settings');
        }
    },

    /**
     * Save group name (leader only)
     */
    async saveGroupName(groupId) {
        if (!window.currentUser?.uid || !window.db) return;

        const group = this.getGroupById(groupId);
        if (!group) {
            alert('Group not found');
            return;
        }

        if (group.leaderId !== window.currentUser.uid) {
            alert('Only the group leader can rename this group.');
            return;
        }

        const rawName = document.getElementById('groupNameInput')?.value || '';
        const newName = rawName.trim().replace(/\s+/g, ' ');

        if (newName.length < 3) {
            alert('Group name must be at least 3 characters.');
            return;
        }

        if (newName.length > 80) {
            alert('Group name is too long.');
            return;
        }

        try {
            await window.setDoc(
                window.doc(window.db, 'goMission_groups', groupId),
                {
                    name: newName,
                    updatedAt: new Date().toISOString()
                },
                { merge: true }
            );

            // Keep local state in sync for immediate UI updates.
            if (this.uplineGroup?.id === groupId) {
                this.uplineGroup = { ...this.uplineGroup, name: newName };
            }
            this.downlineGroups = (this.downlineGroups || []).map((g) => (
                g.id === groupId ? { ...g, name: newName } : g
            ));
            this.guestGroups = (this.guestGroups || []).map((g) => (
                g.id === groupId ? { ...g, name: newName } : g
            ));

            if (typeof Groups !== 'undefined' && Groups.currentGroup?.id === groupId) {
                Groups.currentGroup = { ...Groups.currentGroup, name: newName };
            }

            if (this.isOpen) {
                this.render();
            }
            if (this.isDashboardOpen) {
                await this.renderDashboard();
            }

            // Re-render details modal so header and field reflect saved value.
            await this.viewGroupDetails(groupId);
            alert('Group name updated.');
        } catch (error) {
            console.error('[MyGroups] saveGroupName error:', error);
            alert('Failed to update group name.');
        }
    },
    
    /**
     * Render groups in the screen
     */
    render() {
        this.renderUplineGroup();
        this.renderGuestGroups();
        this.renderDownlineGroups();
    },
    
    /**
     * Render upline group section
     */
    renderUplineGroup() {
        const container = document.getElementById('uplineGroupContainer');
        if (!container) return;
        
        if (this.uplineGroup) {
            container.innerHTML = this.renderGroupCard(this.uplineGroup, 'upline');
        } else {
            container.innerHTML = `
                <div class="mission-card rounded-xl p-4 border border-dashed border-[var(--card-border)]">
                    <p class="text-[var(--text-muted)] text-sm text-center">No upline group yet</p>
                    <button onclick="window.MyGroups.showJoinModal()" class="mt-3 w-full bg-[var(--mission-gold)] text-[var(--mission-red-deep)] font-bold py-2 px-4 rounded-lg text-sm">
                        Join with Invite Code
                    </button>
                </div>
            `;
        }
    },
    
    /**
     * Render guest groups section (groups where user is a guest visitor)
     */
    renderGuestGroups() {
        // Find or create container for guest groups
        let container = document.getElementById('guestGroupsContainer');
        let section = document.getElementById('guestGroupsSection');
        
        // If no guest groups, hide section
        if (this.guestGroups.length === 0) {
            if (section) section.classList.add('hidden');
            return;
        }
        
        // Show section
        if (section) {
            section.classList.remove('hidden');
        }
        
        if (container) {
            container.innerHTML = this.guestGroups
                .map(group => this.renderGroupCard(group, 'guest'))
                .join('');
        }
    },
    
    /**
     * Render downline groups section
     */
    renderDownlineGroups() {
        const container = document.getElementById('downlineGroupsContainer');
        if (!container) return;
        
        if (this.downlineGroups.length === 0) {
            container.innerHTML = `
                <div class="mission-card rounded-xl p-4 border border-dashed border-[var(--card-border)]">
                    <p class="text-[var(--text-muted)] text-sm text-center">No downline groups yet</p>
                    <p class="text-[var(--text-dim)] text-xs text-center mt-1">Create a group to start discipling others</p>
                </div>
            `;
        } else {
            container.innerHTML = this.downlineGroups
                .map(group => this.renderGroupCard(group, 'downline'))
                .join('');
        }
    },
    
    /**
     * Render a single group card
     */
    renderGroupCard(group, type) {
        const memberCount = group.members?.length || 0;
        const guestCount = group.guests?.length || 0;
        const requestCount = group.joinRequests?.length || 0;
        const hasSchedule = group.meetingSchedule?.day && group.meetingSchedule?.time;
        const isLeader = group.leaderId === window.currentUser?.uid;
        
        // Determine icon based on type
        let typeIcon = '👥';
        let typeBadge = '';
        if (type === 'upline') {
            typeIcon = '👤';
        } else if (type === 'guest') {
            typeIcon = '🎫';
            typeBadge = '<span class="ml-2 text-xs bg-[var(--card-bg)] border border-[var(--card-border)] text-[var(--text-muted)] px-2 py-0.5 rounded-full">Guest</span>';
        }
        
        return `
            <div class="mission-card rounded-xl overflow-hidden ${type === 'guest' ? 'border border-[var(--card-border)]' : ''}">
                <div class="p-4 border-b border-[var(--card-border)] flex items-center justify-between">
                    <h4 class="font-bold text-[var(--text-color)] flex items-center gap-2">
                        <span class="text-[var(--mission-gold)]">${typeIcon}</span>
                        ${group.name}
                        ${typeBadge}
                    </h4>
                    <button onclick="window.MyGroups.showGroupMenu('${group.id}')" class="text-[var(--text-muted)]">•••</button>
                </div>
                <div class="p-4 space-y-3">
                    <!-- Meeting Section -->
                    <div class="flex items-center justify-between bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg p-3">
                        <div>
                            <p class="text-xs text-[var(--text-muted)] flex items-center gap-1">
                                <span>📅</span> Weekly Meeting
                            </p>
                            ${hasSchedule ? `
                                <p class="text-sm text-[var(--text-color)]">${group.meetingSchedule.day} at ${this.formatTime(group.meetingSchedule.time)}</p>
                            ` : `
                                <p class="text-sm text-[var(--text-muted)]">Not scheduled</p>
                            `}
                        </div>
                        ${type === 'downline' ? `
                            <!-- Leader: Start Meeting + Edit Schedule -->
                            <div class="flex items-center gap-2">
                                <button onclick="window.MyGroups.editSchedule('${group.id}')" class="text-[var(--mission-gold)] text-xs">Edit</button>
                                <button onclick="window.MyGroups.startMeeting('${group.id}')" class="bg-[var(--mission-gold)] hover:opacity-90 text-[var(--mission-red-deep)] text-xs font-bold py-2 px-3 rounded-lg flex items-center gap-1 transition-opacity">
                                    <span>📹</span> Start Meeting
                                </button>
                            </div>
                        ` : `
                            <!-- Member/Guest: Join Meeting -->
                            <button onclick="window.MyGroups.joinMeeting('${group.id}')" class="bg-[var(--mission-gold)] hover:opacity-90 text-[var(--mission-red-deep)] text-xs font-bold py-2 px-3 rounded-lg flex items-center gap-1 transition-opacity">
                                <span>📹</span> Join Meeting
                            </button>
                        `}
                    </div>
                    
                    <!-- Members & Guests Count -->
                    <div class="flex items-center justify-between">
                        <span class="text-[var(--text-muted)] text-sm">Members</span>
                        <span class="text-[var(--mission-gold)] font-bold">${memberCount}/12</span>
                    </div>
                    ${guestCount > 0 ? `
                    <div class="flex items-center justify-between">
                        <span class="text-[var(--text-muted)] text-sm">🎫 Guests</span>
                        <span class="text-[var(--mission-gold)] font-bold">${guestCount}</span>
                    </div>
                    ` : ''}
                    
                    ${type === 'downline' && requestCount > 0 ? `
                    <!-- Pending Requests Badge -->
                    <button onclick="window.MyGroups.showJoinRequests('${group.id}')" class="w-full bg-[var(--card-bg)] border border-[var(--mission-gold)]/30 text-[var(--mission-gold)] font-medium py-2 rounded-lg text-sm flex items-center justify-center gap-2">
                        🔔 ${requestCount} Pending Request${requestCount > 1 ? 's' : ''}
                    </button>
                    ` : ''}
                    
                    <button onclick="window.MyGroups.openGroupChat('${group.id}')" class="w-full bg-[var(--mission-red-bright)] hover:bg-[var(--mission-red-bright)]/80 text-white font-bold py-3 rounded-lg text-sm">
                        💬 GROUP CHAT
                    </button>
                    ${type === 'downline' ? `
                        <button onclick="window.MyGroups.showInviteCode('${group.id}')" class="w-full border border-[var(--mission-gold)]/30 text-[var(--mission-gold)] font-medium py-2 rounded-lg text-sm">
                            🔑 Invite Members
                        </button>
                        <button onclick="window.MyGroups.showGroupMembers('${group.id}')" class="w-full border border-[var(--card-border)] text-[var(--text-muted)] font-medium py-2 rounded-lg text-sm relative">
                            👥 View Members ${guestCount > 0 ? `& Guests` : ''}
                            ${requestCount > 0 ? `<span class="absolute right-3 bg-[var(--mission-gold)] text-[var(--mission-red-deep)] text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1">${requestCount}</span>` : ''}
                        </button>
                    ` : ''}
                    ${type === 'guest' ? `
                        <button onclick="window.MyGroups.leaveAsGuest('${group.id}')" class="w-full border border-[var(--mission-red-bright)]/40 text-[var(--mission-red-bright)] font-medium py-2 rounded-lg text-sm">
                            Leave as Guest
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    },
    
    /**
     * Format time from 24h to 12h
     */
    formatTime(time24) {
        if (!time24) return '';
        const [hours, minutes] = time24.split(':');
        const h = parseInt(hours);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const h12 = h % 12 || 12;
        return `${h12}:${minutes} ${ampm}`;
    },
    
    /**
     * Show join group modal
     */
    showJoinModal() {
        const modal = document.getElementById('groupModal');
        const content = document.getElementById('groupModalContent');
        
        content.innerHTML = `
            <div class="p-6">
                <div class="flex items-center justify-between mb-6">
                    <h3 class="text-lg font-bold text-[var(--text-color)]">Join a Group</h3>
                    <button onclick="window.MyGroups.closeModal()" class="text-[var(--text-muted)]">✕</button>
                </div>
                <p class="text-[var(--text-muted)] text-sm mb-4">Enter the invite code given by your discipler:</p>
                <input type="text" id="joinCodeInput" placeholder="Enter 6-digit code" 
                    class="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-4 py-3 text-[var(--text-color)] text-center text-2xl tracking-[0.5em] uppercase mb-4"
                    maxlength="6" oninput="this.value = this.value.toUpperCase()">
                <div id="joinError" class="text-[var(--mission-red-bright)] text-sm text-center mb-4 hidden"></div>
                <button onclick="window.MyGroups.joinWithCode()" class="w-full bg-[var(--mission-gold)] text-[var(--mission-red-deep)] font-bold py-3 rounded-lg">
                    Join Group
                </button>
            </div>
        `;
        
        modal.classList.remove('hidden');
        document.getElementById('joinCodeInput')?.focus();
    },
    
    /**
     * Show create group modal
     */
    showCreateModal() {
        const modal = document.getElementById('groupModal');
        const content = document.getElementById('groupModalContent');
        
        content.innerHTML = `
            <div class="p-6">
                <div class="flex items-center justify-between mb-6">
                    <h3 class="text-lg font-bold text-[var(--text-color)]">Create New Group</h3>
                    <button onclick="window.MyGroups.closeModal()" class="text-[var(--text-muted)]">✕</button>
                </div>
                <p class="text-[var(--text-muted)] text-sm mb-4">Create a group to start discipling others:</p>
                <input type="text" id="newGroupName" placeholder="Group name" 
                    class="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-4 py-3 text-[var(--text-color)] mb-4">
                <div id="createError" class="text-[var(--mission-red-bright)] text-sm text-center mb-4 hidden"></div>
                <button onclick="window.MyGroups.createGroup()" class="w-full bg-[var(--mission-gold)] text-[var(--mission-red-deep)] font-bold py-3 rounded-lg">
                    Create Group
                </button>
            </div>
        `;
        
        modal.classList.remove('hidden');
        document.getElementById('newGroupName')?.focus();
    },
    
    /**
     * Close modal
     */
    closeModal() {
        document.getElementById('groupModal')?.classList.add('hidden');
    },
    
    /**
     * Join group with invite code
     */
    async joinWithCode() {
        const code = document.getElementById('joinCodeInput')?.value?.trim().toUpperCase();
        const errorEl = document.getElementById('joinError');
        
        if (!code || code.length < 4) {
            if (errorEl) {
                errorEl.textContent = 'Please enter a valid code';
                errorEl.classList.remove('hidden');
            }
            return;
        }
        
        try {
            let groupDoc = null;
            let groupData = null;
            
            // Method 1: Check goMission_groupInviteCodes collection (new system)
            const codeRef = window.doc(window.db, 'goMission_groupInviteCodes', code);
            const codeDoc = await window.getDoc(codeRef);
            
            if (codeDoc.exists()) {
                const codeData = codeDoc.data();
                
                // Check if code expired
                if (codeData.expiresAt && new Date(codeData.expiresAt) < new Date()) {
                    if (errorEl) {
                        errorEl.textContent = 'This invite code has expired. Ask the group leader for a new code.';
                        errorEl.classList.remove('hidden');
                    }
                    return;
                }
                
                // Check usage limit
                if (codeData.maxUses && codeData.usedCount >= codeData.maxUses) {
                    if (errorEl) {
                        errorEl.textContent = 'This invite code has reached its usage limit.';
                        errorEl.classList.remove('hidden');
                    }
                    return;
                }
                
                // Get the group
                const groupRef = window.doc(window.db, 'goMission_groups', codeData.groupId);
                groupDoc = await window.getDoc(groupRef);
                
                if (!groupDoc.exists()) {
                    if (errorEl) {
                        errorEl.textContent = 'Group not found';
                        errorEl.classList.remove('hidden');
                    }
                    return;
                }
                
                groupData = groupDoc.data();
                
            } else {
                // Method 2: Check inviteCode field directly on groups (legacy system)
                const groupQuery = window.query(
                    window.collection(window.db, 'goMission_groups'),
                    window.where('inviteCode', '==', code)
                );
                const snapshot = await window.getDocs(groupQuery);
                
                if (snapshot.empty) {
                    if (errorEl) {
                        errorEl.textContent = 'Invalid invite code';
                        errorEl.classList.remove('hidden');
                    }
                    return;
                }
                
                groupDoc = snapshot.docs[0];
                groupData = groupDoc.data();
                
                // Check if legacy invite code has expired
                if (groupData.inviteCodeExpiresAt && new Date(groupData.inviteCodeExpiresAt) < new Date()) {
                    if (errorEl) {
                        errorEl.textContent = 'This invite code has expired. Ask the group leader for a new code.';
                        errorEl.classList.remove('hidden');
                    }
                    return;
                }
            }
            
            // Check if already a member
            if (groupData.members?.includes(window.currentUser.uid)) {
                if (errorEl) {
                    errorEl.textContent = 'You are already a member of this group';
                    errorEl.classList.remove('hidden');
                }
                return;
            }
            
            // Check if already a guest
            if (groupData.guests?.some(g => g.odId === window.currentUser.uid)) {
                if (errorEl) {
                    errorEl.textContent = 'You are already a guest in this group';
                    errorEl.classList.remove('hidden');
                }
                return;
            }
            
            // Check if already has pending request
            if (groupData.joinRequests?.some(r => r.odId === window.currentUser.uid)) {
                if (errorEl) {
                    errorEl.textContent = 'You already have a pending request for this group';
                    errorEl.classList.remove('hidden');
                }
                return;
            }
            
            // Create join request (leader will approve as member or guest)
            const joinRequest = {
                odId: window.currentUser.uid,
                name: window.currentUser.displayName || 'Unknown',
                email: window.currentUser.email || '',
                photo: window.currentUser.photoURL || '',
                requestedAt: new Date().toISOString(),
                inviteCode: code,
                // Include existing group info if they have one
                hasExistingGroup: !!this.uplineGroup,
                existingGroupId: this.uplineGroup?.id || null,
                existingGroupName: this.uplineGroup?.name || null,
                existingLeaderName: this.uplineGroup?.leaderName || null
            };
            
            // Add join request to group
            await window.setDoc(
                window.doc(window.db, 'goMission_groups', groupDoc.id),
                { joinRequests: window.arrayUnion(joinRequest) },
                { merge: true }
            );
            
            // Update code usage count if using new system
            if (codeDoc && codeDoc.exists()) {
                await window.setDoc(codeRef, {
                    usedCount: (codeDoc.data().usedCount || 0) + 1,
                    lastUsedAt: new Date().toISOString(),
                    lastUsedBy: window.currentUser.uid
                }, { merge: true });
            }
            
            // Note: Cloud Function (onMemberJoined) will automatically send push notification to leader
            
            // Close modal and show success
            this.closeModal();
            
            alert(`Request sent to ${groupData.name}!\n\nThe group leader will review your request.`);
            
        } catch (error) {
            console.error('[MyGroups] Join request error:', error);
            if (errorEl) {
                errorEl.textContent = 'Failed to send request. Please try again.';
                errorEl.classList.remove('hidden');
            }
        }
    },
    
    /**
     * Create a new downline group
     */
    async createGroup() {
        const name = document.getElementById('newGroupName')?.value?.trim();
        const errorEl = document.getElementById('createError');
        
        if (!name) {
            if (errorEl) {
                errorEl.textContent = 'Please enter a group name';
                errorEl.classList.remove('hidden');
            }
            return;
        }
        
        try {
            const eligibility = await this.canShowCreateGroupAction();
            if (!eligibility.allowed) {
                if (errorEl) {
                    errorEl.textContent = 'You are not yet eligible to create a group.';
                    errorEl.classList.remove('hidden');
                }
                return;
            }

            // Generate 6-character invite code with 7-day expiration
            const inviteCode = this.generateInviteCode();
            const inviteCodeExpiresAt = this.generateExpirationDate();
            
            // Create group
            const groupRef = await window.addDoc(
                window.collection(window.db, 'goMission_groups'),
                {
                    name: name,
                    leaderId: window.currentUser.uid,
                    leaderName: window.currentUser.displayName || 'Leader',
                    members: [window.currentUser.uid],
                    inviteCode: inviteCode,
                    inviteCodeExpiresAt: inviteCodeExpiresAt,
                    type: 'downline',
                    createdAt: window.serverTimestamp(),
                    meetingSchedule: null
                }
            );
            
            console.log('[MyGroups] Created group:', groupRef.id);
            
            // Reload and close
            await this.loadGroups();
            this.render();
            this.updateMissionCard();
            this.closeModal();
            
            // Show invite code
            this.showInviteCode(groupRef.id);
            
        } catch (error) {
            console.error('[MyGroups] Create error:', error);
            if (errorEl) {
                errorEl.textContent = 'Failed to create group';
                errorEl.classList.remove('hidden');
            }
        }
    },
    
    /**
     * Generate 6-character invite code
     */
    generateInviteCode() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing chars
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    },
    
    /**
     * Generate expiration date (7 days from now)
     */
    generateExpirationDate() {
        const date = new Date();
        date.setDate(date.getDate() + 7);
        return date.toISOString();
    },
    
    /**
     * Show invite code for a group
     * If no invite code exists, generate one first
     */
    async showInviteCode(groupId) {
        console.log('[MyGroups] showInviteCode called with:', groupId);
        
        try {
            let group = this.downlineGroups.find(g => g.id === groupId);
            console.log('[MyGroups] Found group in memory:', group);
            
            // If group not found in memory, try to fetch it directly
            if (!group) {
                console.log('[MyGroups] Group not in memory, fetching from Firestore...');
                const groupDoc = await window.getDoc(
                    window.doc(window.db, 'goMission_groups', groupId)
                );
                if (groupDoc.exists()) {
                    group = { id: groupDoc.id, ...groupDoc.data() };
                    console.log('[MyGroups] Fetched group:', group);
                }
            }
            
            if (!group) {
                console.error('[MyGroups] Group not found:', groupId);
                alert('Group not found. Please refresh and try again.');
                return;
            }
            
            const modal = document.getElementById('groupModal');
            const content = document.getElementById('groupModalContent');
            
            console.log('[MyGroups] Modal element:', modal);
            console.log('[MyGroups] Content element:', content);
            
            if (!modal || !content) {
                console.error('[MyGroups] Modal elements not found');
                alert('Error: Modal not found');
                return;
            }
            
            // Check if group has an invite code, if not generate one
            // Also check if existing code has expired
            let inviteCode = group.inviteCode;
            let inviteCodeExpiresAt = group.inviteCodeExpiresAt;
            const isExpired = inviteCodeExpiresAt && new Date(inviteCodeExpiresAt) < new Date();
            
            console.log('[MyGroups] Current invite code:', inviteCode, 'Expires:', inviteCodeExpiresAt, 'Expired:', isExpired);
            
            if (!inviteCode || isExpired) {
                console.log('[MyGroups] No invite code or expired, generating new one...');
                
                // Show loading state
                content.innerHTML = `
                    <div class="p-6 text-center">
                        <p class="text-[var(--text-muted)]">${isExpired ? 'Code expired. Generating new code...' : 'Generating invite code...'}</p>
                    </div>
                `;
                modal.classList.remove('hidden');
                
                // Generate and save new invite code with 7-day expiration
                inviteCode = this.generateInviteCode();
                inviteCodeExpiresAt = this.generateExpirationDate();
                console.log('[MyGroups] Generated code:', inviteCode, 'Expires:', inviteCodeExpiresAt);
                
                await window.setDoc(
                    window.doc(window.db, 'goMission_groups', groupId),
                    { 
                        inviteCode: inviteCode,
                        inviteCodeExpiresAt: inviteCodeExpiresAt
                    },
                    { merge: true }
                );
                
                // Update local group object
                group.inviteCode = inviteCode;
                group.inviteCodeExpiresAt = inviteCodeExpiresAt;
                console.log('[MyGroups] Invite code saved to Firestore');
            }
            
            // Calculate days until expiration
            const expiresDate = new Date(inviteCodeExpiresAt);
            const daysLeft = Math.ceil((expiresDate - new Date()) / (1000 * 60 * 60 * 24));
            const expiresText = daysLeft === 1 ? 'Expires in 1 day' : `Expires in ${daysLeft} days`;
            
            // Show the invite code modal
            console.log('[MyGroups] Showing modal with code:', inviteCode);
            content.innerHTML = `
                <div class="p-6 text-center">
                    <div class="flex items-center justify-between mb-6">
                        <h3 class="text-lg font-bold text-[var(--text-color)]">🔑 Invite Code</h3>
                        <button onclick="window.MyGroups.closeModal()" class="text-[var(--text-muted)] text-xl">✕</button>
                    </div>
                    <p class="text-[var(--text-muted)] text-sm mb-4">Share this code with people you want to disciple:</p>
                    <div class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-6 mb-2">
                        <p class="text-4xl font-bold text-[var(--mission-gold)] tracking-[0.3em] font-mono">${inviteCode}</p>
                    </div>
                    <p class="text-[var(--text-muted)] text-xs mb-4">⏱️ ${expiresText}</p>
                    <p class="text-[var(--text-color)] font-medium mb-4">${group.name}</p>
                    <div class="space-y-3">
                        <button onclick="window.MyGroups.copyInviteCode('${inviteCode}')" class="w-full bg-[var(--mission-gold)] text-[var(--mission-red-deep)] font-bold py-3 rounded-lg">
                            📋 Copy Code
                        </button>
                        <button onclick="window.MyGroups.shareInviteCode('${inviteCode}', '${group.name.replace(/'/g, "\\'")}')" class="w-full border border-[var(--mission-gold)]/30 text-[var(--mission-gold)] font-medium py-3 rounded-lg">
                            📤 Share via...
                        </button>
                    </div>
                    <p class="text-[var(--text-dim)] text-xs mt-4">They can join using "+ Join" on My Groups screen</p>
                </div>
            `;
            
            modal.classList.remove('hidden');
            console.log('[MyGroups] Modal should now be visible');
            
        } catch (error) {
            console.error('[MyGroups] Error in showInviteCode:', error);
            alert('Error showing invite code: ' + error.message);
        }
    },
    
    /**
     * Share invite code via native share or copy
     */
    async shareInviteCode(code, groupName) {
        const shareText = `Join my Go Mission discipleship group "${groupName}"!\n\nUse this invite code: ${code}\n\nDownload the app: https://gomission.netlify.app`;
        
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'Join my Go Mission Group',
                    text: shareText
                });
            } catch (error) {
                if (error.name !== 'AbortError') {
                    // User didn't cancel, try copy fallback
                    this.copyInviteCode(code);
                }
            }
        } else {
            // Fallback to copy
            this.copyInviteCode(code);
        }
    },
    
    /**
     * Copy invite code to clipboard
     */
    copyInviteCode(code) {
        navigator.clipboard.writeText(code).then(() => {
            alert('Invite code copied!');
        }).catch(() => {
            alert('Code: ' + code);
        });
    },
    
    /**
     * Open group chat
     */
    openGroupChat(groupId) {
        if (typeof GroupChat !== 'undefined') {
            // Set the active group and open chat - check upline, guest, then downline groups
            let group = null;
            if (this.uplineGroup?.id === groupId) {
                group = this.uplineGroup;
            } else if (this.guestGroups?.length > 0) {
                group = this.guestGroups.find(g => g.id === groupId);
            }
            if (!group) {
                group = this.downlineGroups.find(g => g.id === groupId);
            }
            
            if (group && typeof Groups !== 'undefined') {
                Groups.currentGroup = group;
                GroupChat.open();
            }
        }
    },
    
    /**
     * Start meeting for a group (Leader)
     */
    startMeeting(groupId) {
        const group = this.downlineGroups.find(g => g.id === groupId);
        if (!group) {
            console.error('[MyGroups] Group not found for startMeeting:', groupId);
            return;
        }
        
        // Use GroupMeeting module if available
        if (typeof GroupMeeting !== 'undefined' && GroupMeeting.joinMeeting) {
            const userName = window.currentUser?.displayName || 'Leader';
            const userEmail = window.currentUser?.email || '';
            GroupMeeting.joinMeeting(group.id, group.name, userName, userEmail, true);
        } else {
            alert('Meeting system not available. Please refresh the app and try again.');
        }
    },
    
    /**
     * Join meeting for a group (Disciple/Member/Guest)
     */
    joinMeeting(groupId) {
        console.log('[MyGroups] Join Meeting clicked:', groupId);
        // Check upline group first, then guest groups, then downline groups
        let group = null;
        if (this.uplineGroup?.id === groupId) {
            group = this.uplineGroup;
        } else if (this.guestGroups?.length > 0) {
            group = this.guestGroups.find(g => g.id === groupId);
        }
        
        if (!group) {
            group = this.downlineGroups.find(g => g.id === groupId);
        }
        
        if (!group) {
            console.error('[MyGroups] Group not found for joinMeeting:', groupId);
            alert('Group not found');
            return;
        }
        
        // Use GroupMeeting module if available
        if (typeof GroupMeeting !== 'undefined' && GroupMeeting.joinMeeting) {
            const userName = window.currentUser?.displayName || 'Guest';
            const userEmail = window.currentUser?.email || '';
            const isLeader = group.leaderId === window.currentUser?.uid;
            try {
                GroupMeeting.joinMeeting(group.id, group.name, userName, userEmail, isLeader);
            } catch (e) {
                console.error('[MyGroups] GroupMeeting.joinMeeting threw:', e);
                alert('Failed to start the in-app meeting. Please refresh and try again.');
            }
        } else {
            alert('Meeting system not available. Please refresh the app and try again.');
        }
    },
    
    /**
     * Edit meeting schedule (Leader)
     */
    editSchedule(groupId) {
        const group = this.downlineGroups.find(g => g.id === groupId);
        if (!group) return;
        
        const modal = document.getElementById('groupModal');
        const content = document.getElementById('groupModalContent');
        
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const currentDay = group.meetingSchedule?.day || '';
        const currentTime = group.meetingSchedule?.time || '19:00';
        
        content.innerHTML = `
            <div class="p-6">
                <div class="flex items-center justify-between mb-6">
                    <h3 class="text-lg font-bold text-[var(--text-color)]">📅 Edit Meeting Schedule</h3>
                    <button onclick="window.MyGroups.closeModal()" class="text-[var(--text-muted)]">✕</button>
                </div>
                <p class="text-[var(--text-muted)] text-sm mb-4">${group.name}</p>
                
                <div class="space-y-4">
                    <div>
                        <label class="block text-[var(--text-muted)] text-sm mb-2">Day of Week</label>
                        <select id="scheduleDaySelect" class="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-4 py-3 text-[var(--text-color)]">
                            <option value="">Select a day</option>
                            ${days.map(day => `
                                <option value="${day}" ${day === currentDay ? 'selected' : ''}>${day}</option>
                            `).join('')}
                        </select>
                    </div>
                    
                    <div>
                        <label class="block text-[var(--text-muted)] text-sm mb-2">Time</label>
                        <input type="time" id="scheduleTimeInput" value="${currentTime}"
                            class="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-4 py-3 text-[var(--text-color)]">
                    </div>
                </div>
                
                <div id="scheduleError" class="text-[var(--mission-red-bright)] text-sm text-center mt-4 hidden"></div>
                
                <button onclick="window.MyGroups.saveSchedule('${groupId}')" class="w-full bg-[var(--mission-gold)] text-[var(--mission-red-deep)] font-bold py-3 rounded-lg mt-6">
                    Save Schedule
                </button>
            </div>
        `;
        
        modal.classList.remove('hidden');
    },
    
    /**
     * Save meeting schedule
     */
    async saveSchedule(groupId) {
        const day = document.getElementById('scheduleDaySelect')?.value;
        const time = document.getElementById('scheduleTimeInput')?.value;
        const errorEl = document.getElementById('scheduleError');
        
        if (!day) {
            if (errorEl) {
                errorEl.textContent = 'Please select a day';
                errorEl.classList.remove('hidden');
            }
            return;
        }
        
        try {
            await window.setDoc(
                window.doc(window.db, 'goMission_groups', groupId),
                { 
                    meetingSchedule: { 
                        day: day, 
                        time: time,
                        updatedAt: new Date().toISOString()
                    } 
                },
                { merge: true }
            );
            
            // Reload and close
            await this.loadGroups();
            this.render();
            this.closeModal();
            
        } catch (error) {
            console.error('[MyGroups] Save schedule error:', error);
            if (errorEl) {
                errorEl.textContent = 'Failed to save schedule';
                errorEl.classList.remove('hidden');
            }
        }
    },

    /**
     * Show group menu
     */
    showGroupMenu(groupId) {
        // TODO: Implement group settings menu
        console.log('[MyGroups] Show menu for:', groupId);
    },
    
    /**
     * Show pending join requests for a group
     */
    showJoinRequests(groupId) {
        const group = this.downlineGroups.find(g => g.id === groupId);
        if (!group) return;
        
        const requests = group.joinRequests || [];
        const modal = document.getElementById('groupModal');
        const content = document.getElementById('groupModalContent');
        
        if (!modal || !content) return;
        
        let requestsHtml = '';
        
        if (requests.length === 0) {
            requestsHtml = `
                <div class="text-center py-8">
                    <p class="text-[var(--text-muted)]">No pending requests</p>
                </div>
            `;
        } else {
            requestsHtml = requests.map(req => `
                <div class="bg-[var(--card-bg)] rounded-xl p-4 border border-[var(--card-border)]">
                    <div class="flex items-start gap-3">
                        <img src="${req.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(req.name)}&background=4a0404&color=fbbf24`}" 
                             class="w-12 h-12 rounded-full border border-[var(--card-border)]">
                        <div class="flex-1">
                            <p class="font-bold text-[var(--text-color)]">${req.name}</p>
                            <p class="text-xs text-[var(--text-muted)]">${req.email || 'No email'}</p>
                            ${req.hasExistingGroup ? `
                                <div class="mt-2 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg p-2">
                                    <p class="text-xs text-[var(--text-color)]">
                                        ℹ️ Already in: <strong>${req.existingGroupName}</strong>
                                    </p>
                                    <p class="text-xs text-[var(--text-muted)]">
                                        Leader: ${req.existingLeaderName}
                                    </p>
                                </div>
                            ` : `
                                <p class="text-xs text-[var(--text-muted)] mt-2">✨ New believer (no current group)</p>
                            `}
                        </div>
                    </div>
                    
                    <div class="mt-4 flex gap-2">
                        <!-- Always show both options: Member or Guest -->
                        <button onclick="window.MyGroups.approveRequest('${groupId}', '${req.odId}', 'member')" 
                                class="flex-1 bg-[var(--mission-gold)] text-[var(--mission-red-deep)] text-sm font-bold py-2 rounded-lg">
                            ✅ Member
                        </button>
                        <button onclick="window.MyGroups.approveRequest('${groupId}', '${req.odId}', 'guest')" 
                                class="flex-1 bg-[var(--card-bg)] border border-[var(--card-border)] text-[var(--text-color)] text-sm font-bold py-2 rounded-lg">
                            🎫 Guest
                        </button>
                        <button onclick="window.MyGroups.declineRequest('${groupId}', '${req.odId}')" 
                                class="flex-1 bg-[var(--mission-red-bright)]/10 text-[var(--mission-red-bright)] text-sm font-bold py-2 rounded-lg border border-[var(--mission-red-bright)]/30">
                            ❌
                        </button>
                    </div>
                </div>
            `).join('');
        }
        
        content.innerHTML = `
            <div class="p-6">
                <div class="flex items-center justify-between mb-6">
                    <h3 class="text-lg font-bold text-[var(--text-color)]">🔔 Join Requests</h3>
                    <button onclick="window.MyGroups.closeModal()" class="text-[var(--text-muted)] text-xl">✕</button>
                </div>
                <p class="text-[var(--text-muted)] text-sm mb-4">${group.name}</p>
                <div class="space-y-4 max-h-[60vh] overflow-y-auto">
                    ${requestsHtml}
                </div>
            </div>
        `;
        
        modal.classList.remove('hidden');
    },
    
    /**
     * Approve a join request as member or guest
     */
    async approveRequest(groupId, odId, type) {
        const group = this.downlineGroups.find(g => g.id === groupId);
        if (!group) return;
        
        const request = group.joinRequests?.find(r => r.odId === odId);
        if (!request) return;
        
        try {
            // Remove from joinRequests
            const updatedRequests = (group.joinRequests || []).filter(r => r.odId !== odId);
            
            if (type === 'member') {
                // Add as full member
                await window.setDoc(
                    window.doc(window.db, 'goMission_groups', groupId),
                    { 
                        members: window.arrayUnion(odId),
                        joinRequests: updatedRequests
                    },
                    { merge: true }
                );
                
                // Update user's uplineGroupId (only if they don't have one or it's a transfer)
                if (!request.hasExistingGroup) {
                    await window.setDoc(
                        window.doc(window.db, 'goMission_members', odId),
                        { uplineGroupId: groupId },
                        { merge: true }
                    );
                }
                
                alert(`${request.name} is now a member!`);
                
            } else if (type === 'guest') {
                // Add as guest
                const guestData = {
                    odId: odId,
                    name: request.name,
                    email: request.email || '',
                    photo: request.photo || '',
                    homeGroupId: request.existingGroupId,
                    homeGroupName: request.existingGroupName,
                    homeLeaderName: request.existingLeaderName,
                    joinedAsGuestAt: new Date().toISOString(),
                    approvedBy: window.currentUser.uid
                };
                
                await window.setDoc(
                    window.doc(window.db, 'goMission_groups', groupId),
                    { 
                        guests: window.arrayUnion(guestData),
                        joinRequests: updatedRequests
                    },
                    { merge: true }
                );
                
                // Also update user's guestGroups array
                await window.setDoc(
                    window.doc(window.db, 'goMission_members', odId),
                    { guestGroups: window.arrayUnion(groupId) },
                    { merge: true }
                );
                
                alert(`${request.name} is now a guest!`);
            }
            
            // Note: Cloud Function (onMemberJoined) will automatically send notification to the user
            
            // Reload and refresh
            await this.loadGroups();
            this.render();
            this.updateBadges();
            this.showGroupMembers(groupId);
            
        } catch (error) {
            console.error('[MyGroups] Approve error:', error);
            alert('Failed to approve request');
        }
    },
    
    /**
     * Decline a join request
     */
    async declineRequest(groupId, odId) {
        const group = this.downlineGroups.find(g => g.id === groupId);
        if (!group) return;
        
        const request = group.joinRequests?.find(r => r.odId === odId);
        if (!request) return;
        
        if (!confirm(`Decline request from ${request.name}?`)) return;
        
        try {
            // Remove from joinRequests
            const updatedRequests = (group.joinRequests || []).filter(r => r.odId !== odId);
            
            await window.setDoc(
                window.doc(window.db, 'goMission_groups', groupId),
                { joinRequests: updatedRequests },
                { merge: true }
            );
            
            // Reload and refresh
            await this.loadGroups();
            this.render();
            this.updateBadges();
            this.showGroupMembers(groupId);
            
        } catch (error) {
            console.error('[MyGroups] Decline error:', error);
            alert('Failed to decline request');
        }
    },
    
    /**
     * Show group members and guests
     */
    async showGroupMembers(groupId) {
        const group = this.downlineGroups.find(g => g.id === groupId);
        if (!group) return;
        
        const modal = document.getElementById('groupModal');
        const content = document.getElementById('groupModalContent');
        
        if (!modal || !content) return;
        
        // Show loading
        content.innerHTML = `
            <div class="p-6 text-center">
                <p class="text-[var(--text-muted)]">Loading members...</p>
            </div>
        `;
        modal.classList.remove('hidden');
        
        try {
            // Load member details
            const memberIds = group.members || [];
            const guests = group.guests || [];
            const isLeader = group.leaderId === window.currentUser?.uid;
            
            let membersHtml = '<div class="space-y-3">';
            
            // Section: Leader first
            const leaderDoc = await window.getDoc(window.doc(window.db, 'goMission_members', group.leaderId));
            const leaderData = leaderDoc.exists() ? leaderDoc.data() : {};
            const leaderName = leaderData.displayName || group.leaderName || 'Leader';
            const leaderPhoto = leaderData.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(leaderName)}&background=4a0404&color=fbbf24`;
            
            membersHtml += `
                <div class="flex items-center justify-between bg-[var(--card-bg)] rounded-lg p-3 border border-[var(--mission-gold)]/30">
                    <div class="flex items-center gap-3">
                        <img src="${leaderPhoto}" class="w-10 h-10 rounded-full border-2 border-[var(--mission-gold)]">
                        <div>
                            <p class="text-[var(--text-color)] font-medium">${leaderName} ${group.leaderId === window.currentUser?.uid ? '<span class="text-[var(--mission-gold)]">(You)</span>' : ''}</p>
                            <p class="text-xs text-[var(--mission-gold)]">👑 Leader</p>
                        </div>
                    </div>
                </div>
            `;
            
            // Section: Members (excluding leader)
            const otherMembers = memberIds.filter(id => id !== group.leaderId);
            if (otherMembers.length > 0) {
                membersHtml += `<p class="text-sm text-[var(--text-muted)] font-medium mt-4">📍 DISCIPLES (${otherMembers.length})</p>`;
                
                for (const memberId of otherMembers) {
                    const memberDoc = await window.getDoc(window.doc(window.db, 'goMission_members', memberId));
                    const member = memberDoc.exists() ? memberDoc.data() : {};
                    const memberName = member.displayName || member.email?.split('@')[0] || 'Unknown';
                    const memberPhoto = member.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(memberName)}&background=4a0404&color=fbbf24`;
                    
                    membersHtml += `
                        <div class="flex items-center justify-between bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg p-3">
                            <div class="flex items-center gap-3">
                                <img src="${memberPhoto}" class="w-10 h-10 rounded-full">
                                <div>
                                    <p class="text-[var(--text-color)] font-medium">${memberName}</p>
                                    <p class="text-xs text-[var(--text-muted)]">Member</p>
                                </div>
                            </div>
                            ${isLeader ? `
                                <button onclick="window.MyGroups.removeMember('${groupId}', '${memberId}', '${memberName.replace(/'/g, "\\'")}')" 
                                        class="text-[var(--mission-red-bright)] text-sm hover:opacity-80">Remove</button>
                            ` : ''}
                        </div>
                    `;
                }
            }
            
            // Section: Guests
            if (guests.length > 0) {
                membersHtml += `<p class="text-sm text-[var(--text-muted)] font-medium mt-4">🎫 GUESTS (${guests.length})</p>`;
                
                for (const guest of guests) {
                    membersHtml += `
                        <div class="flex items-center justify-between bg-[var(--card-bg)] rounded-lg p-3 border border-[var(--card-border)]">
                            <div class="flex items-center gap-3">
                                <img src="${guest.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(guest.name)}&background=1e40af&color=93c5fd`}" 
                                     class="w-10 h-10 rounded-full">
                                <div>
                                    <p class="text-[var(--text-color)] font-medium">${guest.name} <span class="text-[var(--mission-gold)] text-xs">🎫</span></p>
                                    <p class="text-xs text-[var(--text-muted)]">From: ${guest.homeGroupName || 'Unknown'}</p>
                                </div>
                            </div>
                            ${isLeader ? `
                                <button onclick="window.MyGroups.showGuestOptions('${groupId}', '${guest.odId}')" class="text-[var(--text-muted)]">•••</button>
                            ` : ''}
                        </div>
                    `;
                }
            }
            
            membersHtml += '</div>';
            
            // Build pending requests section (if any and user is leader)
            const requests = group.joinRequests || [];
            let pendingHtml = '';
            
            if (isLeader && requests.length > 0) {
                pendingHtml = `
                    <div class="mb-4 bg-[var(--card-bg)] border border-[var(--mission-gold)]/30 rounded-xl p-4">
                        <p class="text-[var(--mission-gold)] font-bold text-sm mb-3">🔔 PENDING REQUESTS (${requests.length})</p>
                        <div class="space-y-3">
                            ${requests.map(req => `
                                <div class="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg p-3">
                                    <div class="flex items-center gap-3 mb-3">
                                        <img src="${req.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(req.name)}&background=4a0404&color=fbbf24`}" 
                                             class="w-10 h-10 rounded-full border border-[var(--mission-gold)]/40">
                                        <div class="flex-1">
                                            <p class="text-[var(--text-color)] font-medium">${req.name}</p>
                                            <p class="text-xs text-[var(--text-muted)]">${req.email || 'No email'}</p>
                                            ${req.hasExistingGroup ? `
                                                <p class="text-xs text-[var(--text-muted)] mt-1">Already in: ${req.existingGroupName}</p>
                                            ` : `
                                                <p class="text-xs text-[var(--text-muted)] mt-1">✨ New (no current group)</p>
                                            `}
                                        </div>
                                    </div>
                                    <div class="flex gap-2">
                                        <button onclick="window.MyGroups.approveRequest('${groupId}', '${req.odId}', 'member')" 
                                                class="flex-1 bg-[var(--mission-gold)] hover:opacity-90 text-[var(--mission-red-deep)] text-xs font-bold py-2 rounded-lg transition-opacity">
                                            ✅ Member
                                        </button>
                                        <button onclick="window.MyGroups.approveRequest('${groupId}', '${req.odId}', 'guest')" 
                                                class="flex-1 bg-[var(--card-bg)] border border-[var(--card-border)] text-[var(--text-color)] text-xs font-bold py-2 rounded-lg">
                                            🎫 Guest
                                        </button>
                                        <button onclick="window.MyGroups.declineRequest('${groupId}', '${req.odId}')" 
                                                class="bg-[var(--mission-red-bright)]/10 text-[var(--mission-red-bright)] text-xs font-bold py-2 px-3 rounded-lg border border-[var(--mission-red-bright)]/30">
                                            ✕
                                        </button>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
            }
            
            content.innerHTML = `
                <div class="p-6">
                    <div class="flex items-center justify-between mb-6">
                        <h3 class="text-lg font-bold text-[var(--text-color)]">👥 ${group.name}</h3>
                        <button onclick="window.MyGroups.closeModal()" class="text-[var(--text-muted)] text-xl">✕</button>
                    </div>
                    <div class="max-h-[60vh] overflow-y-auto">
                        ${pendingHtml}
                        ${membersHtml}
                    </div>
                </div>
            `;
            
        } catch (error) {
            console.error('[MyGroups] Load members error:', error);
            content.innerHTML = `
                <div class="p-6 text-center">
                    <p class="text-[var(--mission-red-bright)]">Failed to load members</p>
                    <button onclick="window.MyGroups.closeModal()" class="mt-4 text-[var(--text-muted)]">Close</button>
                </div>
            `;
        }
    },
    
    /**
     * Show options for a guest (promote to member, remove)
     */
    showGuestOptions(groupId, guestId) {
        const group = this.downlineGroups.find(g => g.id === groupId);
        if (!group) return;
        
        const guest = group.guests?.find(g => g.odId === guestId);
        if (!guest) return;
        
        const modal = document.getElementById('groupModal');
        const content = document.getElementById('groupModalContent');
        
        content.innerHTML = `
            <div class="p-6">
                <div class="flex items-center justify-between mb-6">
                    <h3 class="text-lg font-bold text-[var(--text-color)]">Guest Options</h3>
                    <button onclick="window.MyGroups.showGroupMembers('${groupId}')" class="text-[var(--text-muted)]">← Back</button>
                </div>
                
                <div class="flex items-center gap-3 mb-6">
                    <img src="${guest.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(guest.name)}&background=1e40af&color=93c5fd`}" 
                         class="w-14 h-14 rounded-full">
                    <div>
                        <p class="text-[var(--text-color)] font-bold">${guest.name}</p>
                        <p class="text-xs text-[var(--text-muted)]">🎫 Guest from ${guest.homeGroupName}</p>
                    </div>
                </div>
                
                <div class="space-y-3">
                    <button onclick="window.MyGroups.promoteGuestToMember('${groupId}', '${guestId}')" 
                            class="w-full bg-[var(--mission-gold)] text-[var(--mission-red-deep)] font-bold py-3 rounded-lg">
                        ✅ Promote to Full Member
                    </button>
                    <p class="text-xs text-[var(--text-muted)] text-center">
                        This will request transfer from their original leader
                    </p>
                    
                    <button onclick="window.MyGroups.removeGuest('${groupId}', '${guestId}')" 
                            class="w-full bg-[var(--mission-red-bright)]/10 text-[var(--mission-red-bright)] font-bold py-3 rounded-lg border border-[var(--mission-red-bright)]/30 mt-4">
                        ❌ Remove as Guest
                    </button>
                </div>
            </div>
        `;
    },
    
    /**
     * Promote guest to full member (initiates transfer request)
     */
    async promoteGuestToMember(groupId, guestId) {
        const group = this.downlineGroups.find(g => g.id === groupId);
        if (!group) return;
        
        const guest = group.guests?.find(g => g.odId === guestId);
        if (!guest) return;
        
        // For now, we'll create a transfer request that needs approval from original leader
        // TODO: Implement transfer request system
        alert(`Transfer request feature coming soon!\n\n${guest.name}'s original leader (${guest.homeLeaderName}) will need to approve the transfer.`);
    },
    
    /**
     * Remove a guest from group
     */
    async removeGuest(groupId, guestId) {
        const group = this.downlineGroups.find(g => g.id === groupId);
        if (!group) return;
        
        const guest = group.guests?.find(g => g.odId === guestId);
        if (!guest) return;
        
        if (!confirm(`Remove ${guest.name} as guest?`)) return;
        
        try {
            // Remove from guests array
            const updatedGuests = (group.guests || []).filter(g => g.odId !== guestId);
            
            await window.setDoc(
                window.doc(window.db, 'goMission_groups', groupId),
                { guests: updatedGuests },
                { merge: true }
            );
            
            // Remove from user's guestGroups
            await window.setDoc(
                window.doc(window.db, 'goMission_members', guestId),
                { guestGroups: window.arrayRemove(groupId) },
                { merge: true }
            );
            
            // Reload and refresh
            await this.loadGroups();
            this.render();
            this.showGroupMembers(groupId);
            
        } catch (error) {
            console.error('[MyGroups] Remove guest error:', error);
            alert('Failed to remove guest');
        }
    },
    
    /**
     * Remove a member from group (leader only)
     */
    async removeMember(groupId, memberId, memberName) {
        const group = this.downlineGroups.find(g => g.id === groupId);
        if (!group) return;
        
        // Verify current user is the leader
        if (group.leaderId !== window.currentUser?.uid) {
            alert('Only the leader can remove members');
            return;
        }
        
        // Can't remove yourself (the leader)
        if (memberId === group.leaderId) {
            alert('You cannot remove yourself as the leader');
            return;
        }
        
        if (!confirm(`Remove ${memberName} from the group?\n\nThey will need to rejoin with a new invite code.`)) return;
        
        try {
            // Remove member from group's members array
            await window.setDoc(
                window.doc(window.db, 'goMission_groups', groupId),
                { members: window.arrayRemove(memberId) },
                { merge: true }
            );
            
            // Clear the member's uplineGroupId so they have no group
            await window.setDoc(
                window.doc(window.db, 'goMission_members', memberId),
                { uplineGroupId: null },
                { merge: true }
            );
            
            console.log(`[MyGroups] Removed ${memberName} from group`);
            
            // Reload and refresh
            await this.loadGroups();
            this.render();
            this.showGroupMembers(groupId);
            
            alert(`${memberName} has been removed from the group.`);
            
        } catch (error) {
            console.error('[MyGroups] Remove member error:', error);
            alert('Failed to remove member');
        }
    },
    
    /**
     * Leave a group as a guest
     */
    async leaveAsGuest(groupId) {
        const group = this.guestGroups.find(g => g.id === groupId);
        if (!group) return;
        
        if (!confirm(`Leave ${group.name} as a guest?`)) return;
        
        try {
            // Remove from group's guests array
            const updatedGuests = (group.guests || []).filter(g => g.odId !== window.currentUser.uid);
            
            await window.setDoc(
                window.doc(window.db, 'goMission_groups', groupId),
                { guests: updatedGuests },
                { merge: true }
            );
            
            // Remove from user's guestGroups array
            await window.setDoc(
                window.doc(window.db, 'goMission_members', window.currentUser.uid),
                { guestGroups: window.arrayRemove(groupId) },
                { merge: true }
            );
            
            // Reload and refresh
            await this.loadGroups();
            this.render();
            this.closeModal();
            
            alert(`You have left ${group.name}.`);
            
        } catch (error) {
            console.error('[MyGroups] Leave as guest error:', error);
            alert('Failed to leave group');
        }
    }
};

// Make available globally
window.MyGroups = MyGroups;
