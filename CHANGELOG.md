# CHANGELOG - GO MISSION

All notable changes and deployments. Use this for rollbacks.

---

## Version Format
`vX.Y.Z` — Major.Minor.Patch  
Each entry includes rollback instructions.

---

## [v2.2.13] - 2026-03-02 🧾 Integrity Duplicate Group Inspector (View/Edit/Delete/Clean)

### ✅ Summary
Expanded Group Integrity Audit duplicate violations into a clickable admin workflow: open duplicate group sets, inspect members, edit group names, clean invalid/duplicate member entries, and delete groups directly from the audit panel.

### Included Changes
1. **Duplicate inspector UI in Integrity Audit**
   - Added `Duplicate Group Details` panel under `Group Integrity Audit`.
   - Duplicate violations now include `View Groups` action.
2. **Per-group admin actions**
   - `View Members`: shows member validity and duplicate-entry flags.
   - `Edit Name`: rename group and persist normalized `nameKey`.
   - `Clean Members`: removes invalid member UIDs and duplicate member entries.
   - `Delete Group`: direct admin delete with member/guest pointer cleanup + invite code cleanup.
3. **Member integrity visibility inside duplicate groups**
   - Member list now surfaces:
     - invalid UIDs (missing member doc),
     - duplicate member entries in a single group,
     - members currently in multiple member groups.

### Files Modified
- `/admin.html`
- `/CHANGELOG.md`
- `/HANDOFF.md`

### Rollback
```bash
cd "/Volumes/Wotg Drive Mike/GitHub/Go-Mission"
git revert <commit-hash-for-v2.2.13>
```

---

## [v2.2.12] - 2026-03-02 🛡️ Duplicate Group Guard + Integrity Duplicate-Leader Audit

### ✅ Summary
Added strict duplicate-group protections for leaders at creation time and added an integrity audit violation that flags leaders with duplicate same-name groups.

### Included Changes
1. **Duplicate-create prevention (leader-side)**
   - Added canonical name-key checks before creating a group in:
     - `/modules/groups/my-groups.js`
     - `/modules/groups/groups.js`
   - Creation now blocks when the same leader already has a group with the same normalized name.
   - Added in-flight create lock (`isCreatingGroup`) and disabled submit state to prevent multi-click duplicate creation.
2. **Group metadata for future integrity checks**
   - New groups now store `nameKey` (normalized group name) for safer duplicate matching.
3. **Integrity audit: duplicate leader groups**
   - `/admin.html` `Run Integrity Audit` now flags:
     - **This leader has duplicate groups with same name [HIGH]**
   - Violation lists all duplicate group IDs for admin cleanup action.

### Files Modified
- `/admin.html`
- `/modules/groups/my-groups.js`
- `/modules/groups/groups.js`

### Rollback
```bash
cd "/Volumes/Wotg Drive Mike/GitHub/Go-Mission"
git revert <commit-hash-for-v2.2.12>
```

---

## [v2.2.11] - 2026-03-02 🧩 Guest Upline Visibility + Invite Code False-Invalid Fix

### ✅ Summary
Fixed two production issues in Mission Groups: newly approved guest groups not always showing in `Upline`, and valid invite codes being rejected as invalid due to legacy code/doc formatting.

### Included Changes
1. **Always-on guest recovery merge (Upline reliability)**
   - `My Groups` and `Leader Dashboard` now always scan actual `goMission_groups` guest membership and merge missing guest cards.
   - Prevents hidden guest cards when `goMission_members.guestGroups` pointers are stale or partially updated.
2. **Safer guest pointer trust**
   - Explicit `guestGroups` pointers are trusted only when a group has no concrete `guests` entries.
   - Reduces false guest card display from stale pointers.
3. **Invite code validation hardened**
   - Added normalized fallback matching for invite-code docs (handles lowercase/separated legacy values).
   - Added legacy fallback scan against `goMission_groups.inviteCode` using normalized comparison.
   - Handles timestamp/date variants for code expiration checks.
4. **Approval flow resilience**
   - Leader approval continues even if cross-user profile sync is blocked by rules.
   - Prevents false “approval failed” state when group update succeeded but member profile write is denied.

