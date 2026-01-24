# CHANGELOG - GO MISSION

All notable changes and deployments. Use this for rollbacks.

---

## Version Format
`vX.Y.Z` — Major.Minor.Patch  
Each entry includes rollback instructions.

---

## [v1.2.0] - 2026-01-24 ⭐ CURRENT

### 🎫 Join Requests + Guest System + Member Management

**Summary:** Complete overhaul of group membership flow with approval system and guest support.

**New Features:**

#### 1. Join Request Approval System
- Users no longer auto-join groups with invite code
- Join request sent to leader for approval
- Leader can approve as **Member** or **Guest**
- Real-time badges show pending request count
- Push notifications to leader on new requests

#### 2. Guest System
- Guests can chat and join meetings
- Guests appear in separate "Guest Groups" section
- Blue badge distinguishes guest groups
- "Leave as Guest" option for self-removal
- Tracks home group info for guests

#### 3. Member Management
- View Members shows pending requests at TOP
- Leader/Disciples/Guests organized in sections
- "Remove" button for leaders to remove members
- Removed members can't access chat/meetings
- Removed members' uplineGroupId cleared

#### 4. Real-time Badges
- Red badge on Groups nav icon
- Red badge on "View Members" button
- Updates instantly via Firestore onSnapshot
- Clears when all requests processed

**Files Changed:**
- `/modules/groups/my-groups.js` - Major updates for requests, guests, badges
- `/modules/groups/group-chat.js` - Membership verification, showMembers fix
- `/functions/index.js` - Guest notifications, join request notifications
- `/index.html` - Groups nav badge, guest groups section HTML

**Firestore Schema Updates:**
```javascript
// goMission_groups
{
  members: ["uid1", "uid2"],      // Full members
  guests: [{odId, name, photo, homeGroupId, homeGroupName, joinedAsGuestAt}],
  joinRequests: [{odId, name, email, photo, requestedAt, hasExistingGroup, existingGroupId}]
}

// goMission_members
{
  uplineGroupId: "group-id",      // Primary group
  guestGroups: ["group-id-1"]     // Guest memberships
}
```

**Deployment:**
```bash
cd functions && npm run deploy  # Deploy Cloud Functions first
git add . && git commit -m "v1.2.0: Join requests, guest system, member management"
git push origin main
```

**Rollback:** Restore from commit `b9fdb60` (before this feature)

---

## [v1.1.2] - 2026-01-24

### 🔄 Silent PWA Auto-Updates

**Summary:** Replaced annoying force-update prompts with seamless background updates.

**Problem:**
- Force update lock screen interrupted user flow
- Mobile PWA users had to click "Update Now" repeatedly
- Updates felt intrusive and broke reading/prayer experience

**Solution - Silent Update Flow:**
1. App checks for updates every 5 minutes (silent)
2. New version downloads in background (user unaware)
3. When user leaves app (blur/hidden/close) → SW activates + clears cache
4. When user returns → app already updated (seamless!)

**Key Changes:**
- Removed force update lock screen UI
- Added `visibilitychange` listener (update when hidden)
- Added `pagehide` listener (update when closing)
- Added `blur` listener (update when switching apps on mobile)
- Added `controllerchange` listener for seamless reload

**Files Changed:**
- `/modules/core/pwa-updater.js` - Complete rewrite for silent updates
- `/firebase-messaging-sw.js` - v1.0.4, removed auto-skipWaiting

**Debug Commands:**
```javascript
PWAUpdater.forceRefresh();     // Manual full refresh
PWAUpdater.debugUpdate();      // Force check and apply
PWAUpdater.getVersion();       // Get current SW version
PWAUpdater.isUpdatePending();  // Check if update waiting
```

**Deployment:**
```bash
git add .
git commit -m "v1.1.2: Silent PWA auto-updates (no more prompts)"
git push origin main
```

**Rollback:** Restore `pwa-updater.js` and `firebase-messaging-sw.js` from v1.1.1

---

## [v1.1.1] - 2026-01-23

### 🐛 Password Reset Bug Fix

