/**
 * Go Mission - Training Module (Level 2: Disciple-Maker Journey)
 * 
 * Features:
 * - View training sessions and days
 * - Progressive unlocking of days
 * - Bilingual support (EN/TL based on global language setting)
 * - Silent tracking of progress
 * - Conversation with God journaling
 */

const Training = {
  // State
  currentLevel: 2,
  currentSession: null,
  currentDay: null,
  sessions: [],
  userProgress: {},
  WEDNESDAY_EQUIPPING_ROOM_ID: 'wednesday-equipping-global',
  WEDNESDAY_EQUIPPING_GROUP_NAME: 'Wednesday Equipping',
  
  /**
   * Initialize training module
   */
  async init() {
    console.log('[Training] Initializing...');
    
    if (!window.currentUser) {
      console.log('[Training] No user logged in');
      return;
    }
    
    // Load user progress
    await this.loadUserProgress();
    
    // Load available sessions
    await this.loadSessions();
    
    // Listen for language changes
    this.setupLanguageListener();
    
    console.log('[Training] Ready');
  },
  
  /**
   * Setup listener for language changes
   */
  setupLanguageListener() {
    // Remove existing listener if any
    if (this._languageHandler) {
      document.removeEventListener('languageChanged', this._languageHandler);
    }
    
    // Create and store handler
    this._languageHandler = async (e) => {
      console.log('[Training] Language changed to:', e.detail.lang);
      // Reload sessions with new language
      await this.loadSessions();
      // Re-render the UI
      this.render();
    };
    
    // Add listener
    document.addEventListener('languageChanged', this._languageHandler);
  },
  
  /**
   * Load user's training progress from Firestore
   */
  async loadUserProgress() {
    if (!window.currentUser || !window.db) return;
    
    try {
      const progressRef = window.doc(window.db, 'goMission_trainingProgress', window.currentUser.uid);
      const progressDoc = await window.getDoc(progressRef);
      
      if (progressDoc.exists()) {
        this.userProgress = progressDoc.data();
      } else {
        // Initialize progress
        this.userProgress = {
          oderId: window.currentUser.uid,
          level: 2,
          completedDays: [],
          currentSession: 1,
          currentDay: 1,
          startedAt: new Date().toISOString()
        };
      }
    } catch (error) {
      console.error('[Training] Error loading progress:', error);
      this.userProgress = { completedDays: [], currentSession: 1, currentDay: 1 };
    }
  },
  
  /**
   * Load available training sessions from Firestore
   */
  async loadSessions() {
    if (!window.db) return;
    
    try {
      // Get language from i18n module or global variable
      const lang = (typeof i18n !== 'undefined' && i18n.currentLang) || window.currentLang || 'en';
      console.log('[Training] Loading sessions for language:', lang);
      
      const contentRef = window.collection(window.db, 'goMission_trainingContent');
      const q = window.query(
        contentRef,
        window.where('level', '==', this.currentLevel),
        window.where('language', '==', lang)
      );
      
      const snapshot = await window.getDocs(q);
      
      // Group by session
      const sessionsMap = {};
      snapshot.forEach(doc => {
        const data = { id: doc.id, ...doc.data() };
        const sessionNum = data.sessionNumber;
        
        if (!sessionsMap[sessionNum]) {
          sessionsMap[sessionNum] = {
            sessionNumber: sessionNum,
            sessionTitle: data.sessionTitle,
            days: []
          };
        }
        sessionsMap[sessionNum].days.push(data);
      });
      
      // Sort sessions and days
      this.sessions = Object.values(sessionsMap).sort((a, b) => a.sessionNumber - b.sessionNumber);
      this.sessions.forEach(session => {
        session.days.sort((a, b) => a.dayNumber - b.dayNumber);
      });
      
      console.log('[Training] Loaded sessions:', this.sessions.length, 'for lang:', lang);
      
    } catch (error) {
      console.error('[Training] Error loading sessions:', error);
    }
  },
  
  /**
   * Check if a day is unlocked
   */
  isDayUnlocked(sessionNumber, dayNumber) {
    // Day 1 of Session 1 is always unlocked
    if (sessionNumber === 1 && dayNumber === 1) return true;
    
    // Check if previous day is completed
    const prevDayKey = dayNumber > 1 
      ? `${sessionNumber}-${dayNumber - 1}`
      : `${sessionNumber - 1}-6`; // Last day of previous session
    
    return this.userProgress.completedDays?.includes(prevDayKey) || false;
  },
  
  /**
   * Check if a day is completed
   */
  isDayCompleted(sessionNumber, dayNumber) {
    const dayKey = `${sessionNumber}-${dayNumber}`;
    return this.userProgress.completedDays?.includes(dayKey) || false;
  },
  
  /**
   * Mark a day as completed
   */
  async markDayCompleted(sessionNumber, dayNumber) {
    if (!window.currentUser || !window.db) return;
    
    const dayKey = `${sessionNumber}-${dayNumber}`;
    
    if (!this.userProgress.completedDays) {
      this.userProgress.completedDays = [];
    }
    
    if (!this.userProgress.completedDays.includes(dayKey)) {
      this.userProgress.completedDays.push(dayKey);
      
      // Save to Firestore
      try {
        const progressRef = window.doc(window.db, 'goMission_trainingProgress', window.currentUser.uid);
        await window.setDoc(progressRef, {
          ...this.userProgress,
          updatedAt: new Date().toISOString()
        }, { merge: true });
        
        console.log('[Training] Marked day completed:', dayKey);
      } catch (error) {
        console.error('[Training] Error saving progress:', error);
      }
    }
  },
  
  /**
   * Save user's response to a reflection question
   */
  async saveResponse(sessionNumber, dayNumber, questionType, response) {
    if (!window.currentUser || !window.db) return;
    
    try {
      const responseId = `${window.currentUser.uid}_${sessionNumber}_${dayNumber}_${questionType}`;
      const responseRef = window.doc(window.db, 'goMission_trainingResponses', responseId);
      
      await window.setDoc(responseRef, {
        oderId: window.currentUser.uid,
        userName: window.currentUser.displayName,
        sessionNumber,
        dayNumber,
        questionType, // 'obedience' or 'mission'
        response,
        language: window.currentLang || 'en',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }, { merge: true });
      
      console.log('[Training] Saved response for', questionType);
      
    } catch (error) {
      console.error('[Training] Error saving response:', error);
    }
  },
  
  /**
   * Load user's previous response
   */
  async loadResponse(sessionNumber, dayNumber, questionType) {
    if (!window.currentUser || !window.db) return null;
    
    try {
      const responseId = `${window.currentUser.uid}_${sessionNumber}_${dayNumber}_${questionType}`;
      const responseRef = window.doc(window.db, 'goMission_trainingResponses', responseId);
      const responseDoc = await window.getDoc(responseRef);
      
      if (responseDoc.exists()) {
        return responseDoc.data().response;
      }
    } catch (error) {
      console.error('[Training] Error loading response:', error);
    }
    return null;
  },
  
  /**
   * Render the training section in the app
   */
  render() {
    const container = document.getElementById('trainingContent');
    if (!container) return;
    
    const lang = window.currentLang || 'en';
    const labels = this.getLabels(lang);
    
    if (this.sessions.length === 0) {
      container.innerHTML = `
        <div class="text-center py-8">
          <p class="text-slate-400">${labels.noContent}</p>
        </div>
      `;
      return;
    }
    
    let html = '';
    
    // Render each session
    this.sessions.forEach(session => {
      const completedDays = session.days.filter(d => this.isDayCompleted(session.sessionNumber, d.dayNumber)).length;
      const totalDays = session.days.length;
      const progress = Math.round((completedDays / totalDays) * 100);
      
      html += `
        <div class="training-session mb-6">
          <div class="session-header bg-gradient-to-r from-amber-500/20 to-transparent p-4 rounded-xl mb-3">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-amber-400 font-bold text-lg">${labels.session} ${session.sessionNumber}</h3>
                <p class="text-white font-medium">${session.sessionTitle}</p>
              </div>
              <div class="text-right">
                <div class="text-2xl font-bold text-amber-400">${completedDays}/${totalDays}</div>
                <div class="text-xs text-slate-400">${labels.daysCompleted}</div>
              </div>
            </div>
            <div class="mt-3 h-2 bg-black/30 rounded-full overflow-hidden">
              <div class="h-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-500" style="width: ${progress}%"></div>
            </div>
          </div>
          
          <div class="days-grid grid gap-2">
            ${session.days.map(day => this.renderDayCard(session, day, labels)).join('')}
          </div>
          
          <!-- Day 7: Group Processing -->
          <div class="mt-3">
            ${this.renderDay7Card(session, labels)}
          </div>
        </div>
      `;
    });
    
    container.innerHTML = html;
  },
  
  /**
   * Render a single day card
   */
  renderDayCard(session, day, labels) {
    const isUnlocked = this.isDayUnlocked(session.sessionNumber, day.dayNumber);
    const isCompleted = this.isDayCompleted(session.sessionNumber, day.dayNumber);
    
    const statusIcon = isCompleted ? '✅' : (isUnlocked ? '📖' : '🔒');
    const statusClass = isCompleted ? 'border-green-500/30 bg-green-500/5' : 
                       (isUnlocked ? 'border-amber-500/30 bg-amber-500/5 cursor-pointer hover:bg-amber-500/10' : 
                       'border-slate-700 bg-slate-800/30 opacity-60');
    
    const clickHandler = isUnlocked ? `onclick="Training.openDay(${session.sessionNumber}, ${day.dayNumber})"` : '';
    
    return `
      <div class="day-card p-3 rounded-xl border ${statusClass} transition-all" ${clickHandler}>
        <div class="flex items-center gap-3">
          <div class="text-2xl">${statusIcon}</div>
          <div class="flex-1">
            <div class="text-xs text-slate-400">${labels.day} ${day.dayNumber}</div>
            <div class="text-sm font-medium text-white">${day.dayTitle}</div>
            <div class="text-xs text-amber-400/70 mt-1">${day.scriptureReference}</div>
          </div>
          ${isUnlocked && !isCompleted ? '<div class="text-amber-400">→</div>' : ''}
        </div>
      </div>
    `;
  },
  
  /**
   * Render Day 7 (Group Processing) card
   */
  renderDay7Card(session, labels) {
    const allDaysCompleted = session.days.every(d => this.isDayCompleted(session.sessionNumber, d.dayNumber));
    
    const statusClass = allDaysCompleted 
      ? 'border-purple-500/30 bg-purple-500/10 cursor-pointer hover:bg-purple-500/20'
      : 'border-slate-700 bg-slate-800/30 opacity-60';
    
    const clickHandler = allDaysCompleted ? `onclick="Training.openGroupProcessing(${session.sessionNumber})"` : '';
    
    return `
      <div class="day7-card p-4 rounded-xl border-2 border-dashed ${statusClass} transition-all" ${clickHandler}>
        <div class="flex items-center gap-3">
          <div class="text-3xl">${allDaysCompleted ? '🎯' : '🔒'}</div>
          <div class="flex-1">
            <div class="text-xs text-purple-400">${labels.day} 7 • ${labels.wednesday}</div>
            <div class="text-lg font-bold text-white">${labels.groupProcessing}</div>
            <div class="text-xs text-slate-400 mt-1">${labels.groupProcessingDesc}</div>
          </div>
          ${allDaysCompleted ? '<div class="text-purple-400 text-xl">→</div>' : ''}
        </div>
      </div>
    `;
  },
  
  /**
   * Get theme-aware classes
   */
  getThemeClasses() {
    const isLight = document.body.classList.contains('light-mode');
    return {
      // Modal backgrounds
      modalBg: isLight ? 'bg-[#fcfaf2]' : 'bg-black/95',
      cardBg: isLight ? 'bg-white' : 'bg-black/40',
      cardBgSubtle: isLight ? 'bg-gray-50' : 'bg-black/20',
      
      // Text colors
      textPrimary: isLight ? 'text-[#2a0505]' : 'text-white',
      textSecondary: isLight ? 'text-gray-700' : 'text-slate-200',
      textMuted: isLight ? 'text-gray-500' : 'text-slate-400',
      textMutedAlt: isLight ? 'text-gray-600' : 'text-slate-300',
      
      // Input styling
      inputBg: isLight ? 'bg-gray-100' : 'bg-black/40',
      inputText: isLight ? 'text-[#2a0505]' : 'text-white',
      inputPlaceholder: isLight ? 'placeholder-gray-400' : 'placeholder-slate-500',
      
      // Border colors
      borderSubtle: isLight ? 'border-gray-200' : 'border-white/10',
      
      // Accent backgrounds (keeping colored but adjusting opacity)
      storyBg: isLight ? 'bg-amber-50 border-amber-200' : 'bg-gradient-to-br from-amber-500/10 to-transparent border-amber-500/20',
      scriptureBg: isLight ? 'bg-amber-50/50' : 'bg-black/40',
      conversationBg: isLight ? 'bg-green-50 border-green-200' : 'bg-gradient-to-br from-green-500/10 to-transparent border-green-500/20',
      missionBg: isLight ? 'bg-blue-50 border-blue-200' : 'bg-gradient-to-br from-blue-500/10 to-transparent border-blue-500/20',
      followThroughBg: isLight ? 'bg-purple-50 border-purple-200' : 'bg-purple-500/10 border-purple-500/30',
      
      // Scripture quote
      scriptureBorder: isLight ? 'border-amber-400' : 'border-amber-500/50',
      scriptureText: isLight ? 'text-[#2a0505]' : 'text-white',
    };
  },

  /**
   * Open a training day
   */
  async openDay(sessionNumber, dayNumber) {
    const session = this.sessions.find(s => s.sessionNumber === sessionNumber);
    if (!session) return;
    
    const day = session.days.find(d => d.dayNumber === dayNumber);
    if (!day) return;
    
    this.currentSession = sessionNumber;
    this.currentDay = dayNumber;
    
    // Load previous responses
    const obedienceResponse = await this.loadResponse(sessionNumber, dayNumber, 'obedience');
    const missionResponse = await this.loadResponse(sessionNumber, dayNumber, 'mission');
    
    const lang = window.currentLang || 'en';
    const labels = this.getLabels(lang);
    const t = this.getThemeClasses();
    
    // Show modal
    const modal = document.getElementById('trainingDayModal');
    if (!modal) {
      this.createDayModal();
    }
    
    document.getElementById('trainingDayModal').innerHTML = `
      <div class="fixed inset-0 ${t.modalBg} z-50 overflow-y-auto">
        <div class="min-h-screen p-4 max-w-2xl mx-auto">
          <!-- Header -->
          <div class="flex items-center justify-between mb-6">
            <button onclick="Training.closeDay()" class="${t.textMuted} hover:${t.textPrimary} p-2">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
              </svg>
            </button>
            <div class="text-center">
              <div class="text-xs text-amber-500 font-medium">${labels.session} ${sessionNumber} • ${labels.day} ${dayNumber}</div>
              <div class="${t.textPrimary} font-bold">${day.dayTitle}</div>
            </div>
            <div class="w-10"></div>
          </div>
          
          <!-- Follow Through (if exists) -->
          ${day.followThrough ? `
            <div class="${t.followThroughBg} border rounded-xl p-4 mb-4">
              <div class="text-xs text-purple-500 font-bold mb-2">📋 ${labels.followThrough}</div>
              <p class="${t.textMutedAlt} text-sm">${day.followThrough}</p>
            </div>
          ` : ''}
          
          <!-- Story/Illustration -->
          <div class="${t.storyBg} border rounded-xl p-4 mb-4">
            <div class="text-xs text-amber-500 font-bold mb-2">🎯 ${labels.todayStory}</div>
            <p class="${t.textSecondary} text-sm leading-relaxed">${day.storyIllustration}</p>
          </div>
          
          <!-- Scripture -->
          <div class="${t.scriptureBg} rounded-xl p-4 mb-4">
            <div class="text-xs text-amber-500 font-bold mb-2">📜 ${labels.scripture}</div>
            <div class="text-amber-500 font-bold mb-2">${day.scriptureReference}</div>
            <p class="${t.scriptureText} italic text-lg leading-relaxed border-l-4 ${t.scriptureBorder} pl-4">"${day.scriptureText}"</p>
          </div>
          
          <!-- Explanation -->
          <div class="${t.cardBgSubtle} rounded-xl p-4 mb-4">
            <div class="text-xs text-amber-500 font-bold mb-2">💡 ${labels.understanding}</div>
            <p class="${t.textMutedAlt} text-sm leading-relaxed">${day.scriptureExplanation}</p>
          </div>
          
          <!-- Conversation with God -->
          <div class="${t.conversationBg} border rounded-xl p-4 mb-4">
            <div class="text-xs text-green-600 font-bold mb-2">🙏 ${labels.conversationWithGod}</div>
            <p class="${t.textSecondary} text-sm mb-4">${day.obedienceQuestion}</p>
            
            <textarea 
              id="obedienceResponse" 
              class="w-full ${t.inputBg} border border-green-300 rounded-lg p-3 ${t.inputText} text-sm resize-none focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 ${t.inputPlaceholder}"
              rows="4"
              placeholder="${labels.writeResponse}"
            >${obedienceResponse || ''}</textarea>
          </div>
          
          <!-- Mission -->
          <div class="${t.missionBg} border rounded-xl p-4 mb-4">
            <div class="text-xs text-blue-600 font-bold mb-2">🚀 ${labels.mission}</div>
            <p class="${t.textSecondary} text-sm mb-4">${day.missionQuestion}</p>
            
            <textarea 
              id="missionResponse" 
              class="w-full ${t.inputBg} border border-blue-300 rounded-lg p-3 ${t.inputText} text-sm resize-none focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 ${t.inputPlaceholder}"
              rows="3"
              placeholder="${labels.writeMission}"
            >${missionResponse || ''}</textarea>
          </div>
          
          <!-- Save & Complete Button -->
          <div class="flex gap-3 mt-6 mb-8">
            <button onclick="Training.saveDayProgress()" class="flex-1 mission-button py-4 rounded-xl font-bold">
              ✅ ${labels.saveComplete}
            </button>
          </div>
        </div>
      </div>
    `;
    
    document.getElementById('trainingDayModal').classList.remove('hidden');
  },
  
  /**
   * Create the day modal container
   */
  createDayModal() {
    const modal = document.createElement('div');
    modal.id = 'trainingDayModal';
    modal.className = 'hidden';
    document.body.appendChild(modal);
  },
  
  /**
   * Close the day modal
   */
  closeDay() {
    const modal = document.getElementById('trainingDayModal');
    if (modal) {
      modal.classList.add('hidden');
      modal.innerHTML = '';
    }
    this.render(); // Refresh the list
  },
  
  /**
   * Save day progress and responses
   */
  async saveDayProgress() {
    const obedienceResponse = document.getElementById('obedienceResponse')?.value;
    const missionResponse = document.getElementById('missionResponse')?.value;
    
    // Save responses (silent tracking)
    if (obedienceResponse) {
      await this.saveResponse(this.currentSession, this.currentDay, 'obedience', obedienceResponse);
    }
    if (missionResponse) {
      await this.saveResponse(this.currentSession, this.currentDay, 'mission', missionResponse);
    }
    
    // Mark day as completed
    await this.markDayCompleted(this.currentSession, this.currentDay);
    
    // Show success message
    alert(window.currentLang === 'tl' ? 'Nai-save na! Magaling!' : 'Saved! Great job!');
    
    // Close and refresh
    this.closeDay();
  },
  
  /**
   * Open group processing (Day 7)
   */
  openGroupProcessing(sessionNumber) {
    const session = this.sessions.find(s => s.sessionNumber === sessionNumber);
    if (!session) return;
    
    const lang = window.currentLang || 'en';
    const labels = this.getLabels(lang);
    const t = this.getThemeClasses();
    
    // Create modal for group processing
    const modal = document.getElementById('trainingDayModal');
    if (!modal) {
      this.createDayModal();
    }
    
    document.getElementById('trainingDayModal').innerHTML = `
      <div class="fixed inset-0 ${t.modalBg} z-50 overflow-y-auto">
        <div class="min-h-screen p-4 max-w-2xl mx-auto">
          <!-- Header -->
          <div class="flex items-center justify-between mb-6">
            <button onclick="Training.closeDay()" class="${t.textMuted} hover:${t.textPrimary} p-2">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
              </svg>
            </button>
            <div class="text-center">
              <div class="text-xs text-purple-500 font-medium">${labels.session} ${sessionNumber}</div>
              <div class="${t.textPrimary} font-bold">${labels.groupProcessing}</div>
            </div>
            <div class="w-10"></div>
          </div>
          
          <!-- Instructions -->
          <div class="${t.followThroughBg} border rounded-xl p-4 mb-6">
            <div class="text-purple-600 font-bold mb-2">🎯 ${labels.processingInstructions}</div>
            <ul class="${t.textMutedAlt} text-sm space-y-2">
              <li>1. ${labels.instruction1}</li>
              <li>2. ${labels.instruction2}</li>
              <li>3. ${labels.instruction3}</li>
              <li>4. ${labels.instruction4}</li>
            </ul>
          </div>
          
          <!-- Discussion Topics -->
          <div class="space-y-3 mb-6">
            <div class="text-amber-500 font-bold">${labels.discussionTopics}</div>
            ${session.days.map(day => `
              <div class="${t.cardBg} rounded-xl p-4 border ${t.borderSubtle}">
                <div class="text-xs text-amber-500 mb-1">${labels.day} ${day.dayNumber}: ${day.dayTitle}</div>
                <div class="${t.textPrimary} text-sm mb-2">${day.scriptureReference}</div>
                <div class="${t.textMuted} text-xs">${day.fruitIndicator || ''}</div>
              </div>
            `).join('')}
          </div>
          
          <!-- Join Meeting Button -->
          <button onclick="Training.joinMeeting(${sessionNumber})" class="w-full bg-gradient-to-r from-purple-600 to-purple-500 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:from-purple-700 hover:to-purple-600 transition-all">
            📹 ${labels.joinMeeting}
          </button>
          
          <p class="text-center ${t.textMuted} text-xs mt-4">${labels.meetingNote}</p>
        </div>
      </div>
    `;
    
    document.getElementById('trainingDayModal').classList.remove('hidden');
  },
  
  /**
   * Join video meeting (Jitsi)
   */
  async joinMeeting(sessionNumber) {
    const activeGroup = window.Groups?.currentGroup;
    const groupId = activeGroup?.id || `training-session-${sessionNumber}`;
    const groupName = activeGroup?.name || `Session ${sessionNumber} Group Processing`;

    await this.joinEmbeddedMeeting(groupId, groupName);
  },

  /**
   * Join weekly Wednesday Equipping room
   */
  async joinWednesdayEquipping() {
    await this.joinEmbeddedMeeting(
      this.WEDNESDAY_EQUIPPING_ROOM_ID,
      this.WEDNESDAY_EQUIPPING_GROUP_NAME
    );
  },

  /**
   * Join meeting through the in-app GroupMeeting embed flow
   */
  async joinEmbeddedMeeting(groupId, groupName) {
    const userName = window.currentUser?.displayName || window.currentUser?.email?.split('@')[0] || 'Guest';
    const userEmail = window.currentUser?.email || '';

    if (window.GroupMeeting && typeof window.GroupMeeting.joinMeeting === 'function') {
      await window.GroupMeeting.joinMeeting(String(groupId), groupName, userName, userEmail, false);
      return;
    }

    console.error('[Training] GroupMeeting module unavailable');
    window.alert('Meeting is temporarily unavailable. Please refresh the app and try again.');
  },
  
  /**
   * Get labels based on language
   */
  getLabels(lang) {
    const labels = {
      en: {
        session: 'Session',
        day: 'Day',
        daysCompleted: 'days completed',
        noContent: 'No training content available yet.',
        wednesday: 'Wednesday',
        groupProcessing: 'Group Processing',
        groupProcessingDesc: 'Discuss your reflections with your group',
        followThrough: 'Follow Through',
        todayStory: "Today's Story",
        scripture: 'Scripture',
        understanding: 'Understanding',
        conversationWithGod: 'Conversation with God',
        writeResponse: 'Write your conversation with God here...',
        mission: 'Mission',
        writeMission: 'Write your mission commitment...',
        saveComplete: 'Save & Complete',
        processingInstructions: 'How to Process Together',
        instruction1: 'Each person shares their follow-through from the week',
        instruction2: 'Discuss each day\'s reflection question',
        instruction3: 'The facilitator draws out applications and principles',
        instruction4: 'Encourage each other to continue growing',
        discussionTopics: 'Discussion Topics',
        joinMeeting: 'Join Video Meeting',
        meetingNote: 'You will be connected to your group\'s video call',
        liveTraining: 'Live Training',
        wednesdayEquipping: 'Wednesday Equipping',
        wednesdayEquippingDesc: 'Equip members to make disciples with participants from different countries.',
        meetsEvery: 'Meets every',
        wednesdayEquippingTime: 'Wednesday • 8:00 PM',
        joinWednesdayEquipping: 'Join Wednesday Equipping',
        joinGuideTitle: 'How To Join Wednesday Equipping',
        joinGuideSubtitle: 'Quick 4-step guide',
        joinGuideStep1Title: 'Open Training',
        joinGuideStep1Desc: 'Tap Training from the bottom navigation.',
        joinGuideStep2Title: 'Find The Card',
        joinGuideStep2Desc: 'Look for the Wednesday Equipping card.',
        joinGuideStep3Title: 'Tap Join',
        joinGuideStep3Desc: 'Press Join Wednesday Equipping.',
        joinGuideStep4Title: 'Enter Meeting',
        joinGuideStep4Desc: 'Allow mic/camera and wait to connect.'
      },
      tl: {
        session: 'Sesyon',
        day: 'Araw',
        daysCompleted: 'araw natapos',
        noContent: 'Wala pang training content.',
        wednesday: 'Miyerkules',
        groupProcessing: 'Group Processing',
        groupProcessingDesc: 'Pag-usapan ang mga reflection mo kasama ang grupo',
        followThrough: 'Follow Through',
        todayStory: 'Kwento Ngayon',
        scripture: 'Kasulatan',
        understanding: 'Pag-unawa',
        conversationWithGod: 'Pag-uusap sa Diyos',
        writeResponse: 'Isulat ang pag-uusap mo sa Diyos dito...',
        mission: 'Misyon',
        writeMission: 'Isulat ang commitment mo sa misyon...',
        saveComplete: 'I-save at Tapusin',
        processingInstructions: 'Paano Mag-process ng Sabay-sabay',
        instruction1: 'Bawat isa ay magbabahagi ng follow-through nila mula sa linggo',
        instruction2: 'Pag-usapan ang reflection question ng bawat araw',
        instruction3: 'Ang facilitator ay magdadala ng mga aplikasyon at prinsipyo',
        instruction4: 'Palakasin ang loob ng bawat isa na magpatuloy sa paglago',
        discussionTopics: 'Mga Paksang Tatalakayin',
        joinMeeting: 'Sumali sa Video Meeting',
        meetingNote: 'Ikokonekta ka sa video call ng iyong grupo',
        liveTraining: 'Live Training',
        wednesdayEquipping: 'Wednesday Equipping',
        wednesdayEquippingDesc: 'Samahan kami sa isang pagsasanay na magpapalalim ng iyong pagmamahal sa Diyos at magpapatatag ng iyong pag-ibig sa kapwa. Lumago sa espirituwal. Magmahal nang may layunin. Mabuhay nang may saysay.',
        meetsEvery: 'Tuwing',
        wednesdayEquippingTime: 'Miyerkules • 8:00 PM',
        joinWednesdayEquipping: 'Sumali sa Wednesday Equipping',
        joinGuideTitle: 'Paano Sumali sa Wednesday Equipping',
        joinGuideSubtitle: 'Mabilis na 4 na hakbang',
        joinGuideStep1Title: 'Buksan ang Training',
        joinGuideStep1Desc: 'Pindutin ang Training sa ibabang navigation.',
        joinGuideStep2Title: 'Hanapin ang Card',
        joinGuideStep2Desc: 'Hanapin ang card na Wednesday Equipping.',
        joinGuideStep3Title: 'Pindutin ang Join',
        joinGuideStep3Desc: 'I-tap ang Sumali sa Wednesday Equipping.',
        joinGuideStep4Title: 'Pumasok sa Meeting',
        joinGuideStep4Desc: 'Payagan ang mic/camera at maghintay makakonekta.'
      }
    };
    
    return labels[lang] || labels.en;
  },
  
  /**
   * Open training in full screen mode (from My Training card)
   */
  openFullScreen() {
    console.log('[Training] Opening full screen');
    
    const lang = window.currentLang || 'en';
    const labels = this.getLabels(lang);
    
    // Create full screen training view
    let modal = document.getElementById('trainingFullScreen');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'trainingFullScreen';
      document.body.appendChild(modal);
    }
    
    const wednesdayCardHtml = this.renderWednesdayEquippingCard(labels);
    const joinGuideHtml = this.renderTrainingJoinGuide(labels);
    
    modal.innerHTML = `
      <div class="fixed inset-0 bg-[var(--bg-color)] z-50 flex flex-col">
        <!-- Header -->
        <div class="bg-[var(--nav-bg)] border-b border-[var(--nav-border)] p-4 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <button onclick="Training.closeFullScreen()" class="text-[var(--mission-gold)] hover:text-[var(--mission-gold)]/80">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
              </svg>
            </button>
            <h2 class="text-lg font-bold text-[var(--text-color)]">🎯 Mission Training</h2>
          </div>
        </div>
        
        <!-- Content -->
        <div class="flex-1 overflow-y-auto p-4">
          ${wednesdayCardHtml}
          ${joinGuideHtml}
        </div>
      </div>
    `;
    
    modal.classList.remove('hidden');
  },

  /**
   * Render weekly Wednesday Equipping live-call card
   */
  renderWednesdayEquippingCard(labels) {
    return `
      <div class="mb-5 rounded-2xl border border-[var(--mission-gold)]/35 bg-gradient-to-br from-[var(--mission-gold)]/15 to-transparent p-4 shadow-sm">
        <div class="flex items-start justify-between gap-3">
          <div>
            <div class="text-xs uppercase tracking-[0.2em] font-bold text-[var(--mission-gold)]">${labels.liveTraining}</div>
            <h3 class="mt-1 text-xl font-extrabold text-[var(--text-color)]">${labels.wednesdayEquipping}</h3>
            <p class="mt-2 text-sm text-[var(--text-muted)]">${labels.wednesdayEquippingDesc}</p>
          </div>
          <div class="text-right shrink-0">
            <div class="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">${labels.meetsEvery}</div>
            <div class="text-sm font-semibold text-[var(--text-color)]">${labels.wednesdayEquippingTime}</div>
          </div>
        </div>
        <button onclick="Training.joinWednesdayEquipping()" class="mt-4 w-full mission-button py-3 rounded-xl font-bold">
          📹 ${labels.joinWednesdayEquipping}
        </button>
      </div>
    `;
  },

  /**
   * Render infographic-style join instructions
   */
  renderTrainingJoinGuide(labels) {
    return `
      <div class="mb-6 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] overflow-hidden">
        <div class="px-4 py-3 border-b border-[var(--card-border)] bg-gradient-to-r from-[var(--mission-gold)]/10 to-transparent">
          <h4 class="text-base font-extrabold text-[var(--text-color)]">${labels.joinGuideTitle}</h4>
          <p class="text-xs text-[var(--text-muted)]">${labels.joinGuideSubtitle}</p>
        </div>
        <div class="p-4 grid grid-cols-2 gap-3">
          <div class="rounded-xl border border-[var(--card-border)] bg-[var(--input-bg)] p-3">
            <div class="w-7 h-7 rounded-full bg-[var(--mission-gold)] text-[#2a0505] font-extrabold text-sm flex items-center justify-center mb-2">1</div>
            <p class="text-sm font-bold text-[var(--text-color)]">${labels.joinGuideStep1Title}</p>
            <p class="text-xs text-[var(--text-muted)] mt-1">${labels.joinGuideStep1Desc}</p>
          </div>
          <div class="rounded-xl border border-[var(--card-border)] bg-[var(--input-bg)] p-3">
            <div class="w-7 h-7 rounded-full bg-[var(--mission-gold)] text-[#2a0505] font-extrabold text-sm flex items-center justify-center mb-2">2</div>
            <p class="text-sm font-bold text-[var(--text-color)]">${labels.joinGuideStep2Title}</p>
            <p class="text-xs text-[var(--text-muted)] mt-1">${labels.joinGuideStep2Desc}</p>
          </div>
          <div class="rounded-xl border border-[var(--card-border)] bg-[var(--input-bg)] p-3">
            <div class="w-7 h-7 rounded-full bg-[var(--mission-gold)] text-[#2a0505] font-extrabold text-sm flex items-center justify-center mb-2">3</div>
            <p class="text-sm font-bold text-[var(--text-color)]">${labels.joinGuideStep3Title}</p>
            <p class="text-xs text-[var(--text-muted)] mt-1">${labels.joinGuideStep3Desc}</p>
          </div>
          <div class="rounded-xl border border-[var(--card-border)] bg-[var(--input-bg)] p-3">
            <div class="w-7 h-7 rounded-full bg-[var(--mission-gold)] text-[#2a0505] font-extrabold text-sm flex items-center justify-center mb-2">4</div>
            <p class="text-sm font-bold text-[var(--text-color)]">${labels.joinGuideStep4Title}</p>
            <p class="text-xs text-[var(--text-muted)] mt-1">${labels.joinGuideStep4Desc}</p>
          </div>
        </div>
      </div>
    `;
  },
  
  /**
   * Close full screen training view
   */
  closeFullScreen() {
    const modal = document.getElementById('trainingFullScreen');
    if (modal) {
      modal.classList.add('hidden');
    }
  },
  
  /**
   * Get training progress for card display
   */
  getProgressSummary() {
    let totalDays = 0;
    let completedDays = 0;
    
    this.sessions.forEach(session => {
      totalDays += session.days.length;
      completedDays += session.days.filter(d => 
        this.isDayCompleted(session.sessionNumber, d.dayNumber)
      ).length;
    });
    
    return { completed: completedDays, total: totalDays };
  }
};

if (typeof window !== 'undefined') {
  window.Training = Training;
}

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Training;
}
