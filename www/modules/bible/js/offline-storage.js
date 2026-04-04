/**
 * Go Mission - Offline Storage Manager
 * IndexedDB-based storage for Bible, Commentary, and Journal
 * Supports offline-first with background sync
 * 
 * @module OfflineStorage
 */

const DB_NAME = 'GoMissionDB';
const DB_VERSION = 1;

// Store names
const STORES = {
  BIBLE_EN: 'bible_en',
  BIBLE_TL: 'bible_tl',
  COMMENTARY_EN: 'commentary_en',
  COMMENTARY_TL: 'commentary_tl',
  JOURNAL: 'journal',
  SYNC_QUEUE: 'sync_queue',
  SETTINGS: 'settings'
};

let db = null;

/**
 * Initialize the database
 */
async function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };
    
    request.onupgradeneeded = (event) => {
      const database = event.target.result;
      
      // Bible stores (keyed by book ID)
      if (!database.objectStoreNames.contains(STORES.BIBLE_EN)) {
        database.createObjectStore(STORES.BIBLE_EN, { keyPath: 'id' });
      }
      if (!database.objectStoreNames.contains(STORES.BIBLE_TL)) {
        database.createObjectStore(STORES.BIBLE_TL, { keyPath: 'id' });
      }
      
      // Commentary stores (keyed by book ID)
      if (!database.objectStoreNames.contains(STORES.COMMENTARY_EN)) {
        database.createObjectStore(STORES.COMMENTARY_EN, { keyPath: 'id' });
      }
      if (!database.objectStoreNames.contains(STORES.COMMENTARY_TL)) {
        database.createObjectStore(STORES.COMMENTARY_TL, { keyPath: 'id' });
      }
      
      // Journal store (keyed by date string YYYY-MM-DD)
      if (!database.objectStoreNames.contains(STORES.JOURNAL)) {
        const journalStore = database.createObjectStore(STORES.JOURNAL, { keyPath: 'date' });
        journalStore.createIndex('synced', 'synced', { unique: false });
        journalStore.createIndex('userId', 'userId', { unique: false });
      }
      
      // Sync queue for offline changes
      if (!database.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
        const syncStore = database.createObjectStore(STORES.SYNC_QUEUE, { keyPath: 'id', autoIncrement: true });
        syncStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
      
      // Settings store
      if (!database.objectStoreNames.contains(STORES.SETTINGS)) {
        database.createObjectStore(STORES.SETTINGS, { keyPath: 'key' });
      }
    };
  });
}

/**
 * Get database instance (initialize if needed)
 */
async function getDB() {
  if (!db) {
    await initDB();
  }
  return db;
}

// ============================================
// BIBLE OPERATIONS
// ============================================

/**
 * Save a Bible book to IndexedDB
 */
