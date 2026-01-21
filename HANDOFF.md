# Go Mission - AI Handoff Document

> ⚡ READ THIS FIRST - Everything you need to continue development

## Quick Context
- **App**: Disciple-making journey for Filipino seekers worldwide
- **Live**: https://gomission.netlify.app
- **Repo**: /Volumes/Wotg Drive Mike/GitHub/Go-Mission
- **Firebase**: shaped-by-grace (Firestore + Auth)
- **Stack**: HTML/JS + Tailwind CDN + Firebase

---

## Current Session (2026-01-21)
- **MODULE**: Push Notifications System
- **STATUS**: 🔄 In Progress - Core setup complete, needs Firebase Console setup
- **NEXT**: Generate VAPID key, deploy Cloud Functions, create app icons

---

## ✅ Completed This Session

### 1. Push Notifications Infrastructure
Created complete push notification system:

**Frontend:**
- `/modules/core/push-notifications.js` - FCM token management, permission prompts
- `/firebase-messaging-sw.js` - Service Worker for background notifications
- `/manifest.json` - PWA manifest for installable app

**Backend (Cloud Functions):**
- `/functions/index.js` - Firebase Cloud Functions for sending notifications
- Auto-notifications on: new chat messages, join requests, shared devotions
- Manual notifications: custom announcements, training reminders
- Scheduled: daily devotion reminders (6 AM Manila time)

### 2. Notification Types Supported
| Type | Trigger | Recipients |
|------|---------|------------|
| Chat message | New message in group | All group members (except sender) |
| Join request | Someone requests to join | Group leader |
| Shared devotion | User shares reflection | Group members |
| Daily reminder | 6 AM scheduled | Users with reminder enabled |
| Training reminder | Manual trigger | Group members |
| Custom announcement | Leader sends | User or group |

### 3. PWA Setup
- Added manifest.json for "Add to Home Screen"
- App icon placeholders in /icons/
- Service worker registration

### 4. Previous: Bible UX overhaul, light/dark theme for all modals

---

## 🔧 SETUP REQUIRED (Manual Steps)

### Step 1: Firebase Console - Get VAPID Key
1. Go to Firebase Console → Project Settings → Cloud Messaging
2. Under "Web Push certificates", click "Generate key pair"
3. Copy the VAPID key
4. Add to index.html: `window.FIREBASE_VAPID_KEY = 'your-key-here';`

### Step 2: Deploy Cloud Functions
```bash
cd functions
npm install
firebase login
firebase deploy --only functions
```

### Step 3: Create App Icons
Need PNG icons at these sizes: 72, 96, 128, 144, 152, 192, 384, 512
Place in `/icons/icon-{size}.png`

### Step 4: Test
1. Open app, allow notifications
2. Send chat message from another account
3. Should receive push notification

---

## Key Files Reference

### Core Modules
| File | Purpose |
|------|---------|
| `/index.html` | Main app, all screens |
| `/modules/core/theme.js` | Light/dark mode |
| `/modules/core/i18n.js` | Language switching |
| `/modules/core/push-notifications.js` | FCM token management |
| `/modules/bible/bible-reader.js` | Scripture reading |
| `/modules/groups/groups.js` | Group management |
| `/modules/groups/group-chat.js` | Chat functionality |
| `/modules/training/training.js` | Training sessions |

### Firebase Collections
| Collection | Purpose |
|------------|---------|
| `goMission_members` | User profiles, FCM tokens |
| `goMission_groups` | Mission groups |
| `goMission_chats` | Group chat messages |
| `goMission_devotions` | Saved devotions |
| `goMission_trainingContent` | Training materials |

---

## App Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    GO MISSION APP                        │
├─────────────────────────────────────────────────────────┤
│  Journey Tab    │  Group Tab    │ Training │   Dash    │
│  - Bible Reader │  - Group Info │ - Sessions│ - Stats  │
│  - Reflection   │  - Chat       │ - Progress│ - Admin  │
│  - Journal      │  - Members    │           │          │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                   FIREBASE BACKEND                       │
│  Firestore │ Auth │ Cloud Functions │ Cloud Messaging   │
└─────────────────────────────────────────────────────────┘
```

---

## Development Notes

### Theme Variables
```css
--bg-color         /* Main background */
--card-bg          /* Card background */
--text-color       /* Primary text */
--text-muted       /* Secondary text */
--card-border      /* Border colors */
--input-bg         /* Input backgrounds */
```

### Adding New Notifications
In `/functions/index.js`, use the helper functions:
```javascript
// Single user
await sendToUser(userId, { title, body, data });

// Group members
await sendToGroup(groupId, notification, excludeUserId);

// Multiple users
await sendToUsers(userIds, notification);
```
