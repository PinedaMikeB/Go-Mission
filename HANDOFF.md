# Go Mission - AI Handoff Document

> ⚡ READ THIS FIRST - Everything you need to continue development

## Quick Context
- **App**: Disciple-making journey for Filipino seekers worldwide
- **Live**: https://gomission.netlify.app
- **Repo**: /Volumes/Wotg Drive Mike/GitHub/Go-Mission
- **Firebase**: shaped-by-grace (Firestore + Auth)
- **Stack**: HTML/JS + Tailwind CDN + Firebase

---

## Current Session (2026-01-19)
- **MODULE**: Bible Commentary System (Quick Insights)
- **STATUS**: ✅ Tyndale downloaded, AI hybrid test successful

---

## 🎯 Quick Insights System - READY TO BUILD

### What We Built This Session

1. **Downloaded Tyndale Open Study Notes**
   - Source: https://tyndaleopenresources.com/
   - License: Creative Commons Attribution-ShareAlike 4.0
   - Format: Converted from XML → JSON
   - Location: `/modules/bible/data/commentary/tyndale-json/`
   - **16,732 study notes** covering all 66 books!

2. **Tested Hybrid Approach** (Tyndale + AI Enhancement)
   - Tyndale provides scholarly base
   - Claude Sonnet transforms into simple 4-section format
   - Tested on John 3:16, Matthew 28:19, John 1:1
   - Results: Excellent quality, warm tone, practical application

### The 4-Section Format (Option C - On-Demand)

**Default View (AI-Generated):**
| Section | English | Tagalog |
|---------|---------|---------|
| 1 | Understanding This Verse | Unawain ang Talata |
| 2 | Living It Out | Isabuhay Ito |
| 3 | See God's Love | Makita ang Pag-ibig ng Diyos |
| 4 | Reflection Question | Pagnilayan at Gawin |

**"Read More" Button → Shows original Tyndale note**

### Key Design Decisions
- Tyndale is NOT shown directly (too scholarly)
- AI simplifies Tyndale into Section 1
- Sections 2-4 are AI-generated for application
- "Read More" reveals full Tyndale for deep study
- Uses Claude Sonnet (cost-efficient)
- Bilingual: English + Tagalog

---

## 📁 Key Files Created This Session

### Commentary Data
```
/modules/bible/data/commentary/
├── tyndale/                    # Original XML download
│   └── Tyndale Open Study Notes/
│       ├── StudyNotes.xml      # 10MB, 16,732 notes
│       ├── BookIntros.xml
│       ├── Profiles.xml
│       └── ThemeNotes.xml
├── tyndale-json/               # Converted to JSON
│   ├── GEN.json
│   ├── JHN.json
│   ├── MAT.json
│   └── ... (66 books)
└── matthew-henry/              # Previous (not using)
```

### Scripts
```
/scripts/
├── convert-tyndale-to-json.js  # XML → JSON converter
├── test-quick-insights.js      # Hybrid test (Tyndale + AI)
├── generate-quick-insights.js  # Full generation script (needs update)
└── download-tyndale.js         # Attempted API download (failed, used direct)
```

---

## 🔄 Previous Session Work (Still Active)

### Bible Reader System (v0.4.0)
- **BiblePicker** (`/modules/bible/bible-picker.js`) - Book/chapter selection
- **BibleReader** (`/modules/bible/bible-reader.js`) - Chapter display, highlighting
- **Bible Data** - EN (BSB) + TL (ADB 1905) for all 66 books
- **Commentary** - Matthew Henry EN (all books), TL translation (5 books)

### User Flow
```
1. User opens app → BibleReader loads saved progress
2. User reads chapter → highlights verses that speak to them
3. Commentary auto-loads for highlighted verses
4. User writes reflection → saves devotion
5. "Read More" → shows full Tyndale note (NEW)
```

---

## 📋 Next Steps (Priority Order)

### Immediate (Next Session)
1. **Update `generate-quick-insights.js`** to use Tyndale + AI hybrid
2. **Generate Quick Insights for John** (21 chapters, ~880 verses)
3. **Update `bible-reader.js`** to show Quick Insights format
4. **Add "Read More" button** to reveal full Tyndale

### Then
5. **Generate for all 66 books** (run in background)
6. **Translate insights to Tagalog** (already in generation)
7. **Test full flow** in browser
8. **Commit and deploy**

---

## 💰 API Costs (Estimated)

| Book | Verses | Est. Cost (Sonnet) |
|------|--------|-------------------|
| John | ~880 | ~$2-3 |
| All 66 books | ~31,000 | ~$50-80 |

Using user's Anthropic API key (provided in session).

---

## 🗂️ Data Structure

### Quick Insights JSON Format
```javascript
// /modules/bible/data/quick-insights/JHN.json
{
  "id": "JHN",
  "name": "John",
  "chapters": {
    "3": {
      "verses": {
        "16": {
          "en": {
            "understanding": "God's love extends to everyone...",
            "livingItOut": "You don't have to earn salvation...",
            "godsLove": "This is the ultimate proof of love...",
            "reflection": "How has God's unconditional love..."
          },
          "tl": {
            "understanding": "Ang pag-ibig ng Diyos...",
            "livingItOut": "Hindi mo kailangang...",
            "godsLove": "Ito ang pinakamatinding patunay...",
            "reflection": "Paano binago ng walang..."
          },
          "tyndale": "The truth that 'God loved the world'..."
        }
      }
    }
  }
}
```

### Firestore Collections
```javascript
// User's Bible progress
goMission_members/{uid}.bibleProgress = {
  book: "JHN",
  chapter: 3,
  lastReadAt: timestamp
}

// User's devotion entries
goMission_devotions/{uid}_{date} = {
  book: "JHN",
  chapter: 3,
  highlightedVerses: [16, 17],
  reflection: "...",
  sharedWithGroup: true
}
```

---

## 🔑 API Key

User's Anthropic API key is required for Quick Insights generation.
Set environment variable: `ANTHROPIC_API_KEY=your-key-here`

⚠️ **Note**: Never commit API keys to git.

---

## 📚 Related Documentation

- `/docs/MASTERPLAN.md` - Full project vision and roadmap
- `/CHANGELOG.md` - Version history and rollback instructions
- `/modules/bible/README.md` - Bible module API documentation

---

## Session End Checklist
- [x] Update HANDOFF.md ✅
- [x] Update CHANGELOG.md ✅
- [x] Update MASTERPLAN.md ✅
- [ ] Commit with descriptive message
- [ ] Push to GitHub

---

*Last Updated: January 19, 2026*
