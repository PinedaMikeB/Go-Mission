# CHANGELOG - GO MISSION

All notable changes and deployments. Use this for rollbacks.

---

## Version Format
`vX.Y.Z` — Major.Minor.Patch  
Each entry includes rollback instructions.

---

## [v2.0.0] - 2026-01-27 ⭐ CURRENT

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
