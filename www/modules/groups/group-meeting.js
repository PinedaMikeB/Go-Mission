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
  presentationState: null,
  presentationDeckCache: {},
  meetingSlidesLibraryLoaded: false,
  meetingSlidesLibraryPromise: null,

  // Local-first, hybrid-ready slide deck library (host sync can plug into this later).
  MEETING_SLIDES_LIBRARY: {},
  
  // Jitsi configuration - self-hosted is faster
  JITSI_DOMAIN: 'call.wotgonline.com', // Self-hosted - FAST
  JITSI_PUBLIC: 'meet.jit.si', // Public fallback
  useSelfHosted: true, // Use self-hosted (faster)
  allowPublicFallback: false, // Keep false so production never silently falls back to demo meet.jit.si
  USE_PREJOIN: true, // Default Jitsi prejoin flow
  
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

  formatJitsiError(evt) {
    const pick = evt?.message
      || evt?.name
      || evt?.details?.error
      || evt?.error?.message
      || evt?.error?.name
      || evt?.error;
    if (typeof pick === 'string' && pick.trim()) return pick;
    try {
      return JSON.stringify(evt);
    } catch (_) {
      return 'unknown error';
    }
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
          prejoinPageEnabled: this.USE_PREJOIN,
          prejoinConfig: {
            enabled: this.USE_PREJOIN
          },
          startWithAudioMuted: false,
          startWithVideoMuted: false,
          disableTileEnlargement: true,
          disableDeepLinking: true,
          disableInviteFunctions: true,
          
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

          // Keep share-screen visible on main bar; move extra actions to More menu.
          toolbarButtons: [
            'microphone',
            'camera',
            'desktop',
            'overflowmenu',
            'hangup',
            'tileview',
            'chat',
            'reactions'
          ]
        },
        interfaceConfigOverwrite: {
          // Main bar: mic/cam/share-screen/more/leave. Extras live in More menu.
          TOOLBAR_BUTTONS: [
            'microphone',
            'camera',
            'desktop',
            'overflowmenu',
            'hangup',
            'tileview',
            'chat',
            'reactions'
          ],
          MAIN_TOOLBAR_BUTTONS: [
            'microphone',
            'camera',
            'desktop',
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

        // Default to tile view so stage uses space better for larger meetings.
        setTimeout(() => {
          this.api.executeCommand('setTileView', true);
        }, 900);
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
        const msg = this.formatJitsiError(evt);
        this.setMeetingStatus(`Error: ${msg}`);
      });

      // Some failures never reach errorOccurred; listen for these too.
      this.api.addListener('connectionFailed', (evt) => {
        console.error('[GroupMeeting] Jitsi connectionFailed:', evt);
        this.setMeetingStatus('Connection failed. Tap Retry.');
      });

      this.api.addListener('conferenceFailed', (evt) => {
        console.error('[GroupMeeting] Jitsi conferenceFailed:', evt);
        const msg = this.formatJitsiError(evt);
        this.setMeetingStatus(`Conference failed: ${msg}. Tap Retry.`);
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
   * Initialize local presentation state (hybrid-ready shape for future host sync).
   */
  initPresentationState() {
    let savedOpacity = 72;
    try {
      const raw = window.localStorage?.getItem('goMission_meetingSlidesOpacity');
      const parsed = Number(raw);
      if (Number.isFinite(parsed)) {
        savedOpacity = Math.min(95, Math.max(20, Math.round(parsed)));
      }
      window.localStorage?.removeItem('goMission_meetingSlidesDeckId');
    } catch (_) {}

    this.presentationState = {
      mode: 'local',        // future: 'host_synced'
      focusMode: false,     // future moderator setting
      panelOpen: false,
      selectedDeckId: null,
      selectedLang: (window.currentLang === 'en' ? 'en' : 'tl'),
      overlayOpacity: savedOpacity, // 20-95 for readable transparent overlay
      currentSlideIndex: 0,
      loading: false,
      error: null,
      deck: null
    };
  },
  
  /**
   * Show full-screen meeting modal
   */
  showMeetingModal(groupName) {
    // Remove existing modal if any
    const existing = document.getElementById('meeting-modal');
    if (existing) existing.remove();
    
    this.initPresentationState();

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
      <div class="flex-shrink-0 px-3 py-2 border-b"
           style="background: linear-gradient(135deg, rgba(10,10,10,0.98), rgba(32,12,8,0.96)); border-color: rgba(245, 180, 53, 0.22); box-shadow: inset 0 -1px 0 rgba(255,255,255,0.03);">
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-2 min-w-0 flex-1">
            <span class="text-2xl" style="filter: drop-shadow(0 0 10px rgba(255,120,0,0.3));">🔥</span>
            <div class="min-w-0">
              <p class="font-bold text-sm"
                 style="color: #f7f2e9; letter-spacing: 0.01em; text-shadow: 0 1px 2px rgba(0,0,0,0.55); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; line-height: 1.15;">
                ${groupName || 'Go Mission Meeting'}
              </p>
              <p id="participant-count" class="text-xs"
                 style="color: rgba(245, 233, 214, 0.72);">Connecting...</p>
            </div>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <button onclick="window.GroupMeeting.toggleSlidesPanel()"
                    id="meeting-slides-toggle-btn"
                    class="px-3 py-1.5 rounded-full text-sm font-bold transition-all"
                    style="background: linear-gradient(135deg, #f5c542, #f39a22); color: #2c1408; box-shadow: 0 5px 12px rgba(242, 162, 37, 0.24), inset 0 1px 0 rgba(255,255,255,0.35);">
              🗂 Slides
            </button>
            <button onclick="window.GroupMeeting.leaveMeeting()" 
                    class="px-3 py-1.5 rounded-full text-sm font-bold transition-colors"
                    style="background: linear-gradient(135deg, #ef2f2f, #cf1717); color: #fff; box-shadow: 0 6px 14px rgba(210, 22, 22, 0.28);">
              ✕ Leave
            </button>
          </div>
        </div>
      </div>

      <!-- Status -->
      <div id="meeting-status" class="px-4 py-2 text-xs text-white/70 bg-black/70 border-b border-white/10"></div>

      <!-- Local Slides Panel (hybrid-ready: future host sync reads/writes same state shape) -->
      <div id="meeting-slides-panel"
           class="hidden absolute z-[10001] top-[76px] right-3 left-3 md:left-auto md:w-[440px] md:top-[74px] md:right-4">
        <div id="meeting-slides-topbar" class="rounded-2xl border border-white/10 shadow-xl overflow-hidden">
          <div class="px-4 py-3 flex items-center justify-between gap-3">
            <div class="min-w-0">
              <p class="text-[10px] uppercase tracking-[0.2em] text-amber-300/80 font-bold">Meeting Slides</p>
              <p id="meeting-slides-deck-title" class="text-white font-bold text-sm truncate">Loading…</p>
            </div>
            <div id="meeting-slide-counter" class="text-xs text-white/70 whitespace-nowrap">0 / 0</div>
          </div>
          <div class="px-4 py-2 border-t border-white/10 flex items-center gap-3">
            <div class="flex-1 min-w-0">
              <label for="meeting-slides-topic-select" class="block text-[10px] uppercase tracking-[0.14em] text-white/60 font-semibold mb-1">Topic</label>
              <select id="meeting-slides-topic-select"
                      onchange="window.GroupMeeting.setSlidesDeck(this.value)"
                      class="w-full rounded-lg border border-white/10 bg-black/35 text-white text-sm px-3 py-2">
                <option value="">No topics yet</option>
              </select>
            </div>
            <div class="w-[120px] shrink-0">
              <label for="meeting-slides-lang-select" class="block text-[10px] uppercase tracking-[0.14em] text-white/60 font-semibold mb-1">Lang</label>
              <select id="meeting-slides-lang-select"
                      onchange="window.GroupMeeting.setSlidesLanguage(this.value)"
                      class="w-full rounded-lg border border-white/10 bg-black/35 text-white text-sm px-3 py-2">
                <option value="tl">Tagalog</option>
                <option value="en">English</option>
              </select>
            </div>
          </div>
          <div class="px-4 py-2 border-t border-white/10 flex items-center gap-3">
            <span class="text-[11px] uppercase tracking-[0.14em] text-white/65 font-semibold whitespace-nowrap">Opacity</span>
            <input id="meeting-slides-opacity"
                   type="range"
                   min="20"
                   max="95"
                   step="1"
                   value="72"
                   oninput="window.GroupMeeting.setSlidesOpacity(this.value)"
                   class="flex-1 accent-amber-400">
            <span id="meeting-slides-opacity-value"
                  class="text-xs font-bold text-amber-200 min-w-[46px] text-right">72%</span>
          </div>
        </div>

        <div id="meeting-slides-panel-body" class="mt-2 px-4 py-4 min-h-[240px] max-h-[55vh] overflow-y-auto">
          <p class="text-white/70 text-sm">Open slides to load the lesson guide.</p>
        </div>

        <div id="meeting-slides-bottombar" class="mt-2 rounded-2xl border border-white/10 shadow-xl px-4 py-3 flex items-center justify-between gap-2">
          <button onclick="window.GroupMeeting.prevSlide()"
                  id="meeting-slide-prev-btn"
                  class="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white text-sm font-semibold">
            ← Prev
          </button>
          <div class="text-[11px] text-white/65 uppercase tracking-[0.14em]">Slides</div>
          <button onclick="window.GroupMeeting.nextSlide()"
                  id="meeting-slide-next-btn"
                  class="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white text-sm font-semibold">
            Next →
          </button>
        </div>
      </div>
      
      <!-- Jitsi Container -->
      <div class="relative flex-1 w-full overflow-hidden" style="background:#000;">
        <div id="jitsi-container" class="absolute inset-0" style="background:#000;"></div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Prevent body scroll
    document.body.style.overflow = 'hidden';

    this.ensureSlidesLibraryLoaded().finally(() => {
      this.renderSlidesPanel();
    });

    // Keep selector in sync with current state on first render.
    this.renderSlidesPanel();
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

  normalizeMeetingSlidesTopicId(value) {
    return String(value || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80);
  },

  getMeetingSlidesCatalogDocId() {
    return 'meetingSlidesCatalog';
  },

  getMeetingSlidesTopicSortMs(topic) {
    const candidates = [
      topic?.updatedAt,
      topic?.updatedAtIso,
      topic?.uploadedAt,
      topic?.uploadedAtIso,
      topic?.createdAt,
      topic?.createdAtIso
    ];

    for (const value of candidates) {
      if (!value) continue;
      if (typeof value?.toDate === 'function') {
        const date = value.toDate();
        if (date instanceof Date && Number.isFinite(date.getTime())) return date.getTime();
      }
      if (value instanceof Date && Number.isFinite(value.getTime())) return value.getTime();
      if (typeof value === 'number' && Number.isFinite(value)) return value;
      if (typeof value === 'string') {
        const parsed = Date.parse(value);
        if (Number.isFinite(parsed)) return parsed;
      }
      if (typeof value === 'object' && Number.isFinite(value.seconds)) {
        return (Number(value.seconds) * 1000) + Math.round(Number(value.nanoseconds || 0) / 1000000);
      }
    }

    return 0;
  },

  getSlidesLibraryEntries() {
    return Object.entries(this.MEETING_SLIDES_LIBRARY || {})
      .sort((a, b) => {
        const timeDiff = this.getMeetingSlidesTopicSortMs(b[1]) - this.getMeetingSlidesTopicSortMs(a[1]);
        if (timeDiff) return timeDiff;
        return String(a[1]?.title || a[0]).localeCompare(String(b[1]?.title || b[0]));
      });
  },

  async ensureSlidesLibraryLoaded(force = false) {
    if (!window.db || !window.doc || !window.getDoc) return this.MEETING_SLIDES_LIBRARY;
    if (this.meetingSlidesLibraryLoaded && !force) return this.MEETING_SLIDES_LIBRARY;
    if (this.meetingSlidesLibraryPromise && !force) return this.meetingSlidesLibraryPromise;

    this.meetingSlidesLibraryPromise = (async () => {
      try {
        const snap = await window.getDoc(window.doc(window.db, 'goMission_config', this.getMeetingSlidesCatalogDocId()));
        const data = snap.exists() ? (snap.data() || {}) : {};
        const topics = Array.isArray(data.topics) ? data.topics : [];
        const nextLibrary = {};
        topics.forEach((topic) => {
          const topicId = this.normalizeMeetingSlidesTopicId(topic?.id || topic?.deckId || topic?.title || '');
          const title = String(topic?.title || topic?.name || topic?.deckTitle || topicId).trim();
          if (!topicId || !title) return;
          nextLibrary[topicId] = {
            title,
            variants: (topic?.variants && typeof topic.variants === 'object') ? topic.variants : {},
            sourceFilename: String(topic?.sourceFilename || '').trim(),
            createdAt: topic?.createdAt || null,
            createdAtIso: String(topic?.createdAtIso || '').trim(),
            updatedAt: topic?.updatedAt || null,
            updatedAtIso: String(topic?.updatedAtIso || '').trim()
          };
        });
        this.MEETING_SLIDES_LIBRARY = nextLibrary;
        this.meetingSlidesLibraryLoaded = true;

        if (this.presentationState) {
          const entries = this.getSlidesLibraryEntries();
          const currentId = String(this.presentationState.selectedDeckId || '').trim();
          if (!currentId || !this.MEETING_SLIDES_LIBRARY[currentId]) {
            this.presentationState.selectedDeckId = entries[0]?.[0] || null;
          }
        }
      } catch (error) {
        console.warn('[GroupMeeting] Could not load slides topic library:', error?.message || error);
      } finally {
        this.meetingSlidesLibraryPromise = null;
      }
      return this.MEETING_SLIDES_LIBRARY;
    })();

    return this.meetingSlidesLibraryPromise;
  },

  /**
   * Toggle local slides panel. Future host sync can reuse this UI.
   */
  async toggleSlidesPanel(forceOpen) {
    const panel = document.getElementById('meeting-slides-panel');
    if (!panel || !this.presentationState) return;

    const nextOpen = typeof forceOpen === 'boolean'
      ? forceOpen
      : !this.presentationState.panelOpen;

    this.presentationState.panelOpen = nextOpen;
    panel.classList.toggle('hidden', !nextOpen);

    if (nextOpen && !this.presentationState.deck && !this.presentationState.loading) {
      await this.loadSlidesDeck();
    }

    this.renderSlidesPanel();
  },

  async loadSlidesDeck() {
    if (!this.presentationState) return;
    await this.ensureSlidesLibraryLoaded();
    const state = this.presentationState;
    const deckId = this.normalizeMeetingSlidesTopicId(state.selectedDeckId || '');
    const deckEntry = this.MEETING_SLIDES_LIBRARY[deckId];
    const lang = state.selectedLang;
    const topicTitle = deckEntry?.title || deckId || 'Meeting Slides';
    const staticPath = deckEntry?.variants?.[lang] || deckEntry?.variants?.tl || '';
    const configDocId = deckId ? this.getMeetingSlidesConfigDocId(deckId, lang) : null;
    const fallbackConfigDocId = !deckId || lang === 'tl'
      ? null
      : this.getMeetingSlidesConfigDocId(deckId, 'tl');

    if (!deckId || !deckEntry) {
      state.error = 'No meeting topics uploaded yet.';
      state.deck = null;
      state.loading = false;
      this.renderSlidesPanel();
      return;
    }

    const cacheKeys = [
      configDocId ? `firestore:${configDocId}` : null,
      fallbackConfigDocId ? `firestore:${fallbackConfigDocId}` : null,
      staticPath ? `static:${staticPath}` : null
    ].filter(Boolean);

    for (const key of cacheKeys) {
      if (this.presentationDeckCache[key]) {
        state.deck = this.presentationDeckCache[key];
        state.error = null;
        state.loading = false;
        state.currentSlideIndex = 0;
        this.renderSlidesPanel();
        return;
      }
    }

    state.loading = true;
    state.error = null;
    this.renderSlidesPanel();

    const firestoreDeck = await this.loadSlidesDeckFromConfig(configDocId, fallbackConfigDocId);
    if (firestoreDeck) {
      const cacheKey = `firestore:${firestoreDeck._configDocId || configDocId}`;
      const deckPayload = firestoreDeck.deck || firestoreDeck;
      this.presentationDeckCache[cacheKey] = deckPayload;
      state.deck = deckPayload;
      state.loading = false;
      state.error = null;
      state.currentSlideIndex = 0;
      this.renderSlidesPanel();
      return;
    }

    try {
      if (!staticPath) {
        throw new Error(`No slide deck published yet for "${topicTitle}" (${lang.toUpperCase()}).`);
      }

      const res = await fetch(staticPath, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const deck = await res.json();
      this.presentationDeckCache[`static:${staticPath}`] = deck;
      state.deck = deck;
      state.currentSlideIndex = 0;
      state.error = null;
    } catch (error) {
      console.error('[GroupMeeting] Failed to load slides deck:', error);
      state.deck = null;
      state.error = error?.message || String(error);
    } finally {
      state.loading = false;
      this.renderSlidesPanel();
    }
  },

  getMeetingSlidesConfigDocId(deckId, lang) {
    return `meetingSlidesDeck_${String(deckId || 'default').replace(/[^a-zA-Z0-9_-]/g, '_')}_${lang === 'en' ? 'en' : 'tl'}`;
  },

  async loadSlidesDeckFromConfig(primaryDocId, fallbackDocId = null) {
    if (!window.db || !window.doc || !window.getDoc) return null;

    const idsToTry = [primaryDocId, fallbackDocId].filter(Boolean);
    for (const docId of idsToTry) {
      try {
        const snap = await window.getDoc(window.doc(window.db, 'goMission_config', docId));
        if (!snap.exists()) continue;
        const data = snap.data() || {};
        if (data && data.deck && Array.isArray(data.deck.slides)) {
          return { ...data, _configDocId: docId };
        }
      } catch (error) {
        console.warn('[GroupMeeting] Config deck load failed:', docId, error?.message || error);
      }
    }
    return null;
  },

  async setSlidesDeck(deckId) {
    if (!this.presentationState) return;
    await this.ensureSlidesLibraryLoaded();

    const entries = this.getSlidesLibraryEntries();
    const normalizedId = this.normalizeMeetingSlidesTopicId(deckId || '');
    const nextDeckId = normalizedId && this.MEETING_SLIDES_LIBRARY[normalizedId]
      ? normalizedId
      : (entries[0]?.[0] || null);

    this.presentationState.selectedDeckId = nextDeckId;
    this.presentationState.deck = null;
    this.presentationState.currentSlideIndex = 0;
    this.presentationState.loading = false;
    this.presentationState.error = null;

    try {
      window.localStorage?.removeItem('goMission_meetingSlidesDeckId');
    } catch (_) {}

    if (!nextDeckId) {
      this.presentationState.error = 'No meeting topics uploaded yet.';
      this.renderSlidesPanel();
      return;
    }

    this.renderSlidesPanel();
    await this.loadSlidesDeck();
  },

  setSlidesLanguage(lang) {
    if (!this.presentationState) return;
    const safeLang = lang === 'en' ? 'en' : 'tl';
    if (this.presentationState.selectedLang === safeLang) return;
    this.presentationState.selectedLang = safeLang;
    this.presentationState.deck = null;
    this.presentationState.currentSlideIndex = 0;
    this.loadSlidesDeck();
    this.renderSlidesPanel();
  },

  setSlidesOpacity(value) {
    if (!this.presentationState) return;
    const next = Math.min(95, Math.max(20, Math.round(Number(value) || 72)));
    this.presentationState.overlayOpacity = next;
    try {
      window.localStorage?.setItem('goMission_meetingSlidesOpacity', String(next));
    } catch (_) {}
    this.renderSlidesPanel();
  },

  nextSlide() {
    const s = this.presentationState;
    if (!s?.deck?.slides?.length) return;
    if (s.currentSlideIndex < s.deck.slides.length - 1) {
      s.currentSlideIndex += 1;
      this.renderSlidesPanel();
    }
  },

  prevSlide() {
    const s = this.presentationState;
    if (!s?.deck?.slides?.length) return;
    if (s.currentSlideIndex > 0) {
      s.currentSlideIndex -= 1;
      this.renderSlidesPanel();
    }
  },

  escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  },

  renderMeetingSlideParagraphBlocks(paragraphs = [], options = {}) {
    const paragraphColor = options.paragraphColor || '#1f1f1f';
    const bulletColor = options.bulletColor || '#181818';
    const paragraphSize = options.paragraphSize || '18px';
    const bulletSize = options.bulletSize || paragraphSize;
    const paragraphGap = options.paragraphGap || '12px';
    const listGap = options.listGap || '10px';
    const listIndent = options.listIndent || '22px';

    const items = Array.isArray(paragraphs) ? paragraphs.filter((p) => String(p || '').trim()) : [];
    if (!items.length) return '';

    const blocks = [];
    let currentListItems = [];

    const flushList = () => {
      if (!currentListItems.length) return;
      blocks.push(
        `<ul style="margin:0; padding-left:${listIndent}; display:flex; flex-direction:column; gap:${listGap};">${currentListItems.join('')}</ul>`
      );
      currentListItems = [];
    };

    items.forEach((paragraph) => {
      const raw = String(paragraph || '').trim();
      const bulletMatch = raw.match(/^\s*[•*-]\s+(.+)$/);
      if (bulletMatch) {
        currentListItems.push(
          `<li style="color:${bulletColor}; font-size:${bulletSize}; line-height:1.45;">${this.escapeHtml(bulletMatch[1])}</li>`
        );
        return;
      }

      flushList();
      blocks.push(
        `<p style="color:${paragraphColor}; font-size:${paragraphSize}; line-height:1.52; margin:0 0 ${paragraphGap} 0;">${this.escapeHtml(raw)}</p>`
      );
    });

    flushList();
    return blocks.join('');
  },

  buildMeetingSlideDisclosureSections(slide) {
    const paragraphs = Array.isArray(slide?.paragraphs) ? slide.paragraphs.filter((p) => String(p || '').trim()) : [];
    const title = String(slide?.title || '').trim();
    const kicker = String(slide?.kicker || '').trim();
    const titleLooksFacilitator = /facilitator(?:'s|’s)?\s+guide/i.test(title) || /facilitator(?:'s|’s)?\s+guide/i.test(kicker);
    const primary = [];
    const disclosures = [];
    let activeDisclosure = null;

    const pushDisclosure = () => {
      if (!activeDisclosure?.paragraphs?.length) return;
      disclosures.push(activeDisclosure);
      activeDisclosure = null;
    };

    const startDisclosure = (label, initialParagraphs = [], tone = 'facilitator') => {
      pushDisclosure();
      activeDisclosure = {
        label,
        tone,
        paragraphs: initialParagraphs.filter(Boolean)
      };
    };

    const classifyDisclosureLine = (paragraph) => {
      const raw = String(paragraph || '').trim();
      const lower = raw.toLowerCase();
      const labelMatch = raw.match(/^([^:]{2,80}):\s*(.*)$/);
      const label = labelMatch ? labelMatch[1].trim() : '';
      const content = labelMatch ? labelMatch[2].trim() : '';

      if (/^facilitator(?:'s|’s)?\s+guide$/i.test(label) || /^facilitator(?:'s|’s)?\s+guide:?$/i.test(raw)) {
        return { kind: 'start', label: 'Facilitator Guide', tone: 'facilitator', content };
      }
      if (/^facilitator(?:'s|’s)?\s+note$/i.test(label)) {
        return { kind: 'start', label: 'Facilitator Note', tone: 'facilitator', content };
      }
      if (/^(posibleng\s+sagot|possible\s+answer|suggested\s+answer|sagot)$/i.test(label)) {
        return { kind: 'start', label: 'Suggested Answer', tone: 'answer', content };
      }
      if (/^(paano i-guide ang talakayan|analysis|key insight|layunin|segue sa topic|segue to the topic)$/i.test(label)) {
        return { kind: 'append', label: 'Facilitator Guide', tone: 'facilitator', content: raw };
      }
      if (titleLooksFacilitator) {
        return { kind: 'append', label: 'Facilitator Guide', tone: 'facilitator', content: raw };
      }
      if (activeDisclosure && /^(free from|analysis|key insight|facilitator(?:'s|’s)?\s+note|layunin)\b/i.test(lower)) {
        return { kind: 'append', label: activeDisclosure.label, tone: activeDisclosure.tone, content: raw };
      }
      return null;
    };

    paragraphs.forEach((paragraph) => {
      const disclosureLine = classifyDisclosureLine(paragraph);
      if (!disclosureLine) {
        if (activeDisclosure && titleLooksFacilitator) {
          activeDisclosure.paragraphs.push(String(paragraph).trim());
          return;
        }
        pushDisclosure();
        primary.push(String(paragraph).trim());
        return;
      }

      if (disclosureLine.kind === 'start') {
        startDisclosure(disclosureLine.label, disclosureLine.content ? [disclosureLine.content] : [], disclosureLine.tone);
        return;
      }

      if (!activeDisclosure) {
        startDisclosure(disclosureLine.label, [], disclosureLine.tone);
      } else if (activeDisclosure.label !== disclosureLine.label && disclosureLine.kind === 'append') {
        startDisclosure(disclosureLine.label, [], disclosureLine.tone);
      }

      if (disclosureLine.content) {
        activeDisclosure.paragraphs.push(disclosureLine.content);
      }
    });

    pushDisclosure();

    if (titleLooksFacilitator && !primary.length && !disclosures.length && paragraphs.length) {
      disclosures.push({
        label: 'Facilitator Guide',
        tone: 'facilitator',
        paragraphs: paragraphs.map((paragraph) => String(paragraph).trim()).filter(Boolean)
      });
    }

    return { primary, disclosures, titleLooksFacilitator };
  },

  renderSlidesPanel() {
    const state = this.presentationState;
    const panel = document.getElementById('meeting-slides-panel');
    if (!panel || !state) return;

    const body = document.getElementById('meeting-slides-panel-body');
    const titleEl = document.getElementById('meeting-slides-deck-title');
    const counterEl = document.getElementById('meeting-slide-counter');
    const prevBtn = document.getElementById('meeting-slide-prev-btn');
    const nextBtn = document.getElementById('meeting-slide-next-btn');
    const toggleBtn = document.getElementById('meeting-slides-toggle-btn');
    const topicSelect = document.getElementById('meeting-slides-topic-select');
    const langSelect = document.getElementById('meeting-slides-lang-select');
    const opacitySlider = document.getElementById('meeting-slides-opacity');
    const opacityValueEl = document.getElementById('meeting-slides-opacity-value');
    const topicEntries = this.getSlidesLibraryEntries();
    const hasTopics = topicEntries.length > 0;
    const selectedDeckId = hasTopics && this.MEETING_SLIDES_LIBRARY[state.selectedDeckId]
      ? state.selectedDeckId
      : (topicEntries[0]?.[0] || null);

    if (selectedDeckId !== state.selectedDeckId) {
      state.selectedDeckId = selectedDeckId;
    }

    if (topicSelect) {
      topicSelect.innerHTML = hasTopics
        ? topicEntries.map(([deckId, deckMeta]) => (
            `<option value="${this.escapeHtml(deckId)}">${this.escapeHtml(deckMeta?.title || deckId)}</option>`
          )).join('')
        : '<option value="">No topics yet</option>';
      topicSelect.disabled = !hasTopics;
      topicSelect.value = selectedDeckId || '';
    }

    if (langSelect) {
      langSelect.value = state.selectedLang === 'en' ? 'en' : 'tl';
      langSelect.disabled = !hasTopics;
    }

    const opacityPct = Math.min(95, Math.max(20, Number(state.overlayOpacity || 72)));
    const panelAlpha = Math.max(0.08, opacityPct / 100);
    const chromeAlpha = Math.max(0.08, panelAlpha * 0.34);
    const borderAlpha = Math.max(0.04, panelAlpha * 0.18);
    // Opacity slider now controls the white reading surface transparency.
    const noteSurfaceAlpha = Math.min(0.9, Math.max(0.46, 0.35 + (opacityPct / 100) * 0.55));

    if (opacitySlider) opacitySlider.value = String(opacityPct);
    if (opacityValueEl) opacityValueEl.textContent = `${Math.round(opacityPct)}%`;

    if (toggleBtn) {
      toggleBtn.classList.toggle('bg-amber-500/20', !!state.panelOpen);
      toggleBtn.classList.toggle('text-amber-200', !!state.panelOpen);
    }
    if (titleEl) {
      titleEl.style.color = '#f7f3ea';
      titleEl.style.fontWeight = '700';
      titleEl.style.letterSpacing = '0.01em';
    }
    if (counterEl) {
      counterEl.style.color = 'rgba(255,255,255,0.82)';
      counterEl.style.fontWeight = '600';
    }
    panel.style.background = 'transparent';
    panel.style.border = 'none';
    panel.style.backdropFilter = 'none';
    panel.style.webkitBackdropFilter = 'none';

    if (titleEl) {
      titleEl.textContent = state.deck?.title || this.MEETING_SLIDES_LIBRARY[selectedDeckId]?.title || 'Meeting Slides';
    }

    if (state.loading) {
      if (body) body.innerHTML = `
        <div style="background:rgba(255,255,255,${noteSurfaceAlpha.toFixed(2)}); border-radius:18px; border:1px solid rgba(255,255,255,0.55); padding:16px;">
          <p style="color:#2a2a2a; font-size:14px; margin:0;">Loading slides…</p>
        </div>
      `;
      if (counterEl) counterEl.textContent = '0 / 0';
      if (prevBtn) prevBtn.disabled = true;
      if (nextBtn) nextBtn.disabled = true;
      return;
    }

    if (state.error) {
      if (body) body.innerHTML = `
        <div style="background:rgba(255,255,255,${noteSurfaceAlpha.toFixed(2)}); border-radius:18px; border:1px solid rgba(255,255,255,0.55); padding:16px;">
          <p style="color:#8b1e1e; font-size:14px; margin:0;">Could not load slides: ${this.escapeHtml(state.error)}</p>
        </div>
      `;
      if (counterEl) counterEl.textContent = '0 / 0';
      if (prevBtn) prevBtn.disabled = true;
      if (nextBtn) nextBtn.disabled = true;
      return;
    }

    const slides = state.deck?.slides || [];
    if (!slides.length) {
      if (body) body.innerHTML = `
        <div style="background:rgba(255,255,255,${noteSurfaceAlpha.toFixed(2)}); border-radius:18px; border:1px solid rgba(255,255,255,0.55); padding:16px;">
          <p style="color:#2a2a2a; font-size:14px; margin:0;">${hasTopics ? 'No slides available yet.' : 'No meeting topics published yet.'}</p>
        </div>
      `;
      if (counterEl) counterEl.textContent = '0 / 0';
      if (prevBtn) prevBtn.disabled = true;
      if (nextBtn) nextBtn.disabled = true;
      return;
    }

    const slideIndex = Math.min(Math.max(state.currentSlideIndex || 0, 0), slides.length - 1);
    state.currentSlideIndex = slideIndex;
    const slide = slides[slideIndex];
    const slideSections = this.buildMeetingSlideDisclosureSections(slide);
    const kickerHtml = slide.kicker
      ? `<div style="display:inline-flex; align-items:center; gap:6px; font-size:11px; line-height:1.25; letter-spacing:0.16em; text-transform:uppercase; color:#8a3b13; background:rgba(246, 225, 189, 0.9); border:1px solid rgba(206,157,87,0.45); border-radius:999px; padding:5px 10px; font-weight:800; margin-bottom:10px;">
          <span style="display:inline-block; width:7px; height:7px; border-radius:50%; background:#d97706;"></span>${this.escapeHtml(slide.kicker)}
        </div>`
      : '';
    const titleHtml = `<div style="color:#141414; font-size:clamp(24px,5.8vw,38px); line-height:1.02; font-weight:900; letter-spacing:-0.01em; margin-bottom:${slide.subtitle ? '10px' : '16px'}; text-wrap:balance;">${this.escapeHtml(slide.title || 'Slide')}</div>`;
    const subtitleHtml = slide.subtitle
      ? `<div style="color:#5a4a3a; font-size:14px; line-height:1.4; margin-bottom:14px; font-weight:600;">${this.escapeHtml(slide.subtitle)}</div>`
      : '';
    const primaryBodyHtml = slideSections.primary.length
      ? this.renderMeetingSlideParagraphBlocks(slideSections.primary)
      : (
          slideSections.titleLooksFacilitator
            ? `<p style="color:#6a5748; font-size:14px; line-height:1.5; margin:0 0 12px 0;">Facilitator notes are hidden by default. Expand below when you need them.</p>`
            : ''
        );
    const disclosureSectionsHtml = slideSections.disclosures.map((section, idx) => {
      const tone = section.tone === 'answer'
        ? {
            border: 'rgba(37, 99, 235, 0.18)',
            background: 'rgba(237, 244, 255, 0.88)',
            summary: '#0f3b8f',
            badge: 'rgba(59,130,246,0.12)',
            badgeText: '#1d4ed8'
          }
        : {
            border: 'rgba(217, 119, 6, 0.18)',
            background: 'rgba(255, 248, 235, 0.9)',
            summary: '#8a3b13',
            badge: 'rgba(245, 158, 11, 0.14)',
            badgeText: '#a16207'
          };
      return `
        <details style="margin-top:${idx === 0 && !primaryBodyHtml ? '0' : '14px'}; border-radius:16px; border:1px solid ${tone.border}; background:${tone.background}; overflow:hidden;">
          <summary style="cursor:pointer; list-style:none; display:flex; align-items:center; justify-content:space-between; gap:10px; padding:12px 14px; font-weight:800; color:${tone.summary}; font-size:13px; letter-spacing:0.01em;">
            <span>${this.escapeHtml(section.label)}</span>
            <span style="display:inline-flex; align-items:center; border-radius:999px; background:${tone.badge}; color:${tone.badgeText}; padding:4px 8px; font-size:10px; text-transform:uppercase; letter-spacing:0.12em;">Tap to Expand</span>
          </summary>
          <div style="padding:0 14px 14px 14px; border-top:1px solid rgba(0,0,0,0.05);">
            ${this.renderMeetingSlideParagraphBlocks(section.paragraphs, {
              paragraphColor: '#2d241f',
              bulletColor: '#2d241f',
              paragraphSize: '15px',
              bulletSize: '15px',
              paragraphGap: '10px',
              listGap: '8px',
              listIndent: '20px'
            })}
          </div>
        </details>
      `;
    }).join('');
    const bodyHtml = `
      <div style="
        position:relative;
        border-radius:18px;
        border:1px solid rgba(255,255,255,0.55);
        background:
          linear-gradient(165deg, rgba(255,255,255,${noteSurfaceAlpha.toFixed(2)}), rgba(249,246,238,${Math.max(0.4, noteSurfaceAlpha - 0.08).toFixed(2)}));
        box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        padding:18px 18px 16px 18px;">
        <div style="position:absolute; left:0; top:14px; bottom:14px; width:5px; border-radius:5px; background:linear-gradient(180deg, #f59e0b, #dc2626);"></div>
        <div style="padding-left:12px;">
          ${kickerHtml}
          ${titleHtml}
          ${subtitleHtml}
          <div>${primaryBodyHtml}</div>
          ${disclosureSectionsHtml}
        </div>
      </div>
    `;

    if (body) body.innerHTML = bodyHtml;
    if (counterEl) counterEl.textContent = `${slideIndex + 1} / ${slides.length}`;
    if (prevBtn) prevBtn.disabled = slideIndex <= 0;
    if (nextBtn) nextBtn.disabled = slideIndex >= slides.length - 1;
    if (prevBtn) prevBtn.classList.toggle('opacity-40', slideIndex <= 0);
    if (nextBtn) nextBtn.classList.toggle('opacity-40', slideIndex >= slides.length - 1);
    if (body) {
      body.style.background = 'transparent';
      body.style.borderRadius = '0';
    }

    const topbar = document.getElementById('meeting-slides-topbar');
    const bottombar = document.getElementById('meeting-slides-bottombar');
    if (topbar) {
      topbar.style.background = `linear-gradient(180deg, rgba(0,0,0,${Math.max(0.08, chromeAlpha).toFixed(2)}), rgba(0,0,0,${Math.max(0.05, chromeAlpha * 0.82).toFixed(2)}))`;
      topbar.style.borderColor = `rgba(255,255,255,${Math.min(0.16, borderAlpha).toFixed(2)})`;
      topbar.style.backdropFilter = `blur(${panelAlpha > 0.4 ? 10 : 6}px)`;
      topbar.style.webkitBackdropFilter = `blur(${panelAlpha > 0.4 ? 10 : 6}px)`;
    }
    if (bottombar) {
      bottombar.style.background = `linear-gradient(180deg, rgba(0,0,0,${Math.max(0.07, chromeAlpha * 0.9).toFixed(2)}), rgba(0,0,0,${Math.max(0.05, chromeAlpha * 0.75).toFixed(2)}))`;
      bottombar.style.borderColor = `rgba(255,255,255,${Math.min(0.14, borderAlpha).toFixed(2)})`;
      bottombar.style.backdropFilter = `blur(${panelAlpha > 0.4 ? 10 : 6}px)`;
      bottombar.style.webkitBackdropFilter = `blur(${panelAlpha > 0.4 ? 10 : 6}px)`;
    }
  },
  
  /**
   * Hide meeting modal
   */
  hideMeetingModal() {
    const modal = document.getElementById('meeting-modal');
    if (modal) modal.remove();
    this.presentationState = null;
    
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
