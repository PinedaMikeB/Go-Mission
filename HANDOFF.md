# Go Mission - AI Handoff Document

> ⚡ READ THIS FIRST - Everything you need to continue development

## Current Task Status (2026-02-22) — Meeting Slides Admin DOCX Upload

- **Active modules**
  - `/admin.html`
  - `/modules/groups/group-meeting.js`
- **Goal**: Allow admin to upload a facilitator-guide `.docx`, auto-parse into a simple slide deck, publish to Firestore config, and have the in-meeting Slides panel load it automatically.
- **Status**: ✅ Implemented (admin upload + parser + publish + meeting-side Firestore deck loading fallback)
  - Admin panel section added: `Meeting Slides (DOCX Upload)`
  - Browser-side DOCX parser uses `JSZip` to read `word/document.xml`
  - Deck is published to `goMission_config/meetingSlidesDeck_<slot>_<lang>`
  - Meeting slides loader now checks Firestore published deck first, then falls back to static JSON deck
  - Meeting slides overlay now supports adjustable transparency (opacity slider) so participants/video remain visible behind slides
  - Meeting slides overlay updated to teleprompter-style text rendering (removed inner slide card, text directly over video with stronger shadow/stroke)
  - Meeting slides chrome refined into floating mini-bars (top: title+opacity+counter, bottom: prev/next) with no large boxed shell around the text area
  - Admin page wiring added for:
    - `Parse + Publish to Meeting Slides`
    - `Reload Published Deck`
    - slot/language change reload
    - file selection status

### Next Steps

- Add more deck slots in admin (e.g. weekly-equipping, mission-group-devotion) instead of single active slot
- Add optional EN/TL paired publishing workflow (publish both variants for same slot)
- Add lightweight validation warnings (empty deck, too few slides, oversized paragraphs)
- Add meeting slides display mode toggle (`Panel` vs `Teleprompter`) if leaders want to switch between readability-first and camera-visible layouts
- Phase 2: host-synced slides mode for mobile-led meetings (no Jitsi screen share required)

## Quick Context
- **App**: Disciple-making journey for Filipino seekers worldwide
- **Live**: https://gomission.netlify.app
- **Repo**: /Volumes/Wotg Drive Mike/GitHub/Go-Mission
- **Stack**: HTML/JS + Tailwind CDN + Firebase

---

## Current Task Status (2026-02-23) — Thread 5 Group Deletion Request Approval Flow

- **Active modules**
  - `/modules/groups/my-groups.js`
  - `/admin.html`
  - `/firestore.rules`
- **Goal completed**: Duplicate/wrong mission groups can now be removed via admin approval (leader request -> admin review -> approved delete cleanup).

### Group Deletion Request Workflow (Do Not Break)

- Leaders do **not** delete groups directly from `My Mission Groups`.
- Leader action creates/updates a request doc in `goMission_groupDeletionRequests/{groupId}` with:
  - `groupId`, `groupName`
  - leader identity fields
  - `reason`
  - `status = pending`
- Admin reviews requests in `/admin.html` panel `Group Deletion Requests`.
- On admin approval:
  - delete `goMission_groups/{groupId}`
  - remove linked invite codes (`goMission_groupInviteCodes` where `groupId == target`)
  - clean member/guest pointers in `goMission_members`
    - `uplineGroupId`
    - `groupId`
    - `groupRole`
    - `guestGroups[]`
    - `guestGroupMeta[groupId]`
- On admin rejection:
  - request status becomes `rejected` with optional `adminNote`
- Keep request history docs (approved/rejected) for audit visibility in admin panel.

### Regression Checklist (Run Before Push)

- Leader sees `Request Admin Delete Group` in downline group menu.
- Leader cannot create duplicate pending request for same group.
- Admin panel lists pending deletion requests.
- Admin `Approve & Delete Group` removes the group from leader/member `My Mission Groups` after refresh.
- Admin `Reject Request` leaves the group intact.
- Firestore rules deployed so leaders can submit requests and only admins can approve/reject.

---

## Current Task Status (2026-02-21) — Thread 5 Invite Code Invalid Fix

- **Active modules**
  - `/modules/groups/my-groups.js`
  - `/modules/groups/groups.js`
- **Goal completed**: Invite code join flow now tolerates mobile/paste formatting and no longer rejects valid 6-character codes due to spaces/separators.

### Invite Code Guardrails (Do Not Break)

- Always normalize invite code input as:
  - uppercase
  - alphanumeric only (`A-Z0-9`)
  - max length 6
- Validate invite codes as exactly 6 characters after normalization.
- Keep join behavior consistent across both entry points:
  - `My Mission Groups` join modal (`my-groups.js`)
  - `Groups` join modal (`groups.js`)
- Invite-code lookup must support both storage styles:
  - doc id equals code (current)
  - legacy random doc id with `code` field
- Usage count updates must target the resolved invite-code document id (not assume doc id always equals code).
- UX text must state `6-character code` (not `6-digit`) to match actual invite format.

### Regression Checklist (Run Before Push)

