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
  inlineEditorSession: null,
  pendingInlineSavePayload: null,
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
  speech: {
    supported: typeof window !== 'undefined'
      && 'speechSynthesis' in window
      && 'SpeechSynthesisUtterance' in window,
    voices: [],
    isSpeaking: false,
    currentUtterance: null
  },
  lastSelectedVerse: null,
  storageKeys: {
    lastSelectedVerse: 'goMission_bibleLastSelectedVerse'
  },

  /**
   * Initialize the reader
   */
  async init() {
    console.log('[BibleReader] Initializing...');
    
    // Load saved progress and preferences
    await this.loadProgress();
    this.loadPreferences();
    this.loadLastSelectedVerse();
    this.initNarration();
    
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
      if (e.key === 'Escape') {
        if (document.getElementById('inlineFieldEditorOverlay')) {
          this.closeInlineFieldEditor();
          return;
        }
        if (document.getElementById('inlineSharePreviewOverlay')) {
          this.closeInlineSharePreview();
          return;
        }
      }
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
      previewAudioBtn: document.getElementById('bibleAudioPreviewBtn'),
      progressIndicator: document.getElementById('chapterProgress'),
      prevBtn: document.getElementById('prevChapterBtn'),
      nextBtn: document.getElementById('nextChapterBtn')
    };
  },

  /**
   * Initialize browser narration voices and keep button state in sync.
   */
  initNarration() {
    if (!this.speech.supported) return;

    this.loadNarrationVoices();
    this.updateNarrationButtons();

    if (typeof window.speechSynthesis?.addEventListener === 'function') {
      window.speechSynthesis.addEventListener('voiceschanged', () => {
        this.loadNarrationVoices();
        this.updateNarrationButtons();
      });
    }
  },

  /**
   * Refresh voice list from browser.
   */
  loadNarrationVoices() {
    if (!this.speech.supported) return [];
    try {
      this.speech.voices = window.speechSynthesis.getVoices() || [];
    } catch (error) {
      this.speech.voices = [];
    }
    return this.speech.voices;
  },

  /**
   * Heuristic selection for a warm, male-leaning Filipino-friendly voice.
   */
  getPreferredNarrationVoice() {
    if (!this.speech.supported) return null;

    const voices = this.speech.voices?.length ? this.speech.voices : this.loadNarrationVoices();
    if (!voices.length) return null;

    const preferredLocales = this.bibleTranslation === 'tl'
      ? ['fil-PH', 'tl-PH', 'fil', 'tl', 'en-PH', 'en-US']
      : ['en-PH', 'en-US', 'en-GB', 'fil-PH', 'tl-PH'];
    const maleHints = ['male', 'david', 'daniel', 'george', 'james', 'mark', 'paul', 'jose', 'juan', 'antonio', 'michael', 'thomas'];
    const femaleHints = ['female', 'zira', 'hazel', 'aria', 'samantha', 'susan', 'jenny', 'linda', 'maria', 'anna', 'ava'];

    const scored = voices.map((voice) => {
      const voiceName = String(voice.name || '').toLowerCase();
      const voiceLang = String(voice.lang || '').toLowerCase();
      let score = 0;

      preferredLocales.forEach((locale, index) => {
        const normalized = locale.toLowerCase();
        if (voiceLang === normalized) {
          score += 30 - index;
        } else if (voiceLang.startsWith(normalized.split('-')[0])) {
          score += 18 - index;
        }
      });

      if (voice.localService) score += 2;
      if (maleHints.some((hint) => voiceName.includes(hint))) score += 8;
      if (femaleHints.some((hint) => voiceName.includes(hint))) score -= 6;
      if (voiceName.includes('filip')) score += 5;
      if (voiceName.includes('tagalog')) score += 5;
      if (voiceName.includes('english') && this.bibleTranslation === 'en') score += 2;

      return { voice, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored[0]?.voice || null;
  },

  /**
   * Build chapter narration text with explicit verse markers for clear pacing.
   */
  buildNarrationText() {
    if (!this.chapterData?.verses) return '';

    const bookName = (typeof BibleLoader !== 'undefined')
      ? BibleLoader.getBookName(this.currentBook, this.bibleTranslation)
      : this.currentBook;
    const intro = this.bibleTranslation === 'tl'
      ? `${bookName} kabanata ${this.currentChapter}. Makinig tayo sa Salita ng Diyos.`
      : `${bookName} chapter ${this.currentChapter}. Listen to God's Word.`;

    const versesText = Object.entries(this.chapterData.verses)
      .map(([verseNum, verseText]) => {
        const cleanedText = String(verseText || '').replace(/\s+/g, ' ').trim();
        const sentenceText = /[.!?]$/.test(cleanedText) ? cleanedText : `${cleanedText}.`;
        return this.bibleTranslation === 'tl'
          ? `Talata ${verseNum}. ${sentenceText}`
          : `Verse ${verseNum}. ${sentenceText}`;
      })
      .join(' ');

    return `${intro} ${versesText}`.trim();
  },

  /**
   * Play or stop chapter narration.
   */
  toggleAudioNarration() {
    if (this.speech.isSpeaking) {
      this.stopAudioNarration();
      return;
    }

    this.startAudioNarration();
  },

  /**
   * Start browser TTS for the current chapter.
   */
  startAudioNarration() {
    if (!this.speech.supported || !window.speechSynthesis) {
      alert('Bible audio is not supported on this browser.');
      return;
    }

    const narrationText = this.buildNarrationText();
    if (!narrationText) {
      alert('No Bible passage is loaded yet.');
      return;
    }

    this.stopAudioNarration({ skipButtonRefresh: true });

    const utterance = new SpeechSynthesisUtterance(narrationText);
    const voice = this.getPreferredNarrationVoice();
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang || (this.bibleTranslation === 'tl' ? 'fil-PH' : 'en-PH');
    } else {
      utterance.lang = this.bibleTranslation === 'tl' ? 'fil-PH' : 'en-PH';
    }

    utterance.rate = this.bibleTranslation === 'tl' ? 0.84 : 0.88;
    utterance.pitch = 0.92;
    utterance.volume = 1;

    utterance.onstart = () => {
      this.speech.isSpeaking = true;
      this.speech.currentUtterance = utterance;
      this.updateNarrationButtons();
    };

    const clearSpeechState = () => {
      if (this.speech.currentUtterance !== utterance) return;
      this.speech.isSpeaking = false;
      this.speech.currentUtterance = null;
      this.updateNarrationButtons();
    };

    utterance.onend = clearSpeechState;
    utterance.onerror = clearSpeechState;

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  },

  /**
   * Stop current narration if active.
   */
  stopAudioNarration(options = {}) {
    if (this.speech.supported && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch (error) {
        console.warn('[BibleReader] Could not stop narration:', error);
      }
    }

    this.speech.isSpeaking = false;
    this.speech.currentUtterance = null;

    if (!options.skipButtonRefresh) {
      this.updateNarrationButtons();
    }
  },

  /**
   * Sync preview/fullscreen narration button labels and active state.
   */
  updateNarrationButtons() {
    const previewBtn = document.getElementById('bibleAudioPreviewBtn');
    const fullscreenBtn = document.getElementById('bibleAudioFullscreenBtn');
    const lang = this.bibleTranslation === 'tl' ? 'tl' : 'en';
    const isSpeaking = !!this.speech.isSpeaking;
    const disabled = !this.speech.supported || !this.chapterData;
    const label = lang === 'tl'
      ? (isSpeaking ? 'Ihinto audio' : 'Pakinggan')
      : (isSpeaking ? 'Stop audio' : 'Listen');
    const title = this.speech.supported
      ? label
      : (lang === 'tl' ? 'Hindi suportado ang audio sa browser na ito' : 'Audio is not supported on this browser');
    const icon = isSpeaking
      ? `
        <svg class="w-4 h-4 md:w-5 md:h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 6h4v12H6zM14 6h4v12h-4z"></path>
        </svg>
      `
      : `
        <svg class="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5 6 9H3v6h3l5 4V5Z"></path>
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.5 8.5a5 5 0 0 1 0 7"></path>
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.5 6a8.5 8.5 0 0 1 0 12"></path>
        </svg>
      `;

    if (previewBtn) {
      previewBtn.disabled = disabled;
      previewBtn.title = title;
      previewBtn.setAttribute('aria-label', title);
      previewBtn.innerHTML = icon;
      previewBtn.classList.toggle('opacity-40', disabled);
      previewBtn.classList.toggle('cursor-not-allowed', disabled);
      previewBtn.classList.toggle('text-[var(--mission-gold)]', isSpeaking && !disabled);
      previewBtn.classList.toggle('bg-[var(--mission-gold)]/15', isSpeaking && !disabled);
    }

    if (fullscreenBtn) {
      fullscreenBtn.disabled = disabled;
      fullscreenBtn.title = title;
      fullscreenBtn.setAttribute('aria-label', title);
      fullscreenBtn.innerHTML = `${icon}<span class="hidden sm:inline">${label}</span>`;
      fullscreenBtn.classList.toggle('opacity-40', disabled);
      fullscreenBtn.classList.toggle('cursor-not-allowed', disabled);
      fullscreenBtn.classList.toggle('bg-[var(--mission-gold)]/20', isSpeaking && !disabled);
      fullscreenBtn.classList.toggle('text-[var(--mission-gold)]', !disabled);
    }
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
    const now = Date.now();
    this.updateReadingStreak(now);
    this.progress.lastReadAt = now;
    
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

  normalizeProgressTimestamp(value) {
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

  getDayDiff(fromValue, toValue = Date.now()) {
    const fromDate = this.normalizeProgressTimestamp(fromValue);
    const toDate = this.normalizeProgressTimestamp(toValue);
    if (!fromDate || !toDate) return null;
    const fromMidnight = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate()).getTime();
    const toMidnight = new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate()).getTime();
    return Math.round((toMidnight - fromMidnight) / (24 * 60 * 60 * 1000));
  },

  updateReadingStreak(now = Date.now()) {
    const previousReadAt = this.normalizeProgressTimestamp(this.progress.lastReadAt);
    const previousStreak = Math.max(0, Number(this.progress.currentStreak || 0));
    const dayDiff = this.getDayDiff(previousReadAt, now);

    let nextStreak = previousStreak;
    if (!previousReadAt) {
      nextStreak = 1;
    } else if (dayDiff === 0) {
      nextStreak = Math.max(1, previousStreak);
    } else if (dayDiff === 1) {
      nextStreak = Math.max(1, previousStreak) + 1;
    } else {
      nextStreak = 1;
    }

    this.progress.currentStreak = nextStreak;
    this.progress.longestStreak = Math.max(nextStreak, Number(this.progress.longestStreak || 0));
    this.progress.streakUpdatedAt = now;
  },

  /**
   * Load last selected verse pointer (book/chapter/verse) from localStorage.
   */
  loadLastSelectedVerse() {
    try {
      const raw = localStorage.getItem(this.storageKeys.lastSelectedVerse);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      this.lastSelectedVerse = this.normalizeVersePointer(parsed);
      return this.lastSelectedVerse;
    } catch (e) {
      this.lastSelectedVerse = null;
      return null;
    }
  },

  /**
   * Validate and normalize verse pointer payload.
   */
  normalizeVersePointer(payload) {
    if (!payload || typeof payload !== 'object') return null;
    const book = String(payload.book || '').trim().toUpperCase();
    const chapter = parseInt(payload.chapter, 10);
    const verse = parseInt(payload.verse, 10);

    if (!book || !Number.isFinite(chapter) || chapter < 1 || !Number.isFinite(verse) || verse < 1) {
      return null;
    }

    return {
      book,
      chapter,
      verse,
      savedAt: Number(payload.savedAt) || Date.now()
    };
  },

  /**
   * Return the cached last-selected verse pointer.
   */
  getLastSelectedVerse() {
    if (!this.lastSelectedVerse) {
      this.loadLastSelectedVerse();
    }
    return this.normalizeVersePointer(this.lastSelectedVerse);
  },

  /**
   * Persist the verse user just tapped (without persisting highlights).
   */
  rememberLastSelectedVerse(verseNum) {
    const verse = parseInt(verseNum, 10);
    if (!Number.isFinite(verse) || verse < 1 || !this.currentBook || !this.currentChapter) return;

    const pointer = this.normalizeVersePointer({
      book: this.currentBook,
      chapter: this.currentChapter,
      verse,
      savedAt: Date.now()
    });

    if (!pointer) return;

    this.lastSelectedVerse = pointer;
    try {
      localStorage.setItem(this.storageKeys.lastSelectedVerse, JSON.stringify(pointer));
    } catch (e) {
      // Ignore storage write errors and keep in-memory pointer.
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
  async openFromNav(options = {}) {
    if (document.getElementById('bibleFullscreenOverlay')) return;

    const preferLastVerse = options.preferLastVerse !== false;
    if (preferLastVerse) {
      const resumed = await this.openAtLastSelectedVerse({ ensureFullscreen: true });
      if (resumed) return;
    }

    if (!this.chapterData) {
      await this.loadChapter(this.currentBook || 'JHN', this.currentChapter || 3);
    }

    this.enterFullscreen();
  },

  /**
   * Open Bible to the user's last tapped verse and scroll to it.
   */
  async openAtLastSelectedVerse(options = {}) {
    const pointer = this.getLastSelectedVerse();
    if (!pointer) return false;

    const ensureFullscreen = options.ensureFullscreen !== false;
    const shouldLoadChapter = !this.chapterData
      || this.currentBook !== pointer.book
      || this.currentChapter !== pointer.chapter;

    if (shouldLoadChapter) {
      await this.loadChapter(pointer.book, pointer.chapter);
    }

    if (ensureFullscreen && !document.getElementById('bibleFullscreenOverlay')) {
      this.enterFullscreen();
    }

    this.scrollToVerse(pointer.verse, { behavior: 'smooth' });
    return true;
  },

  /**
   * Scroll current Bible container (fullscreen or preview) to a specific verse.
   */
  scrollToVerse(verseNum, options = {}) {
    const verse = parseInt(verseNum, 10);
    if (!Number.isFinite(verse) || verse < 1) return false;

    const behavior = options.behavior || 'smooth';
    const attempt = Number(options.attempt) || 0;
    const maxAttempts = Number(options.maxAttempts) || 10;
    const selector = `.verse[data-verse="${verse}"]`;
    const fullscreenContainer = document.getElementById('fullscreenBibleText');
    const previewContainer = this.elements.bibleText || document.getElementById('bibleText');

    let container = null;
    let verseEl = null;

    if (fullscreenContainer) {
      verseEl = fullscreenContainer.querySelector(selector);
      if (verseEl) container = fullscreenContainer;
    }

    if (!verseEl && previewContainer) {
      verseEl = previewContainer.querySelector(selector);
      if (verseEl) container = previewContainer;
    }

    if (!verseEl) {
      if (attempt < maxAttempts) {
        requestAnimationFrame(() => {
          this.scrollToVerse(verse, { behavior, attempt: attempt + 1, maxAttempts });
        });
      }
      return false;
    }

    if (container && typeof container.scrollTo === 'function') {
      const targetTop = Math.max(0, verseEl.offsetTop - Math.round((container.clientHeight || 0) * 0.35));
      container.scrollTo({ top: targetTop, behavior });
    } else {
      verseEl.scrollIntoView({ behavior, block: 'center' });
    }

    return true;
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
          <button id="bibleAudioFullscreenBtn"
                  type="button"
                  onclick="BibleReader.toggleAudioNarration()"
                  class="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[var(--input-bg)] text-[var(--text-color)] hover:bg-[var(--mission-gold)]/20 transition-colors">
            <svg class="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5 6 9H3v6h3l5 4V5Z"></path>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.5 8.5a5 5 0 0 1 0 7"></path>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.5 6a8.5 8.5 0 0 1 0 12"></path>
            </svg>
            <span class="hidden sm:inline">${lang === 'tl' ? 'Pakinggan' : 'Listen'}</span>
          </button>
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
          <button type="button"
                  onclick="BibleReader.openJournalFromFullscreen()"
                  class="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all bg-[var(--mission-gold)]/10 text-[var(--mission-gold)] hover:bg-[var(--mission-gold)]/20">
            <span>📖</span>
            <span>${lang === 'tl' ? 'Aking Journal' : 'My Journal'}</span>
          </button>
          <button type="button"
                  onclick="BibleReader.toggleFullscreenCommentary()" 
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
      this.updateNarrationButtons();
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
    try {
      this.stopAudioNarration();
      if (typeof window.openJournal === 'function') {
        window.openJournal();
        return;
      }
    } catch (error) {
      console.error('[BibleReader] openJournal failed:', error);
    }

    // Fallback: show modal directly to avoid dead click in case global hook is missing.
    const modal = document.getElementById('journalModal');
    if (modal) {
      modal.classList.remove('hidden');
      return;
    }

    alert('Journal is not available right now. Please refresh and try again.');
  },

  /**
   * Generate commentary HTML for fullscreen panel
   */
  generateCommentaryHTML() {
    const lang = this.bibleTranslation || ((typeof i18n !== 'undefined') ? i18n.getLang() : 'en');
    const verseInsights = this.quickInsightsData?.verses && typeof this.quickInsightsData.verses === 'object'
      ? this.quickInsightsData.verses
      : {};
    const hasVerseInsights = Object.keys(verseInsights).length > 0;

    if (this.insightsLoading) {
      return `<p class="text-[var(--text-muted)] italic">${lang === 'tl' ? 'Naglo-load ng insights...' : 'Loading insights...'}</p>`;
    }

    if (this.highlightedVerses.length === 0) {
      return `<p class="text-[var(--text-muted)] italic">${lang === 'tl' ? 'I-tap ang mga talata para makita ang insights' : 'Tap verses to see insights'}</p>`;
    }

    const labels = {
      en: {
        understanding: '📖 Understanding',
        livingItOut: '🚶 Living It Out',
        godsLove: '❤️ God\'s Love',
        godsWord: 'God\'s Word',
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
        tapToExpand: 'Tap to write full screen',
        openEditor: 'Open editor',
        journalPreview: 'Share Preview',
        previewGroups: 'Share to',
        previewQuestion: 'Reflection Question',
        previewPrayerRequests: 'Prayer Requests',
        openPreview: 'Preview what to share',
        previewCancel: 'Back to edit',
        previewConfirm: 'Confirm and save',
        fullscreenEditorDone: 'Done',
        fullscreenEditorExit: 'Exit',
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
        save: '💾 Save Reflection',
        noInsightsSelected: 'No insights available for the selected verse(s) yet.'
      },
      tl: {
        understanding: '📖 Pag-unawa',
        livingItOut: '🚶 Isabuhay',
        godsLove: '❤️ Pag-ibig ng Diyos',
        godsWord: 'Salita ng Diyos',
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
        tapToExpand: 'I-tap para magsulat sa full screen',
        openEditor: 'Buksan ang editor',
        journalPreview: 'Preview ng ise-share',
        previewGroups: 'Ise-share sa',
        previewQuestion: 'Tanong sa Pagninilay',
        previewPrayerRequests: 'Mga prayer request',
        openPreview: 'I-preview ang ise-share',
        previewCancel: 'Balik sa edit',
        previewConfirm: 'I-confirm at i-save',
        fullscreenEditorDone: 'Tapos',
        fullscreenEditorExit: 'Lumabas',
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
        save: '💾 I-save ang Reflection',
        noInsightsSelected: 'Wala pang insights para sa napiling talata.'
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

    let html = this.generateSelectedScriptureHTML({
      lang,
      title: L.godsWord,
      labelFontPx,
      baseFontPx,
      metaFontPx
    });

    if (!hasVerseInsights) {
      html += `<p class="text-[var(--text-muted)] italic mb-4" style="font-size:${metaFontPx}px;">${L.noInsightsSelected}${this.insightsLastError ? ` (${this.escapeHTML(this.insightsLastError)})` : ''}</p>`;
    }

    const reflectionQuestions = [];
    for (const [verseNum, insight] of Object.entries(verseInsights)) {
      const verseText = this.chapterData?.verses?.[String(verseNum)] || this.chapterData?.verses?.[verseNum] || '';
      if (insight?.reflection) {
        reflectionQuestions.push(insight.reflection);
      }
      html += `
        <section class="mb-6 pb-5 border-b border-[var(--card-border)]/70 last:border-0">
          <p class="text-[var(--mission-gold)] font-bold tracking-[0.16em] uppercase mb-2" style="font-size:${smallFontPx}px;">Verse ${verseNum}</p>
          ${verseText ? `<p class="text-[var(--text-color)] italic mb-3" style="font-size:${headingFontPx}px; line-height:1.7;">"${this.escapeHTML(verseText)}"</p>` : ''}
          <div class="space-y-4 text-[var(--text-color)]">
            <div>
              <span class="text-[var(--mission-gold)]/75 block mb-1 font-semibold" style="font-size:${metaFontPx}px;">${L.understanding}</span>
              <p class="leading-relaxed" style="font-size:${baseFontPx}px; line-height:1.72;">${this.escapeHTML(insight.understanding || '')}</p>
            </div>
            <div>
              <span class="text-[var(--mission-gold)]/75 block mb-1 font-semibold" style="font-size:${metaFontPx}px;">${L.livingItOut}</span>
              <p class="leading-relaxed" style="font-size:${baseFontPx}px; line-height:1.72;">${this.escapeHTML(insight.livingItOut || '')}</p>
            </div>
            <div>
              <span class="text-[var(--mission-gold)]/75 block mb-1 font-semibold" style="font-size:${metaFontPx}px;">${L.godsLove}</span>
              <p class="leading-relaxed" style="font-size:${baseFontPx}px; line-height:1.72;">${this.escapeHTML(insight.godsLove || '')}</p>
            </div>
          </div>
        </section>
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
          <div class="mt-3 pt-3 border-t border-[var(--card-border)]/65 text-[var(--text-muted)]" style="font-size:${smallFontPx}px;">
            ${lang === 'tl' ? 'Naglo-load ng mga group...' : 'Loading groups...'}
          </div>
        `;
      } else if (shareTargets.length === 0) {
        shareGroupPickerHtml = `
          <div class="mt-3 pt-3 border-t border-[var(--card-border)]/65 text-[var(--text-muted)]" style="font-size:${smallFontPx}px;">
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
            <label class="flex items-start gap-2 py-2 cursor-pointer border-b border-[var(--card-border)]/45 last:border-0">
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
          <div class="mt-3 pt-3 border-t border-[var(--card-border)]/65">
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
      <section class="mt-6 pt-5 border-t border-[var(--card-border)]">
        <label class="text-[var(--mission-gold)]/80 font-semibold block mb-1" style="font-size:${labelFontPx}px;">${L.yourAnswer}</label>
        <button type="button"
                onclick="BibleReader.openInlineFieldEditor('reflection')"
                class="mb-2 inline-flex items-center gap-1 text-[var(--mission-gold)]/80 hover:text-[var(--mission-gold)] transition-colors"
                style="font-size:${smallFontPx}px;">
          <span>⤢</span>
          <span>${L.tapToExpand}</span>
        </button>
        <textarea id="inlineInsightReflectionInput"
                  oninput="BibleReader.setInlineReflection(this.value)"
                  onclick="BibleReader.openInlineFieldEditor('reflection')"
                  readonly
                  rows="6"
                  class="w-full bg-transparent border-0 border-b border-[var(--card-border)]/70 rounded-none px-0 py-3 text-[var(--text-color)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--mission-gold)]/50 resize-none mb-4"
                  style="font-size:${baseFontPx}px; line-height:1.6;"
                  placeholder="${L.yourAnswerPlaceholder}">${reflectionValue}</textarea>

        ${primaryQuestion ? `
          <div class="mb-4">
            <span class="text-[var(--mission-gold)]/70 block mb-1" style="font-size:${metaFontPx}px;">${L.reflectionQuestion}</span>
            <p class="text-[var(--text-color)] italic" style="font-size:${headingFontPx}px; line-height:1.5;">"${this.escapeHTML(primaryQuestion)}"</p>
          </div>
        ` : ''}

        <label class="text-[var(--mission-gold)]/80 font-semibold block mb-1" style="font-size:${labelFontPx}px;">${L.iWill}</label>
        <button type="button"
                onclick="BibleReader.openInlineFieldEditor('commitment')"
                class="mb-2 inline-flex items-center gap-1 text-[var(--mission-gold)]/80 hover:text-[var(--mission-gold)] transition-colors"
                style="font-size:${smallFontPx}px;">
          <span>⤢</span>
          <span>${L.tapToExpand}</span>
        </button>
        <textarea id="inlineInsightCommitmentInput"
                  oninput="BibleReader.setInlineCommitment(this.value)"
                  onclick="BibleReader.openInlineFieldEditor('commitment')"
                  readonly
                  rows="6"
                  class="w-full bg-transparent border-0 border-b border-[var(--card-border)]/70 rounded-none px-0 py-3 text-[var(--text-color)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--mission-gold)]/50 resize-none mb-4"
                  style="font-size:${baseFontPx}px; line-height:1.6;"
                  placeholder="${L.iWillPlaceholder}">${commitmentValue}</textarea>

        <div class="mb-4">
          <label class="text-[var(--mission-gold)]/80 font-semibold block mb-2" style="font-size:${labelFontPx}px;">🙏 ${L.prayerRequests}</label>
          <div class="flex items-center gap-2 mb-3">
            <input id="inlineInsightPrayerDraftInput"
                   type="text"
                   oninput="BibleReader.setInlinePrayerDraft(this.value)"
                   onclick="BibleReader.openInlineFieldEditor('prayerDraft')"
                   readonly
                   class="flex-1 bg-transparent border-0 border-b border-[var(--card-border)]/70 rounded-none px-0 py-2 text-[var(--text-color)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--mission-gold)]/50"
                   style="font-size:${baseFontPx}px; line-height:1.45;"
                   placeholder="${L.prayerRequestsPlaceholder}"
                   value="${prayerDraftValue}">
            <button type="button"
                    onclick="BibleReader.addInlinePrayerRequest()"
                    class="px-0 py-2 text-[var(--mission-gold)] font-semibold hover:opacity-80 transition-colors"
                    style="font-size:${smallFontPx}px;">
              ${L.addPrayerRequest}
            </button>
          </div>
          ${prayerRequests.length > 0 ? `
            <div class="max-h-52 overflow-y-auto pr-1">
              ${prayerRequests.map((item) => {
                const prayerId = String(item.id || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
                const createdAtLabel = this.escapeHTML(this.formatInlinePrayerTimestamp(item.createdAt, lang));
                const text = this.escapeHTML(item.text || '');
                return `
                  <div class="py-2 border-b border-[var(--card-border)]/55 last:border-0">
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

        <div class="flex flex-wrap items-center gap-x-4 gap-y-2 mb-1">
          <button type="button"
                  onclick="BibleReader.previewInlineReflectionShare()"
                  class="px-0 py-1 text-[var(--mission-gold)] font-semibold hover:opacity-80 transition-colors"
                  style="font-size:${metaFontPx}px;">
            👁 ${L.openPreview}
          </button>
          <button type="button"
                  onclick="BibleReader.toggleInlineShare()"
                  class="px-0 py-1 ${shareActive ? 'text-[var(--mission-gold)]' : 'text-[var(--text-color)]/80'} font-semibold hover:text-[var(--mission-gold)] transition-colors"
                  style="font-size:${metaFontPx}px;">
            ${shareActive ? '✓' : '+'} ${L.shareWithGroup}
          </button>
        </div>
        <p class="text-[var(--text-muted)] mb-3 pt-3 border-t border-[var(--card-border)]/65" style="font-size:${smallFontPx}px;">${shareActive ? L.selectGroups : L.shareWithGroupHelp}</p>
        ${shareGroupPickerHtml}

        <button id="inlineInsightSaveBtn"
                onclick="BibleReader.saveInlineReflection()"
                class="w-full py-3 rounded-full border border-[var(--mission-red-bright)]/35 bg-[var(--mission-red-bright)]/10 hover:bg-[var(--mission-red-bright)]/15 text-[var(--mission-red-bright)] font-bold transition-colors"
                style="font-size:${labelFontPx}px;">
          ${L.save}
        </button>
      </section>
    `;

    return html;
  },

  getSelectedVerseNumbers() {
    return (this.highlightedVerses || [])
      .map((item) => (typeof item === 'object' ? Number(item.verse) : Number(item)))
      .filter((value) => Number.isFinite(value))
      .sort((a, b) => a - b);
  },

  getSelectedVerseReference(lang = this.getInlineUiLang()) {
    const verseNumbers = this.getSelectedVerseNumbers();
    const bookName = (typeof BibleLoader !== 'undefined')
      ? BibleLoader.getBookName(this.currentBook, this.bibleTranslation || lang)
      : this.currentBook;
    const referenceBase = `${bookName || this.currentBook} ${this.currentChapter}`.trim();
    return verseNumbers.length ? `${referenceBase}:${verseNumbers.join(',')}` : referenceBase;
  },

  getSelectedVerseLines() {
    return this.getSelectedVerseNumbers().map((verseNum) => {
      const verseText = this.chapterData?.verses?.[String(verseNum)] || this.chapterData?.verses?.[verseNum] || '';
      return verseText ? `${verseNum}. ${verseText}` : '';
    }).filter(Boolean);
  },

  generateSelectedScriptureHTML({
    lang = this.getInlineUiLang(),
    title = (lang === 'tl' ? 'Salita ng Diyos' : 'God\'s Word'),
    labelFontPx = 14,
    baseFontPx = 16,
    metaFontPx = 12
  } = {}) {
    const reference = this.escapeHTML(this.getSelectedVerseReference(lang));
    const verseLines = this.getSelectedVerseLines();
    if (!verseLines.length) return '';

    return `
      <section class="mb-6 pb-5 border-b border-[var(--card-border)]">
        <p class="text-[var(--mission-gold)] font-bold tracking-[0.18em] uppercase mb-2" style="font-size:${metaFontPx}px;">${this.escapeHTML(title)}</p>
        <p class="text-[var(--text-muted)] mb-2" style="font-size:${metaFontPx}px;">${reference}</p>
        <div class="space-y-3">
          ${verseLines.map((line) => `
            <p class="text-[var(--text-color)] italic leading-relaxed" style="font-size:${baseFontPx}px; line-height:1.75;">"${this.escapeHTML(line)}"</p>
          `).join('')}
        </div>
      </section>
    `;
  },

  escapeHTML(value) {
    const str = String(value || '');
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  },

  escapeJS(value) {
    return String(value || '')
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'");
  },

  getInlineUiLang() {
    return this.bibleTranslation || ((typeof i18n !== 'undefined') ? i18n.getLang() : 'en');
  },

  getInlineUiLabels(lang = this.getInlineUiLang()) {
    const labels = {
      en: {
        yourAnswer: 'What is my understanding',
        yourAnswerPlaceholder: 'Write what you learned and understood here...',
        iWill: 'What will I do',
        iWillPlaceholder: 'Write your commitment to apply this today...',
        prayerRequests: 'Prayer requests',
        prayerRequestsPlaceholder: 'Add one prayer request (example: Salvation for my husband Marko Junior)',
        fullscreenEditorDone: 'Done',
        fullscreenEditorExit: 'Exit',
        journalPreview: 'Share Preview',
        previewGroups: 'Share to',
        previewQuestion: 'Reflection Question',
        previewPrayerRequests: 'Prayer Requests',
        openPreview: 'Preview what to share',
        previewCancel: 'Back to edit',
        previewConfirm: 'Confirm and save',
        noPrayerRequests: 'No prayer requests added yet.'
      },
      tl: {
        yourAnswer: 'Ano ang aking pagkaunawa',
        yourAnswerPlaceholder: 'Isulat ang iyong natutunan at pagkaunawa dito...',
        iWill: 'Ano ang aking gagawin',
        iWillPlaceholder: 'Isulat ang commitment mo kung paano mo ito isasabuhay ngayon...',
        prayerRequests: 'Mga prayer request',
        prayerRequestsPlaceholder: 'Magdagdag ng isang kahilingan sa panalangin (hal: Kaligtasan ng asawa kong si Marko Junior)',
        fullscreenEditorDone: 'Tapos',
        fullscreenEditorExit: 'Lumabas',
        journalPreview: 'Preview ng ise-share',
        previewGroups: 'Ise-share sa',
        previewQuestion: 'Tanong sa Pagninilay',
        previewPrayerRequests: 'Mga prayer request',
        openPreview: 'I-preview ang ise-share',
        previewCancel: 'Balik sa edit',
        previewConfirm: 'I-confirm at i-save',
        noPrayerRequests: 'Wala pang nailalagay na prayer request.'
      }
    };
    return labels[lang] || labels.en;
  },

  formatInlineMultilineHtml(value) {
    return this.escapeHTML(value).replace(/\n/g, '<br>');
  },

  getInlineFieldEditorConfig(fieldKey) {
    const lang = this.getInlineUiLang();
    const L = this.getInlineUiLabels(lang);
    const baseFontPx = Math.max(14, Number(this.preferences.fontSize) || 16);
    const map = {
      reflection: {
        title: L.yourAnswer,
        placeholder: L.yourAnswerPlaceholder,
        value: this.inlineReflectionDraft.reflection || '',
        rows: 14,
        fontPx: baseFontPx
      },
      commitment: {
        title: L.iWill,
        placeholder: L.iWillPlaceholder,
        value: this.inlineReflectionDraft.commitment || '',
        rows: 14,
        fontPx: baseFontPx
      },
      prayerDraft: {
        title: L.prayerRequests,
        placeholder: L.prayerRequestsPlaceholder,
        value: this.inlineReflectionDraft.prayerDraft || '',
        rows: 10,
        fontPx: baseFontPx
      }
    };
    return map[fieldKey] || null;
  },

  openInlineFieldEditor(fieldKey) {
    const config = this.getInlineFieldEditorConfig(fieldKey);
    if (!config) return;

    this.closeInlineFieldEditor();
    this.inlineEditorSession = { fieldKey };

    const lang = this.getInlineUiLang();
    const L = this.getInlineUiLabels(lang);
    const overlay = document.createElement('div');
    overlay.id = 'inlineFieldEditorOverlay';
    overlay.className = 'fixed inset-0 z-[80] bg-black/60 flex items-center justify-center p-3';
    overlay.innerHTML = `
      <div class="w-full max-w-3xl h-[90vh] rounded-2xl border border-[var(--card-border)] bg-[var(--bg-color)] shadow-2xl flex flex-col">
        <div class="flex items-center justify-between gap-3 p-3 border-b border-[var(--card-border)] bg-[var(--nav-bg)] rounded-t-2xl">
          <div class="min-w-0">
            <p class="text-[var(--mission-gold)] font-bold truncate" style="font-size:${Math.max(15, config.fontPx)}px;">${this.escapeHTML(config.title)}</p>
          </div>
          <div class="flex items-center gap-2">
            <button type="button" onclick="BibleReader.closeInlineFieldEditor()" class="px-3 py-2 rounded-lg border border-[var(--card-border)] text-[var(--text-color)] hover:border-[var(--mission-gold)]/40">
              ${this.escapeHTML(L.fullscreenEditorExit)}
            </button>
            <button type="button" onclick="BibleReader.applyInlineFieldEditor()" class="px-3 py-2 rounded-lg bg-[var(--mission-gold)] text-[var(--mission-red-deep)] font-bold hover:opacity-90">
              ${this.escapeHTML(L.fullscreenEditorDone)}
            </button>
          </div>
        </div>
        <div class="flex-1 p-3">
          <textarea id="inlineFieldEditorTextarea"
                    class="w-full h-full bg-[var(--input-bg)] border border-[var(--card-border)] rounded-xl p-4 text-[var(--text-color)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--mission-gold)]/50 resize-none"
                    style="font-size:${config.fontPx}px; line-height:1.6;"
                    placeholder="${this.escapeHTML(config.placeholder)}">${this.escapeHTML(config.value)}</textarea>
        </div>
      </div>
    `;
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) this.closeInlineFieldEditor();
    });
    document.body.appendChild(overlay);

    const textarea = document.getElementById('inlineFieldEditorTextarea');
    if (textarea) {
      textarea.focus();
      const end = textarea.value.length;
      textarea.setSelectionRange(end, end);
    }
  },

  applyInlineFieldEditor() {
    const session = this.inlineEditorSession;
    const textarea = document.getElementById('inlineFieldEditorTextarea');
    if (!session || !textarea) {
      this.closeInlineFieldEditor();
      return;
    }
    const value = textarea.value || '';
    if (session.fieldKey === 'reflection') this.inlineReflectionDraft.reflection = value;
    if (session.fieldKey === 'commitment') this.inlineReflectionDraft.commitment = value;
    if (session.fieldKey === 'prayerDraft') this.inlineReflectionDraft.prayerDraft = value;

    this.closeInlineFieldEditor();
    this.refreshFullscreenInsightsPanel();
  },

  closeInlineFieldEditor() {
    const overlay = document.getElementById('inlineFieldEditorOverlay');
    if (overlay) overlay.remove();
    this.inlineEditorSession = null;
  },

  buildInlineSharePreviewPayload() {
    const lang = this.getInlineUiLang();
    const L = this.getInlineUiLabels(lang);
    const understanding = (this.inlineReflectionDraft.reflection || '').trim();
    const action = (this.inlineReflectionDraft.commitment || '').trim();
    const prayerRequests = this.getInlinePrayerRequestsForSave();
    const question = this.getPrimaryReflectionQuestion();
    const shareWithGroup = !!this.inlineReflectionDraft.shareWithGroup;
    const shareGroupIds = shareWithGroup ? this.getSelectedInlineShareGroupIds() : [];
    const bookName = (typeof BibleLoader !== 'undefined')
      ? BibleLoader.getBookName(this.currentBook, this.bibleTranslation || lang)
      : this.currentBook;
    const verseNumbers = (this.highlightedVerses || [])
      .map(v => (typeof v === 'object' ? Number(v.verse) : Number(v)))
      .filter(v => Number.isFinite(v))
      .sort((a, b) => a - b);
    const referenceBase = `${bookName || this.currentBook} ${this.currentChapter}`.trim();
    const reference = verseNumbers.length ? `${referenceBase}:${verseNumbers.join(',')}` : referenceBase;
    const verseLines = verseNumbers.map((verseNum) => {
      const verseText = this.chapterData?.verses?.[String(verseNum)] || this.chapterData?.verses?.[verseNum] || '';
      return verseText ? `${verseNum}. ${verseText}` : '';
    }).filter(Boolean);
    const groups = (this.inlineShareTargets || [])
      .filter(group => shareGroupIds.includes(String(group.id)))
      .map(group => ({
        id: String(group.id),
        name: group.name || 'Mission Group',
        type: group.type || 'group'
      }));

    return {
      lang,
      labels: L,
      understanding,
      action,
      prayerRequests,
      question,
      shareWithGroup,
      shareGroupIds,
      selectedGroups: groups,
      scriptureReference: reference,
      scriptureText: verseLines.join('\n')
    };
  },

  openInlineSharePreview(payload) {
    this.closeInlineSharePreview();
    this.pendingInlineSavePayload = payload;
    const preview = this.buildInlineSharePreviewPayload();
    const lang = preview.lang;
    const L = preview.labels;
    const selectedGroups = preview.selectedGroups.length
      ? preview.selectedGroups.map(group => `${group.name} (${group.id})`)
      : preview.shareGroupIds;
    const prayerItemsHtml = preview.prayerRequests.length
      ? preview.prayerRequests.map(item => `<li class="mb-1">${this.formatInlineMultilineHtml(item.text)}</li>`).join('')
      : `<p class="text-[var(--text-muted)] text-sm">${this.escapeHTML(L.noPrayerRequests)}</p>`;

    const sectionTitles = lang === 'tl'
      ? {
          scripture: 'Ano ang sinabi ng Diyos',
          understanding: 'Ano ang aking pagkaunawa',
          action: 'Ano ang aking gagawin'
        }
      : {
          scripture: 'What did God say',
          understanding: 'What is my understanding',
          action: 'What will I do'
        };

    const overlay = document.createElement('div');
    overlay.id = 'inlineSharePreviewOverlay';
    overlay.className = 'fixed inset-0 z-[85] bg-black/65 flex items-center justify-center p-3';
    overlay.innerHTML = `
      <div class="w-full max-w-3xl h-[92vh] rounded-2xl border border-[var(--card-border)] bg-[var(--bg-color)] shadow-2xl flex flex-col">
        <div class="flex items-center justify-between gap-3 p-3 border-b border-[var(--card-border)] bg-[var(--nav-bg)] rounded-t-2xl">
          <h3 class="text-[var(--mission-gold)] font-bold" style="font-size:${Math.max(15, Number(this.preferences.fontSize) || 16)}px;">${this.escapeHTML(L.journalPreview)}</h3>
          <button type="button" onclick="BibleReader.closeInlineSharePreview()" class="p-2 rounded-full bg-[var(--input-bg)] text-[var(--text-muted)] hover:text-[var(--mission-gold)]">✕</button>
        </div>
        <div class="flex-1 overflow-y-auto p-4 space-y-3">
          <div class="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-3">
            <p class="text-[11px] font-bold text-[var(--mission-gold)] uppercase tracking-wide mb-1">${this.escapeHTML(L.previewGroups)}</p>
            <p class="text-sm text-[var(--text-color)] leading-relaxed">${this.formatInlineMultilineHtml(selectedGroups.join('\n') || '-')}</p>
          </div>
          <div class="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
            <p class="text-[11px] font-bold text-amber-500 uppercase tracking-wide mb-1">${this.escapeHTML(sectionTitles.scripture)}</p>
            <p class="text-xs text-[var(--text-muted)] mb-1">${this.escapeHTML(preview.scriptureReference || '')}</p>
            <p class="text-sm text-[var(--text-color)] leading-relaxed">${this.formatInlineMultilineHtml(preview.scriptureText || '')}</p>
          </div>
          <div class="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-3">
            <p class="text-[11px] font-bold text-[var(--mission-gold)] uppercase tracking-wide mb-1">${this.escapeHTML(sectionTitles.understanding)}</p>
            <p class="text-sm text-[var(--text-color)] leading-relaxed">${this.formatInlineMultilineHtml(preview.understanding)}</p>
          </div>
          ${preview.question ? `
            <div class="rounded-xl border border-[var(--card-border)] bg-[var(--bg-color)]/35 p-3">
              <p class="text-[11px] font-bold text-[var(--mission-gold)] uppercase tracking-wide mb-1">${this.escapeHTML(L.previewQuestion)}</p>
              <p class="text-sm text-[var(--text-color)] italic leading-relaxed">"${this.escapeHTML(preview.question)}"</p>
            </div>
          ` : ''}
          <div class="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-3">
            <p class="text-[11px] font-bold text-[var(--mission-gold)] uppercase tracking-wide mb-1">${this.escapeHTML(sectionTitles.action)}</p>
            <p class="text-sm text-[var(--text-color)] leading-relaxed">${this.formatInlineMultilineHtml(preview.action)}</p>
          </div>
          <div class="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-3">
            <p class="text-[11px] font-bold text-[var(--mission-gold)] uppercase tracking-wide mb-1">${this.escapeHTML(L.previewPrayerRequests)}</p>
            ${preview.prayerRequests.length ? `<ul class="text-sm text-[var(--text-color)] pl-5 list-disc leading-relaxed">${prayerItemsHtml}</ul>` : prayerItemsHtml}
          </div>
        </div>
        <div class="p-3 border-t border-[var(--card-border)] bg-[var(--nav-bg)] flex flex-col sm:flex-row gap-2 rounded-b-2xl">
          <button type="button" onclick="BibleReader.closeInlineSharePreview()" class="flex-1 py-3 rounded-lg border border-[var(--card-border)] text-[var(--text-color)] font-medium hover:border-[var(--mission-gold)]/40">
            ${this.escapeHTML(L.previewCancel)}
          </button>
          <button type="button" id="inlineSharePreviewConfirmBtn" onclick="BibleReader.confirmInlineSharePreview()" class="flex-1 py-3 rounded-lg bg-[var(--mission-red-bright)] text-white font-bold hover:bg-[#8B0000]">
            ${this.escapeHTML(L.previewConfirm)}
          </button>
        </div>
      </div>
    `;
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) this.closeInlineSharePreview();
    });
    document.body.appendChild(overlay);
  },

  previewInlineReflectionShare() {
    const payload = {
      understanding: (this.inlineReflectionDraft.reflection || '').trim(),
      action: (this.inlineReflectionDraft.commitment || '').trim(),
      prayerRequests: this.getInlinePrayerRequestsForSave(),
      question: this.getPrimaryReflectionQuestion(),
      shareWithGroup: !!this.inlineReflectionDraft.shareWithGroup,
      shareGroupIds: this.inlineReflectionDraft.shareWithGroup ? this.getSelectedInlineShareGroupIds() : []
    };
    this.openInlineSharePreview(payload);
  },

  closeInlineSharePreview() {
    const overlay = document.getElementById('inlineSharePreviewOverlay');
    if (overlay) overlay.remove();
    this.pendingInlineSavePayload = null;
  },

  async confirmInlineSharePreview() {
    const payload = this.pendingInlineSavePayload;
    const confirmBtn = document.getElementById('inlineSharePreviewConfirmBtn');
    const originalLabel = confirmBtn?.textContent || '';
    if (!payload) return;
    if (confirmBtn) {
      confirmBtn.disabled = true;
      confirmBtn.textContent = 'Saving...';
    }
    try {
      await this.persistInlineReflectionPayload(payload);
      const overlay = document.getElementById('inlineSharePreviewOverlay');
      if (overlay) overlay.remove();
      this.pendingInlineSavePayload = null;
    } catch (error) {
      if (confirmBtn) {
        confirmBtn.disabled = false;
        confirmBtn.textContent = originalLabel;
      }
    }
  },

  async persistInlineReflectionPayload(payload) {
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
        understanding: payload.understanding,
        action: payload.action,
        prayerRequests: payload.prayerRequests,
        question: payload.question,
        shareWithGroup: payload.shareWithGroup,
        shareGroupIds: payload.shareGroupIds
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
      throw error;
    } finally {
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.innerHTML = originalLabel;
      }
    }
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
    const payload = {
      understanding,
      action,
      prayerRequests,
      question,
      shareWithGroup,
      shareGroupIds
    };

    if (shareWithGroup) {
      this.openInlineSharePreview(payload);
      return;
    }

    await this.persistInlineReflectionPayload(payload);
  },

  /**
   * Exit fullscreen mode
   */
  exitFullscreen() {
    this.preferences.isFullscreen = false;
    this.stopAudioNarration();
    this.closeInlineFieldEditor();
    this.closeInlineSharePreview();
    
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

      this.updateNarrationButtons();
      
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
    
    this.stopAudioNarration();
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
    this.updateNarrationButtons();
    
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
    this.stopAudioNarration();
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
    this.updateNarrationButtons();

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
    this.rememberLastSelectedVerse(verseNum);

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
        godsWord: 'God\'s Word',
        digDeeper: '📚 Dig Deeper (Tyndale)',
        noInsights: 'No insights available for this verse yet.',
        tapVerses: 'Tap verses above to see insights'
      },
      tl: {
        understanding: '📖 Unawain ang Talata',
        livingItOut: '🚶 Isabuhay Ito',
        godsLove: '❤️ Makita ang Pag-ibig ng Diyos',
        godsWord: 'Salita ng Diyos',
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
    
    const scriptureBlock = this.generateSelectedScriptureHTML({
      lang,
      title: L.godsWord,
      labelFontPx: 13,
      baseFontPx: 14,
      metaFontPx: 11
    });

    if (!this.quickInsightsData || !this.quickInsightsData.verses || Object.keys(this.quickInsightsData.verses).length === 0) {
      commentaryContent.innerHTML = `
        ${scriptureBlock}
        <p class="text-[var(--text-muted)] italic text-sm">${L.noInsights}</p>
      `;
      return;
    }

    let html = scriptureBlock;
    
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
          <p class="text-[var(--mission-gold)] font-bold text-[11px] uppercase tracking-[0.16em] mb-2">Verse ${verseNum}</p>
          
          <!-- Understanding -->
          <div class="mb-3">
            <p class="text-[var(--mission-gold)]/80 text-xs font-semibold mb-1">${L.understanding}</p>
            <p class="text-sm text-[var(--text-color)] leading-relaxed">${this.escapeHTML(insight.understanding || '')}</p>
          </div>
          
          <!-- Living It Out -->
          <div class="mb-3">
            <p class="text-[var(--mission-gold)]/80 text-xs font-semibold mb-1">${L.livingItOut}</p>
            <p class="text-sm text-[var(--text-color)] leading-relaxed">${this.escapeHTML(insight.livingItOut || '')}</p>
          </div>
          
          <!-- God's Love -->
          <div class="mb-3">
            <p class="text-[var(--mission-gold)]/80 text-xs font-semibold mb-1">${L.godsLove}</p>
            <p class="text-sm text-[var(--text-color)] leading-relaxed">${this.escapeHTML(insight.godsLove || '')}</p>
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
    this.closeInlineFieldEditor();
    this.closeInlineSharePreview();
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
