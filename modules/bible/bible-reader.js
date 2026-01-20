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
  currentChapter: 1,
  highlightedVerses: [],      // Now stores objects: [{verse: 1, color: 'gold'}, ...]
  chapterData: null,
  commentaryData: null,
  quickInsightsData: null,
  tyndaleData: null,
  
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
    chapter: 1,
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
        this.currentChapter = this.progress.chapter || 1;
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
            this.currentChapter = this.progress.chapter || 1;
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
   * Apply font size to Bible text
   */
  applyFontSize() {
    const bibleText = document.getElementById('bibleText');
    if (bibleText) {
      bibleText.style.fontSize = `${this.preferences.fontSize}px`;
    }
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
    
    const bookName = this.chapterData?.bookName || this.currentBook;
    const lang = (typeof i18n !== 'undefined') ? i18n.getLang() : 'en';
    
    overlay.innerHTML = `
      <!-- Fullscreen Header -->
      <div class="flex items-center justify-between px-4 py-3 border-b border-[var(--card-border)] bg-[var(--nav-bg)]">
        <button onclick="BibleReader.exitFullscreen()" class="flex items-center gap-2 text-amber-500 hover:text-amber-400">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
          <span class="text-sm font-medium">Close</span>
        </button>
        
        <h2 class="text-lg font-bold text-[var(--text-color)]">📖 ${bookName} ${this.currentChapter}</h2>
        
        <div class="flex items-center gap-2">
          <!-- Font Size Controls -->
          <button onclick="BibleReader.decreaseFontSize()" class="w-8 h-8 rounded-full bg-[var(--input-bg)] text-[var(--text-color)] flex items-center justify-center hover:bg-amber-500/20">
            <span class="text-lg font-bold">A-</span>
          </button>
          <button onclick="BibleReader.increaseFontSize()" class="w-8 h-8 rounded-full bg-[var(--input-bg)] text-[var(--text-color)] flex items-center justify-center hover:bg-amber-500/20">
            <span class="text-lg font-bold">A+</span>
          </button>
        </div>
      </div>
      
      <!-- Color Picker Bar -->
      <div class="flex items-center justify-center gap-2 px-4 py-2 bg-[var(--nav-bg)] border-b border-[var(--card-border)]">
        <span class="text-xs text-[var(--text-muted)] mr-2">Highlight:</span>
        ${Object.entries(this.highlightColors).map(([key, color]) => `
          <button onclick="BibleReader.setHighlightColor('${key}')" 
                  class="w-6 h-6 rounded-full border-2 transition-all ${this.preferences.highlightColor === key ? 'border-white scale-110' : 'border-transparent'}"
                  style="background: ${color.bg}; box-shadow: inset 0 0 0 2px ${color.border};"
                  title="${color.name}">
          </button>
        `).join('')}
      </div>
      
      <!-- Chapter Navigation -->
      <div class="flex items-center justify-between px-4 py-2 bg-[var(--nav-bg)] border-b border-[var(--card-border)]">
        <button onclick="BibleReader.prevChapter(); BibleReader.updateFullscreenContent();" 
                class="flex items-center gap-1 text-sm text-amber-500 hover:text-amber-400 ${this.currentChapter <= 1 ? 'opacity-30 pointer-events-none' : ''}">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
          </svg>
          Prev
        </button>
        
        <span class="text-sm text-[var(--text-muted)]">Chapter ${this.currentChapter}</span>
        
        <button onclick="BibleReader.nextChapter(); BibleReader.updateFullscreenContent();" 
                class="flex items-center gap-1 text-sm text-amber-500 hover:text-amber-400">
          Next
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
          </svg>
        </button>
      </div>
      
      <!-- Bible Text -->
      <div id="fullscreenBibleText" class="flex-1 overflow-y-auto px-6 py-4 custom-scrollbar" style="font-size: ${this.preferences.fontSize}px;">
        ${this.generateVersesHTML()}
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
   * Update fullscreen content after navigation
   */
  updateFullscreenContent() {
    setTimeout(() => {
      const fullscreenText = document.getElementById('fullscreenBibleText');
      const headerTitle = document.querySelector('#bibleFullscreenOverlay h2');
      
      if (fullscreenText) {
        fullscreenText.innerHTML = this.generateVersesHTML();
        fullscreenText.style.fontSize = `${this.preferences.fontSize}px`;
      }
      
      if (headerTitle) {
        const bookName = this.chapterData?.bookName || this.currentBook;
        headerTitle.textContent = `📖 ${bookName} ${this.currentChapter}`;
      }
    }, 200);
  },

  /**
   * Generate HTML for verses (used by both normal and fullscreen views)
   */
  generateVersesHTML() {
    if (!this.chapterData) return '<p class="text-slate-500">Loading...</p>';
    
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
    
    // Get current language
    const lang = (typeof i18n !== 'undefined') ? i18n.getLang() : 'en';
    
    // Load chapter data using BibleLoader
    if (typeof BibleLoader !== 'undefined') {
      this.chapterData = await BibleLoader.getChapter(bookId, chapter, lang);
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
  },

  /**
   * Reload chapter when language changes - preserves highlighted verses
   */
  async reloadChapterForLanguageChange() {
    console.log(`[BibleReader] Reloading for language change, preserving ${this.highlightedVerses.length} highlights`);
    
    // Save current highlights
    const savedHighlights = [...this.highlightedVerses];
    
    // Get new language
    const lang = (typeof i18n !== 'undefined') ? i18n.getLang() : 'en';
    
    // Reload chapter data in new language
    if (typeof BibleLoader !== 'undefined') {
      this.chapterData = await BibleLoader.getChapter(this.currentBook, this.currentChapter, lang);
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
    this.renderProgress();
    this.updateNavButtons();
    
    // Reload insights in new language if verses are highlighted
    if (this.highlightedVerses.length > 0) {
      await this.loadCommentary();
    } else {
      this.clearCommentary();
    }
  },

  /**
   * Render passage title with picker trigger
   */
  renderPassageTitle() {
    if (!this.elements.passageTitle) return;
    
    const bookName = this.chapterData.bookName || this.currentBook;
    
    this.elements.passageTitle.innerHTML = `
      <button onclick="BiblePicker.open()" class="flex items-center gap-2 hover:text-amber-400 transition-colors">
        <span>📖 ${bookName} ${this.currentChapter}</span>
        <svg class="w-4 h-4 text-amber-500/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
        </svg>
      </button>
    `;
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
        progressDiv.className = 'text-[10px] text-slate-500 flex items-center gap-1';
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
      dotsHtml += `<span class="w-1.5 h-1.5 rounded-full ${i < filledDots ? 'bg-amber-500' : 'bg-amber-900/40'}"></span>`;
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
        navContainer.className = 'flex justify-between items-center py-3 border-b border-white/10';
        
        // Insert before bible text
        bibleTextContainer.insertBefore(navContainer, this.elements.bibleText);
      }
    }
    
    if (!navContainer) return;
    
    const hasPrev = this.currentChapter > 1;
    const hasNext = this.currentChapter < totalChapters;
    
    navContainer.innerHTML = `
      <button onclick="BibleReader.prevChapter()" 
              class="flex items-center gap-1 text-xs ${hasPrev ? 'text-amber-500 hover:text-amber-400' : 'text-slate-700 cursor-not-allowed'}"
              ${!hasPrev ? 'disabled' : ''}>
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
        </svg>
        <span>Prev</span>
      </button>
      
      <button onclick="BiblePicker.open()" class="text-xs text-slate-400 hover:text-amber-500">
        Chapter ${this.currentChapter}
      </button>
      
      <button onclick="BibleReader.nextChapter()" 
              class="flex items-center gap-1 text-xs ${hasNext ? 'text-amber-500 hover:text-amber-400' : 'text-slate-700 cursor-not-allowed'}"
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
  },

  /**
   * Load and display Quick Insights for highlighted verses
   */
  async loadCommentary() {
    if (this.highlightedVerses.length === 0) return;
    
    const lang = (typeof i18n !== 'undefined') ? i18n.getLang() : 'en';
    
    // Extract just verse numbers from highlighted verses
    const verseNumbers = this.highlightedVerses.map(h => h.verse);
    
    // Get Quick Insights using BibleLoader
    if (typeof BibleLoader !== 'undefined') {
      this.quickInsightsData = await BibleLoader.getQuickInsights(
        this.currentBook, 
        this.currentChapter, 
        verseNumbers,
        lang
      );
      
      // Also load Tyndale for "Dig Deeper"
      this.tyndaleData = await BibleLoader.getTyndale(
        this.currentBook,
        this.currentChapter,
        verseNumbers
      );
    }
    
    this.renderCommentary();
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
    
    const lang = (typeof i18n !== 'undefined') ? i18n.getLang() : 'en';
    
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
        <p class="text-slate-400 italic text-sm">${L.noInsights}</p>
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
        <div class="mb-5 pb-4 border-b border-white/10 last:border-0 last:pb-0 last:mb-0">
          <p class="text-amber-500 font-bold text-sm mb-3">Verse ${verseNum}</p>
          
          <!-- Understanding -->
          <div class="mb-3">
            <p class="text-amber-400/80 text-xs font-semibold mb-1">${L.understanding}</p>
            <p class="text-sm text-slate-300 leading-relaxed">${insight.understanding || ''}</p>
          </div>
          
          <!-- Living It Out -->
          <div class="mb-3">
            <p class="text-amber-400/80 text-xs font-semibold mb-1">${L.livingItOut}</p>
            <p class="text-sm text-slate-300 leading-relaxed">${insight.livingItOut || ''}</p>
          </div>
          
          <!-- God's Love -->
          <div class="mb-3">
            <p class="text-amber-400/80 text-xs font-semibold mb-1">${L.godsLove}</p>
            <p class="text-sm text-slate-300 leading-relaxed">${insight.godsLove || ''}</p>
          </div>
          
          ${tyndaleNote ? `
          <!-- Dig Deeper Toggle -->
          <div class="mt-3">
            <button onclick="BibleReader.toggleDigDeeper('${uniqueId}')" 
                    id="${uniqueId}-btn"
                    class="text-xs text-amber-500/70 hover:text-amber-400 flex items-center gap-1 transition-colors">
              <span id="${uniqueId}-icon">▶</span>
              <span>${L.digDeeper}</span>
            </button>
            <div id="${uniqueId}-content" class="hidden mt-2 p-3 bg-slate-900/50 rounded-lg border border-slate-700">
              <p class="text-xs text-slate-400 leading-relaxed">${tyndaleNote}</p>
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
      highlightedVerses: this.highlightedVerses.map(h => h.verse) // Return just verse numbers for saving
    };
  },

  /**
   * Show error message
   */
  showError(message) {
    if (this.elements.bibleText) {
      this.elements.bibleText.innerHTML = `
        <div class="text-center py-8">
          <p class="text-red-400 text-sm">${message}</p>
          <button onclick="BibleReader.loadChapter('JHN', 1)" class="mt-4 text-amber-500 text-xs hover:underline">
            Start with John 1
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
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BibleReader;
}