### Files Modified
- `/modules/groups/my-groups.js`
- `/modules/groups/groups.js`
- `/modules/dashboard/leader-dashboard.js`
- `/HANDOFF.md`
- `/CHANGELOG.md`

### Rollback
```bash
cd "/Volumes/Wotg Drive Mike/GitHub/Go-Mission"
git revert <commit-hash-for-v2.2.11>
```

---

## [v2.2.10] - 2026-02-28 🔐 No-Upline Leader Lock + Admin Inbox Workflow

### ✅ Summary
Enforced strict no-upline leadership policy with founder/co-founder exemptions only, added admin audit action to lock meetings for violators, and introduced a leader-to-admin inbox request flow for unlock/review.

### Included Changes
1. **Integrity audit now uses strict exemption list**
   - In `Group Integrity Audit`, leaders without valid upline are flagged unless they are:
     - Founder (`michael.marga@gmail.com`)
     - Co-founder (Irene exemption UID/email)
   - Violation details now include the exact groups they lead.
2. **Audit action: lock meetings + notify leader**
   - New violation action button: `Disable Meetings + Notify Leader`.
   - Writes group lock metadata (`integrityLock.enabled/type/reason`) for affected groups.
   - Sends direct notification to that leader.
3. **App-side meeting lock enforcement**
   - `My Mission Groups` meeting buttons now show `Meeting Locked` when integrity lock applies.
   - On click, user sees lock reason instead of entering meeting.
   - Leaders get modal with message box + `Send Request to Admin`.
4. **Admin inbox for lock/unlock requests**
   - New admin panel card: `Admin Inbox`.
   - Displays leader requests (`upline_unlock_request`) with statuses.
   - Admin actions: `Mark In Review`, `Mark Resolved`.
5. **Create-group gate tightened**
   - Group creation without upline is now restricted to founder/co-founder exemptions.
   - Non-exempt users must first join a valid upline group.
6. **Security rules update**
   - Added `goMission_adminInbox` rules (leader create, admin read/update/delete).
   - `goMission_groups` create rule now allows no-upline creation only for exemption list.

### Files Modified
- `/admin.html`
- `/modules/groups/my-groups.js`
- `/modules/groups/groups.js`
- `/firestore.rules`
- `/HANDOFF.md`
- `/CHANGELOG.md`

### Rollback
```bash
cd "/Volumes/Wotg Drive Mike/GitHub/Go-Mission"
git revert <commit-hash-for-v2.2.10>
```

---

## [v2.2.9] - 2026-02-28 🛠️ Integrity Audit Group Role Resolver

### ✅ Summary
Added admin resolver workflow for members historically linked to multiple groups. Admin can now choose one primary `member` group and automatically convert all other linked groups to `guest`.

### Included Changes
1. **New resolver in Group Integrity Audit**
   - Added `Group Role Resolver` panel in `/admin.html`.
   - Lists all related groups for the selected member.
   - Per-group role selection (`Member` / `Guest`), with leader-owned groups locked.
2. **Hard-rule enforcement in resolver**
   - Selecting one group as `Member` auto-switches all other editable groups to `Guest`.
   - Supports zero-member-selection path if admin intentionally wants all guest links.
3. **One-click apply**
   - Updates group docs:
     - chosen member group keeps member in `members[]`
     - other groups remove from `members[]` and add/update `guests[]`
   - Updates member profile:
     - `uplineGroupId`, `groupId`, `groupRole`
     - `guestGroups`, `guestGroupMeta`
4. **Audit action shortcuts**
   - Violation cards now include `Resolve Group Roles` for member-specific violations.
   - Verify-member result includes `Open Group Role Resolver` button.

### Files Modified
- `/admin.html`
- `/HANDOFF.md`
- `/CHANGELOG.md`

### Rollback
```bash
cd "/Volumes/Wotg Drive Mike/GitHub/Go-Mission"
git revert <commit-hash-for-v2.2.9>
```

---

## [v2.2.8] - 2026-02-28 🧭 Integrity Audit False-Positive Fix + Member Safe Correction

