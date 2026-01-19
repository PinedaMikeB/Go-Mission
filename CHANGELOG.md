# CHANGELOG - GO MISSION

All notable changes and deployments. Use this for rollbacks.

---

## Version Format
`vX.Y.Z` — Major.Minor.Patch  
Each entry includes rollback instructions.

---

## [v0.5.0] - 2026-01-19 ⭐ CURRENT

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
