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
  currentUserIsMeetingLeader: false,
  connectTimeoutId: null,
  currentRoomUrl: null,
  initPromise: null,
  lastJoinArgs: null,
  slidesSyncUnsubscribe: null,
  slidesSyncApplying: false,
  lastSlidesSyncVersion: 0,
  mobileTileLayoutTimer: null,
  mobileTileLayoutHandler: null,
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
  allowPublicFallback: false, // Never fall back to public Jitsi; it can require moderator login.
  USE_PREJOIN: true, // Default Jitsi prejoin flow
  
  // Meeting window (minutes before/after scheduled time)
  MEETING_WINDOW_BEFORE: 15,  // Can join 15 min before
  MEETING_WINDOW_AFTER: 120,  // Meeting available for 2 hours
  
  /**
   * Initialize - load Jitsi API script
   */
  async init(preferredDomain = null) {
    if (window.JitsiMeetExternalAPI) return;

    // Avoid loading the script multiple times if init() is called concurrently.
    if (this.initPromise) {
      await this.initPromise;
      return;
    }

    this.initPromise = (async () => {
      await this.loadJitsiScript({
        timeoutMs: 3500,
        preferredDomains: preferredDomain ? [preferredDomain] : null
      });
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
  loadJitsiScript({ timeoutMs = 10000, preferredDomains = null } = {}) {
    return new Promise((resolve, reject) => {
      if (window.JitsiMeetExternalAPI) {
        resolve();
        return;
      }

      // Script can be loaded from any Jitsi domain; prefer self-hosted but fall back
      // to meet.jit.si for fast/consistent script delivery.
      const defaultDomains = this.useSelfHosted
        ? [this.JITSI_DOMAIN, this.JITSI_PUBLIC]
        : [this.JITSI_PUBLIC, this.JITSI_DOMAIN];
      const domainsToTry = Array.isArray(preferredDomains) && preferredDomains.length
        ? [...preferredDomains, ...defaultDomains.filter((domain) => !preferredDomains.includes(domain))]
        : defaultDomains;

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

  checkSelfHostedRealtime(domain, roomName, timeoutMs = 3000) {
    return new Promise((resolve) => {
      if (typeof WebSocket === 'undefined') {
        resolve({ ok: true, skipped: true });
        return;
      }

      let settled = false;
      let socket = null;
      const finish = (ok, reason = '') => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        try {
          socket?.close();
        } catch (_) {}
        resolve({ ok, reason });
      };

      const timer = setTimeout(() => finish(false, 'timeout'), timeoutMs);
      try {
        const healthRoom = encodeURIComponent(roomName || 'GoMissionHealthCheck');
        socket = new WebSocket(`wss://${domain}/xmpp-websocket?room=${healthRoom}`);
        socket.onopen = () => finish(true);
        socket.onerror = () => finish(false, 'websocket');
        socket.onclose = (event) => {
          finish(false, event?.code ? `closed ${event.code}` : 'closed');
        };
      } catch (error) {
        finish(false, error?.message || 'websocket');
      }
    });
  },

  async resolveMeetingDomain(roomName) {
    const desiredDomain = this.useSelfHosted ? this.JITSI_DOMAIN : this.JITSI_PUBLIC;

    this.setMeetingStatus(`Checking ${desiredDomain}…`);
    const reachable = await this.checkReachable(`https://${desiredDomain}/`, 2500);
    if (!reachable) {
      if (this.allowPublicFallback && desiredDomain !== this.JITSI_PUBLIC) {
        this.setMeetingStatus('Primary call server is not responding. Trying backup meeting server…');
        return this.JITSI_PUBLIC;
      }
      this.setMeetingStatus(`${desiredDomain} is not responding. Please try again in a moment.`);
      return null;
    }

    return desiredDomain;
  },

  retryLastJoin() {
    const a = this.lastJoinArgs;
    if (!a) return;
    this.joinMeeting(a);
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

  isPhoneMeetingViewport() {
    const viewportWidth = window.visualViewport?.width || window.innerWidth || 0;
    const viewportHeight = window.visualViewport?.height || window.innerHeight || 0;
    if (!viewportWidth || !viewportHeight) return false;

    const shortSide = Math.min(viewportWidth, viewportHeight);
    const longSide = Math.max(viewportWidth, viewportHeight);

    return shortSide <= 767 && longSide <= 932;
  },

  getTileViewMaxColumns() {
    const isPhoneViewport = this.isPhoneMeetingViewport();

    // Jitsi owns the participant grid inside its iframe. This documented
    // interface config keeps phone tile view from collapsing into one column.
    return isPhoneViewport ? 2 : undefined;
  },

  getMobileVideoConstraints() {
    if (!this.isPhoneMeetingViewport()) return true;

    return {
      aspectRatio: { ideal: 1 },
      width: { ideal: 480, max: 720 },
      height: { ideal: 480, max: 720 },
      facingMode: 'user'
    };
  },

  applyMobileTileLayout() {
    if (!this.api || this.getTileViewMaxColumns() !== 2) return;

    const container = document.getElementById('jitsi-container');
    const width = Math.floor(container?.clientWidth || window.visualViewport?.width || window.innerWidth || 0);
    const height = Math.floor(container?.clientHeight || window.visualViewport?.height || window.innerHeight || 0);
    if (!width || !height) return;

    const columns = 2;
    const rows = Math.min(Math.max(Math.ceil(this.getCurrentMeetingParticipantCount() / columns), 1), 4);
    const tileSize = Math.max(96, Math.floor((width - 14 - (columns * 4)) / columns));
    const layoutWidth = width;
    const layoutHeight = Math.min(height, 14 + (rows * (tileSize + 4)));

    try {
      this.api.executeCommand('overwriteConfig', {
        disableResponsiveTiles: true,
        disableTileEnlargement: false,
        tileView: {
          numberOfVisibleTiles: 8
        }
      });
      this.resetMobileJitsiIframe();
      this.api.resizeLargeVideo(layoutWidth, layoutHeight);
      this.api.executeCommand('resizeFilmStrip', { width: layoutWidth });
      this.api.executeCommand('setTileView', true);
    } catch (error) {
      console.warn('[GroupMeeting] Could not apply mobile tile layout:', error?.message || error);
    }

    this.scheduleMobileTileLayoutRefresh();
  },

  getCurrentMeetingParticipantCount() {
    return Math.max(1, this.participants.length + (this.joinedConference ? 1 : 0));
  },

  resetMobileJitsiIframe() {
    const iframe = document.querySelector('#jitsi-container iframe');
    if (!iframe) return;

    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.maxWidth = '';
    iframe.style.maxHeight = '';
    iframe.style.transform = '';
    iframe.style.transformOrigin = '';
    iframe.style.border = '0';
  },

  scheduleMobileTileLayoutRefresh() {
    if (this.mobileTileLayoutHandler || this.getTileViewMaxColumns() !== 2) return;

    this.mobileTileLayoutHandler = () => {
      clearTimeout(this.mobileTileLayoutTimer);
      this.mobileTileLayoutTimer = setTimeout(() => this.applyMobileTileLayout(), 180);
    };

    window.visualViewport?.addEventListener('resize', this.mobileTileLayoutHandler);
    window.addEventListener('resize', this.mobileTileLayoutHandler);
  },

  teardownMobileTileLayoutRefresh() {
    if (this.mobileTileLayoutHandler) {
      window.visualViewport?.removeEventListener('resize', this.mobileTileLayoutHandler);
      window.removeEventListener('resize', this.mobileTileLayoutHandler);
      this.mobileTileLayoutHandler = null;
    }
    if (this.mobileTileLayoutTimer) {
      clearTimeout(this.mobileTileLayoutTimer);
      this.mobileTileLayoutTimer = null;
    }
    this.resetMobileJitsiIframe();
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

  async ensureMeetingMediaPermissions() {
    if (!navigator.mediaDevices?.getUserMedia) {
      return { audio: false, video: false, reason: 'unsupported' };
    }

    const granted = { audio: false, video: false, reason: null };
    const probes = [
      { kind: 'audio', constraints: { audio: true, video: false } },
      { kind: 'video', constraints: { audio: false, video: this.getMobileVideoConstraints() } }
    ];

    for (const probe of probes) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia(probe.constraints);
        granted[probe.kind] = true;
        stream.getTracks().forEach((track) => track.stop());
      } catch (error) {
        console.warn(`[GroupMeeting] ${probe.kind} permission probe failed:`, error);
        granted.reason = error?.name || error?.message || 'denied';
      }
    }

    return granted;
  },
  
  /**
   * Start/Join a meeting
   */
  async joinMeeting(groupId, groupName, userName, userEmail, isLeader = false) {
    try {
      const args = (groupId && typeof groupId === 'object')
        ? {
            attendanceGroupId: groupId.attendanceGroupId || groupId.groupId || groupId.roomGroupId,
            attendanceGroupName: groupId.attendanceGroupName || groupId.groupName || groupId.displayGroupName || groupId.roomGroupName,
            roomGroupId: groupId.roomGroupId || groupId.groupId || groupId.attendanceGroupId,
            roomGroupName: groupId.roomGroupName || groupId.groupName || groupId.displayGroupName || groupId.attendanceGroupName,
            displayGroupName: groupId.displayGroupName || groupId.attendanceGroupName || groupId.groupName || groupId.roomGroupName,
            userName: groupId.userName,
            userEmail: groupId.userEmail,
            isLeader: groupId.isLeader === true
          }
        : {
            attendanceGroupId: groupId,
            attendanceGroupName: groupName,
            roomGroupId: groupId,
            roomGroupName: groupName,
            displayGroupName: groupName,
            userName,
            userEmail,
            isLeader
          };

      this.lastJoinArgs = { ...args };
      this.currentUserIsMeetingLeader = args.isLeader === true;

      // Show UI immediately so users see something happening even if the API load is slow/fails.
      this.showMeetingModal(args.displayGroupName);
      this.setMeetingStatus('Loading meeting…');

      const roomName = this.generateRoomName(args.roomGroupId, args.roomGroupName);
      const desiredDomain = this.useSelfHosted ? this.JITSI_DOMAIN : this.JITSI_PUBLIC;
      this.currentRoomUrl = this.getRoomUrl(desiredDomain, roomName);

      this.setMeetingStatus('Requesting camera and microphone access…');
      const mediaAccess = await this.ensureMeetingMediaPermissions();
      if (!mediaAccess.audio && !mediaAccess.video) {
        this.setMeetingStatus('Camera and microphone are blocked. Please allow both permissions for Go Mission, then try again.');
        return;
      }
      if (!mediaAccess.audio || !mediaAccess.video) {
        this.setMeetingStatus('Some meeting permissions are still blocked. You can continue, but audio or video may stay muted.');
      }

      const activeDomain = await this.resolveMeetingDomain(roomName);
      if (!activeDomain) {
        return;
      }

      // Load Jitsi API if not loaded
      if (!window.JitsiMeetExternalAPI) {
        this.setMeetingStatus('Loading Jitsi API…');
        await this.init(activeDomain);
      }

      if (!window.JitsiMeetExternalAPI) {
        throw new Error('Jitsi API not available');
      }

      this.currentGroupId = args.attendanceGroupId;
      this.joinedAt = new Date();
      this.joinedConference = false;

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

      const tileViewMaxColumns = this.getTileViewMaxColumns();
      const usePhoneTileGrid = tileViewMaxColumns === 2;
      
      // Simpler Jitsi configuration for reliability
      const options = {
        roomName: roomName,
        parentNode: document.getElementById('jitsi-container'),
        width: '100%',
        height: '100%',
        userInfo: {
          displayName: args.userName || 'Guest',
          email: args.userEmail || ''
        },
        configOverwrite: {
          // Basic settings
          prejoinPageEnabled: this.USE_PREJOIN,
          prejoinConfig: {
            enabled: this.USE_PREJOIN
          },
          startWithAudioMuted: false,
          startWithVideoMuted: false,
          ...(usePhoneTileGrid ? {
            constraints: {
              video: this.getMobileVideoConstraints()
            }
          } : {}),
          disableTileEnlargement: !usePhoneTileGrid,
          disableResponsiveTiles: usePhoneTileGrid,
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
          ...(usePhoneTileGrid ? { tileView: { numberOfVisibleTiles: 8 } } : {}),

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
          SETTINGS_SECTIONS: ['devices'],
          ...(tileViewMaxColumns ? { TILE_VIEW_MAX_COLUMNS: tileViewMaxColumns } : {})
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
        this.onJoined(args.attendanceGroupId, args.userName);

        // Default to tile view so stage uses space better for larger meetings.
        setTimeout(() => {
          this.api.executeCommand('setTileView', true);
          this.applyMobileTileLayout();
        }, 900);
        setTimeout(() => this.applyMobileTileLayout(), 1800);
      });
      
      this.api.addListener('videoConferenceLeft', (data) => {
        console.log('[GroupMeeting] Left conference:', data);
        this.joinedConference = false;
        if (this.connectTimeoutId) {
          clearTimeout(this.connectTimeoutId);
          this.connectTimeoutId = null;
        }
        this.onLeft(args.attendanceGroupId);
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
        this.applyMobileTileLayout();
      });
      
      this.api.addListener('participantLeft', (data) => {
        console.log('[GroupMeeting] Participant left:', data);
        this.participants = this.participants.filter(p => p.id !== data.id);
        this.updateParticipantCount();
        this.applyMobileTileLayout();
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
    let savedFontScale = 1.125;
    let savedSlideSize = 'medium';
    try {
      const raw = window.localStorage?.getItem('goMission_meetingSlidesOpacity');
      const parsed = Number(raw);
      if (Number.isFinite(parsed)) {
        savedOpacity = Math.min(95, Math.max(20, Math.round(parsed)));
      }
      const rawFontScale = Number(window.localStorage?.getItem('goMission_meetingSlidesFontScale'));
      if (Number.isFinite(rawFontScale)) {
        savedFontScale = Math.min(1.35, Math.max(1.125, rawFontScale));
      }
      const rawSlideSize = window.localStorage?.getItem('goMission_meetingSlidesSize');
      if (['small', 'medium', 'full'].includes(rawSlideSize)) {
        savedSlideSize = rawSlideSize;
      }
      window.localStorage?.removeItem('goMission_meetingSlidesDeckId');
    } catch (_) {}

    this.presentationState = {
      mode: 'local',        // future: 'host_synced'
      focusMode: false,     // future moderator setting
      panelOpen: false,
      settingsOpen: false,
      selectedDeckId: null,
      selectedLang: (window.currentLang === 'en' ? 'en' : 'tl'),
      overlayOpacity: savedOpacity, // 20-95 for readable transparent overlay
      fontScale: savedFontScale,
      slideSize: savedSlideSize,
      followLeader: true,
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
            <button onclick="window.GroupMeeting.toggleSlidesSettings()"
                    id="meeting-slides-settings-btn"
                    class="rounded-full font-bold transition-all flex items-center justify-center"
                    style="width:34px; height:34px; font-size:16px; background: linear-gradient(135deg, rgba(61,40,27,0.96), rgba(27,17,13,0.98)); color: #f4d7a2; box-shadow: 0 5px 14px rgba(0,0,0,0.26), inset 0 1px 0 rgba(255,255,255,0.08); border: 1px solid rgba(242, 184, 94, 0.22);">
              ⚙
            </button>
            <div id="meeting-slides-size-controls" class="flex items-center gap-1">
              <button onclick="window.GroupMeeting.setSlidesSize('small')"
                      id="meeting-slides-size-small"
                      title="Small slides"
                      aria-label="Small slides"
                      class="rounded-full font-bold transition-all flex items-center justify-center"
                      style="width:30px; height:30px; font-size:14px; background: linear-gradient(135deg, rgba(61,40,27,0.96), rgba(27,17,13,0.98)); color:#f4d7a2; border:1px solid rgba(242,184,94,0.22);">
                ◱
              </button>
              <button onclick="window.GroupMeeting.setSlidesSize('medium')"
                      id="meeting-slides-size-medium"
                      title="Medium slides"
                      aria-label="Medium slides"
                      class="rounded-full font-bold transition-all flex items-center justify-center"
                      style="width:30px; height:30px; font-size:14px; background: linear-gradient(135deg, rgba(61,40,27,0.96), rgba(27,17,13,0.98)); color:#f4d7a2; border:1px solid rgba(242,184,94,0.22);">
                ◧
              </button>
              <button onclick="window.GroupMeeting.setSlidesSize('full')"
                      id="meeting-slides-size-full"
                      title="Full slides"
                      aria-label="Full slides"
                      class="rounded-full font-bold transition-all flex items-center justify-center"
                      style="width:30px; height:30px; font-size:14px; background: linear-gradient(135deg, rgba(61,40,27,0.96), rgba(27,17,13,0.98)); color:#f4d7a2; border:1px solid rgba(242,184,94,0.22);">
                ⛶
              </button>
            </div>
            <button onclick="window.GroupMeeting.toggleSlidesPanel()"
                    id="meeting-slides-toggle-btn"
                    class="px-3 py-1.5 rounded-full font-bold transition-all"
                    style="font-size:13px; background: linear-gradient(135deg, #f5c542, #f39a22); color: #2c1408; box-shadow: 0 5px 12px rgba(242, 162, 37, 0.24), inset 0 1px 0 rgba(255,255,255,0.35);">
              🗂 Slides
            </button>
            <button onclick="window.GroupMeeting.leaveMeeting()" 
                    class="px-3 py-1.5 rounded-full font-bold transition-colors"
                    style="font-size:13px; background: linear-gradient(135deg, #ef2f2f, #cf1717); color: #fff; box-shadow: 0 6px 14px rgba(210, 22, 22, 0.28);">
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
        <div id="meeting-slides-panel-body" class="px-0 py-0 min-h-[240px] max-h-[55vh] overflow-y-auto">
          <p class="text-white/70 text-sm">Open slides to load the lesson guide.</p>
        </div>

        <div id="meeting-slides-bottombar" class="mt-2 rounded-2xl border border-white/10 shadow-xl px-4 py-3 flex items-center justify-between gap-2">
          <button onclick="window.GroupMeeting.prevSlide()"
                  id="meeting-slide-prev-btn"
                  class="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white text-sm font-semibold">
            ← Prev
          </button>
          <div id="meeting-slide-counter" class="text-xs text-white/70 whitespace-nowrap">0 / 0</div>
          <div class="flex items-center gap-2 min-w-0">
            <button onclick="window.GroupMeeting.hideSlidesFromBottombar()"
                    id="meeting-slide-hide-btn"
                    class="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white text-sm font-semibold">
              Hide
            </button>
          </div>
          <button onclick="window.GroupMeeting.nextSlide()"
                  id="meeting-slide-next-btn"
                  class="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white text-sm font-semibold">
            Next →
          </button>
        </div>
      </div>

      <div id="meeting-slides-settings-panel"
           class="hidden absolute z-[10002] top-[76px] right-3 left-3 md:left-auto md:w-[440px] md:top-[74px] md:right-4">
        <div id="meeting-slides-settings-card" class="rounded-2xl border border-white/10 shadow-xl overflow-hidden">
          <div class="px-4 py-3 flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="text-[10px] uppercase tracking-[0.2em] text-amber-300/80 font-bold">Meeting Slides</p>
              <p id="meeting-slides-settings-deck-title" class="text-white font-bold text-sm truncate">Loading…</p>
            </div>
            <button onclick="window.GroupMeeting.toggleSlidesSettings(false)"
                    class="rounded-full font-bold transition-all flex items-center justify-center"
                    style="width:30px; height:30px; font-size:14px; background: rgba(255,255,255,0.08); color:#f7e9cc; border:1px solid rgba(255,255,255,0.08);">
              ✕
            </button>
          </div>
          <div class="px-4 pb-4 flex flex-col gap-3">
            <div class="flex items-start gap-3">
              <div class="flex-1 min-w-0">
                <label for="meeting-slides-topic-select" class="block text-[10px] uppercase tracking-[0.14em] text-white/60 font-semibold mb-1">Topic</label>
                <select id="meeting-slides-topic-select"
                        onchange="window.GroupMeeting.setSlidesDeck(this.value)"
                        class="w-full rounded-xl text-sm px-3 py-2.5">
                  <option value="">No topics yet</option>
                </select>
              </div>
              <div style="width:112px;" class="shrink-0">
                <label for="meeting-slides-lang-select" class="block text-[10px] uppercase tracking-[0.14em] text-white/60 font-semibold mb-1">Lang</label>
                <select id="meeting-slides-lang-select"
                        onchange="window.GroupMeeting.setSlidesLanguage(this.value)"
                        class="w-full rounded-xl text-sm px-3 py-2.5">
                  <option value="tl">Tagalog</option>
                  <option value="en">English</option>
                </select>
              </div>
            </div>
            <div class="flex items-center gap-3">
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
            <div class="flex items-center justify-between gap-3">
              <span class="text-[11px] uppercase tracking-[0.14em] text-white/65 font-semibold whitespace-nowrap">Text</span>
              <div class="flex items-center gap-2">
                <button onclick="window.GroupMeeting.decreaseSlidesFontSize()"
                        id="meeting-slides-font-decrease"
                        class="px-3 py-1.5 rounded-full font-bold"
                        style="font-size:13px;">
                  A-
                </button>
                <span id="meeting-slides-font-value"
                      class="text-xs font-bold text-amber-200 min-w-[52px] text-center">18px</span>
                <button onclick="window.GroupMeeting.increaseSlidesFontSize()"
                        id="meeting-slides-font-increase"
                        class="px-3 py-1.5 rounded-full font-bold"
                        style="font-size:13px;">
                  A+
                </button>
              </div>
            </div>
            <label class="flex items-start gap-3 rounded-xl px-3 py-3"
                   style="background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08);">
              <input id="meeting-slides-follow-leader"
                     type="checkbox"
                     checked
                     onchange="window.GroupMeeting.setSlidesFollowLeader(this.checked)"
                     class="mt-1 h-4 w-4 accent-amber-400">
              <span class="min-w-0">
                <span id="meeting-slides-follow-title"
                      class="block text-xs font-bold text-amber-100">Follow leader slides</span>
                <span id="meeting-slides-follow-copy"
                      class="block mt-1 text-[11px] leading-snug">On by default. Uncheck to navigate locally.</span>
              </span>
            </label>
          </div>
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
      this.wireSlidesPanelScroll();
    });

    // Keep selector in sync with current state on first render.
    this.renderSlidesPanel();
    this.wireSlidesPanelScroll();
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
    if (!nextOpen) {
      this.presentationState.settingsOpen = false;
    }
    panel.classList.toggle('hidden', !nextOpen);

    if (nextOpen && !this.presentationState.deck && !this.presentationState.loading) {
      await this.loadSlidesDeck();
    }

    this.renderSlidesPanel();
    if (nextOpen) {
      this.scrollSlidesBodyToTop();
    }
    this.publishSlidesSync({ panelOpen: nextOpen, action: 'visibility' });
  },

  async toggleSlidesSettings(forceOpen) {
    if (!this.presentationState) return;
    const panel = document.getElementById('meeting-slides-panel');
    const settingsPanel = document.getElementById('meeting-slides-settings-panel');
    const nextOpen = typeof forceOpen === 'boolean'
      ? forceOpen
      : !this.presentationState.settingsOpen;

    if (nextOpen && !this.presentationState.panelOpen) {
      this.presentationState.panelOpen = true;
      if (panel) panel.classList.remove('hidden');
      if (!this.presentationState.deck && !this.presentationState.loading) {
        await this.loadSlidesDeck();
      }
    }

    this.presentationState.settingsOpen = nextOpen;
    if (settingsPanel) settingsPanel.classList.toggle('hidden', !nextOpen);
    this.renderSlidesPanel();
  },

  hideSlidesFromBottombar() {
    this.toggleSlidesPanel(false);
  },

  getSlidesSize(value = null) {
    const next = value || this.presentationState?.slideSize || 'medium';
    return ['small', 'medium', 'full'].includes(next) ? next : 'medium';
  },

  setSlidesSize(size) {
    if (!this.presentationState) return;
    const next = this.getSlidesSize(size);
    this.presentationState.slideSize = next;
    try {
      window.localStorage?.setItem('goMission_meetingSlidesSize', next);
    } catch (_) {}
    this.renderSlidesPanel();
    this.scrollSlidesBodyToTop();
    this.publishSlidesSync({ slideSize: next, action: 'size' });
  },

  scrollSlidesBodyToTop() {
    window.requestAnimationFrame?.(() => {
      const body = document.getElementById('meeting-slides-panel-body');
      if (body) body.scrollTop = 0;
    });
  },

  wireSlidesPanelScroll() {
    const panel = document.getElementById('meeting-slides-panel');
    const body = document.getElementById('meeting-slides-panel-body');
    if (!panel || !body || panel.dataset.scrollWired === 'true') return;

    panel.dataset.scrollWired = 'true';
    let lastTouchY = 0;

    const getScrollBody = () => document.getElementById('meeting-slides-panel-body');
    const isInteractiveControl = (target) => !!target?.closest?.('button, input, select, textarea, label, [role="button"]');
    const canScroll = (el, deltaY) => {
      if (!el) return false;
      const maxScroll = Math.max(0, el.scrollHeight - el.clientHeight);
      if (maxScroll <= 1) return false;
      if (deltaY < 0) return el.scrollTop > 0;
      if (deltaY > 0) return el.scrollTop < maxScroll - 1;
      return true;
    };

    panel.addEventListener('wheel', (event) => {
      if (isInteractiveControl(event.target)) return;
      const scrollBody = getScrollBody();
      if (!scrollBody) return;

      if (canScroll(scrollBody, event.deltaY)) {
        event.preventDefault();
        event.stopPropagation();
        scrollBody.scrollTop += event.deltaY;
      }
    }, { passive: false });

    panel.addEventListener('touchstart', (event) => {
      if (!event.touches?.length) return;
      lastTouchY = event.touches[0].clientY;
    }, { passive: true });

    panel.addEventListener('touchmove', (event) => {
      if (isInteractiveControl(event.target) || !event.touches?.length) return;
      const scrollBody = getScrollBody();
      if (!scrollBody) return;

      const currentY = event.touches[0].clientY;
      const deltaY = lastTouchY - currentY;
      lastTouchY = currentY;

      if (canScroll(scrollBody, deltaY)) {
        event.preventDefault();
        event.stopPropagation();
        scrollBody.scrollTop += deltaY;
      }
    }, { passive: false });
  },

  setSlidesFollowLeader(enabled) {
    if (!this.presentationState) return;
    const next = enabled !== false;
    this.presentationState.followLeader = next;
    this.renderSlidesPanel();

    if (this.currentUserIsMeetingLeader) {
      this.publishSlidesSync({ enabled: next, action: 'mode' });
    } else if (next) {
      this.pullLatestSlidesSync();
    }
  },

  async pullLatestSlidesSync() {
    if (!window.getDoc) return;
    const ref = this.getSlidesSyncRef();
    if (!ref) return;
    try {
      const snap = await window.getDoc(ref);
      const sync = snap.exists() ? (snap.data()?.slidesSync || null) : null;
      await this.applySlidesSync(sync);
    } catch (error) {
      console.warn('[GroupMeeting] Could not pull latest slides sync:', error?.message || error);
    }
  },

  getSlidesSyncRef() {
    if (!window.db || !window.doc || !this.currentMeetingId) return null;
    return window.doc(window.db, 'goMission_meetings', this.currentMeetingId);
  },

  getCurrentSlidesSyncPayload(overrides = {}) {
    const state = this.presentationState;
    if (!state) return null;
    return {
      enabled: state.followLeader !== false,
      panelOpen: state.panelOpen === true,
      selectedDeckId: state.selectedDeckId || null,
      selectedLang: state.selectedLang === 'en' ? 'en' : 'tl',
      currentSlideIndex: Math.max(0, Math.round(Number(state.currentSlideIndex || 0))),
      slideSize: this.getSlidesSize(state.slideSize),
      hidden: state.panelOpen !== true,
      leaderUid: window.currentUser?.uid || null,
      leaderName: window.currentUser?.displayName || '',
      action: 'state',
      version: Date.now(),
      updatedAt: window.serverTimestamp ? window.serverTimestamp() : new Date().toISOString(),
      ...overrides
    };
  },

  async publishSlidesSync(overrides = {}) {
    if (!this.currentUserIsMeetingLeader || this.slidesSyncApplying) return;
    if (!window.setDoc) return;
    const ref = this.getSlidesSyncRef();
    const payload = this.getCurrentSlidesSyncPayload(overrides);
    if (!ref || !payload) return;

    try {
      await window.setDoc(ref, { slidesSync: payload }, { merge: true });
    } catch (error) {
      console.warn('[GroupMeeting] Could not publish slides sync:', error?.message || error);
    }
  },

  subscribeSlidesSync() {
    this.unsubscribeSlidesSync();
    const ref = this.getSlidesSyncRef();
    if (!ref || typeof window.onSnapshot !== 'function') return;

    this.slidesSyncUnsubscribe = window.onSnapshot(ref, async (snapshot) => {
      const sync = snapshot.exists() ? (snapshot.data()?.slidesSync || null) : null;
      await this.applySlidesSync(sync);
    }, (error) => {
      console.warn('[GroupMeeting] Slides sync listener failed:', error?.message || error);
    });
  },

  unsubscribeSlidesSync() {
    if (typeof this.slidesSyncUnsubscribe === 'function') {
      try {
        this.slidesSyncUnsubscribe();
      } catch (_) {}
    }
    this.slidesSyncUnsubscribe = null;
  },

  async applySlidesSync(sync) {
    const state = this.presentationState;
    if (!state || !sync || typeof sync !== 'object') return;
    if (this.currentUserIsMeetingLeader) return;
    const version = Number(sync.version || 0);
    if (version && version < this.lastSlidesSyncVersion) return;
    if (version) this.lastSlidesSyncVersion = version;
    if (sync.action === 'mode') {
      state.followLeader = sync.enabled !== false;
      this.renderSlidesPanel();
      if (sync.enabled === false) return;
    }
    if (sync.enabled === false) return;

    if (state.followLeader === false) {
      if (sync.action === 'visibility') {
        state.panelOpen = sync.panelOpen === true && sync.hidden !== true;
        if (!state.panelOpen) state.settingsOpen = false;
        const panel = document.getElementById('meeting-slides-panel');
        const settingsPanel = document.getElementById('meeting-slides-settings-panel');
        if (panel) panel.classList.toggle('hidden', !state.panelOpen);
        if (settingsPanel) settingsPanel.classList.toggle('hidden', !state.settingsOpen);
        this.renderSlidesPanel();
      }
      return;
    }

    this.slidesSyncApplying = true;
    try {
      const nextDeckId = this.normalizeMeetingSlidesTopicId(sync.selectedDeckId || '');
      const nextLang = sync.selectedLang === 'en' ? 'en' : 'tl';
      const nextSlideSize = this.getSlidesSize(sync.slideSize);
      const hasDeckChange = nextDeckId && nextDeckId !== state.selectedDeckId;
      const hasLangChange = nextLang !== state.selectedLang;

      if (hasDeckChange || hasLangChange || !state.deck) {
        if (nextDeckId) state.selectedDeckId = nextDeckId;
        state.selectedLang = nextLang;
        state.deck = null;
        state.loading = false;
        state.error = null;
        await this.loadSlidesDeck();
      }

      const slidesLength = state.deck?.slides?.length || 0;
      const nextIndex = Math.max(0, Math.round(Number(sync.currentSlideIndex || 0)));
      state.currentSlideIndex = slidesLength ? Math.min(nextIndex, slidesLength - 1) : nextIndex;
      state.slideSize = nextSlideSize;
      state.panelOpen = sync.panelOpen === true && sync.hidden !== true;
      if (!state.panelOpen) state.settingsOpen = false;

      const panel = document.getElementById('meeting-slides-panel');
      const settingsPanel = document.getElementById('meeting-slides-settings-panel');
      if (panel) panel.classList.toggle('hidden', !state.panelOpen);
      if (settingsPanel) settingsPanel.classList.toggle('hidden', !state.settingsOpen);

      this.renderSlidesPanel();
    } finally {
      this.slidesSyncApplying = false;
    }
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
    this.publishSlidesSync({
      selectedDeckId: this.presentationState.selectedDeckId,
      selectedLang: this.presentationState.selectedLang,
      currentSlideIndex: this.presentationState.currentSlideIndex,
      action: 'deck'
    });
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
    this.publishSlidesSync({
      selectedLang: this.presentationState.selectedLang,
      currentSlideIndex: 0,
      action: 'deck'
    });
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

  setSlidesFontScale(value) {
    if (!this.presentationState) return;
    const next = Math.min(1.35, Math.max(0.95, Number(value) || 1.125));
    this.presentationState.fontScale = Number(next.toFixed(3));
    try {
      window.localStorage?.setItem('goMission_meetingSlidesFontScale', String(this.presentationState.fontScale));
    } catch (_) {}
    this.renderSlidesPanel();
  },

  increaseSlidesFontSize() {
    const current = Number(this.presentationState?.fontScale || 1.125);
    this.setSlidesFontScale(current + 0.08);
  },

  decreaseSlidesFontSize() {
    const current = Number(this.presentationState?.fontScale || 1.125);
    this.setSlidesFontScale(current - 0.08);
  },

  nextSlide() {
    const s = this.presentationState;
    if (!s?.deck?.slides?.length) return;
    if (s.currentSlideIndex < s.deck.slides.length - 1) {
      s.currentSlideIndex += 1;
      this.renderSlidesPanel();
      this.publishSlidesSync({ currentSlideIndex: s.currentSlideIndex, action: 'slide' });
    }
  },

  prevSlide() {
    const s = this.presentationState;
    if (!s?.deck?.slides?.length) return;
    if (s.currentSlideIndex > 0) {
      s.currentSlideIndex -= 1;
      this.renderSlidesPanel();
      this.publishSlidesSync({ currentSlideIndex: s.currentSlideIndex, action: 'slide' });
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

  isMeetingSlideSectionHeading(text) {
    const normalized = String(text || '').trim();
    if (!normalized) return false;
    if (/^LIFE APPLICATION AND MISSIONAL GUIDE/i.test(normalized)) return false;
    return /^[IVXLCDM]+\.\s+[A-Z0-9][A-Z0-9 /&,'’().:-]+$/i.test(normalized);
  },

  isMeetingSlideKeyPointMarker(text) {
    return /^[IVXLCDM]+\.\s+KEY POINT\s+\d+\s*$/i.test(String(text || '').trim());
  },

  isMeetingSlideScriptureReference(text) {
    const normalized = String(text || '').trim();
    if (!normalized) return false;
    return /^(?:[1-3]\s+)?[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ.'-]*(?:\s+[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ.'-]*){0,4}\s+\d{1,3}:\d{1,3}(?:\s*[-–]\s*\d{1,3})?$/i.test(normalized);
  },

  isMeetingSlideVerseText(text) {
    const normalized = String(text || '').trim();
    if (!normalized) return false;
    return /^[“"'‘]/.test(normalized) || /^\(?\d{1,3}\)?\s+\S+/.test(normalized);
  },

  normalizeMeetingSlideLabel(text) {
    const raw = String(text || '').trim().replace(/\s+/g, ' ');
    const normalized = raw.replace(/:\s*$/, '');
    if (!normalized) return null;

    if (/^Title$/i.test(normalized)) return { label: 'Title', kind: 'meta' };
    if (/^Bible Study Series$/i.test(normalized)) return { label: 'Bible Study Series', kind: 'meta' };
    if (/^Important Note$/i.test(normalized)) return { label: 'Important Note', kind: 'note' };
    if (/^Thankfulness Sharing$/i.test(normalized)) return { label: 'Thankfulness Sharing', kind: 'prompt' };
    if (/^Memorable Conversation with the Lord$/i.test(normalized)) return { label: 'Memorable Conversation with the Lord', kind: 'prompt' };
    if (/^Missional Follow-up$/i.test(normalized)) return { label: 'Missional Follow-up', kind: 'prompt' };
    if (/^Group Prayer$/i.test(normalized)) return { label: 'Group Prayer', kind: 'prompt' };
    if (/^Paliwanag$/i.test(normalized)) return { label: 'Paliwanag', kind: 'explanation' };
    if (/^Supporting Verse$/i.test(normalized)) return { label: 'Supporting Verse', kind: 'scripture' };
    if (/^Summary of the point$/i.test(normalized)) return { label: 'Summary of the point', kind: 'summary' };
    if (/^(Sagot|Suggested Answer|Possible Answer|Posibleng Sagot)$/i.test(normalized)) return { label: 'Sagot', kind: 'answer' };
    if (/^Guide for Facilitator$/i.test(normalized)) return { label: 'Guide for Facilitator', kind: 'facilitator' };
    if (/^Facilitator Note$/i.test(normalized)) return { label: 'Facilitator Note', kind: 'facilitator-note' };
    if (/^Individual Missional Response$/i.test(normalized)) return { label: 'Individual Missional Response', kind: 'response' };
    if (/^Group Missional Response$/i.test(normalized)) return { label: 'Group Missional Response', kind: 'response' };
    if (/^Recording and Follow-up$/i.test(normalized)) return { label: 'Recording and Follow-up', kind: 'response' };

    const questionMatch = normalized.match(/^(Tanong\s*\d+)(?::\s*(.+))?$/i);
    if (questionMatch) {
      return {
        label: questionMatch[2] ? `${questionMatch[1]}: ${questionMatch[2]}` : questionMatch[1],
        kind: 'question'
      };
    }

    return null;
  },

  parseMeetingSlideLabelLine(text) {
    const raw = String(text || '').trim();
    if (!raw) return null;

    const direct = this.normalizeMeetingSlideLabel(raw);
    if (direct) {
      return { info: direct, inlineBody: '' };
    }

    const pairMatch = raw.match(/^([^:]{2,80}):\s*(.+)$/);
    if (!pairMatch) return null;

    const info = this.normalizeMeetingSlideLabel(pairMatch[1]);
    if (!info) return null;

    return {
      info,
      inlineBody: String(pairMatch[2] || '').trim()
    };
  },

  getMeetingSlideFontScale(options = {}) {
    const explicit = Number(options.fontScale);
    if (Number.isFinite(explicit) && explicit > 0) return explicit;
    const stateScale = Number(this.presentationState?.fontScale);
    if (Number.isFinite(stateScale) && stateScale > 0) return stateScale;
    return 1.125;
  },

  scaleMeetingSlidePx(value, options = {}) {
    const fontScale = this.getMeetingSlideFontScale(options);
    const numeric = typeof value === 'number' ? value : parseFloat(String(value || '').replace('px', ''));
    const safe = Number.isFinite(numeric) ? numeric : 16;
    const scaled = safe * fontScale;
    return `${Number(scaled.toFixed(2)).toString()}px`;
  },

  scaleMeetingSlideClamp(minPx, vw, maxPx, options = {}) {
    const fontScale = this.getMeetingSlideFontScale(options);
    const safeMin = Number.isFinite(minPx) ? minPx : 24;
    const safeVw = Number.isFinite(vw) ? vw : 5.8;
    const safeMax = Number.isFinite(maxPx) ? maxPx : 38;
    return `clamp(${Math.round(safeMin * fontScale)}px, ${(safeVw * fontScale).toFixed(2)}vw, ${Math.round(safeMax * fontScale)}px)`;
  },

  renderMeetingSlideParagraphBlocks(paragraphs = [], options = {}) {
    const fontScale = this.getMeetingSlideFontScale(options);
    const paragraphColor = options.paragraphColor || '#1f1f1f';
    const bulletColor = options.bulletColor || '#181818';
    const paragraphSize = this.scaleMeetingSlidePx(options.paragraphSize || '18px', { fontScale });
    const bulletSize = this.scaleMeetingSlidePx(options.bulletSize || options.paragraphSize || '18px', { fontScale });
    const paragraphGap = this.scaleMeetingSlidePx(options.paragraphGap || '12px', { fontScale });
    const listGap = this.scaleMeetingSlidePx(options.listGap || '10px', { fontScale });
    const listIndent = this.scaleMeetingSlidePx(options.listIndent || '22px', { fontScale });

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

  buildMeetingSlideContentBlocks(slide) {
    const paragraphs = Array.isArray(slide?.paragraphs) ? slide.paragraphs.filter((p) => String(p || '').trim()) : [];
    const blocks = [];
    let currentSection = null;
    let currentLabelBlock = null;
    let currentBodyParagraphs = [];

    const pushNode = (node) => {
      if (!node) return;
      if (currentSection) {
        currentSection.items.push(node);
      } else {
        blocks.push(node);
      }
    };

    const flushBody = () => {
      if (!currentBodyParagraphs.length) return;
      pushNode({
        type: 'body',
        paragraphs: [...currentBodyParagraphs]
      });
      currentBodyParagraphs = [];
    };

    const flushLabelBlock = () => {
      if (!currentLabelBlock) return;
      pushNode(currentLabelBlock);
      currentLabelBlock = null;
    };

    const pushSectionIfNeeded = () => {
      if (!currentSection) return;
      blocks.push(currentSection);
      currentSection = null;
    };

    const startSection = (heading) => {
      flushLabelBlock();
      flushBody();
      pushSectionIfNeeded();
      currentSection = {
        type: 'section',
        heading,
        items: []
      };
    };

    const appendToLabelBlock = (text) => {
      const raw = String(text || '').trim();
      if (!raw) return;
      if (!currentLabelBlock) {
        currentBodyParagraphs.push(raw);
        return;
      }

      if (currentLabelBlock.kind === 'scripture' && !currentLabelBlock.reference && this.isMeetingSlideScriptureReference(raw)) {
        currentLabelBlock.reference = raw;
        return;
      }
      if (currentLabelBlock.kind === 'scripture' && (this.isMeetingSlideVerseText(raw) || currentLabelBlock.verses.length)) {
        currentLabelBlock.verses.push(raw);
        return;
      }

      currentLabelBlock.body.push(raw);
    };

    const startLabelBlock = (info, inlineBody = '') => {
      flushBody();
      flushLabelBlock();
      currentLabelBlock = {
        type: 'label',
        kind: info.kind,
        label: info.label,
        body: [],
        reference: '',
        verses: []
      };
      if (inlineBody) appendToLabelBlock(inlineBody);
    };

    paragraphs.forEach((paragraph) => {
      const raw = String(paragraph || '').trim();
      if (!raw) return;

      if (this.isMeetingSlideSectionHeading(raw)) {
        startSection(raw);
        return;
      }

      const parsedLabel = this.parseMeetingSlideLabelLine(raw);
      if (parsedLabel) {
        startLabelBlock(parsedLabel.info, parsedLabel.inlineBody);
        return;
      }

      if (currentLabelBlock) {
        appendToLabelBlock(raw);
        return;
      }

      currentBodyParagraphs.push(raw);
    });

    flushLabelBlock();
    flushBody();
    pushSectionIfNeeded();

    return blocks;
  },

  getMeetingSlideLabelTone(kind = 'default') {
    const tones = {
      meta: {
        background: 'rgba(255, 252, 246, 0.92)',
        border: 'rgba(186, 135, 78, 0.18)',
        labelBg: 'rgba(122, 79, 38, 0.1)',
        labelColor: '#7a4f26',
        bodyColor: '#30261d',
        bodySize: '15px',
        labelTransform: 'uppercase',
        labelSpacing: '0.14em'
      },
      note: {
        background: 'rgba(255, 248, 235, 0.95)',
        border: 'rgba(217, 119, 6, 0.18)',
        labelBg: 'rgba(245, 158, 11, 0.14)',
        labelColor: '#8a3b13',
        bodyColor: '#35261a',
        bodySize: '15px',
        labelTransform: 'uppercase',
        labelSpacing: '0.13em'
      },
      prompt: {
        background: 'rgba(255, 251, 245, 0.96)',
        border: 'rgba(145, 92, 44, 0.14)',
        labelBg: 'rgba(125, 80, 41, 0.1)',
        labelColor: '#6f4623',
        bodyColor: '#2e241c',
        bodySize: '16px',
        labelTransform: 'none',
        labelSpacing: '0.01em'
      },
      explanation: {
        background: 'rgba(255, 248, 240, 0.96)',
        border: 'rgba(199, 109, 61, 0.18)',
        labelBg: 'rgba(191, 88, 42, 0.12)',
        labelColor: '#8c3517',
        bodyColor: '#2e241d',
        bodySize: '16px',
        labelTransform: 'none',
        labelSpacing: '0.01em'
      },
      scripture: {
        background: 'rgba(252, 247, 237, 0.98)',
        border: 'rgba(196, 144, 74, 0.22)',
        labelBg: 'rgba(217, 119, 6, 0.12)',
        labelColor: '#7a4b12',
        bodyColor: '#38271a',
        bodySize: '15px',
        labelTransform: 'uppercase',
        labelSpacing: '0.14em'
      },
      question: {
        background: 'rgba(255, 245, 238, 0.96)',
        border: 'rgba(208, 102, 63, 0.18)',
        labelBg: 'rgba(192, 79, 47, 0.12)',
        labelColor: '#8b2e1d',
        bodyColor: '#2d231c',
        bodySize: '16px',
        labelTransform: 'none',
        labelSpacing: '0.01em'
      },
      answer: {
        background: 'rgba(239, 246, 255, 0.96)',
        border: 'rgba(59, 130, 246, 0.18)',
        labelBg: 'rgba(59, 130, 246, 0.12)',
        labelColor: '#1d4ed8',
        bodyColor: '#1f3557',
        bodySize: '15px',
        labelTransform: 'uppercase',
        labelSpacing: '0.12em'
      },
      facilitator: {
        background: 'rgba(255, 248, 235, 0.96)',
        border: 'rgba(217, 119, 6, 0.18)',
        labelBg: 'rgba(245, 158, 11, 0.14)',
        labelColor: '#9a4e12',
        bodyColor: '#3a2a1d',
        bodySize: '15px',
        labelTransform: 'uppercase',
        labelSpacing: '0.12em'
      },
      'facilitator-note': {
        background: 'rgba(255, 246, 240, 0.96)',
        border: 'rgba(234, 88, 12, 0.18)',
        labelBg: 'rgba(234, 88, 12, 0.12)',
        labelColor: '#9a3412',
        bodyColor: '#3b271b',
        bodySize: '15px',
        labelTransform: 'uppercase',
        labelSpacing: '0.12em'
      },
      summary: {
        background: 'rgba(247, 244, 237, 0.98)',
        border: 'rgba(104, 86, 67, 0.18)',
        labelBg: 'rgba(82, 68, 55, 0.1)',
        labelColor: '#5b4737',
        bodyColor: '#2f241b',
        bodySize: '16px',
        labelTransform: 'none',
        labelSpacing: '0.01em'
      },
      response: {
        background: 'rgba(245, 249, 255, 0.96)',
        border: 'rgba(96, 165, 250, 0.18)',
        labelBg: 'rgba(59, 130, 246, 0.1)',
        labelColor: '#1d4ed8',
        bodyColor: '#243b5a',
        bodySize: '15px',
        labelTransform: 'none',
        labelSpacing: '0.01em'
      },
      default: {
        background: 'rgba(255, 251, 245, 0.94)',
        border: 'rgba(150, 110, 67, 0.14)',
        labelBg: 'rgba(115, 83, 54, 0.1)',
        labelColor: '#6b4e38',
        bodyColor: '#2f261f',
        bodySize: '16px',
        labelTransform: 'none',
        labelSpacing: '0.01em'
      }
    };
    return tones[kind] || tones.default;
  },

  renderMeetingSlideLabelBlock(block, options = {}) {
    const fontScale = this.getMeetingSlideFontScale(options);
    const compactMobile = !!options.compactMobile;
    const tone = this.getMeetingSlideLabelTone(block.kind);
    const isScripture = block.kind === 'scripture';
    const bodyHtml = block.body.length
      ? this.renderMeetingSlideParagraphBlocks(block.body, {
          paragraphColor: tone.bodyColor,
          bulletColor: tone.bodyColor,
          paragraphSize: tone.bodySize,
          bulletSize: tone.bodySize,
          paragraphGap: '10px',
          listGap: '8px',
          listIndent: '20px',
          fontScale
        })
      : '';
    const referenceHtml = block.reference
      ? `<div style="margin-top:${this.scaleMeetingSlidePx('12px', { fontScale })}; color:#8a4b14; font-size:${this.scaleMeetingSlidePx('12px', { fontScale })}; line-height:1.35; font-weight:900; letter-spacing:0.14em; text-transform:uppercase;">${this.escapeHtml(block.reference)}</div>`
      : '';
    const versesHtml = block.verses.length
      ? block.verses.map((verse) => (
          `<p style="margin:${this.scaleMeetingSlidePx('10px', { fontScale })} 0 0 0; color:#3a2617; font-size:${this.scaleMeetingSlidePx('16px', { fontScale })}; line-height:1.72; font-style:italic; font-weight:600;">${this.escapeHtml(verse)}</p>`
        )).join('')
      : '';
    const labelMarginBottom = isScripture || bodyHtml ? this.scaleMeetingSlidePx('10px', { fontScale }) : '0';
    const cardPadding = compactMobile ? `${this.scaleMeetingSlidePx('10px', { fontScale })} ${this.scaleMeetingSlidePx('11px', { fontScale })} ${this.scaleMeetingSlidePx('11px', { fontScale })} ${this.scaleMeetingSlidePx('11px', { fontScale })}` : `${this.scaleMeetingSlidePx('12px', { fontScale })} ${this.scaleMeetingSlidePx('13px', { fontScale })} ${this.scaleMeetingSlidePx('13px', { fontScale })} ${this.scaleMeetingSlidePx('13px', { fontScale })}`;
    const cardRadius = compactMobile ? this.scaleMeetingSlidePx('13px', { fontScale }) : this.scaleMeetingSlidePx('15px', { fontScale });
    const labelFontSize = this.scaleMeetingSlidePx('11px', { fontScale });
    const labelPadding = `${this.scaleMeetingSlidePx('6px', { fontScale })} ${this.scaleMeetingSlidePx('10px', { fontScale })}`;

    return `
      <div style="border-radius:${cardRadius}; border:1px solid ${tone.border}; background:${tone.background}; padding:${cardPadding}; box-shadow:${compactMobile ? 'none' : 'inset 0 1px 0 rgba(255,255,255,0.45)'};">
        <div style="display:inline-flex; align-items:center; gap:${this.scaleMeetingSlidePx('6px', { fontScale })}; max-width:100%; border-radius:999px; background:${tone.labelBg}; color:${tone.labelColor}; padding:${labelPadding}; font-size:${labelFontSize}; line-height:1.2; font-weight:900; text-transform:${tone.labelTransform}; letter-spacing:${tone.labelSpacing}; margin-bottom:${labelMarginBottom};">${this.escapeHtml(block.label)}</div>
        ${isScripture ? `<div>${referenceHtml}${versesHtml}${bodyHtml ? `<div style="margin-top:${this.scaleMeetingSlidePx('12px', { fontScale })};">${bodyHtml}</div>` : ''}</div>` : bodyHtml}
      </div>
    `;
  },

  renderMeetingSlideContentBlocks(blocks = [], options = {}) {
    const fontScale = this.getMeetingSlideFontScale(options);
    const compactMobile = !!options.compactMobile;
    const depth = Number(options.depth || 0);
    const items = Array.isArray(blocks) ? blocks : [];
    if (!items.length) return '';

    return items.map((block, idx) => {
      const marginTop = idx === 0 ? '0' : (block.type === 'section' ? this.scaleMeetingSlidePx(compactMobile ? '14px' : '18px', { fontScale }) : this.scaleMeetingSlidePx(compactMobile ? '10px' : '12px', { fontScale }));
      if (block.type === 'section') {
        if (compactMobile) {
          return `
            <section style="margin-top:${marginTop};">
              <div style="margin-bottom:${block.items.length ? this.scaleMeetingSlidePx('10px', { fontScale }) : '0'};">
                <div style="color:#2b1d13; font-size:${this.scaleMeetingSlidePx(depth > 0 ? '16px' : '19px', { fontScale })}; line-height:1.04; font-weight:900; letter-spacing:-0.02em; text-transform:uppercase;">${this.escapeHtml(block.heading)}</div>
              </div>
              <div>${this.renderMeetingSlideContentBlocks(block.items, { depth: depth + 1, fontScale, compactMobile })}</div>
            </section>
          `;
        }
        return `
          <section style="margin-top:${marginTop}; border-radius:${this.scaleMeetingSlidePx('18px', { fontScale })}; border:1px solid rgba(191, 126, 63, 0.18); background:linear-gradient(180deg, rgba(255,250,244,0.96), rgba(255,245,234,0.92)); padding:${this.scaleMeetingSlidePx('14px', { fontScale })} ${this.scaleMeetingSlidePx('14px', { fontScale })} ${this.scaleMeetingSlidePx('15px', { fontScale })} ${this.scaleMeetingSlidePx('14px', { fontScale })}; box-shadow:inset 0 1px 0 rgba(255,255,255,0.55);">
            <div style="margin-bottom:${block.items.length ? this.scaleMeetingSlidePx('12px', { fontScale }) : '0'};">
              <div style="color:#2b1d13; font-size:${this.scaleMeetingSlidePx(depth > 0 ? '15px' : '17px', { fontScale })}; line-height:1.08; font-weight:900; letter-spacing:-0.015em; text-transform:uppercase;">${this.escapeHtml(block.heading)}</div>
            </div>
            <div>${this.renderMeetingSlideContentBlocks(block.items, { depth: depth + 1, fontScale, compactMobile })}</div>
          </section>
        `;
      }

      if (block.type === 'label') {
        return `<div style="margin-top:${marginTop};">${this.renderMeetingSlideLabelBlock(block, { depth, fontScale, compactMobile })}</div>`;
      }

      if (block.type === 'body') {
        return `
          <div style="margin-top:${marginTop};">
            ${this.renderMeetingSlideParagraphBlocks(block.paragraphs, {
              paragraphColor: depth > 0 ? '#35281e' : '#2d241c',
              bulletColor: depth > 0 ? '#35281e' : '#2d241c',
              paragraphSize: depth > 0 ? '17px' : '18px',
              bulletSize: depth > 0 ? '17px' : '18px',
              paragraphGap: depth > 0 ? '10px' : '12px',
              listGap: '8px',
              listIndent: compactMobile ? '18px' : '20px',
              fontScale
            })}
          </div>
        `;
      }

      return '';
    }).join('');
  },

  renderSlidesPanel() {
    const state = this.presentationState;
    const panel = document.getElementById('meeting-slides-panel');
    if (!panel || !state) return;

    const body = document.getElementById('meeting-slides-panel-body');
    const settingsTitleEl = document.getElementById('meeting-slides-settings-deck-title');
    const counterEl = document.getElementById('meeting-slide-counter');
    const prevBtn = document.getElementById('meeting-slide-prev-btn');
    const nextBtn = document.getElementById('meeting-slide-next-btn');
    const toggleBtn = document.getElementById('meeting-slides-toggle-btn');
    const settingsToggleBtn = document.getElementById('meeting-slides-settings-btn');
    const bottombar = document.getElementById('meeting-slides-bottombar');
    const settingsPanel = document.getElementById('meeting-slides-settings-panel');
    const settingsCard = document.getElementById('meeting-slides-settings-card');
    const topicSelect = document.getElementById('meeting-slides-topic-select');
    const langSelect = document.getElementById('meeting-slides-lang-select');
    const opacitySlider = document.getElementById('meeting-slides-opacity');
    const opacityValueEl = document.getElementById('meeting-slides-opacity-value');
    const fontValueEl = document.getElementById('meeting-slides-font-value');
    const fontDecreaseBtn = document.getElementById('meeting-slides-font-decrease');
    const fontIncreaseBtn = document.getElementById('meeting-slides-font-increase');
    const followLeaderCheckbox = document.getElementById('meeting-slides-follow-leader');
    const followLeaderTitle = document.getElementById('meeting-slides-follow-title');
    const followLeaderCopy = document.getElementById('meeting-slides-follow-copy');
    const hideBtn = document.getElementById('meeting-slide-hide-btn');
    const sizeControls = ['small', 'medium', 'full'].map((size) => ({
      size,
      el: document.getElementById(`meeting-slides-size-${size}`)
    }));
    const topicEntries = this.getSlidesLibraryEntries();
    const hasTopics = topicEntries.length > 0;
    const viewportWidth = window.visualViewport?.width || window.innerWidth || 0;
    const viewportHeight = window.visualViewport?.height || window.innerHeight || 0;
    const shortSide = Math.min(viewportWidth || 0, viewportHeight || 0);
    const longSide = Math.max(viewportWidth || 0, viewportHeight || 0);
    const isPhoneViewport = shortSide > 0 && shortSide <= 767 && longSide <= 932;
    const isLandscapePhone = isPhoneViewport && viewportWidth > viewportHeight;
    const isPortraitPhone = isPhoneViewport && !isLandscapePhone;
    const isNarrowMobile = isPhoneViewport || (viewportWidth > 0 && viewportWidth <= 640);
    const compactMobile = viewportWidth > 0 && viewportWidth <= 430;
    const slideSize = this.getSlidesSize(state.slideSize);
    state.slideSize = slideSize;
    const portraitHeightBySize = { small: 28, medium: 50, full: 82 };
    const landscapeWidthBySize = { small: 34, medium: 46, full: 68 };
    const portraitHeightPct = portraitHeightBySize[slideSize] || portraitHeightBySize.medium;
    const landscapeWidthPct = landscapeWidthBySize[slideSize] || landscapeWidthBySize.medium;
    const isPortraitSmall = isPortraitPhone && slideSize === 'small';
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
    const fontScale = Math.min(1.35, Math.max(0.95, Number(state.fontScale || 1.125)));
    const panelAlpha = Math.max(0.08, opacityPct / 100);
    const chromeAlpha = Math.max(0.08, panelAlpha * 0.34);
    const borderAlpha = Math.max(0.04, panelAlpha * 0.18);
    const controlBackground = 'linear-gradient(180deg, rgba(43,30,24,0.96), rgba(24,16,13,0.94))';
    const controlBorder = 'rgba(236, 186, 104, 0.22)';
    // Keep the reading surface substantially opaque so live video does not bleed through the text.
    const noteSurfaceAlpha = isNarrowMobile
      ? Math.min(0.99, Math.max(0.93, 0.88 + (opacityPct / 100) * 0.08))
      : Math.min(0.98, Math.max(0.84, 0.76 + (opacityPct / 100) * 0.2));

    if (opacitySlider) opacitySlider.value = String(opacityPct);
    if (opacityValueEl) opacityValueEl.textContent = `${Math.round(opacityPct)}%`;
    if (fontValueEl) fontValueEl.textContent = `${Math.round(16 * fontScale)}px`;
    if (fontDecreaseBtn) fontDecreaseBtn.disabled = fontScale <= 0.95;
    if (fontIncreaseBtn) fontIncreaseBtn.disabled = fontScale >= 1.35;
    if (followLeaderCheckbox) {
      followLeaderCheckbox.checked = state.followLeader !== false;
    }
    if (followLeaderTitle) {
      followLeaderTitle.textContent = this.currentUserIsMeetingLeader ? 'Lead group slides' : 'Follow leader slides';
    }
    if (followLeaderCopy) {
      followLeaderCopy.textContent = this.currentUserIsMeetingLeader
        ? 'On by default. Your slide, next/prev, and hide state sync to everyone.'
        : 'On by default. Uncheck to navigate locally on this device.';
      followLeaderCopy.style.color = 'rgba(255, 236, 204, 0.78)';
      followLeaderCopy.style.textShadow = '0 1px 2px rgba(0,0,0,0.38)';
    }

    if (toggleBtn) {
      toggleBtn.classList.toggle('bg-amber-500/20', !!state.panelOpen);
      toggleBtn.classList.toggle('text-amber-200', !!state.panelOpen);
    }
    if (settingsToggleBtn) {
      settingsToggleBtn.style.color = state.settingsOpen ? '#22140c' : '#f4d7a2';
      settingsToggleBtn.style.background = state.settingsOpen
        ? 'linear-gradient(135deg, #f2bf61, #d98b31)'
        : 'linear-gradient(135deg, rgba(61,40,27,0.96), rgba(27,17,13,0.98))';
      settingsToggleBtn.style.borderColor = state.settingsOpen ? 'rgba(255,255,255,0.14)' : 'rgba(242, 184, 94, 0.22)';
      settingsToggleBtn.style.boxShadow = state.settingsOpen
        ? '0 6px 16px rgba(217, 139, 49, 0.24), inset 0 1px 0 rgba(255,255,255,0.28)'
        : '0 5px 14px rgba(0,0,0,0.26), inset 0 1px 0 rgba(255,255,255,0.08)';
    }
    sizeControls.forEach(({ size, el }) => {
      if (!el) return;
      const active = slideSize === size;
      el.style.color = active ? '#22140c' : '#f4d7a2';
      el.style.background = active
        ? 'linear-gradient(135deg, #f2bf61, #d98b31)'
        : 'linear-gradient(135deg, rgba(61,40,27,0.96), rgba(27,17,13,0.98))';
      el.style.borderColor = active ? 'rgba(255,255,255,0.14)' : 'rgba(242, 184, 94, 0.22)';
      el.style.boxShadow = active
        ? '0 6px 16px rgba(217, 139, 49, 0.24), inset 0 1px 0 rgba(255,255,255,0.28)'
        : '0 5px 14px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.08)';
    });
    if (settingsTitleEl) {
      settingsTitleEl.style.color = '#f8e3b4';
      settingsTitleEl.style.fontWeight = '800';
      settingsTitleEl.style.fontSize = isNarrowMobile ? '22px' : '16px';
      settingsTitleEl.style.letterSpacing = '-0.01em';
      settingsTitleEl.style.textShadow = '0 1px 14px rgba(0,0,0,0.45)';
    }
    if (counterEl) {
      counterEl.style.color = 'rgba(255,255,255,0.82)';
      counterEl.style.fontWeight = '600';
      counterEl.style.fontSize = isPortraitSmall ? '12px' : '13px';
      counterEl.style.padding = isPortraitSmall ? '0 4px' : '0 6px';
      counterEl.style.minWidth = isPortraitSmall ? '40px' : '52px';
      counterEl.style.textAlign = 'center';
    }
    const desktopWidthBySize = { small: 38, medium: 46, full: 58 };
    const desktopMaxWidthBySize = { small: 520, medium: 620, full: 760 };
    const desktopWidthPct = desktopWidthBySize[slideSize] || desktopWidthBySize.medium;
    const desktopMaxWidth = desktopMaxWidthBySize[slideSize] || desktopMaxWidthBySize.medium;
    const desktopTop = viewportHeight > 0 && viewportHeight <= 720 ? 68 : 78;
    const desktopBottom = viewportHeight > 0 && viewportHeight <= 720 ? 18 : 24;

    panel.style.background = 'transparent';
    panel.style.border = 'none';
    panel.style.backdropFilter = 'none';
    panel.style.webkitBackdropFilter = 'none';
    panel.style.position = 'fixed';
    panel.style.top = isLandscapePhone ? '66px' : (isPortraitPhone ? 'auto' : `${desktopTop}px`);
    panel.style.left = isLandscapePhone ? 'auto' : (isPortraitPhone ? '8px' : 'auto');
    panel.style.right = isPhoneViewport ? '8px' : '20px';
    panel.style.bottom = isPortraitSmall
      ? 'calc(92px + env(safe-area-inset-bottom, 0px))'
      : (isPhoneViewport ? '70px' : `${desktopBottom}px`);
    panel.style.width = isLandscapePhone
      ? `${landscapeWidthPct}vw`
      : (isPortraitPhone ? 'auto' : `min(${desktopWidthPct}vw, ${desktopMaxWidth}px)`);
    panel.style.height = isPortraitPhone ? `${portraitHeightPct}vh` : 'auto';
    panel.style.maxWidth = isLandscapePhone ? (slideSize === 'full' ? '680px' : '520px') : '';
    panel.style.maxHeight = '';
    panel.style.contain = isNarrowMobile ? 'layout paint style' : '';
    panel.style.transform = isNarrowMobile ? 'translateZ(0)' : '';
    panel.style.overflow = 'hidden';
    panel.style.display = state.panelOpen ? 'flex' : '';
    panel.style.flexDirection = 'column';
    panel.style.pointerEvents = 'auto';

    if (settingsPanel) {
      settingsPanel.classList.toggle('hidden', !state.settingsOpen);
      settingsPanel.style.position = isPhoneViewport ? 'fixed' : '';
      settingsPanel.style.top = isLandscapePhone ? '66px' : '96px';
      settingsPanel.style.left = isLandscapePhone ? 'auto' : (isPhoneViewport ? '12px' : '');
      settingsPanel.style.right = isPhoneViewport ? '12px' : '';
      settingsPanel.style.width = isLandscapePhone ? '360px' : (isPhoneViewport ? 'auto' : '');
      settingsPanel.style.maxWidth = isNarrowMobile ? '' : '440px';
      settingsPanel.style.overflowX = 'hidden';
    }

    if (settingsTitleEl) {
      settingsTitleEl.textContent = state.deck?.title || this.MEETING_SLIDES_LIBRARY[selectedDeckId]?.title || 'Meeting Slides';
    }

    const selectBaseStyles = (el) => {
      if (!el) return;
      el.style.color = '#f7ecda';
      el.style.background = controlBackground;
      el.style.border = `1px solid ${controlBorder}`;
      el.style.boxShadow = 'inset 0 1px 0 rgba(255,255,255,0.04)';
      el.style.outline = 'none';
      el.style.minHeight = isNarrowMobile ? '44px' : '42px';
      el.style.fontWeight = '600';
    };
    selectBaseStyles(topicSelect);
    selectBaseStyles(langSelect);

    if (fontDecreaseBtn) {
      fontDecreaseBtn.style.background = 'linear-gradient(180deg, rgba(65,46,36,0.96), rgba(39,27,22,0.94))';
      fontDecreaseBtn.style.color = fontScale <= 0.95 ? 'rgba(244,222,191,0.34)' : '#f6e4c7';
      fontDecreaseBtn.style.border = `1px solid ${controlBorder}`;
      fontDecreaseBtn.style.boxShadow = 'inset 0 1px 0 rgba(255,255,255,0.05)';
    }
    if (fontIncreaseBtn) {
      fontIncreaseBtn.style.background = 'linear-gradient(180deg, rgba(65,46,36,0.96), rgba(39,27,22,0.94))';
      fontIncreaseBtn.style.color = fontScale >= 1.35 ? 'rgba(244,222,191,0.34)' : '#f6e4c7';
      fontIncreaseBtn.style.border = `1px solid ${controlBorder}`;
      fontIncreaseBtn.style.boxShadow = 'inset 0 1px 0 rgba(255,255,255,0.05)';
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
    const slideBlocks = this.buildMeetingSlideContentBlocks(slide);
    const explicitEyebrow = String(slide.eyebrow || slide.sectionLabel || slide.overline || '').trim();
    const titleRaw = String(slide.title || '').trim() || 'Slide';
    const subtitleRaw = String(slide.subtitle || '').trim();
    const titleIsMarker = this.isMeetingSlideKeyPointMarker(titleRaw);
    const subtitleIsSectionMarker = this.isMeetingSlideKeyPointMarker(subtitleRaw) || this.isMeetingSlideSectionHeading(subtitleRaw);
    const eyebrowText = explicitEyebrow || (titleIsMarker && subtitleRaw ? titleRaw : (subtitleIsSectionMarker ? subtitleRaw : ''));
    const displayTitle = titleIsMarker && subtitleRaw ? subtitleRaw : titleRaw;
    const displaySubtitle = !eyebrowText && subtitleRaw ? subtitleRaw : '';
    const isKeyPointSlide = this.isMeetingSlideKeyPointMarker(eyebrowText);
    const titleFontSize = isPortraitSmall
      ? '16px'
      : (isKeyPointSlide
      ? this.scaleMeetingSlideClamp(31, 6.6, 46, { fontScale })
      : (slide.type === 'title' ? this.scaleMeetingSlideClamp(25, 5.8, 38, { fontScale }) : this.scaleMeetingSlideClamp(24, 5.9, 37, { fontScale })));
    const kickerHtml = !isPortraitSmall && slide.kicker
      ? `<div style="display:inline-flex; align-items:center; gap:${this.scaleMeetingSlidePx('6px', { fontScale })}; font-size:${this.scaleMeetingSlidePx('11px', { fontScale })}; line-height:1.25; letter-spacing:0.16em; text-transform:uppercase; color:#8a3b13; background:rgba(246, 225, 189, 0.9); border:1px solid rgba(206,157,87,0.45); border-radius:999px; padding:${this.scaleMeetingSlidePx('5px', { fontScale })} ${this.scaleMeetingSlidePx('10px', { fontScale })}; font-weight:800; margin-bottom:${this.scaleMeetingSlidePx('10px', { fontScale })};">
          <span style="display:inline-block; width:${this.scaleMeetingSlidePx('7px', { fontScale })}; height:${this.scaleMeetingSlidePx('7px', { fontScale })}; border-radius:50%; background:#d97706;"></span>${this.escapeHtml(slide.kicker)}
        </div>`
      : '';
    const eyebrowHtml = !isPortraitSmall && eyebrowText
      ? `<div style="display:inline-flex; align-items:center; gap:${this.scaleMeetingSlidePx('6px', { fontScale })}; max-width:100%; border-radius:999px; background:rgba(129, 66, 23, 0.08); color:#8c4317; border:1px solid rgba(209, 146, 76, 0.24); padding:${this.scaleMeetingSlidePx('6px', { fontScale })} ${this.scaleMeetingSlidePx('11px', { fontScale })}; font-size:${this.scaleMeetingSlidePx('11px', { fontScale })}; line-height:1.2; letter-spacing:0.14em; text-transform:uppercase; font-weight:900; margin-bottom:${this.scaleMeetingSlidePx('12px', { fontScale })};">${this.escapeHtml(eyebrowText)}</div>`
      : '';
    const titleHtml = `<div style="color:#141414; font-size:${titleFontSize}; line-height:${isPortraitSmall ? '1.12' : (isKeyPointSlide ? '0.95' : '1.02')}; font-weight:900; letter-spacing:${isKeyPointSlide ? '-0.03em' : '-0.015em'}; margin-bottom:${isPortraitSmall ? '6px' : (displaySubtitle ? '10px' : '16px')}; text-wrap:balance;">${this.escapeHtml(displayTitle)}</div>`;
    const subtitleHtml = displaySubtitle && !isPortraitSmall
      ? `<div style="color:#5a4737; font-size:${this.scaleMeetingSlidePx(slide.type === 'title' ? '18px' : '14px', { fontScale })}; line-height:1.45; margin-bottom:${this.scaleMeetingSlidePx('15px', { fontScale })}; font-weight:${slide.type === 'title' ? '700' : '600'};">${this.escapeHtml(displaySubtitle)}</div>`
      : '';
    const structuredContentHtml = this.renderMeetingSlideContentBlocks(slideBlocks, { fontScale, compactMobile });
    const bodyHtml = `
      <div style="
        position:relative;
        width:100%;
        box-sizing:border-box;
        overflow:hidden;
        border-radius:${this.scaleMeetingSlidePx(isPortraitSmall ? '12px' : (compactMobile ? '16px' : '18px'), { fontScale })};
        border:1px solid rgba(255,255,255,0.55);
        background:
          linear-gradient(165deg, rgba(255,255,255,${noteSurfaceAlpha.toFixed(2)}), rgba(249,246,238,${Math.max(0.86, noteSurfaceAlpha - 0.04).toFixed(2)})),
          radial-gradient(circle at top right, rgba(245,158,11,0.1), transparent 36%),
          radial-gradient(circle at bottom left, rgba(220,38,38,0.05), transparent 42%);
        box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        padding:${this.scaleMeetingSlidePx(isPortraitSmall ? '10px' : (compactMobile ? '16px' : '18px'), { fontScale })} ${this.scaleMeetingSlidePx(isPortraitSmall ? '12px' : (compactMobile ? '16px' : '18px'), { fontScale })} ${this.scaleMeetingSlidePx(isPortraitSmall ? '10px' : (compactMobile ? '14px' : '16px'), { fontScale })} ${this.scaleMeetingSlidePx(isPortraitSmall ? '12px' : (compactMobile ? '16px' : '18px'), { fontScale })};">
        <div style="position:absolute; left:0; top:${this.scaleMeetingSlidePx('14px', { fontScale })}; bottom:${this.scaleMeetingSlidePx('14px', { fontScale })}; width:${this.scaleMeetingSlidePx('5px', { fontScale })}; border-radius:${this.scaleMeetingSlidePx('5px', { fontScale })}; background:linear-gradient(180deg, #f59e0b, #dc2626);"></div>
        <div style="position:absolute; right:${compactMobile ? this.scaleMeetingSlidePx('-10px', { fontScale }) : this.scaleMeetingSlidePx('-18px', { fontScale })}; bottom:${compactMobile ? this.scaleMeetingSlidePx('-10px', { fontScale }) : this.scaleMeetingSlidePx('-18px', { fontScale })}; width:${compactMobile ? this.scaleMeetingSlidePx('88px', { fontScale }) : this.scaleMeetingSlidePx('132px', { fontScale })}; height:${compactMobile ? this.scaleMeetingSlidePx('88px', { fontScale }) : this.scaleMeetingSlidePx('132px', { fontScale })}; border-radius:50%; background:radial-gradient(circle, rgba(245,158,11,${compactMobile ? '0.08' : '0.14'}), rgba(245,158,11,0.04) 58%, transparent 74%); filter:blur(1px); pointer-events:none;"></div>
        <div style="position:relative; z-index:1; padding-left:${this.scaleMeetingSlidePx(isPortraitSmall ? '8px' : '12px', { fontScale })};">
          ${kickerHtml}
          ${eyebrowHtml}
          ${titleHtml}
          ${subtitleHtml}
          <div>${structuredContentHtml}</div>
        </div>
      </div>
    `;

    if (body) body.innerHTML = bodyHtml;
    if (body) {
      const firstCard = body.firstElementChild;
      if (firstCard) {
        firstCard.style.maxHeight = '';
        firstCard.style.overflow = 'visible';
      }
    }
    if (counterEl) counterEl.textContent = `${slideIndex + 1} / ${slides.length}`;
    const followerNavigationLocked = !this.currentUserIsMeetingLeader && state.followLeader !== false;
    if (prevBtn) prevBtn.textContent = isPortraitSmall ? '←' : '← Prev';
    if (nextBtn) nextBtn.textContent = isPortraitSmall ? '→' : 'Next →';
    if (prevBtn) prevBtn.disabled = followerNavigationLocked || slideIndex <= 0;
    if (nextBtn) nextBtn.disabled = followerNavigationLocked || slideIndex >= slides.length - 1;
    if (prevBtn) prevBtn.classList.toggle('opacity-40', followerNavigationLocked || slideIndex <= 0);
    if (nextBtn) nextBtn.classList.toggle('opacity-40', followerNavigationLocked || slideIndex >= slides.length - 1);
    if (body) {
      body.style.background = 'transparent';
      body.style.borderRadius = '0';
      body.style.overflowY = 'auto';
      body.style.overflowX = 'hidden';
      body.style.overscrollBehavior = 'contain';
      body.style.webkitOverflowScrolling = 'touch';
      body.style.scrollbarGutter = 'stable';
      body.style.touchAction = 'pan-y';
      body.style.pointerEvents = 'auto';
      body.style.padding = isPortraitSmall
        ? '4px 0 5px 0'
        : (isNarrowMobile ? `${this.scaleMeetingSlidePx('10px', { fontScale })} 0 ${this.scaleMeetingSlidePx('16px', { fontScale })} 0` : `${this.scaleMeetingSlidePx('12px', { fontScale })} 0 ${this.scaleMeetingSlidePx('18px', { fontScale })} 0`);
      body.style.flex = '1 1 auto';
      body.style.maxHeight = '';
      body.style.minHeight = '0';
    }
    if (settingsCard) {
      settingsCard.style.background = 'linear-gradient(180deg, rgba(20,14,12,0.9), rgba(28,18,14,0.88))';
      settingsCard.style.borderColor = `rgba(255,255,255,${Math.min(0.16, borderAlpha + 0.04).toFixed(2)})`;
      settingsCard.style.backdropFilter = `blur(${isNarrowMobile ? 14 : 12}px)`;
      settingsCard.style.webkitBackdropFilter = `blur(${isNarrowMobile ? 14 : 12}px)`;
      settingsCard.style.boxShadow = '0 18px 34px rgba(0,0,0,0.34), inset 0 1px 0 rgba(255,255,255,0.04)';
    }
    if (bottombar) {
      bottombar.style.flexShrink = '0';
      bottombar.style.borderRadius = isPortraitSmall ? '12px' : '';
      bottombar.style.marginTop = isPortraitSmall ? '4px' : '';
      bottombar.style.padding = isPortraitSmall ? '6px 9px' : '';
      bottombar.style.background = 'linear-gradient(180deg, rgba(28,20,16,0.94), rgba(43,30,24,0.9))';
      bottombar.style.borderColor = 'rgba(236, 186, 104, 0.16)';
      bottombar.style.backdropFilter = `blur(${isNarrowMobile ? 10 : 8}px)`;
      bottombar.style.webkitBackdropFilter = `blur(${isNarrowMobile ? 10 : 8}px)`;
      bottombar.style.boxShadow = '0 14px 26px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.04)';
    }
    if (prevBtn) {
      const prevDisabled = followerNavigationLocked || slideIndex <= 0;
      prevBtn.style.background = prevDisabled
        ? 'linear-gradient(180deg, rgba(245,198,116,0.42), rgba(132,82,34,0.38))'
        : 'linear-gradient(180deg, rgba(247,192,92,0.96), rgba(219,140,48,0.94))';
      prevBtn.style.color = prevDisabled ? 'rgba(255,239,211,0.76)' : '#2a170c';
      prevBtn.style.border = '1px solid rgba(236, 186, 104, 0.22)';
      prevBtn.style.boxShadow = prevDisabled
        ? 'inset 0 1px 0 rgba(255,255,255,0.03)'
        : '0 10px 18px rgba(217, 139, 49, 0.2), inset 0 1px 0 rgba(255,255,255,0.2)';
      prevBtn.style.padding = isPortraitSmall ? '6px 10px' : '';
      prevBtn.style.fontSize = isPortraitSmall ? '12px' : '';
      prevBtn.style.minWidth = isPortraitSmall ? '38px' : '';
    }
    if (nextBtn) {
      const nextDisabled = followerNavigationLocked || slideIndex >= slides.length - 1;
      nextBtn.style.background = nextDisabled
        ? 'linear-gradient(180deg, rgba(245,198,116,0.42), rgba(132,82,34,0.38))'
        : 'linear-gradient(180deg, rgba(247,192,92,0.96), rgba(219,140,48,0.94))';
      nextBtn.style.color = nextDisabled ? 'rgba(255,239,211,0.76)' : '#2a170c';
      nextBtn.style.border = '1px solid rgba(236, 186, 104, 0.22)';
      nextBtn.style.boxShadow = nextDisabled
        ? 'inset 0 1px 0 rgba(255,255,255,0.03)'
        : '0 10px 18px rgba(217, 139, 49, 0.2), inset 0 1px 0 rgba(255,255,255,0.2)';
      nextBtn.style.padding = isPortraitSmall ? '6px 10px' : '';
      nextBtn.style.fontSize = isPortraitSmall ? '12px' : '';
      nextBtn.style.minWidth = isPortraitSmall ? '38px' : '';
    }
    if (hideBtn) {
      hideBtn.style.background = 'linear-gradient(180deg, rgba(247,192,92,0.96), rgba(219,140,48,0.94))';
      hideBtn.style.color = '#2a170c';
      hideBtn.style.border = '1px solid rgba(236, 186, 104, 0.22)';
      hideBtn.style.boxShadow = '0 10px 18px rgba(217, 139, 49, 0.2), inset 0 1px 0 rgba(255,255,255,0.2)';
      hideBtn.style.padding = isPortraitSmall ? '6px 12px' : '';
      hideBtn.style.fontSize = isPortraitSmall ? '12px' : '';
    }

  },
  
  /**
   * Hide meeting modal
   */
  hideMeetingModal() {
    const modal = document.getElementById('meeting-modal');
    if (modal) modal.remove();
    this.unsubscribeSlidesSync();
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

    this.teardownMobileTileLayoutRefresh();

    if (this.connectTimeoutId) {
      clearTimeout(this.connectTimeoutId);
      this.connectTimeoutId = null;
    }
    this.joinedConference = false;
    
    this.hideMeetingModal();
    this.currentGroupId = null;
    this.currentMeetingId = null;
    this.currentUserIsMeetingLeader = false;
    this.lastSlidesSyncVersion = 0;
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
      this.subscribeSlidesSync();
      if (this.currentUserIsMeetingLeader) {
        this.publishSlidesSync();
      }
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