### ✅ Summary
Fixed false positives in Group Integrity Audit for leaders who appear in their own downline group member arrays, and added targeted member verification/safe-correction controls for account-level cleanup.

### Included Changes
1. **Audit logic precision fix**
   - `multiple upline` checks now use only **non-self-led** member links.
   - Leader-owned groups no longer count as upline violations for the same user.
   - Violation output now shows readable group + leader context.
2. **Targeted verification in admin**
   - Added `Verify member (UID or email)` in `Group Integrity Audit`.
   - New action `Verify Member Integrity` shows:
     - self-led links
     - non-self-led links
     - current vs recommended primary pointer
     - groups marked for safe cleanup
3. **Safe correction action**
   - New action `Apply Safe Correction`:
     - removes member UID from conflicting non-self-led `members[]` entries
     - updates `uplineGroupId` pointer when a single valid primary remains
     - preserves self-led links
4. **Primary-pointer guard hardening in app modules**
   - Added safe primary-group resolution in:
     - `/modules/groups/groups.js`
     - `/modules/groups/my-groups.js`
   - Fallback `groupId` is ignored when it points to a self-led group (prevents false “already has upline” locks).

### Files Modified
- `/admin.html`
- `/modules/groups/groups.js`
- `/modules/groups/my-groups.js`
- `/HANDOFF.md`
- `/CHANGELOG.md`

### Rollback
```bash
cd "/Volumes/Wotg Drive Mike/GitHub/Go-Mission"
git revert <commit-hash-for-v2.2.8>
```

---

## [v2.2.7] - 2026-02-28 🔒 Mission Group Integrity Hardening

### ✅ Summary
Enforced strict hierarchy integrity for Mission Groups: one primary upline membership per member, controlled group creation eligibility, and admin-visible integrity audit checks.

### Included Changes
1. **Strict member integrity enforcement**
   - Approve-as-member now blocks users who already have a different primary upline group.
   - Join-request UI shows `Member Locked` when requester already has an existing primary group.
   - Invite-code member join blocks users already assigned to another primary upline.
2. **Controlled group creation gate**
   - Group creation now requires one of:
     - admin,
     - explicit authorization flags (`canCreateGroup`/endorsement flags/role grant),
     - valid active upline membership.
3. **Firestore security hardening**
   - Self profile updates can no longer modify protected integrity fields (`groupId`, `uplineGroupId`, `groupRole`, role/authorization flags).
   - Self profile creation cannot self-grant protected privileges.
   - Group updates are restricted to leader/admin, or self join-request append only (no broad write access).
4. **Admin integrity audit tooling**
   - Added `Group Integrity Audit` section in `/admin.html`.
   - Audit checks:
     - members linked to multiple member groups,
     - member pointer mismatches,
     - leaders without valid upline/authorization/admin eligibility,
     - direct leader crossover cycles.

### Files Modified
- `/modules/groups/my-groups.js`
- `/modules/groups/groups.js`
- `/firestore.rules`
- `/admin.html`
- `/HANDOFF.md`
- `/CHANGELOG.md`

### Rollback
```bash
cd "/Volumes/Wotg Drive Mike/GitHub/Go-Mission"
git revert <commit-hash-for-v2.2.7>
```

---

## [v2.2.6] - 2026-02-23 🗑️ Group Deletion Request Approval Flow

### ✅ Summary
Added an admin-approved mission group deletion workflow for duplicate/mistaken group creation. Leaders now request deletion; admins review and approve/reject from the admin workspace.

### Included Changes
1. **Leader-side request action (no direct delete)**
   - Added a Group Options modal in `My Mission Groups` downline cards.
   - Added `Request Admin Delete Group` with required reason.
   - Stores requests in `goMission_groupDeletionRequests`.
2. **Admin approval queue**
   - Added `Group Deletion Requests` panel in `/admin.html`.
   - Admin can reload, approve+delete, or reject requests.
