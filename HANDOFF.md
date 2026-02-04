# Go Mission - AI Handoff Document

> ⚡ READ THIS FIRST - Everything you need to continue development

## Quick Context
- **App**: Disciple-making journey for Filipino seekers worldwide
- **Live**: https://gomission.netlify.app
- **Repo**: /Volumes/Wotg Drive Mike/GitHub/Go-Mission
- **Stack**: HTML/JS + Tailwind CDN + Firebase

---

## 🚨 URGENT - Push Required (2026-02-04)

### Problem Found
**Quick Insights not displaying** - The deployed Netlify version is BEHIND the local repo!

**Root Cause:** Recent commits with Quick Insights data were never pushed to GitHub/Netlify.

**Local has:**
- `97687ca` Migrate Jitsi (latest)
- `8219018` Leader Dashboard  
- `d1aac71` Complete Romans Quick Insights ← **HAS THE TL DATA**

**Netlify only has:**
- `3c09bd8` Fix BiblePicker theming (OLD)

### FIX - Run This Command:
```bash
cd "/Volumes/Wotg Drive Mike/GitHub/Go-Mission"
git push origin main
```

After pushing, Netlify will auto-deploy and insights will work.

---

## Current Session (2026-02-04) - QUICK INSIGHTS DEBUG

### ✅ DIAGNOSIS COMPLETE

**Issue**: Quick Insights panel shows headers (Pag-unawa, Isabuhay, Pag-ibig ng Diyos) but NO content text.

**Investigation Results:**
1. ✅ Local JSON files have FULL bilingual content (EN + TL)
2. ✅ BibleLoader.js code is correct
3. ✅ BibleReader.js rendering code is correct
4. ❌ **Deployed Netlify version has EMPTY TL strings**
5. ❌ **Git remote is 4 commits behind local**

**Proof:**
- Local ROM.json verse 5 TL: 978 chars ✅
- Deployed ROM.json verse 5 TL: 0 chars ❌

### 📊 Quick Insights Coverage Status

| Category | Status |
|----------|--------|
| Books with insights file | 63/66 |
| Missing books (no file) | 1TH, 2TH, HAG, JON |
| Books with partial verses | Many (see analysis below) |

**After push, these insights will work:**
- Romans - all 16 chapters with full bilingual content
- Matthew - working (already on Netlify)
- All other books that have files

---

## Previous Session (2026-02-03) - Jitsi Migration ✅

**Task**: Migrated Jitsi from `meet.wotgonline.com` to `call.wotgonline.com`

**Files Updated**:
- `/modules/groups/group-meeting.js` - Changed `JITSI_DOMAIN`
- `/modules/training/training.js` - Changed Jitsi URL

---

## Key Files

| File | Purpose |
|------|---------|
| `/modules/bible/bible-loader.js` | Loads Quick Insights JSON |
| `/modules/bible/bible-reader.js` | Renders insights in sidebar |
| `/modules/bible/data/quick-insights/*.json` | Insight data (63 books) |

---

## Quick Insights System

### Working Flow:
1. User taps verse → highlights it
2. BibleLoader.getQuickInsights() fetches from JSON
3. Returns `{understanding, livingItOut, godsLove, reflection}` for language
4. BibleReader.renderCommentary() displays in sidebar

### 4-Section Format (Bilingual)
| Section | English | Tagalog |
|---------|---------|---------|
| 1 | Understanding This Verse | Unawain ang Talata |
| 2 | Living It Out | Isabuhay Ito |
| 3 | See God's Love | Makita ang Pag-ibig ng Diyos |
| 4 | Reflection Question | Pagnilayan at Gawin |

---

## 🚫 BANNED (Do Not Use)

| Category | Banned | Use Instead |
|----------|--------|-------------|
| Colors | Random greens, blues, purples | `var(--color-gold)`, `var(--mission-red-bright)` |
| Buttons | Green buttons, blue buttons | `btn-primary` (burnt orange gradient) |
| Fonts | Arial, Inter, Roboto, system-ui | `var(--font-display)`, `var(--font-body)` |

---

*Last Updated: February 4, 2026 - Quick Insights Debug Complete - NEEDS PUSH*
