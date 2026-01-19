# Bible Module

## Purpose
Spirit-led Bible reading with verse highlighting, auto-commentary, and progress tracking.

## Status: ✅ Core Complete

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
    └── commentary/
        ├── matthew-henry/     # English (65 books) ✅
        └── matthew-henry-tl/  # Tagalog (translating) 🔄
```

## User Flow
```
1. App loads → BibleReader resumes from saved progress
2. User taps passage title → BiblePicker opens
3. Search/browse → select book → select chapter
4. Full chapter loads → read, guided by Holy Spirit
5. Tap verse(s) → highlight (can select multiple)
6. Commentary auto-shows for highlighted verses
7. Write reflection → save devotion
8. Next visit → resume exactly where left off
```

## Bible Picker (`bible-picker.js`)

### Features
- Progressive search (bilingual EN/TL)
- OT/NT tabs
- Recent readings (last 5)
- Chapter grid selector

### Usage
```javascript
// Open picker modal
BiblePicker.open();

// Listen for selection
document.addEventListener('biblePassageSelected', (e) => {
  console.log(e.detail.book, e.detail.chapter);
  // 'JHN', 3
});

// Search books
BiblePicker.searchBooks('john');  // ['JHN']
BiblePicker.searchBooks('juan');  // ['JHN']
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
// Load a chapter
await BibleReader.loadChapter('JHN', 3);

// Toggle verse highlight
BibleReader.toggleHighlight(16);

// Get current reading (for saving)
const reading = BibleReader.getCurrentReading();
// { book: 'JHN', chapter: 3, highlightedVerses: [16, 17] }

// Navigation
BibleReader.prevChapter();
BibleReader.nextChapter();
```

## Bible Loader (`bible-loader.js`)

### Usage
```javascript
// Load chapter
const chapter = await BibleLoader.getChapter('JHN', 3, 'tl');

// Load commentary
const comm = await BibleLoader.getCommentary('JHN', 3, 16, 18, 'tl');

// Get book name
BibleLoader.getBookName('JHN', 'tl');  // "Juan"
```

## Data Structure

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
  oddi: "user123",
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

## Data Sources
| Data | Source | Status |
|------|--------|--------|
| English Bible (BSB) | HelloAO API | ✅ 66/66 |
| Tagalog Bible (ADB 1905) | GetBible API | ✅ 66/66 |
| Commentary EN | HelloAO API | ✅ 65/65 |
| Commentary TL | Claude Translation | 🔄 4/65 |

## Events

```javascript
// Passage selected from picker
document.addEventListener('biblePassageSelected', (e) => {
  // e.detail = { book: 'JHN', chapter: 3 }
});

// Language changed
document.addEventListener('languageChanged', (e) => {
  // e.detail = { lang: 'tl', isTagalog: true }
});
```

## Dependencies
- `/modules/core/i18n.js` - Language toggle
- Firebase Firestore - Progress persistence
- localStorage - Offline fallback