async function saveBibleBook(lang, bookData) {
  const database = await getDB();
  const storeName = lang === 'tl' ? STORES.BIBLE_TL : STORES.BIBLE_EN;
  
  return new Promise((resolve, reject) => {
    const tx = database.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.put(bookData);
    
    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get a Bible book from IndexedDB
 */
async function getBibleBook(lang, bookId) {
  const database = await getDB();
  const storeName = lang === 'tl' ? STORES.BIBLE_TL : STORES.BIBLE_EN;
  
  return new Promise((resolve, reject) => {
    const tx = database.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.get(bookId);
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get a specific verse
 */
async function getVerse(lang, bookId, chapter, verse) {
  const book = await getBibleBook(lang, bookId);
  if (!book || !book.chapters[chapter]) return null;
  return book.chapters[chapter].verses[verse] || null;
}

/**
 * Get a full chapter
 */
async function getChapter(lang, bookId, chapter) {
  const book = await getBibleBook(lang, bookId);
  if (!book || !book.chapters[chapter]) return null;
  return book.chapters[chapter];
}

// ============================================
// COMMENTARY OPERATIONS
// ============================================

/**
 * Save commentary for a book
 */
async function saveCommentary(lang, commentaryData) {
  const database = await getDB();
  const storeName = lang === 'tl' ? STORES.COMMENTARY_TL : STORES.COMMENTARY_EN;
  
  return new Promise((resolve, reject) => {
    const tx = database.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.put(commentaryData);
    
    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get commentary for a verse (handles verse ranges)
 */
async function getCommentary(lang, bookId, chapter, verse) {
  const database = await getDB();
  const storeName = lang === 'tl' ? STORES.COMMENTARY_TL : STORES.COMMENTARY_EN;
  
  return new Promise(async (resolve, reject) => {
    const tx = database.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.get(bookId);
    
    request.onsuccess = () => {
      const book = request.result;
      if (!book || !book.chapters[chapter]) {
        resolve(null);
        return;
      }
      
      const verses = book.chapters[chapter].verses || {};
      
      // Try exact verse match first
      if (verses[verse]) {
        resolve(verses[verse]);
        return;
      }
      
      // Try verse range match (e.g., "1" for verse in range 1-5)
      for (const key of Object.keys(verses)) {
        if (key.includes('-')) {
          const [start, end] = key.split('-').map(Number);
          if (verse >= start && verse <= end) {
            resolve(verses[key]);
            return;
          }
        }
      }
      
      resolve(null);
    };
    request.onerror = () => reject(request.error);
  });
}

// ============================================
// JOURNAL OPERATIONS
// ============================================

/**
 * Save a journal entry (auto-queues for sync)
 */
async function saveJournalEntry(entry) {
  const database = await getDB();
  
  entry.synced = entry.synced || false;
  entry.updatedAt = new Date().toISOString();
  
  return new Promise((resolve, reject) => {
    const tx = database.transaction([STORES.JOURNAL, STORES.SYNC_QUEUE], 'readwrite');
    const journalStore = tx.objectStore(STORES.JOURNAL);
    
    const journalRequest = journalStore.put(entry);
    
    journalRequest.onsuccess = () => {
      if (!entry.synced) {
        const syncStore = tx.objectStore(STORES.SYNC_QUEUE);
        syncStore.add({
          type: 'journal',
          action: 'upsert',
          data: entry,
          timestamp: Date.now()
        });
      }
      resolve(true);
    };
    journalRequest.onerror = () => reject(journalRequest.error);
  });
}

/**
 * Get a journal entry by date
 */
async function getJournalEntry(date) {
  const database = await getDB();
  
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORES.JOURNAL, 'readonly');
    const store = tx.objectStore(STORES.JOURNAL);
    const request = store.get(date);
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get all journal entries
 */
async function getAllJournalEntries() {
  const database = await getDB();
  
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORES.JOURNAL, 'readonly');
    const store = tx.objectStore(STORES.JOURNAL);
    const request = store.getAll();
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get unsynced journal entries
 */
async function getUnsyncedEntries() {
  const database = await getDB();
  
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORES.JOURNAL, 'readonly');
    const store = tx.objectStore(STORES.JOURNAL);
    const index = store.index('synced');
    const request = index.getAll(false);
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Mark entries as synced
 */
async function markEntriesSynced(dates) {
  const database = await getDB();
  
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORES.JOURNAL, 'readwrite');
    const store = tx.objectStore(STORES.JOURNAL);
    
    let completed = 0;
    dates.forEach(date => {
      const getRequest = store.get(date);
      getRequest.onsuccess = () => {
        const entry = getRequest.result;
        if (entry) {
          entry.synced = true;
          store.put(entry);
        }
        completed++;
        if (completed === dates.length) resolve(true);
      };
    });
    
    if (dates.length === 0) resolve(true);
  });
}

// ============================================
// SYNC OPERATIONS
// ============================================

/**
 * Process sync queue (call when online)
 */
async function processSyncQueue(syncFn) {
  const database = await getDB();
  
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORES.SYNC_QUEUE, 'readwrite');
    const store = tx.objectStore(STORES.SYNC_QUEUE);
    const request = store.getAll();
    
    request.onsuccess = async () => {
      const items = request.result;
      const synced = [];
      
      for (const item of items) {
        try {
          await syncFn(item);
          synced.push(item.id);
        } catch (e) {
          console.error('Sync failed for item:', item, e);
        }
      }
      
      // Remove synced items
      const deleteTx = database.transaction(STORES.SYNC_QUEUE, 'readwrite');
      const deleteStore = deleteTx.objectStore(STORES.SYNC_QUEUE);
      synced.forEach(id => deleteStore.delete(id));
      
      resolve(synced.length);
    };
    request.onerror = () => reject(request.error);
  });
}

// ============================================
// SETTINGS OPERATIONS
// ============================================

async function saveSetting(key, value) {
  const database = await getDB();
  
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORES.SETTINGS, 'readwrite');
    const store = tx.objectStore(STORES.SETTINGS);
    const request = store.put({ key, value });
    
    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
  });
}

async function getSetting(key, defaultValue = null) {
  const database = await getDB();
  
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORES.SETTINGS, 'readonly');
    const store = tx.objectStore(STORES.SETTINGS);
    const request = store.get(key);
    
    request.onsuccess = () => {
      resolve(request.result ? request.result.value : defaultValue);
    };
    request.onerror = () => reject(request.error);
  });
}

// ============================================
// DATA LOADING UTILITIES
// ============================================

async function isBibleLoaded(lang) {
  const book = await getBibleBook(lang, 'GEN');
  return !!book;
}

async function loadBibleData(lang, bookIds, fetchFn, progressFn) {
  for (let i = 0; i < bookIds.length; i++) {
    const bookId = bookIds[i];
    try {
      const data = await fetchFn(lang, bookId);
      await saveBibleBook(lang, data);
      if (progressFn) progressFn(i + 1, bookIds.length, bookId);
    } catch (e) {
      console.error(`Failed to load ${bookId}:`, e);
    }
  }
}

async function loadCommentaryData(lang, bookIds, fetchFn, progressFn) {
  for (let i = 0; i < bookIds.length; i++) {
    const bookId = bookIds[i];
    try {
      const data = await fetchFn(lang, bookId);
      await saveCommentary(lang, data);
      if (progressFn) progressFn(i + 1, bookIds.length, bookId);
    } catch (e) {
      console.error(`Failed to load commentary for ${bookId}:`, e);
    }
  }
}

// ============================================
// EXPORT (for ES modules) or attach to window
// ============================================

if (typeof window !== 'undefined') {
  window.OfflineStorage = {
    initDB,
    STORES,
    saveBibleBook,
    getBibleBook,
    getVerse,
    getChapter,
    isBibleLoaded,
    loadBibleData,
    saveCommentary,
    getCommentary,
    loadCommentaryData,
    saveJournalEntry,
    getJournalEntry,
    getAllJournalEntries,
    getUnsyncedEntries,
    markEntriesSynced,
    processSyncQueue,
    saveSetting,
    getSetting
  };
}