- Entering code with spaces like `9 6 C Y R G` should normalize to `96CYRG` and submit.
- Entering lowercase like `96cyrg` should normalize to `96CYRG`.
- Invalid length after normalization must show clear error.
- Valid code should create join request (or direct join path, depending on flow) without false `Invalid invite code`.

---

## Current Task Status (2026-02-20) — Thread 5 Mission Groups (Critical Guardrails)

- **Active modules**
  - `/modules/groups/my-groups.js`
  - `/modules/dashboard/leader-dashboard.js`
  - `/functions/index.js` (deployed `onMemberJoined` fix)
- **Goal completed**: Mission Groups `Upline/Downline` behavior is now role-correct and guest visibility is resilient.
- **Production commits (must preserve)**
  - `abf48aa` — Guest-group fallback visibility in MyGroups + guest metadata persistence
  - `b6a6554` — LeaderDashboard `Upline` includes guest groups
  - `bf11713` — Exclude self-led groups from `Upline`; leader metrics hidden on `Upline`
  - `cdd283f` — Hide `All Members` + `Prayer List` on `Upline`
- **Deployed function fix**
  - `onMemberJoined` redeployed with `GMAIL_EMAIL` + `GMAIL_PASSWORD` secrets attached.
  - Prevents silent miss on join/request email notifications.

### Mission Groups UI Rules (Do Not Break)

- `Downline` tab = groups user leads/assists only.
- `Upline` tab = non-led upline group + guest groups only.
- A group with `leaderId === currentUser.uid` must never render in `Upline`.
- `Group Status` can render in both tabs.
- Leader-only sections render **Downline only**:
  - `This Week's Focus`
  - `Needs Attention`
  - `Group Health`
  - `All Members`
  - `Prayer List`
- `Upline/Guest` cards must not show leader-only `Invite`.

### Data Contract to Preserve

- Guest membership visibility depends on:
  - `goMission_members/{uid}.guestGroups` (group id list)
  - `goMission_groups/{groupId}.guests` (guest objects with `odId`/id variants)
  - `goMission_members/{uid}.guestGroupMeta` (fallback label data for rendering if group doc fetch fails)
- Member approval visibility depends on canonical pointer writes:
  - On approve-as-member, always write `goMission_members/{uid}.uplineGroupId = groupId`
  - Also mirror `groupId` and `groupRole = member` for legacy/compat paths
- When approving as guest, write both:
  - group `guests[]`
  - member `guestGroups[]` (+ `guestGroupMeta[groupId]`)

### Regression Checklist (Run Before Push)

- In `Upline`: should show only upline + guest groups; no self-led groups.
- In `Upline`: no `This Week's Focus`, `Needs Attention`, `Group Health`, `All Members`, `Prayer List`.
- In `Downline`: leader sections visible and actionable.
- Guest-joined group appears in `Upline` after refresh.

---

## Current Task Status (2026-02-18)

- **Active module**: Training module navigation + live meeting card
  - `index.html`
  - `modules/training/training.js`
  - `HANDOFF.md`
- **Goal**: Add Wednesday Equipping card in Training with in-app Jitsi join flow (same embedded meeting experience as Mission Groups)
- **Status**: ✅ Implemented and pushed to `main` for live verification
  - Commit: `9ce7868` (Wednesday Equipping card + in-app Jitsi join in Training)
- **Status**: 🔄 Follow-up fix in progress for Training bottom-nav tap
  - Root cause: inline handler relied on `window.Training` in some sessions where `Training` exists without explicit `window` binding
  - Fix: add dual fallback in nav click handler + explicit safe global assignment `window.Training = Training`
  - Training copy update requested: Wednesday Equipping Tagalog description replaced with long-form discipleship invitation text
  - Added infographic-style "How to Join Wednesday Equipping" 4-step instruction card in Training full-screen view
- **Status**: 🔄 Follow-up in progress for shared Jitsi meeting controls
  - Active module: `/modules/groups/group-meeting.js`
  - Goal: keep a compact 4-button main toolbar and move extras to `More` menu
  - Added `overflowmenu` with `desktop` (Share Screen) and `reactions` (emoji) in shared config so it applies to Mission Groups + Wednesday Equipping + future embedded meetings
  - Removed invite/share-link action globally via `disableInviteFunctions: true` so sharing is only `Share Screen`
- **Status**: 🔄 Training UI cleanup in progress
  - Removed Training sessions list block under "Paano Sumali sa Wednesday Equipping" including "Loading training content..."
  - Current Training fullscreen content now shows only: Wednesday Equipping card + join infographic
- **Status**: 🔄 Shared Jitsi chat access update in progress
  - Replaced tile/grid toolbar control with `chat` on embedded Jitsi primary toolbar
  - Applies globally via `/modules/groups/group-meeting.js` for Mission Groups + Wednesday Equipping + future `GroupMeeting.joinMeeting(...)` flows
- **Status**: 🔄 Shared Jitsi toolbar layout adjustment in progress
  - Requested layout: main toolbar keeps `microphone`, `camera`, `share screen`, `more`, `leave`
  - `tile/grid`, `chat`, and `reactions` moved into `More` menu
  - Implemented in shared config (`/modules/groups/group-meeting.js`) for all embedded meetings
