/**
 * Go Mission - Firebase Messaging Service Worker
 * Handles push notifications when app is in background or closed
 */

// Import Firebase scripts
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

// Firebase configuration (same as in app)
const firebaseConfig = {
  apiKey: "AIzaSyBarR1ENd5qBWHZBGhKdxa-Zrw3Y8XpoT4",
  authDomain: "shaped-by-grace.firebaseapp.com",
  projectId: "shaped-by-grace",
  storageBucket: "shaped-by-grace.firebasestorage.app",
  messagingSenderId: "421948043828",
  appId: "1:421948043828:web:4a8eb4ac2aa34df4c89061"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Get messaging instance
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[SW] Received background message:', payload);
  
  const notificationTitle = payload.notification?.title || 'Go Mission';
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new notification',
    icon: payload.notification?.icon || '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    tag: payload.data?.type || 'default',
    data: payload.data,
    vibrate: [100, 50, 100],
    actions: getActionsForType(payload.data?.type)
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Get notification actions based on type
function getActionsForType(type) {
  switch (type) {
    case 'chat':
      return [
        { action: 'open', title: 'Open Chat' },
        { action: 'dismiss', title: 'Dismiss' }
      ];
    case 'devotion':
      return [
        { action: 'open', title: 'View' },
        { action: 'dismiss', title: 'Later' }
      ];
    case 'join_request':
      return [
        { action: 'approve', title: 'Approve' },
        { action: 'open', title: 'Review' }
      ];
    default:
      return [
        { action: 'open', title: 'Open' },
        { action: 'dismiss', title: 'Dismiss' }
      ];
  }
}

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification click:', event.action);
  
  event.notification.close();
  
  const data = event.notification.data || {};
  let url = '/';
  
  // Determine URL based on notification type
  switch (data.click_action || data.type) {
    case 'OPEN_CHAT':
    case 'chat':
      url = '/?tab=group&openChat=true';
      break;
    case 'OPEN_GROUP':
    case 'join_request':
      url = '/?tab=group';
      break;
    case 'OPEN_DEVOTION':
    case 'devotion':
    case 'daily_reminder':
      url = '/?tab=journey';
      break;
    case 'OPEN_TRAINING':
    case 'training_reminder':
      url = '/?tab=training';
      break;
  }
  
  // Handle action buttons
  if (event.action === 'dismiss') {
    return;
  }
  
  // Open or focus the app
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if app is already open
        for (const client of clientList) {
          if (client.url.includes('gomission.netlify.app') && 'focus' in client) {
            client.postMessage({ type: 'NOTIFICATION_CLICK', data });
            return client.focus();
          }
        }
        // Open new window if not
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});

// Handle push event (fallback)
self.addEventListener('push', (event) => {
  console.log('[SW] Push event received');
  
  if (event.data) {
    try {
      const payload = event.data.json();
      console.log('[SW] Push payload:', payload);
    } catch (e) {
      console.log('[SW] Push data:', event.data.text());
    }
  }
});

// Service worker install
self.addEventListener('install', (event) => {
  console.log('[SW] Service Worker installed');
  self.skipWaiting();
});

// Service worker activate
self.addEventListener('activate', (event) => {
  console.log('[SW] Service Worker activated');
  event.waitUntil(clients.claim());
});