**Summary:** Fixed "sendPasswordResetCode is not a function" error that prevented password resets.

**Problem:**
- Users who signed up with Google couldn't reset password
- Clicking "Send Verification Code" threw JavaScript error
- Cloud Functions were created but never connected to frontend

**Root Cause:**
- Previous session created Cloud Functions but forgot to:
  1. Import Firebase Functions SDK (`getFunctions`, `httpsCallable`)
  2. Initialize callable function references
  3. Assign them to `window` objects

**Fix:**
```javascript
// Added to index.html
import { getFunctions, httpsCallable } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-functions.js';

const functions = getFunctions(app);
window.sendPasswordResetCode = httpsCallable(functions, 'sendPasswordResetCode');
window.verifyPasswordResetCode = httpsCallable(functions, 'verifyPasswordResetCode');
window.completePasswordReset = httpsCallable(functions, 'completePasswordReset');
```

**Files Changed:**
- `/index.html` - Added Firebase Functions import + callable initialization

**Deployment:**
```bash
git add .
git commit -m "Fix: Add Firebase Functions SDK for password reset"
git push origin main
```

**Note:** Cloud Functions must be deployed separately:
```bash
cd functions
firebase deploy --only functions
firebase functions:secrets:set GMAIL_EMAIL
firebase functions:secrets:set GMAIL_PASSWORD
```

---

## [v1.1.0] - 2026-01-23

### 🔐 Email/Password Authentication (Major Change)

**Summary:** Replaced Google/Phone authentication with Email/Password for better user control and account recovery.

**Changes:**
- ❌ **Removed:** Google Sign-In
- ❌ **Removed:** Phone Number Sign-In
- ✅ **Added:** Email/Password Sign In
- ✅ **Added:** Email/Password Sign Up (with display name)
- ✅ **Added:** Forgot Password with 6-digit email verification code
- ✅ **Added:** Cloud Functions for password reset code generation

**Why This Change:**
- Google login fails on some devices (in-app browsers, PWA issues)
- Phone login created separate accounts from Google accounts
- Users had no way to recover accounts if Google auth failed
- Email/Password gives users full control over their credentials

**New Cloud Functions:**
- `sendPasswordResetCode` - Sends 6-digit code to email (15-min expiry)
- `verifyPasswordResetCode` - Validates the code
- `completePasswordReset` - Updates password after verification
- `cleanupExpiredResetCodes` - Daily cleanup of expired codes

**New Firestore Collections:**
- `goMission_passwordResets/{email}` - Temporary reset codes
- `goMission_mailQueue` - Email queue (for future email extension)

**Files Changed:**
- `/index.html` - New login UI with tabs (Sign In / Sign Up / Forgot Password)
- `/functions/index.js` - Added password reset functions

**Migration Notes:**
- Existing users with Google accounts need to Sign Up with their email
- Their Firebase UID will be different (new account)
- Data migration may be needed for power users

**Rollback:**
```bash
git checkout v1.0.3 -- index.html functions/index.js
firebase deploy --only functions
```

---

## [v1.0.3] - 2026-01-22

### 🔒 Force Update System

**Summary:** PWA now shows a lock screen when updates are available, preventing users from using outdated cached UI.

**Problem Solved:**
- Silent updates weren't working reliably
- Users were stuck on old cached UI
- Cache was hard to clear on mobile

**Solution:**
- Full-screen "Update Available" lock screen
- Cannot be dismissed - user MUST update
- Clears ALL caches before reload
- Checks for updates every 5 minutes + on app focus

**How to Push Updates:**
1. Change `CACHE_VERSION` in `firebase-messaging-sw.js`
2. Deploy to Netlify
3. Users see force update screen on next app open

**Files Changed:**
- `/firebase-messaging-sw.js` - Bumped to v1.0.3, improved update signaling
- `/modules/core/pwa-updater.js` - Force update lock screen (replaces toast notification)

**Testing:**
```javascript
// In browser console, test the update screen:
PWAUpdater.testForceUpdate();

// Force clear cache manually:
PWAUpdater.forceRefresh();
```

**Git Commit:** TBD

