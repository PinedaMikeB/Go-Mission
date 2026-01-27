/**
 * Go Mission - Combined Service Worker
 * Handles: Push Notifications, Caching, Silent Auto-Updates
 * 
 * SILENT UPDATE FLOW:
 * 1. Change CACHE_VERSION below
 * 2. Deploy to Netlify
 * 3. User opens app → new SW installs in background
 * 4. User leaves/blurs app → SW activates silently
 * 5. User returns → app is already updated!
 * 
 * NO PROMPTS - Fully automatic updates
 */

// ============================================
// 🔥 AUTO-UPDATING VERSION - Changes every deploy
// ============================================
const CACHE_VERSION = 'v20260127-2115';
const CACHE_NAME = 'go-mission-' + CACHE_VERSION;

// Files to cache for offline
const STATIC_CACHE = [
    '/',
    '/index.html',
    '/manifest.json',
    '/offline.html',
    '/icons/icon-192.png',
    '/icons/icon-512.png'
];


// ============================================
// INSTALL - Cache static assets
// ============================================
self.addEventListener('install', (event) => {
    console.log('[SW] Installing:', CACHE_NAME);
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[SW] Caching static assets');
                return cache.addAll(STATIC_CACHE).catch(err => {
                    console.log('[SW] Cache addAll error (non-fatal):', err);
                });
            })
            .then(() => {
                // DON'T skip waiting here - let the app control when to activate
                console.log('[SW] Install complete - waiting for activation signal');
            })
    );
});


// ============================================
// ACTIVATE - Clean old caches & claim clients
// ============================================
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating:', CACHE_NAME);
    
    event.waitUntil(
        // 1. Delete old caches
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((name) => {
                        if (name !== CACHE_NAME && name.startsWith('go-mission-')) {
                            console.log('[SW] Deleting old cache:', name);
                            return caches.delete(name);
                        }
                    })
                );
            })
            // 2. Take control of all clients immediately
            .then(() => {
                console.log('[SW] Claiming clients');
                return self.clients.claim();
            })
            .then(() => {
                console.log('[SW] ✓ Activated and controlling all clients');
            })
    );
});


// ============================================
// FETCH - Network First for code, Cache First for assets
// ============================================
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);
    
    // Skip non-GET requests
    if (event.request.method !== 'GET') return;
    
    // Skip cross-origin requests
    if (url.origin !== location.origin) return;
    
    // Skip API calls and Firebase
    if (url.pathname.includes('/api/') || url.hostname.includes('firebase')) return;
    
    // HTML pages - ALWAYS Network First (get latest)
    if (event.request.mode === 'navigate' || url.pathname.endsWith('.html')) {
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    // Clone and cache for offline
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                    return response;
                })
                .catch(() => {
                    // Offline - try cache, then offline page
                    return caches.match(event.request)
                        .then(cached => cached || caches.match('/offline.html'));
                })
        );
        return;
    }
    
    // JS files - ALWAYS Network First (critical for updates!)
    if (url.pathname.endsWith('.js')) {
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
    
    // CSS files - Network First
    if (url.pathname.endsWith('.css')) {
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
    
    // Images and other assets - Cache First (for performance)
    event.respondWith(
        caches.match(event.request)
            .then((cached) => {
                if (cached) return cached;
                
                return fetch(event.request).then((response) => {
                    // Only cache successful responses
                    if (response.ok) {
                        const clone = response.clone();
                        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                    }
                    return response;
                });
            })
    );
});


// ============================================
// MESSAGE - Handle commands from app
// ============================================
self.addEventListener('message', (event) => {
    console.log('[SW] Message received:', event.data);
    
    if (event.data?.type === 'SKIP_WAITING') {
        console.log('[SW] Skip waiting requested - activating now');
        self.skipWaiting();
    }
    
    if (event.data?.type === 'GET_VERSION') {
        event.ports[0]?.postMessage({ version: CACHE_NAME });
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
