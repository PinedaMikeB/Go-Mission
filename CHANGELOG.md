# CHANGELOG - GO MISSION

All notable changes and deployments. Use this for rollbacks.

---

## Version Format
`vX.Y.Z` — Major.Minor.Patch  
Each entry includes rollback instructions.

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
