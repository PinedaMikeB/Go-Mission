/**
 * Go Mission - Bible Picker Module
 * Search and browse Bible books/chapters with progressive filtering
 * 
 * Features:
 * - Progressive search (bilingual: EN/TL)
 * - Book browser with OT/NT tabs
 * - Chapter selector
 * - Recent readings
 * - Resume from last position
 */

const BiblePicker = {
  // State
  isOpen: false,
  searchQuery: '',
  selectedBook: null,
  filteredBooks: [],
  recentReadings: [],
  
  // Book metadata with chapter counts
  books: {
    // Old Testament
    'GEN': { chapters: 50, testament: 'OT', order: 1 },
    'EXO': { chapters: 40, testament: 'OT', order: 2 },
    'LEV': { chapters: 27, testament: 'OT', order: 3 },
    'NUM': { chapters: 36, testament: 'OT', order: 4 },
    'DEU': { chapters: 34, testament: 'OT', order: 5 },
    'JOS': { chapters: 24, testament: 'OT', order: 6 },
    'JDG': { chapters: 21, testament: 'OT', order: 7 },
    'RUT': { chapters: 4, testament: 'OT', order: 8 },
    '1SA': { chapters: 31, testament: 'OT', order: 9 },
    '2SA': { chapters: 24, testament: 'OT', order: 10 },
    '1KI': { chapters: 22, testament: 'OT', order: 11 },
    '2KI': { chapters: 25, testament: 'OT', order: 12 },
    '1CH': { chapters: 29, testament: 'OT', order: 13 },
    '2CH': { chapters: 36, testament: 'OT', order: 14 },
    'EZR': { chapters: 10, testament: 'OT', order: 15 },
    'NEH': { chapters: 13, testament: 'OT', order: 16 },
    'EST': { chapters: 10, testament: 'OT', order: 17 },
    'JOB': { chapters: 42, testament: 'OT', order: 18 },
    'PSA': { chapters: 150, testament: 'OT', order: 19 },
    'PRO': { chapters: 31, testament: 'OT', order: 20 },
    'ECC': { chapters: 12, testament: 'OT', order: 21 },
    'SNG': { chapters: 8, testament: 'OT', order: 22 },
    'ISA': { chapters: 66, testament: 'OT', order: 23 },
    'JER': { chapters: 52, testament: 'OT', order: 24 },
    'LAM': { chapters: 5, testament: 'OT', order: 25 },
    'EZK': { chapters: 48, testament: 'OT', order: 26 },
    'DAN': { chapters: 12, testament: 'OT', order: 27 },
    'HOS': { chapters: 14, testament: 'OT', order: 28 },
    'JOL': { chapters: 3, testament: 'OT', order: 29 },
    'AMO': { chapters: 9, testament: 'OT', order: 30 },
    'OBA': { chapters: 1, testament: 'OT', order: 31 },
    'JON': { chapters: 4, testament: 'OT', order: 32 },
    'MIC': { chapters: 7, testament: 'OT', order: 33 },
    'NAM': { chapters: 3, testament: 'OT', order: 34 },
    'HAB': { chapters: 3, testament: 'OT', order: 35 },
    'ZEP': { chapters: 3, testament: 'OT', order: 36 },
    'HAG': { chapters: 2, testament: 'OT', order: 37 },
    'ZEC': { chapters: 14, testament: 'OT', order: 38 },
    'MAL': { chapters: 4, testament: 'OT', order: 39 },
    // New Testament
    'MAT': { chapters: 28, testament: 'NT', order: 40 },
    'MRK': { chapters: 16, testament: 'NT', order: 41 },
    'LUK': { chapters: 24, testament: 'NT', order: 42 },
    'JHN': { chapters: 21, testament: 'NT', order: 43 },
    'ACT': { chapters: 28, testament: 'NT', order: 44 },
    'ROM': { chapters: 16, testament: 'NT', order: 45 },
    '1CO': { chapters: 16, testament: 'NT', order: 46 },
    '2CO': { chapters: 13, testament: 'NT', order: 47 },
    'GAL': { chapters: 6, testament: 'NT', order: 48 },
    'EPH': { chapters: 6, testament: 'NT', order: 49 },
    'PHP': { chapters: 4, testament: 'NT', order: 50 },
    'COL': { chapters: 4, testament: 'NT', order: 51 },
    '1TH': { chapters: 5, testament: 'NT', order: 52 },
    '2TH': { chapters: 3, testament: 'NT', order: 53 },
    '1TI': { chapters: 6, testament: 'NT', order: 54 },
    '2TI': { chapters: 4, testament: 'NT', order: 55 },
    'TIT': { chapters: 3, testament: 'NT', order: 56 },
    'PHM': { chapters: 1, testament: 'NT', order: 57 },
    'HEB': { chapters: 13, testament: 'NT', order: 58 },
    'JAS': { chapters: 5, testament: 'NT', order: 59 },
    '1PE': { chapters: 5, testament: 'NT', order: 60 },
    '2PE': { chapters: 3, testament: 'NT', order: 61 },
    '1JN': { chapters: 5, testament: 'NT', order: 62 },
    '2JN': { chapters: 1, testament: 'NT', order: 63 },
    '3JN': { chapters: 1, testament: 'NT', order: 64 },
    'JUD': { chapters: 1, testament: 'NT', order: 65 },
    'REV': { chapters: 22, testament: 'NT', order: 66 }
  },

  // Search aliases for fuzzy matching
  searchAliases: {
    'GEN': ['genesis', 'gen', 'henesis'],
    'EXO': ['exodus', 'exo', 'exodo'],
    'LEV': ['leviticus', 'lev', 'levitico'],
    'NUM': ['numbers', 'num', 'mga bilang', 'bilang'],
    'DEU': ['deuteronomy', 'deut', 'deu', 'deuteronomio'],
    'JOS': ['joshua', 'josh', 'jos', 'josue'],
    'JDG': ['judges', 'judg', 'jdg', 'mga hukom', 'hukom'],
    'RUT': ['ruth', 'rut'],
    '1SA': ['1 samuel', '1samuel', '1sa', '1 sam'],
    '2SA': ['2 samuel', '2samuel', '2sa', '2 sam'],
    '1KI': ['1 kings', '1kings', '1ki', '1 hari', 'mga hari'],
    '2KI': ['2 kings', '2kings', '2ki', '2 hari'],
    '1CH': ['1 chronicles', '1chronicles', '1ch', '1 cronica', 'mga cronica'],
    '2CH': ['2 chronicles', '2chronicles', '2ch', '2 cronica'],
    'EZR': ['ezra', 'ezr'],
    'NEH': ['nehemiah', 'neh', 'nehemias'],
    'EST': ['esther', 'est', 'ester'],
    'JOB': ['job'],
    'PSA': ['psalms', 'psalm', 'psa', 'ps', 'mga awit', 'awit', 'salmo'],
    'PRO': ['proverbs', 'prov', 'pro', 'mga kawikaan', 'kawikaan'],
    'ECC': ['ecclesiastes', 'ecc', 'eccl', 'mangangaral'],
    'SNG': ['song of solomon', 'song', 'sng', 'sos', 'awit ni solomon'],
    'ISA': ['isaiah', 'isa', 'isaias'],
    'JER': ['jeremiah', 'jer', 'jeremias'],
    'LAM': ['lamentations', 'lam', 'mga panaghoy', 'panaghoy'],
    'EZK': ['ezekiel', 'ezek', 'ezk'],
    'DAN': ['daniel', 'dan'],
    'HOS': ['hosea', 'hos', 'oseas'],
    'JOL': ['joel', 'jol'],
    'AMO': ['amos', 'amo'],
    'OBA': ['obadiah', 'oba', 'obadias'],
    'JON': ['jonah', 'jon', 'jonas'],
    'MIC': ['micah', 'mic', 'mikas'],
    'NAM': ['nahum', 'nam'],
    'HAB': ['habakkuk', 'hab', 'habakuk'],
    'ZEP': ['zephaniah', 'zep', 'zefanias'],
    'HAG': ['haggai', 'hag', 'haggeo'],
    'ZEC': ['zechariah', 'zec', 'zech', 'zacarias'],
    'MAL': ['malachi', 'mal', 'malakias'],
    'MAT': ['matthew', 'matt', 'mat', 'mateo'],
    'MRK': ['mark', 'mrk', 'marcos'],
    'LUK': ['luke', 'luk', 'lucas'],
    'JHN': ['john', 'jhn', 'jn', 'juan'],
    'ACT': ['acts', 'act', 'mga gawa', 'gawa'],
    'ROM': ['romans', 'rom', 'roma'],
    '1CO': ['1 corinthians', '1corinthians', '1co', '1 cor', '1 corinto', 'corinto'],
    '2CO': ['2 corinthians', '2corinthians', '2co', '2 cor', '2 corinto'],
    'GAL': ['galatians', 'gal', 'galacia'],
    'EPH': ['ephesians', 'eph', 'efeso'],
    'PHP': ['philippians', 'phil', 'php', 'filipos'],
    'COL': ['colossians', 'col', 'colosas'],
    '1TH': ['1 thessalonians', '1thessalonians', '1th', '1 thess', '1 tesalonica', 'tesalonica'],
    '2TH': ['2 thessalonians', '2thessalonians', '2th', '2 thess', '2 tesalonica'],
    '1TI': ['1 timothy', '1timothy', '1ti', '1 tim', '1 timoteo', 'timoteo'],
    '2TI': ['2 timothy', '2timothy', '2ti', '2 tim', '2 timoteo'],
    'TIT': ['titus', 'tit', 'tito'],
    'PHM': ['philemon', 'phm', 'phlm', 'filemon'],
    'HEB': ['hebrews', 'heb', 'mga hebreo', 'hebreo'],
    'JAS': ['james', 'jas', 'santiago'],
    '1PE': ['1 peter', '1peter', '1pe', '1 pet', '1 pedro', 'pedro'],
    '2PE': ['2 peter', '2peter', '2pe', '2 pet', '2 pedro'],
    '1JN': ['1 john', '1john', '1jn', '1 jn', '1 juan'],
    '2JN': ['2 john', '2john', '2jn', '2 jn', '2 juan'],
    '3JN': ['3 john', '3john', '3jn', '3 jn', '3 juan'],
    'JUD': ['jude', 'jud', 'judas'],
    'REV': ['revelation', 'rev', 'pahayag', 'apocalipsis']
  },

  /**
   * Initialize the picker
   */
  init() {
    this.loadRecentReadings();
    this.createModalHTML();
    this.bindEvents();
    console.log('[BiblePicker] Initialized');
  },

  /**
   * Load recent readings from localStorage
   */
  loadRecentReadings() {
    try {
      const saved = localStorage.getItem('goMission_recentReadings');
      this.recentReadings = saved ? JSON.parse(saved) : [];
    } catch (e) {
      this.recentReadings = [];
    }
  },

  /**
   * Save recent reading
   */
  addRecentReading(book, chapter) {
    // Remove if already exists
    this.recentReadings = this.recentReadings.filter(r => !(r.book === book && r.chapter === chapter));
    
    // Add to front
    this.recentReadings.unshift({ book, chapter, timestamp: Date.now() });
    
    // Keep only last 5
    this.recentReadings = this.recentReadings.slice(0, 5);
    
    // Save
    localStorage.setItem('goMission_recentReadings', JSON.stringify(this.recentReadings));
  },

  /**
   * Get book name in current language
   */
  getBookName(bookId) {
    if (typeof BibleLoader !== 'undefined') {
      return BibleLoader.getBookName(bookId);
    }
    return bookId;
  },

  /**
   * Search books by query
   */
  searchBooks(query) {
    if (!query || query.length === 0) {
      return Object.keys(this.books);
    }
    
    const q = query.toLowerCase().trim();
    const results = [];
    
    for (const [bookId, aliases] of Object.entries(this.searchAliases)) {
      // Check if any alias starts with or contains the query
      const matches = aliases.some(alias => 
        alias.startsWith(q) || alias.includes(q)
      );
      
      if (matches) {
        results.push(bookId);
      }
    }
    
    // Sort by order
    return results.sort((a, b) => this.books[a].order - this.books[b].order);
  },

  /**
   * Create the modal HTML
   */
  createModalHTML() {
    const modal = document.createElement('div');
    modal.id = 'biblePickerModal';
    modal.className = 'fixed inset-0 z-[60] hidden';  // z-60 to appear above fullscreen (z-50)
    modal.innerHTML = `
      <!-- Backdrop -->
      <div class="absolute inset-0 bg-black/80 backdrop-blur-sm" onclick="BiblePicker.close()"></div>
      
      <!-- Modal Content - Uses theme variables -->
      <div class="absolute inset-x-4 top-20 bottom-20 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-md bg-[var(--card-bg)] rounded-2xl border border-[var(--card-border)] shadow-2xl flex flex-col overflow-hidden">
        
        <!-- Header -->
        <div class="p-4 border-b border-[var(--card-border)]">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-lg font-bold text-amber-500">📖 Select Passage</h3>
            <button onclick="BiblePicker.close()" class="text-[var(--text-muted)] hover:text-amber-500 p-1">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
          
          <!-- Search Box -->
          <div class="relative">
            <input type="text" 
                   id="bibleSearchInput" 
                   placeholder="Search book... (e.g., John, Juan, Genesis)"
                   class="w-full bg-[var(--input-bg)] border border-[var(--card-border)] rounded-xl px-4 py-3 pl-10 text-sm text-[var(--text-color)] placeholder-[var(--text-muted)] focus:outline-none focus:border-amber-500/50"
                   oninput="BiblePicker.onSearch(this.value)"
                   autocomplete="off">
            <svg class="w-5 h-5 text-amber-500/50 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
            </svg>
          </div>
        </div>
        
        <!-- Content Area -->
        <div class="flex-1 overflow-hidden flex flex-col">
          
          <!-- Book List View -->
          <div id="pickerBookList" class="flex-1 overflow-y-auto custom-scrollbar">
            
            <!-- Recent Readings -->
            <div id="pickerRecent" class="p-3 border-b border-[var(--card-border)]">
              <p class="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Recent</p>
              <div id="pickerRecentList" class="flex flex-wrap gap-2">
                <!-- Populated dynamically -->
              </div>
            </div>
            
            <!-- Testament Tabs -->
            <div class="flex border-b border-[var(--card-border)]">
              <button id="tabOT" onclick="BiblePicker.showTestament('OT')" class="flex-1 py-3 text-xs font-bold uppercase tracking-wider text-amber-500 border-b-2 border-amber-500">
                Old Testament
              </button>
              <button id="tabNT" onclick="BiblePicker.showTestament('NT')" class="flex-1 py-3 text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] border-b-2 border-transparent hover:text-[var(--text-color)]">
                New Testament
              </button>
            </div>
            
            <!-- Book Grid -->
            <div id="pickerBookGrid" class="p-3 grid grid-cols-3 gap-2">
              <!-- Populated dynamically -->
            </div>
            
          </div>
          
          <!-- Chapter Selector View (hidden by default) -->
          <div id="pickerChapterView" class="hidden flex-1 overflow-y-auto custom-scrollbar">
            <div class="p-4 border-b border-[var(--card-border)] flex items-center gap-3">
              <button onclick="BiblePicker.backToBooks()" class="text-amber-500 hover:text-amber-400">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
                </svg>
              </button>
              <div>
                <p class="text-lg font-bold text-amber-500" id="pickerSelectedBookName">John</p>
                <p class="text-[10px] text-[var(--text-muted)]" id="pickerChapterCount">21 chapters</p>
              </div>
            </div>
            <div id="pickerChapterGrid" class="p-3 grid grid-cols-5 gap-2">
              <!-- Populated dynamically -->
            </div>
          </div>
          
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
  },

  /**
   * Bind events
   */
  bindEvents() {
    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    });
  },

  /**
   * Open the picker modal
   */
  open() {
    const modal = document.getElementById('biblePickerModal');
    modal.classList.remove('hidden');
    this.isOpen = true;
    
    // Reset state
    this.selectedBook = null;
    this.searchQuery = '';
    document.getElementById('bibleSearchInput').value = '';
    
    // Show book list, hide chapter view
    document.getElementById('pickerBookList').classList.remove('hidden');
    document.getElementById('pickerChapterView').classList.add('hidden');
    
    // Populate recent readings
    this.renderRecentReadings();
    
    // Show NT by default (for Gospel-focused app)
    this.showTestament('NT');
    
    // Focus search input
    setTimeout(() => {
      document.getElementById('bibleSearchInput').focus();
    }, 100);
  },

  /**
   * Close the picker modal
   */
  close() {
    const modal = document.getElementById('biblePickerModal');
    modal.classList.add('hidden');
    this.isOpen = false;
  },

  /**
   * Handle search input
   */
  onSearch(query) {
    this.searchQuery = query;
    
    if (query.length > 0) {
      // Show filtered results
      const results = this.searchBooks(query);
      this.renderFilteredBooks(results);
    } else {
      // Show testament view
      this.showTestament(document.getElementById('tabNT').classList.contains('text-amber-500') ? 'NT' : 'OT');
    }
  },

  /**
   * Render filtered book results
   */
  renderFilteredBooks(bookIds) {
    const grid = document.getElementById('pickerBookGrid');
    
    if (bookIds.length === 0) {
      grid.innerHTML = `
        <div class="col-span-3 text-center py-8">
          <p class="text-slate-500 text-sm">No books found</p>
        </div>
      `;
      return;
    }
    
    grid.innerHTML = bookIds.map(bookId => `
      <button onclick="BiblePicker.selectBook('${bookId}')" 
              class="p-3 bg-[var(--input-bg)] hover:bg-amber-500/20 border border-[var(--card-border)] hover:border-amber-500/40 rounded-xl text-center transition-all">
        <p class="text-sm font-bold text-[var(--text-color)] truncate">${this.getBookName(bookId)}</p>
        <p class="text-[10px] text-[var(--text-muted)]">${this.books[bookId].chapters} ch</p>
      </button>
    `).join('');
  },

  /**
   * Show books by testament
   */
  showTestament(testament) {
    // Update tabs
    const tabOT = document.getElementById('tabOT');
    const tabNT = document.getElementById('tabNT');
    
    if (testament === 'OT') {
      tabOT.classList.add('text-amber-500', 'border-amber-500');
      tabOT.classList.remove('text-[var(--text-muted)]', 'border-transparent');
      tabNT.classList.remove('text-amber-500', 'border-amber-500');
      tabNT.classList.add('text-[var(--text-muted)]', 'border-transparent');
    } else {
      tabNT.classList.add('text-amber-500', 'border-amber-500');
      tabNT.classList.remove('text-[var(--text-muted)]', 'border-transparent');
      tabOT.classList.remove('text-amber-500', 'border-amber-500');
      tabOT.classList.add('text-[var(--text-muted)]', 'border-transparent');
    }
    
    // Filter books
    const bookIds = Object.entries(this.books)
      .filter(([id, data]) => data.testament === testament)
      .sort((a, b) => a[1].order - b[1].order)
      .map(([id]) => id);
    
    this.renderFilteredBooks(bookIds);
  },

  /**
   * Render recent readings
   */
  renderRecentReadings() {
    const container = document.getElementById('pickerRecentList');
    const recentSection = document.getElementById('pickerRecent');
    
    if (this.recentReadings.length === 0) {
      recentSection.classList.add('hidden');
      return;
    }
    
    recentSection.classList.remove('hidden');
    container.innerHTML = this.recentReadings.map(r => `
      <button onclick="BiblePicker.selectChapter('${r.book}', ${r.chapter})" 
              class="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-lg text-xs text-amber-400 font-medium transition-all">
        ${this.getBookName(r.book)} ${r.chapter}
      </button>
    `).join('');
  },

  /**
   * Select a book - show chapter selector
   */
  selectBook(bookId) {
    this.selectedBook = bookId;
    
    // Hide book list, show chapter view
    document.getElementById('pickerBookList').classList.add('hidden');
    document.getElementById('pickerChapterView').classList.remove('hidden');
    
    // Update header
    document.getElementById('pickerSelectedBookName').textContent = this.getBookName(bookId);
    document.getElementById('pickerChapterCount').textContent = `${this.books[bookId].chapters} chapters`;
    
    // Render chapter grid
    const grid = document.getElementById('pickerChapterGrid');
    const chapters = this.books[bookId].chapters;
    
    grid.innerHTML = Array.from({ length: chapters }, (_, i) => i + 1).map(ch => `
      <button onclick="BiblePicker.selectChapter('${bookId}', ${ch})" 
              class="aspect-square flex items-center justify-center bg-[var(--input-bg)] hover:bg-amber-500/20 border border-[var(--card-border)] hover:border-amber-500/40 rounded-xl text-sm font-bold text-[var(--text-color)] transition-all">
        ${ch}
      </button>
    `).join('');
  },

  /**
   * Go back to book list
   */
  backToBooks() {
    this.selectedBook = null;
    document.getElementById('pickerBookList').classList.remove('hidden');
    document.getElementById('pickerChapterView').classList.add('hidden');
  },

  /**
   * Select a chapter - dispatch event and close
   */
  selectChapter(bookId, chapter) {
    // Save to recent
    this.addRecentReading(bookId, chapter);
    
    // Dispatch event for BibleReader to handle
    const event = new CustomEvent('biblePassageSelected', {
      detail: { book: bookId, chapter: chapter }
    });
    document.dispatchEvent(event);
    
    // Close modal
    this.close();
    
    console.log(`[BiblePicker] Selected: ${bookId} ${chapter}`);
  }
};

// Auto-initialize when DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => BiblePicker.init());
} else {
  BiblePicker.init();
}

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BiblePicker;
}
