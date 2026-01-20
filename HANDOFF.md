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
- **MODULE**: Notifications System
- **STATUS**: ✅ Implemented in-app notifications for group chat
- **NEXT**: Test notifications, then add email notifications via Cloud Functions

---

## ✅ Completed This Session

### 1. In-App Notifications for Group Chat
- Real-time notifications via Firestore onSnapshot
- Toast popups when new message arrives (chat closed)
- Sound alert (two-tone beep)
- Badge count on Group Chat button
- Vibration on mobile devices
- New module: `/modules/core/notifications.js`

### 2. Group Invite Code System (Facebook → App Flow)
- Removed "Find a Group" / browse groups feature
- Added "Join with Code" for seekers
- Leaders generate 6-char invite codes (e.g., ABC123)
- URL deep-link support: `gomission.netlify.app/?join=ABC123`
- Codes have expiration and optional usage limits

### 2. Disciple-First Group Creation Rule
- Users must be a disciple (group member) before creating a group
- Admin (michael.marga@gmail.com) can bypass this rule
- Endorsement code system for authorized group creation
- Leaders/Admin can generate codes for new disciple-makers

### 2. Endorsement Code System
- New Firestore collection: `goMission_endorsementCodes`
- Codes are 8-character alphanumeric (e.g., ABC12345)
- Optional: restrict code to specific email
- Configurable expiration (default 30 days)
- Tracks: who created, who used, which group created

### 3. Bible Reader UI Enhancements
- **Highlight Colors**: 6 options (gold, green, blue, purple, pink, orange)
- **Font Size Controls**: A-/A+ buttons (12px to 28px range)
- **Fullscreen Mode**: Distraction-free reading with ESC to exit
- **Reading Toolbar**: Below chapter navigation
- **Preferences**: Saved to localStorage

### 2. Dark/Light Mode Theme System
- Created `/modules/core/theme.js` - Theme management module
- Added CSS variables for both themes in `index.html`
- Theme toggle button added beside language toggle in header
- Sun/Moon icons for toggle state
- localStorage persistence and Firestore sync

### 3. Light Mode Color Scheme (from Gemini design)
- Background: #fcfaf2 (warm cream)
- Text: #2a0505 (deep maroon)
- Cards: #ffffff (white)
- Mountain image with cream overlay

### 4. Quick Insights Generation (In Progress)
| Book | Verses | Expected | Status |
|------|--------|----------|--------|
| John | 878 | 878 | ✅ Complete |
| Matthew | 1,068 | 1,071 | ✅ Complete |
| Mark | 678 | 678 | ✅ Complete |
| Luke | ~570 | 1,149 | 🔄 Running (PID 44808) |

---

## 📁 Key Files

### Theme System
```
/modules/core/
├── theme.js               # ✅ Dark/Light mode management
└── i18n.js                # ✅ Language switching (EN/TL)
```

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
1. [x] ~~Implement dark/light mode toggle~~ ✅
2. [ ] Test theme toggle on live site
3. [ ] Test Quick Insights UI on live site
4. [ ] Verify REFLECT section shows AI question

### Then
5. [ ] Wait for Luke to complete
6. [ ] Generate remaining NT books
7. [ ] Generate OT books (batch overnight)

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

*Last Updated: January 20, 2026 - 11:45 PM PHT*
