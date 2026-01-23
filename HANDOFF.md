# Go Mission - AI Handoff Document

> ⚡ READ THIS FIRST - Everything you need to continue development

## Quick Context
- **App**: Disciple-making journey for Filipino seekers worldwide
- **Live**: https://gomission.netlify.app
- **Repo**: /Volumes/Wotg Drive Mike/GitHub/Go-Mission
- **Firebase**: shaped-by-grace (Firestore + Auth)
- **Stack**: HTML/JS + Tailwind CDN + Firebase

---

## Current Session (2026-01-23 Evening)
- **MODULE**: Authentication - Password Reset Fix
- **STATUS**: 🔄 In Progress
- **TASK**: Fix "sendPasswordResetCode is not a function" error

### 🐛 Bug Fixed This Session

**Problem:**
Users who previously signed in with Google now cannot reset password because:
1. Cloud Functions were created but never connected to frontend
2. `window.sendPasswordResetCode` was called but never defined
3. Firebase Functions SDK was not imported

**Root Cause:**
Previous session created Cloud Functions in `/functions/index.js` but forgot to:
- Import `getFunctions` and `httpsCallable` from Firebase Functions SDK
- Initialize the functions and create callable references  
- Assign them to window objects

**Fix Applied:**
| File | Changes |
|------|---------|
| `/index.html` | Added Firebase Functions import + callable function initialization |

**Code Changes:**
```javascript
// Added import
import { getFunctions, httpsCallable } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-functions.js';

// Added initialization after app init
const functions = getFunctions(app);
window.sendPasswordResetCode = httpsCallable(functions, 'sendPasswordResetCode');
window.verifyPasswordResetCode = httpsCallable(functions, 'verifyPasswordResetCode');
window.completePasswordReset = httpsCallable(functions, 'completePasswordReset');
```

### 📋 Next Steps:
1. **Deploy Cloud Functions (if not already deployed):**
   ```bash
   cd /Volumes/Wotg Drive Mike/GitHub/Go-Mission/functions
   firebase deploy --only functions
   ```

2. **Set up Gmail secrets for email sending:**
   ```bash
   firebase functions:secrets:set GMAIL_EMAIL
   firebase functions:secrets:set GMAIL_PASSWORD
   ```
   Note: Use Gmail App Password (not regular password)
   
3. **Test the password reset flow:**
   - Go to Sign In
   - Click "Forgot Password?"
   - Enter email
   - Check email for code
   - Enter code + new password

4. **Commit & Push:**
   ```bash
   git add .
   git commit -m "Fix: Add Firebase Functions SDK for password reset"
   git push origin main
   ```

---

## Previous Session (2026-01-23)
- **MODULE**: Authentication - Email/Password Migration
- **STATUS**: ✅ Code complete, missing frontend integration
- **TASK**: Migrated from Google/Phone auth to Email/Password only

### 🔐 Authentication Changes (COMPLETED)

**REMOVED:**
- ❌ Google Sign-In (completely removed)
- ❌ Phone Number Sign-In (completely removed)

**ADDED:**
- ✅ Email/Password Sign In
- ✅ Email/Password Sign Up (with display name)
- ✅ Forgot Password with Email Verification Code
- ✅ Cloud Functions for code-based password reset

**Files Modified:**
| File | Changes |
|------|---------|
| `/index.html` | New login UI with Sign In/Sign Up tabs, forgot password flow |
| `/functions/index.js` | Added `sendPasswordResetCode`, `verifyPasswordResetCode`, `completePasswordReset` functions |

**New Firestore Collections:**
- `goMission_passwordResets/{email}` - Stores reset codes (15-min expiry)
- `goMission_mailQueue` - For email sending (requires email extension setup)

### 📋 Next Steps to Deploy:
1. **Deploy Cloud Functions:**
   ```bash
   cd /Volumes/Wotg Drive Mike/GitHub/Go-Mission/functions
   firebase deploy --only functions
   ```

2. **Test Locally:** Open `index.html` and test Sign Up / Sign In

3. **Email Sending:** Currently codes are logged to console. To send actual emails:
   - Install Firebase Extension "Trigger Email" or
   - Add SendGrid/Mailgun integration

4. **Commit & Push:**
   ```bash
   git add .
   git commit -m "Replace Google/Phone auth with Email/Password"
   git push origin main
   ```

### 🔄 OT Generation - FULL REGENERATION (39 books)
**Batches running in parallel (5 books each):**

