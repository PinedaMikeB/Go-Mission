# Notifications Module

## Purpose
Real-time in-app notifications for group chat messages with toast popups, sound alerts, and badge counts.

## Status: ✅ Core Implementation Complete

## Files
```
modules/core/
├── notifications.js   # This module
├── i18n.js           # Language switching
└── theme.js          # Dark/Light mode
```

## Features
- 🔔 Toast notifications (popup at bottom)
- 🔢 Badge count on Group Chat button
- 🔊 Sound alert (two-tone beep)
- 📳 Vibration (mobile devices)
- 🔄 Real-time via Firestore onSnapshot

## Usage

```javascript
// Initialize (called automatically after Groups.init)
await Notifications.init();

// Show custom toast
Notifications.showToast({
  title: 'New Message',
  body: 'Hello from Mike!',
  icon: 'https://...',
  onClick: () => GroupChat.open()
});

// Mark as read (called when chat opens)
Notifications.markAsRead();

// Settings
Notifications.settings.sound = false;
Notifications.saveSettings();
```

## Settings (localStorage)
| Setting | Default | Description |
|---------|---------|-------------|
| sound | true | Play notification sound |
| toast | true | Show toast popup |
| vibrate | true | Vibrate on mobile |

## How It Works

1. **User logs in** → Notifications.init() called
2. **If user has a group** → Subscribe to real-time messages via onSnapshot
3. **New message arrives** → Check if from another user
4. **If chat is closed** → Show toast, play sound, update badge
5. **User opens chat** → markAsRead() clears badge

## Future: Email Notifications

Email notifications require Firebase Cloud Functions (backend).
Plan:
1. Cloud Function triggers on new chat message
2. Checks if recipient has email notifications enabled
3. Sends email via SendGrid/Mailgun

## Dependencies
- Firebase Firestore (onSnapshot for real-time)
- Groups module (Groups.currentGroup)
- GroupChat module (GroupChat.isOpen)