3. **Approved delete cleanup**
   - Admin approval deletes the group document.
   - Cleans member/guest links in `goMission_members` (`uplineGroupId`, `groupId`, `groupRole`, `guestGroups`, `guestGroupMeta`).
   - Removes related invite codes in `goMission_groupInviteCodes`.
4. **Firestore rules**
   - Added rules for `goMission_groupDeletionRequests`:
     - leaders can create/update pending requests for their own group
     - only admins can approve/reject/delete

### Files Modified
- `/modules/groups/my-groups.js`
- `/admin.html`
- `/firestore.rules`
- `/HANDOFF.md`
- `/CHANGELOG.md`

### Rollback
```bash
cd "/Volumes/Wotg Drive Mike/GitHub/Go-Mission"
git revert <commit-hash-for-v2.2.6>
```

---

## [v2.2.5] - 2026-02-21 🔐 Invite Code Join Reliability

### ✅ Summary
Fixed false `Invalid invite code` results when users enter valid group invite codes with mobile/paste formatting (spaces/symbols/casing differences).

### Included Changes
1. **Invite code normalization at input + submit**
   - Join modals now sanitize code to uppercase alphanumeric and strip separators.
   - Validation now requires exactly 6 characters after normalization.
2. **Consistent behavior across both group entry points**
   - Applied normalization in:
     - `/modules/groups/my-groups.js` (`My Mission Groups` join flow)
     - `/modules/groups/groups.js` (`Groups` module join flow)
   - Added legacy lookup fallback via `where('code', '==', normalizedCode)` when invite code doc id is not the code itself.
3. **Usage tracking consistency**
   - `groups.js` now writes usage updates to the resolved invite-code document id (works for both code-keyed and legacy random-id docs).
4. **UX copy alignment**
   - Updated placeholder text from `6-digit` to `6-character` to match actual alphanumeric invite codes.

### Files Modified
- `/modules/groups/my-groups.js`
- `/modules/groups/groups.js`
- `/HANDOFF.md`
- `/CHANGELOG.md`

### Rollback
```bash
cd "/Volumes/Wotg Drive Mike/GitHub/Go-Mission"
git revert <commit-hash-for-v2.2.5>
```

---

## [v2.2.4] - 2026-02-20 👥 Mission Groups Role Safety + Guest Visibility

### ✅ Summary
Fixed `Upline/Downline` regressions in Mission Groups so role-based views are correct, guest-joined groups are visible, and leader-only dashboard blocks are restricted to downline context.

### Included Changes
1. **Guest group visibility hardening**
   - Added resilient guest fallback rendering in `/modules/groups/my-groups.js`.
   - Added `guestGroupMeta` persistence on guest approval for stable labels when direct group fetch is unavailable.
2. **Leader Dashboard upline data model fix**
   - `Upline` tab now includes non-led upline + guest groups.
   - Self-led groups are excluded from `Upline` (remain in `Downline` only).
3. **Leader-only section isolation**
   - `This Week's Focus`, `Needs Attention`, `Group Health`, `All Members`, and `Prayer List` now render in `Downline` only.
   - `Upline` keeps shared sections such as `Group Status`.
4. **Notification deployment alignment**
   - Redeployed `onMemberJoined` with `GMAIL_EMAIL` and `GMAIL_PASSWORD` secrets so join/request email path is active in production.
5. **Member approval pointer hardening**
   - Approve-as-member now always writes canonical member pointers (`uplineGroupId`, `groupId`, `groupRole`) so approved members reliably see their member group card in `Upline`.

### Files Modified
- `/modules/groups/my-groups.js`
- `/modules/dashboard/leader-dashboard.js`
- `/HANDOFF.md`
- `/CHANGELOG.md`

### Production Commits
- `abf48aa`
- `b6a6554`
- `bf11713`
- `cdd283f`

### Rollback
```bash
cd "/Volumes/Wotg Drive Mike/GitHub/Go-Mission"
git revert cdd283f bf11713 b6a6554 abf48aa
```

---

## [v2.2.3] - 2026-02-15 🧭 Stability + UI Alignment

### ✅ Summary
Stabilized first-install/login experience and documented a thread-based execution plan for faster, safer iteration by module.

