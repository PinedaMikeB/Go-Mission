/**
 * Go Mission - Bible Loader Module
 * Loads Bible text, commentary, and Quick Insights from local JSON files
 * Supports both English (BSB) and Tagalog (Tagalog WEB)
 * 
 * Data locations:
 * - Bible EN: /modules/bible/data/en/{BOOK}.json
 * - Bible TL: /modules/bible/data/tl/{BOOK}.json
 * - Quick Insights: /modules/bible/data/quick-insights/{BOOK}.json
 * - Tyndale (Dig Deeper): /modules/bible/data/commentary/tyndale-json/{BOOK}.json
 */

const BibleLoader = {
  // Base paths
  paths: {
    bibleEn: 'modules/bible/data/en',
    bibleTl: 'modules/bible/data/tl',
    commentaryEn: 'modules/bible/data/commentary/matthew-henry',
    commentaryTl: 'modules/bible/data/commentary/matthew-henry-tl',
    quickInsights: 'modules/bible/data/quick-insights',
    tyndale: 'modules/bible/data/commentary/tyndale-json'
  },
  
  // Cache for loaded data
  cache: {
    bible: {},         // { 'en:GEN': {...}, 'tl:GEN': {...} }
    commentary: {},    // Legacy - kept for compatibility
    quickInsights: {}, // { 'GEN': {...} }
    tyndale: {},       // { 'GEN': {...} }
    index: null        // Book metadata
  },

  // Track lazy-loaded inline bundles (used as local-file fallback)
  inlineBundleState: {
    en: false,
    tl: false
  },

  // Track lazy-loaded inline quick-insights scripts by book id
  inlineQuickInsightsState: {},
  
  // Book ID mapping (3-letter codes)
  bookIds: [
    'GEN', 'EXO', 'LEV', 'NUM', 'DEU', 'JOS', 'JDG', 'RUT', '1SA', '2SA',
    '1KI', '2KI', '1CH', '2CH', 'EZR', 'NEH', 'EST', 'JOB', 'PSA', 'PRO',
    'ECC', 'SNG', 'ISA', 'JER', 'LAM', 'EZK', 'DAN', 'HOS', 'JOL', 'AMO',
    'OBA', 'JON', 'MIC', 'NAM', 'HAB', 'ZEP', 'HAG', 'ZEC', 'MAL',
    'MAT', 'MRK', 'LUK', 'JHN', 'ACT', 'ROM', '1CO', '2CO', 'GAL', 'EPH',
    'PHP', 'COL', '1TH', '2TH', '1TI', '2TI', 'TIT', 'PHM', 'HEB', 'JAS',
    '1PE', '2PE', '1JN', '2JN', '3JN', 'JUD', 'REV'
  ],
  
  // Book names for display
  bookNames: {
    en: {
      'GEN': 'Genesis', 'EXO': 'Exodus', 'LEV': 'Leviticus', 'NUM': 'Numbers',
      'DEU': 'Deuteronomy', 'JOS': 'Joshua', 'JDG': 'Judges', 'RUT': 'Ruth',
      '1SA': '1 Samuel', '2SA': '2 Samuel', '1KI': '1 Kings', '2KI': '2 Kings',
      '1CH': '1 Chronicles', '2CH': '2 Chronicles', 'EZR': 'Ezra', 'NEH': 'Nehemiah',
      'EST': 'Esther', 'JOB': 'Job', 'PSA': 'Psalms', 'PRO': 'Proverbs',
      'ECC': 'Ecclesiastes', 'SNG': 'Song of Solomon', 'ISA': 'Isaiah', 'JER': 'Jeremiah',
      'LAM': 'Lamentations', 'EZK': 'Ezekiel', 'DAN': 'Daniel', 'HOS': 'Hosea',
      'JOL': 'Joel', 'AMO': 'Amos', 'OBA': 'Obadiah', 'JON': 'Jonah',
      'MIC': 'Micah', 'NAM': 'Nahum', 'HAB': 'Habakkuk', 'ZEP': 'Zephaniah',
      'HAG': 'Haggai', 'ZEC': 'Zechariah', 'MAL': 'Malachi',
      'MAT': 'Matthew', 'MRK': 'Mark', 'LUK': 'Luke', 'JHN': 'John',
      'ACT': 'Acts', 'ROM': 'Romans', '1CO': '1 Corinthians', '2CO': '2 Corinthians',
      'GAL': 'Galatians', 'EPH': 'Ephesians', 'PHP': 'Philippians', 'COL': 'Colossians',
      '1TH': '1 Thessalonians', '2TH': '2 Thessalonians', '1TI': '1 Timothy', '2TI': '2 Timothy',
      'TIT': 'Titus', 'PHM': 'Philemon', 'HEB': 'Hebrews', 'JAS': 'James',
      '1PE': '1 Peter', '2PE': '2 Peter', '1JN': '1 John', '2JN': '2 John',
      '3JN': '3 John', 'JUD': 'Jude', 'REV': 'Revelation'
    },
    tl: {
      'GEN': 'Genesis', 'EXO': 'Exodo', 'LEV': 'Levitico', 'NUM': 'Mga Bilang',
      'DEU': 'Deuteronomio', 'JOS': 'Josue', 'JDG': 'Mga Hukom', 'RUT': 'Ruth',
      '1SA': '1 Samuel', '2SA': '2 Samuel', '1KI': '1 Mga Hari', '2KI': '2 Mga Hari',
      '1CH': '1 Mga Cronica', '2CH': '2 Mga Cronica', 'EZR': 'Ezra', 'NEH': 'Nehemias',
      'EST': 'Ester', 'JOB': 'Job', 'PSA': 'Mga Awit', 'PRO': 'Mga Kawikaan',
      'ECC': 'Mangangaral', 'SNG': 'Awit ni Solomon', 'ISA': 'Isaias', 'JER': 'Jeremias',
      'LAM': 'Mga Panaghoy', 'EZK': 'Ezekiel', 'DAN': 'Daniel', 'HOS': 'Oseas',
      'JOL': 'Joel', 'AMO': 'Amos', 'OBA': 'Obadias', 'JON': 'Jonas',
      'MIC': 'Mikas', 'NAM': 'Nahum', 'HAB': 'Habakuk', 'ZEP': 'Zefanias',
      'HAG': 'Haggeo', 'ZEC': 'Zacarias', 'MAL': 'Malakias',
      'MAT': 'Mateo', 'MRK': 'Marcos', 'LUK': 'Lucas', 'JHN': 'Juan',
      'ACT': 'Mga Gawa', 'ROM': 'Roma', '1CO': '1 Corinto', '2CO': '2 Corinto',
      'GAL': 'Galacia', 'EPH': 'Efeso', 'PHP': 'Filipos', 'COL': 'Colosas',
      '1TH': '1 Tesalonica', '2TH': '2 Tesalonica', '1TI': '1 Timoteo', '2TI': '2 Timoteo',
      'TIT': 'Tito', 'PHM': 'Filemon', 'HEB': 'Mga Hebreo', 'JAS': 'Santiago',
      '1PE': '1 Pedro', '2PE': '2 Pedro', '1JN': '1 Juan', '2JN': '2 Juan',
      '3JN': '3 Juan', 'JUD': 'Judas', 'REV': 'Pahayag'
    }
  },

  /**
   * Initialize the loader
   */
  async init() {
    console.log('[BibleLoader] Initializing...');
    
    // Listen for language changes
    document.addEventListener('languageChanged', (e) => {
      console.log('[BibleLoader] Language changed to:', e.detail.lang);
    });
    
    console.log('[BibleLoader] Ready');
  },

  /**
   * Build candidate URLs for local (file://) and deployed environments.
   */
  getPathCandidates(path) {
    const cleanPath = (path || '').replace(/^\/+/, '');
    if (!cleanPath) return [];

    const candidates = [cleanPath, `/${cleanPath}`];

    // In file:// mode, resolve explicit absolute file URL as the most reliable form.
    if (typeof window !== 'undefined' && window.location?.protocol === 'file:') {
      try {
        const baseHref = window.location.href.replace(/[^/]*$/, '');
        const absoluteFileUrl = new URL(cleanPath, baseHref).href;
        candidates.unshift(absoluteFileUrl);
      } catch (e) {
        // Ignore URL construction errors and keep relative candidates.
      }
    }

    return [...new Set(candidates)];
  },

  /**
   * Parse JSON from a URL using XHR (fallback for strict file:// behavior).
   */
  fetchJsonViaXHR(url) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', url, true);
      xhr.onreadystatechange = () => {
        if (xhr.readyState !== 4) return;
        const ok = (xhr.status >= 200 && xhr.status < 300) || xhr.status === 0;
        if (!ok) {
          reject(new Error(`XHR HTTP ${xhr.status}`));
          return;
        }
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch (e) {
          reject(e);
        }
      };
      xhr.onerror = () => reject(new Error('XHR network error'));
      xhr.send();
    });
  },

  /**
   * Load JSON with resilient local-file fallback.
   */
  async fetchJson(path, options = {}) {
    const { logLabel = 'JSON', allowMissing = false } = options;
    const candidates = this.getPathCandidates(path);
    let lastError = null;
    const isFileMode = typeof window !== 'undefined' && window.location?.protocol === 'file:';

    for (const url of candidates) {
      // In file:// mode, XHR is often more reliable than fetch() for local files.
      if (isFileMode) {
        try {
          const data = await this.fetchJsonViaXHR(url);
          if (data) return data;
        } catch (xhrError) {
          lastError = xhrError;
        }
      }

      try {
        const response = await fetch(url, { cache: 'no-store' });
        const isFileResponse = isFileMode && response.status === 0;

        if (!response.ok && !isFileResponse) {
          if (allowMissing && response.status === 404) return null;
          lastError = new Error(`HTTP ${response.status} for ${url}`);
          continue;
        }

        const text = await response.text();
        if (!text || !text.trim()) {
          lastError = new Error(`Empty response for ${url}`);

          // Try XHR once more before moving to next candidate.
          if (isFileMode) {
            try {
              const data = await this.fetchJsonViaXHR(url);
              if (data) return data;
            } catch (xhrError) {
              lastError = xhrError;
            }
          }
          continue;
        }

        return JSON.parse(text);
      } catch (error) {
        lastError = error;

        // Some browsers are stricter with fetch() on file://; XHR can still work.
        if (isFileMode) {
          try {
            const data = await this.fetchJsonViaXHR(url);
            return data;
          } catch (xhrError) {
            lastError = xhrError;
          }
        }
      }
    }

    if (!allowMissing) {
      console.error(`[BibleLoader] ${logLabel} load failed for ${path}:`, lastError);
    }

    return null;
  },

  /**
   * Lazy-load inline Bible bundles for file:// fallback mode.
   */
  async loadInlineBibleBundle(lang) {
    if (lang !== 'en' && lang !== 'tl') return false;
    if (this.inlineBundleState[lang] && window.GoMissionBibleInline?.[lang]) {
      return true;
    }

    const bundlePath = `modules/bible/data-inline/${lang}-bundle.js`;
    const candidates = this.getPathCandidates(bundlePath);

    const tryScript = (index) => new Promise((resolve) => {
      if (index >= candidates.length) {
        resolve(false);
        return;
      }

      const script = document.createElement('script');
      script.src = candidates[index];
      script.async = true;

      script.onload = () => {
        const ok = !!window.GoMissionBibleInline?.[lang];
        if (ok) {
          this.inlineBundleState[lang] = true;
          resolve(true);
          return;
        }
        script.remove();
        tryScript(index + 1).then(resolve);
      };

      script.onerror = () => {
        script.remove();
        tryScript(index + 1).then(resolve);
      };

      document.head.appendChild(script);
    });

    const loaded = await tryScript(0);
    if (!loaded) {
      console.warn(`[BibleLoader] Inline bundle not found for ${lang}: ${bundlePath}`);
      return false;
    }

    console.log(`[BibleLoader] Inline bundle loaded for ${lang}`);
    return true;
  },

  /**
   * Lazy-load inline Quick Insights for local file mode fallback.
   */
  async loadInlineQuickInsights(bookId) {
    if (!bookId) return false;
    if (this.inlineQuickInsightsState[bookId] && window.GoMissionQuickInsightsInline?.[bookId]) {
      return true;
    }

    const bundlePath = `modules/bible/data-inline/quick-insights/${bookId}.js`;
    const candidates = this.getPathCandidates(bundlePath);

    const tryScript = (index) => new Promise((resolve) => {
      if (index >= candidates.length) {
        resolve(false);
        return;
      }

      const script = document.createElement('script');
      script.src = candidates[index];
      script.async = true;

      script.onload = () => {
        const ok = !!window.GoMissionQuickInsightsInline?.[bookId];
        if (ok) {
          this.inlineQuickInsightsState[bookId] = true;
          resolve(true);
          return;
        }
        script.remove();
        tryScript(index + 1).then(resolve);
      };

      script.onerror = () => {
        script.remove();
        tryScript(index + 1).then(resolve);
      };

      document.head.appendChild(script);
    });

    const loaded = await tryScript(0);
    if (!loaded) {
      return false;
    }

    console.log(`[BibleLoader] Inline Quick Insights loaded for ${bookId}`);
    return true;
  },
  
  /**
   * Get book name in current or specified language
   * @param {string} bookId - 3-letter book code (e.g., 'JHN')
   * @param {string} lang - 'en' or 'tl' (optional, uses i18n.currentLang)
   * @returns {string}
   */
  getBookName(bookId, lang = null) {
    const l = lang || (typeof i18n !== 'undefined' ? i18n.getLang() : 'en');
    return this.bookNames[l]?.[bookId] || this.bookNames.en[bookId] || bookId;
  },

  /**
   * Detect placeholder/empty book payloads so broken inline bundles do not win over real JSON.
   */
  hasUsableBookContent(book) {
    if (!book || typeof book !== 'object' || !book.chapters || typeof book.chapters !== 'object') {
      return false;
    }

    for (const chapterData of Object.values(book.chapters)) {
      const verses = chapterData?.verses || chapterData;
      if (!verses || typeof verses !== 'object') continue;

      for (const verseText of Object.values(verses)) {
        if (String(verseText || '').trim()) {
          return true;
        }
      }
    }

    return false;
  },

  /**
   * Detect whether a single chapter has at least one non-empty verse.
   */
  hasUsableChapterContent(chapterData) {
    const verses = chapterData?.verses || chapterData;
    if (!verses || typeof verses !== 'object') {
      return false;
    }

    return Object.values(verses).some((verseText) => String(verseText || '').trim());
  },
  
  /**
   * Load Bible book data
   * @param {string} bookId - 3-letter book code
   * @param {string} lang - 'en' or 'tl'
   * @returns {Promise<object>}
   */
  async loadBook(bookId, lang = null) {
    const l = lang || (typeof i18n !== 'undefined' ? i18n.getLang() : 'en');
    const cacheKey = `${l}:${bookId}`;
    const isFileMode = typeof window !== 'undefined' && window.location?.protocol === 'file:';
    
    // Return from cache if available
    if (this.cache.bible[cacheKey]) {
      return this.cache.bible[cacheKey];
    }
    
    // Determine path based on language
    const basePath = l === 'tl' ? this.paths.bibleTl : this.paths.bibleEn;
    const url = `${basePath}/${bookId}.json`;
    
    try {
      // Fast path: use preloaded inline bundle if present.
      const preloadedInline = window.GoMissionBibleInline?.[l]?.[bookId];
      if (this.hasUsableBookContent(preloadedInline)) {
        this.cache.bible[cacheKey] = preloadedInline;
        return preloadedInline;
      } else if (preloadedInline) {
        console.warn(`[BibleLoader] Ignoring empty inline bundle payload for ${bookId} (${l})`);
      }

      // File mode fallback: attempt inline bundle before fetch/XHR.
      if (isFileMode) {
        const loadedInline = await this.loadInlineBibleBundle(l);
        if (loadedInline) {
          const inlineData = window.GoMissionBibleInline?.[l]?.[bookId] || null;
          if (this.hasUsableBookContent(inlineData)) {
            this.cache.bible[cacheKey] = inlineData;
            return inlineData;
          } else if (inlineData) {
            console.warn(`[BibleLoader] Loaded inline bundle for ${bookId} (${l}) but content was empty`);
          }
        }
      }

      let data = await this.fetchJson(url, {
        logLabel: `Bible ${bookId} (${l})`,
        allowMissing: false
      });

      // Fallback for local file mode when fetch/XHR is blocked.
      if (!data) {
        const loadedInline = await this.loadInlineBibleBundle(l);
        if (loadedInline) {
          const inlineData = window.GoMissionBibleInline?.[l]?.[bookId] || null;
          data = this.hasUsableBookContent(inlineData) ? inlineData : null;
        }
      }

      if (!data) return null;

      this.cache.bible[cacheKey] = data;
      console.log(`[BibleLoader] Loaded ${bookId} (${l})`);
      return data;
      
    } catch (error) {
      console.error(`[BibleLoader] Error loading ${bookId} (${l}):`, error);
      return null;
    }
  },
  
  /**
   * Get a specific chapter
   * @param {string} bookId - 3-letter book code
   * @param {number} chapter - Chapter number
   * @param {string} lang - 'en' or 'tl'
   * @returns {Promise<object>}
   */
  async getChapter(bookId, chapter, lang = null) {
    const requestedLang = lang || (typeof i18n !== 'undefined' ? i18n.getLang() : 'en');
    const chapterKey = chapter.toString();
    const book = await this.loadBook(bookId, requestedLang);
    let chapterData = book?.chapters?.[chapterKey] || null;
    let contentLang = requestedLang;

    if (!this.hasUsableChapterContent(chapterData)) {
      const fallbackLang = requestedLang === 'en' ? 'tl' : 'en';
      const fallbackBook = await this.loadBook(bookId, fallbackLang);
      const fallbackChapterData = fallbackBook?.chapters?.[chapterKey] || null;

      if (this.hasUsableChapterContent(fallbackChapterData)) {
        chapterData = fallbackChapterData;
        contentLang = fallbackLang;
        console.warn(`[BibleLoader] Falling back to ${fallbackLang} content for ${bookId} ${chapter}`);
      }
    }

    if (!this.hasUsableChapterContent(chapterData)) return null;

    return {
      book: bookId,
      bookName: this.getBookName(bookId, requestedLang),
      chapter: chapter,
      verses: chapterData.verses || chapterData,
      requestedLanguage: requestedLang,
      contentLanguage: contentLang
    };
  },
  
  /**
   * Get a range of verses
   * @param {string} bookId - 3-letter book code
   * @param {number} chapter - Chapter number
   * @param {number} startVerse - Start verse
   * @param {number} endVerse - End verse
   * @param {string} lang - 'en' or 'tl'
   * @returns {Promise<object>}
   */
  async getVerses(bookId, chapter, startVerse, endVerse, lang = null) {
    const chapterData = await this.getChapter(bookId, chapter, lang);
    if (!chapterData) return null;
    
    const verses = {};
    for (let v = startVerse; v <= endVerse; v++) {
      if (chapterData.verses[v.toString()]) {
        verses[v] = chapterData.verses[v.toString()];
      }
    }
    
    return {
      book: bookId,
      bookName: chapterData.bookName,
      chapter: chapter,
      startVerse: startVerse,
      endVerse: endVerse,
      verses: verses
    };
  },
  
  /**
   * Load commentary for a book
   * @param {string} bookId - 3-letter book code
   * @param {string} lang - 'en' or 'tl'
   * @returns {Promise<object>}
   */
  async loadCommentary(bookId, lang = null) {
    const l = lang || (typeof i18n !== 'undefined' ? i18n.getLang() : 'en');
    const cacheKey = `${l}:${bookId}`;
    
    // Return from cache if available
    if (this.cache.commentary[cacheKey]) {
      return this.cache.commentary[cacheKey];
    }
    
    // Determine path based on language
    const basePath = l === 'tl' ? this.paths.commentaryTl : this.paths.commentaryEn;
    const url = `${basePath}/${bookId}.json`;
    
    try {
      const data = await this.fetchJson(url, {
        logLabel: `Commentary ${bookId} (${l})`,
        allowMissing: true
      });
      if (!data) {
        if (l === 'tl') {
          console.log(`[BibleLoader] TL commentary not available for ${bookId}, falling back to EN`);
          return this.loadCommentary(bookId, 'en');
        }
        return null;
      }

      this.cache.commentary[cacheKey] = data;
      console.log(`[BibleLoader] Loaded commentary ${bookId} (${l})`);
      return data;
      
    } catch (error) {
      console.error(`[BibleLoader] Error loading commentary ${bookId} (${l}):`, error);
      return null;
    }
  },
  
  /**
   * Get commentary for specific verses
   * @param {string} bookId - 3-letter book code
   * @param {number} chapter - Chapter number
   * @param {number} startVerse - Start verse (optional)
   * @param {number} endVerse - End verse (optional)
   * @param {string} lang - 'en' or 'tl'
   * @returns {Promise<object>}
   */
  async getCommentary(bookId, chapter, startVerse = null, endVerse = null, lang = null) {
    const commentary = await this.loadCommentary(bookId, lang);
    if (!commentary || !commentary.chapters) return null;
    
    const chapterComm = commentary.chapters[chapter.toString()];
    if (!chapterComm) return null;
    
    const result = {
      book: bookId,
      chapter: chapter,
      introduction: chapterComm.introduction || null,
      verses: {}
    };
    
    // If no verse range specified, return all
    if (startVerse === null) {
      result.verses = chapterComm.verses || {};
      return result;
    }
    
    // Filter to specific verse range
    const verses = chapterComm.verses || {};
    for (const [verseKey, text] of Object.entries(verses)) {
      // Handle verse ranges like "1-5"
      if (verseKey.includes('-')) {
        const [vs, ve] = verseKey.split('-').map(Number);
        if (vs <= endVerse && ve >= startVerse) {
          result.verses[verseKey] = text;
        }
      } else {
        const v = parseInt(verseKey);
        if (v >= startVerse && v <= (endVerse || startVerse)) {
          result.verses[verseKey] = text;
        }
      }
    }
    
    return result;
  },
  
  /**
   * Load Quick Insights for a book
   * @param {string} bookId - 3-letter book code
   * @returns {Promise<object>}
   */
  async loadQuickInsights(bookId) {
    const isFileMode = typeof window !== 'undefined' && window.location?.protocol === 'file:';

    // Return from cache if available
    if (this.cache.quickInsights[bookId]) {
      return this.cache.quickInsights[bookId];
    }

    // Fast path for preloaded inline quick insights
    const preloadedInline = window.GoMissionQuickInsightsInline?.[bookId];
    if (preloadedInline) {
      this.cache.quickInsights[bookId] = preloadedInline;
      return preloadedInline;
    }

    // File mode fallback: attempt inline data before fetch/XHR
    if (isFileMode) {
      const loadedInline = await this.loadInlineQuickInsights(bookId);
      if (loadedInline) {
        const inlineData = window.GoMissionQuickInsightsInline?.[bookId] || null;
        if (inlineData) {
          this.cache.quickInsights[bookId] = inlineData;
          return inlineData;
        }
      }
    }
    
    const url = `${this.paths.quickInsights}/${bookId}.json`;
    
    try {
      let data = await this.fetchJson(url, {
        logLabel: `Quick Insights ${bookId}`,
        allowMissing: true
      });

      // Final fallback for local file mode
      if (!data) {
        const loadedInline = await this.loadInlineQuickInsights(bookId);
        if (loadedInline) {
          data = window.GoMissionQuickInsightsInline?.[bookId] || null;
        }
      }

      if (!data) {
        console.log(`[BibleLoader] Quick Insights not available for ${bookId}`);
        return null;
      }

      this.cache.quickInsights[bookId] = data;
      console.log(`[BibleLoader] Loaded Quick Insights for ${bookId}`);
      return data;
      
    } catch (error) {
      console.error(`[BibleLoader] Error loading Quick Insights ${bookId}:`, error);
      return null;
    }
  },
  
  /**
   * Get Quick Insights for specific verses
   * @param {string} bookId - 3-letter book code
   * @param {number} chapter - Chapter number
   * @param {number[]} verses - Array of verse numbers
   * @param {string} lang - 'en' or 'tl'
   * @returns {Promise<object>}
   */
  async getQuickInsights(bookId, chapter, verses, lang = null) {
    const l = lang || (typeof i18n !== 'undefined' ? i18n.getLang() : 'en');
    const insights = await this.loadQuickInsights(bookId);
    
    if (!insights || !insights.chapters) return null;
    
    const chapterData = insights.chapters[chapter.toString()];
    if (!chapterData || !chapterData.verses) return null;
    
    const result = {
      book: bookId,
      chapter: chapter,
      verses: {}
    };
    
    for (const verseNum of verses) {
      const verseInsight = chapterData.verses[verseNum.toString()];
      if (verseInsight) {
        // Try requested language first
        let insight = verseInsight[l];
        
        // Fallback to English if requested language is empty or missing
        if (!insight || !insight.understanding || insight.understanding === '') {
          insight = verseInsight['en'];
          if (insight && insight.understanding) {
            console.log(`[BibleLoader] Falling back to EN for ${bookId} ${chapter}:${verseNum}`);
          }
        }
        
        if (insight && insight.understanding) {
          result.verses[verseNum] = insight;
        }
      }
    }
    
    return result;
  },
  
  /**
   * Load Tyndale notes for a book (for "Dig Deeper" feature)
   * @param {string} bookId - 3-letter book code
   * @returns {Promise<object>}
   */
  async loadTyndale(bookId) {
    // Return from cache if available
    if (this.cache.tyndale[bookId]) {
      return this.cache.tyndale[bookId];
    }
    
    const url = `${this.paths.tyndale}/${bookId}.json`;
    
    try {
      const data = await this.fetchJson(url, {
        logLabel: `Tyndale ${bookId}`,
        allowMissing: true
      });
      if (!data) {
        console.log(`[BibleLoader] Tyndale not available for ${bookId}`);
        return null;
      }

      this.cache.tyndale[bookId] = data;
      console.log(`[BibleLoader] Loaded Tyndale for ${bookId}`);
      return data;
      
    } catch (error) {
      console.error(`[BibleLoader] Error loading Tyndale ${bookId}:`, error);
      return null;
    }
  },
  
  /**
   * Get Tyndale notes for specific verses (for "Dig Deeper")
   * @param {string} bookId - 3-letter book code
   * @param {number} chapter - Chapter number
   * @param {number[]} verses - Array of verse numbers
   * @returns {Promise<object>}
   */
  async getTyndale(bookId, chapter, verses) {
    const tyndale = await this.loadTyndale(bookId);
    
    if (!tyndale || !tyndale.chapters) return null;
    
    const chapterData = tyndale.chapters[chapter.toString()];
    if (!chapterData || !chapterData.verses) return null;
    
    const result = {
      book: bookId,
      chapter: chapter,
      verses: {}
    };
    
    for (const verseNum of verses) {
      const verseNote = chapterData.verses[verseNum.toString()];
      if (verseNote) {
        result.verses[verseNum] = verseNote;
      }
    }
    
    return result;
  },
  
  /**
   * Check if Quick Insights are available for a book
   * @param {string} bookId - 3-letter book code
   * @returns {Promise<boolean>}
   */
  async hasQuickInsights(bookId) {
    try {
      const data = await this.fetchJson(`${this.paths.quickInsights}/${bookId}.json`, {
        logLabel: `Quick Insights HEAD ${bookId}`,
        allowMissing: true
      });
      return !!data;
    } catch {
      return false;
    }
  },
  
  /**
   * Parse a passage reference string
   * @param {string} ref - e.g., "John 3:16", "JHN 3:16-18"
   * @returns {object} {book, chapter, startVerse, endVerse}
   */
  parseReference(ref) {
    // Handle various formats
    const patterns = [
      // "JHN 3:16-18" or "John 3:16-18"
      /^(\w+)\s+(\d+):(\d+)-(\d+)$/i,
      // "JHN 3:16" or "John 3:16"
      /^(\w+)\s+(\d+):(\d+)$/i,
      // "JHN 3" or "John 3"
      /^(\w+)\s+(\d+)$/i
    ];
    
    for (const pattern of patterns) {
      const match = ref.match(pattern);
      if (match) {
        const bookInput = match[1].toUpperCase();
        const chapter = parseInt(match[2]);
        const startVerse = match[3] ? parseInt(match[3]) : 1;
        const endVerse = match[4] ? parseInt(match[4]) : startVerse;
        
        // Find book ID
        let bookId = bookInput;
        if (bookInput.length !== 3 || !this.bookIds.includes(bookInput)) {
          // Try to find by name
          for (const [id, name] of Object.entries(this.bookNames.en)) {
            if (name.toUpperCase().startsWith(bookInput) || 
                name.toUpperCase().replace(/\s+/g, '') === bookInput) {
              bookId = id;
              break;
            }
          }
        }
        
        return { book: bookId, chapter, startVerse, endVerse };
      }
    }
    
    return null;
  },
  
  /**
   * Format a passage reference
   * @param {string} bookId 
   * @param {number} chapter 
   * @param {number} startVerse 
   * @param {number} endVerse 
   * @param {string} lang 
   * @returns {string}
   */
  formatReference(bookId, chapter, startVerse, endVerse = null, lang = null) {
    const bookName = this.getBookName(bookId, lang);
    if (endVerse && endVerse !== startVerse) {
      return `${bookName} ${chapter}:${startVerse}-${endVerse}`;
    }
    return `${bookName} ${chapter}:${startVerse}`;
  },
  
  /**
   * Clear cache (useful for memory management)
   */
  clearCache() {
    this.cache.bible = {};
    this.cache.commentary = {};
    this.cache.quickInsights = {};
    this.cache.tyndale = {};
    console.log('[BibleLoader] Cache cleared');
  }
};

// Auto-initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => BibleLoader.init());
} else {
  BibleLoader.init();
}

// Export
if (typeof window !== 'undefined') {
  window.BibleLoader = BibleLoader;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BibleLoader;
}