---

## [v0.5.1] - 2026-01-19

### 🔥 Global Language Toggle + Quick Insights System

**Summary:** Added global language toggle in header + Quick Insights generation using Tyndale + Gemini 2.5 Pro.

**Changes:**

1. **Global Language Toggle**
   - Added TL/EN toggle buttons in main header
   - Works across all screens
   - Persists to localStorage and Firestore
   - Updated `modules/core/i18n.js` with global toggle support

2. **Quick Insights with Gemini 2.5 Pro**
   - Better quality output than GPT-4o-mini
   - Cost-effective (~$0.50-1.00 for John)
   - Excellent bilingual (EN + Tagalog) support

3. **4-Section Format**
   - Section 1: Understanding This Verse (Unawain ang Talata)
   - Section 2: Living It Out (Isabuhay Ito)
   - Section 3: See God's Love (Makita ang Pag-ibig ng Diyos)
   - Section 4: Reflection Question (Pagnilayan at Gawin)

4. **Cleanup - Removed Unused Commentary**
   - Deleted `/commentary/matthew-henry/` (66 books)
   - Deleted `/commentary/matthew-henry-tl/` (12 books)
   - Deleted `/commentary/john-gill/` (66 books)
   - Only Tyndale remains (for "Dig Deeper" feature)

**Generation Status:**
- Book: John (JHN)
- Progress: 12/21 chapters (~57%)
- Output: `/modules/bible/data/quick-insights/JHN.json`

**Files Changed:**
- `/index.html` - Global language toggle in header
- `/modules/core/i18n.js` - Global toggle support
- `/scripts/generate-quick-insights.js` - Gemini 2.5 Pro generator
- `/modules/bible/data/quick-insights/JHN.json` - Partial generation
- `/modules/bible/README.md` - Updated data structure

**Git Commit:** `1f8604a`

---

## [v0.5.0] - 2026-01-19

### 🔥 Quick Insights Commentary System (Hybrid Tyndale + AI)

**Summary:** Downloaded Tyndale Open Study Notes and built AI enhancement system for verse-by-verse insights.

**New Features:**

1. **Tyndale Open Study Notes Downloaded**
   - 16,732 study notes covering all 66 books
   - Source: https://tyndaleopenresources.com/
   - License: Creative Commons Attribution-ShareAlike 4.0
   - Converted from XML to JSON format

2. **Quick Insights 4-Section Format**
   - Section 1: Understanding This Verse (Unawain ang Talata)
   - Section 2: Living It Out (Isabuhay Ito)
   - Section 3: See God's Love (Makita ang Pag-ibig ng Diyos)
   - Section 4: Reflection Question (Pagnilayan at Gawin)

3. **Hybrid Approach (Option C)**
   - Default: AI-generated 4 sections (simplified from Tyndale)
   - "Read More": Shows full Tyndale scholarly note
   - Bilingual: English + Tagalog
   - Uses Claude Sonnet (cost-efficient)

**New Files:**
- `/modules/bible/data/commentary/tyndale/` - Original XML files
- `/modules/bible/data/commentary/tyndale-json/` - 66 JSON files
- `/scripts/convert-tyndale-to-json.js` - XML→JSON converter
- `/scripts/test-quick-insights.js` - Hybrid test script

**Design Decisions:**
- Tyndale is scholarly but too complex for daily devotion
- AI transforms into simple, warm, practical insights
- "Read More" option for users who want to go deeper
- Focus on ACTION (doers of the Word, not just hearers)

**Git Commit:** TBD

**Rollback:**
```bash
git checkout 452ef21 -- .
git commit -m "Rollback to v0.4.1"
git push origin main
```

---

## [v0.4.1] - 2026-01-19

### 🔧 Commentary Preview (Show Less/More)

**Summary:** Added expand/collapse for long commentary text.

**Changes:**
- Commentary shows 150 char preview by default
- "Read more" expands to full text
- "Show less" collapses back

**Git Commit:** `452ef21`

---

## [v0.4.0] - 2026-01-19

### 🔥 Spirit-Led Bible Reading System