- **Status**: 🔄 Bible fullscreen top-bar action fix in progress
  - Active module: `/modules/bible/bible-reader.js`
  - Issue: `Aking Journal` button intermittently not responding while `Insights` is clickable
  - Fix: aligned Journal button with robust click wiring (`type="button"`, explicit `window.BibleReader...` call) and added fallback direct modal open when `window.openJournal` is unavailable
- **Status**: 🔄 Meeting slides MVP (local-only, hybrid-ready) in progress
  - Active module: `/modules/groups/group-meeting.js`
  - Added `Slides` button in shared meeting header (outside Jitsi) opening a local slide panel with `Prev/Next`
  - Added hybrid-ready presentation state shape (`mode`, `focusMode`, `selectedDeckId`, `selectedLang`, `currentSlideIndex`)
  - Added deck fetch/cache layer with TL/EN variant support (EN falls back to TL for now)
  - Added DOCX converter script: `/scripts/convert-docx-to-meeting-slides.js`
  - Generated sample deck from facilitator guide:
    - `/modules/groups/meeting-slides/decks/idol-of-comfort.tl.json`
  - Improved slide panel readability with explicit inline styling (fixes red/unreadable H1/H2 in meeting overlay)
  - Improved converter reliability for labeled paragraphs (`Ice Breaker Question:`, `Sagot:`, `Tanong:`) so they are preserved as slides instead of being dropped
  - Regenerated sample deck with improved parsing: `idol-of-comfort.tl.json` now expands to `33` slides and includes the previously skipped Ice Breaker / facilitator-answer content
  - Temporary meeting swap applied: active slide deck file (`idol-of-comfort.tl.json`) regenerated from `/Users/mike/Downloads/LAMG FG THE IDOL OF ACHIEVEMENT.docx` for current live session use (`32` slides)
  - Converter now derives deck title from DOCX `Title:` line (no longer hardcoded to `Idol of Comfort`)
- **Next steps**:
  - Verify bottom nav `Training` opens full-screen Training view
  - Verify `Wednesday Equipping` card appears at the top with schedule `Wednesday • 8:00 PM`
  - Verify `Join Wednesday Equipping` opens embedded Jitsi modal in-app (no new browser tab)
  - Verify Day 7 `Join Video Meeting` now uses embedded in-app Jitsi flow

## Next Thread Roadmap (Start Here)

- **Thread 1: UI / Design System**
  - Scope: visual consistency, spacing, typography, mobile polish, modal consistency
  - Primary files: `/index.html`, `/modules/core/design-system.css`
  - Exit criteria: no style regressions across Home, Login, Journey, Groups, Leader Dashboard

- **Thread 2: Mission Group Video Calling**
  - Scope: embedded Jitsi UX, join/leave reliability, loading/error states, moderator behavior
  - Primary files: `/modules/groups/group-meeting.js`, `/modules/groups/my-groups.js`, `/modules/dashboard/leader-dashboard.js`
  - Infra checkpoints: `call.wotgonline.com` health, Prosody/Jicofo/JVB service status

- **Thread 3: Bible Module**
  - Scope: reading flow, verse highlight/commentary reliability, quick-insights coverage gaps
  - Primary files: `/modules/bible/bible-loader.js`, `/modules/bible/bible-reader.js`, `/modules/bible/bible-picker.js`
  - Data checkpoints: missing books (`1TH`, `2TH`, `HAG`, `JON`) and rendering performance

- **Thread 4: Training Module**
  - Scope: session loading reliability, progress tracking, language consistency, media behavior
  - Primary files: `/modules/training/training.js`
  - Exit criteria: stable session navigation and persisted progress per user

- **Thread startup template (use in every new thread)**
  - “Read `/HANDOFF.md` first.”
  - “Active module for this thread: `<module>`.”
  - “Update `/HANDOFF.md` current task status, active module, and next steps before push.”
  - “Push to `main` after each tested change for live verification.”

## Recent Completed Work (2026-02-12 to 2026-02-15)

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
- **Status**: ✅ Login modal restyled to design-system theme (safe, scoped changes)
  - Added scoped auth styles under `#loginScreen` to use theme variables (`--card-bg`, `--text-color`, `--input-bg`, `--accent-active`)
  - Converted auth CTA buttons to mission gold theme (removed green variants for Sign Up/Reset)
  - Added non-breaking utility classes (`auth-*`) to login inputs/labels/tabs/buttons/alerts
  - Updated `switchAuthMode()` to also toggle `auth-tab-active` so tab visuals remain consistent
  - Scope limited to login section to avoid regressions in other modules
- **Status**: ✅ Updated login tagline copy (Filipino)
  - `/index.html`: changed
    - `Tuklasin ang Misyon Ni God!`
    - to `Tuklasin ang layunin ng Diyos sa iyong buhay!`
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
  - Test login modal theme consistency:
    - Sign In / Sign Up tabs render with mission-gold active state
    - Inputs/labels/alerts use theme variables in both dark and light modes
    - Sign In, Sign Up, Forgot Password, Verify Code, Reset Password flows still function
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
