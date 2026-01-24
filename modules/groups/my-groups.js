/**
 * Go Mission - My Groups Module
 * Manages Upline (being discipled) and Downline (discipling others) groups
 */

const MyGroups = {
    // State
    uplineGroup: null,
    downlineGroups: [],
    isOpen: false,
    
    /**
     * Initialize module
     */
    async init() {
        console.log('[MyGroups] Initializing...');
        await this.loadGroups();
        this.updateMissionCard();
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
                    this.uplineGroup = { id: uplineDoc.id, ...uplineDoc.data() };
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
            
            console.log('[MyGroups] Loaded:', {
                upline: this.uplineGroup?.name || 'None',
                downline: this.downlineGroups.length
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
     * Open My Groups screen
     */
    open() {
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
    },
    
    /**
     * Render groups in the screen
     */
    render() {
        this.renderUplineGroup();
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
                    <button onclick="MyGroups.showJoinModal()" class="mt-3 w-full bg-[var(--mission-gold)] text-[var(--mission-red-deep)] font-bold py-2 px-4 rounded-lg text-sm">
                        Join with Invite Code
                    </button>
                </div>
            `;
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
        
        return `
            <div class="mission-card rounded-xl overflow-hidden">
                <div class="p-4 border-b border-white/5 flex items-center justify-between">
                    <h4 class="font-bold text-[var(--text-color)] flex items-center gap-2">
                        <span class="text-amber-500">${type === 'upline' ? '👤' : '👥'}</span>
                        ${group.name}
                    </h4>
                    <button onclick="MyGroups.showGroupMenu('${group.id}')" class="text-[var(--text-muted)]">•••</button>
                </div>
                <div class="p-4 space-y-3">
                    <!-- Meeting Section -->
                    <div class="flex items-center justify-between bg-black/20 rounded-lg p-3">
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
                                <button onclick="MyGroups.editSchedule('${group.id}')" class="text-[var(--mission-gold)] text-xs">Edit</button>
                                <button onclick="MyGroups.startMeeting('${group.id}')" class="bg-green-600 hover:bg-green-700 text-white text-xs font-bold py-2 px-3 rounded-lg flex items-center gap-1">
                                    <span>📹</span> Start Meeting
                                </button>
                            </div>
                        ` : `
                            <!-- Disciple: Join Meeting -->
                            <button onclick="MyGroups.joinMeeting('${group.id}')" class="bg-green-600 hover:bg-green-700 text-white text-xs font-bold py-2 px-3 rounded-lg flex items-center gap-1">
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
                        <span class="text-blue-400 font-bold">${guestCount}</span>
                    </div>
                    ` : ''}
                    
                    ${type === 'downline' && requestCount > 0 ? `
                    <!-- Pending Requests Badge -->
                    <button onclick="MyGroups.showJoinRequests('${group.id}')" class="w-full bg-amber-500/20 border border-amber-500/30 text-amber-400 font-medium py-2 rounded-lg text-sm flex items-center justify-center gap-2">
                        🔔 ${requestCount} Pending Request${requestCount > 1 ? 's' : ''}
                    </button>
                    ` : ''}
                    
                    <button onclick="MyGroups.openGroupChat('${group.id}')" class="w-full bg-[var(--mission-red-bright)] hover:bg-[var(--mission-red-bright)]/80 text-white font-bold py-3 rounded-lg text-sm">
                        💬 GROUP CHAT
                    </button>
                    ${type === 'downline' ? `
                        <button onclick="MyGroups.showInviteCode('${group.id}')" class="w-full border border-[var(--mission-gold)]/30 text-[var(--mission-gold)] font-medium py-2 rounded-lg text-sm">
                            🔑 Invite Members
                        </button>
                        <button onclick="MyGroups.showGroupMembers('${group.id}')" class="w-full border border-white/10 text-[var(--text-muted)] font-medium py-2 rounded-lg text-sm">
                            👥 View Members ${guestCount > 0 ? `& Guests` : ''}
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
                    <button onclick="MyGroups.closeModal()" class="text-[var(--text-muted)]">✕</button>
                </div>
                <p class="text-[var(--text-muted)] text-sm mb-4">Enter the invite code given by your discipler:</p>
                <input type="text" id="joinCodeInput" placeholder="Enter 6-digit code" 
                    class="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-4 py-3 text-[var(--text-color)] text-center text-2xl tracking-[0.5em] uppercase mb-4"
                    maxlength="6" oninput="this.value = this.value.toUpperCase()">
                <div id="joinError" class="text-red-500 text-sm text-center mb-4 hidden"></div>
                <button onclick="MyGroups.joinWithCode()" class="w-full bg-[var(--mission-gold)] text-[var(--mission-red-deep)] font-bold py-3 rounded-lg">
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
                    <button onclick="MyGroups.closeModal()" class="text-[var(--text-muted)]">✕</button>
                </div>
                <p class="text-[var(--text-muted)] text-sm mb-4">Create a group to start discipling others:</p>
                <input type="text" id="newGroupName" placeholder="Group name" 
                    class="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-4 py-3 text-[var(--text-color)] mb-4">
                <div id="createError" class="text-red-500 text-sm text-center mb-4 hidden"></div>
                <button onclick="MyGroups.createGroup()" class="w-full bg-[var(--mission-gold)] text-[var(--mission-red-deep)] font-bold py-3 rounded-lg">
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
        
        if (!code || code.length !== 6) {
            if (errorEl) {
                errorEl.textContent = 'Please enter a 6-digit code';
                errorEl.classList.remove('hidden');
            }
            return;
        }
        
        try {
            // Find group by invite code
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
            
            const groupDoc = snapshot.docs[0];
            const groupData = groupDoc.data();
            
            // Check if invite code has expired
            if (groupData.inviteCodeExpiresAt && new Date(groupData.inviteCodeExpiresAt) < new Date()) {
                if (errorEl) {
                    errorEl.textContent = 'This invite code has expired. Ask the group leader for a new code.';
                    errorEl.classList.remove('hidden');
                }
                return;
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
            
            // Note: Cloud Function (onMemberJoined) will automatically send push notification to leader
            
            // Close modal and show success
            this.closeModal();
            
            alert(`Request sent to ${groupData.name}!\n\nThe group leader will review your request.`);
            
        } catch (error) {
            console.error('[MyGroups] Join request error:', error);
            if (errorEl) {
                errorEl.textContent = 'Failed to send request';
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
                        <button onclick="MyGroups.closeModal()" class="text-[var(--text-muted)] text-xl">✕</button>
                    </div>
                    <p class="text-[var(--text-muted)] text-sm mb-4">Share this code with people you want to disciple:</p>
                    <div class="bg-black/30 rounded-xl p-6 mb-2">
                        <p class="text-4xl font-bold text-[var(--mission-gold)] tracking-[0.3em] font-mono">${inviteCode}</p>
                    </div>
                    <p class="text-amber-500/70 text-xs mb-4">⏱️ ${expiresText}</p>
                    <p class="text-[var(--text-color)] font-medium mb-4">${group.name}</p>
                    <div class="space-y-3">
                        <button onclick="MyGroups.copyInviteCode('${inviteCode}')" class="w-full bg-[var(--mission-gold)] text-[var(--mission-red-deep)] font-bold py-3 rounded-lg">
                            📋 Copy Code
                        </button>
                        <button onclick="MyGroups.shareInviteCode('${inviteCode}', '${group.name.replace(/'/g, "\\'")}')" class="w-full border border-[var(--mission-gold)]/30 text-[var(--mission-gold)] font-medium py-3 rounded-lg">
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
            // Set the active group and open chat
            const group = this.uplineGroup?.id === groupId ? 
                this.uplineGroup : 
                this.downlineGroups.find(g => g.id === groupId);
            
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
            // Fallback: Open Jitsi directly
            const roomName = `GoMission-${groupId}`;
            const jitsiUrl = `https://meet.jit.si/${roomName}`;
            window.open(jitsiUrl, '_blank');
        }
    },
    
    /**
     * Join meeting for a group (Disciple/Member)
     */
    joinMeeting(groupId) {
        // Check upline group first, then downline groups
        let group = null;
        if (this.uplineGroup?.id === groupId) {
            group = this.uplineGroup;
        } else {
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
            GroupMeeting.joinMeeting(group.id, group.name, userName, userEmail, isLeader);
        } else {
            // Fallback: Open Jitsi directly
            const roomName = `GoMission-${groupId}`;
            const jitsiUrl = `https://meet.jit.si/${roomName}`;
            window.open(jitsiUrl, '_blank');
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
                    <button onclick="MyGroups.closeModal()" class="text-[var(--text-muted)]">✕</button>
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
                
                <div id="scheduleError" class="text-red-500 text-sm text-center mt-4 hidden"></div>
                
                <button onclick="MyGroups.saveSchedule('${groupId}')" class="w-full bg-[var(--mission-gold)] text-[var(--mission-red-deep)] font-bold py-3 rounded-lg mt-6">
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
                <div class="bg-black/30 rounded-xl p-4 border border-white/10">
                    <div class="flex items-start gap-3">
                        <img src="${req.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(req.name)}&background=4a0404&color=fbbf24`}" 
                             class="w-12 h-12 rounded-full border border-white/10">
                        <div class="flex-1">
                            <p class="font-bold text-[var(--text-color)]">${req.name}</p>
                            <p class="text-xs text-[var(--text-muted)]">${req.email || 'No email'}</p>
                            ${req.hasExistingGroup ? `
                                <div class="mt-2 bg-blue-500/10 border border-blue-500/30 rounded-lg p-2">
                                    <p class="text-xs text-blue-400">
                                        ℹ️ Already in: <strong>${req.existingGroupName}</strong>
                                    </p>
                                    <p class="text-xs text-blue-400/70">
                                        Leader: ${req.existingLeaderName}
                                    </p>
                                </div>
                            ` : `
                                <p class="text-xs text-green-400 mt-2">✨ New believer (no current group)</p>
                            `}
                        </div>
                    </div>
                    
                    <div class="mt-4 flex gap-2">
                        <!-- Always show both options: Member or Guest -->
                        <button onclick="MyGroups.approveRequest('${groupId}', '${req.odId}', 'member')" 
                                class="flex-1 bg-green-600 text-white text-sm font-bold py-2 rounded-lg">
                            ✅ Member
                        </button>
                        <button onclick="MyGroups.approveRequest('${groupId}', '${req.odId}', 'guest')" 
                                class="flex-1 bg-blue-600 text-white text-sm font-bold py-2 rounded-lg">
                            🎫 Guest
                        </button>
                        <button onclick="MyGroups.declineRequest('${groupId}', '${req.odId}')" 
                                class="flex-1 bg-red-600/20 text-red-400 text-sm font-bold py-2 rounded-lg border border-red-500/30">
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
                    <button onclick="MyGroups.closeModal()" class="text-[var(--text-muted)] text-xl">✕</button>
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
            this.showJoinRequests(groupId);
            
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
            this.showJoinRequests(groupId);
            
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
            
            let membersHtml = '<div class="space-y-3">';
            
            // Section: Members
            membersHtml += `<p class="text-sm text-[var(--text-muted)] font-medium">📍 DISCIPLES (${memberIds.length})</p>`;
            
            for (const memberId of memberIds) {
                if (memberId === group.leaderId) continue; // Skip leader
                
                const memberDoc = await window.getDoc(window.doc(window.db, 'goMission_members', memberId));
                const member = memberDoc.exists() ? memberDoc.data() : { displayName: 'Unknown' };
                
                membersHtml += `
                    <div class="flex items-center justify-between bg-black/20 rounded-lg p-3">
                        <div class="flex items-center gap-3">
                            <img src="${member.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.displayName || 'U')}&background=4a0404&color=fbbf24`}" 
                                 class="w-10 h-10 rounded-full">
                            <div>
                                <p class="text-[var(--text-color)] font-medium">${member.displayName || 'Unknown'}</p>
                                <p class="text-xs text-[var(--text-muted)]">Member</p>
                            </div>
                        </div>
                    </div>
                `;
            }
            
            // Section: Guests
            if (guests.length > 0) {
                membersHtml += `<p class="text-sm text-[var(--text-muted)] font-medium mt-4">🎫 GUESTS (${guests.length})</p>`;
                
                for (const guest of guests) {
                    membersHtml += `
                        <div class="flex items-center justify-between bg-blue-500/10 rounded-lg p-3 border border-blue-500/20">
                            <div class="flex items-center gap-3">
                                <img src="${guest.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(guest.name)}&background=1e40af&color=93c5fd`}" 
                                     class="w-10 h-10 rounded-full">
                                <div>
                                    <p class="text-[var(--text-color)] font-medium">${guest.name} <span class="text-blue-400 text-xs">🎫</span></p>
                                    <p class="text-xs text-blue-400/70">From: ${guest.homeGroupName}</p>
                                </div>
                            </div>
                            <button onclick="MyGroups.showGuestOptions('${groupId}', '${guest.odId}')" class="text-[var(--text-muted)]">•••</button>
                        </div>
                    `;
                }
            }
            
            membersHtml += '</div>';
            
            content.innerHTML = `
                <div class="p-6">
                    <div class="flex items-center justify-between mb-6">
                        <h3 class="text-lg font-bold text-[var(--text-color)]">👥 ${group.name}</h3>
                        <button onclick="MyGroups.closeModal()" class="text-[var(--text-muted)] text-xl">✕</button>
                    </div>
                    <div class="max-h-[60vh] overflow-y-auto">
                        ${membersHtml}
                    </div>
                </div>
            `;
            
        } catch (error) {
            console.error('[MyGroups] Load members error:', error);
            content.innerHTML = `
                <div class="p-6 text-center">
                    <p class="text-red-400">Failed to load members</p>
                    <button onclick="MyGroups.closeModal()" class="mt-4 text-[var(--text-muted)]">Close</button>
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
                    <button onclick="MyGroups.showGroupMembers('${groupId}')" class="text-[var(--text-muted)]">← Back</button>
                </div>
                
                <div class="flex items-center gap-3 mb-6">
                    <img src="${guest.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(guest.name)}&background=1e40af&color=93c5fd`}" 
                         class="w-14 h-14 rounded-full">
                    <div>
                        <p class="text-[var(--text-color)] font-bold">${guest.name}</p>
                        <p class="text-xs text-blue-400">🎫 Guest from ${guest.homeGroupName}</p>
                    </div>
                </div>
                
                <div class="space-y-3">
                    <button onclick="MyGroups.promoteGuestToMember('${groupId}', '${guestId}')" 
                            class="w-full bg-green-600 text-white font-bold py-3 rounded-lg">
                        ✅ Promote to Full Member
                    </button>
                    <p class="text-xs text-[var(--text-muted)] text-center">
                        This will request transfer from their original leader
                    </p>
                    
                    <button onclick="MyGroups.removeGuest('${groupId}', '${guestId}')" 
                            class="w-full bg-red-600/20 text-red-400 font-bold py-3 rounded-lg border border-red-500/30 mt-4">
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
    }
};

// Make available globally
window.MyGroups = MyGroups;
