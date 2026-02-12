# Go Mission - AI Handoff Document

> ⚡ READ THIS FIRST - Everything you need to continue development

## Quick Context
- **App**: Disciple-making journey for Filipino seekers worldwide
- **Live**: https://gomission.netlify.app
- **Repo**: /Volumes/Wotg Drive Mike/GitHub/Go-Mission
- **Stack**: HTML/JS + Tailwind CDN + Firebase

---

## Current Task Status (2026-02-12)

- **Active module**: Install + PWA Update
  - `/modules/install/install-modal.js`
  - `/modules/core/pwa-updater.js`
  - `/index.html` (script cache-busting)
- **Goal**: Ensure first-install `Let's Start` always closes welcome modal and apply waiting update immediately when app is launched from home screen
- **Status**: ✅ Fixed first-launch “Welcome to Go Mission” modal readability + “Let’s Start” button
  - Install welcome modal now uses a unique id (no collision with the main WelcomeModal)
  - Inline handlers updated to use `window.*` for consistent behavior across browsers
- **Status**: ✅ Fixed Journey “Take the Next Step” button text overflow (mobile)
  - CTA label wraps to 2 lines so it stays inside the button border
- **Status**: ✅ Groups dashboard navigation + Upline/Downline toggle
  - Mission Groups dashboard header adds a toggle: `Downline` / `Upline` (My Groups screen no longer used)
- **Status**: 🔧 Footer `Groups` should open Leader Dashboard (leaders) with fallback to Mission Groups
  - ✅ Implemented `window.openGroupsNav()` dispatcher
  - ✅ Made `window.LeaderDashboard` explicit + updated inline handler strings in its template
- **Status**: ✅ Leader Dashboard header now has `Upline / Downline` toggle beside title
  - Added tab state in `/modules/dashboard/leader-dashboard.js`
  - Added upline-group loading from member profile (`uplineGroupId`)
  - Group chips and dashboard content now follow selected tab
- **Status**: ✅ Leader Dashboard modal title renamed to `My Mission Groups`
  - Updated header title text inside `/modules/dashboard/leader-dashboard.js`
- **Status**: ✅ Leader Dashboard now includes `Group Status` cards below `Prayer List`
  - Mirrors My Mission Groups action layout per group: `Invite`, `Chat`, `View`, `Join`
  - Uses current tab group set (`Downline` or `Upline`), and reuses `window.MyGroups` actions
- **Status**: ✅ Upline group cards now hide `Invite` action
  - Upline cards show only `Chat`, `View`, `Join`
  - Downline cards keep `Invite`, `Chat`, `View`, `Join`
- **Status**: ✅ Removed header chart icon + fixed upline/downline toggle click behavior
  - Header title now plain `My Mission Groups` (no 📊 icon)
  - Toggle buttons are always clickable; selecting `Upline` now switches tab and renders upline/empty state
- **Status**: ✅ Fixed Group Status action buttons (`Invite`, `Chat`, `View`) not opening
  - Root cause: target overlays/modals opened behind current full-screen modal
  - Fix: keep My Mission Groups modal open, and open targets above it
    - `/index.html`: raised `#groupModal` and `#chatModal` to `z-[120]`
    - `/modules/dashboard/leader-dashboard.js`: actions no longer close the parent modal before opening target
  - Result: closing Invite/View/Join/Chat returns to My Mission Groups instead of Home
- **Status**: ✅ Fixed first-install welcome modal `Let's Start` button (PWA)
  - Root cause: `window.InstallModal` was not guaranteed for inline handler in all browsers/PWA contexts
  - Fixes:
    - `/modules/install/install-modal.js`: set `window.InstallModal = InstallModal`
    - Added direct `click` + `touchend` listener on `#installWelcomeStartBtn` as fallback
    - Made close cleanup resilient by removing all `#installWelcomeModal` nodes
    - `/index.html`: cache-busted install script URL (`install-modal.js?v=20260211-letsstart-fix`)
- **Status**: ✅ Strengthened first-install welcome button reliability for iOS/PWA taps
  - `/modules/install/install-modal.js`: added `pointerup` fallback and modal-level delegated click handler for `#installWelcomeStartBtn`
- **Status**: ✅ Startup silent update now applies immediately on home-screen launch (PWA)
  - `/modules/core/pwa-updater.js`:
    - runs immediate `registration.update()` on startup
    - if a waiting SW exists, activates it right away in standalone mode (once per build)
    - adds fallback reload if `controllerchange` is missed by iOS/PWA session
  - `/index.html`: cache-busted script URL (`pwa-updater.js?v=20260212-startup-update`)
  - `/index.html`: refreshed install modal script query (`install-modal.js?v=20260212-letsstart-hotfix`)