### Included Changes
1. **Login modal design-system alignment**
   - Scoped auth styling under `#loginScreen` to prevent regressions outside auth UI.
   - Unified auth CTA colors to mission-gold theme.
   - Preserved auth behavior; updated tab-state visuals via `auth-tab-active`.
   - Tagline updated to: `Tuklasin ang layunin ng Diyos sa iyong buhay!`
2. **PWA first-install stability fixes**
   - Isolated install welcome CSS classes to avoid overlay collisions.
   - Hardened `Let's Start` tap handling for iOS/PWA.
   - Startup update behavior and boot watchdog improvements from prior fixes retained.
3. **Handoff/process upgrade**
   - Added thread roadmap in `HANDOFF.md` for separate module-focused threads:
     - UI / Design System
     - Mission Group Video Calling
     - Bible
     - Training

### Files Modified
- `/index.html`
- `/modules/install/install-modal.js`
- `/modules/core/pwa-updater.js`
- `/HANDOFF.md`

### Rollback
```bash
cd "/Volumes/Wotg Drive Mike/GitHub/Go-Mission"
git revert 52a2f9e c8b1b78 3536f11 6b47be5
```

---

## [v2.2.2] - 2026-02-04 🐛 UI/UX Fixes

### 🐛 Welcome/Onboarding Modal Fixes

**Summary:** Fixed multiple UI issues with welcome and onboarding modals.

**Issues Fixed:**
1. **Git Push & API Key** - Removed exposed OpenAI API key from history, pushed 4 pending commits
2. **Welcome Modal Spacing** - Button was below viewport, reduced spacing to fit
3. **Onboarding Modal Spacing** - "START YOUR JOURNEY" button cut off, reduced padding
4. **Carousel Cards** - Fixed untranslated i18n keys showing "stageSeeker" etc.
5. **Loading Sequence Flash** - Dashboard flashed before welcome modal, fixed timing

**Files Modified:**
- `/modules/install/install-modal.js` - Reduced spacing (padding, margins, logo size)
- `/index.html` - Welcome modal spacing + carousel content + loading sequence fix
- `/scripts/generate-*.js` - Removed hardcoded API keys

**Carousel Content (Bilingual):**
- First set: SEEKER, DISCIPLE, DISCIPLE-MAKER, BUILDER, MULTIPLIER (English)
- Second set: NAGHAHANAP, ALAGAD, TAGAPAG-HUBOG, TAGAPAG-TAYO, TAGAPAG-PARAMI (Tagalog)

**Loading Sequence Change:**
```javascript
// Before: mainApp shown → then WelcomeModal.init() (caused flash)
// After: Check goMission_welcomeSeen first
if (shouldShowWelcome) {
    WelcomeModal.show();  // Keep mainApp hidden
} else {
    mainApp.classList.remove('hidden');  // Show directly
}
```

**Rollback:**
```bash
git revert HEAD~4  # Reverts last 4 commits
```

---

## [v2.2.1] - 2026-02-03 🔄 Jitsi Migration

### 🔄 Jitsi Domain Migration

**Summary:** Migrated video calls from `meet.wotgonline.com` to `call.wotgonline.com` (new VPS)

**Files Modified:**
- `/modules/groups/group-meeting.js` - Changed `JITSI_DOMAIN` to `call.wotgonline.com`
- `/modules/training/training.js` - Changed Jitsi URL to `call.wotgonline.com`

**Infrastructure:**
- New VPS: 147.93.81.200 (Hostinger KVM 2, Indonesia)
- Control Panel: HestiaCP
- Jitsi: https://call.wotgonline.com

