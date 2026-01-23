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
  
  // JaaS (Jitsi as a Service) configuration
  JAAS_APP_ID: 'vpaas-magic-cookie-8beaeb1f813a4ca9959c8927f131134d',
  JITSI_DOMAIN: '8x8.vc',
  
  // Meeting window (minutes before/after scheduled time)
  MEETING_WINDOW_BEFORE: 15,  // Can join 15 min before
  MEETING_WINDOW_AFTER: 120,  // Meeting available for 2 hours
  
  /**
   * Initialize - load Jitsi API script
   */
  async init() {
    // Load Jitsi external API if not already loaded
    if (!window.JitsiMeetExternalAPI) {
      await this.loadJitsiScript();
    }
    console.log('[GroupMeeting] Initialized');
  },
  
  /**
   * Load Jitsi Meet External API script (JaaS version)
   */
  loadJitsiScript() {
    return new Promise((resolve, reject) => {
      if (window.JitsiMeetExternalAPI) {
        resolve();
        return;
      }
      
      const script = document.createElement('script');
      // Use JaaS script URL with App ID
      script.src = `https://8x8.vc/${this.JAAS_APP_ID}/external_api.js`;
      script.async = true;
      script.onload = () => {
        console.log('[GroupMeeting] JaaS API loaded');
        resolve();
      };
      script.onerror = () => {
        console.error('[GroupMeeting] Failed to load JaaS API');
        reject(new Error('Failed to load JaaS API'));
      };
      document.head.appendChild(script);
    });
  },
  
  /**
   * Generate unique room name for group (JaaS format)
   * Format: {AppID}/{RoomName}
   */
  generateRoomName(groupId, groupName) {
    // Clean group name for URL
    const cleanName = groupName
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .replace(/\s+/g, '')
      .substring(0, 15);
    
    // Use group ID for uniqueness (no random suffix needed for JaaS)
    const shortId = groupId.substring(groupId.length - 8);
    
    // JaaS room format: AppID/RoomName
    return `${this.JAAS_APP_ID}/GoMission${cleanName}${shortId}`;
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
    if (!window.JitsiMeetExternalAPI) {
      await this.init();
    }
    
    // Create meeting modal
    this.showMeetingModal();
    
    const roomName = this.generateRoomName(groupId, groupName);
    this.currentGroupId = groupId;
    this.joinedAt = new Date();
    
    console.log('[GroupMeeting] Joining room:', roomName);
    
    // Create Jitsi instance
    const options = {
      roomName: roomName,
      width: '100%',
      height: '100%',
      parentNode: document.getElementById('jitsi-container'),
      userInfo: {
        displayName: userName || 'Guest',
        email: userEmail || ''
      },
      configOverwrite: {
        // Disable authentication requirements
        disableModeratorIndicator: true,
        disableInviteFunctions: true,
        disableDeepLinking: true,
        prejoinPageEnabled: false,
        startWithAudioMuted: false,
        startWithVideoMuted: false,
        // Disable lobby - allow direct join
        enableLobby: false,
        lobbyModeEnabled: false,
        // Allow anyone to be moderator
        enableUserRolesBasedOnToken: false,
        // Branding
        brandingRoomAlias: `Go Mission - ${groupName}`,
        // Recording (disable for free tier)
        fileRecordingsEnabled: false,
        liveStreamingEnabled: false,
        // Disable requiring login
        enableInsecureRoomNameWarning: false,
        requireDisplayName: false,
      },
      interfaceConfigOverwrite: {
        // Simplified toolbar
        TOOLBAR_BUTTONS: [
          'microphone', 'camera', 'desktop', 'fullscreen',
          'chat', 'raisehand', 'participants-pane',
          'tileview', 'hangup'
        ],
        // Branding
        SHOW_JITSI_WATERMARK: false,
        SHOW_WATERMARK_FOR_GUESTS: false,
        SHOW_BRAND_WATERMARK: false,
        BRAND_WATERMARK_LINK: '',
        SHOW_POWERED_BY: false,
        // UI
        DISABLE_JOIN_LEAVE_NOTIFICATIONS: false,
        MOBILE_APP_PROMO: false,
        HIDE_INVITE_MORE_HEADER: true,
        // Tile view by default for groups
        TILE_VIEW_MAX_COLUMNS: 3,
      }
    };
    
    try {
      this.api = new JitsiMeetExternalAPI(this.JITSI_DOMAIN, options);
      
      // Event listeners
      this.api.addListener('videoConferenceJoined', (data) => {
        console.log('[GroupMeeting] Joined conference:', data);
        this.onJoined(groupId, userName);
      });
      
      this.api.addListener('videoConferenceLeft', (data) => {
        console.log('[GroupMeeting] Left conference:', data);
        this.onLeft(groupId);
      });
      
      this.api.addListener('participantJoined', (data) => {
        console.log('[GroupMeeting] Participant joined:', data);
        this.participants.push(data);
      });
      
      this.api.addListener('participantLeft', (data) => {
        console.log('[GroupMeeting] Participant left:', data);
        this.participants = this.participants.filter(p => p.id !== data.id);
      });
      
      this.api.addListener('readyToClose', () => {
        console.log('[GroupMeeting] Ready to close');
        this.leaveMeeting();
      });
      
    } catch (error) {
      console.error('[GroupMeeting] Error creating Jitsi instance:', error);
      this.hideMeetingModal();
      alert('Failed to start meeting. Please try again.');
    }
  },
  
  /**
   * Show full-screen meeting modal
   */
  showMeetingModal() {
    // Remove existing modal if any
    const existing = document.getElementById('meeting-modal');
    if (existing) existing.remove();
    
    const modal = document.createElement('div');
    modal.id = 'meeting-modal';
    modal.className = 'fixed inset-0 z-[200] bg-black';
    modal.innerHTML = `
      <!-- Header -->
      <div class="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/80 to-transparent p-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <img src="/icons/icon-192.png" class="w-8 h-8 rounded-lg" alt="Go Mission">
            <span class="text-white font-bold">Go Mission Meeting</span>
          </div>
          <button onclick="GroupMeeting.leaveMeeting()" 
                  class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-bold transition-colors">
            Leave Meeting
          </button>
        </div>
      </div>
      
      <!-- Jitsi Container -->
      <div id="jitsi-container" class="w-full h-full"></div>
    `;
    
    document.body.appendChild(modal);
    
    // Prevent body scroll
    document.body.style.overflow = 'hidden';
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
            <button onclick="GroupMeeting.showScheduleModal('${group.id}')" 
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
          
          <button onclick="GroupMeeting.joinMeeting('${group.id}', '${group.name.replace(/'/g, "\\'")}', '${(window.currentUser?.displayName || 'Guest').replace(/'/g, "\\'")}', '${window.currentUser?.email || ''}', ${isLeader})"
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
          <button onclick="GroupMeeting.saveSchedule('${groupId}')"
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
