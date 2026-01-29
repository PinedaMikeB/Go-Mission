# Bible Module

## Purpose
Spirit-led Bible reading with verse highlighting, auto-commentary, and progress tracking.

## Status: ✅ Core Complete | ✅ Quick Insights 63/66 Books

## Philosophy
> "Let the Holy Spirit speak - stop where prompted, highlight it, read commentary, then reflect."

- Full chapter display (no artificial verse limits)
- User highlights verses that speak to them
- Commentary auto-loads for highlighted verses
- Resume from last position

## Files
```
modules/bible/
├── README.md              # This file
├── bible-loader.js        # Load Bible/commentary from JSON ✅
├── bible-picker.js        # Search/browse book picker ✅
├── bible-reader.js        # Chapter display + highlighting ✅
└── data/
    ├── en/                # English BSB (66 books) ✅
    ├── tl/                # Tagalog ADB 1905 (66 books) ✅
    ├── commentary/
    │   └── tyndale-json/  # Tyndale Study Notes (66 books) ✅
    └── quick-insights/    # AI-generated insights (63 books) ✅
```

## Data Sources
| Data | Source | Status |
|------|--------|--------|
| English Bible (BSB) | HelloAO API | ✅ 66/66 |
| Tagalog Bible (ADB 1905) | GetBible API | ✅ 66/66 |
| Tyndale Study Notes | tyndaleopenresources.com | ✅ 66/66 |
| Quick Insights (EN+TL) | GPT-4o-mini + Tyndale | ✅ 63/66 books |

### Quick Insights Progress (Generated via GPT-4o-mini)
**✅ Complete (63 books):**
- **Old Testament (35 books):** Genesis, Exodus, Leviticus, Numbers, Deuteronomy, Joshua, Judges, Ruth, 1 Samuel, 2 Samuel, 1 Kings, 2 Kings, 1 Chronicles, 2 Chronicles, Ezra, Nehemiah, Esther, Job, Psalms, Proverbs, Ecclesiastes, Song of Solomon, Isaiah, Jeremiah, Lamentations, Ezekiel, Daniel, Hosea, Joel, Amos, Obadiah, Micah, Nahum, Habakkuk, Zephaniah, Zechariah, Malachi
- **New Testament (28 books):** Matthew, Mark, Luke, John, Acts, Romans, 1 & 2 Corinthians, Galatians, Ephesians, Philippians, Colossians, 1 & 2 Timothy, Titus, Philemon, Hebrews, James, 1 & 2 Peter, 1, 2 & 3 John, Jude, Revelation

**❌ Missing (4 books):**
- 1 Thessalonians (1TH)
- 2 Thessalonians (2TH)
- Haggai (HAG)
- Jonah (JON)

## Quick Insights System

### 4-Section Format (Bilingual)
| Section | English | Tagalog |
|---------|---------|---------|
| 1 | Understanding This Verse | Unawain ang Talata |
| 2 | Living It Out | Isabuhay Ito |
| 3 | See God's Love | Makita ang Pag-ibig ng Diyos |
| 4 | Reflection Question | Pagnilayan at Gawin |

### Quick Insights JSON Structure
```javascript
// /modules/bible/data/quick-insights/JHN.json
{
  "id": "JHN",
  "name": "John",
  "type": "quick-insights-tyndale-hybrid",
  "generatedAt": "2026-01-19T08:41:52.258Z",
  "chapters": {
    "1": {
      "verses": {
        "1": {
          "en": {
            "understanding": "This verse introduces Jesus as 'the Word'...",
            "livingItOut": "Since Jesus is the eternal Word of God...",
            "godsLove": "Isn't it amazing that the eternal God...",
            "reflection": "How does knowing that Jesus is fully God..."
          },
          "tl": {
            "understanding": "Ipinapakilala sa talatang ito si Jesus...",
            "livingItOut": "Dahil si Jesus ang mismong Salita ng Diyos...",
            "godsLove": "Napakabuti ng Diyos dahil hindi Niya nais...",
            "reflection": "Paano binabago ng kaalaman na si Jesus ay Diyos..."
          }
        }
      }
    }
  }
}
```

## User Flow
```
1. App loads → BibleReader resumes from saved progress
2. User taps passage title → BiblePicker opens
3. Search/browse → select book → select chapter
4. Full chapter loads → read, guided by Holy Spirit
5. Tap verse(s) → highlight (can select multiple)
6. Quick Insights auto-shows for highlighted verses
7. "Dig Deeper" button → shows full Tyndale note
8. Write reflection → save devotion
9. Next visit → resume exactly where left off
```

## Bible Picker (`bible-picker.js`)

### Features
- Progressive search (bilingual EN/TL)
- OT/NT tabs
- Recent readings (last 5)
- Chapter grid selector

### Usage
```javascript
BiblePicker.open();

document.addEventListener('biblePassageSelected', (e) => {
  console.log(e.detail.book, e.detail.chapter);
});
```

## Bible Reader (`bible-reader.js`)

### Features
- Full chapter display
- Tap-to-highlight verses
- Auto-load commentary
- Progress tracking
- Prev/Next navigation
- Firestore persistence

### Usage
```javascript
await BibleReader.loadChapter('JHN', 3);
BibleReader.toggleHighlight(16);
const reading = BibleReader.getCurrentReading();
```

## Bible Loader (`bible-loader.js`)

### Usage
```javascript
const chapter = await BibleLoader.getChapter('JHN', 3, 'tl');
const comm = await BibleLoader.getCommentary('JHN', 3, 16, 18, 'tl');
BibleLoader.getBookName('JHN', 'tl');  // "Juan"
```

## Data Structures

### Progress (Firestore)
```javascript
// goMission_members/{uid}.bibleProgress
{
  book: "JHN",
  chapter: 3,
  lastReadAt: timestamp,
  booksProgress: {
    "JHN": { 
      lastChapter: 3, 
      chaptersRead: [1, 2, 3] 
    }
  }
}
```

### Devotion Entry (Firestore)
```javascript
// goMission_devotions/{uid}_{date}
{
  uid: "user123",
  book: "JHN",
  chapter: 3,
  highlightedVerses: [16, 17],
  question: "What is God saying?",
  reflection: "God reminded me...",
  sharedWithGroup: true,
  language: "tl",
  savedAt: timestamp
}
```

## Events
```javascript
document.addEventListener('biblePassageSelected', (e) => {
  // e.detail = { book: 'JHN', chapter: 3 }
});

document.addEventListener('languageChanged', (e) => {
  // e.detail = { lang: 'tl', isTagalog: true }
});
```

## Dependencies
- `/modules/core/i18n.js` - Language toggle (global header)
- Firebase Firestore - Progress persistence
- localStorage - Offline fallback
