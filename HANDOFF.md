# Go Mission - AI Handoff Document

> ⚡ READ THIS FIRST - Everything you need to continue development

## Quick Context
- **App**: Disciple-making journey for Filipino seekers worldwide
- **Live**: https://gomission.netlify.app
- **Repo**: /Volumes/Wotg Drive Mike/GitHub/Go-Mission
- **Firebase**: shaped-by-grace (Firestore + Auth)
- **Stack**: HTML/JS + Tailwind CDN + Firebase

---

## Current Session (2026-01-20)
- **MODULE**: Bible Quick Insights System
- **STATUS**: ✅ UI Updated, 🔄 Luke generating
- **NEXT**: Test UI, continue generating books

---

## ✅ Completed This Session

### 1. Quick Insights Data Generation
| Book | Verses | Model | Cost | Status |
|------|--------|-------|------|--------|
| John | 878 | Gemini 2.5 Pro | $41.91 | ✅ Complete |
| Matthew | 1,068 | Gemini 2.0 Flash | ~$8.84 | ✅ Complete |
| Mark | 673 | GPT-4o-mini | $0.08 | ✅ Complete |
| Luke | 1,149 | GPT-4o-mini | ~$0.12 | 🔄 Generating |

### 2. Quick Insights UI Updates
- Moved reflection question from Commentary to REFLECT section
- Added styled `aiReflectCard` with drop shadow
- Card shows only when verse with insights is highlighted
- Commentary now shows: Understanding, Living It Out, God's Love, Dig Deeper

### 3. API Cost Discovery
- **GPT-4o-mini**: Best value (~$0.08-0.15 per book)
- Can generate all 66 books for ~$8-12 total

---

## 📁 Key Files

### Quick Insights System
```
/modules/bible/
├── bible-loader.js         # ✅ Loads Quick Insights & Tyndale
├── bible-reader.js         # ✅ Updated - 3 sections + Dig Deeper
└── data/
    ├── quick-insights/
    │   ├── JHN.json        # ✅ Complete
    │   ├── MAT.json        # ✅ Complete
    │   ├── MRK.json        # ✅ Complete
    │   └── LUK.json        # 🔄 Generating
    └── commentary/
        └── tyndale-json/   # 66 books - for "Dig Deeper"
```

### Generator Scripts
```
/scripts/
├── generate-quick-insights-openai.js  # GPT-4o-mini (RECOMMENDED)
└── generate-quick-insights.js         # Gemini (expensive)
```

---

## 🔑 Generate a Book

```bash
cd "/Volumes/Wotg Drive Mike/GitHub/Go-Mission"
OPENAI_API_KEY="your-key-here" node scripts/generate-quick-insights-openai.js BOOK_CODE
```

Book codes: GEN, EXO, MAT, MRK, LUK, JHN, ACT, ROM, etc.

---

## 📋 Next Steps

### Immediate
1. [ ] Test Quick Insights UI on live site
2. [ ] Verify REFLECT section shows AI question
3. [ ] Wait for Luke to complete

### Then
4. [ ] Generate remaining NT books
5. [ ] Generate OT books (batch overnight)

---

## 📚 Quick Insights Format

| # | Section | Shows In |
|---|---------|----------|
| 1 | Understanding This Verse | Commentary |
| 2 | Living It Out | Commentary |
| 3 | See God's Love | Commentary |
| 4 | Reflection Question | **REFLECT section** |
| 5 | Dig Deeper (Tyndale) | Commentary (toggle) |

---

*Last Updated: January 20, 2026 - 12:30 PM PHT*