- **Status**: ✅ Fixed iPhone/PWA launch hang on loading screen
  - `/index.html`: added 15s auth boot watchdog fallback
    - hides loading overlay if auth bootstrap stalls
    - shows login screen with a short connection notice
  - `/modules/core/pwa-updater.js`: hardened startup update flow
    - startup apply delayed slightly to let auth boot begin
    - apply only when a real waiting worker exists
    - startup-only reload fallback; background flow no forced reload
    - reset update lock if `controllerchange` is missed
  - `/index.html`: updated updater cache-bust query (`pwa-updater.js?v=20260212-launch-stability`)
- **Status**: ✅ Fixed first-install welcome dark overlay + unclickable `Let's Start` on some devices
  - Root cause: CSS class collision with global onboarding modal styles in `/index.html`
    - install modal reused `.welcome-overlay` / `.welcome-content`
    - global `.welcome-overlay` had `z-index: 9999`, causing dark layer above install card and tap interception
  - Fixes in `/modules/install/install-modal.js`:
    - switched to isolated classes: `install-welcome-*`
    - overlay now non-interactive (`pointer-events: none`) and lighter tint
    - content set above overlay (`z-index: 2`)
    - stronger iOS tap handling on start button (`pointerdown` + click/touch handlers)
    - resilient `localStorage` write in `closeWelcome()`
  - `/index.html`:
    - changed iOS PWA status bar style to `default` (lighter presentation)
    - cache-busted install script: `install-modal.js?v=20260212-install-welcome-isolation`
- **Status**: ✅ Leader Dashboard bottom 4 quick actions renamed
  - `Group Chat` -> `Create Group` (opens `MyGroups.showCreateModal()`)
  - `Start Meeting` -> `Join with Code` (opens `MyGroups.showJoinModal()`)
  - `Announcement` and `Reports` retained
- **Status**: 🔧 Added cache-busting script query for Leader Dashboard module
  - `/index.html` now loads `modules/dashboard/leader-dashboard.js?v=20260211-quickactions`
  - Purpose: force fresh module fetch after Netlify publishes latest commit

- **Infra fix (VPS Jitsi)**: ✅ Fixed `xmpp: service-unavailable` to `focus.call.wotgonline.com`
  - Root cause: `VirtualHost "auth.call.wotgonline.com"` was set to `authentication = "anonymous"`, so Jicofo/JVB authenticated as random guest JIDs and `focus@auth.call.wotgonline.com` was not reachable.
  - Fix applied on VPS (not in git):
    - `/etc/prosody/conf.d/call.wotgonline.com.cfg.lua`: set `VirtualHost "auth.call.wotgonline.com"` to `authentication = "internal_hashed"`
    - Set Prosody user passwords for `focus@auth.call.wotgonline.com` and `jvb@auth.call.wotgonline.com` to match:
      - `/etc/jitsi/jicofo/jicofo.conf` (focus password)
      - `/etc/jitsi/videobridge/jvb.conf` (jvb password)
    - Restarted: `prosody`, `jicofo`, `jitsi-videobridge2`
- **Next steps**
  - Push + deploy to Netlify, then test:
    - PWA first-launch welcome: “🎉 Welcome to Go Mission!” → “Let’s Start” closes the modal
    - New-user WelcomeModal: “START YOUR JOURNEY” closes and shows main app
  - Test Journey card on small screens: “TAKE THE NEXT STEP / TODAY” stays within button border
  - Test footer `Groups`:
    - Leader: opens Leader Dashboard modal (and actions work)
    - Non-leader: opens Mission Groups dashboard
  - Test Leader Dashboard tab toggle:
    - `Downline`: shows groups user leads/assists
    - `Upline`: shows user upline group (if available)
    - Upline cards: no Invite button; only Chat/View/Join
    - Both toggle buttons must respond on tap/click
  - Test Group Status card buttons in Downline:
    - Invite opens invite-code modal
    - Chat opens group chat
    - View opens group details/members
    - Join opens in-app Jitsi
    - Closing these flows returns to My Mission Groups modal (not Home)
  - Test first-launch installed PWA welcome:
    - `Let's Start` closes welcome modal on first app open
    - Welcome does not show again on next launch
  - Test startup update behavior:
    - Install/open PWA from home screen after deploy
    - app should apply waiting SW on launch (without requiring blur/background first)
    - latest updater script should load (`?v=20260212-launch-stability`)
  - Test cold launch on older iPhone:
    - loading screen should not hang indefinitely
    - if auth/bootstrap is slow, login screen appears after ~15s with notice
  - Test first-install welcome on iPhone/Android:
    - modal appears in light style (no heavy dark mask over content)
    - `Let's Start` closes immediately on first tap
    - reopening app should not show install welcome again
  - Test Group Status cards inside Leader Dashboard:
    - Downline shows all leader groups (expected: 3 cards in current account)
    - Buttons work: Invite/Chat/View/Join
  - Test quick actions row:
    - Cards show: `Create Group`, `Join with Code`, `Announcement`, `Reports`
    - First two open My Groups modals from inside Leader Dashboard
  - If labels still show old text, verify Netlify production commit is newer than `6077fb6` then reload app
  - Test Mission Groups dashboard toggle:
    - Downline: shows leader groups + Invite/Chat/View/Join buttons
    - Upline: shows upline group with Join/Chat/View