**Rollback:**
```bash
# Revert to old domain
# In group-meeting.js line 22, change:
JITSI_DOMAIN: 'meet.wotgonline.com'
# In training.js line 635, change:
const jitsiUrl = `https://meet.jit.si/${roomName}`;
```

---

## [v2.2.0] - 2026-02-03 🎨 IN PROGRESS

### 🎨 Journey Card Redesign + Design System

**Summary:** Redesigning journey card with new 3D scrollable stages. Created comprehensive CSS design system.

**Status:** IN PROGRESS - Path line showing through circles (CSS issue)

**Files Created/Modified:**
- `/modules/core/design-system.css` - NEW! Comprehensive CSS design system (1400+ lines)
- `/index.html` - Journey card HTML restructured + inline CSS for stages

**Design System Includes:**
- CSS Variables for colors, typography, spacing
- Button components (primary, secondary, ghost)
- Card components
- Journey stage components
- Path line with animation
- Badge components

**Journey Card Changes:**
- Old: Small nodes in a row
- New: Large 3D scrollable cards (2 visible on mobile)
- "TAKE THE NEXT STEP TODAY" button inside current stage card
- "YOU ARE HERE" badge below current stage
- Animated path line with arrow

**Prototype Reference:**
- Working prototype: `/Users/mike/Downloads/go-mission-home-v2.html`

**Known Issue:**
- Circles 2-5 show path line through them (should be solid)
- CSS specificity issue between inline styles and design-system.css

**Backup:**
```bash
# Rollback
cd "/Volumes/Wotg Drive Mike/GitHub/Go-Mission"
bash rollback-2026-02-03.sh
```

---

## [v2.1.0] - 2026-01-29 ⭐ STABLE

### 🔊 English Audio Narration Complete (All 40 Slides)

**Summary:** Added English audio sync for Gospel presentation, matching the Tagalog audio system.

**File Updated:**
- `/modules/gospel/gospel-audio.js` - Added `slideAudioEN` mapping + fixed path encoding

**Audio Files (55 total):**
- Location: `/assets/audio/gospel/Gospel Audio English/`
- Regular slides: 1-3, 6-8, 10-11, 13-15, 17-22, 24-25, 27-33, 35-40
- Question slides (8): 4, 5, 9, 12, 16, 23, 26, 30 (each with Q/Correct/Wrong)
- Prayer: Slide 34

**Bug Fix:**
- Fixed `encodeURIComponent` encoding path slashes - now only encodes filenames

**Audio Coverage:**
| Slide Range | Status |
|-------------|--------|
| Slides 1-40 | ✅ Complete |
| Question audio | ✅ Complete |
| Celebration/Promises | ✅ Complete |

**How It Works:**
- System auto-detects language via `window.i18n.currentLang`
- English audio plays when user switches to English
- Same controls as Tagalog (mute toggle, auto-play)

---

## [v2.0.0] - 2026-01-27

### 🚀 Major Release: Bilingual + Audio + Auto-Update

**Summary:** Complete bilingual Gospel presentation, full audio sync for all 40 slides, and automatic update system for elderly users.

---

### 🌐 Bilingual Gospel Presentation (English & Tagalog)

**New File Created:**
- `/modules/gospel/gospel-content.js` (666 lines) - Complete content separation

**Features:**
- All 40 slides fully translated to English
- Language detection via `window.i18n.currentLang`
- Dynamic content loading based on selected language
- Helper methods: `GospelContent.get(key)`, `getLang()`, `isEnglish()`

**Content Structure:**
```javascript
GospelContent = {
  tl: { intro, truth1, truth2, truth3, truth4, decision, prayer, celebration, promises, final, ui },
  en: { /* Same structure in English */ }
}
```

---

### 🔊 Complete Audio Narration (All 40 Slides)

**Files Updated:**
- `/modules/gospel/gospel-audio.js` (480 lines - complete rewrite)

**Audio Files Added (54 total):**
- Slides 1-39 main narration
- Question/Correct/Wrong audio for all 8 questions
- Prayer and "Not Accepted" response audio

**Audio Mapping:**
| Slide Type | Audio Files |
|------------|-------------|
| Regular slides | `Gospel Slide N.wav` |
| Question slides | `Question.wav` + `Correct Answer.wav` + `Wrong Answer.wav` |
| Prayer slide | `Prayer.wav` + `Button Hindi.wav` |

**Features:**
- Auto-plays on slide entry
- Plays correct/wrong answer audio after answering
- Bilingual ready (slideAudioEN object prepared)
- Mute toggle persisted to localStorage

---

### 🔄 Auto-Update System for Elderly Users

**New File Created:**
- `/modules/core/auto-update.js` (227 lines)
- `/netlify.toml` - Build configuration
- `/scripts/bump-version.sh` - Auto-version bumping

**Features:**
- Service worker registration
- Silent updates (no prompts)
- Automatic activation when app becomes visible
- Version mismatch detection → force refresh
- Periodic checks every 5 minutes

**How It Works:**
1. Push code to GitHub
2. Netlify runs `bump-version.sh` automatically
3. `BUILD_TIMESTAMP` and `CACHE_VERSION` update
4. Users get updates silently on next app open

---

### 🎨 UI/UX Improvements

**Collapsible Other Features:**
- Cards below Journey card now hidden by default
- "Iba pang Features" header to expand
- Forces new users to focus on Gospel first

**Default Settings:**
- Light mode now default for all users
- Tagalog now default for all users
- Previous preferences cleared on update

**Bug Fixes:**
- Language toggle menu now shows correct option
- Final slide button visibility fixed
- Blank slides in English fixed (self.c() pattern)

---

### 📝 Content Updates

**Slide 17:** "Maling Isipin Patungkol sa Kaligtasan" / "Wrong Thinking About Salvation"

**Slide 30 (Wrong Answer):** Added verse quote and simplified explanation

**Slide 35 (NEW):** "Not Accepted" response flow
- Encouraging message when user clicks "No" on prayer
- Allows user to continue and see promises
- Total slides now: 40

**Next Steps Modal:**
- "Maglaan ng Oras sa Diyos" → "Makipag-usap sa Diyos Araw-araw"
- Full bilingual support

---

### 📊 Gospel Decision Tracking (Verified)

**Firebase Recording:**
```javascript
// Accepted Christ
users/{uid}/gospelDecision: {
  accepted: true,
  acceptedAt: timestamp,
  status: 'saved',
  stage: 'disciple'
}
stats/gospel: { savedCount: +1 }

