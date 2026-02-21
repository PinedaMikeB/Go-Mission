/**
 * Go Mission - Bible Reader Module
 * Full chapter display with verse highlighting and auto-commentary
 * 
 * Features:
 * - Load full chapter (no verse limits - Spirit-led reading)
 * - Tap verses to highlight
 * - Auto-load commentary for highlighted verses
 * - Progress tracking (chapter X of Y)
 * - Prev/Next navigation
 * - Resume from last position
 */

const BibleReader = {
  // State
  currentBook: 'JHN',
  currentChapter: 3,
  highlightedVerses: [],      // Now stores objects: [{verse: 1, color: 'gold'}, ...]
  chapterData: null,
  commentaryData: null,
  quickInsightsData: null,
  tyndaleData: null,
  inlineReflectionDraft: {
    reflection: '',
    commitment: '',
    prayerRequests: [],
    prayerDraft: '',
    shareWithGroup: null,
    shareGroupIds: []
  },
  inlineShareTargets: [],
  inlineShareTargetsLoading: false,
  commentaryRequestId: 0,
  insightsLoading: false,
  insightsLastError: null,
  
  // Bible translation (independent of global language)
  // This only affects the Bible text, NOT insights/reflect
  bibleTranslation: 'tl',     // 'en' or 'tl' - default Tagalog
  
  // Reading preferences
  preferences: {
    fontSize: 16,           // Base font size in pixels
    highlightColor: 'gold', // Current/active highlight color for new highlights
    isFullscreen: false     // Fullscreen mode
  },
  
  // Available highlight colors
  highlightColors: {
    gold: { bg: 'rgba(251, 191, 36, 0.25)', border: 'rgba(251, 191, 36, 0.5)', name: 'Gold' },
    green: { bg: 'rgba(34, 197, 94, 0.25)', border: 'rgba(34, 197, 94, 0.5)', name: 'Green' },
    blue: { bg: 'rgba(59, 130, 246, 0.25)', border: 'rgba(59, 130, 246, 0.5)', name: 'Blue' },
    purple: { bg: 'rgba(168, 85, 247, 0.25)', border: 'rgba(168, 85, 247, 0.5)', name: 'Purple' },
    pink: { bg: 'rgba(236, 72, 153, 0.25)', border: 'rgba(236, 72, 153, 0.5)', name: 'Pink' },
    orange: { bg: 'rgba(249, 115, 22, 0.25)', border: 'rgba(249, 115, 22, 0.5)', name: 'Orange' }
  },
  
  // DOM references
  elements: {},
  
  // Progress tracking
  progress: {
    book: 'JHN',
    chapter: 3,
    booksProgress: {}
  },

  /**
   * Initialize the reader
   */
  async init() {
    console.log('[BibleReader] Initializing...');
    
    // Load saved progress and preferences
    await this.loadProgress();
    this.loadPreferences();
    
    // Listen for passage selection from BiblePicker
    document.addEventListener('biblePassageSelected', (e) => {
      this.loadChapter(e.detail.book, e.detail.chapter);
    });
    
    // Listen for language changes
    document.addEventListener('languageChanged', () => {
      // Reload current chapter in new language, but KEEP highlighted verses
      if (this.currentBook && this.currentChapter) {
        this.reloadChapterForLanguageChange();
      }
    });
    
    // Listen for ESC key to exit fullscreen
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.preferences.isFullscreen) {
        this.exitFullscreen();
      }
    });
    
    // Cache DOM elements
    this.cacheElements();
    
    // Load initial chapter
    await this.loadChapter(this.progress.book, this.progress.chapter);
    
    console.log('[BibleReader] Ready');
  },

  /**
   * Cache DOM element references
   */
  cacheElements() {
    this.elements = {
      passageTitle: document.getElementById('passageTitle'),
      bibleText: document.getElementById('bibleText'),
      commentaryContent: document.getElementById('commentaryContent'),
      commentaryBtn: document.getElementById('commentaryBtn'),
      progressIndicator: document.getElementById('chapterProgress'),
      prevBtn: document.getElementById('prevChapterBtn'),
      nextBtn: document.getElementById('nextChapterBtn')
    };
  },

  /**
   * Load progress from localStorage/Firestore
   */
  async loadProgress() {
    // Try localStorage first (immediate)
    try {
      const saved = localStorage.getItem('goMission_bibleProgress');
      if (saved) {
        this.progress = JSON.parse(saved);
        this.currentBook = this.progress.book || 'JHN';
        this.currentChapter = this.progress.chapter || 3;
      }
    } catch (e) {
      console.log('[BibleReader] No local progress found');
    }
    
    // Try Firestore if user logged in
    try {
      if (typeof window.currentUser !== 'undefined' && window.currentUser && typeof window.db !== 'undefined') {
        const userRef = window.doc(window.db, 'goMission_members', window.currentUser.uid);
        const userDoc = await window.getDoc(userRef);
        
        if (userDoc.exists()) {
          const data = userDoc.data();
          if (data.bibleProgress) {
            this.progress = data.bibleProgress;
            this.currentBook = this.progress.book || 'JHN';
            this.currentChapter = this.progress.chapter || 3;
            // Sync to localStorage
            localStorage.setItem('goMission_bibleProgress', JSON.stringify(this.progress));
          }
        }
      }
    } catch (e) {
      console.log('[BibleReader] Could not load Firestore progress:', e.message);
    }
  },

  /**
   * Save progress
   */
  async saveProgress() {
    this.progress.book = this.currentBook;
    this.progress.chapter = this.currentChapter;
    this.progress.lastReadAt = Date.now();
    
    // Track chapters read per book
    if (!this.progress.booksProgress) {
      this.progress.booksProgress = {};
    }
    if (!this.progress.booksProgress[this.currentBook]) {
      this.progress.booksProgress[this.currentBook] = { chaptersRead: [] };
    }
    if (!this.progress.booksProgress[this.currentBook].chaptersRead.includes(this.currentChapter)) {
      this.progress.booksProgress[this.currentBook].chaptersRead.push(this.currentChapter);
    }
    this.progress.booksProgress[this.currentBook].lastChapter = this.currentChapter;
    
    // Save to localStorage
    localStorage.setItem('goMission_bibleProgress', JSON.stringify(this.progress));
    
    // Save to Firestore if logged in
    try {
      if (typeof window.currentUser !== 'undefined' && window.currentUser && typeof window.db !== 'undefined') {
        await window.setDoc(window.doc(window.db, 'goMission_members', window.currentUser.uid), {
          bibleProgress: this.progress
        }, { merge: true });
      }
    } catch (e) {
      console.log('[BibleReader] Could not save to Firestore:', e.message);
    }
  },

  /**
   * Load reading preferences from localStorage
   */
  loadPreferences() {
    try {
      const saved = localStorage.getItem('goMission_biblePreferences');
      if (saved) {
        const prefs = JSON.parse(saved);
        this.preferences = { ...this.preferences, ...prefs };
      }
    } catch (e) {
      console.log('[BibleReader] No saved preferences');
    }
    
    // Load Bible translation preference (separate from global language)
    const savedTranslation = localStorage.getItem('goMission_bibleTranslation');
    if (savedTranslation && (savedTranslation === 'en' || savedTranslation === 'tl')) {
      this.bibleTranslation = savedTranslation;
    }
    
    // Apply saved preferences
    this.applyFontSize();
  },

  /**
   * Save reading preferences
   */
  savePreferences() {
    localStorage.setItem('goMission_biblePreferences', JSON.stringify(this.preferences));
  },

  /**
   * Set highlight color
   */
  setHighlightColor(color) {
    if (this.highlightColors[color]) {
      this.preferences.highlightColor = color;
      this.savePreferences();
      this.renderVerses();
      this.updateColorPickerUI();
    }
  },

  /**
   * Increase font size
   */
  increaseFontSize() {
    if (this.preferences.fontSize < 28) {
      this.preferences.fontSize += 2;
      this.savePreferences();
      this.applyFontSize();
    }
  },

  /**
   * Decrease font size
   */
  decreaseFontSize() {
    if (this.preferences.fontSize > 12) {
      this.preferences.fontSize -= 2;
      this.savePreferences();
      this.applyFontSize();
    }
  },

  /**
   * Apply font size to Bible text and related sections
   */
  applyFontSize() {
    const bibleText = document.getElementById('bibleText');
    const fullscreenText = document.getElementById('fullscreenBibleText');
    const commentaryContent = document.getElementById('commentaryContent');
    const reflectSection = document.getElementById('reflectSection');
    const reflectionTextarea = document.getElementById('reflectionTextarea');
    const fullscreenCommentary = document.getElementById('fullscreenCommentaryContent');
    
    const fontSize = `${this.preferences.fontSize}px`;
    
    // Apply to main Bible text
    if (bibleText) bibleText.style.fontSize = fontSize;
    
    // Apply to fullscreen Bible text
    if (fullscreenText) fullscreenText.style.fontSize = fontSize;
    
    // Apply to commentary section
    if (commentaryContent) commentaryContent.style.fontSize = fontSize;
    
    // Apply to fullscreen commentary
    if (fullscreenCommentary) fullscreenCommentary.style.fontSize = fontSize;
    
    // Apply to reflect section (adjust slightly smaller)
    if (reflectSection) reflectSection.style.fontSize = fontSize;
    
    // Apply to reflection textarea
    if (reflectionTextarea) reflectionTextarea.style.fontSize = fontSize;

    // Re-render fullscreen insights content so labels/questions/inputs stay in sync with Bible font size.
    if (this.preferences.isFullscreen && document.getElementById('fullscreenCommentaryContent')) {
      this.refreshFullscreenInsightsPanel();
    }
  },

  /**
   * Open Bible from bottom nav and resume where reader left off.
   */
  async openFromNav() {
    if (document.getElementById('bibleFullscreenOverlay')) return;

    if (!this.chapterData) {
      await this.loadChapter(this.currentBook || 'JHN', this.currentChapter || 3);
    }

    this.enterFullscreen();
  },

  /**
   * Enter fullscreen mode
   */
  enterFullscreen() {
    this.preferences.isFullscreen = true;
    
    // Create fullscreen overlay
    const overlay = document.createElement('div');
    overlay.id = 'bibleFullscreenOverlay';
    overlay.className = 'fixed inset-0 z-50 bg-[var(--bg-color)] flex flex-col transition-all duration-300';
    
    // Get book name in the current Bible translation
    const bookName = BibleLoader.getBookName(this.currentBook, this.bibleTranslation);
    const lang = (typeof i18n !== 'undefined') ? i18n.getLang() : 'en';
    const hasHighlights = this.highlightedVerses.length > 0;
    const isMobile = window.innerWidth < 768;
    const journalLabel = lang === 'tl' ? 'Aking Journal' : 'My Journal';
    
    overlay.innerHTML = `
      <!-- Fullscreen Header -->
      <div class="flex items-center justify-between px-3 md:px-4 py-2 md:py-3 border-b border-[var(--card-border)] bg-[var(--nav-bg)]">
        <button onclick="BibleReader.exitFullscreen()" class="flex items-center gap-1 md:gap-2 text-[var(--mission-gold)] hover:opacity-85">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
          <span class="text-sm font-medium hidden md:inline">Close</span>
        </button>
        
        <!-- Clickable Title + Translation Dropdown -->
        <div class="flex items-center gap-2">
          <button onclick="BiblePicker.open()" class="flex items-center gap-1 text-base md:text-lg font-bold text-[var(--text-color)] hover:text-[var(--mission-gold)] transition-colors">
            <span>📖</span>
            <span id="fullscreenBookTitle">${bookName} ${this.currentChapter}</span>
            <svg class="w-4 h-4 text-[var(--mission-gold)]/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
            </svg>
          </button>
          
          <!-- Translation Dropdown -->
          <select id="bibleTranslationSelect" 
                  onchange="BibleReader.setBibleTranslation(this.value)"
                  class="text-xs px-2 py-1 rounded bg-[var(--input-bg)] text-[var(--text-color)] border border-[var(--card-border)] cursor-pointer">
            <option value="tl" ${this.bibleTranslation === 'tl' ? 'selected' : ''}>TL</option>
            <option value="en" ${this.bibleTranslation === 'en' ? 'selected' : ''}>EN</option>
          </select>
        </div>
        
        <div class="flex items-center gap-1 md:gap-2">
          <!-- Font Size Controls -->
          <button onclick="BibleReader.decreaseFontSize(); BibleReader.applyFontSize();" class="w-7 h-7 md:w-8 md:h-8 rounded-full bg-[var(--input-bg)] text-[var(--text-color)] flex items-center justify-center hover:bg-[var(--mission-gold)]/20">
            <span class="text-base md:text-lg font-bold">A-</span>
          </button>
          <button onclick="BibleReader.increaseFontSize(); BibleReader.applyFontSize();" class="w-7 h-7 md:w-8 md:h-8 rounded-full bg-[var(--input-bg)] text-[var(--text-color)] flex items-center justify-center hover:bg-[var(--mission-gold)]/20">
            <span class="text-base md:text-lg font-bold">A+</span>
          </button>
        </div>
      </div>
      
      <!-- Color Picker & Insights Bar -->
      <div class="flex items-center justify-between px-3 md:px-4 py-2 bg-[var(--nav-bg)] border-b border-[var(--card-border)]">
        <div class="flex items-center gap-1 md:gap-2">
          ${Object.entries(this.highlightColors).map(([key, color]) => `
            <button onclick="BibleReader.setHighlightColor('${key}')" 
                    class="w-5 h-5 md:w-6 md:h-6 rounded-full border-2 transition-all ${this.preferences.highlightColor === key ? 'border-white scale-110' : 'border-transparent'}"
                    style="background: ${color.bg}; box-shadow: inset 0 0 0 2px ${color.border};"
                    title="${color.name}">
            </button>
          `).join('')}
        </div>
        
        <!-- Insights Button -->
        <div class="flex items-center gap-2">
          <button onclick="BibleReader.openJournalFromFullscreen()"
                  class="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all bg-[var(--input-bg)] text-[var(--text-color)] hover:bg-[var(--mission-gold)]/15 hover:text-[var(--mission-gold)]">
            <span>📖</span>
            <span>${journalLabel}</span>
          </button>
          <button onclick="BibleReader.toggleFullscreenCommentary()" 
                  id="fullscreenCommentaryBtn"
                  class="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${hasHighlights ? 'bg-[var(--mission-gold)]/15 text-[var(--mission-gold)] hover:bg-[var(--mission-gold)]/25' : 'bg-[var(--card-border)] text-[var(--text-dim)] cursor-not-allowed'}"
                  ${!hasHighlights ? 'disabled' : ''}>
            <span>💡</span>
            <span>Insights</span>
            <span id="fullscreenCommentaryCount" class="${hasHighlights ? '' : 'hidden'}">(${this.highlightedVerses.length})</span>
          </button>
        </div>
      </div>
      
      <!-- Chapter Navigation -->
      <div class="flex items-center justify-between px-3 md:px-4 py-2 bg-[var(--nav-bg)] border-b border-[var(--card-border)]">
        <button onclick="BibleReader.prevChapter(); BibleReader.updateFullscreenContent();" 
                class="flex items-center gap-1 text-sm text-[var(--mission-gold)] hover:opacity-85 ${this.currentChapter <= 1 ? 'opacity-30 pointer-events-none' : ''}">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
          </svg>
          Prev
        </button>
        
        <span id="fullscreenChapterLabel" class="text-sm text-[var(--text-muted)]">Chapter ${this.currentChapter}</span>
        
        <button onclick="BibleReader.nextChapter(); BibleReader.updateFullscreenContent();" 
                class="flex items-center gap-1 text-sm text-[var(--mission-gold)] hover:opacity-85">
          Next
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
          </svg>
        </button>
      </div>
      
      <!-- Main Content Area -->
      <div class="flex-1 flex overflow-hidden relative">
        <!-- Bible Text -->
        <div id="fullscreenBibleText" class="flex-1 overflow-y-auto px-4 md:px-6 py-4 custom-scrollbar" style="font-size: ${this.preferences.fontSize}px;">
          ${this.generateVersesHTML()}
        </div>
        
        <!-- Commentary Panel - Full overlay on mobile, side panel on desktop -->
        <div id="fullscreenCommentaryPanel" class="hidden absolute inset-0 md:relative md:inset-auto md:w-80 md:border-l border-[var(--card-border)] bg-[var(--bg-color)] md:bg-[var(--nav-bg)] overflow-y-auto z-20">
          <div class="p-4 h-full flex flex-col">
            <div class="flex items-center justify-between mb-3 pb-3 border-b border-[var(--card-border)]">
              <h3 class="text-[var(--mission-gold)] font-bold">💡 ${lang === 'tl' ? 'Tulungan akong maintindihan' : 'Help me understand'}</h3>
              <button onclick="BibleReader.toggleFullscreenCommentary()" class="p-2 rounded-full bg-[var(--input-bg)] text-[var(--text-muted)] hover:text-[var(--mission-gold)]">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
            <div id="fullscreenCommentaryContent" class="flex-1 overflow-y-auto" style="font-size: ${this.preferences.fontSize}px;">
              ${this.generateCommentaryHTML()}
            </div>
            <!-- Back to Bible button on mobile -->
            <button onclick="BibleReader.toggleFullscreenCommentary()" class="md:hidden mt-4 w-full py-3 bg-[var(--mission-gold)] text-[var(--mission-red-deep)] font-bold rounded-xl">
              ← ${lang === 'tl' ? 'Bumalik sa Bibliya' : 'Back to Bible'}
            </button>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';

    // Animate in
    requestAnimationFrame(() => {
      overlay.style.opacity = '1';
    });
  },

  /**
   * Toggle fullscreen commentary panel
   */
  toggleFullscreenCommentary() {
    const panel = document.getElementById('fullscreenCommentaryPanel');
    const btn = document.getElementById('fullscreenCommentaryBtn');
    
    if (!panel || this.highlightedVerses.length === 0) return;
    
    const isHidden = panel.classList.contains('hidden');
    
    if (isHidden) {
      panel.classList.remove('hidden');
      btn?.classList.add('bg-[var(--mission-gold)]/25');
    } else {
      panel.classList.add('hidden');
      btn?.classList.remove('bg-[var(--mission-gold)]/25');
    }
  },

  /**
   * Open Journal modal from fullscreen header button.
   */
  openJournalFromFullscreen() {
    if (typeof window.openJournal === 'function') {
      window.openJournal();
      return;
    }
    alert('Journal is not available right now. Please refresh and try again.');
  },

  /**
   * Generate commentary HTML for fullscreen panel
   */
  generateCommentaryHTML() {
    const lang = this.bibleTranslation || ((typeof i18n !== 'undefined') ? i18n.getLang() : 'en');

    if (this.insightsLoading) {
      return `<p class="text-[var(--text-muted)] italic">${lang === 'tl' ? 'Naglo-load ng insights...' : 'Loading insights...'}</p>`;
    }

    if (!this.quickInsightsData || !this.quickInsightsData.verses || Object.keys(this.quickInsightsData.verses).length === 0) {
      if (this.highlightedVerses.length > 0) {
        const err = this.insightsLastError ? ` (${this.insightsLastError})` : '';
        return `<p class="text-[var(--text-muted)] italic">${lang === 'tl' ? 'Wala pang insights para sa napiling talata.' : 'No insights available for the selected verse(s) yet.'}${err}</p>`;
      }
      return `<p class="text-[var(--text-muted)] italic">${lang === 'tl' ? 'I-tap ang mga talata para makita ang insights' : 'Tap verses to see insights'}</p>`;
    }

    const labels = {
      en: {
        understanding: '📖 Understanding',
        livingItOut: '🚶 Living It Out',
        godsLove: '❤️ God\'s Love',
        reflectionQuestion: '💭 Reflection Question',
        yourAnswer: 'What is my understanding',
        yourAnswerPlaceholder: 'Write what you learned and understood here...',
        iWill: 'What will I do',
        iWillPlaceholder: 'Write your commitment to apply this today...',
        prayerRequests: 'Prayer requests',
        prayerRequestsPlaceholder: 'Add one prayer request (example: Salvation for my husband Marko Junior)',
        addPrayerRequest: 'Add',
        noPrayerRequests: 'No prayer requests added yet.',
        addedLabel: 'Added',
        removePrayerRequest: 'Remove',
        shareWithGroup: 'Share with my groups',
        shareWithGroupHelp: 'Help your leader walk with you',
        selectGroups: 'Choose group(s) to share with',
        selectAllGroups: 'Select all groups',
        noShareGroups: 'No mission groups available to share right now.',
        availableCount: 'available group(s)',
        selectedCount: 'group(s) selected',
        roleUpline: 'Upline',
        roleDownline: 'Downline',
        roleGuest: 'Guest',
        roleGroup: 'Group',
        groupIdSuffix: 'ID',
        save: '💾 Save Reflection'
      },
      tl: {
        understanding: '📖 Pag-unawa',
        livingItOut: '🚶 Isabuhay',
        godsLove: '❤️ Pag-ibig ng Diyos',
        reflectionQuestion: '💭 Tanong sa Pagninilay',
        yourAnswer: 'Ano ang aking pagkaunawa',
        yourAnswerPlaceholder: 'Isulat ang iyong natutunan at pagkaunawa dito...',
        iWill: 'Ano ang aking gagawin',
        iWillPlaceholder: 'Isulat ang commitment mo kung paano mo ito isasabuhay ngayon...',
        prayerRequests: 'Mga prayer request',
        prayerRequestsPlaceholder: 'Magdagdag ng isang kahilingan sa panalangin (hal: Kaligtasan ng asawa kong si Marko Junior)',
        addPrayerRequest: 'Idagdag',
        noPrayerRequests: 'Wala pang nailalagay na prayer request.',
        addedLabel: 'Nagdagdag',
        removePrayerRequest: 'Tanggalin',
        shareWithGroup: 'I-share sa aking mga group',
        shareWithGroupHelp: 'Para masamahan ka ng leader mo',
        selectGroups: 'Piliin ang mga group na pagse-share-an',
        selectAllGroups: 'Piliin lahat ng group',
        noShareGroups: 'Wala kang available na mission group para i-share ngayon.',
        availableCount: 'available na group',
        selectedCount: 'group ang napili',
        roleUpline: 'Upline',
        roleDownline: 'Downline',
        roleGuest: 'Guest',
        roleGroup: 'Group',
        groupIdSuffix: 'ID',
        save: '💾 I-save ang Reflection'
      }
    };
    const L = labels[lang] || labels.en;
    const baseFontPx = Math.max(12, Number(this.preferences.fontSize) || 16);
    const headingFontPx = Math.max(14, Math.round(baseFontPx * 1.05));
    const labelFontPx = Math.max(13, Math.round(baseFontPx * 0.92));
    const metaFontPx = Math.max(12, Math.round(baseFontPx * 0.84));
    const smallFontPx = Math.max(11, Math.round(baseFontPx * 0.78));

    const shareToggle = document.getElementById('shareToggle');
    if (this.inlineReflectionDraft.shareWithGroup === null) {
      this.inlineReflectionDraft.shareWithGroup = !!shareToggle?.classList.contains('active');
    }
    
    let html = '';
    const reflectionQuestions = [];
    for (const [verseNum, insight] of Object.entries(this.quickInsightsData.verses)) {
      if (insight?.reflection) {
        reflectionQuestions.push(insight.reflection);
      }
      html += `
        <div class="mb-4 pb-4 border-b border-[var(--card-border)] last:border-0">
          <p class="text-[var(--mission-gold)] font-bold mb-2" style="font-size:${labelFontPx}px;">Verse ${verseNum}</p>
          <div class="space-y-3 text-[var(--text-color)]">
            <div><span class="text-[var(--mission-gold)]/70 block mb-1" style="font-size:${metaFontPx}px;">${L.understanding}</span><p class="leading-relaxed" style="font-size:${baseFontPx}px; line-height:1.65;">${insight.understanding || ''}</p></div>
            <div><span class="text-[var(--mission-gold)]/70 block mb-1" style="font-size:${metaFontPx}px;">${L.livingItOut}</span><p class="leading-relaxed" style="font-size:${baseFontPx}px; line-height:1.65;">${insight.livingItOut || ''}</p></div>
            <div><span class="text-[var(--mission-gold)]/70 block mb-1" style="font-size:${metaFontPx}px;">${L.godsLove}</span><p class="leading-relaxed" style="font-size:${baseFontPx}px; line-height:1.65;">${insight.godsLove || ''}</p></div>
          </div>
        </div>
      `;
    }

    const primaryQuestion = reflectionQuestions[0] || '';
    const reflectionValue = this.escapeHTML(this.inlineReflectionDraft.reflection || '');
    const commitmentValue = this.escapeHTML(this.inlineReflectionDraft.commitment || '');
    const prayerDraftValue = this.escapeHTML(this.inlineReflectionDraft.prayerDraft || '');
    const prayerRequests = this.normalizeInlinePrayerRequests(this.inlineReflectionDraft.prayerRequests);
    const shareActive = !!this.inlineReflectionDraft.shareWithGroup;
    const shareTargets = Array.isArray(this.inlineShareTargets) ? this.inlineShareTargets : [];
    const selectedGroupIds = Array.isArray(this.inlineReflectionDraft.shareGroupIds)
      ? this.inlineReflectionDraft.shareGroupIds.map(id => String(id))
      : [];
    const selectedSet = new Set(selectedGroupIds);
    const selectedCount = shareTargets.filter(group => selectedSet.has(String(group.id))).length;
    const allSelected = shareTargets.length > 0 && selectedCount === shareTargets.length;

    if (shareActive && !this.inlineShareTargetsLoading && shareTargets.length === 0) {
      this.ensureInlineShareTargetsLoaded();
    }

    let shareGroupPickerHtml = '';
    if (shareActive) {
      if (this.inlineShareTargetsLoading) {
        shareGroupPickerHtml = `
          <div class="mb-3 p-3 rounded-lg border border-[var(--card-border)] bg-[var(--bg-color)]/30 text-[var(--text-muted)]" style="font-size:${smallFontPx}px;">
            ${lang === 'tl' ? 'Naglo-load ng mga group...' : 'Loading groups...'}
          </div>
        `;
      } else if (shareTargets.length === 0) {
        shareGroupPickerHtml = `
          <div class="mb-3 p-3 rounded-lg border border-[var(--card-border)] bg-[var(--bg-color)]/30 text-[var(--text-muted)]" style="font-size:${smallFontPx}px;">
            ${L.noShareGroups}
          </div>
        `;
      } else {
        const selectAllRow = shareTargets.length > 1 ? `
          <label class="flex items-center gap-2 text-[var(--text-color)] mb-2 cursor-pointer" style="font-size:${metaFontPx}px;">
            <input type="checkbox"
                   class="accent-[var(--mission-gold)]"
                   onchange="BibleReader.toggleInlineShareAll(this.checked)"
                   ${allSelected ? 'checked' : ''}>
            <span>${L.selectAllGroups}</span>
          </label>
        ` : '';

        const groupRows = shareTargets.map((group) => {
          const groupId = String(group.id || '');
          const groupIdForJs = groupId.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
          const checked = selectedSet.has(groupId) ? 'checked' : '';
          const roleLabel = this.getInlineShareRoleLabel(group.type, L);
          const memberCount = Number(group.memberCount || 0);
          const memberText = memberCount > 0 ? ` • ${memberCount} member${memberCount === 1 ? '' : 's'}` : '';
          return `
            <label class="flex items-start gap-2 py-1.5 cursor-pointer">
              <input type="checkbox"
                     class="mt-0.5 accent-[var(--mission-gold)]"
                     onchange="BibleReader.toggleInlineShareGroup('${groupIdForJs}', this.checked)"
                     ${checked}>
              <span class="flex-1 min-w-0">
                <span class="text-[var(--text-color)] font-medium block whitespace-normal break-words leading-snug" style="font-size:${metaFontPx}px;">${this.escapeHTML(group.name || 'Mission Group')}</span>
                <span class="text-[var(--text-muted)] block mt-0.5 whitespace-normal break-words" style="font-size:${smallFontPx}px;">${this.escapeHTML(roleLabel)}${this.escapeHTML(memberText)}</span>
                <span class="text-[var(--text-muted)] block mt-0.5 whitespace-normal break-all" style="font-size:${smallFontPx}px;">${L.groupIdSuffix}: ${this.escapeHTML(groupId)}</span>
              </span>
            </label>
          `;
        }).join('');

        shareGroupPickerHtml = `
          <div class="mb-3 p-3 rounded-lg border border-[var(--card-border)] bg-[var(--bg-color)]/30">
            <p class="text-[var(--text-color)] font-semibold mb-1" style="font-size:${metaFontPx}px;">${L.selectGroups}</p>
            ${selectAllRow}
            <p class="text-[var(--text-muted)] mb-2" style="font-size:${smallFontPx}px;">${shareTargets.length} ${L.availableCount}</p>
            <div class="overflow-y-auto pr-1" style="max-height:45vh;">${groupRows}</div>
            <p class="text-[var(--text-muted)] mt-2" style="font-size:${smallFontPx}px;">${selectedCount} ${L.selectedCount}</p>
          </div>
        `;
      }
    }

    html += `
      <div class="mt-4 p-4 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)]">
        <label class="text-[var(--mission-gold)]/80 font-semibold block mb-1" style="font-size:${labelFontPx}px;">${L.yourAnswer}</label>
        <textarea id="inlineInsightReflectionInput"
                  oninput="BibleReader.setInlineReflection(this.value)"
                  rows="6"
                  class="w-full bg-[var(--input-bg)] border border-[var(--card-border)] rounded-lg p-3 text-[var(--text-color)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--mission-gold)]/50 resize-none mb-3"
                  style="font-size:${baseFontPx}px; line-height:1.6;"
                  placeholder="${L.yourAnswerPlaceholder}">${reflectionValue}</textarea>

        ${primaryQuestion ? `
          <div class="mb-3">
            <span class="text-[var(--mission-gold)]/70 block mb-1" style="font-size:${metaFontPx}px;">${L.reflectionQuestion}</span>
            <p class="text-[var(--text-color)] italic" style="font-size:${headingFontPx}px; line-height:1.5;">"${this.escapeHTML(primaryQuestion)}"</p>
          </div>
        ` : ''}

        <label class="text-[var(--mission-gold)]/80 font-semibold block mb-1" style="font-size:${labelFontPx}px;">${L.iWill}</label>
        <textarea id="inlineInsightCommitmentInput"
                  oninput="BibleReader.setInlineCommitment(this.value)"
                  rows="6"
                  class="w-full bg-[var(--input-bg)] border border-[var(--card-border)] rounded-lg p-3 text-[var(--text-color)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--mission-gold)]/50 resize-none mb-3"
                  style="font-size:${baseFontPx}px; line-height:1.6;"
                  placeholder="${L.iWillPlaceholder}">${commitmentValue}</textarea>

        <div class="mb-3 rounded-lg border border-[var(--card-border)] bg-[var(--bg-color)]/35 p-3">
          <label class="text-[var(--mission-gold)]/80 font-semibold block mb-1" style="font-size:${labelFontPx}px;">🙏 ${L.prayerRequests}</label>
          <div class="flex items-center gap-2 mb-2">
            <input id="inlineInsightPrayerDraftInput"
                   type="text"
                   oninput="BibleReader.setInlinePrayerDraft(this.value)"
                   onkeydown="if(event.key==='Enter'){event.preventDefault();BibleReader.addInlinePrayerRequest();}"
                   class="flex-1 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-lg px-3 py-2 text-[var(--text-color)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--mission-gold)]/50"
                   style="font-size:${baseFontPx}px; line-height:1.45;"
                   placeholder="${L.prayerRequestsPlaceholder}"
                   value="${prayerDraftValue}">
            <button type="button"
                    onclick="BibleReader.addInlinePrayerRequest()"
                    class="px-3 py-2 rounded-lg border border-[var(--mission-gold)]/40 text-[var(--mission-gold)] font-semibold hover:bg-[var(--mission-gold)]/10 transition-colors"
                    style="font-size:${smallFontPx}px;">
              ${L.addPrayerRequest}
            </button>
          </div>
          ${prayerRequests.length > 0 ? `
            <div class="space-y-2 max-h-52 overflow-y-auto pr-1">
              ${prayerRequests.map((item) => {
                const prayerId = String(item.id || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
                const createdAtLabel = this.escapeHTML(this.formatInlinePrayerTimestamp(item.createdAt, lang));
                const text = this.escapeHTML(item.text || '');
                return `
                  <div class="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] p-2.5">
                    <div class="flex items-start justify-between gap-2">
                      <p class="text-[var(--text-color)] leading-snug flex-1" style="font-size:${metaFontPx}px;">${text}</p>
                      <button type="button"
                              onclick="BibleReader.removeInlinePrayerRequest('${prayerId}')"
                              class="text-[var(--text-muted)] hover:text-[var(--mission-red-bright)] transition-colors"
                              style="font-size:${smallFontPx}px;">
                        ${L.removePrayerRequest}
                      </button>
                    </div>
                    <p class="text-[var(--text-muted)] mt-1" style="font-size:${smallFontPx}px;">${L.addedLabel}: ${createdAtLabel}</p>
                  </div>
                `;
              }).join('')}
            </div>
          ` : `
            <p class="text-[var(--text-muted)]" style="font-size:${smallFontPx}px;">${L.noPrayerRequests}</p>
          `}
        </div>

        <div class="flex items-start gap-3 mb-3 p-3 rounded-lg border border-[var(--card-border)] bg-[var(--bg-color)]/40">
          <div class="toggle-switch ${shareActive ? 'active' : ''}" id="inlineInsightShareToggle" onclick="BibleReader.toggleInlineShare()"></div>
          <div class="flex-1">
            <p class="text-[var(--text-color)] font-medium" style="font-size:${labelFontPx}px;">${L.shareWithGroup}</p>
            <p class="text-[var(--text-muted)] mt-1" style="font-size:${smallFontPx}px;">${L.shareWithGroupHelp}</p>
          </div>
        </div>
        ${shareGroupPickerHtml}

        <button id="inlineInsightSaveBtn"
                onclick="BibleReader.saveInlineReflection()"
                class="w-full py-3 rounded-lg bg-[var(--mission-red-bright)] hover:bg-[#8B0000] text-white font-bold transition-colors"
                style="font-size:${labelFontPx}px;">
          ${L.save}
        </button>
      </div>
    `;

    return html;
  },

  escapeHTML(value) {
    const str = String(value || '');
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  },

  setInlineReflection(value) {
    this.inlineReflectionDraft.reflection = value || '';
  },

  setInlineCommitment(value) {
    this.inlineReflectionDraft.commitment = value || '';
  },

  setInlinePrayerDraft(value) {
    this.inlineReflectionDraft.prayerDraft = value || '';
  },

  normalizeInlinePrayerRequests(prayerRequests) {
    if (!Array.isArray(prayerRequests)) return [];
    const seen = new Set();
    const normalized = [];
    prayerRequests.forEach((item) => {
      const text = String(item?.text || '').trim();
      if (!text) return;
      const id = String(item?.id || `prayer_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
      if (seen.has(id)) return;
      seen.add(id);
      normalized.push({
        id,
        text,
        createdAt: item?.createdAt || new Date().toISOString(),
        answered: !!item?.answered,
        answeredAt: item?.answeredAt || null,
        remarks: String(item?.remarks || '').trim()
      });
    });
    return normalized;
  },

  formatInlinePrayerTimestamp(value, lang = 'en') {
    if (!value) return '-';
    try {
      const dt = new Date(value);
      if (Number.isNaN(dt.getTime())) return String(value);
      return dt.toLocaleString(lang === 'tl' ? 'fil-PH' : 'en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      });
    } catch (error) {
      return String(value);
    }
  },

  addInlinePrayerRequest() {
    const draft = String(this.inlineReflectionDraft.prayerDraft || '').trim();
    if (!draft) return;
    const current = this.normalizeInlinePrayerRequests(this.inlineReflectionDraft.prayerRequests);
    current.push({
      id: `prayer_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      text: draft,
      createdAt: new Date().toISOString(),
      answered: false,
      answeredAt: null,
      remarks: ''
    });
    this.inlineReflectionDraft.prayerRequests = current;
    this.inlineReflectionDraft.prayerDraft = '';
    this.refreshFullscreenInsightsPanel();
  },

  removeInlinePrayerRequest(prayerId) {
    const targetId = String(prayerId || '');
    if (!targetId) return;
    this.inlineReflectionDraft.prayerRequests = this.normalizeInlinePrayerRequests(this.inlineReflectionDraft.prayerRequests)
      .filter(item => String(item.id) !== targetId);
    this.refreshFullscreenInsightsPanel();
  },

  getInlinePrayerRequestsForSave() {
    const current = this.normalizeInlinePrayerRequests(this.inlineReflectionDraft.prayerRequests);
    const pendingDraft = String(this.inlineReflectionDraft.prayerDraft || '').trim();
    if (!pendingDraft) return current;
    current.push({
      id: `prayer_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      text: pendingDraft,
      createdAt: new Date().toISOString(),
      answered: false,
      answeredAt: null,
      remarks: ''
    });
    return current;
  },

  getInlineShareRoleLabel(type, labels) {
    if (type === 'upline') return labels.roleUpline;
    if (type === 'downline') return labels.roleDownline;
    if (type === 'guest') return labels.roleGuest;
    return labels.roleGroup;
  },

  async ensureInlineShareTargetsLoaded(force = false) {
    if (!force && this.inlineShareTargets.length > 0) return;
    if (this.inlineShareTargetsLoading) return;
    if (typeof window.getDevotionShareTargets !== 'function') {
      this.inlineShareTargets = [];
      this.inlineReflectionDraft.shareGroupIds = [];
      return;
    }

    this.inlineShareTargetsLoading = true;
    this.refreshFullscreenInsightsPanel();

    try {
      const targets = await window.getDevotionShareTargets();
      this.inlineShareTargets = Array.isArray(targets)
        ? targets
          .filter(group => group?.id)
          .map(group => ({
            id: String(group.id),
            name: group.name || 'Mission Group',
            type: group.type || 'group',
            memberCount: Number(group.memberCount || 0)
          }))
        : [];

      const validIds = new Set(this.inlineShareTargets.map(group => group.id));
      const currentSelection = Array.isArray(this.inlineReflectionDraft.shareGroupIds)
        ? this.inlineReflectionDraft.shareGroupIds.map(id => String(id)).filter(id => validIds.has(id))
        : [];

      if (currentSelection.length > 0) {
        this.inlineReflectionDraft.shareGroupIds = currentSelection;
      } else if (this.inlineShareTargets.length > 0) {
        const currentGroupId = (typeof Groups !== 'undefined' && Groups.currentGroup?.id)
          ? String(Groups.currentGroup.id)
          : null;
        if (currentGroupId && validIds.has(currentGroupId)) {
          this.inlineReflectionDraft.shareGroupIds = [currentGroupId];
        } else {
          this.inlineReflectionDraft.shareGroupIds = [this.inlineShareTargets[0].id];
        }
      } else {
        this.inlineReflectionDraft.shareGroupIds = [];
      }
    } catch (error) {
      console.error('[BibleReader] Could not load share targets:', error);
      this.inlineShareTargets = [];
      this.inlineReflectionDraft.shareGroupIds = [];
    } finally {
      this.inlineShareTargetsLoading = false;
      this.refreshFullscreenInsightsPanel();
    }
  },

  async toggleInlineShare() {
    const current = !!this.inlineReflectionDraft.shareWithGroup;
    this.inlineReflectionDraft.shareWithGroup = !current;
    if (this.inlineReflectionDraft.shareWithGroup) {
      await this.ensureInlineShareTargetsLoaded(true);
    }
    this.refreshFullscreenInsightsPanel();
  },

  toggleInlineShareGroup(groupId, checked) {
    const id = String(groupId || '');
    if (!id) return;
    const selected = new Set((this.inlineReflectionDraft.shareGroupIds || []).map(v => String(v)));
    if (checked) {
      selected.add(id);
    } else {
      selected.delete(id);
    }
    this.inlineReflectionDraft.shareGroupIds = Array.from(selected);
    this.refreshFullscreenInsightsPanel();
  },

  toggleInlineShareAll(checked) {
    if (checked) {
      this.inlineReflectionDraft.shareGroupIds = this.inlineShareTargets.map(group => String(group.id));
    } else {
      this.inlineReflectionDraft.shareGroupIds = [];
    }
    this.refreshFullscreenInsightsPanel();
  },

  getSelectedInlineShareGroupIds() {
    const validIds = new Set(this.inlineShareTargets.map(group => String(group.id)));
    return (this.inlineReflectionDraft.shareGroupIds || [])
      .map(id => String(id))
      .filter(id => validIds.has(id));
  },

  getPrimaryReflectionQuestion() {
    if (!this.quickInsightsData?.verses) return '';
    for (const insight of Object.values(this.quickInsightsData.verses)) {
      if (insight?.reflection) return insight.reflection;
    }
    return '';
  },

  async saveInlineReflection() {
    const lang = this.bibleTranslation || ((typeof i18n !== 'undefined') ? i18n.getLang() : 'en');
    const isTagalog = lang === 'tl';
    const understanding = (this.inlineReflectionDraft.reflection || '').trim();
    const action = (this.inlineReflectionDraft.commitment || '').trim();
    const prayerRequests = this.getInlinePrayerRequestsForSave();
    const question = this.getPrimaryReflectionQuestion();
    const shareWithGroup = !!this.inlineReflectionDraft.shareWithGroup;
    const shareGroupIds = shareWithGroup ? this.getSelectedInlineShareGroupIds() : [];

    if (!understanding) {
      alert(isTagalog ? 'Pakisulat muna ang iyong pagkaunawa bago i-save.' : 'Please write your understanding before saving.');
      return;
    }
    if (!action) {
      alert(isTagalog ? 'Pakisulat muna ang iyong "Aking gagawin" bago i-save.' : 'Please write your "I will" commitment before saving.');
      return;
    }
    if (shareWithGroup && shareGroupIds.length === 0) {
      alert(isTagalog ? 'Pakipili muna ng kahit isang group na pagse-share-an.' : 'Please choose at least one group to share with.');
      return;
    }

    const saveBtn = document.getElementById('inlineInsightSaveBtn');
    const originalLabel = saveBtn?.innerHTML || '💾 Save Reflection';
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.innerHTML = 'Saving...';
    }

    try {
      if (typeof window.saveReflectionFromInsights !== 'function') {
        alert('Save function is unavailable. Please refresh and try again.');
        return;
      }

      const result = await window.saveReflectionFromInsights({
        understanding,
        action,
        prayerRequests,
        question,
        shareWithGroup,
        shareGroupIds
      });

      if (result?.missingGroup) {
        alert('No mission group found. Your reflection was saved to Journal but not shared to group.');
      }

      if (result?.saved) {
        this.inlineReflectionDraft.reflection = '';
        this.inlineReflectionDraft.commitment = '';
        this.inlineReflectionDraft.prayerRequests = [];
        this.inlineReflectionDraft.prayerDraft = '';
        this.refreshFullscreenInsightsPanel();
      }
    } catch (error) {
      console.error('[BibleReader] Could not save inline reflection:', error);
      alert('Error saving reflection. Please try again.');
    } finally {
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.innerHTML = originalLabel;
      }
    }
  },

  /**
   * Exit fullscreen mode
   */
  exitFullscreen() {
    this.preferences.isFullscreen = false;
    
    const overlay = document.getElementById('bibleFullscreenOverlay');
    if (overlay) {
      overlay.style.opacity = '0';
      setTimeout(() => {
        overlay.remove();
        document.body.style.overflow = '';
      }, 200);
    }
    
    // Re-render main view to sync highlights
    this.renderVerses();
    
  },

  /**
   * Update fullscreen content after navigation or highlight change
   */
  updateFullscreenContent() {
    setTimeout(() => {
      const fullscreenText = document.getElementById('fullscreenBibleText');
      const bookTitleEl = document.getElementById('fullscreenBookTitle');
      const commentaryContent = document.getElementById('fullscreenCommentaryContent');
      const commentaryBtn = document.getElementById('fullscreenCommentaryBtn');
      const commentaryCount = document.getElementById('fullscreenCommentaryCount');
      
      if (fullscreenText) {
        fullscreenText.innerHTML = this.generateVersesHTML();
        fullscreenText.style.fontSize = `${this.preferences.fontSize}px`;
      }
      
      // Update book title with correct translation
      if (bookTitleEl) {
        const bookName = BibleLoader.getBookName(this.currentBook, this.bibleTranslation);
        bookTitleEl.textContent = `${bookName} ${this.currentChapter}`;
      }
      
      // Update chapter label in navigation
      const chapterLabel = document.getElementById('fullscreenChapterLabel');
      if (chapterLabel) {
        chapterLabel.textContent = `Chapter ${this.currentChapter}`;
      }
      
      // Update translation dropdown
      this.updateTranslationDropdown();
      
      // Update commentary panel
      if (commentaryContent) {
        commentaryContent.innerHTML = this.generateCommentaryHTML();
        commentaryContent.style.fontSize = `${this.preferences.fontSize}px`;
      }
      
      // Update commentary button state
      const hasHighlights = this.highlightedVerses.length > 0;
      if (commentaryBtn) {
        if (hasHighlights) {
          commentaryBtn.classList.remove('bg-[var(--card-border)]', 'text-[var(--text-dim)]', 'cursor-not-allowed');
          commentaryBtn.classList.add('bg-[var(--mission-gold)]/15', 'text-[var(--mission-gold)]', 'hover:bg-[var(--mission-gold)]/25');
          commentaryBtn.disabled = false;
        } else {
          commentaryBtn.classList.add('bg-[var(--card-border)]', 'text-[var(--text-dim)]', 'cursor-not-allowed');
          commentaryBtn.classList.remove('bg-[var(--mission-gold)]/15', 'text-[var(--mission-gold)]', 'hover:bg-[var(--mission-gold)]/25');
          commentaryBtn.disabled = true;
        }
      }
      
      if (commentaryCount) {
        commentaryCount.textContent = `(${this.highlightedVerses.length})`;
        commentaryCount.classList.toggle('hidden', !hasHighlights);
      }
      
    }, 200);
  },

  /**
   * Generate HTML for verses (used by both normal and fullscreen views)
   */
  generateVersesHTML() {
    if (!this.chapterData) return '<p class="text-[var(--text-muted)]">Loading...</p>';
    
    const verses = this.chapterData.verses;
    let html = '';
    
    for (const [verseNum, verseText] of Object.entries(verses)) {
      const highlighted = this.highlightedVerses.find(h => h.verse === parseInt(verseNum));
      let highlightStyle = '';
      
      if (highlighted) {
        const colorConfig = this.highlightColors[highlighted.color] || this.highlightColors.gold;
        highlightStyle = `background: ${colorConfig.bg}; border-left: 3px solid ${colorConfig.border}; padding-left: 8px; margin-left: -11px;`;
      }
      
      html += `
        <span class="verse inline" 
              data-verse="${verseNum}" 
              onclick="BibleReader.toggleHighlight(${verseNum})"
              style="${highlightStyle}">
          <span class="verse-num">${verseNum}</span>${verseText}
        </span> `;
    }
    
    return html;
  },

  /**
   * Update color picker UI in fullscreen
   */
  updateColorPickerUI() {
    const buttons = document.querySelectorAll('#bibleFullscreenOverlay [onclick^="BibleReader.setHighlightColor"]');
    buttons.forEach(btn => {
      const color = btn.getAttribute('onclick').match(/'(\w+)'/)?.[1];
      if (color) {
        btn.classList.toggle('border-white', this.preferences.highlightColor === color);
        btn.classList.toggle('scale-110', this.preferences.highlightColor === color);
        btn.classList.toggle('border-transparent', this.preferences.highlightColor !== color);
      }
    });
    
    // Re-render verses with new color
    const fullscreenText = document.getElementById('fullscreenBibleText');
    if (fullscreenText) {
      fullscreenText.innerHTML = this.generateVersesHTML();
    }
  },

  /**
   * Load and display a chapter
   */
  async loadChapter(bookId, chapter) {
    console.log(`[BibleReader] Loading ${bookId} ${chapter}`);
    
    this.currentBook = bookId;
    this.currentChapter = chapter;
    this.highlightedVerses = [];
    this.insightsLoading = false;
    this.insightsLastError = null;
    
    // Use Bible-specific translation (not global language)
    // Load chapter data using BibleLoader
    if (typeof BibleLoader !== 'undefined') {
      this.chapterData = await BibleLoader.getChapter(bookId, chapter, this.bibleTranslation);
    }
    
    if (!this.chapterData) {
      this.showError('Could not load chapter');
      return;
    }
    
    // Update UI
    this.renderPassageTitle();
    this.renderVerses();
    this.renderProgress();
    this.updateNavButtons();
    
    // Clear commentary
    this.clearCommentary();
    
    // Save progress
    await this.saveProgress();
    
    // Add to recent readings in BiblePicker
    if (typeof BiblePicker !== 'undefined') {
      BiblePicker.addRecentReading(bookId, chapter);
    }
    
    // Update fullscreen content if in fullscreen mode
    if (this.preferences.isFullscreen) {
      this.updateFullscreenContent();
    }
  },

  /**
   * Reload when global language changes - only affects Quick Insights, NOT Bible text
   * Bible text stays in the selected translation (bibleTranslation)
   */
  async reloadChapterForLanguageChange() {
    console.log(`[BibleReader] Global language changed, reloading insights only (Bible stays in ${this.bibleTranslation})`);
    
    // Bible text does NOT change - it uses bibleTranslation, not global language
    // Only reload insights in the new global language if verses are highlighted
    if (this.highlightedVerses.length > 0) {
      await this.loadCommentary();
    }
    
    // Update fullscreen content if in fullscreen mode
    if (this.preferences.isFullscreen) {
      this.updateFullscreenContent();
    }
  },

  /**
   * Render passage title with picker trigger (for collapsed view)
   * Note: This is the main title that opens BiblePicker
   */
  renderPassageTitle() {
    if (!this.elements.passageTitle) return;
    
    // Get book name in the current Bible translation
    const bookName = BibleLoader.getBookName(this.currentBook, this.bibleTranslation);
    
    this.elements.passageTitle.textContent = `${bookName} ${this.currentChapter}`;
    
    // Sync the preview dropdown
    const previewDropdown = document.getElementById('bibleTranslationPreview');
    if (previewDropdown) {
      previewDropdown.value = this.bibleTranslation;
    }
  },
  
  /**
   * Switch Bible translation (EN/TL) - only affects Bible text, NOT insights
   */
  async setBibleTranslation(lang) {
    if (lang !== 'en' && lang !== 'tl') return;
    if (lang === this.bibleTranslation) return;
    
    console.log(`[BibleReader] Switching Bible translation to ${lang}`);
    this.bibleTranslation = lang;
    
    // Save preference
    localStorage.setItem('goMission_bibleTranslation', lang);
    
    // Reload chapter in new translation (keep highlights)
    const savedHighlights = [...this.highlightedVerses];
    
    if (typeof BibleLoader !== 'undefined') {
      this.chapterData = await BibleLoader.getChapter(this.currentBook, this.currentChapter, this.bibleTranslation);
    }
    
    if (!this.chapterData) {
      this.showError('Could not load chapter');
      return;
    }
    
    // Restore highlights
    this.highlightedVerses = savedHighlights;
    
    // Update UI
    this.renderPassageTitle();
    this.renderVerses();

    // Refresh insights in the selected Bible translation
    if (this.highlightedVerses.length > 0) {
      await this.loadCommentary();
    }
    
    // Update fullscreen if open
    if (this.preferences.isFullscreen) {
      this.updateFullscreenContent();
      this.updateTranslationDropdown();
    }
  },
  
  /**
   * Update translation dropdown UI (both preview and fullscreen)
   */
  updateTranslationDropdown() {
    const previewDropdown = document.getElementById('bibleTranslationPreview');
    const fullscreenDropdown = document.getElementById('bibleTranslationSelect');
    
    if (previewDropdown) {
      previewDropdown.value = this.bibleTranslation;
    }
    if (fullscreenDropdown) {
      fullscreenDropdown.value = this.bibleTranslation;
    }
  },

  /**
   * Render verses with tap-to-highlight
   */
  renderVerses() {
    if (!this.elements.bibleText || !this.chapterData) return;
    
    this.elements.bibleText.innerHTML = this.generateVersesHTML();
    this.applyFontSize();
    
    // Also update fullscreen if open
    if (this.preferences.isFullscreen) {
      const fullscreenText = document.getElementById('fullscreenBibleText');
      if (fullscreenText) {
        fullscreenText.innerHTML = this.generateVersesHTML();
      }
    }
  },

  /**
   * Render progress indicator
   */
  renderProgress() {
    // Create progress indicator if it doesn't exist
    let progressEl = document.getElementById('chapterProgress');
    
    if (!progressEl) {
      // Find the passage title container and add progress next to it
      const titleContainer = this.elements.passageTitle?.parentElement;
      if (titleContainer) {
        const progressDiv = document.createElement('div');
        progressDiv.id = 'chapterProgress';
        progressDiv.className = 'text-[10px] text-[var(--text-muted)] flex items-center gap-1';
        titleContainer.appendChild(progressDiv);
        progressEl = progressDiv;
      }
    }
    
    if (!progressEl) return;
    
    // Get total chapters for this book
    const totalChapters = (typeof BiblePicker !== 'undefined') 
      ? BiblePicker.books[this.currentBook]?.chapters || 1
      : 1;
    
    // Calculate progress
    const percent = Math.round((this.currentChapter / totalChapters) * 100);
    
    // Create progress dots (max 10 dots)
    const dotsCount = Math.min(totalChapters, 10);
    const filledDots = Math.ceil((this.currentChapter / totalChapters) * dotsCount);
    
    let dotsHtml = '';
    for (let i = 0; i < dotsCount; i++) {
      dotsHtml += `<span class="w-1.5 h-1.5 rounded-full ${i < filledDots ? 'bg-[var(--accent-active)]' : 'bg-[var(--card-border)]'}"></span>`;
    }
    
    progressEl.innerHTML = `
      <span>Chapter ${this.currentChapter} of ${totalChapters}</span>
      <span class="flex gap-0.5 ml-2">${dotsHtml}</span>
    `;
  },

  /**
   * Update prev/next navigation buttons
   */
  updateNavButtons() {
    // Get total chapters
    const totalChapters = (typeof BiblePicker !== 'undefined') 
      ? BiblePicker.books[this.currentBook]?.chapters || 1
      : 1;
    
    // Create nav buttons if they don't exist
    let navContainer = document.getElementById('chapterNavigation');
    
    if (!navContainer) {
      // Find a good place to insert navigation
      const bibleTextContainer = this.elements.bibleText?.parentElement;
      if (bibleTextContainer) {
        navContainer = document.createElement('div');
        navContainer.id = 'chapterNavigation';
        navContainer.className = 'flex justify-between items-center py-3 border-b border-[var(--card-border)]';
        
        // Insert before bible text
        bibleTextContainer.insertBefore(navContainer, this.elements.bibleText);
      }
    }
    
    if (!navContainer) return;
    
    const hasPrev = this.currentChapter > 1;
    const hasNext = this.currentChapter < totalChapters;
    
    navContainer.innerHTML = `
      <button onclick="BibleReader.prevChapter()" 
              class="flex items-center gap-1 text-xs ${hasPrev ? 'text-[var(--mission-gold)] hover:opacity-85' : 'text-[var(--text-dim)] cursor-not-allowed'}"
              ${!hasPrev ? 'disabled' : ''}>
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
        </svg>
        <span>Prev</span>
      </button>
      
      <button onclick="BiblePicker.open()" class="text-xs text-[var(--text-muted)] hover:text-[var(--mission-gold)]">
        Chapter ${this.currentChapter}
      </button>
      
      <button onclick="BibleReader.nextChapter()" 
              class="flex items-center gap-1 text-xs ${hasNext ? 'text-[var(--mission-gold)] hover:opacity-85' : 'text-[var(--text-dim)] cursor-not-allowed'}"
              ${!hasNext ? 'disabled' : ''}>
        <span>Next</span>
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
        </svg>
      </button>
    `;
  },

  /**
   * Toggle verse highlight - each verse stores its own color
   */
  async toggleHighlight(verseNum) {
    const existingIndex = this.highlightedVerses.findIndex(h => h.verse === verseNum);
    
    if (existingIndex > -1) {
      // Remove highlight
      this.highlightedVerses.splice(existingIndex, 1);
    } else {
      // Add highlight with current color
      this.highlightedVerses.push({
        verse: verseNum,
        color: this.preferences.highlightColor
      });
    }
    
    // Sort highlighted verses by verse number
    this.highlightedVerses.sort((a, b) => a.verse - b.verse);
    
    // Re-render verses
    this.renderVerses();
    
    // Load commentary for highlighted verses
    if (this.highlightedVerses.length > 0) {
      await this.loadCommentary();
    } else {
      this.clearCommentary();
    }
    
    // Update fullscreen content if in fullscreen mode
    if (this.preferences.isFullscreen) {
      this.updateFullscreenContent();
    }
  },

  /**
   * Load and display Quick Insights for highlighted verses
   */
  async loadCommentary() {
    if (this.highlightedVerses.length === 0) return;
    
    // Insights should follow Bible translation selector (TL/EN), not global app language.
    const lang = this.bibleTranslation || 'en';
    const requestId = ++this.commentaryRequestId;

    this.insightsLoading = true;
    this.insightsLastError = null;
    this.refreshFullscreenInsightsPanel();
    
    // Extract just verse numbers from highlighted verses
    const verseNumbers = this.highlightedVerses.map(h => h.verse);
    
    // Get Quick Insights first so panel is responsive, even if deeper notes are slower.
    if (typeof BibleLoader !== 'undefined') {
      try {
        const quickInsights = await BibleLoader.getQuickInsights(
          this.currentBook,
          this.currentChapter,
          verseNumbers,
          lang
        );

        if (requestId !== this.commentaryRequestId) return;

        this.quickInsightsData = quickInsights || {
          book: this.currentBook,
          chapter: this.currentChapter,
          verses: {}
        };

        this.insightsLoading = false;
        this.refreshFullscreenInsightsPanel();
      } catch (error) {
        console.error('[BibleReader] Quick Insights load error:', error);
        if (requestId !== this.commentaryRequestId) return;
        this.insightsLoading = false;
        this.insightsLastError = error?.message || String(error);
        this.quickInsightsData = {
          book: this.currentBook,
          chapter: this.currentChapter,
          verses: {}
        };
        this.refreshFullscreenInsightsPanel();
      }

      this.tyndaleData = null;
      this.renderCommentary();
      if (this.preferences.isFullscreen) {
        this.updateFullscreenContent();
      }

      try {
        const tyndale = await BibleLoader.getTyndale(
          this.currentBook,
          this.currentChapter,
          verseNumbers
        );

        if (requestId !== this.commentaryRequestId) return;

        this.tyndaleData = tyndale;
      } catch (error) {
        console.warn('[BibleReader] Tyndale load error:', error);
        if (requestId !== this.commentaryRequestId) return;
        this.tyndaleData = null;
      }
    }
    
    this.renderCommentary();
    if (this.preferences.isFullscreen) {
      this.updateFullscreenContent();
    }
  },

  /**
   * Immediately refresh the fullscreen insights panel (if present).
   * This avoids the UI getting stuck on stale placeholder text while data loads.
   */
  refreshFullscreenInsightsPanel() {
    const commentaryContent = document.getElementById('fullscreenCommentaryContent');
    if (!commentaryContent) return;
    commentaryContent.innerHTML = this.generateCommentaryHTML();
    commentaryContent.style.fontSize = `${this.preferences.fontSize}px`;
  },

  /**
   * Render Quick Insights - 3-section format with Dig Deeper option
   * Commentary section is shown but collapsed (user clicks to expand)
   */
  renderCommentary() {
    const commentarySection = document.getElementById('commentarySection');
    const commentaryContent = document.getElementById('commentaryContent');
    const commentaryArrow = document.getElementById('commentaryArrow');
    
    if (!commentarySection || !commentaryContent) return;
    
    const lang = this.bibleTranslation || ((typeof i18n !== 'undefined') ? i18n.getLang() : 'en');
    
    // Section labels
    const labels = {
      en: {
        understanding: '📖 Understanding This Verse',
        livingItOut: '🚶 Living It Out',
        godsLove: '❤️ See God\'s Love',
        digDeeper: '📚 Dig Deeper (Tyndale)',
        noInsights: 'No insights available for this verse yet.',
        tapVerses: 'Tap verses above to see insights'
      },
      tl: {
        understanding: '📖 Unawain ang Talata',
        livingItOut: '🚶 Isabuhay Ito',
        godsLove: '❤️ Makita ang Pag-ibig ng Diyos',
        digDeeper: '📚 Dig Deeper (Tyndale)',
        noInsights: 'Wala pang insights para sa talatang ito.',
        tapVerses: 'I-tap ang mga talata sa itaas para makita ang insights'
      }
    };
    const L = labels[lang] || labels.en;
    
    // Show the "Help me understand" button when verses are highlighted
    commentarySection.classList.remove('hidden');
    
    // Keep content collapsed by default (don't auto-expand)
    commentaryContent.classList.add('hidden');
    if (commentaryArrow) commentaryArrow.style.transform = '';
    
    if (!this.quickInsightsData || !this.quickInsightsData.verses || Object.keys(this.quickInsightsData.verses).length === 0) {
      commentaryContent.innerHTML = `
        <p class="text-[var(--text-muted)] italic text-sm">${L.noInsights}</p>
      `;
      return;
    }
    
    let html = '';
    
    // Collect reflection questions to update the REFLECT section
    const reflectionQuestions = [];
    
    // Show insights for each highlighted verse
    for (const [verseNum, insight] of Object.entries(this.quickInsightsData.verses)) {
      const tyndaleNote = this.tyndaleData?.verses?.[verseNum];
      const uniqueId = `insight-${verseNum}`;
      
      // Collect reflection question
      if (insight.reflection) {
        reflectionQuestions.push(insight.reflection);
      }
      
      html += `
        <div class="mb-5 pb-4 border-b border-[var(--card-border)] last:border-0 last:pb-0 last:mb-0">
          <p class="text-[var(--mission-gold)] font-bold text-sm mb-3">Verse ${verseNum}</p>
          
          <!-- Understanding -->
          <div class="mb-3">
            <p class="text-[var(--mission-gold)]/80 text-xs font-semibold mb-1">${L.understanding}</p>
            <p class="text-sm text-[var(--text-color)] leading-relaxed">${insight.understanding || ''}</p>
          </div>
          
          <!-- Living It Out -->
          <div class="mb-3">
            <p class="text-[var(--mission-gold)]/80 text-xs font-semibold mb-1">${L.livingItOut}</p>
            <p class="text-sm text-[var(--text-color)] leading-relaxed">${insight.livingItOut || ''}</p>
          </div>
          
          <!-- God's Love -->
          <div class="mb-3">
            <p class="text-[var(--mission-gold)]/80 text-xs font-semibold mb-1">${L.godsLove}</p>
            <p class="text-sm text-[var(--text-color)] leading-relaxed">${insight.godsLove || ''}</p>
          </div>
          
          ${tyndaleNote ? `
          <!-- Dig Deeper Toggle -->
          <div class="mt-3">
            <button onclick="BibleReader.toggleDigDeeper('${uniqueId}')" 
                    id="${uniqueId}-btn"
                    class="text-xs text-[var(--mission-gold)]/70 hover:text-[var(--mission-gold)] flex items-center gap-1 transition-colors">
              <span id="${uniqueId}-icon">▶</span>
              <span>${L.digDeeper}</span>
            </button>
            <div id="${uniqueId}-content" class="hidden mt-2 p-3 bg-[var(--card-bg)] rounded-lg border border-[var(--card-border)]">
              <p class="text-xs text-[var(--text-muted)] leading-relaxed">${tyndaleNote}</p>
            </div>
          </div>
          ` : ''}
        </div>
      `;
    }
    
    commentaryContent.innerHTML = html;
    
    // Update the REFLECT section with the reflection question(s)
    this.updateReflectSection(reflectionQuestions);
  },
  
  /**
   * Update the REFLECT section with AI-generated reflection questions
   */
  updateReflectSection(questions) {
    const reflectSection = document.getElementById('reflectSection');
    const reflectionEl = document.getElementById('reflectionQuestion');
    
    if (!reflectionEl || questions.length === 0) {
      // Hide the AI reflection card if no questions
      if (reflectSection) {
        const aiReflectCard = document.getElementById('aiReflectCard');
        if (aiReflectCard) aiReflectCard.classList.add('hidden');
      }
      return;
    }
    
    const lang = (typeof i18n !== 'undefined') ? i18n.getLang() : 'en';
    
    // Show the AI reflection card
    const aiReflectCard = document.getElementById('aiReflectCard');
    if (aiReflectCard) aiReflectCard.classList.remove('hidden');
    
    // If multiple verses highlighted, combine questions or show first
    let questionHtml = '';
    if (questions.length === 1) {
      questionHtml = questions[0];
    } else {
      // Show the first question for multiple verses
      questionHtml = questions[0];
    }
    
    reflectionEl.innerHTML = `<span class="italic">"${questionHtml}"</span>`;
  },

  /**
   * Toggle Dig Deeper section
   */
  toggleDigDeeper(uniqueId) {
    const content = document.getElementById(`${uniqueId}-content`);
    const icon = document.getElementById(`${uniqueId}-icon`);
    
    if (content && icon) {
      const isHidden = content.classList.contains('hidden');
      
      if (isHidden) {
        content.classList.remove('hidden');
        icon.textContent = '▼';
      } else {
        content.classList.add('hidden');
        icon.textContent = '▶';
      }
    }
  },

  /**
   * Toggle commentary expand/collapse (legacy - kept for compatibility)
   */
  toggleCommentaryExpand(uniqueId) {
    const preview = document.getElementById(`${uniqueId}-preview`);
    const full = document.getElementById(`${uniqueId}-full`);
    const btn = document.getElementById(`${uniqueId}-btn`);
    
    if (preview && full && btn) {
      const isExpanded = full.classList.contains('hidden');
      
      if (isExpanded) {
        // Expand
        preview.classList.add('hidden');
        full.classList.remove('hidden');
        btn.textContent = 'Show less';
      } else {
        // Collapse
        preview.classList.remove('hidden');
        full.classList.add('hidden');
        btn.textContent = 'Read more';
      }
    }
  },

  /**
   * Clear commentary/insights - hide section when no verses highlighted
   */
  clearCommentary() {
    const commentarySection = document.getElementById('commentarySection');
    const commentaryContent = document.getElementById('commentaryContent');
    
    // Hide the entire commentary section
    if (commentarySection) commentarySection.classList.add('hidden');
    if (commentaryContent) commentaryContent.classList.add('hidden');
    
    this.quickInsightsData = null;
    this.tyndaleData = null;
    this.inlineReflectionDraft.reflection = '';
    this.inlineReflectionDraft.commitment = '';
    this.inlineReflectionDraft.prayerRequests = [];
    this.inlineReflectionDraft.prayerDraft = '';
    this.inlineReflectionDraft.shareWithGroup = null;
    this.inlineReflectionDraft.shareGroupIds = [];
    this.inlineShareTargets = [];
    this.inlineShareTargetsLoading = false;
    this.insightsLoading = false;
    this.insightsLastError = null;
    this.commentaryRequestId += 1;

    this.refreshFullscreenInsightsPanel();
    
    // Hide AI reflection card
    const aiReflectCard = document.getElementById('aiReflectCard');
    if (aiReflectCard) aiReflectCard.classList.add('hidden');
  },

  /**
   * Go to previous chapter
   */
  prevChapter() {
    if (this.currentChapter > 1) {
      this.loadChapter(this.currentBook, this.currentChapter - 1);
    }
  },

  /**
   * Go to next chapter
   */
  nextChapter() {
    const totalChapters = (typeof BiblePicker !== 'undefined') 
      ? BiblePicker.books[this.currentBook]?.chapters || 1
      : 1;
    
    if (this.currentChapter < totalChapters) {
      this.loadChapter(this.currentBook, this.currentChapter + 1);
    }
  },

  /**
   * Get currently highlighted verses (for saving devotion)
   */
  getHighlightedVerses() {
    return this.highlightedVerses;
  },

  /**
   * Get current reading info (for saving devotion)
   */
  getCurrentReading() {
    return {
      book: this.currentBook,
      chapter: this.currentChapter,
      highlightedVerses: this.highlightedVerses // Return full objects with color info
    };
  },

  /**
   * Show error message
   */
  showError(message) {
    if (this.elements.bibleText) {
      this.elements.bibleText.innerHTML = `
        <div class="text-center py-8">
          <p class="text-[var(--mission-red-bright)] text-sm">${message}</p>
          <button onclick="BibleReader.loadChapter('JHN', 3)" class="mt-4 text-[var(--mission-gold)] text-xs hover:underline">
            Start with John 3
          </button>
        </div>
      `;
    }
  }
};

// Auto-initialize when DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    // Wait a bit for other modules to load
    setTimeout(() => BibleReader.init(), 100);
  });
} else {
  setTimeout(() => BibleReader.init(), 100);
}

// Export
if (typeof window !== 'undefined') {
  window.BibleReader = BibleReader;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BibleReader;
}