---

## ✅ COMPLETED - Session 2026-02-04

### 1. Git Push & API Key Fix ✅
- **Problem**: Netlify was 4 commits behind, Quick Insights showing empty
- **Fix**: Removed exposed OpenAI API key from git history using `git filter-branch`
- **Result**: Successfully pushed all commits to GitHub/Netlify

### 2. Welcome Modal Spacing ✅
- **Problem**: Button was below viewport, required scrolling
- **Fix**: Reduced spacing in `/modules/install/install-modal.js`
- Padding, margins, logo size all reduced to fit in one view

### 3. Onboarding Modal Spacing ✅
- **Problem**: "START YOUR JOURNEY" button cut off at bottom
- **Fix**: Reduced spacing in `index.html` welcome modal styles
- Content padding: 2rem → 1rem
- Header padding-top: 3rem → 1.5rem
- CTA section padding: 1rem 1.5rem 3rem → 0.75rem 1.5rem 1.5rem

### 4. Carousel Cards Content ✅
- **Problem**: Second set showed "stageSeeker", "stageDiscipleDesc" (untranslated i18n keys)
- **Fix**: Removed broken `data-i18n` attributes, hardcoded bilingual content
- First set: English (SEEKER, DISCIPLE, DISCIPLE-MAKER, BUILDER, MULTIPLIER)
- Second set: Tagalog (NAGHAHANAP, ALAGAD, TAGAPAG-HUBOG, TAGAPAG-TAYO, TAGAPAG-PARAMI)

### 5. Loading Sequence Flash Fix ✅
- **Problem**: Dashboard flashed briefly before welcome modal appeared
- **Root Cause**: mainApp shown before WelcomeModal.init() called
- **Fix**: Check `goMission_welcomeSeen` before showing mainApp
  - If NOT seen → Show welcome modal, keep mainApp hidden
  - If seen → Show mainApp directly
  - On "START YOUR JOURNEY" click → Show mainApp, then hide modal

---

## Loading Sequence (VERIFIED CORRECT)

1. **Loading animation** shows (HTML default visible)
2. `auto-update.js` initializes during loading (checks updates silently)
3. Firebase initializes
4. `onAuthStateChanged` fires → Loading hides
5. If new user → Welcome/Onboarding modal (mainApp stays hidden)
6. If returning user → mainApp shows directly
7. User clicks "START YOUR JOURNEY" → mainApp shows, modal fades

---

## Previous Session (2026-02-03) - Jitsi Migration ✅

**Task**: Migrated Jitsi from `meet.wotgonline.com` to `call.wotgonline.com`

**Files Updated**:
- `/modules/groups/group-meeting.js` - Changed `JITSI_DOMAIN`
- `/modules/training/training.js` - Changed Jitsi URL

---

## Quick Insights System

### Coverage Status
| Category | Count |
|----------|-------|
| Total Bible verses | 31,133 |
| Verses with insights | 15,864 (51%) |
| Missing verses | 15,269 (49%) |
| Books with files | 63/66 |
| Missing books | 1TH, 2TH, HAG, JON |

### Working Flow:
1. User taps verse → highlights it
2. BibleLoader.getQuickInsights() fetches from JSON
3. Returns `{understanding, livingItOut, godsLove, reflection}` for language
4. BibleReader.renderCommentary() displays in sidebar

---

## Key Files

| File | Purpose |
|------|---------|
| `index.html` | Main app, welcome modal, auth flow |
| `/modules/install/install-modal.js` | PWA install modal |
| `/modules/core/auto-update.js` | Silent update system |
| `/modules/bible/bible-loader.js` | Loads Quick Insights JSON |
| `/modules/bible/bible-reader.js` | Renders insights in sidebar |
| `/modules/bible/data/quick-insights/*.json` | Insight data (63 books) |

---

## Git Push Command (if needed)
```bash
cd "/Volumes/Wotg Drive Mike/GitHub/Go-Mission"
git push origin main
```

Note: If authentication fails, use Personal Access Token:
```bash
git push https://TOKEN@github.com/PinedaMikeB/Go-Mission.git main
```
