/**
 * Go Mission - Service Worker
 * Enables offline functionality for the PWA
 * 
 * Caching Strategy:
 * - App Shell: Cache first, then network
 * - Bible Data: Cache first (loaded on first use)
 * - API Calls: Network first, fallback to cache
 */

const CACHE_NAME = 'gomission-v1';
const DATA_CACHE_NAME = 'gomission-data-v1';

// App shell - essential files for offline use
const APP_SHELL = [
  '/',
  '/index.html',
  '/modules/bible/index.html',
  '/modules/bible/js/offline-storage.js',
  '/shared/css/tailwind.min.css',
  '/shared/js/firebase-config.js',
  // Add other essential files
];

// Install event - cache app shell
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching app shell');
        return cache.addAll(APP_SHELL);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== DATA_CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Skip cross-origin requests (Firebase, APIs, etc.)
  if (url.origin !== location.origin) {
    return;
  }
  
  // For Bible/Commentary JSON data - cache first
  if (url.pathname.includes('/modules/bible/data/')) {
    event.respondWith(
      caches.open(DATA_CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          
          return fetch(event.request).then((networkResponse) => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
        });
      })
    );
    return;
  }
  
  // For HTML pages - network first, fallback to cache
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Cache successful responses
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Offline - serve from cache
          return caches.match(event.request)
            .then((cachedResponse) => {
              if (cachedResponse) {
                return cachedResponse;
              }
              // Fallback to offline page
              return caches.match('/offline.html');
            });
        })
    );
    return;
  }
  
  // For other requests - cache first, then network
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        
        return fetch(event.request)
          .then((networkResponse) => {
            // Cache successful responses
            if (networkResponse.ok) {
              const responseClone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseClone);
              });
            }
            return networkResponse;
          });
      })
  );
});

// Background sync for journal entries
self.addEventListener('sync', (event) => {
  console.log('[SW] Sync event:', event.tag);
  
  if (event.tag === 'sync-journal') {
    event.waitUntil(syncJournalEntries());
  }
});

// Push notification support (for future use)
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body || 'New notification from Go Mission',
      icon: '/icons/icon-192.png',
      badge: '/icons/badge-72.png',
      data: data.url || '/'
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title || 'Go Mission', options)
    );
  }
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow(event.notification.data)
  );
});

/**
 * Sync journal entries to Firestore
 * Called by background sync or when online
 */
async function syncJournalEntries() {
  // This will be handled by the main app
  // Service worker just triggers the sync
  const allClients = await clients.matchAll();
  
  for (const client of allClients) {
    client.postMessage({
      type: 'SYNC_JOURNAL',
      timestamp: Date.now()
    });
  }
}

// Listen for messages from the main app
self.addEventListener('message', (event) => {
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data.type === 'CACHE_BIBLE_DATA') {
    // Pre-cache Bible data files
    cacheBibleData(event.data.lang);
  }
});

/**
 * Pre-cache Bible data for a language
 */
async function cacheBibleData(lang) {
  const cache = await caches.open(DATA_CACHE_NAME);
  
  const books = [
    'GEN', 'EXO', 'LEV', 'NUM', 'DEU', 'JOS', 'JDG', 'RUT', '1SA', '2SA',
    '1KI', '2KI', '1CH', '2CH', 'EZR', 'NEH', 'EST', 'JOB', 'PSA', 'PRO',
    'ECC', 'SNG', 'ISA', 'JER', 'LAM', 'EZK', 'DAN', 'HOS', 'JOL', 'AMO',
    'OBA', 'JON', 'MIC', 'NAM', 'HAB', 'ZEP', 'HAG', 'ZEC', 'MAL',
    'MAT', 'MRK', 'LUK', 'JHN', 'ACT', 'ROM', '1CO', '2CO', 'GAL', 'EPH',
    'PHP', 'COL', '1TH', '2TH', '1TI', '2TI', 'TIT', 'PHM', 'HEB', 'JAS',
    '1PE', '2PE', '1JN', '2JN', '3JN', 'JUD', 'REV'
  ];
  
  const urls = books.map(book => `/modules/bible/data/${lang}/${book}.json`);
  
  try {
    await cache.addAll(urls);
    console.log(`[SW] Cached Bible data for ${lang}`);
  } catch (e) {
    console.error('[SW] Failed to cache Bible data:', e);
  }
}