// Said No after prayer
users/{uid}/gospelDecision: {
  prayerResponse: 'no',
  needsFollowUp: true,
  respondedAt: timestamp
}

// Not ready
users/{uid}/gospelDecision: {
  notReadyAt: timestamp,
  status: 'not-ready'
}
```

---

### Files Modified
- `/modules/gospel/gospel-presentation.js` (889 lines)
- `/modules/gospel/gospel-audio.js` (480 lines)
- `/modules/gospel/gospel-content.js` (666 lines - NEW)
- `/modules/core/auto-update.js` (227 lines - NEW)
- `/modules/core/theme.js` (force light mode)
- `/modules/core/i18n.js` (force Tagalog)
- `/modules/journey/next-steps-modal.js` (bilingual)
- `/index.html` (collapsible cards, menu fix)
- `/firebase-messaging-sw.js` (v2.0.0)
- `/netlify.toml` (NEW)
- `/scripts/bump-version.sh` (NEW)

**Rollback:**
```bash
git revert HEAD~15..HEAD
# Or restore from v1.5.1 tag
```

---

## [v1.5.1] - 2026-01-27

### 🔊 Gospel Audio Narration System (Initial)

**Summary:** Added voiceover audio sync for Gospel presentation slides 0-2.

**Files Created:**
- `/modules/gospel/gospel-audio.js` (314 lines)
- `/assets/audio/gospel/slide_1_to_3.wav` (1.7MB)

---

## [v1.5.0] - 2026-01-26 Late Night

### 🎬 Interactive Gospel Presentation - Complete Overhaul

**Summary:** 34 animated slides with question-based discovery learning.

---

## [v1.4.0] - 2026-01-26

### 🚀 Journey-Centric Dashboard + Initial Gospel

---

## [v1.3.0] - 2026-01-25

### Bible Quick Insights System
- AI-generated 3-sentence summaries for each book

---

## [v1.2.0] - 2026-01-24

### PWA Installation Flow

---

## [v1.1.0] - 2026-01-23

### Bible Reader Module

---

## [v1.0.0] - 2026-01-20

### Initial Release

---

*Last Updated: January 27, 2026*
