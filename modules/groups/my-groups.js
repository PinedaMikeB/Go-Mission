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
    dashboardTab: 'downline', // 'downline' | 'upline'
    pendingGroupDeletionRequestsById: {},
    isCreatingGroup: false,
    currentMemberProfile: null,
    activeGroupDetailContext: null,
    ADMIN_INBOX_COLLECTION: 'goMission_adminInbox',
    INTEGRITY_LOGS_COLLECTION: 'goMission_integrityLogs',
    GROUP_DASHBOARD_THRESHOLDS: {
        INACTIVE_DAYS: 7,
        NO_DEVOTION_DAYS: 3,
        MISSED_MEETINGS: 2,
        NEW_MEMBER_DAYS: 14
    },
    GROUP_CARE_TEMPLATES: {
        encourage_bible: {
            title: 'Bible Reading Encouragement',
            buildMessage: (member) => `${MyGroups.getFirstName(member)}! Open the Bible today, listen to what God is saying, and write one simple insight in the app.`
        },
        check_attendance: {
            title: 'Mission Group Follow-Up',
            buildMessage: (member) => `${MyGroups.getFirstName(member)}! We missed you in the mission group. I’m checking in and praying for you. Let me know how you are doing.`
        },
        affirm_active: {
            title: 'Keep Going With God',
            buildMessage: (member) => `${MyGroups.getFirstName(member)}! Thank you for reading the Bible and staying active with God. Keep building on this holy rhythm.`
        }
    },
    NO_UPLINE_CREATION_EXEMPT_UIDS: [
        '9zVKHJ11zaXD0f4GI6P7LHD6re32', // Founder
        'QRjyNLzDvwZxqjoIA3hQVnNf7Bs1' // Co-founder (Irene)
    ],
    NO_UPLINE_CREATION_EXEMPT_EMAILS: [
        'michael.marga@gmail.com',
        'shannen.emerald04@gmail.com'
    ],

    /**
     * Resolve user id from a string or object payload across schemas
     */
    getEntityUserId(entity) {
        if (!entity) return null;
        if (typeof entity === 'string') return entity;
        return entity.odId || entity.uid || entity.id || entity.userId || entity.memberId || entity.profileId || entity._key || null;
    },

    /**
     * Normalize array-or-map collections into array entries
     */
    normalizeCollectionEntries(collectionValue) {
        if (Array.isArray(collectionValue)) return collectionValue;
        if (collectionValue && typeof collectionValue === 'object') {
            return Object.entries(collectionValue).map(([key, value]) => {
                if (value && typeof value === 'object') return { ...value, _key: key };
                return { id: key, value, _key: key };
            });
        }
        return [];
    },

    /**
     * Extract id-like strings from array/map/string values
     */
    extractIdList(value) {
        if (!value) return [];
        if (typeof value === 'string') return value ? [value] : [];
        const entries = this.normalizeCollectionEntries(value);
        const ids = entries
            .map((entry) => this.getEntityUserId(entry))
            .filter(Boolean);
        return [...new Set(ids)];
    },

    /**
     * Write non-blocking integrity event logs for admin troubleshooting.
     */
    async logIntegrityEvent(eventType, payload = {}) {
        if (!window.db || !window.currentUser || typeof window.addDoc !== 'function' || typeof window.collection !== 'function') {
            return;
        }
        const nowIso = new Date().toISOString();
        const normalizedType = String(eventType || 'unknown').trim() || 'unknown';
        const defaultStatus = (normalizedType.includes('failed') || normalizedType.includes('blocked')) ? 'open' : 'logged';
        const defaultSeverity = normalizedType.includes('failed') ? 'high' : (normalizedType.includes('blocked') ? 'medium' : 'info');
        const requestedGroupName = String(payload.requestedGroupName || '').trim();
        const requestedNameKey = String(payload.requestedNameKey || this.normalizeGroupNameKey(requestedGroupName || '')).trim();
        const context = (payload.context && typeof payload.context === 'object') ? payload.context : {};

        const eventData = {
            category: String(payload.category || 'group_creation'),
            type: normalizedType,
            source: String(payload.source || 'my_groups'),
            status: String(payload.status || defaultStatus),
            severity: String(payload.severity || defaultSeverity),
            actionRequired: payload.actionRequired === true || defaultStatus === 'open',
            message: String(payload.message || ''),
            reasonCode: String(payload.reasonCode || ''),
            errorCode: String(payload.errorCode || ''),
            errorMessage: String(payload.errorMessage || ''),
            userId: window.currentUser.uid,
            userEmail: window.currentUser.email || '',
            userName: window.currentUser.displayName || '',
            requestedGroupName,
            requestedNameKey,
            context,
            createdAt: (typeof window.serverTimestamp === 'function') ? window.serverTimestamp() : nowIso,
            createdAtIso: nowIso
        };

        try {
            await window.addDoc(window.collection(window.db, this.INTEGRITY_LOGS_COLLECTION), eventData);
        } catch (error) {
            console.warn('[MyGroups] logIntegrityEvent skipped:', error);
        }
    },

    /**
     * Broadcast group-state updates so Journey/Home can react in real time.
     */
    emitGroupsUpdated(reason = 'updated') {
        if (typeof document === 'undefined' || typeof CustomEvent === 'undefined') return;
        document.dispatchEvent(new CustomEvent('myGroupsUpdated', {
            detail: {
                reason,
                uplineGroupId: this.uplineGroup?.id || null,
                downlineCount: Number(this.downlineGroups?.length || 0),
                guestCount: Number(this.guestGroups?.length || 0)
            }
        }));
    },

    /**
     * Resolve guest user id across schemas
     */
    getGuestUserId(guest) {
        return this.getEntityUserId(guest);
    },

    /**
     * Build a resilient fallback guest-group object when group doc fetch fails.
     */
    buildGuestFallbackGroup(groupId, meta = null, userId = null) {
        const safeMeta = (meta && typeof meta === 'object') ? meta : {};
        const fallbackName = safeMeta.name || safeMeta.groupName || `Guest Group (${String(groupId).slice(0, 6)})`;
        return {
            id: groupId,
            name: fallbackName,
            leaderId: safeMeta.leaderId || null,
            meetingSchedule: null,
            members: [],
            guests: userId ? [{ odId: userId, name: window.currentUser?.displayName || 'You' }] : [],
            _fallbackGuestGroup: true
        };
    },

    /**
     * Check if a user is listed in a group's guests array
     */
    isUserGuestInGroupData(groupData, userId) {
        if (!groupData || !userId) return false;
        const guestEntries = this.normalizeCollectionEntries(groupData.guests);
        return guestEntries.some((guest) => this.getGuestUserId(guest) === userId);
    },

    /**
     * Check if a user is listed in a group's members array
     */
    isUserMemberInGroupData(groupData, userId) {
        if (!groupData || !userId) return false;
        const memberEntries = this.normalizeCollectionEntries(groupData.members);
        return memberEntries.some((member) => this.getEntityUserId(member) === userId);
    },

    /**
     * Resolve primary upline group id with safety against self-led fallback pointers.
     */
    async resolvePrimaryMemberGroupIdFromProfile(profile = {}, userId = window.currentUser?.uid) {
        const uplineGroupId = typeof profile?.uplineGroupId === 'string' ? profile.uplineGroupId.trim() : '';
        if (uplineGroupId) return uplineGroupId;

        const fallbackGroupId = typeof profile?.groupId === 'string' ? profile.groupId.trim() : '';
        if (!fallbackGroupId) return null;

        const groupRole = String(profile?.groupRole || '').toLowerCase().trim();
        if (groupRole && groupRole !== 'member') return null;

        if (!window.db) return groupRole === 'member' ? fallbackGroupId : null;

        try {
            const groupDoc = await window.getDoc(
                window.doc(window.db, 'goMission_groups', fallbackGroupId)
            );
            if (!groupDoc.exists()) return groupRole === 'member' ? fallbackGroupId : null;
            const groupData = groupDoc.data() || {};
            if (groupData?.leaderId && userId && groupData.leaderId === userId) {
                return null;
            }
            return fallbackGroupId;
        } catch (error) {
            console.warn('[MyGroups] Failed resolving fallback primary group:', error);
            return groupRole === 'member' ? fallbackGroupId : null;
        }
    },

    /**
     * Founder/co-founder exemption for no-upline leadership rule.
     */
    isNoUplineCreationExempt(profile = this.currentMemberProfile) {
        const uid = String(window.currentUser?.uid || profile?.id || '').trim();
        const email = String(window.currentUser?.email || profile?.email || '').trim().toLowerCase();
        return this.NO_UPLINE_CREATION_EXEMPT_UIDS.includes(uid) || this.NO_UPLINE_CREATION_EXEMPT_EMAILS.includes(email);
    },

    /**
     * Check if current user has a valid non-self upline group.
     */
    currentUserHasValidUpline() {
        if (!this.uplineGroup || !this.uplineGroup.id) return false;
        return this.uplineGroup.leaderId && this.uplineGroup.leaderId !== window.currentUser?.uid;
    },

    /**
     * Determine if meeting actions should be locked for this group.
     */
    getGroupMeetingLockState(group) {
        if (!group) {
            return { locked: false, reason: '' };
        }

        const lockMeta = (group.integrityLock && typeof group.integrityLock === 'object') ? group.integrityLock : {};
        const lockType = String(lockMeta.type || '').toLowerCase();
        const lockEnabled = lockMeta.enabled === true;
        if (lockEnabled && lockType === 'missing_upline') {
            return {
                locked: true,
                reason: lockMeta.reason || 'Meeting is temporarily locked until the leader joins a valid upline group.',
                leaderActionRequired: true
            };
        }

        if (lockEnabled && lockType === 'duplicate_group') {
            return {
                locked: true,
                reason: lockMeta.reason || 'Group is temporarily locked because a duplicate group was detected. Request admin review.',
                leaderActionRequired: true
            };
        }

        const isLeaderOfGroup = group.leaderId === window.currentUser?.uid;
        if (isLeaderOfGroup && !this.isNoUplineCreationExempt(this.currentMemberProfile) && !this.currentUserHasValidUpline()) {
            return {
                locked: true,
                reason: 'Meeting is locked for this group. Join a valid upline group first, then request unlock from admin.',
                leaderActionRequired: true
            };
        }

        return { locked: false, reason: '', leaderActionRequired: false };
    },

    /**
     * Unified click handler for meeting buttons to enforce integrity locks.
     */
    handleMeetingAction(groupId, asLeaderStart = false) {
        const group = this.getGroupById(groupId);
        if (!group) {
            alert('Group not found');
            return;
        }

        const lockState = this.getGroupMeetingLockState(group);
        if (lockState.locked) {
            this.showMeetingLockModal(group, lockState);
            return;
        }

        if (asLeaderStart) {
            this.startMeeting(groupId);
            return;
        }
        this.joinMeeting(groupId);
    },

    /**
     * Show lock reason + request-to-admin form.
     */
    showMeetingLockModal(group, lockState = {}) {
        const modal = document.getElementById('groupModal');
        const content = document.getElementById('groupModalContent');
        if (!modal || !content) return;

        const groupIdSafe = String(group?.id || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
        const reason = this.escapeHtml(lockState.reason || 'Meeting is currently locked.');
        const canRequest = group?.leaderId === window.currentUser?.uid;

        content.innerHTML = `
            <div class="p-6">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-lg font-bold text-[var(--text-color)]">🚫 Meeting Locked</h3>
                    <button onclick="window.MyGroups.closeModal()" class="text-[var(--text-muted)] text-xl">✕</button>
                </div>
                <div class="rounded-xl border border-[var(--mission-red-bright)]/35 bg-[var(--mission-red-bright)]/10 p-3">
                    <p class="text-sm font-semibold text-[var(--mission-red-bright)]">${this.escapeHtml(group?.name || 'This group')}</p>
                    <p class="text-sm text-[var(--text-color)] mt-1">${reason}</p>
                    <p class="text-xs text-[var(--text-muted)] mt-2">Action needed: join a valid upline group first.</p>
                </div>

                ${canRequest ? `
                    <div class="mt-4">
                        <label for="uplineUnlockMessage" class="block text-sm font-semibold text-[var(--text-color)] mb-2">Message to admin</label>
                        <textarea id="uplineUnlockMessage" rows="4" maxlength="400"
                            placeholder="Please review my group lock and guide me on how to connect to a valid upline group."
                            class="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-4 py-3 text-[var(--text-color)]"></textarea>
                        <div id="uplineUnlockError" class="text-[var(--mission-red-bright)] text-sm mt-2 hidden"></div>
                    </div>

                    <div class="mt-4 flex gap-3">
                        <button onclick="window.MyGroups.closeModal()"
                                class="flex-1 border border-[var(--card-border)] text-[var(--text-muted)] py-3 rounded-lg">
                            Close
                        </button>
                        <button onclick="window.MyGroups.submitUplineUnlockRequest('${groupIdSafe}')"
                                class="flex-1 bg-[var(--mission-gold)] text-[var(--mission-red-deep)] font-bold py-3 rounded-lg">
                            Send Request to Admin
                        </button>
                    </div>
                ` : `
                    <div class="mt-4">
                        <button onclick="window.MyGroups.closeModal()"
                                class="w-full border border-[var(--card-border)] text-[var(--text-muted)] py-3 rounded-lg">
                            Close
                        </button>
                    </div>
                `}
            </div>
        `;

        modal.classList.remove('hidden');
        if (canRequest) {
            document.getElementById('uplineUnlockMessage')?.focus();
        }
    },

    /**
     * Send leader unlock request to admin inbox.
     */
    async submitUplineUnlockRequest(groupId) {
        const group = this.downlineGroups.find((entry) => entry.id === groupId);
        const errorEl = document.getElementById('uplineUnlockError');
        if (!group) {
            if (errorEl) {
                errorEl.textContent = 'Group not found.';
                errorEl.classList.remove('hidden');
            }
            return;
        }

        if (group.leaderId !== window.currentUser?.uid) {
            if (errorEl) {
                errorEl.textContent = 'Only the group leader can send this request.';
                errorEl.classList.remove('hidden');
            }
            return;
        }

        const message = String(document.getElementById('uplineUnlockMessage')?.value || '').trim();
        if (message.length < 8) {
            if (errorEl) {
                errorEl.textContent = 'Please enter at least 8 characters.';
                errorEl.classList.remove('hidden');
            }
            return;
        }

        try {
            await window.addDoc(window.collection(window.db, this.ADMIN_INBOX_COLLECTION), {
                type: 'upline_unlock_request',
                status: 'new',
                groupId: group.id,
                groupName: group.name || 'Unnamed Group',
                leaderId: window.currentUser.uid,
                leaderName: window.currentUser.displayName || group.leaderName || 'Unknown',
                leaderEmail: window.currentUser.email || '',
                message,
                createdAt: window.serverTimestamp ? window.serverTimestamp() : new Date().toISOString(),
                createdAtIso: new Date().toISOString(),
                source: 'my_groups_meeting_lock'
            });

            this.closeModal();
            alert('Request sent to admin.');
        } catch (error) {
            console.error('[MyGroups] submitUplineUnlockRequest error:', error);
            if (errorEl) {
                errorEl.textContent = 'Failed to send request. Please try again.';
                errorEl.classList.remove('hidden');
            }
        }
    },

    /**
     * Load pending group-deletion requests keyed by downline group id
     */
    async loadPendingGroupDeletionRequests() {
        if (!window.db || !window.currentUser?.uid) {
            this.pendingGroupDeletionRequestsById = {};
            return;
        }

        const groupIds = (this.downlineGroups || []).map((group) => group?.id).filter(Boolean);
        if (groupIds.length === 0) {
            this.pendingGroupDeletionRequestsById = {};
            return;
        }

        const nextMap = {};
        await Promise.all(groupIds.map(async (groupId) => {
            try {
                const snap = await window.getDoc(
                    window.doc(window.db, 'goMission_groupDeletionRequests', groupId)
                );
                if (!snap.exists()) return;
                const data = snap.data() || {};
                if (String(data.status || '').toLowerCase() === 'pending') {
                    nextMap[groupId] = { id: snap.id, ...data };
                }
            } catch (error) {
                console.warn('[MyGroups] Failed loading group deletion request:', groupId, error);
            }
        }));

        this.pendingGroupDeletionRequestsById = nextMap;
    },

    /**
     * Find guest object by user id
     */
    findGuestInGroup(group, guestId) {
        if (!group || !guestId) return null;
        const guestEntries = this.normalizeCollectionEntries(group.guests);
        return guestEntries.find((guest) => this.getGuestUserId(guest) === guestId) || null;
    },
    
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
            const uid = window.currentUser.uid;
            this.uplineGroup = null;
            this.downlineGroups = [];
            this.guestGroups = [];
            this.currentMemberProfile = null;
            const userDoc = await window.getDoc(
                window.doc(window.db, 'goMission_members', uid)
            );
            
            if (!userDoc.exists()) return;
            
            const userData = userDoc.data();
            this.currentMemberProfile = userData || null;
            
            // Load upline/member group (legacy groupId fallback is guarded against self-led groups)
            const memberGroupId = await this.resolvePrimaryMemberGroupIdFromProfile(userData, uid);
            if (memberGroupId) {
                const uplineDoc = await window.getDoc(
                    window.doc(window.db, 'goMission_groups', memberGroupId)
                );
                if (uplineDoc.exists()) {
                    const groupData = uplineDoc.data();
                    if (groupData?.leaderId === uid) {
                        this.uplineGroup = null;
                    } else {
                    // Verify user is still a member of this group
                    const isMember = this.isUserMemberInGroupData(groupData, uid);
                    const isGuest = this.isUserGuestInGroupData(groupData, uid);
                    
                    if (isMember || isGuest) {
                        this.uplineGroup = { id: uplineDoc.id, ...groupData };
                        // Backfill canonical field for legacy profiles.
                        if (!userData.uplineGroupId && userData.groupId) {
                            await window.setDoc(
                                window.doc(window.db, 'goMission_members', uid),
                                { uplineGroupId: userData.groupId },
                                { merge: true }
                            );
                        }
                        // Also set Groups.currentGroup for chat
                        if (typeof Groups !== 'undefined') {
                            Groups.currentGroup = this.uplineGroup;
                        }
                    } else {
                        // Keep visible instead of clearing profile pointers on potential schema mismatch.
                        console.warn('[MyGroups] Member group pointer exists but membership check failed; keeping visible');
                        this.uplineGroup = { id: uplineDoc.id, ...groupData };
                        if (typeof Groups !== 'undefined') {
                            Groups.currentGroup = this.uplineGroup;
                        }
                    }
                    }
                } else {
                    // Group doesn't exist anymore
                    this.uplineGroup = null;
                }
            }

            // Recovery path for member profiles with missing uplineGroupId/groupId.
            if (!this.uplineGroup) {
                try {
                    const memberQuery = window.query(
                        window.collection(window.db, 'goMission_groups'),
                        window.where('members', 'array-contains', uid)
                    );
                    const memberSnapshot = await window.getDocs(memberQuery);
                    const memberGroupDoc = memberSnapshot.docs.find((doc) => {
                        const data = doc.data() || {};
                        return data.leaderId !== uid;
                    }) || null;

                    if (memberGroupDoc) {
                        this.uplineGroup = { id: memberGroupDoc.id, ...memberGroupDoc.data() };
                        await window.setDoc(
                            window.doc(window.db, 'goMission_members', uid),
                            { uplineGroupId: memberGroupDoc.id, groupId: memberGroupDoc.id },
                            { merge: true }
                        );
                        if (typeof Groups !== 'undefined') {
                            Groups.currentGroup = this.uplineGroup;
                        }
                    } else {
                        // Final fallback for legacy members arrays that are not queryable by array-contains.
                        const allGroupsSnapshot = await window.getDocs(
                            window.collection(window.db, 'goMission_groups')
                        );
                        const legacyMemberGroupDoc = allGroupsSnapshot.docs.find((doc) => {
                            const data = doc.data() || {};
                            return data.leaderId !== uid && this.isUserMemberInGroupData(data, uid);
                        }) || null;

                        if (legacyMemberGroupDoc) {
                            this.uplineGroup = { id: legacyMemberGroupDoc.id, ...legacyMemberGroupDoc.data() };
                            await window.setDoc(
                                window.doc(window.db, 'goMission_members', uid),
                                { uplineGroupId: legacyMemberGroupDoc.id, groupId: legacyMemberGroupDoc.id },
                                { merge: true }
                            );
                            if (typeof Groups !== 'undefined') {
                                Groups.currentGroup = this.uplineGroup;
                            }
                        }
                    }
                } catch (memberRecoveryError) {
                    console.warn('[MyGroups] Member recovery query failed:', memberRecoveryError);
                }
            }
            
            // Load downline groups (where user is leader)
            const downlineQuery = window.query(
                window.collection(window.db, 'goMission_groups'),
                window.where('leaderId', '==', uid)
            );
            const downlineSnapshot = await window.getDocs(downlineQuery);
            this.downlineGroups = downlineSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            // Load guest groups (where user is in guests array)
            const guestGroupMap = new Map();
            const declaredGuestGroupIds = this.extractIdList(userData.guestGroups);
            const declaredGuestGroupMeta = (userData.guestGroupMeta && typeof userData.guestGroupMeta === 'object')
                ? userData.guestGroupMeta
                : {};

            if (declaredGuestGroupIds.length > 0) {
                for (const groupId of declaredGuestGroupIds) {
                    try {
                        const guestGroupDoc = await window.getDoc(
                            window.doc(window.db, 'goMission_groups', groupId)
                        );
                        if (guestGroupDoc.exists()) {
                            const groupData = guestGroupDoc.data();
                            const hasGuestEntries = this.normalizeCollectionEntries(groupData?.guests).length > 0;
                            if (this.isUserGuestInGroupData(groupData, uid) || (!hasGuestEntries && declaredGuestGroupIds.includes(groupId))) {
                                guestGroupMap.set(guestGroupDoc.id, { id: guestGroupDoc.id, ...groupData });
                            }
                        } else {
                            guestGroupMap.set(
                                groupId,
                                this.buildGuestFallbackGroup(groupId, declaredGuestGroupMeta[groupId], uid)
                            );
                        }
                    } catch (e) {
                        console.log('[MyGroups] Error loading guest group:', groupId, e);
                        guestGroupMap.set(
                            groupId,
                            this.buildGuestFallbackGroup(groupId, declaredGuestGroupMeta[groupId], uid)
                        );
                    }
                }
            }

            // Recovery path: always scan for actual guest membership and merge missing cards.
            // This prevents newly approved guest groups from being hidden when profile pointers are stale.
            try {
                const allGroupsSnapshot = await window.getDocs(
                    window.collection(window.db, 'goMission_groups')
                );
                const recoveredGroupIds = [];
                allGroupsSnapshot.forEach((groupDoc) => {
                    const groupData = groupDoc.data();
                    if (this.isUserGuestInGroupData(groupData, uid)) {
                        if (!guestGroupMap.has(groupDoc.id)) {
                            recoveredGroupIds.push(groupDoc.id);
                        }
                        guestGroupMap.set(groupDoc.id, { id: groupDoc.id, ...groupData });
                    }
                });

                const missingPointerIds = recoveredGroupIds
                    .filter((groupId) => !declaredGuestGroupIds.includes(groupId));
                if (missingPointerIds.length > 0) {
                    await window.setDoc(
                        window.doc(window.db, 'goMission_members', uid),
                        { guestGroups: window.arrayUnion(...missingPointerIds) },
                        { merge: true }
                    );
                }
            } catch (scanError) {
                console.warn('[MyGroups] Guest recovery scan failed:', scanError);
            }

            // Keep explicit guest-group pointers visible even when direct group reads are unavailable.
            if (guestGroupMap.size === 0 && declaredGuestGroupIds.length > 0) {
                declaredGuestGroupIds.forEach((groupId) => {
                    guestGroupMap.set(
                        groupId,
                        this.buildGuestFallbackGroup(groupId, declaredGuestGroupMeta[groupId], uid)
                    );
                });
            }

            // Final profile-hints fallback for legacy user documents
            if (!this.uplineGroup && guestGroupMap.size === 0) {
                const hintGroupIds = [
                    userData.uplineGroupId,
                    userData.groupId,
                    userData.activeGroupId,
                    userData.currentGroupId,
                    userData.lastGroupId
                ].filter(Boolean);

                for (const hintGroupId of [...new Set(hintGroupIds)]) {
                    try {
                        const hintDoc = await window.getDoc(
                            window.doc(window.db, 'goMission_groups', hintGroupId)
                        );
                        if (!hintDoc.exists()) continue;
                        const hintData = hintDoc.data() || {};

                        const isGuestByProfile = userData.groupRole === 'guest' || userData.role === 'guest';
                        if (isGuestByProfile) {
                            guestGroupMap.set(hintDoc.id, { id: hintDoc.id, ...hintData });
                        } else {
                            this.uplineGroup = { id: hintDoc.id, ...hintData };
                            if (typeof Groups !== 'undefined') {
                                Groups.currentGroup = this.uplineGroup;
                            }
                        }
                    } catch (hintError) {
                        console.warn('[MyGroups] Hint group recovery failed:', hintGroupId, hintError);
                    }
                }
            }

            this.guestGroups = [...guestGroupMap.values()];

            await this.loadPendingGroupDeletionRequests();
            
            console.log('[MyGroups] Loaded:', {
                upline: this.uplineGroup?.name || 'None',
                downline: this.downlineGroups.length,
                guest: this.guestGroups.length
            });
            this.emitGroupsUpdated('loadGroups');
            
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
            const total = (this.uplineGroup ? 1 : 0) + (this.guestGroups?.length || 0) + this.downlineGroups.length;
            countEl.textContent = `${total} group${total !== 1 ? 's' : ''}`;
        }
    },
    
    /**
     * Count total pending join requests across all downline groups
     */
    countPendingRequests() {
        let total = 0;
        for (const group of this.downlineGroups) {
            total += this.getUnifiedJoinRequests(group).length;
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
        
        this.joinRequestsUnsubscribe = window.onSnapshot(groupsQuery, async (snapshot) => {
            // Update downline groups with latest data
            this.downlineGroups = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            await this.loadPendingGroupDeletionRequests();
            
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
            this.emitGroupsUpdated('snapshot');
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

        // Default to joined groups (upline/guest) when available so newly joined groups are visible immediately.
        if (this.uplineGroup || (this.guestGroups?.length > 0)) this.dashboardTab = 'upline';
        else this.dashboardTab = 'downline';

        // Ensure My Groups detail screen is closed.
        const groupsScreen = document.getElementById('myGroupsScreen');
        if (groupsScreen) groupsScreen.classList.add('hidden');
        this.isOpen = false;

        dashboard.classList.remove('hidden');
        this.isDashboardOpen = true;
        await this.renderDashboard();
    },

    setDashboardTab(tab) {
        const next = tab === 'upline' ? 'upline' : 'downline';
        this.dashboardTab = next;
        if (this.isDashboardOpen) {
            this.renderDashboard();
        }
    },

    updateDashboardTabUI() {
        const downBtn = document.getElementById('missionGroupsTabDownline');
        const upBtn = document.getElementById('missionGroupsTabUpline');
        if (!downBtn || !upBtn) return;

        const applyInactive = (btn) => {
            btn.style.background = 'transparent';
            btn.style.color = 'var(--text-muted)';
            btn.style.boxShadow = 'none';
            btn.setAttribute('aria-selected', 'false');
        };

        const applyActive = (btn) => {
            btn.style.background = 'var(--mission-gold)';
            btn.style.color = 'var(--mission-red-deep)';
            btn.style.boxShadow = '0 10px 18px rgba(251, 191, 36, 0.22)';
            btn.setAttribute('aria-selected', 'true');
        };

        applyInactive(downBtn);
        applyInactive(upBtn);
        if (this.dashboardTab === 'upline') applyActive(upBtn);
        else applyActive(downBtn);
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
     * Normalize join request shape across legacy (pendingRequests) and current (joinRequests)
     */
    normalizeJoinRequest(request, source = 'joinRequests') {
        if (!request || typeof request !== 'object') return null;
        const odId = request.odId || request.uid || null;
        if (!odId) return null;

        return {
            ...request,
            odId,
            uid: odId,
            name: request.name || request.displayName || 'Unknown',
            email: request.email || '',
            photo: request.photo || request.photoURL || '',
            requestedAt: request.requestedAt || request.createdAt || null,
            hasExistingGroup: request.hasExistingGroup === true,
            existingGroupId: request.existingGroupId || null,
            existingGroupName: request.existingGroupName || null,
            existingLeaderName: request.existingLeaderName || null,
            _requestSource: source
        };
    },

    /**
     * Get deduped requests from both joinRequests and pendingRequests
     */
    getUnifiedJoinRequests(group) {
        if (!group) return [];

        const out = [];
        const seen = new Set();
        const pushUnique = (request, source) => {
            const normalized = this.normalizeJoinRequest(request, source);
            if (!normalized || seen.has(normalized.odId)) return;
            seen.add(normalized.odId);
            out.push(normalized);
        };

        const joinRequests = Array.isArray(group.joinRequests) ? group.joinRequests : [];
        const pendingRequests = Array.isArray(group.pendingRequests) ? group.pendingRequests : [];

        joinRequests.forEach((request) => pushUnique(request, 'joinRequests'));
        pendingRequests.forEach((request) => pushUnique(request, 'pendingRequests'));

        return out;
    },

    /**
     * Remove request from both request arrays
     */
    getRequestsAfterRemoval(group, odId) {
        const removeId = String(odId || '');
        const keep = (request) => String(request?.odId || request?.uid || '') !== removeId;

        return {
            joinRequests: (Array.isArray(group?.joinRequests) ? group.joinRequests : []).filter(keep),
            pendingRequests: (Array.isArray(group?.pendingRequests) ? group.pendingRequests : []).filter(keep)
        };
    },

    /**
     * Enrich pending join requests with live member-lock state.
     * Hard rule: if requester already has a different primary upline group,
     * member approval must be disabled (guest-only).
     */
    async enrichJoinRequestsWithMemberLock(requests = [], targetGroupId = null) {
        const safeRequests = Array.isArray(requests) ? requests : [];
        const groupCache = new Map();

        return Promise.all(safeRequests.map(async (request) => {
            const req = { ...request, memberLocked: request?.hasExistingGroup === true };
            const uid = req?.odId || req?.uid || req?.id || null;
            if (!uid || !targetGroupId || !window.db) return req;

            try {
                const memberDoc = await window.getDoc(window.doc(window.db, 'goMission_members', uid));
                const memberData = memberDoc.exists() ? (memberDoc.data() || {}) : {};
                const primaryGroupId = await this.resolvePrimaryMemberGroupIdFromProfile(memberData, uid);
                const hasOtherPrimary = Boolean(primaryGroupId && primaryGroupId !== targetGroupId);

                if (hasOtherPrimary) {
                    req.memberLocked = true;
                    req.hasExistingGroup = true;
                    req.existingGroupId = primaryGroupId;

                    if (!req.existingGroupName || !req.existingLeaderName) {
                        if (!groupCache.has(primaryGroupId)) {
                            const groupDoc = await window.getDoc(window.doc(window.db, 'goMission_groups', primaryGroupId));
                            groupCache.set(primaryGroupId, groupDoc.exists() ? { id: groupDoc.id, ...(groupDoc.data() || {}) } : null);
                        }
                        const existingGroup = groupCache.get(primaryGroupId);
                        if (existingGroup) {
                            req.existingGroupName = req.existingGroupName || existingGroup.name || primaryGroupId;
                            req.existingLeaderName = req.existingLeaderName || existingGroup.leaderName || existingGroup.leaderId || 'Unknown';
                        }
                    }
                }
            } catch (error) {
                console.warn('[MyGroups] Failed to enrich request lock:', uid, error);
            }

            return req;
        }));
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
     * Ensure member profile points to a valid upline before group creation.
     * Fixes cases where user is in members[] but profile pointers are empty/stale.
     */
    async ensureCreationUplineProfilePointer(profile = null) {
        if (!window.currentUser?.uid || !window.db) {
            return { ok: false, reason: 'missing_context', patched: false, targetGroupId: null };
        }

        const uid = window.currentUser.uid;
        const memberProfile = profile || await this.getCurrentMemberData() || {};
        if (this.isNoUplineCreationExempt(memberProfile)) {
            return { ok: true, reason: 'exempt', patched: false, targetGroupId: null };
        }

        const candidateIds = [];
        const profileUpline = typeof memberProfile?.uplineGroupId === 'string' ? memberProfile.uplineGroupId.trim() : '';
        const profileGroup = typeof memberProfile?.groupId === 'string' ? memberProfile.groupId.trim() : '';
        if (profileUpline) candidateIds.push(profileUpline);
        if (profileGroup) candidateIds.push(profileGroup);
        if (this.uplineGroup?.id) candidateIds.push(this.uplineGroup.id);

        let targetGroupId = null;
        for (const groupId of [...new Set(candidateIds.filter(Boolean))]) {
            try {
                const groupDoc = await window.getDoc(window.doc(window.db, 'goMission_groups', groupId));
                if (!groupDoc.exists()) continue;
                const groupData = groupDoc.data() || {};
                if (!groupData.leaderId || groupData.leaderId === uid) continue;
                if (!this.isUserMemberInGroupData(groupData, uid)) continue;
                targetGroupId = groupDoc.id;
                break;
            } catch (error) {
                console.warn('[MyGroups] ensureCreationUplineProfilePointer candidate check failed:', groupId, error);
            }
        }

        if (!targetGroupId) {
            return { ok: false, reason: 'requires_upline_pointer', patched: false, targetGroupId: null };
        }

        const patch = {};
        if (profileUpline !== targetGroupId) patch.uplineGroupId = targetGroupId;
        if (!profileGroup) patch.groupId = targetGroupId;
        if (String(memberProfile?.groupRole || '').toLowerCase() === 'guest') patch.groupRole = 'member';

        if (!Object.keys(patch).length) {
            return { ok: true, reason: 'already_synced', patched: false, targetGroupId };
        }

        try {
            await window.setDoc(
                window.doc(window.db, 'goMission_members', uid),
                patch,
                { merge: true }
            );
            return { ok: true, reason: 'synced', patched: true, targetGroupId };
        } catch (error) {
            console.warn('[MyGroups] ensureCreationUplineProfilePointer patch failed:', error);
            return { ok: false, reason: 'pointer_patch_failed', patched: false, targetGroupId };
        }
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
     * Strict eligibility: must have an upline OR be explicitly authorized/admin.
     */
    hasStrictGroupCreationEligibility(profile) {
        const exemptNoUpline = this.isNoUplineCreationExempt(profile);
        const hasActiveUpline = !!(
            this.uplineGroup
            && this.uplineGroup.id
            && this.uplineGroup.leaderId !== window.currentUser?.uid
        );
        return {
            allowed: exemptNoUpline || hasActiveUpline,
            exemptNoUpline,
            hasActiveUpline
        };
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

        const strict = this.hasStrictGroupCreationEligibility(profile);

        return {
            allowed: !!(groupsEligibility.allowed || strict.allowed),
            reason: groupsEligibility.reason || (strict.allowed ? 'strict_ok' : 'requires_upline'),
            hasActiveUpline: strict.hasActiveUpline,
            exemptNoUpline: strict.exemptNoUpline
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
        this.updateDashboardTabUI();

        const tab = this.dashboardTab || 'downline';
        const allGroups = [];
        if (tab === 'upline') {
            if (this.uplineGroup) allGroups.push({ ...this.uplineGroup, role: 'upline' });
            this.guestGroups.forEach((group) => allGroups.push({ ...group, role: 'guest' }));
        } else {
            this.downlineGroups.forEach((group) => allGroups.push({ ...group, role: 'downline' }));
        }

        const uniqueGroups = [];
        const seen = new Set();
        for (const group of allGroups) {
            if (!group?.id || seen.has(group.id)) continue;
            seen.add(group.id);
            uniqueGroups.push(group);
        }

        const groupIds = uniqueGroups.map((group) => group.id);
        const meetingData = await this.getDashboardMeetingData(groupIds);

        const statusListEl = document.getElementById('missionGroupsStatusList');

        await this.renderDashboardActions();

        if (!statusListEl) return;

        if (uniqueGroups.length === 0) {
            const emptyLabel = tab === 'upline' ? 'No upline or guest group yet.' : 'No downline groups yet.';
            statusListEl.innerHTML = `
                <div class="mission-groups-status-item p-4">
                    <p class="text-[var(--text-muted)] text-sm">${emptyLabel}</p>
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
            const meetingLock = this.getGroupMeetingLockState(group);
            const pendingRequestsCount = this.getUnifiedJoinRequests(group).length;
            const pendingDeleteRequest = (isLeaderOfGroup && group.role === 'downline')
                ? this.pendingGroupDeletionRequestsById?.[group.id]
                : null;
            const hasPendingDelete = !!pendingDeleteRequest;

            const last = meetingData.perGroupLastMeeting[group.id];
            const lastLine = last
                ? `${this.formatMeetingDate(last.date)} • ${last.attended ? 'You attended' : 'You missed'}`
                : 'No recorded meeting yet';

            const memberCount = this.normalizeCollectionEntries(group.members).length;

            return `
                <div class="mission-groups-status-item p-4">
                    <div class="flex items-start justify-between gap-2">
                        <div>
                            <p class="font-bold text-[var(--text-color)]">${this.escapeHtml(group.name || 'Mission Group')}</p>
                            <p class="text-xs ${roleColor} uppercase tracking-wider mt-1">${roleLabel}</p>
                        </div>
                        <div class="flex items-start gap-2">
                            ${isLeaderOfGroup && group.role === 'downline' ? `
                                <button onclick="window.MyGroups.showGroupMenu('${groupIdForJs}')"
                                        class="shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-lg border border-[var(--card-border)] text-[var(--text-muted)] hover:border-[var(--mission-gold)]/40 hover:text-[var(--mission-gold)] transition-colors"
                                        title="Group options"
                                        aria-label="Group options">
                                    •••
                                </button>
                            ` : ''}
                            <span class="text-xs text-[var(--text-muted)] whitespace-nowrap">${memberCount}/12 members</span>
                        </div>
                    </div>
                    <div class="mt-3 text-xs text-[var(--text-muted)] space-y-1.5">
                        <p>📅 ${this.escapeHtml(schedule)}</p>
                        <p>✅ ${this.escapeHtml(lastLine)}</p>
                        ${isLeaderOfGroup && pendingRequestsCount > 0 ? `
                            <p class="text-[var(--mission-gold)] font-semibold">🔔 ${pendingRequestsCount} request${pendingRequestsCount === 1 ? '' : 's'} pending</p>
                        ` : ''}
                        ${hasPendingDelete ? `
                            <p class="text-[var(--mission-red-bright)] font-semibold">🗑️ Delete request pending admin approval</p>
                        ` : ''}
                        ${meetingLock.locked ? `
                            <p class="text-[var(--mission-red-bright)] font-semibold">🚫 Meeting locked: ${this.escapeHtml(meetingLock.reason || 'Join a valid upline group first')}</p>
                        ` : ''}
                    </div>
                    ${isLeaderOfGroup ? `
                    <div class="mt-4 grid grid-cols-4 gap-2">
                        <button onclick="window.MyGroups.showInviteCode('${groupIdForJs}')"
                                class="flex flex-col items-center justify-center gap-0.5 px-2 py-2 rounded-lg text-[10px] font-bold border bg-[var(--input-bg)] text-[var(--mission-gold)] border-[var(--mission-gold)]/35 hover:bg-[var(--mission-gold)]/10 transition-colors"
                                title="Generate Invite Code"
                                aria-label="Generate Invite Code">
                            <span class="text-base leading-none">🔑</span>
                            <span>Invite</span>
                        </button>
                        <button onclick="window.MyGroups.openGroupChat('${groupIdForJs}')"
                                class="flex flex-col items-center justify-center gap-0.5 px-2 py-2 rounded-lg text-[10px] font-bold border bg-[var(--input-bg)] text-[var(--mission-gold)] border-[var(--mission-gold)]/35 hover:bg-[var(--mission-gold)]/10 transition-colors"
                                title="Chat"
                                aria-label="Chat">
                            <span class="text-base leading-none">💬</span>
                            <span>Chat</span>
                        </button>
                        <button onclick="window.MyGroups.viewGroupDetails('${groupIdForJs}')"
                                class="relative flex flex-col items-center justify-center gap-0.5 px-2 py-2 rounded-lg text-[10px] font-bold border bg-[var(--input-bg)] text-[var(--text-color)] border-[var(--card-border)] hover:border-[var(--mission-gold)]/40 transition-colors"
                                title="View & Approve"
                                aria-label="View & Approve">
                            <span class="text-base leading-none">👁</span>
                            <span>View</span>
                            ${pendingRequestsCount > 0 ? `
                                <span class="absolute -top-1 -right-1 z-10 bg-red-500 text-white text-[10px] font-black rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 border border-white/80">
                                    ${pendingRequestsCount}
                                </span>
                            ` : ''}
                        </button>
                        <button onclick="window.MyGroups.handleMeetingAction('${groupIdForJs}', true)"
                                class="flex flex-col items-center justify-center gap-0.5 px-2 py-2 rounded-lg text-[10px] font-bold border transition-colors ${isMeetingNow
                                    ? 'bg-green-600 text-white border-green-500 shadow-[0_0_16px_rgba(34,197,94,0.35)]'
                                    : 'bg-[var(--input-bg)] text-[var(--text-color)] border-[var(--card-border)] hover:border-[var(--mission-gold)]/40'} ${meetingLock.locked ? '!bg-[var(--mission-red-bright)]/15 !text-[var(--mission-red-bright)] !border-[var(--mission-red-bright)]/40' : ''}"
                                title="${meetingLock.locked ? 'Meeting locked' : (isMeetingNow ? 'Join Meeting (Live)' : 'Join Meeting')}"
                                aria-label="${meetingLock.locked ? 'Meeting locked' : (isMeetingNow ? 'Join Meeting (Live)' : 'Join Meeting')}">
                            <span class="text-base leading-none">🎥</span>
                            <span>${meetingLock.locked ? 'Locked' : (isMeetingNow ? 'Live' : 'Join')}</span>
                        </button>
                    </div>
                    ` : `
                    <div class="mt-4 grid ${group.role === 'upline' ? 'grid-cols-3' : 'grid-cols-2'} gap-2">
                        <button onclick="window.MyGroups.handleMeetingAction('${groupIdForJs}', false)"
                                class="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold border transition-colors ${isMeetingNow
                                    ? 'bg-green-600 text-white border-green-500 shadow-[0_0_16px_rgba(34,197,94,0.35)]'
                                    : 'bg-[var(--input-bg)] text-[var(--text-color)] border-[var(--card-border)] hover:border-[var(--mission-gold)]/40'} ${meetingLock.locked ? '!bg-[var(--mission-red-bright)]/15 !text-[var(--mission-red-bright)] !border-[var(--mission-red-bright)]/40' : ''}">
                            <span>🎥</span>
                            <span>${meetingLock.locked ? 'Meeting Locked' : (isMeetingNow ? 'Join Meeting (Live)' : 'Join Meeting')}</span>
                        </button>
                        <button onclick="window.MyGroups.openGroupChat('${groupIdForJs}')"
                                class="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold border bg-[var(--input-bg)] text-[var(--mission-gold)] border-[var(--mission-gold)]/35 hover:bg-[var(--mission-gold)]/10 transition-colors">
                            <span>💬</span>
                            <span>Chat</span>
                        </button>
                        ${group.role === 'upline' ? `
                        <button onclick="window.MyGroups.viewGroupDetails('${groupIdForJs}')"
                                class="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold border bg-[var(--input-bg)] text-[var(--text-color)] border-[var(--card-border)] hover:border-[var(--mission-gold)]/40 transition-colors">
                            <span>👁</span>
                            <span>View</span>
                        </button>
                        ` : ''}
                    </div>
                    `}
                </div>
            `;
        }).join('');
    },

    resolveDate(value) {
        if (!value) return null;
        if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
        if (typeof value?.toDate === 'function') {
            const date = value.toDate();
            return Number.isNaN(date?.getTime?.()) ? null : date;
        }
        if (typeof value === 'object' && typeof value.seconds === 'number') {
            const date = new Date(value.seconds * 1000);
            return Number.isNaN(date.getTime()) ? null : date;
        }
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? null : date;
    },

    escapeForJs(value) {
        return String(value ?? '')
            .replace(/\\/g, '\\\\')
            .replace(/'/g, "\\'")
            .replace(/\r/g, '')
            .replace(/\n/g, '\\n');
    },

    getFirstName(member) {
        const name = String(member?.fullName || member?.displayName || member?.name || member?.email || '').trim();
        return name.split(/\s+/)[0] || 'kapatid';
    },

    getMemberDisplayName(memberData = {}) {
        return memberData.displayName || memberData.fullName || memberData.name || memberData.email?.split('@')[0] || 'Unknown';
    },

    getMemberPhoto(member = {}) {
        const name = this.getMemberDisplayName(member);
        return member.photoURL || member.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=4a0404&color=fbbf24`;
    },

    showToast(message, duration = 2600) {
        if (!message) return;
        if (typeof Notifications !== 'undefined' && typeof Notifications.showToast === 'function') {
            Notifications.showToast({
                title: 'Mission Group',
                body: message,
                icon: 'info',
                duration
            });
            return;
        }

        const toast = document.createElement('div');
        toast.className = 'fixed bottom-20 left-1/2 -translate-x-1/2 px-5 py-3 rounded-full bg-[var(--mission-red-bright)] text-white text-sm font-semibold z-[120] shadow-lg';
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), duration);
    },

    getGroupDashboardMemberStats(memberId, memberData = {}, meetingStatsByMember = {}, activitySignals = {}) {
        const thresholds = this.GROUP_DASHBOARD_THRESHOLDS;
        const now = Date.now();
        const dayMs = 24 * 60 * 60 * 1000;
        const lastActiveDate = this.resolveDate(memberData.lastActive);
        const lastDevotionDate = this.resolveDate(memberData?.bibleProgress?.lastReadAt);
        const joinedAtDate = this.resolveDate(memberData.joinedAt || memberData.createdAt);
        const lastCheckIn = Array.isArray(memberData.leaderCheckIns) ? memberData.leaderCheckIns[memberData.leaderCheckIns.length - 1] : null;
        const lastCheckInDate = this.resolveDate(lastCheckIn?.date);
        const devotionStreak = Math.max(0, Number(memberData?.bibleProgress?.currentStreak || 0));
        const meetingStats = meetingStatsByMember?.[memberId] || {};
        const sharedSignals = activitySignals?.[memberId] || {};

        const daysSinceActive = lastActiveDate ? Math.floor((now - lastActiveDate.getTime()) / dayMs) : 999;
        const daysSinceDevotion = lastDevotionDate ? Math.floor((now - lastDevotionDate.getTime()) / dayMs) : 999;
        const daysSinceJoined = joinedAtDate ? Math.floor((now - joinedAtDate.getTime()) / dayMs) : 0;
        const daysSinceCheckIn = lastCheckInDate ? Math.floor((now - lastCheckInDate.getTime()) / dayMs) : 999;

        return {
            daysSinceActive,
            devotionStreak,
            daysSinceDevotion,
            attendedRecent: Number(meetingStats.attendedRecent || 0),
            missedRecent: Number(meetingStats.missedRecent || 0),
            consecutiveMisses: Number(meetingStats.consecutiveMisses || 0),
            lastAttendedAt: meetingStats.lastAttendedAt || null,
            daysSinceJoined,
            daysSinceCheckIn,
            isNew: daysSinceJoined <= thresholds.NEW_MEMBER_DAYS,
            sharedDevotions: Number(sharedSignals.sharedDevotions || 0),
            sharedInsights: Number(sharedSignals.sharedInsights || 0),
            prayerRequestsShared: Number(sharedSignals.prayerRequestsShared || 0),
            prayedForOthers: Number(sharedSignals.prayedForOthers || 0),
            needsBibleNudge: daysSinceDevotion >= thresholds.NO_DEVOTION_DAYS,
            needsAttendanceFollowUp: Number(meetingStats.consecutiveMisses || 0) >= thresholds.MISSED_MEETINGS,
            isSpirituallyActive: daysSinceDevotion <= 2 && (
                devotionStreak >= 3 ||
                Number(sharedSignals.sharedInsights || 0) > 0 ||
                Number(sharedSignals.prayerRequestsShared || 0) > 0 ||
                Number(sharedSignals.prayedForOthers || 0) > 0
            )
        };
    },

    getGroupAttentionAlerts(member) {
        const thresholds = this.GROUP_DASHBOARD_THRESHOLDS;
        const stats = member?.stats || {};
        const alerts = [];

        if (stats.daysSinceActive >= thresholds.INACTIVE_DAYS) {
            alerts.push({
                type: 'inactive',
                priority: 3,
                tone: 'bg-[#fff2f2] text-[#c45b5b] border-[#f0c5c5]',
                label: stats.daysSinceActive >= 999
                    ? 'No app activity recorded'
                    : `Inactive for ${stats.daysSinceActive} day${stats.daysSinceActive === 1 ? '' : 's'}`
            });
        }

        if (stats.daysSinceDevotion >= thresholds.NO_DEVOTION_DAYS) {
            alerts.push({
                type: 'no_devotion',
                priority: 2,
                tone: 'bg-[#fff7e3] text-[#c19200] border-[#f1d79a]',
                label: stats.daysSinceDevotion >= 999
                    ? 'No recent Bible reading found'
                    : `${stats.daysSinceDevotion} day${stats.daysSinceDevotion === 1 ? '' : 's'} since reading`
            });
        }

        if ((stats.consecutiveMisses || 0) >= thresholds.MISSED_MEETINGS) {
            alerts.push({
                type: 'missed_meetings',
                priority: 3,
                tone: 'bg-[#fff0ea] text-[#c76a61] border-[#efc0ba]',
                label: `${stats.consecutiveMisses} missed meeting${stats.consecutiveMisses === 1 ? '' : 's'} in a row`
            });
        }

        if (stats.isNew) {
            alerts.push({
                type: 'new_member',
                priority: 1,
                tone: 'bg-[#eef7ff] text-[#5291b8] border-[#cbe1ee]',
                label: 'New member needing follow-up'
            });
        }

        return alerts.sort((a, b) => b.priority - a.priority);
    },

    getGroupDetailStreakLabel(stats = {}) {
        if (stats.devotionStreak >= 7) return '7-day rhythm';
        if (stats.devotionStreak >= 3) return '3-day rhythm';
        if (stats.devotionStreak > 0) return 'Building rhythm';
        return 'Start today';
    },

    renderGroupDetailStreakGraphic(stats = {}) {
        const streak = Math.max(0, Number(stats.devotionStreak || 0));
        const filled = Math.min(7, streak);
        const filledClass = streak >= 7
            ? 'bg-amber-400'
            : (streak >= 3 ? 'bg-green-400' : 'bg-[var(--mission-gold)]/40');
        const label = this.getGroupDetailStreakLabel(stats);

        return `
            <div class="mt-2">
                <div class="flex items-center justify-between gap-2">
                    <span class="text-[10px] uppercase tracking-[0.14em] text-[var(--text-muted)]">Bible rhythm</span>
                    <span class="text-[10px] font-bold ${streak >= 7 ? 'text-amber-300' : (streak >= 3 ? 'text-green-300' : 'text-[var(--mission-gold)]')}">${this.escapeHtml(label)}</span>
                </div>
                <div class="mt-1 grid grid-cols-7 gap-1">
                    ${Array.from({ length: 7 }).map((_, index) => `
                        <span class="h-2 rounded-full ${index < filled ? filledClass : 'bg-[var(--input-bg)] border border-[var(--card-border)]/60'}"></span>
                    `).join('')}
                </div>
            </div>
        `;
    },

    getGroupCareSegments(members = []) {
        const encourageBible = members
            .filter((member) => member.stats?.needsBibleNudge)
            .sort((a, b) => (b.stats?.daysSinceDevotion || 0) - (a.stats?.daysSinceDevotion || 0));

        const attendanceFollowUp = members
            .filter((member) => member.stats?.needsAttendanceFollowUp)
            .sort((a, b) => (b.stats?.consecutiveMisses || 0) - (a.stats?.consecutiveMisses || 0));

        const affirmActive = members
            .filter((member) => member.stats?.isSpirituallyActive)
            .sort((a, b) => {
                if ((b.stats?.devotionStreak || 0) !== (a.stats?.devotionStreak || 0)) {
                    return (b.stats?.devotionStreak || 0) - (a.stats?.devotionStreak || 0);
                }
                return (b.stats?.prayedForOthers || 0) - (a.stats?.prayedForOthers || 0);
            });

        return { encourageBible, attendanceFollowUp, affirmActive };
    },

    formatGroupBibleStatus(stats = {}) {
        const days = Number(stats.daysSinceDevotion || 0);
        if (days >= 999) return 'No recent Bible reading';
        if (days <= 0) return 'Read today';
        if (days === 1) return 'Read yesterday';
        return `Read ${days} days ago`;
    },

    formatGroupActivityStatus(stats = {}) {
        const days = Number(stats.daysSinceActive || 0);
        if (days >= 999) return 'No recent app activity';
        if (days <= 0) return 'Active today';
        if (days === 1) return 'Active yesterday';
        return `Active ${days} days ago`;
    },

    formatGroupMeetingStatus(stats = {}) {
        if (stats.lastAttendedAt) {
            const formatted = this.resolveDate(stats.lastAttendedAt)?.toLocaleDateString();
            return formatted ? `Last meeting ${formatted}` : 'Recent meeting attended';
        }
        if ((stats.consecutiveMisses || 0) > 0) {
            return `${stats.consecutiveMisses} missed meeting${stats.consecutiveMisses === 1 ? '' : 's'} in a row`;
        }
        return 'No recorded meeting yet';
    },

    getGroupDashboardActionMeta(mode = 'encourage_bible') {
        return {
            encourage_bible: {
                label: 'Send Message',
                buttonClass: 'bg-[#f7cc00] text-[#3f1400]',
                labelClass: 'text-[#c19200]'
            },
            check_attendance: {
                label: 'Send Message',
                buttonClass: 'bg-[#9d0500] text-white',
                labelClass: 'text-[#d27474]'
            },
            affirm_active: {
                label: 'Send Message',
                buttonClass: 'bg-[#35b16f] text-white',
                labelClass: 'text-[#3aa76c]'
            }
        }[mode] || {
            label: 'Send Message',
            buttonClass: 'bg-white text-[#3f1400] border border-[#e7d6c9]',
            labelClass: 'text-[#8a7a70]'
        };
    },

    getGroupMemberActionMode(member) {
        if (member?.stats?.isSpirituallyActive) return 'affirm_active';
        if (member?.stats?.needsAttendanceFollowUp) return 'check_attendance';
        return 'encourage_bible';
    },

    getGroupCareTips(member, mode = 'encourage_bible') {
        const firstName = this.getFirstName(member);
        const template = this.GROUP_CARE_TEMPLATES[mode];
        const preview = template?.buildMessage(member) || `${firstName}, I am praying for you today.`;

        return {
            encourage_bible: {
                title: `Encourage ${firstName} back to the Bible`,
                intro: 'Keep the tone gentle and specific so the message feels like an invitation, not pressure.',
                accentClass: 'border-[#f2d277] bg-[linear-gradient(155deg,rgba(255,243,199,0.98),rgba(255,255,255,0.98))]',
                badgeClass: 'bg-[#fff4c2] text-[#a36a00] border border-[#f0d06f]',
                buttonClass: 'bg-[#f7cc00] text-[#3f1400]',
                tips: [
                    'Mention one simple next step, like reading one chapter today.',
                    'Speak with warmth so they feel invited back to God, not judged.',
                    'Point them toward a fresh start today instead of reminding them of failure.'
                ],
                preview
            },
            check_attendance: {
                title: `Follow up with ${firstName}`,
                intro: 'Lead with care first. The goal is to help them feel seen before you ask about attendance.',
                accentClass: 'border-[#f0c4c4] bg-[linear-gradient(155deg,rgba(255,243,243,0.98),rgba(255,255,255,0.98))]',
                badgeClass: 'bg-[#ffe7e7] text-[#b44242] border border-[#f0c4c4]',
                buttonClass: 'bg-[#9d0500] text-white',
                tips: [
                    'Let them know they were missed in the group.',
                    'Ask how they are doing before talking about meetings.',
                    'Keep the first message light, warm, and easy to reply to.'
                ],
                preview
            },
            affirm_active: {
                title: `Affirm ${firstName} in chat`,
                intro: 'Be specific about the growth you are seeing so the encouragement strengthens the habit.',
                accentClass: 'border-[#bfe4cc] bg-[linear-gradient(155deg,rgba(241,252,246,0.98),rgba(255,255,255,0.98))]',
                badgeClass: 'bg-[#ddf7e7] text-[#22895d] border border-[#bfe4cc]',
                buttonClass: 'bg-[#35b16f] text-white',
                tips: [
                    'Affirm one concrete sign of growth you have noticed.',
                    'Celebrate consistency more than performance.',
                    'Encourage them to keep sharing what God is doing in their life.'
                ],
                preview
            }
        }[mode] || {
            title: `Message ${firstName}`,
            intro: 'Open with warmth and make the next step easy.',
            accentClass: 'border-[#eadcd2] bg-white',
            badgeClass: 'bg-[#f7f1ea] text-[#7b695f] border border-[#eadcd2]',
            buttonClass: 'bg-[#6d0707] text-white',
            tips: [
                'Lead with care.',
                'Keep the message simple.',
                'Make it easy for them to reply.'
            ],
            preview
        };
    },

    isGroupDashboardSectionExpanded(sectionId, defaultExpanded = false) {
        const sectionState = this.activeGroupDetailContext?.sectionState || {};
        if (typeof sectionState[sectionId] === 'boolean') {
            return sectionState[sectionId];
        }
        return defaultExpanded;
    },

    toggleGroupDashboardSection(sectionId) {
        const panel = document.querySelector(`[data-group-section-panel="${sectionId}"]`);
        const icon = document.querySelector(`[data-group-section-icon="${sectionId}"]`);
        if (!panel) return;

        const isExpanded = !panel.classList.contains('hidden');
        const nextExpanded = !isExpanded;
        panel.classList.toggle('hidden', !nextExpanded);
        if (icon) icon.textContent = nextExpanded ? '−' : '+';

        if (!this.activeGroupDetailContext) this.activeGroupDetailContext = {};
        if (!this.activeGroupDetailContext.sectionState) this.activeGroupDetailContext.sectionState = {};
        this.activeGroupDetailContext.sectionState[sectionId] = nextExpanded;
    },

    openGroupDashboardSection(sectionId) {
        const panel = document.querySelector(`[data-group-section-panel="${sectionId}"]`);
        const section = document.querySelector(`[data-group-section-root="${sectionId}"]`);
        if (panel?.classList.contains('hidden')) {
            this.toggleGroupDashboardSection(sectionId);
        }
        section?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },

    renderGroupDashboardSection(sectionId, {
        title = 'Section',
        count = '',
        summary = '',
        shellClass = 'border-[var(--card-border)] bg-[var(--card-bg)]',
        titleClass = 'text-[var(--mission-gold)]',
        countClass = 'bg-white text-[#6f5d54]',
        defaultExpanded = false,
        body = ''
    } = {}) {
        const expanded = this.isGroupDashboardSectionExpanded(sectionId, defaultExpanded);
        return `
            <section data-group-section-root="${sectionId}" class="rounded-[28px] border ${shellClass} shadow-[0_16px_40px_rgba(90,48,26,0.05)] overflow-hidden">
                <button type="button"
                        onclick="window.MyGroups.toggleGroupDashboardSection('${this.escapeForJs(sectionId)}')"
                        class="w-full p-4 sm:p-5 text-left flex items-start justify-between gap-3">
                    <div class="min-w-0">
                        <p class="text-[11px] uppercase tracking-[0.18em] ${titleClass}">${this.escapeHtml(title)}</p>
                        ${summary ? `<p class="mt-2 text-sm leading-relaxed text-[#6b5b54]">${this.escapeHtml(summary)}</p>` : ''}
                    </div>
                    <div class="shrink-0 flex items-center gap-2">
                        ${count !== '' ? `<span class="min-w-[34px] h-[34px] rounded-full px-3 inline-flex items-center justify-center text-sm font-black ${countClass}">${this.escapeHtml(count)}</span>` : ''}
                        <span data-group-section-icon="${sectionId}" class="w-8 h-8 rounded-full border border-black/8 bg-white/75 text-[#6b5b54] inline-flex items-center justify-center text-lg font-semibold">
                            ${expanded ? '−' : '+'}
                        </span>
                    </div>
                </button>
                <div data-group-section-panel="${sectionId}" class="${expanded ? '' : 'hidden'} px-4 sm:px-5 pb-5">
                    ${body}
                </div>
            </section>
        `;
    },

    buildGroupCareRow(groupId, member, mode = 'encourage_bible') {
        const stats = member?.stats || {};
        const config = {
            encourage_bible: {
                title: 'Encourage Bible Reading',
                description: stats.daysSinceDevotion >= 999
                    ? 'No recent Bible reading found'
                    : `${stats.daysSinceDevotion} day${stats.daysSinceDevotion === 1 ? '' : 's'} since last reading`,
                accent: 'text-amber-300'
            },
            check_attendance: {
                title: 'Check Attendance',
                description: `${stats.consecutiveMisses || 0} missed meeting${(stats.consecutiveMisses || 0) === 1 ? '' : 's'} in a row`,
                accent: 'text-rose-300'
            },
            affirm_active: {
                title: 'Affirm Active Member',
                description: `${stats.sharedInsights || 0} insight share${(stats.sharedInsights || 0) === 1 ? '' : 's'} • ${stats.prayerRequestsShared || 0} prayer request${(stats.prayerRequestsShared || 0) === 1 ? '' : 's'}`,
                accent: 'text-green-300'
            }
        }[mode];
        const actionMeta = this.getGroupDashboardActionMeta(mode);
        const secondaryLine = mode === 'affirm_active'
            ? `${stats.sharedInsights || 0} insight share${(stats.sharedInsights || 0) === 1 ? '' : 's'} • ${stats.prayerRequestsShared || 0} prayer request${(stats.prayerRequestsShared || 0) === 1 ? '' : 's'}`
            : `${this.formatGroupBibleStatus(stats)} • ${this.formatGroupMeetingStatus(stats)}`;

        return `
            <div class="rounded-[24px] border border-white/80 bg-white/80 p-4 shadow-[0_10px_28px_rgba(89,49,22,0.06)]">
                <div class="flex flex-col gap-3">
                    <div class="flex items-start gap-3 min-w-0">
                        <img src="${this.getMemberPhoto(member)}" class="w-12 h-12 rounded-full border-2 border-white object-cover shadow-sm shrink-0">
                        <div class="min-w-0 flex-1">
                            <p class="text-[1.08rem] font-black text-[#6d0707] leading-tight break-words">${this.escapeHtml(member.fullName || 'Unknown')}</p>
                            <p class="mt-1 text-[11px] uppercase tracking-[0.16em] ${actionMeta.labelClass}">${this.escapeHtml(config.title)}</p>
                            <p class="mt-2 text-[15px] leading-6 text-[#655751] break-words">${this.escapeHtml(config.description)}</p>
                            <p class="mt-1 text-[13px] leading-5 text-[#84736a] break-words">${this.escapeHtml(secondaryLine)}</p>
                        </div>
                    </div>
                    <div class="flex justify-start sm:justify-end">
                        <button onclick="window.MyGroups.sendGroupCareMessage('${this.escapeForJs(groupId)}', '${this.escapeForJs(member.id)}', '${mode}')"
                                class="w-full sm:w-auto px-4 py-2.5 rounded-full text-sm font-black shadow-sm ${actionMeta.buttonClass}">
                            ${this.escapeHtml(actionMeta.label)}
                        </button>
                    </div>
                </div>
                <div class="mt-3 flex flex-wrap gap-2">
                    ${stats.devotionStreak >= 7 ? '<span class="text-[11px] px-2.5 py-1 rounded-full bg-[#ffe8a3] text-[#8f5c00] border border-[#f1d279]">7-day streak</span>' : ''}
                    ${stats.devotionStreak >= 3 && stats.devotionStreak < 7 ? '<span class="text-[11px] px-2.5 py-1 rounded-full bg-[#dcf9e6] text-[#18804f] border border-[#bfe5cc]">3-day streak</span>' : ''}
                    ${stats.prayedForOthers > 0 ? `<span class="text-[11px] px-2.5 py-1 rounded-full bg-[#e1f2ff] text-[#3c93c7] border border-[#b9ddf2]">Praying for ${stats.prayedForOthers}</span>` : ''}
                    ${stats.attendedRecent > 0 ? `<span class="text-[11px] px-2.5 py-1 rounded-full bg-[#ddf7ef] text-[#24936f] border border-[#b5e0d2]">${stats.attendedRecent} recent meeting${stats.attendedRecent === 1 ? '' : 's'}</span>` : ''}
                </div>
                ${this.renderGroupDetailStreakGraphic(stats)}
            </div>
        `;
    },

    buildGroupAttentionRow(groupId, member) {
        const alerts = this.getGroupAttentionAlerts(member);
        const primaryAction = member?.stats?.needsAttendanceFollowUp ? 'check_attendance' : 'encourage_bible';
        const actionMeta = this.getGroupDashboardActionMeta(primaryAction);
        const stats = member?.stats || {};
        const summaryLine = `${this.formatGroupActivityStatus(stats)} • ${this.formatGroupMeetingStatus(stats)}`;

        return `
            <div class="rounded-[24px] border border-[#efc3c3] bg-white/82 p-4 shadow-[0_10px_28px_rgba(123,44,44,0.05)]">
                <div class="flex flex-col gap-3">
                    <div class="flex items-start gap-3 min-w-0">
                        <img src="${this.getMemberPhoto(member)}" class="w-11 h-11 rounded-full border-2 border-white object-cover shadow-sm shrink-0">
                        <div class="min-w-0 flex-1">
                            <p class="text-[1.05rem] font-black text-[#6d0707] leading-tight break-words">${this.escapeHtml(member.fullName || 'Unknown')}</p>
                            <p class="mt-2 text-[15px] leading-6 text-[#655751] break-words">${this.escapeHtml(summaryLine)}</p>
                        </div>
                    </div>
                    <div class="flex flex-wrap gap-2">
                        ${alerts.map((alert) => `
                            <span class="px-2.5 py-1 rounded-full border text-[11px] font-semibold ${alert.tone}">
                                ${this.escapeHtml(alert.label)}
                            </span>
                        `).join('')}
                    </div>
                    <div class="flex justify-start sm:justify-end">
                        <button onclick="window.MyGroups.sendGroupCareMessage('${this.escapeForJs(groupId)}', '${this.escapeForJs(member.id)}', '${primaryAction}')"
                                class="w-full sm:w-auto px-4 py-2.5 rounded-full text-sm font-black shadow-sm ${actionMeta.buttonClass}">
                            ${this.escapeHtml(actionMeta.label)}
                        </button>
                    </div>
                </div>
            </div>
        `;
    },

    buildCompactGroupMemberRow(groupId, member) {
        const stats = member?.stats || {};
        const actionMode = this.getGroupMemberActionMode(member);
        const actionMeta = this.getGroupDashboardActionMeta(actionMode);
        const summaryBits = [
            this.formatGroupBibleStatus(stats),
            this.formatGroupMeetingStatus(stats)
        ].filter(Boolean);

        return `
            <div class="rounded-[24px] border ${member.isLeader ? 'border-[#f0dba3] bg-[#fff7dc]' : 'border-[#eadcd2] bg-white/82'} p-4 shadow-[0_10px_28px_rgba(89,49,22,0.04)]">
                <div class="flex items-start justify-between gap-3">
                    <div class="flex items-start gap-3 min-w-0">
                        <img src="${this.getMemberPhoto(member)}" class="w-12 h-12 rounded-full border-2 border-white object-cover shadow-sm">
                        <div class="min-w-0">
                            <div class="flex items-center gap-2 flex-wrap">
                                <p class="text-base font-black text-[#6d0707] truncate">${this.escapeHtml(member.fullName || 'Unknown')}</p>
                                <span class="text-[11px] uppercase tracking-[0.14em] ${member.isLeader ? 'text-[#c19200]' : 'text-[#96867d]'}">${member.isLeader ? 'Leader' : 'Member'}</span>
                            </div>
                            <p class="mt-1 text-sm leading-relaxed text-[#655751]">${this.escapeHtml(summaryBits.join(' • '))}</p>
                            <div class="mt-2 flex flex-wrap gap-2">
                                <span class="text-[11px] text-[#84736a]">🙏 ${stats.prayerRequestsShared || 0} prayer request${(stats.prayerRequestsShared || 0) === 1 ? '' : 's'}</span>
                                <span class="text-[11px] text-[#84736a]">💬 ${stats.sharedInsights || 0} insight share${(stats.sharedInsights || 0) === 1 ? '' : 's'}</span>
                            </div>
                        </div>
                    </div>
                    ${!member.isLeader ? `
                        <button onclick="window.MyGroups.sendGroupCareMessage('${this.escapeForJs(groupId)}', '${this.escapeForJs(member.id)}', '${actionMode}')"
                                class="shrink-0 px-4 py-2.5 rounded-full text-sm font-black shadow-sm ${actionMeta.buttonClass}">
                            Send Message
                        </button>
                    ` : ''}
                </div>
                <div class="mt-3 flex flex-wrap gap-2">
                    ${stats.prayedForOthers > 0 ? `<span class="text-[11px] px-2.5 py-1 rounded-full bg-[#e1f2ff] text-[#3c93c7] border border-[#b9ddf2]">Praying for ${stats.prayedForOthers}</span>` : ''}
                    ${stats.attendedRecent > 0 ? `<span class="text-[11px] px-2.5 py-1 rounded-full bg-[#ddf7ef] text-[#24936f] border border-[#b5e0d2]">${stats.attendedRecent} recent meeting${stats.attendedRecent === 1 ? '' : 's'}</span>` : ''}
                    ${stats.needsAttendanceFollowUp ? '<span class="text-[11px] px-2.5 py-1 rounded-full bg-[#ffe4e4] text-[#d27474] border border-[#f2c4c4]">Needs attendance follow-up</span>' : ''}
                </div>
                ${this.renderGroupDetailStreakGraphic(stats)}
            </div>
        `;
    },

    getThisWeeksFocus(careSegments = {}) {
        if (careSegments.attendanceFollowUp?.length) {
            return {
                mode: 'check_attendance',
                title: 'Check on attendance first',
                description: 'Start with the member who is missing meetings so they feel seen before they drift farther.',
                member: careSegments.attendanceFollowUp[0]
            };
        }

        if (careSegments.encourageBible?.length) {
            return {
                mode: 'encourage_bible',
                title: 'Restart Bible rhythm',
                description: 'One simple encouragement can help this member open the Bible again this week.',
                member: careSegments.encourageBible[0]
            };
        }

        if (careSegments.affirmActive?.length) {
            return {
                mode: 'affirm_active',
                title: 'Affirm spiritual momentum',
                description: 'Encourage the member who is already responding to God so the habit becomes stronger.',
                member: careSegments.affirmActive[0]
            };
        }

        return null;
    },

    async loadGroupDetailDashboardData(group) {
        if (!group?.id || !window.db) {
            return {
                members: [],
                careMembers: [],
                careSegments: { encourageBible: [], attendanceFollowUp: [], affirmActive: [] },
                prayerList: [],
                meetings: [],
                health: {},
                weeklyFocus: null
            };
        }

        const normalizedMemberIds = this.normalizeCollectionEntries(group.members)
            .map((entry) => this.getEntityUserId(entry))
            .filter(Boolean);
        if (group.leaderId && !normalizedMemberIds.includes(group.leaderId)) {
            normalizedMemberIds.unshift(group.leaderId);
        }
        const uniqueMemberIds = [...new Set(normalizedMemberIds)];

        const [memberProfiles, meetingsSnapshot, chatsSnapshot, prayerSnapshot] = await Promise.all([
            Promise.all(uniqueMemberIds.map(async (memberId) => {
                try {
                    const snap = await window.getDoc(window.doc(window.db, 'goMission_members', memberId));
                    return { id: memberId, data: snap.exists() ? (snap.data() || {}) : {} };
                } catch (error) {
                    console.warn('[MyGroups] Failed loading member profile:', memberId, error);
                    return { id: memberId, data: {} };
                }
            })),
            window.getDocs(window.query(
                window.collection(window.db, 'goMission_meetings'),
                window.where('groupId', '==', group.id),
                window.limit(24)
            )).catch((error) => {
                console.warn('[MyGroups] Failed loading meetings:', group.id, error);
                return { docs: [] };
            }),
            window.getDocs(window.query(
                window.collection(window.db, 'goMission_chats'),
                window.where('groupId', '==', group.id),
                window.limit(160)
            )).catch((error) => {
                console.warn('[MyGroups] Failed loading chat activity:', group.id, error);
                return { docs: [] };
            }),
            window.getDocs(window.query(
                window.collection(window.db, 'goMission_groups', group.id, 'prayerRequests'),
                window.limit(40)
            )).catch((error) => {
                console.warn('[MyGroups] Failed loading prayer requests:', group.id, error);
                return { docs: [] };
            })
        ]);

        const meetings = (meetingsSnapshot?.docs || [])
            .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
            .sort((a, b) => {
                const aTime = this.resolveDate(a?.startedAt || a?.createdAt || a?.updatedAt || a?.date)?.getTime() || 0;
                const bTime = this.resolveDate(b?.startedAt || b?.createdAt || b?.updatedAt || b?.date)?.getTime() || 0;
                return bTime - aTime;
            });

        const meetingStatsByMember = {};
        uniqueMemberIds.forEach((memberId) => {
            meetingStatsByMember[memberId] = {
                attendedRecent: 0,
                missedRecent: 0,
                consecutiveMisses: 0,
                lastAttendedAt: null
            };
        });

        const recentMeetings = meetings.slice(0, 4);
        uniqueMemberIds.forEach((memberId) => {
            let missChain = 0;
            let chainBroken = false;

            recentMeetings.forEach((meeting) => {
                const attendeeIds = new Set((Array.isArray(meeting?.attendees) ? meeting.attendees : [])
                    .map((entry) => this.getEntityUserId(entry))
                    .filter(Boolean));
                const meetingDate = this.resolveDate(meeting?.startedAt || meeting?.createdAt || meeting?.updatedAt || meeting?.date);

                if (attendeeIds.has(memberId)) {
                    meetingStatsByMember[memberId].attendedRecent += 1;
                    if (!meetingStatsByMember[memberId].lastAttendedAt && meetingDate) {
                        meetingStatsByMember[memberId].lastAttendedAt = meetingDate;
                    }
                    chainBroken = true;
                } else {
                    meetingStatsByMember[memberId].missedRecent += 1;
                    if (!chainBroken) missChain += 1;
                }
            });

            meetingStatsByMember[memberId].consecutiveMisses = missChain;
        });

        const activitySignals = {};
        uniqueMemberIds.forEach((memberId) => {
            activitySignals[memberId] = {
                sharedDevotions: 0,
                sharedInsights: 0,
                prayerRequestsShared: 0,
                prayedForOthers: 0
            };
        });

        (chatsSnapshot?.docs || []).forEach((docSnap) => {
            const data = docSnap.data() || {};
            if (String(data.type || '') !== 'devotion') return;

            const devotion = (data.devotion && typeof data.devotion === 'object') ? data.devotion : {};
            const senderId = String(data.senderId || devotion.uid || data.userId || '').trim();
            if (senderId && activitySignals[senderId]) {
                activitySignals[senderId].sharedDevotions += 1;
                const understanding = String(devotion.understandingText || devotion.reflectionText || devotion.reflection || '').trim();
                const action = String(devotion.actionText || devotion.commitment || '').trim();
                if (understanding || action) activitySignals[senderId].sharedInsights += 1;

                const prayerRequests = Array.isArray(devotion.prayerRequests)
                    ? devotion.prayerRequests.filter((item) => String(item?.text || item || '').trim())
                    : [];
                activitySignals[senderId].prayerRequestsShared += prayerRequests.length;
            }

            const supportMap = (devotion.prayerSupports && typeof devotion.prayerSupports === 'object')
                ? devotion.prayerSupports
                : {};
            Object.values(supportMap).forEach((supportEntries) => {
                if (!Array.isArray(supportEntries)) return;
                supportEntries.forEach((entry) => {
                    const uid = String(entry?.uid || entry?.userId || entry?.id || '').trim();
                    if (uid && activitySignals[uid]) {
                        activitySignals[uid].prayedForOthers += 1;
                    }
                });
            });
        });

        const members = memberProfiles.map(({ id, data }) => {
            const stats = this.getGroupDashboardMemberStats(id, data, meetingStatsByMember, activitySignals);
            return {
                id,
                ...data,
                fullName: this.getMemberDisplayName(data),
                isLeader: id === group.leaderId,
                stats
            };
        }).sort((a, b) => {
            const aAlerts = this.getGroupAttentionAlerts(a).length;
            const bAlerts = this.getGroupAttentionAlerts(b).length;
            if (aAlerts !== bAlerts) return bAlerts - aAlerts;
            return String(a.fullName || '').localeCompare(String(b.fullName || ''));
        });

        const careMembers = members.filter((member) => !member.isLeader);
        const careSegments = this.getGroupCareSegments(careMembers);
        const weeklyFocus = this.getThisWeeksFocus(careSegments);
        const prayerList = (prayerSnapshot?.docs || [])
            .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
            .sort((a, b) => {
                const aTime = this.resolveDate(a?.createdAt || a?.updatedAt)?.getTime() || 0;
                const bTime = this.resolveDate(b?.createdAt || b?.updatedAt)?.getTime() || 0;
                return bTime - aTime;
            });

        const active7d = members.filter((member) => {
            const stats = member.stats || {};
            return stats.daysSinceActive <= 7 || stats.daysSinceDevotion <= 7 || stats.attendedRecent > 0;
        }).length;
        const readingBible = members.filter((member) => (member.stats?.daysSinceDevotion || 999) <= 2).length;
        const activeWithGod = members.filter((member) => member.stats?.isSpirituallyActive).length;
        const prayingForOthers = members.filter((member) => (member.stats?.prayedForOthers || 0) > 0).length;
        const openPrayerCount = prayerList.filter((item) => !item.answered && !item.answeredAt).length;

        return {
            members,
            careMembers,
            careSegments,
            weeklyFocus,
            prayerList,
            meetings,
            health: {
                memberCount: members.length,
                active7d,
                readingBible,
                activeWithGod,
                prayingForOthers,
                openPrayerCount,
                recentMeetingCount: recentMeetings.length,
                lastMeetingAt: meetings[0]?.startedAt || meetings[0]?.createdAt || meetings[0]?.updatedAt || meetings[0]?.date || null
            }
        };
    },

    async sendGroupCareMessage(groupId, memberId, mode = 'encourage_bible') {
        const context = this.activeGroupDetailContext;
        const member = context?.members?.find((entry) => entry.id === memberId);
        const template = this.GROUP_CARE_TEMPLATES[mode];
        if (!member || !template) return;

        this.closeGroupCareTipsModal();
        const tips = this.getGroupCareTips(member, mode);
        const modal = document.createElement('div');
        modal.id = 'groupCareTipsModal';
        modal.className = 'fixed inset-0 z-[180] bg-[rgba(33,24,18,0.58)] backdrop-blur-[3px] px-4 py-6 flex items-center justify-center';
        modal.innerHTML = `
            <div class="w-full max-w-md rounded-[30px] border ${tips.accentClass} shadow-[0_24px_80px_rgba(51,29,18,0.24)] overflow-hidden">
                <div class="p-5 sm:p-6">
                    <div class="flex items-start justify-between gap-3">
                        <div class="min-w-0">
                            <p class="text-[11px] uppercase tracking-[0.2em] text-[#c19200]">Send Message</p>
                            <h3 class="mt-2 text-[1.45rem] leading-tight font-black text-[#6d0707]">${this.escapeHtml(tips.title)}</h3>
                        </div>
                        <button type="button"
                                onclick="window.MyGroups.closeGroupCareTipsModal()"
                                class="shrink-0 w-11 h-11 rounded-full border border-[#dfd0c6] bg-white/82 text-[#8e7c74] text-2xl leading-none inline-flex items-center justify-center">
                            ×
                        </button>
                    </div>
                    <div class="mt-4 rounded-[24px] border border-white/80 bg-white/82 p-4 shadow-[0_10px_24px_rgba(89,49,22,0.06)]">
                        <div class="flex items-center gap-3">
                            <img src="${this.getMemberPhoto(member)}" alt="${this.escapeHtml(member.fullName || 'Member')}" class="w-14 h-14 rounded-full border-2 border-white object-cover shadow-sm">
                            <div class="min-w-0">
                                <p class="text-[1.05rem] leading-tight font-black text-[#6d0707] break-words">${this.escapeHtml(member.fullName || 'Unknown')}</p>
                                <p class="mt-1 text-sm leading-relaxed text-[#675a54]">${this.escapeHtml(tips.intro)}</p>
                            </div>
                        </div>
                        <div class="mt-4 space-y-2.5">
                            ${tips.tips.map((tip) => `
                                <div class="flex items-start gap-2.5">
                                    <span class="mt-1 inline-flex w-6 h-6 shrink-0 rounded-full ${tips.badgeClass} items-center justify-center text-[11px] font-black">✓</span>
                                    <p class="text-[14px] leading-6 text-[#655751]">${this.escapeHtml(tip)}</p>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    <div class="mt-4 rounded-[24px] border border-[#eadcd2] bg-white/84 p-4">
                        <p class="text-[11px] uppercase tracking-[0.18em] text-[#8f7a6d]">Suggested opener</p>
                        <p class="mt-2 text-[15px] leading-7 text-[#655751]">${this.escapeHtml(tips.preview)}</p>
                    </div>
                    <div class="mt-5 flex flex-col-reverse sm:flex-row gap-3">
                        <button type="button"
                                onclick="window.MyGroups.closeGroupCareTipsModal()"
                                class="flex-1 px-4 py-3 rounded-full border border-[#dfd0c6] bg-white/75 text-[#6f5d54] text-sm font-black">
                            Back
                        </button>
                        <button type="button"
                                onclick="window.MyGroups.proceedGroupCareMessage('${this.escapeForJs(groupId)}', '${this.escapeForJs(memberId)}', '${this.escapeForJs(mode)}')"
                                class="flex-1 px-4 py-3 rounded-full text-sm font-black shadow-[0_12px_24px_rgba(87,49,23,0.16)] ${tips.buttonClass}">
                            Proceed to Chat
                        </button>
                    </div>
                </div>
            </div>
        `;
        modal.addEventListener('click', (event) => {
            if (event.target === modal) {
                this.closeGroupCareTipsModal();
            }
        });
        document.body.appendChild(modal);
    },

    closeGroupCareTipsModal() {
        document.getElementById('groupCareTipsModal')?.remove();
    },

    async proceedGroupCareMessage(groupId, memberId, mode = 'encourage_bible') {
        const context = this.activeGroupDetailContext;
        const member = context?.members?.find((entry) => entry.id === memberId);
        const template = this.GROUP_CARE_TEMPLATES[mode];
        if (!member || !template) return;

        const message = template.buildMessage(member);
        this.closeGroupCareTipsModal();

        try {
            await navigator.clipboard?.writeText(message);
        } catch (_) {}

        if (!window.ChatApp || typeof window.ChatApp.open !== 'function' || typeof window.ChatApp.openDirectChat !== 'function') {
            this.showToast('Message copied. Open direct chat and paste it.');
            return;
        }

        try {
            if (typeof window.ChatApp.setPendingDirectDraft === 'function') {
                window.ChatApp.setPendingDirectDraft(memberId, message);
            }
            await window.ChatApp.open();
            window.ChatApp.setTab?.('direct');
            await window.ChatApp.openDirectChat(memberId);
            this.closeModal();
            this.showToast('Direct message ready. Suggested opener added.');
        } catch (error) {
            console.error('[MyGroups] proceedGroupCareMessage error:', error);
            this.showToast('Message copied. Open direct chat and paste it.');
        }
    },

    async submitGroupPrayerRequest(groupId) {
        if (!window.currentUser?.uid || !window.db) return;

        const memberId = String(document.getElementById('groupPrayerMemberId')?.value || '').trim();
        const request = String(document.getElementById('groupPrayerRequest')?.value || '').trim();
        const member = this.activeGroupDetailContext?.members?.find((entry) => entry.id === memberId);

        if (!memberId || !request) {
            this.showToast('Select a member and write the prayer request');
            return;
        }

        try {
            await window.addDoc(
                window.collection(window.db, 'goMission_groups', groupId, 'prayerRequests'),
                {
                    memberId,
                    memberName: member?.fullName || 'Unknown',
                    request,
                    createdAt: new Date().toISOString(),
                    createdBy: window.currentUser.uid,
                    answered: false
                }
            );

            await this.viewGroupDetails(groupId);
            this.showToast('Prayer request added');
        } catch (error) {
            console.error('[MyGroups] submitGroupPrayerRequest error:', error);
            this.showToast('Could not add prayer request');
        }
    },

    async markGroupPrayerAnswered(groupId, requestId) {
        if (!window.currentUser?.uid || !window.db) return;

        try {
            await window.setDoc(
                window.doc(window.db, 'goMission_groups', groupId, 'prayerRequests', requestId),
                {
                    answered: true,
                    answeredAt: new Date().toISOString(),
                    answeredBy: window.currentUser.uid
                },
                { merge: true }
            );

            await this.viewGroupDetails(groupId);
            this.showToast('Prayer marked as answered');
        } catch (error) {
            console.error('[MyGroups] markGroupPrayerAnswered error:', error);
            this.showToast('Could not update prayer request');
        }
    },

    /**
     * Open detailed group dashboard view from mission dashboard (leader-focused)
     */
    async viewGroupDetails(groupId) {
        const group = this.getGroupById(groupId);
        if (!group) {
            alert('Group not found');
            return;
        }

        const isLeader = group.leaderId === window.currentUser?.uid;
        if (!isLeader) {
            this.showGroupMembers(groupId);
            return;
        }

        const modal = document.getElementById('groupModal');
        const content = document.getElementById('groupModalContent');
        if (!modal || !content) return;

        content.innerHTML = `
            <div class="p-6 text-center">
                <p class="text-[var(--text-muted)]">Loading group dashboard...</p>
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
            const scheduleConfig = group.meetingSchedule || group.schedule || null;
            const scheduleLabel = scheduleConfig?.day && scheduleConfig?.time
                ? `${scheduleConfig.day} • ${this.formatTime(scheduleConfig.time)}`
                : 'No meeting schedule set';
            const meetingLive = !!(scheduleConfig && typeof GroupMeeting !== 'undefined' && GroupMeeting.isMeetingTime(scheduleConfig));
            const meetingLock = this.getGroupMeetingLockState(group);
            const pendingRequestsCount = this.getUnifiedJoinRequests(group).length;
            const groupIdSafe = this.escapeForJs(groupId);
            const dashboardData = await this.loadGroupDetailDashboardData(group);

            const previousSectionState = this.activeGroupDetailContext?.groupId === groupId
                ? (this.activeGroupDetailContext?.sectionState || {})
                : {};
            this.activeGroupDetailContext = {
                groupId,
                members: dashboardData.members,
                prayerList: dashboardData.prayerList,
                sectionState: { ...previousSectionState }
            };

            const focus = dashboardData.weeklyFocus;
            const focusMember = focus?.member || null;
            const focusActionMeta = this.getGroupDashboardActionMeta(focus?.mode || 'encourage_bible');
            const attentionMembers = dashboardData.careMembers.filter((member) => this.getGroupAttentionAlerts(member).length > 0);
            const attentionCount = attentionMembers.length;
            const encourageCount = dashboardData.careSegments.encourageBible.length;
            const attendanceCount = dashboardData.careSegments.attendanceFollowUp.length;
            const affirmCount = dashboardData.careSegments.affirmActive.length;
            const summaryIntro = attentionCount > 0
                ? `${attentionCount} member${attentionCount === 1 ? '' : 's'} need follow-up right now.`
                : (focusMember ? `${this.getFirstName(focusMember)} is the best person to shepherd next.` : 'Your group is steady right now.');

            const needsAttentionHtml = attentionMembers
                .slice(0, 6)
                .map((member) => this.buildGroupAttentionRow(groupId, member))
                .join('');

            const membersHtml = dashboardData.members
                .map((member) => this.buildCompactGroupMemberRow(groupId, member))
                .join('');

            const prayerMemberOptions = dashboardData.members.map((member) => `
                <option value="${this.escapeHtml(member.id)}">${this.escapeHtml(member.fullName || 'Unknown')}${member.isLeader ? ' (Leader)' : ''}</option>
            `).join('');

            const prayerListHtml = dashboardData.prayerList.length
                ? dashboardData.prayerList.slice(0, 8).map((item) => {
                    const createdAt = this.resolveDate(item.createdAt || item.updatedAt);
                    const answered = !!(item.answered || item.answeredAt);
                    return `
                        <div class="rounded-[22px] border ${answered ? 'border-[#bfe5cc] bg-[#effbf3]' : 'border-[#eadcd2] bg-white/82'} p-4 shadow-[0_10px_28px_rgba(89,49,22,0.04)]">
                            <div class="flex items-start justify-between gap-3">
                                <div class="min-w-0">
                                    <p class="text-base font-black text-[#6d0707]">${this.escapeHtml(item.memberName || 'Member')}</p>
                                    <p class="mt-2 text-sm leading-relaxed text-[#655751]">${this.escapeHtml(item.request || 'No details')}</p>
                                    <p class="mt-2 text-[12px] ${answered ? 'text-[#2b8d5f]' : 'text-[#8f6e00]'}">
                                        ${answered ? 'Answered' : 'Open'}${createdAt ? ` • ${createdAt.toLocaleDateString()}` : ''}
                                    </p>
                                </div>
                                ${!answered ? `
                                    <button onclick="window.MyGroups.markGroupPrayerAnswered('${groupIdSafe}', '${this.escapeForJs(item.id)}')"
                                            class="shrink-0 px-4 py-2.5 rounded-full bg-[#35b16f] text-white text-sm font-black shadow-sm">
                                        Mark Answered
                                    </button>
                                ` : ''}
                            </div>
                        </div>
                    `;
                }).join('')
                : `
                    <div class="rounded-[22px] border border-dashed border-[#eadcd2] bg-white/70 p-5 text-center">
                        <p class="text-lg font-black text-[#6d0707]">No prayer requests yet</p>
                        <p class="text-sm leading-relaxed text-[#6b5b54] mt-2">Add prayer needs for your members.</p>
                    </div>
                `;

            const focusBody = focusMember ? `
                <div class="rounded-[24px] border border-white/80 bg-white/82 p-4 shadow-[0_12px_30px_rgba(89,49,22,0.05)]">
                    <div class="flex flex-col gap-4">
                        <div class="flex items-start gap-3 min-w-0">
                            <img src="${this.getMemberPhoto(focusMember)}" class="w-14 h-14 rounded-full border-2 border-white object-cover shadow-sm shrink-0">
                            <div class="min-w-0 flex-1">
                                <p class="text-[1.35rem] font-black leading-tight text-[#6d0707] break-words">${this.escapeHtml(focusMember.fullName || 'Unknown')}</p>
                                <p class="mt-1 text-[11px] uppercase tracking-[0.16em] ${focusActionMeta.labelClass}">${this.escapeHtml(focus.mode.replace('_', ' '))}</p>
                                <p class="mt-3 text-[15px] leading-7 text-[#655751] break-words">${this.escapeHtml(focus.description || '')}</p>
                            </div>
                        </div>
                        <div class="flex flex-wrap gap-2">
                            ${this.getGroupAttentionAlerts(focusMember).slice(0, 2).map((alert) => `
                                <span class="px-2.5 py-1 rounded-full border text-[11px] font-semibold ${alert.tone}">
                                    ${this.escapeHtml(alert.label)}
                                </span>
                            `).join('')}
                        </div>
                        <div class="flex justify-start sm:justify-end">
                            <button onclick="window.MyGroups.sendGroupCareMessage('${groupIdSafe}', '${this.escapeForJs(focusMember.id)}', '${focus.mode}')"
                                    class="w-full sm:w-auto px-4 py-2.5 rounded-full text-sm font-black shadow-sm ${focusActionMeta.buttonClass}">
                                ${this.escapeHtml(focusActionMeta.label)}
                            </button>
                        </div>
                        ${this.renderGroupDetailStreakGraphic(focusMember.stats || {})}
                    </div>
                </div>
            ` : `
                <div class="rounded-[22px] border border-dashed border-[#eadcd2] bg-white/70 p-5 text-center">
                    <p class="text-lg font-black text-[#6d0707]">No urgent focus right now</p>
                    <p class="text-sm leading-relaxed text-[#6b5b54] mt-2">Use this week to affirm members who are building consistency with God.</p>
                </div>
            `;

            const actionSummaryCard = `
                <div class="rounded-[28px] border border-[#ead8c7] bg-[linear-gradient(145deg,rgba(255,214,108,0.16),rgba(255,255,255,0.96))] p-4 shadow-[0_18px_40px_rgba(109,56,18,0.08)]">
                    <div class="flex items-start justify-between gap-3">
                        <div class="min-w-0">
                            <p class="text-[11px] uppercase tracking-[0.18em] text-[#c19200]">Action Summary</p>
                            <p class="mt-2 text-sm leading-relaxed text-[#655751]">${this.escapeHtml(summaryIntro)}</p>
                        </div>
                        <div class="shrink-0 text-right">
                            <p class="text-[10px] uppercase tracking-[0.16em] text-[#8f7a6d]">Focus</p>
                            <p class="mt-1 text-sm font-black text-[#6d0707]">${this.escapeHtml(focusMember ? this.getFirstName(focusMember) : 'Steady')}</p>
                        </div>
                    </div>
                    <div class="mt-4 grid grid-cols-2 gap-3">
                        <button onclick="window.MyGroups.openGroupDashboardSection('needs_attention')" class="rounded-[22px] border border-[#f0c5c5] bg-[#fff2f2] p-3 text-left">
                            <p class="text-[10px] uppercase tracking-[0.16em] text-[#b43a3a]">Needs Attention</p>
                            <p class="mt-1 text-2xl font-black text-[#8f0c0c]">${attentionCount}</p>
                        </button>
                        <button onclick="window.MyGroups.openGroupDashboardSection('encourage_bible')" class="rounded-[22px] border border-[#f1d279] bg-[#fff8e2] p-3 text-left">
                            <p class="text-[10px] uppercase tracking-[0.16em] text-[#c19200]">Bible Nudges</p>
                            <p class="mt-1 text-2xl font-black text-[#8f5c00]">${encourageCount}</p>
                        </button>
                        <button onclick="window.MyGroups.openGroupDashboardSection('check_attendance')" class="rounded-[22px] border border-[#efc0ba] bg-[#fff1ec] p-3 text-left">
                            <p class="text-[10px] uppercase tracking-[0.16em] text-[#b1564f]">Attendance</p>
                            <p class="mt-1 text-2xl font-black text-[#9d0500]">${attendanceCount}</p>
                        </button>
                        <button onclick="window.MyGroups.openGroupDashboardSection('affirm_active')" class="rounded-[22px] border border-[#bfe5cc] bg-[#effbf3] p-3 text-left">
                            <p class="text-[10px] uppercase tracking-[0.16em] text-[#2b8d5f]">Affirm</p>
                            <p class="mt-1 text-2xl font-black text-[#1e8d61]">${affirmCount}</p>
                        </button>
                    </div>
                </div>
            `;

            const groupHealthBody = `
                <div class="grid grid-cols-2 gap-3">
                    <div class="rounded-[22px] border border-white/80 bg-white/75 p-4 text-center">
                        <p class="text-3xl font-black text-[#8f0c0c]">${dashboardData.health.memberCount || 0}</p>
                        <p class="text-sm text-[#74655c] mt-1">Members</p>
                    </div>
                    <div class="rounded-[22px] border border-white/80 bg-white/75 p-4 text-center">
                        <p class="text-3xl font-black text-[#2ba968]">${dashboardData.health.active7d || 0}</p>
                        <p class="text-sm text-[#74655c] mt-1">Active 7d</p>
                    </div>
                    <div class="rounded-[22px] border border-white/80 bg-white/75 p-4 text-center">
                        <p class="text-3xl font-black text-[#d19b00]">${dashboardData.health.readingBible || 0}</p>
                        <p class="text-sm text-[#74655c] mt-1">Reading Bible</p>
                    </div>
                    <div class="rounded-[22px] border border-white/80 bg-white/75 p-4 text-center">
                        <p class="text-3xl font-black text-[#2798c9]">${dashboardData.health.activeWithGod || 0}</p>
                        <p class="text-sm text-[#74655c] mt-1">Active With God</p>
                    </div>
                    <div class="rounded-[22px] border border-white/80 bg-white/75 p-4 text-center">
                        <p class="text-3xl font-black text-[#c19200]">${dashboardData.health.openPrayerCount || 0}</p>
                        <p class="text-sm text-[#74655c] mt-1">Open Prayers</p>
                    </div>
                    <div class="rounded-[22px] border border-white/80 bg-white/75 p-4 text-center">
                        <p class="text-3xl font-black text-[#a691eb]">${dashboardData.health.prayingForOthers || 0}</p>
                        <p class="text-sm text-[#74655c] mt-1">Praying For Others</p>
                    </div>
                </div>
            `;

            const prayerFormBody = `
                <div class="rounded-[24px] border border-white/80 bg-white/82 p-4 shadow-[0_10px_28px_rgba(89,49,22,0.04)]">
                    <div class="grid grid-cols-1 gap-3">
                        <select id="groupPrayerMemberId" class="w-full bg-[#fffdfa] border border-[#e7d6c9] rounded-[20px] px-4 py-3 text-base text-[#6d0707]">
                            <option value="">Select member</option>
                            ${prayerMemberOptions}
                        </select>
                        <textarea id="groupPrayerRequest" rows="3" maxlength="300"
                                  placeholder="Add a prayer need for this member"
                                  class="w-full bg-[#fffdfa] border border-[#e7d6c9] rounded-[20px] px-4 py-3 text-base text-[#4d3c37]"></textarea>
                        <button onclick="window.MyGroups.submitGroupPrayerRequest('${groupIdSafe}')"
                                class="w-full sm:w-auto px-4 py-3 rounded-full bg-[#9d0500] text-white text-base font-black shadow-sm">
                            Add Prayer Request
                        </button>
                    </div>
                </div>
                <div class="mt-4 space-y-3">
                    ${prayerListHtml}
                </div>
            `;

            const groupSettingsBody = `
                <div class="space-y-4">
                    <div class="flex items-start justify-between gap-3">
                        <div>
                            <p class="text-lg font-black text-[#6d0707]">${this.escapeHtml(scheduleLabel)}</p>
                            <p class="mt-1 text-sm text-[#74655c]">${meetingLive ? 'Meeting live now' : 'Meeting waiting'}</p>
                        </div>
                        <span class="px-3 py-1 rounded-full text-[11px] uppercase tracking-[0.16em] ${meetingLive ? 'bg-[#ddf7ef] text-[#24936f]' : 'bg-white/75 text-[#8a7a70]'}">
                            ${meetingLive ? 'Live' : 'Waiting'}
                        </span>
                    </div>
                    <div>
                        <label class="block text-sm text-[#74655c] mb-2">Group Name</label>
                        <div class="flex items-center gap-2">
                            <input id="groupNameInput" type="text" value="${this.escapeHtml(group.name || 'Mission Group')}" maxlength="80"
                                   class="flex-1 bg-[#fffdfa] border border-[#e7d6c9] rounded-[20px] px-4 py-3 text-base text-[#6d0707]">
                            <button onclick="window.MyGroups.saveGroupName('${groupIdSafe}')"
                                    class="px-4 py-3 rounded-[20px] text-sm font-black bg-[#9d0500] text-white whitespace-nowrap">
                                Save
                            </button>
                        </div>
                    </div>
                    <div class="flex flex-wrap gap-2">
                        <button onclick="window.MyGroups.editSchedule('${groupIdSafe}')"
                                class="px-4 py-3 rounded-full text-sm font-black bg-[#f7cc00] text-[#3f1400] shadow-sm">
                            Edit Day & Time
                        </button>
                        <button onclick="window.MyGroups.handleMeetingAction('${groupIdSafe}', true)"
                                class="px-4 py-3 rounded-full text-sm font-black shadow-sm ${meetingLock.locked ? 'bg-[#fff2f2] text-[#9d0500] border border-[#efc0ba]' : (meetingLive ? 'bg-[#35b16f] text-white' : 'bg-white text-[#6d0707] border border-[#e7d6c9]')}">
                            ${meetingLock.locked ? 'Meeting Locked' : (meetingLive ? 'Join Meeting' : 'Join Meeting')}
                        </button>
                    </div>
                    ${meetingLock.locked ? `
                        <p class="text-sm text-[#b43a3a]">🚫 ${this.escapeHtml(meetingLock.reason || 'Join a valid upline group first.')}</p>
                    ` : ''}
                </div>
            `;

            const reminderBody = `
                <div class="space-y-3">
                    <label class="flex items-center justify-between text-base text-[#6d0707]">
                        <span>Enable reminder</span>
                        <input id="meetingReminderEnabled" type="checkbox" class="accent-[#f7cc00]" ${reminderEnabled ? 'checked' : ''}>
                    </label>
                    <div>
                        <label class="block text-sm text-[#74655c] mb-2">Notify me before meeting</label>
                        <select id="meetingReminderMinutes" class="w-full bg-[#fffdfa] border border-[#e7d6c9] rounded-[20px] px-4 py-3 text-base text-[#6d0707]">
                            <option value="10" ${reminderMinutes === 10 ? 'selected' : ''}>10 minutes</option>
                            <option value="30" ${reminderMinutes === 30 ? 'selected' : ''}>30 minutes</option>
                            <option value="60" ${reminderMinutes === 60 ? 'selected' : ''}>1 hour</option>
                            <option value="1440" ${reminderMinutes === 1440 ? 'selected' : ''}>1 day</option>
                        </select>
                    </div>
                    <label class="flex items-center justify-between text-base text-[#6d0707]">
                        <span>In-app notification</span>
                        <input id="meetingReminderPush" type="checkbox" class="accent-[#f7cc00]" ${pushEnabled ? 'checked' : ''}>
                    </label>
                    <label class="flex items-center justify-between text-base text-[#6d0707]">
                        <span>Alarm-style alert</span>
                        <input id="meetingReminderAlarm" type="checkbox" class="accent-[#f7cc00]" ${alarmEnabled ? 'checked' : ''}>
                    </label>
                    <button onclick="window.MyGroups.saveMeetingReminder('${groupIdSafe}')"
                            class="w-full py-3 rounded-full text-base font-black bg-[#9d0500] text-white shadow-sm">
                        Save Reminder Settings
                    </button>
                </div>
            `;

            content.innerHTML = `
                <div class="max-h-[84vh] overflow-hidden rounded-[30px] bg-[#fffaf6]">
                    <div class="sticky top-0 z-20 border-b border-[#eadcd2] bg-[linear-gradient(180deg,rgba(255,250,246,0.98),rgba(255,250,246,0.93))] backdrop-blur px-5 py-4">
                        <div class="flex items-start justify-between gap-3">
                            <div class="min-w-0">
                                <p class="text-[11px] uppercase tracking-[0.18em] text-[#c19200]">Group Dashboard</p>
                                <h3 class="mt-1 text-[clamp(1.45rem,5vw,2rem)] font-black leading-none text-[#6d0707]">${this.escapeHtml(group.name || 'Mission Group')}</h3>
                                <p class="mt-3 text-sm tracking-[0.14em] text-[#7d6d64]">${dashboardData.health.memberCount || 0} members • ${meetingLive ? 'Meeting live now' : 'Meeting waiting'}</p>
                                <p class="mt-1 text-sm tracking-[0.14em] text-[#7d6d64]">${this.escapeHtml(scheduleLabel)}</p>
                            </div>
                            <button onclick="window.MyGroups.closeModal()" class="shrink-0 w-10 h-10 rounded-full border border-[#dfd0c6] bg-white/80 text-[#8e7c74] text-2xl leading-none inline-flex items-center justify-center">
                                ×
                            </button>
                        </div>
                        <div class="mt-4 flex flex-wrap gap-2">
                            <button onclick="window.MyGroups.showInviteCode('${groupIdSafe}')"
                                    class="px-4 py-2.5 rounded-full bg-[#f7cc00] text-[#3f1400] text-sm font-black shadow-sm">
                                Invite
                            </button>
                            <button onclick="window.MyGroups.openGroupChat('${groupIdSafe}')"
                                    class="px-4 py-2.5 rounded-full border border-[#e7d6c9] bg-white/82 text-[#6d0707] text-sm font-black">
                                Chat
                            </button>
                            <button onclick="window.MyGroups.handleMeetingAction('${groupIdSafe}', true)"
                                    class="px-4 py-2.5 rounded-full text-sm font-black shadow-sm ${meetingLock.locked ? 'bg-[#fff2f2] text-[#9d0500] border border-[#efc0ba]' : (meetingLive ? 'bg-[#35b16f] text-white' : 'bg-white text-[#6d0707] border border-[#e7d6c9]')}">
                                ${meetingLock.locked ? 'Meeting Locked' : 'Join Meeting'}
                            </button>
                            ${pendingRequestsCount > 0 ? `
                                <button onclick="window.MyGroups.showJoinRequests('${groupIdSafe}')"
                                        class="px-4 py-2.5 rounded-full bg-[#9d0500] text-white text-sm font-black shadow-sm">
                                    ${pendingRequestsCount} Pending
                                </button>
                            ` : ''}
                        </div>
                    </div>

                    <div class="max-h-[72vh] overflow-y-auto px-4 pb-5 pt-4 space-y-4 bg-[radial-gradient(circle_at_top,rgba(255,214,108,0.08),transparent_28%)]">
                        ${actionSummaryCard}

                        ${this.renderGroupDashboardSection('this_week_focus', {
                            title: 'This Week’s Focus',
                            summary: focusMember
                                ? `${this.getFirstName(focusMember)} is the most important person to follow up first.`
                                : 'No urgent focus right now.',
                            shellClass: 'border-[#f1d79a] bg-[linear-gradient(180deg,rgba(255,248,225,0.96),rgba(255,255,255,0.98))]',
                            titleClass: 'text-[#c19200]',
                            count: focusMember ? '1' : '0',
                            countClass: 'bg-[#fff6d8] text-[#8f5c00] border border-[#f1d279]',
                            defaultExpanded: true,
                            body: focusBody
                        })}

                        ${this.renderGroupDashboardSection('needs_attention', {
                            title: 'Needs Attention',
                            summary: attentionCount > 0 ? 'Members who may be drifting or missing connection.' : 'No immediate care alerts right now.',
                            shellClass: 'border-[#f0c2c2] bg-[linear-gradient(180deg,rgba(255,240,240,0.96),rgba(255,255,255,0.98))]',
                            titleClass: 'text-[#b43a3a]',
                            count: String(attentionCount),
                            countClass: 'bg-[#fff2f2] text-[#b43a3a] border border-[#f0c5c5]',
                            defaultExpanded: attentionCount > 0,
                            body: needsAttentionHtml || '<p class="text-sm leading-relaxed text-[#6b5b54]">No members need immediate follow-up.</p>'
                        })}

                        ${this.renderGroupDashboardSection('encourage_bible', {
                            title: 'Encourage Bible Reading',
                            summary: encourageCount > 0 ? 'Nudge members back into a gentle reading rhythm.' : 'Everyone has recent Bible activity.',
                            shellClass: 'border-[#f1d79a] bg-[linear-gradient(180deg,rgba(255,248,225,0.96),rgba(255,255,255,0.98))]',
                            titleClass: 'text-[#c19200]',
                            count: String(encourageCount),
                            countClass: 'bg-[#fff6d8] text-[#8f5c00] border border-[#f1d279]',
                            defaultExpanded: false,
                            body: dashboardData.careSegments.encourageBible.slice(0, 6).map((member) => this.buildGroupCareRow(groupId, member, 'encourage_bible')).join('') || '<p class="text-sm leading-relaxed text-[#6b5b54]">Nobody needs a Bible nudge right now.</p>'
                        })}

                        ${this.renderGroupDashboardSection('check_attendance', {
                            title: 'Check Attendance',
                            summary: attendanceCount > 0 ? 'Follow up with members missing meetings.' : 'No attendance follow-up needed from recent meetings.',
                            shellClass: 'border-[#efc0ba] bg-[linear-gradient(180deg,rgba(255,242,237,0.96),rgba(255,255,255,0.98))]',
                            titleClass: 'text-[#b1564f]',
                            count: String(attendanceCount),
                            countClass: 'bg-[#fff0ea] text-[#9d0500] border border-[#efc0ba]',
                            defaultExpanded: false,
                            body: dashboardData.careSegments.attendanceFollowUp.slice(0, 6).map((member) => this.buildGroupCareRow(groupId, member, 'check_attendance')).join('') || '<p class="text-sm leading-relaxed text-[#6b5b54]">No attendance follow-up needed from recent meetings.</p>'
                        })}

                        ${this.renderGroupDashboardSection('affirm_active', {
                            title: 'Affirm Active Members',
                            summary: affirmCount > 0 ? 'Celebrate people building momentum with God.' : 'No active members to affirm yet.',
                            shellClass: 'border-[#bfe5cc] bg-[linear-gradient(180deg,rgba(239,251,243,0.96),rgba(255,255,255,0.98))]',
                            titleClass: 'text-[#2b8d5f]',
                            count: String(affirmCount),
                            countClass: 'bg-[#effbf3] text-[#2b8d5f] border border-[#bfe5cc]',
                            defaultExpanded: false,
                            body: dashboardData.careSegments.affirmActive.slice(0, 6).map((member) => this.buildGroupCareRow(groupId, member, 'affirm_active')).join('') || '<p class="text-sm leading-relaxed text-[#6b5b54]">No active members to affirm yet.</p>'
                        })}

                        ${this.renderGroupDashboardSection('group_health', {
                            title: 'Group Health',
                            summary: dashboardData.health.lastMeetingAt
                                ? `Latest meeting ${this.resolveDate(dashboardData.health.lastMeetingAt)?.toLocaleDateString() || ''}`
                                : 'No recorded meeting yet.',
                            shellClass: 'border-[#ddd2ca] bg-[linear-gradient(180deg,rgba(250,245,241,0.96),rgba(255,255,255,0.98))]',
                            titleClass: 'text-[#8c5d0d]',
                            count: '',
                            defaultExpanded: false,
                            body: groupHealthBody
                        })}

                        ${this.renderGroupDashboardSection('prayer_list', {
                            title: 'Prayer List',
                            summary: dashboardData.prayerList.length > 0 ? `${dashboardData.prayerList.length} prayer request${dashboardData.prayerList.length === 1 ? '' : 's'} in this group.` : 'Add prayer needs for your members.',
                            shellClass: 'border-[#ddd2ca] bg-[linear-gradient(180deg,rgba(252,247,240,0.96),rgba(255,255,255,0.98))]',
                            titleClass: 'text-[#c19200]',
                            count: String(dashboardData.prayerList.length),
                            countClass: 'bg-[#fff5df] text-[#8f5c00] border border-[#f1d79a]',
                            defaultExpanded: false,
                            body: prayerFormBody
                        })}

                        ${this.renderGroupDashboardSection('all_members', {
                            title: 'All Members',
                            summary: `${dashboardData.members.length} people in this group.`,
                            shellClass: 'border-[#ddd2ca] bg-[linear-gradient(180deg,rgba(252,250,248,0.96),rgba(255,255,255,0.98))]',
                            titleClass: 'text-[#c19200]',
                            count: String(dashboardData.members.length),
                            countClass: 'bg-white text-[#6f5d54] border border-[#e7d6c9]',
                            defaultExpanded: false,
                            body: membersHtml || '<p class="text-sm leading-relaxed text-[#6b5b54]">No members found.</p>'
                        })}

                        ${this.renderGroupDashboardSection('group_settings', {
                            title: 'Group Settings',
                            summary: scheduleLabel,
                            shellClass: 'border-[#ddd2ca] bg-[linear-gradient(180deg,rgba(252,247,240,0.96),rgba(255,255,255,0.98))]',
                            titleClass: 'text-[#c19200]',
                            count: '',
                            defaultExpanded: false,
                            body: groupSettingsBody
                        })}

                        ${this.renderGroupDashboardSection('meeting_reminder', {
                            title: 'My Meeting Reminder',
                            summary: reminderEnabled ? `${reminderMinutes} minutes before meeting` : 'Reminder currently disabled.',
                            shellClass: 'border-[#ddd2ca] bg-[linear-gradient(180deg,rgba(252,247,240,0.96),rgba(255,255,255,0.98))]',
                            titleClass: 'text-[#c19200]',
                            count: '',
                            defaultExpanded: false,
                            body: reminderBody
                        })}
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('[MyGroups] viewGroupDetails error:', error);
            this.activeGroupDetailContext = null;
            content.innerHTML = `
                <div class="p-6 text-center">
                    <p class="text-[var(--mission-red-bright)] mb-3">Failed to load group dashboard.</p>
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
        const memberCount = this.normalizeCollectionEntries(group.members).length;
        const guestCount = this.normalizeCollectionEntries(group.guests).length;
        const requestCount = this.getUnifiedJoinRequests(group).length;
        const hasSchedule = group.meetingSchedule?.day && group.meetingSchedule?.time;
        const isLeader = group.leaderId === window.currentUser?.uid;
        const meetingLock = this.getGroupMeetingLockState(group);
        
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
                            ${meetingLock.locked ? `
                                <p class="text-xs text-[var(--mission-red-bright)] mt-1">🚫 ${this.escapeHtml(meetingLock.reason || 'Meeting locked')}</p>
                            ` : ''}
                        </div>
                        ${type === 'downline' ? `
                            <!-- Leader: Start Meeting + Edit Schedule -->
                            <div class="flex items-center gap-2">
                                <button onclick="window.MyGroups.editSchedule('${group.id}')" class="text-[var(--mission-gold)] text-xs">Edit</button>
                                <button onclick="window.MyGroups.handleMeetingAction('${group.id}', true)" class="text-xs font-bold py-2 px-3 rounded-lg flex items-center gap-1 transition-opacity ${meetingLock.locked ? 'bg-[var(--mission-red-bright)]/15 text-[var(--mission-red-bright)] border border-[var(--mission-red-bright)]/40' : 'bg-[var(--mission-gold)] hover:opacity-90 text-[var(--mission-red-deep)]'}">
                                    <span>📹</span> ${meetingLock.locked ? 'Meeting Locked' : 'Start Meeting'}
                                </button>
                            </div>
                        ` : `
                            <!-- Member/Guest: Join Meeting -->
                            <button onclick="window.MyGroups.handleMeetingAction('${group.id}', false)" class="text-xs font-bold py-2 px-3 rounded-lg flex items-center gap-1 transition-opacity ${meetingLock.locked ? 'bg-[var(--mission-red-bright)]/15 text-[var(--mission-red-bright)] border border-[var(--mission-red-bright)]/40' : 'bg-[var(--mission-gold)] hover:opacity-90 text-[var(--mission-red-deep)]'}">
                                <span>📹</span> ${meetingLock.locked ? 'Meeting Locked' : 'Join Meeting'}
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
                            ${requestCount > 0 ? `<span class="absolute right-3 bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1 border border-white/80">${requestCount}</span>` : ''}
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
     * Normalize invite code input to uppercase alphanumeric without separators.
     */
    normalizeInviteCode(rawCode) {
        return String(rawCode || '')
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, '')
            .slice(0, 6);
    },

    /**
     * Canonical group-name key for duplicate checks
     */
    normalizeGroupNameKey(rawName) {
        return String(rawName || '')
            .trim()
            .toLowerCase()
            .replace(/\s+/g, ' ')
            .replace(/[^a-z0-9 ]/g, '');
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
                <input type="text" id="joinCodeInput" placeholder="Enter 6-character code" 
                    class="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-4 py-3 text-[var(--text-color)] text-center text-2xl tracking-[0.5em] uppercase mb-4"
                    maxlength="12" oninput="this.value = window.MyGroups.normalizeInviteCode(this.value)">
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
                <button id="myGroupsCreateSubmitBtn" onclick="window.MyGroups.createGroup()" class="w-full bg-[var(--mission-gold)] text-[var(--mission-red-deep)] font-bold py-3 rounded-lg">
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
        this.activeGroupDetailContext = null;
        document.getElementById('groupModal')?.classList.add('hidden');
    },
    
    /**
     * Join group with invite code
     */
    async joinWithCode() {
        const inputEl = document.getElementById('joinCodeInput');
        const code = this.normalizeInviteCode(inputEl?.value);
        const errorEl = document.getElementById('joinError');

        if (inputEl) {
            inputEl.value = code;
        }
        
        if (!code || code.length !== 6) {
            if (errorEl) {
                errorEl.textContent = 'Please enter a valid 6-character code';
                errorEl.classList.remove('hidden');
            }
            return;
        }
        
        try {
            let groupDoc = null;
            let groupData = null;
            let codeRef = window.doc(window.db, 'goMission_groupInviteCodes', code);
            let codeDoc = await window.getDoc(codeRef);

            const parseTimestamp = (value) => {
                if (!value) return null;
                if (typeof value?.toDate === 'function') {
                    return value.toDate();
                }
                const date = new Date(value);
                return Number.isNaN(date.getTime()) ? null : date;
            };
            
            // Method 1: Check goMission_groupInviteCodes collection (new system)
            // Legacy compatibility: some old invite code docs were saved with random doc ids.
            if (!codeDoc.exists()) {
                const codeQuery = window.query(
                    window.collection(window.db, 'goMission_groupInviteCodes'),
                    window.where('code', '==', code)
                );
                const codeSnapshot = await window.getDocs(codeQuery);
                if (!codeSnapshot.empty) {
                    codeDoc = codeSnapshot.docs[0];
                    codeRef = codeDoc.ref;
                }
            }

            // Fallback: tolerate legacy lowercase/separated code values.
            if (!codeDoc.exists()) {
                const allCodeSnapshot = await window.getDocs(
                    window.collection(window.db, 'goMission_groupInviteCodes')
                );
                const normalizedMatch = allCodeSnapshot.docs.find((docSnap) => {
                    const data = docSnap.data() || {};
                    const stored = this.normalizeInviteCode(data.code || data.inviteCode || docSnap.id);
                    return stored === code;
                });
                if (normalizedMatch) {
                    codeDoc = normalizedMatch;
                    codeRef = normalizedMatch.ref;
                }
            }
            
            if (codeDoc.exists()) {
                const codeData = codeDoc.data() || {};
                
                // Check if code expired
                const codeExpiry = parseTimestamp(codeData.expiresAt);
                if (codeExpiry && codeExpiry.getTime() < Date.now()) {
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
                const linkedGroupId = String(codeData.groupId || codeData.group || codeData.groupID || '').trim();
                if (linkedGroupId) {
                    const groupRef = window.doc(window.db, 'goMission_groups', linkedGroupId);
                    groupDoc = await window.getDoc(groupRef);
                }

                if (groupDoc?.exists()) {
                    groupData = groupDoc.data();
                }
            }

            if (!groupDoc || !groupDoc.exists() || !groupData) {
                // Method 2: Check inviteCode field directly on groups (legacy system)
                const groupQuery = window.query(
                    window.collection(window.db, 'goMission_groups'),
                    window.where('inviteCode', '==', code)
                );
                const snapshot = await window.getDocs(groupQuery);
                
                if (snapshot.empty) {
                    const allGroupsSnapshot = await window.getDocs(
                        window.collection(window.db, 'goMission_groups')
                    );
                    const normalizedGroupMatch = allGroupsSnapshot.docs.find((docSnap) => {
                        const data = docSnap.data() || {};
                        return this.normalizeInviteCode(data.inviteCode) === code;
                    });
                    if (normalizedGroupMatch) {
                        groupDoc = normalizedGroupMatch;
                        groupData = normalizedGroupMatch.data() || {};
                    } else {
                        if (errorEl) {
                            errorEl.textContent = 'Invalid invite code';
                            errorEl.classList.remove('hidden');
                        }
                        return;
                    }
                } else {
                    groupDoc = snapshot.docs[0];
                    groupData = groupDoc.data();
                }

                const legacyExpiry = parseTimestamp(groupData.inviteCodeExpiresAt);
                if (legacyExpiry && legacyExpiry.getTime() < Date.now()) {
                    if (errorEl) {
                        errorEl.textContent = 'This invite code has expired. Ask the group leader for a new code.';
                        errorEl.classList.remove('hidden');
                    }
                    return;
                }
            }
            
            // Check if already a member
            if (this.isUserMemberInGroupData(groupData, window.currentUser.uid)) {
                if (errorEl) {
                    errorEl.textContent = 'You are already a member of this group';
                    errorEl.classList.remove('hidden');
                }
                return;
            }
            
            // Check if already a guest
            if (this.isUserGuestInGroupData(groupData, window.currentUser.uid)) {
                if (errorEl) {
                    errorEl.textContent = 'You are already a guest in this group';
                    errorEl.classList.remove('hidden');
                }
                return;
            }
            
            // Check if already has pending request
            if (this.getUnifiedJoinRequests(groupData).some((r) => r.odId === window.currentUser.uid)) {
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
        const submitBtn = document.getElementById('myGroupsCreateSubmitBtn');
        
        if (!name) {
            if (errorEl) {
                errorEl.textContent = 'Please enter a group name';
                errorEl.classList.remove('hidden');
            }
            return;
        }

        if (this.isCreatingGroup) {
            return;
        }
        
        try {
            this.isCreatingGroup = true;
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.classList.add('opacity-60', 'cursor-not-allowed');
                submitBtn.textContent = 'Creating...';
            }

            await this.logIntegrityEvent('group_create_attempt', {
                status: 'logged',
                severity: 'info',
                actionRequired: false,
                requestedGroupName: name,
                requestedNameKey: this.normalizeGroupNameKey(name),
                message: `Create group attempt: ${name}`,
                context: {
                    dashboardTab: this.dashboardTab || 'downline'
                }
            });

            const eligibility = await this.canShowCreateGroupAction();
            if (!eligibility.allowed) {
                await this.logIntegrityEvent('group_create_blocked', {
                    status: 'open',
                    severity: 'medium',
                    actionRequired: true,
                    requestedGroupName: name,
                    requestedNameKey: this.normalizeGroupNameKey(name),
                    reasonCode: String(eligibility.reason || 'requires_upline'),
                    message: 'Create group blocked: user has no valid upline/authorization.',
                    context: {
                        eligibilityReason: String(eligibility.reason || ''),
                        hasActiveUpline: !!eligibility.hasActiveUpline,
                        exemptNoUpline: !!eligibility.exemptNoUpline
                    }
                });
                if (errorEl) {
                    errorEl.textContent = 'You must join a valid upline group first before creating a group.';
                    errorEl.classList.remove('hidden');
                }
                return;
            }

            const profileBeforeCreate = await this.getCurrentMemberData();
            const pointerSync = await this.ensureCreationUplineProfilePointer(profileBeforeCreate);
            if (!pointerSync.ok) {
                await this.logIntegrityEvent('group_create_blocked', {
                    status: 'open',
                    severity: 'high',
                    actionRequired: true,
                    requestedGroupName: name,
                    requestedNameKey: this.normalizeGroupNameKey(name),
                    reasonCode: String(pointerSync.reason || 'requires_upline_pointer'),
                    message: 'Create group blocked: member profile upline pointer is missing/invalid.',
                    context: {
                        profileUplineGroupId: profileBeforeCreate?.uplineGroupId || '',
                        profileGroupId: profileBeforeCreate?.groupId || '',
                        detectedUplineGroupId: this.uplineGroup?.id || ''
                    }
                });
                if (errorEl) {
                    errorEl.textContent = 'Cannot create yet. Your upline link is incomplete. Open your upline group first, then retry.';
                    errorEl.classList.remove('hidden');
                }
                return;
            }
            if (pointerSync.patched) {
                await this.logIntegrityEvent('group_create_profile_sync', {
                    status: 'logged',
                    severity: 'info',
                    actionRequired: false,
                    requestedGroupName: name,
                    requestedNameKey: this.normalizeGroupNameKey(name),
                    message: `Profile pointer synced before create: ${pointerSync.targetGroupId}.`,
                    context: {
                        targetGroupId: pointerSync.targetGroupId
                    }
                });
            }

            const nextNameKey = this.normalizeGroupNameKey(name);
            let leaderGroups = Array.isArray(this.downlineGroups) ? [...this.downlineGroups] : [];
            if (leaderGroups.length === 0) {
                const groupsSnap = await window.getDocs(window.query(
                    window.collection(window.db, 'goMission_groups'),
                    window.where('leaderId', '==', window.currentUser.uid)
                ));
                leaderGroups = groupsSnap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
            }

            const duplicateGroup = leaderGroups.find((group) => (
                this.normalizeGroupNameKey(group?.name) === nextNameKey
            ));
            if (duplicateGroup) {
                await this.logIntegrityEvent('group_create_blocked', {
                    status: 'open',
                    severity: 'medium',
                    actionRequired: true,
                    requestedGroupName: name,
                    requestedNameKey: nextNameKey,
                    reasonCode: 'duplicate_name',
                    message: `Create group blocked: duplicate name exists (${duplicateGroup.name || duplicateGroup.id}).`,
                    context: {
                        duplicateGroupId: duplicateGroup.id || null,
                        duplicateGroupName: duplicateGroup.name || null
                    }
                });
                if (errorEl) {
                    errorEl.textContent = `This group already exists: "${duplicateGroup.name || 'Existing Group'}".`;
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
                    nameKey: nextNameKey,
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
            await this.logIntegrityEvent('group_create_success', {
                status: 'resolved',
                severity: 'info',
                actionRequired: false,
                requestedGroupName: name,
                requestedNameKey: nextNameKey,
                message: `Group created successfully (${groupRef.id}).`,
                context: {
                    groupId: groupRef.id
                }
            });
            
            // Reload and close
            await this.loadGroups();
            this.render();
            this.updateMissionCard();
            this.closeModal();
            
            // Show invite code
            this.showInviteCode(groupRef.id);
            
        } catch (error) {
            console.error('[MyGroups] Create error:', error);
            await this.logIntegrityEvent('group_create_failed', {
                status: 'open',
                severity: 'high',
                actionRequired: true,
                requestedGroupName: name,
                requestedNameKey: this.normalizeGroupNameKey(name),
                reasonCode: 'exception',
                message: 'Create group failed due to system error.',
                errorCode: String(error?.code || ''),
                errorMessage: String(error?.message || error || ''),
                context: {
                    stack: String(error?.stack || '').slice(0, 1200)
                }
            });
            if (errorEl) {
                const msg = String(error?.message || '');
                errorEl.textContent = msg.toLowerCase().includes('missing or insufficient permissions')
                    ? 'Create blocked by profile-group mismatch. Refresh your groups and retry.'
                    : 'Failed to create group';
                errorEl.classList.remove('hidden');
            }
        } finally {
            this.isCreatingGroup = false;
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.classList.remove('opacity-60', 'cursor-not-allowed');
                submitBtn.textContent = 'Create Group';
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

            // Leader-only safety check (this button is only shown for leaders, but enforce anyway).
            if (group.leaderId && group.leaderId !== window.currentUser?.uid) {
                alert('Only the group leader can generate invite codes.');
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

                // Also upsert the new-system invite code doc so joins can use Method 1 (fast lookup + usage tracking).
                await window.setDoc(
                    window.doc(window.db, 'goMission_groupInviteCodes', inviteCode),
                    {
                        code: inviteCode,
                        groupId: groupId,
                        groupName: group.name || '',
                        createdBy: window.currentUser?.uid || '',
                        createdByName: window.currentUser?.displayName || window.currentUser?.email || '',
                        createdAt: new Date().toISOString(),
                        expiresAt: inviteCodeExpiresAt,
                        maxUses: null,
                        usedCount: 0
                    },
                    { merge: true }
                );
                
                // Update local group object
                group.inviteCode = inviteCode;
                group.inviteCodeExpiresAt = inviteCodeExpiresAt;
                console.log('[MyGroups] Invite code saved to Firestore');
            } else {
                // Ensure a matching invite code doc exists (non-destructive).
                try {
                    const codeRef = window.doc(window.db, 'goMission_groupInviteCodes', inviteCode);
                    const codeDoc = await window.getDoc(codeRef);
                    if (!codeDoc.exists()) {
                        await window.setDoc(codeRef, {
                            code: inviteCode,
                            groupId: groupId,
                            groupName: group.name || '',
                            createdBy: window.currentUser?.uid || '',
                            createdByName: window.currentUser?.displayName || window.currentUser?.email || '',
                            createdAt: new Date().toISOString(),
                            expiresAt: inviteCodeExpiresAt,
                            maxUses: null,
                            usedCount: 0
                        }, { merge: true });
                    }
                } catch (e) {
                    console.warn('[MyGroups] Could not upsert goMission_groupInviteCodes doc:', e);
                }
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

        const lockState = this.getGroupMeetingLockState(group);
        if (lockState.locked) {
            this.showMeetingLockModal(group, lockState);
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

        const lockState = this.getGroupMeetingLockState(group);
        if (lockState.locked) {
            this.showMeetingLockModal(group, lockState);
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
    async showGroupMenu(groupId) {
        const group = this.downlineGroups.find(g => g.id === groupId);
        if (!group) return;

        const modal = document.getElementById('groupModal');
        const content = document.getElementById('groupModalContent');
        if (!modal || !content) return;

        let pendingDeleteRequest = null;
        try {
            const requestDoc = await window.getDoc(
                window.doc(window.db, 'goMission_groupDeletionRequests', groupId)
            );
            if (requestDoc.exists()) {
                const data = requestDoc.data() || {};
                if (String(data.status || '').toLowerCase() === 'pending') {
                    pendingDeleteRequest = data;
                }
            }
        } catch (error) {
            console.warn('[MyGroups] Could not load group deletion request status:', error);
        }

        const memberCount = this.normalizeCollectionEntries(group.members).length;
        const guestCount = this.normalizeCollectionEntries(group.guests).length;

        content.innerHTML = `
            <div class="p-6">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-lg font-bold text-[var(--text-color)]">Group Options</h3>
                    <button onclick="window.MyGroups.closeModal()" class="text-[var(--text-muted)] text-xl">✕</button>
                </div>
                <p class="text-sm text-[var(--text-muted)] mb-1">${group.name}</p>
                <p class="text-xs text-[var(--text-muted)] mb-4">${memberCount}/${group.capacity || 12} members${guestCount ? ` • ${guestCount} guest${guestCount === 1 ? '' : 's'}` : ''}</p>

                ${pendingDeleteRequest ? `
                    <div class="mb-4 rounded-xl border border-amber-400/30 bg-amber-400/10 p-3">
                        <p class="text-sm font-semibold text-[var(--mission-gold)]">Delete request pending admin review</p>
                        <p class="text-xs text-[var(--text-muted)] mt-1">Reason: ${String(pendingDeleteRequest.reason || 'No reason provided').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
                    </div>
                ` : ''}

                <div class="space-y-3">
                    <button onclick="window.MyGroups.showDeleteGroupRequestForm('${String(groupId).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}')"
                            class="w-full bg-[var(--mission-red-bright)]/10 border border-[var(--mission-red-bright)]/30 text-[var(--mission-red-bright)] font-bold py-3 rounded-lg">
                        🗑️ Request Admin Delete Group
                    </button>
                    <button onclick="window.MyGroups.closeModal()"
                            class="w-full border border-[var(--card-border)] text-[var(--text-muted)] py-3 rounded-lg">
                        Close
                    </button>
                </div>
            </div>
        `;

        modal.classList.remove('hidden');
    },

    /**
     * Show delete-group request form (admin approval required)
     */
    showDeleteGroupRequestForm(groupId) {
        const group = this.downlineGroups.find(g => g.id === groupId);
        if (!group) return;

        const modal = document.getElementById('groupModal');
        const content = document.getElementById('groupModalContent');
        if (!modal || !content) return;

        content.innerHTML = `
            <div class="p-6">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-lg font-bold text-[var(--text-color)]">Request Group Deletion</h3>
                    <button onclick="window.MyGroups.closeModal()" class="text-[var(--text-muted)] text-xl">✕</button>
                </div>

                <div class="rounded-xl border border-[var(--card-border)] p-3 mb-4">
                    <p class="font-semibold text-[var(--text-color)]">${group.name}</p>
                    <p class="text-xs text-[var(--text-muted)] mt-1">
                        This will not delete the group immediately. An admin must review and approve your request.
                    </p>
                </div>

                <label for="deleteGroupReason" class="block text-sm font-semibold text-[var(--text-color)] mb-2">Reason for deletion</label>
                <textarea id="deleteGroupReason" rows="4" maxlength="300"
                    placeholder="Example: Duplicate group created by mistake."
                    class="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-4 py-3 text-[var(--text-color)] mb-3"></textarea>
                <div id="deleteGroupRequestError" class="text-[var(--mission-red-bright)] text-sm mb-3 hidden"></div>

                <div class="flex gap-3">
                    <button onclick="window.MyGroups.showGroupMenu('${String(groupId).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}')"
                            class="flex-1 border border-[var(--card-border)] text-[var(--text-muted)] py-3 rounded-lg">
                        Back
                    </button>
                    <button onclick="window.MyGroups.submitDeleteGroupRequest('${String(groupId).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}')"
                            class="flex-1 bg-[var(--mission-red-bright)] text-white font-bold py-3 rounded-lg">
                        Send Request
                    </button>
                </div>
            </div>
        `;

        modal.classList.remove('hidden');
        document.getElementById('deleteGroupReason')?.focus();
    },

    /**
     * Submit delete-group request for admin approval
     */
    async submitDeleteGroupRequest(groupId) {
        const group = this.downlineGroups.find(g => g.id === groupId);
        const errorEl = document.getElementById('deleteGroupRequestError');
        if (!group) {
            if (errorEl) {
                errorEl.textContent = 'Group not found.';
                errorEl.classList.remove('hidden');
            }
            return;
        }

        if (group.leaderId !== window.currentUser?.uid) {
            if (errorEl) {
                errorEl.textContent = 'Only the group leader can request deletion.';
                errorEl.classList.remove('hidden');
            }
            return;
        }

        const reason = String(document.getElementById('deleteGroupReason')?.value || '').trim();
        if (reason.length < 5) {
            if (errorEl) {
                errorEl.textContent = 'Please enter a short reason (at least 5 characters).';
                errorEl.classList.remove('hidden');
            }
            return;
        }

        try {
            const requestRef = window.doc(window.db, 'goMission_groupDeletionRequests', groupId);
            const existingDoc = await window.getDoc(requestRef);
            if (existingDoc.exists()) {
                const existing = existingDoc.data() || {};
                if (String(existing.status || '').toLowerCase() === 'pending') {
                    if (errorEl) {
                        errorEl.textContent = 'A deletion request is already pending for this group.';
                        errorEl.classList.remove('hidden');
                    }
                    return;
                }
            }

            const memberIds = this.normalizeCollectionEntries(group.members)
                .map((entry) => (typeof entry === 'string' ? entry : (entry?.odId || entry?.uid || entry?.id || null)))
                .filter(Boolean);
            const guestIds = this.normalizeCollectionEntries(group.guests)
                .map((entry) => this.getGuestUserId(entry))
                .filter(Boolean);

            await window.setDoc(requestRef, {
                groupId: group.id,
                groupName: group.name || 'Unnamed Group',
                leaderId: window.currentUser.uid,
                leaderName: window.currentUser.displayName || group.leaderName || 'Unknown',
                leaderEmail: window.currentUser.email || '',
                reason: reason,
                status: 'pending',
                requestedAt: window.serverTimestamp ? window.serverTimestamp() : new Date().toISOString(),
                requestedAtIso: new Date().toISOString(),
                reviewedAt: null,
                reviewedBy: null,
                reviewedByEmail: null,
                adminNote: '',
                memberCount: memberIds.length,
                guestCount: guestIds.length,
                memberIds: memberIds.slice(0, 50),
                guestIds: guestIds.slice(0, 50)
            }, { merge: true });

            this.pendingGroupDeletionRequestsById = {
                ...(this.pendingGroupDeletionRequestsById || {}),
                [groupId]: {
                    groupId,
                    groupName: group.name || 'Unnamed Group',
                    reason,
                    status: 'pending'
                }
            };

            if (this.isOpen) this.render();
            if (this.isDashboardOpen) await this.renderDashboard();

            this.closeModal();
            alert('Delete request sent to admin for approval.');
        } catch (error) {
            console.error('[MyGroups] Delete request error:', error);
            if (errorEl) {
                errorEl.textContent = 'Failed to send delete request. Please try again.';
                errorEl.classList.remove('hidden');
            }
        }
    },
    
    /**
     * Show pending join requests for a group
     */
    async showJoinRequests(groupId) {
        const group = this.downlineGroups.find(g => g.id === groupId);
        if (!group) return;
        
        const requests = await this.enrichJoinRequestsWithMemberLock(
            this.getUnifiedJoinRequests(group),
            groupId
        );
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
                            ${req.memberLocked ? `
                                <div class="mt-2 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg p-2">
                                    <p class="text-xs text-[var(--text-color)]">
                                        ℹ️ Already in another upline group: <strong>${req.existingGroupName || req.existingGroupId || 'Assigned Group'}</strong>
                                    </p>
                                    <p class="text-xs text-[var(--text-muted)]">
                                        Leader: ${req.existingLeaderName || 'Unknown'}
                                    </p>
                                </div>
                            ` : `
                                <p class="text-xs text-[var(--text-muted)] mt-2">✨ New believer (no current group)</p>
                            `}
                        </div>
                    </div>
                    
                    <div class="mt-4 flex gap-2">
		                        ${req.memberLocked ? `
		                            <button type="button"
		                                    class="flex-1 bg-[var(--mission-gold)]/40 text-[var(--mission-red-deep)]/70 text-sm font-bold py-2 rounded-lg cursor-not-allowed"
		                                    title="Already under another upline leader. Approve as guest only."
	                                    disabled>
	                                🚫 Member Locked
	                            </button>
	                        ` : `
	                            <button onclick="window.MyGroups.approveRequest('${groupId}', '${req.odId}', 'member')" 
	                                    class="flex-1 bg-[var(--mission-gold)] text-[var(--mission-red-deep)] text-sm font-bold py-2 rounded-lg">
	                                ✅ Member
	                            </button>
	                        `}
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
        
        const request = this.getUnifiedJoinRequests(group).find((r) => r.odId === odId);
        if (!request) return;
        
        try {
            // Remove request from both legacy and current arrays
            const updatedRequests = this.getRequestsAfterRemoval(group, odId);
            
            if (type === 'member') {
                // STRICT RULE: one member cannot belong to multiple upline leaders as MEMBER.
                const memberDoc = await window.getDoc(
                    window.doc(window.db, 'goMission_members', odId)
                );
                const memberData = memberDoc.exists() ? (memberDoc.data() || {}) : {};
                const existingPrimaryGroupId = await this.resolvePrimaryMemberGroupIdFromProfile(memberData, odId);
                if (existingPrimaryGroupId && existingPrimaryGroupId !== groupId) {
                    alert(`${request.name} already has an upline group. Approve as Guest only or process a transfer first.`);
                    return;
                }

                // Add as full member
                await window.setDoc(
                    window.doc(window.db, 'goMission_groups', groupId),
                    { 
                        members: window.arrayUnion(odId),
                        joinRequests: updatedRequests.joinRequests,
                        pendingRequests: updatedRequests.pendingRequests
                    },
                    { merge: true }
                );
                
                // Canonical membership pointer: member approvals must always appear in Upline.
                try {
                    await window.setDoc(
                        window.doc(window.db, 'goMission_members', odId),
                        {
                            uplineGroupId: groupId,
                            groupId: groupId,
                            groupRole: 'member',
                            guestGroups: window.arrayRemove(groupId)
                        },
                        { merge: true }
                    );
                } catch (profileSyncError) {
                    console.warn('[MyGroups] Member profile sync skipped after approval:', profileSyncError);
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
                        joinRequests: updatedRequests.joinRequests,
                        pendingRequests: updatedRequests.pendingRequests
                    },
                    { merge: true }
                );
                
                // Also update user's guestGroups array
                try {
                    await window.setDoc(
                        window.doc(window.db, 'goMission_members', odId),
                        {
                            guestGroups: window.arrayUnion(groupId),
                            guestGroupMeta: {
                                [groupId]: {
                                    groupId,
                                    name: group.name || 'Mission Group',
                                    leaderId: group.leaderId || null,
                                    approvedAt: new Date().toISOString(),
                                    approvedBy: window.currentUser.uid
                                }
                            }
                        },
                        { merge: true }
                    );
                } catch (profileSyncError) {
                    console.warn('[MyGroups] Guest profile sync skipped after approval:', profileSyncError);
                }
                
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
        
        const request = this.getUnifiedJoinRequests(group).find((r) => r.odId === odId);
        if (!request) return;
        
        if (!confirm(`Decline request from ${request.name}?`)) return;
        
        try {
            // Remove request from both legacy and current arrays
            const updatedRequests = this.getRequestsAfterRemoval(group, odId);
            
            await window.setDoc(
                window.doc(window.db, 'goMission_groups', groupId),
                {
                    joinRequests: updatedRequests.joinRequests,
                    pendingRequests: updatedRequests.pendingRequests
                },
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
            const memberIds = this.normalizeCollectionEntries(group.members)
                .map((member) => this.getEntityUserId(member))
                .filter(Boolean);
            const guests = this.normalizeCollectionEntries(group.guests);
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
                                <button onclick="window.MyGroups.showGuestOptions('${groupId}', '${this.getGuestUserId(guest)}')" class="text-[var(--text-muted)]">•••</button>
                            ` : ''}
                        </div>
                    `;
                }
            }
            
            membersHtml += '</div>';
            
            // Build pending requests section (if any and user is leader)
            const requests = await this.enrichJoinRequestsWithMemberLock(
                this.getUnifiedJoinRequests(group),
                groupId
            );
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
                                            ${req.memberLocked ? `
                                                <p class="text-xs text-[var(--text-muted)] mt-1">Already in: ${req.existingGroupName || req.existingGroupId || 'Assigned Group'}</p>
                                            ` : `
                                                <p class="text-xs text-[var(--text-muted)] mt-1">✨ New (no current group)</p>
                                            `}
                                        </div>
                                    </div>
                                    <div class="flex gap-2">
                                        ${req.memberLocked ? `
                                            <button type="button"
                                                    class="flex-1 bg-[var(--mission-gold)]/40 text-[var(--mission-red-deep)]/70 text-xs font-bold py-2 rounded-lg cursor-not-allowed"
                                                    title="Already under another upline leader. Approve as guest only."
                                                    disabled>
                                                🚫 Member Locked
                                            </button>
                                        ` : `
                                            <button onclick="window.MyGroups.approveRequest('${groupId}', '${req.odId}', 'member')" 
                                                    class="flex-1 bg-[var(--mission-gold)] hover:opacity-90 text-[var(--mission-red-deep)] text-xs font-bold py-2 rounded-lg transition-opacity">
                                                ✅ Member
                                            </button>
                                        `}
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
        
        const guest = this.findGuestInGroup(group, guestId);
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
        
        const guest = this.findGuestInGroup(group, guestId);
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
        
        const guest = this.findGuestInGroup(group, guestId);
        if (!guest) return;
        
        if (!confirm(`Remove ${guest.name} as guest?`)) return;
        
        try {
            // Remove from guests array
            const updatedGuests = this.normalizeCollectionEntries(group.guests)
                .filter((guestEntry) => this.getGuestUserId(guestEntry) !== guestId);
            
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
            const updatedGuests = this.normalizeCollectionEntries(group.guests)
                .filter((guestEntry) => this.getGuestUserId(guestEntry) !== window.currentUser.uid);
            
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
