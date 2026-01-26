# Go Mission - AI Handoff Document

> ⚡ READ THIS FIRST - Everything you need to continue development

## Quick Context
- **App**: Disciple-making journey for Filipino seekers worldwide
- **Live**: https://gomission.netlify.app
- **Repo**: /Volumes/Wotg Drive Mike/GitHub/Go-Mission
- **Firebase**: wotg-app (Firestore + Auth + Cloud Functions)
- **Stack**: HTML/JS + Tailwind CDN + Firebase

---

## Current Session (2026-01-26 Evening)

### 🏠 Home Screen Redesign ✅ DONE
**Changes Made:**
1. Journey Card remains as the main prominent card
2. Added "Know How Much God Loves You" button (Gospel invitation)
3. Other cards (Devotion, My Mission, My Training) wrapped in collapsible "More Features" section
4. Collapse state saved to localStorage

**Files Modified:**
- `/index.html` - Home screen structure and toggle functions

### ❤️ Gospel Presentation Module ✅ CREATED
**Location:** `/modules/gospel/`

**Features:**
- Interactive animated slide presentation
- Based on "Ang Daan Papuntang Langit" (4 Truths)
- Formula question for engagement
- Prayer of salvation with decision tracking
- Assurance verses
- Saves prayer decision to Firebase

**Images Downloaded:**
- `/assets/images/gospel/gospel_tract1.jpg` through `gospel_tract5.jpg`

**Usage:**
```javascript
GospelPresentation.open();  // Open presentation
GospelPresentation.close(); // Close
```

**Next Steps for Gospel:**
1. Mike to record audio narration (one long file)
2. Claude to split audio by slide timestamps
3. Build "Conversation with God" guide (ConversationGuide module)
4. Add journal prayer request tracking feature

### 🔄 NT Quick Insights Generation (STILL RUNNING)
**Script:** `/scripts/run-nt-incomplete.sh`
**Log:** `/scripts/logs/nt-incomplete-generation.log`

**Books Being Regenerated (19):**
```
MAT MRK LUK JHN ACT ROM 1CO 2CO GAL EPH PHP COL 1TI 2TI HEB JAS 1PE 1JN REV
```

**Monitor:**
```bash
tail -f "/Volumes/Wotg Drive Mike/GitHub/Go-Mission/scripts/logs/nt-incomplete-generation.log"
```

---

## Discipleship Flow (Planned)

```
1. "Know How Much God Loves You" (Button on Home)
   ↓
2. Gospel Presentation (Interactive slides)
   ↓
3. Prayer Decision (Saved to Firebase)
   ↓
4. "Grow Your Love for God" (Invitation modal)
   ↓
5. "Conversation with God" Guide (Quiet Time tutorial)
   ↓
6. Daily Bible Reading + Quick Insights
   ↓
7. Journal + Prayer Request Tracking
```

---

## Quick Insights Summary

### Total Bible Books: 66

| Category | Complete | In Progress | Missing (No Source) |
|----------|----------|-------------|---------------------|
| OT (39) | 37 | 0 | 2 (JON, HAG) |
| NT (27) | 6 | 19 (running) | 2 (1TH, 2TH) |
| **Total** | **43** | **19** | **4** |

---

## Key Files Reference

### Gospel Module
- `/modules/gospel/gospel-presentation.js` - Main presentation code
- `/modules/gospel/README.md` - Documentation
- `/assets/images/gospel/` - 5 gospel tract images

### Home Screen
- `/index.html` - Main app with home screen

### Bible Module  
- `/modules/bible/data/quick-insights/*.json` - Quick Insights data
- `/scripts/generate-quick-insights-openai.js` - Generator script

---

## What's Next

### Immediate
1. Wait for NT generation to complete (2-4 hours)
2. Test home screen changes
3. Test Gospel presentation flow

### When Mike Provides Audio
1. Receive audio file
2. Split by slide timestamps
3. Implement audio playback in Gospel module

### Build Next
1. **ConversationGuide module** - Quiet time tutorial
2. **Prayer request tracking** - Add to journal
3. **Answered prayer filtering** - Journal feature
