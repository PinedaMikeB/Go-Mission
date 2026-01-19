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
  highlightedVerses: [],
  chapterData: null,
  commentaryData: null,
  
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
    
    // Load saved progress
    await this.loadProgress();
    
    // Listen for passage selection from BiblePicker
    document.addEventListener('biblePassageSelected', (e) => {
      this.loadChapter(e.detail.book, e.detail.chapter);
    });
    
    // Listen for language changes
    document.addEventListener('languageChanged', () => {
      // Reload current chapter in new language
      if (this.currentBook && this.currentChapter) {
        this.loadChapter(this.currentBook, this.currentChapter);
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
    
    const verses = this.chapterData.verses;
    let html = '';
    
    for (const [verseNum, verseText] of Object.entries(verses)) {
      const isHighlighted = this.highlightedVerses.includes(parseInt(verseNum));
      html += `
        <span class="verse ${isHighlighted ? 'highlighted' : ''}" 
              data-verse="${verseNum}" 
              onclick="BibleReader.toggleHighlight(${verseNum})">
          <span class="verse-num">${verseNum}</span>${verseText}
        </span> `;
    }
    
    this.elements.bibleText.innerHTML = html;
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
   * Toggle verse highlight
   */
  async toggleHighlight(verseNum) {
    const index = this.highlightedVerses.indexOf(verseNum);
    
    if (index > -1) {
      // Remove highlight
      this.highlightedVerses.splice(index, 1);
    } else {
      // Add highlight
      this.highlightedVerses.push(verseNum);
    }
    
    // Sort highlighted verses
    this.highlightedVerses.sort((a, b) => a - b);
    
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
   * Load and display commentary for highlighted verses
   */
  async loadCommentary() {
    if (this.highlightedVerses.length === 0) return;
    
    const lang = (typeof i18n !== 'undefined') ? i18n.getLang() : 'en';
    
    // Get commentary using BibleLoader
    if (typeof BibleLoader !== 'undefined') {
      const minVerse = Math.min(...this.highlightedVerses);
      const maxVerse = Math.max(...this.highlightedVerses);
      
      this.commentaryData = await BibleLoader.getCommentary(
        this.currentBook, 
        this.currentChapter, 
        minVerse, 
        maxVerse, 
        lang
      );
    }
    
    this.renderCommentary();
  },

  /**
   * Render commentary - shows preview with expand option
   */
  renderCommentary() {
    if (!this.elements.commentaryContent) return;
    
    // Show commentary section
    this.elements.commentaryContent.classList.remove('hidden');
    
    if (!this.commentaryData || !this.commentaryData.verses || Object.keys(this.commentaryData.verses).length === 0) {
      this.elements.commentaryContent.innerHTML = `
        <p class="text-slate-400 italic text-sm">No commentary available for selected verses.</p>
      `;
      return;
    }
    
    let html = '';
    
    // Show verse commentaries with preview
    for (const [verseRef, text] of Object.entries(this.commentaryData.verses)) {
      const previewLength = 150; // characters for preview
      const needsTruncate = text.length > previewLength;
      const previewText = needsTruncate ? text.substring(0, previewLength).trim() + '...' : text;
      const uniqueId = `comm-${verseRef.replace(/[^a-z0-9]/gi, '-')}`;
      
      html += `
        <div class="mb-3">
          <p class="text-amber-500 font-bold text-xs mb-1">v.${verseRef}</p>
          <p class="text-sm text-slate-300 leading-relaxed">
            <span id="${uniqueId}-preview">${previewText}</span>
            <span id="${uniqueId}-full" class="hidden">${text}</span>
            ${needsTruncate ? `
              <button onclick="BibleReader.toggleCommentaryExpand('${uniqueId}')" 
                      id="${uniqueId}-btn"
                      class="text-amber-500 hover:text-amber-400 ml-1 text-xs font-medium">
                Read more
              </button>
            ` : ''}
          </p>
        </div>
      `;
    }
    
    this.elements.commentaryContent.innerHTML = html;
  },

  /**
   * Toggle commentary expand/collapse
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
   * Clear commentary
   */
  clearCommentary() {
    if (!this.elements.commentaryContent) return;
    
    this.elements.commentaryContent.innerHTML = `
      <p class="text-slate-500 italic text-sm">Tap verses above to see commentary</p>
    `;
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
      highlightedVerses: this.highlightedVerses
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
