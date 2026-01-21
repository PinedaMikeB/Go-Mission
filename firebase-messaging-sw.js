/**
 * Go Mission - Combined Service Worker
 * Handles: Push Notifications, Caching, Auto-Updates
 */

// ============================================
// PWA CACHING & AUTO-UPDATE
// ============================================

const CACHE_NAME = 'go-mission-v1.0.2';

// Files to cache
const STATIC_CACHE = [
    '/',
    '/index.html',
    '/manifest.json',
    '/offline.html',
    '/icons/icon-192.png',
    '/icons/icon-512.png'
];

// Install - cache static assets & skip waiting
self.addEventListener('install', (event) => {
    console.log('[SW] Installing:', CACHE_NAME);
    self.skipWaiting();
    
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_CACHE).catch(err => {
                console.log('[SW] Cache addAll error:', err);
            });
        })
    );
});

// Activate - clean old caches & claim clients
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating:', CACHE_NAME);
    
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((name) => {
                    if (name !== CACHE_NAME && name.startsWith('go-mission-')) {
                        console.log('[SW] Deleting old cache:', name);
                        return caches.delete(name);
                    }
                })
            );
        }).then(() => {
            return self.clients.claim();
        }).then(() => {
            // Notify clients about update
            return self.clients.matchAll().then((clients) => {
                clients.forEach((client) => {
                    client.postMessage({ type: 'SW_UPDATED', version: CACHE_NAME });
                });
            });
        })
    );
});

// Fetch - Network First for HTML/JS/CSS, Cache First for assets
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);
    
    // Skip non-GET and cross-origin
    if (event.request.method !== 'GET') return;
    if (url.origin !== location.origin) return;
    
    // HTML pages - Network First
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                    return response;
                })
                .catch(() => caches.match(event.request).then(r => r || caches.match('/offline.html')))
        );
        return;
    }
    
    // JS/CSS - Network First
    if (url.pathname.endsWith('.js') || url.pathname.endsWith('.css')) {
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                    return response;
                })
                .catch(() => caches.match(event.request))
        );
        return;
    }
    
    // Other assets - Cache First
    event.respondWith(
        caches.match(event.request).then((cached) => {
            if (cached) return cached;
            return fetch(event.request).then((response) => {
                const clone = response.clone();
                caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                return response;
            });
        })
    );
});

// Message handler
self.addEventListener('message', (event) => {
    if (event.data?.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});


// ============================================
// FIREBASE PUSH NOTIFICATIONS
// ============================================

importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: "AIzaSyBarR1ENd5qBWHZBGhKdxa-Zrw3Y8XpoT4",
    authDomain: "shaped-by-grace.firebaseapp.com",
    projectId: "shaped-by-grace",
    storageBucket: "shaped-by-grace.firebasestorage.app",
    messagingSenderId: "421948043828",
    appId: "1:421948043828:web:4a8eb4ac2aa34df4c89061"
});

const messaging = firebase.messaging();

// Background push notifications
messaging.onBackgroundMessage((payload) => {
    console.log('[SW] Background message:', payload);
    
    const title = payload.notification?.title || 'Go Mission';
    const options = {
        body: payload.notification?.body || 'You have a new notification',
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        tag: payload.data?.type || 'default',
        data: payload.data,
        vibrate: [100, 50, 100],
        actions: getNotificationActions(payload.data?.type)
    };
    
    return self.registration.showNotification(title, options);
});

function getNotificationActions(type) {
    switch (type) {
        case 'chat':
            return [{ action: 'open', title: 'Open Chat' }];
        case 'devotion':
            return [{ action: 'open', title: 'View' }];
        default:
            return [{ action: 'open', title: 'Open' }];
    }
}

// Notification click handler
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    
    const data = event.notification.data || {};
    let url = '/';
    
    if (data.type === 'chat' && data.groupId) {
        url = '/?openChat=' + data.groupId;
    } else if (data.type === 'devotion') {
        url = '/?openDevotion=true';
    }
    
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            // Focus existing window
            for (const client of windowClients) {
                if (client.url.includes('gomission') && 'focus' in client) {
                    client.navigate(url);
                    return client.focus();
                }
            }
            // Open new window
            if (clients.openWindow) {
                return clients.openWindow(url);
            }
        })
    );
});