| Batch | Books | Status |
|-------|-------|--------|
| 1 | Genesis, Exodus, Leviticus, Numbers, Deuteronomy | 🔄 Running |
| 2 | Joshua, Judges, Ruth, 1 Samuel, 2 Samuel | ⏳ Queued |
| 3 | 1 Kings, 2 Kings, 1 Chronicles, 2 Chronicles, Ezra | ⏳ Queued |
| 4 | Nehemiah, Esther, Job, Psalms, Proverbs | ⏳ Queued |
| 5 | Ecclesiastes, Song of Solomon, Isaiah, Jeremiah, Lamentations | ⏳ Queued |
| 6 | Ezekiel, Daniel, Hosea, Joel, Amos | ⏳ Queued |
| 7 | Obadiah, Jonah, Micah, Nahum, Habakkuk | ⏳ Queued |
| 8 | Zephaniah, Haggai, Zechariah, Malachi | ⏳ Queued |

**Monitor:** `tail -f scripts/logs/*.log`
**Script:** `./scripts/generate-ot-all.sh`

---

## ✅ Completed This Session

### 1. Jitsi Video Meeting Integration (NEW)
Embedded Jitsi Meet for in-app group video meetings.

**Features:**
- Full-screen Jitsi embed (no leaving app)
- Weekly meeting schedule (day + time) per group
- "Join Meeting" button appears when it's meeting time
- Leaders can start meeting anytime
- Meeting attendance tracked in Firestore

**Files:**
- `/modules/groups/group-meeting.js` - Jitsi integration module
- `/modules/groups/groups.js` - Updated to use new meeting section

**Firestore Collection:**
```javascript
// goMission_meetings/{groupId}_{date}
{
  groupId: "abc123",
  date: "2026-01-23",
  startedAt: timestamp,
  attendees: [
    { odId: "user1", name: "Mike", joinedAt: "...", leftAt: "...", durationMinutes: 45 }
  ],
  lastActivity: timestamp
}

// goMission_groups/{groupId}.meetingSchedule
{
  day: "Saturday",      // Day of week
  time: "19:00",        // 24h format
  updatedAt: timestamp
}
```

**Usage:**
- Members see "Join Now" button during meeting window (15 min before to 2 hours after)
- Leaders see "Start Meeting" button anytime
- Leaders can set/edit schedule via modal

---

## 🔄 Background: Quick Insights Generation

### Currently Generating (11 NT books via GPT-4o-mini)
| Book | Code | Verses | Status |
|------|------|--------|--------|
| Titus | TIT | 46/46 | ✅ Complete |
| Philemon | PHM | 25/25 | ✅ Complete |
| 2 John | 2JN | 13/13 | ✅ Complete |
| 3 John | 3JN | 14/14 | ✅ Complete |
| Jude | JUD | 25/25 | ✅ Complete |
| 2 Peter | 2PE | 61/61 | ✅ Complete |
| James | JAS | 78/108 | 🔄 In Progress |
| 1 Peter | 1PE | 78/105 | 🔄 In Progress |
| 1 John | 1JN | 77/105 | 🔄 In Progress |
| Hebrews | HEB | 75/303 | 🔄 In Progress |
| Revelation | REV | 76/404 | 🔄 In Progress |

**Monitor:** `tail -f scripts/logs/*.log`

---

## Quick Insights Generation Status

### ✅ Completed Books (17 + 6 = 23 books)
| Book | Chapters | File |
|------|----------|------|
| Genesis (GEN) | 50 | ✅ |
| Matthew (MAT) | 28 | ✅ |
| Mark (MRK) | 16 | ✅ |
| Luke (LUK) | 24 | ✅ |
| John (JHN) | 21 | ✅ |
| Acts (ACT) | 28 | ✅ |
| Romans (ROM) | 16 | ✅ |
| 1 Corinthians (1CO) | 16 | ✅ |
| 2 Corinthians (2CO) | 13 | ✅ |
| Galatians (GAL) | 6 | ✅ |
| Ephesians (EPH) | 6 | ✅ |
| Philippians (PHP) | 4 | ✅ |
| Colossians (COL) | 4 | ✅ |
| 1 Timothy (1TI) | 6 | ✅ |
| 2 Timothy (2TI) | 4 | ✅ |
| Psalms (PSA) | 150 | ✅ |
| Proverbs (PRO) | 31 | ✅ |
| Titus (TIT) | 3 | ✅ NEW |
| Philemon (PHM) | 1 | ✅ NEW |
| 2 John (2JN) | 1 | ✅ NEW |
| 3 John (3JN) | 1 | ✅ NEW |
| Jude (JUD) | 1 | ✅ NEW |
| 2 Peter (2PE) | 3 | ✅ NEW |

### 🔄 In Progress (5 books)
- James (JAS) - 5 chapters
- 1 Peter (1PE) - 5 chapters  
- 1 John (1JN) - 5 chapters
- Hebrews (HEB) - 13 chapters
- Revelation (REV) - 22 chapters

### ❌ Failed - Missing Tyndale Source
| Book | Issue |
|------|-------|
| 1 Thessalonians (1TH) | Tyndale file not found |
| 2 Thessalonians (2TH) | Tyndale file not found |

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
