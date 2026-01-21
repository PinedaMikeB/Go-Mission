# Go Mission - AI Handoff Document

> ⚡ READ THIS FIRST - Everything you need to continue development

## Quick Context
- **App**: Disciple-making journey for Filipino seekers worldwide
- **Live**: https://gomission.netlify.app
- **Repo**: /Volumes/Wotg Drive Mike/GitHub/Go-Mission
- **Firebase**: shaped-by-grace (Firestore + Auth)
- **Stack**: HTML/JS + Tailwind CDN + Firebase

---

## Current Session (2026-01-22)
- **MODULE**: PWA Force Update System
- **STATUS**: ✅ Complete - Force update lock screen implemented
- **NEXT**: Test by deploying and changing CACHE_VERSION

---

## ✅ Completed This Session

### 1. Force Update System (NEW)
Replaced silent update with FORCE update lock screen:

**Problem:**
- Silent updates weren't reliable
- Users stuck on old cached UI
- Cache hard to clear on mobile

**Solution:**
- Full-screen lock screen when update detected
- Cannot be dismissed - user MUST click "Update Now"
- Clears ALL caches before hard reload
- Checks for updates every 5 min + on app focus

**Files:**
- `/firebase-messaging-sw.js` - Version bumped to v1.0.3
- `/modules/core/pwa-updater.js` - Force update screen

**How to Push Updates:**
```
1. Change CACHE_VERSION in firebase-messaging-sw.js
2. git add . && git commit -m "v1.0.4: description"
3. git push origin main
4. Netlify auto-deploys
5. Users see force update screen
```

### 2. Landing Page for Messenger/In-App Browsers (`install.html`)
Force exits Facebook Messenger browser and redirects to Safari/Chrome:

**Features:**
- Detects in-app browsers (FB, Instagram, Messenger, Line, WeChat, etc.)
- Shows platform-specific instructions (iOS/Android)
- Auto-redirect attempts via intent URLs
- Copy-to-clipboard fallback for manual URL entry
- Clean, branded UI with Go Mission styling

**How it works:**
1. User shares `gomission.netlify.app/install.html` via Messenger
2. Page detects in-app browser
3. Shows "Open in Browser" instructions
4. Attempts auto-redirect to Chrome/Safari
5. Falls back to manual copy/paste

### 2. Install Modal (`modules/install/install-modal.js`)
3-screen PWA installation wizard:

**Flow:**
1. **Device Selection** - Choose Android/iPhone/Windows
2. **Notice Screen** - "Read ALL instructions first" reminder
3. **Steps Screen** - Scrollable step-by-step cards with icons

**Features:**
- Bilingual support (English/Tagalog toggle)
- Platform-specific instructions
- Auto-detects user's device type
- Skip option (remembers in localStorage)
- Triggers on `?install=true` parameter or first visit

### 3. Service Worker for Easy Updates (`firebase-messaging-sw.js`)
Combined service worker handles PWA caching + push notifications:

**Caching Strategy:**
- `CACHE_NAME = 'go-mission-v1.0.2'` - Version for cache busting
- Network-first for HTML/JS/CSS (always gets latest code)
- Cache-first for assets (images for performance)
- Old caches auto-deleted on activation

**Auto-Update Flow:**
```
1. New SW installs → skipWaiting()
2. SW activates → claims clients
3. Posts message: { type: 'SW_UPDATED', version }
4. App can show "Update available" toast
```

**Push Notifications:**
- Firebase Cloud Messaging integration
- Background message handling
- Notification click → opens relevant screen

### 4. App Icons
Generated icons for PWA:
- `/icons/icon-192.png` - Android/general
- `/icons/icon-512.png` - Splash screen
- `/icons/apple-touch-icon.png` - iOS home screen

---

## Key Files Reference

### Install System
| File | Purpose |
|------|---------|
| `/install.html` | Landing page for Messenger links |
| `/modules/install/install-modal.js` | PWA installation wizard |
| `/manifest.json` | PWA manifest |
| `/firebase-messaging-sw.js` | Service worker (cache + push) |
| `/icons/` | App icons |

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

## PWA Update Workflow

To push an update to users:

1. **Make code changes**
2. **Update service worker version:**
   ```javascript
   // firebase-messaging-sw.js
   const CACHE_NAME = 'go-mission-v1.0.3';  // Bump version
   ```
3. **Commit and push:**
   ```bash
   git add .
   git commit -m "v1.0.3: Description of changes"
   git push origin main
   ```
4. **Netlify auto-deploys**
5. **Users get update on next app open** (Network-first for JS)

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

### Install Modal Customization
```javascript
// Force show install modal
InstallModal.show();

// Check if installed
InstallModal.checkIfInstalled();

// Clear skip preference
localStorage.removeItem('installSkipped');
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

---

## Recent Git Commits (for reference)
```
23dedaf Add PWA auto-update, fix share icon, combine service workers
0e02f3c New install flow: read all steps first, then begin - with cards layout
ce34a4c Add Go Mission logo as app icons for iOS and Android
e5231c4 Step-by-step install wizard, fix iPhone instructions, add icon generator
8362361 Fix install page: show manual steps to open in browser from Messenger
cf8eabf Fix install flow: open in external browser, lock app until installed
bb4d47e Add install landing page and modal with bilingual instructions
```
