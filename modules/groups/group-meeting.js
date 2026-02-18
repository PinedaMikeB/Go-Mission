/**
 * Go Mission - Group Meeting Module (Jitsi Integration)
 * 
 * Embeds Jitsi Meet for in-app video meetings
 * Tracks attendance and meeting activity
 * 
 * Features:
 * - Schedule weekly meetings (day + time)
 * - Join meeting button when it's meeting time
 * - Full-screen embedded Jitsi
 * - Meeting attendance tracking
 * - Leader can start meeting anytime
 */

const GroupMeeting = {
  // State
  api: null,
  currentGroupId: null,
  currentMeetingId: null,
  joinedAt: null,
  participants: [],
  joinedConference: false,
  connectTimeoutId: null,
  currentRoomUrl: null,
  initPromise: null,
  lastJoinArgs: null,
  
  // Jitsi configuration - self-hosted is faster
  JITSI_DOMAIN: 'call.wotgonline.com', // Self-hosted - FAST
  JITSI_PUBLIC: 'meet.jit.si', // Public fallback
  useSelfHosted: true, // Use self-hosted (faster)
  allowPublicFallback: false, // Keep false so production never silently falls back to demo meet.jit.si
  
  // Meeting window (minutes before/after scheduled time)
  MEETING_WINDOW_BEFORE: 15,  // Can join 15 min before
  MEETING_WINDOW_AFTER: 120,  // Meeting available for 2 hours
  
  /**
   * Initialize - load Jitsi API script
   */
  async init() {
    if (window.JitsiMeetExternalAPI) return;

    // Avoid loading the script multiple times if init() is called concurrently.
    if (this.initPromise) {
      await this.initPromise;
      return;
    }

    this.initPromise = (async () => {
      await this.loadJitsiScript({ timeoutMs: 3500 });
      console.log('[GroupMeeting] Initialized');
    })();

    try {
      await this.initPromise;
    } finally {
      this.initPromise = null;
    }
  },
  
  /**
   * Load Jitsi Meet External API script
   */
  loadJitsiScript({ timeoutMs = 10000 } = {}) {
    return new Promise((resolve, reject) => {
      if (window.JitsiMeetExternalAPI) {
        resolve();
        return;
      }

      // Script can be loaded from any Jitsi domain; prefer self-hosted but fall back
      // to meet.jit.si for fast/consistent script delivery.
      const domainsToTry = this.useSelfHosted
        ? [this.JITSI_DOMAIN, this.JITSI_PUBLIC]
        : [this.JITSI_PUBLIC, this.JITSI_DOMAIN];

      const candidates = domainsToTry.flatMap((domain) => ([
        `https://${domain}/external_api.js`,
        `https://${domain}/libs/external_api.min.js`
      ]));

      const loadCandidate = (index) => {
        if (index >= candidates.length) {
          console.error('[GroupMeeting] Failed to load Jitsi API (all candidates)', candidates);
          reject(new Error('Failed to load Jitsi API. Check network/SSL and external_api path.'));
          return;
        }

        this.setMeetingStatus?.(`Loading Jitsi API…`);

        const script = document.createElement('script');
        script.src = candidates[index];
        script.async = true;

        const timer = setTimeout(() => {
          // In case neither onload nor onerror fires (rare, but happens in the wild).
          script.remove();
          loadCandidate(index + 1);
        }, timeoutMs);

        script.onload = () => {
          clearTimeout(timer);
          if (window.JitsiMeetExternalAPI) {
            console.log('[GroupMeeting] Jitsi API loaded from', candidates[index]);
            resolve();
            return;
          }

          // Loaded but did not expose API; try next candidate.
          script.remove();
          loadCandidate(index + 1);
        };

        script.onerror = () => {
          clearTimeout(timer);
          script.remove();
          loadCandidate(index + 1);
        };

        document.head.appendChild(script);
      };

      loadCandidate(0);
    });
  },

  getRoomUrl(domain, roomName) {
    return `https://${domain}/${roomName}`;
  },

  /**
   * Quick reachability check so we can fail fast (instead of showing a blank iframe).
   * Uses no-cors so it can run cross-origin; success means "network reachable", not "200 OK".
   */
  async checkReachable(url, timeoutMs = 2500) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      await fetch(url, { mode: 'no-cors', cache: 'no-store', signal: controller.signal });
      clearTimeout(timer);
      return true;
    } catch (_) {
      return false;
    }
  },

  retryLastJoin() {
    const a = this.lastJoinArgs;
    if (!a) return;
    this.joinMeeting(a.groupId, a.groupName, a.userName, a.userEmail, a.isLeader);
  },
  
  /**
   * Generate unique room name for group (Self-hosted format)
   */
  generateRoomName(groupId, groupName) {
    // Clean group name for URL
    const cleanName = String(groupName || '')
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .replace(/\s+/g, '')
      .substring(0, 15);
    
    // Use group ID for uniqueness
    const shortId = groupId.substring(groupId.length - 8);
    
    // Self-hosted room format: just the room name
    return `GoMission${cleanName}${shortId}`;
  },

  /**
   * Check if it's meeting time for a group
   */
  isMeetingTime(schedule) {
    if (!schedule || !schedule.day || !schedule.time) return false;
    
    const now = new Date();
    const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' });
    
    // Check if it's the right day
    if (currentDay.toLowerCase() !== schedule.day.toLowerCase()) {
      return false;
    }
    
    // Parse scheduled time (format: "HH:MM" in 24h)
    const [schedHour, schedMin] = schedule.time.split(':').map(Number);
    const scheduledTime = new Date(now);
    scheduledTime.setHours(schedHour, schedMin, 0, 0);
    
    // Calculate window
    const windowStart = new Date(scheduledTime.getTime() - this.MEETING_WINDOW_BEFORE * 60000);
    const windowEnd = new Date(scheduledTime.getTime() + this.MEETING_WINDOW_AFTER * 60000);
    
    return now >= windowStart && now <= windowEnd;
  },
  
  /**
   * Get next meeting time for display
   */
  getNextMeetingInfo(schedule) {
    if (!schedule || !schedule.day || !schedule.time) {
      return { text: 'No meeting scheduled', isToday: false };
    }
    
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const now = new Date();
    const currentDayIndex = now.getDay();
    const targetDayIndex = days.findIndex(d => d.toLowerCase() === schedule.day.toLowerCase());
    
    if (targetDayIndex === -1) {
      return { text: 'Invalid schedule', isToday: false };
    }
    
    // Calculate days until meeting
    let daysUntil = targetDayIndex - currentDayIndex;
    if (daysUntil < 0) daysUntil += 7;
    
    // Format time for display
    const [hour, min] = schedule.time.split(':').map(Number);
    const timeStr = new Date(0, 0, 0, hour, min).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    
    if (daysUntil === 0) {
      // Today
      const isNow = this.isMeetingTime(schedule);
      if (isNow) {
        return { text: `Meeting in progress! ${timeStr}`, isToday: true, isNow: true };
      }
      return { text: `Today at ${timeStr}`, isToday: true, isNow: false };
    } else if (daysUntil === 1) {
      return { text: `Tomorrow at ${timeStr}`, isToday: false };
    } else {
      return { text: `${schedule.day} at ${timeStr}`, isToday: false };
    }
  },
  
  /**
   * Start/Join a meeting
   */
  async joinMeeting(groupId, groupName, userName, userEmail, isLeader = false) {
    try {
      this.lastJoinArgs = { groupId, groupName, userName, userEmail, isLeader };

      // Show UI immediately so users see something happening even if the API load is slow/fails.
      this.showMeetingModal(groupName);
      this.setMeetingStatus('Loading meeting…');

      const roomName = this.generateRoomName(groupId, groupName);
      const desiredDomain = this.useSelfHosted ? this.JITSI_DOMAIN : this.JITSI_PUBLIC;
      this.currentRoomUrl = this.getRoomUrl(desiredDomain, roomName);

      // Fail fast if the call server is not responding.
      this.setMeetingStatus(`Checking ${desiredDomain}…`);
      const reachable = await this.checkReachable(`https://${desiredDomain}/`, 2500);
      if (!reachable) {
        this.setMeetingStatus(`${desiredDomain} is not responding. Please try again in a moment.`);
        return;
      }

      // Load Jitsi API if not loaded
      if (!window.JitsiMeetExternalAPI) {
        this.setMeetingStatus('Loading Jitsi API…');
        await this.init();
      }
      
      if (!window.JitsiMeetExternalAPI) {
        throw new Error('Jitsi API not available');
      }

      this.currentGroupId = groupId;
      this.joinedAt = new Date();
      this.joinedConference = false;

      // Domain may change if we later allow fallback.
      const activeDomain = this.useSelfHosted ? this.JITSI_DOMAIN : this.JITSI_PUBLIC;
      this.currentRoomUrl = this.getRoomUrl(activeDomain, roomName);
      console.log('[GroupMeeting] Joining room:', roomName, 'on', activeDomain);
      this.setMeetingStatus(`Connecting to ${activeDomain}…`);

      if (this.connectTimeoutId) {
        clearTimeout(this.connectTimeoutId);
      }
      this.connectTimeoutId = setTimeout(() => {
        if (this.joinedConference) return;
        this.setMeetingStatus('Still connecting…');
      }, 12000);
      
      // Simpler Jitsi configuration for reliability
      const options = {
        roomName: roomName,
        parentNode: document.getElementById('jitsi-container'),
        width: '100%',
        height: '100%',
        userInfo: {
          displayName: userName || 'Guest',
          email: userEmail || ''
        },
        configOverwrite: {
          // Basic settings
          prejoinPageEnabled: false,
          prejoinConfig: {
            enabled: false
          },
          startWithAudioMuted: false,
          startWithVideoMuted: false,
          disableDeepLinking: true,

          // Make XMPP endpoints explicit (helps some reverse-proxy setups).
          bosh: `https://${activeDomain}/http-bind`,
          websocket: `wss://${activeDomain}/xmpp-websocket`,

          // Reduce third-party fetches for faster, more reliable first paint.
          disableThirdPartyRequests: true,
          
          // Disable features that cause issues
          enableWelcomePage: false,
          enableClosePage: false,
          enableLobby: false,
          
          // Disable recording features
          fileRecordingsEnabled: false,
          liveStreamingEnabled: false,
          localRecording: { enabled: false },
          
          // Performance
          resolution: 480,
          p2p: { enabled: true },

          // Keep core controls visible and route extras to the More menu.
          toolbarButtons: [
            'microphone',
            'camera',
            'tileview',
            'overflowmenu',
            'hangup',
            'desktop',
            'reactions'
          ]
        },
        interfaceConfigOverwrite: {
          // Keep main toolbar compact and place extras under "More actions".
          TOOLBAR_BUTTONS: [
            'microphone',
            'camera',
            'tileview',
            'overflowmenu',
            'hangup',
            'desktop',
            'reactions'
          ],
          MAIN_TOOLBAR_BUTTONS: [
            'microphone',
            'camera',
            'tileview',
            'overflowmenu',
            'hangup'
          ],
          
          // Hide branding
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
          SHOW_BRAND_WATERMARK: false,
          SHOW_POWERED_BY: false,
          DEFAULT_LOGO_URL: '',
          DEFAULT_WELCOME_PAGE_LOGO_URL: '',
          JITSI_WATERMARK_LINK: '',
          BRAND_WATERMARK_LINK: '',
          APP_NAME: '',
          NATIVE_APP_NAME: '',
          PROVIDER_NAME: '',
          MOBILE_APP_PROMO: false,
          
          // Clean UI
          DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
          HIDE_INVITE_MORE_HEADER: true,
          SETTINGS_SECTIONS: ['devices']
        }
      };
      
      this.api = new JitsiMeetExternalAPI(activeDomain, options);
      
      // Event listeners
      this.api.addListener('videoConferenceJoined', (data) => {
        console.log('[GroupMeeting] Joined conference:', data);
        this.joinedConference = true;
        if (this.connectTimeoutId) {
          clearTimeout(this.connectTimeoutId);
          this.connectTimeoutId = null;
        }
        this.setMeetingStatus('');
        this.onJoined(groupId, userName);
        
        // Switch to tile view for better group view
        setTimeout(() => {
          this.api.executeCommand('setTileView', true);
        }, 1000);
      });
      
      this.api.addListener('videoConferenceLeft', (data) => {
        console.log('[GroupMeeting] Left conference:', data);
        this.joinedConference = false;
        if (this.connectTimeoutId) {
          clearTimeout(this.connectTimeoutId);
          this.connectTimeoutId = null;
        }
        this.onLeft(groupId);
      });

      // Surface failures that otherwise look like "black screen"
      this.api.addListener('errorOccurred', (evt) => {
        console.error('[GroupMeeting] Jitsi errorOccurred:', evt);
        const msg = evt?.message || evt?.error?.message || evt?.error || 'Meeting error';
        this.setMeetingStatus(`Error: ${msg}`);
      });

      // Some failures never reach errorOccurred; listen for these too.
      this.api.addListener('connectionFailed', (evt) => {
        console.error('[GroupMeeting] Jitsi connectionFailed:', evt);
        this.setMeetingStatus('Connection failed. Tap Retry.');
      });

      this.api.addListener('conferenceFailed', (evt) => {
        console.error('[GroupMeeting] Jitsi conferenceFailed:', evt);
        this.setMeetingStatus('Conference failed. Tap Retry.');
      });
      
      this.api.addListener('participantJoined', (data) => {
        console.log('[GroupMeeting] Participant joined:', data);
        this.participants.push(data);
        this.updateParticipantCount();
      });
      
      this.api.addListener('participantLeft', (data) => {
        console.log('[GroupMeeting] Participant left:', data);
        this.participants = this.participants.filter(p => p.id !== data.id);
        this.updateParticipantCount();
      });
      
      this.api.addListener('readyToClose', () => {
        console.log('[GroupMeeting] Ready to close');
        this.leaveMeeting();
      });
      
    } catch (error) {
      console.error('[GroupMeeting] Error creating Jitsi instance:', error);
      this.setMeetingStatus(`Failed to start meeting: ${error?.message || error}`);
      // Keep modal open so user can see the error; allow them to Retry or Leave.
    }
  },
  
  /**
   * Update participant count in header
   */
  updateParticipantCount() {
    const countEl = document.getElementById('participant-count');
    if (countEl) {
      const count = this.participants.length + 1; // +1 for self
      countEl.textContent = `${count} participant${count !== 1 ? 's' : ''}`;
    }
  },
  
  /**
   * Show full-screen meeting modal
   */
  showMeetingModal(groupName) {
    // Remove existing modal if any
    const existing = document.getElementById('meeting-modal');
    if (existing) existing.remove();
    
    const modal = document.createElement('div');
    modal.id = 'meeting-modal';
    modal.className = 'fixed inset-0 z-[200] bg-black flex flex-col';
    // Ensure visibility even if Tailwind CDN misses some dynamic classes.
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.right = '0';
    modal.style.bottom = '0';
    modal.style.zIndex = '9999';
    modal.style.background = '#000';
    modal.style.display = 'flex';
    modal.style.flexDirection = 'column';
    modal.innerHTML = `
      <!-- Header -->
      <div class="flex-shrink-0 bg-black/90 px-4 py-3 flex items-center justify-between border-b border-white/10">
        <div class="flex items-center gap-3">
          <span class="text-2xl">🔥</span>
          <div>
            <p class="text-white font-bold text-sm">${groupName || 'Go Mission Meeting'}</p>
            <p id="participant-count" class="text-white/60 text-xs">Connecting...</p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <button onclick="window.GroupMeeting.retryLastJoin()"
                  class="px-3 py-2 bg-white/10 hover:bg-white/15 text-white rounded-full text-sm font-bold transition-colors">
            ↻ Retry
          </button>
          <button onclick="window.GroupMeeting.leaveMeeting()" 
                  class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-full text-sm font-bold transition-colors">
            ✕ Leave
          </button>
        </div>
      </div>

      <!-- Status -->
      <div id="meeting-status" class="px-4 py-2 text-xs text-white/70 bg-black/70 border-b border-white/10"></div>
      
      <!-- Jitsi Container -->
      <div id="jitsi-container" class="flex-1 w-full"></div>
    `;
    
    document.body.appendChild(modal);
    
    // Prevent body scroll
    document.body.style.overflow = 'hidden';
  },

  /**
   * Update the small status line in the meeting modal.
   */
  setMeetingStatus(text) {
    const el = document.getElementById('meeting-status');
    if (!el) return;
    el.textContent = text || '';
    el.style.display = text ? 'block' : 'none';
  },
  
  /**
   * Hide meeting modal
   */
  hideMeetingModal() {
    const modal = document.getElementById('meeting-modal');
    if (modal) modal.remove();
    
    // Restore body scroll
    document.body.style.overflow = '';
  },
  
  /**
   * Leave the current meeting
   */
  leaveMeeting() {
    if (this.api) {
      this.api.dispose();
      this.api = null;
    }

    if (this.connectTimeoutId) {
      clearTimeout(this.connectTimeoutId);
      this.connectTimeoutId = null;
    }
    this.joinedConference = false;
    
    this.hideMeetingModal();
    this.currentGroupId = null;
    this.participants = [];
  },
  
  /**
   * Called when user joins the meeting
   */
  async onJoined(groupId, userName) {
    if (!window.db || !window.currentUser) return;
    
    try {
      const today = new Date().toISOString().split('T')[0];
      const monthKey = today.substring(0, 7); // YYYY-MM
      
      // Create/update meeting record
      const meetingRef = window.doc(
        window.db, 
        'goMission_meetings', 
        `${groupId}_${today}`
      );
      
      this.currentMeetingId = `${groupId}_${today}`;
      
      // Add attendance record
      await window.setDoc(meetingRef, {
        groupId: groupId,
        date: today,
        startedAt: window.serverTimestamp(),
        attendees: window.arrayUnion({
          odId: window.currentUser.uid,
          name: userName,
          joinedAt: new Date().toISOString()
        })
      }, { merge: true });
      
      // Update monthly usage stats
      const statsRef = window.doc(window.db, 'goMission_meetingStats', monthKey);
      await window.setDoc(statsRef, {
        month: monthKey,
        totalMeetings: window.increment(1),
        lastUpdated: window.serverTimestamp()
      }, { merge: true });
      
      console.log('[GroupMeeting] Attendance recorded');
    } catch (error) {
      console.error('[GroupMeeting] Error recording attendance:', error);
    }
  },
  
  /**
   * Called when user leaves the meeting
   */
  async onLeft(groupId) {
    if (!window.db || !window.currentUser || !this.currentMeetingId) return;
    
    try {
      const duration = this.joinedAt ? Math.round((new Date() - this.joinedAt) / 60000) : 0;
      const monthKey = new Date().toISOString().substring(0, 7); // YYYY-MM
      
      // Update meeting record with leave time
      const meetingRef = window.doc(window.db, 'goMission_meetings', this.currentMeetingId);
      
      // Get current doc to update attendee
      const meetingDoc = await window.getDoc(meetingRef);
      if (meetingDoc.exists()) {
        const data = meetingDoc.data();
        const attendees = data.attendees || [];
        
        // Update the attendee's leave time
        const updatedAttendees = attendees.map(a => {
          if (a.odId === window.currentUser.uid && !a.leftAt) {
            return { ...a, leftAt: new Date().toISOString(), durationMinutes: duration };
          }
          return a;
        });
        
        await window.setDoc(meetingRef, {
          attendees: updatedAttendees,
          lastActivity: window.serverTimestamp()
        }, { merge: true });
      }
      
      // Update monthly usage stats with minutes
      const statsRef = window.doc(window.db, 'goMission_meetingStats', monthKey);
      await window.setDoc(statsRef, {
        totalMinutes: window.increment(duration),
        lastUpdated: window.serverTimestamp()
      }, { merge: true });
      
      console.log('[GroupMeeting] Leave recorded, duration:', duration, 'minutes');
    } catch (error) {
      console.error('[GroupMeeting] Error recording leave:', error);
    }
    
    this.joinedAt = null;
    this.currentMeetingId = null;
  },
  
  /**
   * Get meeting history for a group
   */
  async getMeetingHistory(groupId, limit = 10) {
    if (!window.db) return [];
    
    try {
      const meetingsRef = window.collection(window.db, 'goMission_meetings');
      const q = window.query(
        meetingsRef,
        window.where('groupId', '==', groupId),
        window.orderBy('date', 'desc'),
        window.limit(limit)
      );
      
      const snapshot = await window.getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('[GroupMeeting] Error fetching history:', error);
      return [];
    }
  },
  
  /**
   * Update group meeting schedule
   */
  async updateSchedule(groupId, day, time) {
    if (!window.db) return false;
    
    try {
      const groupRef = window.doc(window.db, 'goMission_groups', groupId);
      await window.setDoc(groupRef, {
        meetingSchedule: {
          day: day,      // e.g., "Saturday"
          time: time,    // e.g., "19:00" (7 PM in 24h format)
          updatedAt: window.serverTimestamp()
        }
      }, { merge: true });
      
      console.log('[GroupMeeting] Schedule updated:', day, time);
      return true;
    } catch (error) {
      console.error('[GroupMeeting] Error updating schedule:', error);
      return false;
    }
  },
  
  /**
   * Render meeting section UI for group screen
   */
  renderMeetingSection(group, isLeader) {
    // Support both old 'schedule' field and new 'meetingSchedule' field
    const schedule = group.meetingSchedule || group.schedule;
    const meetingInfo = this.getNextMeetingInfo(schedule);
    
    // Everyone can join anytime - first person becomes host
    const canJoin = true;
    
    // Determine button text
    let buttonText = meetingInfo.isNow ? 'Join Now' : 'Start Meeting';
    
    return `
      <div class="bg-[var(--card-bg)] rounded-xl p-4 border border-[var(--card-border)]">
        <div class="flex items-center justify-between mb-3">
          <h3 class="font-bold text-[var(--text-color)] flex items-center gap-2">
            <span class="text-xl">📹</span> Weekly Meeting
          </h3>
          ${isLeader ? `
            <button onclick="window.GroupMeeting.showScheduleModal('${group.id}')" 
                    class="text-xs text-amber-500 hover:text-amber-400">
              Edit Schedule
            </button>
          ` : ''}
        </div>
        
        <div class="flex items-center justify-between">
          <div>
            <p class="text-[var(--text-color)] ${meetingInfo.isNow ? 'text-green-400 font-bold animate-pulse' : ''}">
              ${meetingInfo.text}
            </p>
            ${!schedule ? `
              <p class="text-xs text-[var(--text-muted)] mt-1">
                ${isLeader ? 'Set a weekly meeting time for your group' : 'No schedule set yet'}
              </p>
            ` : ''}
          </div>
          
          <button onclick="window.GroupMeeting.joinMeeting('${group.id}', '${group.name.replace(/'/g, "\\'")}', '${(window.currentUser?.displayName || 'Guest').replace(/'/g, "\\'")}', '${window.currentUser?.email || ''}', ${isLeader})"
                  class="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-bold transition-colors flex items-center gap-2">
            <span>📹</span> ${buttonText}
          </button>
        </div>
      </div>
    `;
  },
  
  /**
   * Show schedule editing modal (for leaders)
   */
  showScheduleModal(groupId) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    const modal = document.createElement('div');
    modal.id = 'schedule-modal';
    modal.className = 'fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4';
    modal.innerHTML = `
      <div class="bg-[var(--card-bg)] rounded-2xl p-6 w-full max-w-sm border border-[var(--card-border)]">
        <h3 class="text-lg font-bold text-[var(--text-color)] mb-4">Set Meeting Schedule</h3>
        
        <div class="space-y-4">
          <div>
            <label class="block text-sm text-[var(--text-muted)] mb-2">Day of Week</label>
            <select id="meeting-day" class="w-full bg-[var(--input-bg)] text-[var(--text-color)] rounded-lg p-3 border border-[var(--card-border)]">
              ${days.map(day => `<option value="${day}">${day}</option>`).join('')}
            </select>
          </div>
          
          <div>
            <label class="block text-sm text-[var(--text-muted)] mb-2">Time</label>
            <input type="time" id="meeting-time" value="19:00"
                   class="w-full bg-[var(--input-bg)] text-[var(--text-color)] rounded-lg p-3 border border-[var(--card-border)]">
          </div>
        </div>
        
        <div class="flex gap-3 mt-6">
          <button onclick="document.getElementById('schedule-modal').remove()"
                  class="flex-1 py-3 bg-[var(--input-bg)] text-[var(--text-muted)] rounded-lg font-bold">
            Cancel
          </button>
          <button onclick="window.GroupMeeting.saveSchedule('${groupId}')"
                  class="flex-1 py-3 bg-amber-500 text-[#2a0505] rounded-lg font-bold">
            Save
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
  },
  
  /**
   * Save schedule from modal
   */
  async saveSchedule(groupId) {
    const day = document.getElementById('meeting-day').value;
    const time = document.getElementById('meeting-time').value;
    
    const success = await this.updateSchedule(groupId, day, time);
    
    if (success) {
      document.getElementById('schedule-modal').remove();
      // Refresh group screen
      if (typeof Groups !== 'undefined' && Groups.renderGroupScreen) {
        Groups.renderGroupScreen();
      }
    } else {
      alert('Failed to save schedule. Please try again.');
    }
  },
  
  /**
   * Get meeting usage stats for current month (for admin dashboard)
   */
  async getMonthlyStats() {
    if (!window.db) return null;
    
    try {
      const monthKey = new Date().toISOString().substring(0, 7);
      const statsRef = window.doc(window.db, 'goMission_meetingStats', monthKey);
      const statsDoc = await window.getDoc(statsRef);
      
      if (statsDoc.exists()) {
        return statsDoc.data();
      }
      return { month: monthKey, totalMeetings: 0, totalMinutes: 0 };
    } catch (error) {
      console.error('[GroupMeeting] Error fetching stats:', error);
      return null;
    }
  },
  
  /**
   * Render meeting stats for admin dashboard
   */
  async renderMeetingStats() {
    const stats = await this.getMonthlyStats();
    if (!stats) return '';
    
    const minutesUsed = stats.totalMinutes || 0;
    const meetingsCount = stats.totalMeetings || 0;
    const minutesLimit = 5000; // JaaS free tier
    const usagePercent = Math.min(100, Math.round((minutesUsed / minutesLimit) * 100));
    
    return `
      <div class="bg-[var(--card-bg)] rounded-xl p-4 border border-[var(--card-border)]">
        <h3 class="font-bold text-[var(--text-color)] mb-3 flex items-center gap-2">
          <span>📊</span> Meeting Usage (${stats.month})
        </h3>
        
        <div class="space-y-3">
          <div class="flex justify-between items-center">
            <span class="text-[var(--text-muted)] text-sm">Minutes Used</span>
            <span class="text-[var(--text-color)] font-bold">${minutesUsed} / ${minutesLimit}</span>
          </div>
          
          <div class="w-full bg-black/30 rounded-full h-2">
            <div class="bg-amber-500 h-2 rounded-full transition-all" style="width: ${usagePercent}%"></div>
          </div>
          
          <div class="flex justify-between items-center text-sm">
            <span class="text-[var(--text-muted)]">Total Meetings</span>
            <span class="text-amber-400 font-bold">${meetingsCount}</span>
          </div>
          
          ${usagePercent > 80 ? `
            <p class="text-xs text-red-400 mt-2">⚠️ Approaching monthly limit. Consider upgrading JaaS plan.</p>
          ` : ''}
        </div>
      </div>
    `;
  }
};

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => GroupMeeting.init());
} else {
  GroupMeeting.init();
}

// Expose for inline handlers and debugging in the console.
window.GroupMeeting = GroupMeeting;