**Summary:** Built complete Bible Picker + Bible Reader for Spirit-led reading.

**New Features:**

1. **Bible Picker Module** (`bible-picker.js`)
   - Progressive search (bilingual: EN/TL)
   - Book browser with OT/NT tabs
   - Chapter selector grid
   - Recent readings (last 5)
   - Search aliases for fuzzy matching

2. **Bible Reader Module** (`bible-reader.js`)
   - Full chapter display (no verse limits)
   - Tap verses to highlight (multiple allowed)
   - Auto-load commentary for highlighted verses
   - Progress tracking (Chapter X of Y)
   - Prev/Next navigation
   - Resume from last position
   - Firestore + localStorage persistence

3. **Updated index.html**
   - New Scripture Reading UI
   - Clickable passage title → opens BiblePicker
   - Chapter progress indicator
   - Prev/Next navigation
   - Commentary section

4. **Bible Data Downloaded**
   - English (BSB) - 66 books
   - Tagalog (ADB 1905) - 66 books
   - Matthew Henry Commentary EN - 65 books
   - Matthew Henry Commentary TL - 5 books (translation stopped)

**Git Commit:** `7adc7ef`

**Rollback:**
```bash
git checkout 0ea9091 -- index.html
rm modules/bible/bible-picker.js
rm modules/bible/bible-reader.js
git commit -m "Rollback to v0.3.0"
git push origin main
```

---

## [v0.3.0] - 2026-01-19

### 🔥 My Day with the Lord - Bible Devotion Experience

**Summary:** Replaced checkbox-based check-in with relational Bible devotion system.

**New Features:**

1. **"My Day with the Lord" Card**
   - Replaces "Today's Check-In"
   - Full Bible reading experience
   - Journal reflection with single question

2. **Bible Reader**
   - Tagalog (Ang Bibliya 1905) - default
   - English (KJV) - toggle
   - Tap verses to highlight (gold)
   - "Help me understand" commentary section

3. **Reflection Question System**
   - ONE question per day (reduced friction)
   - Rotates weekly by category

4. **Privacy & Sharing**
   - Toggle to share with group or keep private

5. **"Save This Day" Button**
   - Saves to `goMission_devotions` collection

6. **Week Progress**
   - 7 dots showing days saved this week

**Git Commit:** `0ea9091`

---

## [v0.2.1] - 2026-01-18

### 🎨 Exact Design System Applied

**Summary:** Applied exact design system.

**Design Tokens:**
| Token | Value |
|-------|-------|
| mission-red-deep | `#2a0505` |
| mission-red-mid | `#4a0404` |
| mission-red-bright | `#800000` |
| mission-gold | `#fbbf24` |
| mission-text | `#fdfcf0` |

**Git Commit:** `018db3e`

---

## [v0.2.0] - 2026-01-18

### 🌅 Premium Sunset Theme

**Git Commit:** `be0849d`

---

## [v0.1.0] - 2026-01-16

### 🚀 Main App with Google Sign-In

**What's Working:**
- Google Sign-In authentication
- Auto-create user profile on first login
- Dashboard with 6 mission cards
- Mobile responsive with bottom navigation

**Git Commit:** `20e3f4a`

---

## Rollback Quick Reference

### Full Site Rollback (Git)
```bash
cd "/Volumes/Wotg Drive Mike/GitHub/Go-Mission"

# See recent commits
git log --oneline -10

# Rollback to specific commit
git checkout <commit-hash> -- .

# Push rollback
git add .
git commit -m "Rollback to vX.X.X"
git push origin main
```

### Key Commits
| Version | Commit | Description |
|---------|--------|-------------|
| v0.5.0 | TBD | Quick Insights (Tyndale + AI) |
| v0.4.1 | `452ef21` | Commentary preview |
| v0.4.0 | `7adc7ef` | Spirit-led Bible reading |
| v0.3.0 | `0ea9091` | My Day with the Lord |
| v0.2.1 | `018db3e` | Exact design system |
| v0.1.0 | `20e3f4a` | Main app foundation |

---

*Update this file after every deployment.*
