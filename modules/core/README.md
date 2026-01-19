# Core Module

## Purpose
App initialization, authentication, shared UI components, and language (i18n) system.

## Status: 🚧 In Progress

## Files
```
modules/core/
├── README.md    # This file
├── app.js       # App init, routing, module loader
├── auth.js      # Firebase authentication
├── ui.js        # Shared UI components
└── i18n.js      # Language/Taglish system ✅
```

## Language System (i18n.js) ✅

### Modes
| Mode | Value | Bible Text | Commentary |
|------|-------|------------|------------|
| English | `en` | English (BSB) | English (Matthew Henry) |
| Tagalog | `tl` | Tagalog (ADB 1905) | Tagalog (Translated) |

### Usage
```javascript
// Initialize (auto-runs on DOMContentLoaded)
i18n.init();

// Get current language
i18n.getLang();        // 'en' or 'tl'
i18n.isTagalog();      // true/false

// Set language
i18n.setLang('tl');    // Set to Tagalog
i18n.setLang('en');    // Set to English
i18n.toggle();         // Toggle between languages

// Get translations
i18n.t('myJourney');              // 'My Journey' or 'Aking Paglalakbay'
i18n.t('stages.seeker.name');     // 'ON THE JOURNEY' or 'NASA PAGLALAKBAY'

// Get stage info
i18n.getStage('seeker');          // { label: '...', name: '...' }
i18n.getEncouragement('seeker');  // { text: '...', next: '...' }

// Create toggle HTML
const html = i18n.createToggleHTML();
```

### Events
```javascript
// Listen for language changes
document.addEventListener('languageChanged', (e) => {
  console.log('Language:', e.detail.lang);        // 'en' or 'tl'
  console.log('Is Tagalog:', e.detail.isTagalog); // true/false
});
```

### Auto-Translation with data-i18n
```html
<!-- Auto-translated elements -->
<h2 data-i18n="myJourney">My Journey</h2>
<span data-i18n="stages.seeker.label">On The Journey</span>
<button data-i18n="saveThisDay">Save This Day</button>

<!-- Placeholder translation -->
<textarea data-i18n="writeReflection" data-i18n-placeholder></textarea>
```

### User Preference Storage
```javascript
// LocalStorage: goMission_language
// Firestore: goMission_members/{userId}.preferences.language
```

### Available Translation Keys
- **Journey**: myJourney, whereGodHasYou, next, viewNextSteps
- **Stages**: stages.seeker, stages.disciple, stages.disciple-maker, stages.builder, stages.multiplier
- **Devotion**: myDayWithTheLord, tapToHighlight, helpMeUnderstand, reflect, writeReflection, shareWithGroup, saveThisDay
- **Group**: missionGroup, weeklyMeeting, bibleStudy, shareAndPray, accountability, chatWithGroup
- **Training**: missionTraining, phaseRequirement
- **Dashboard**: leaderDashboard, adminMode, missionGroups, activeDisciples
- **Nav**: journey, group, training, dash
- **General**: signOut, loading

## Bible Loader (bible-loader.js) ✅

Located at: `/modules/bible/bible-loader.js`

### Usage
```javascript
// Load a book
const book = await BibleLoader.loadBook('JHN', 'tl');

// Get specific chapter
const chapter = await BibleLoader.getChapter('JHN', 3, 'en');

// Get verse range
const verses = await BibleLoader.getVerses('JHN', 3, 16, 18, 'tl');

// Load commentary
const commentary = await BibleLoader.loadCommentary('JHN', 'en');

// Get commentary for verses
const comm = await BibleLoader.getCommentary('JHN', 3, 16, 18, 'tl');

// Parse reference string
const ref = BibleLoader.parseReference('John 3:16-18');
// { book: 'JHN', chapter: 3, startVerse: 16, endVerse: 18 }

// Format reference
BibleLoader.formatReference('JHN', 3, 16, 18, 'tl');
// "Juan 3:16-18"

// Get book name
BibleLoader.getBookName('JHN', 'tl'); // "Juan"
```

## Authentication (auth.js)

### Key Functions
- `signInWithGoogle()` - Google OAuth
- `signOut()` - Logout user
- `getCurrentUser()` - Get current user
- `onAuthStateChanged(callback)` - Auth listener

### User Profile Auto-Creation
```javascript
// On first sign-in, creates:
goMission_members/{
  id: user.uid,
  name: user.displayName,
  email: user.email,
  photoURL: user.photoURL,
  createdAt: timestamp,
  stage: "seeker",
  preferences: { language: "tl" }
}
```

## Shared UI Components (ui.js)

### Components
- `showToast(message, type)` - Toast notifications
- `showModal(content)` - Modal dialogs
- `showLoading()` / `hideLoading()` - Loading spinner
- `formatDate(date)` - Date formatting

## Dependencies
- shared/firebase-config.js

## Current Implementation
- ✅ Google Sign-In working
- ✅ User profile creation
- ✅ Basic toast notifications
- ✅ i18n.js with translations
- ✅ Bible loader module
- 📋 Need: Module loader
- 📋 Need: Proper routing

## Migration Tasks
1. [ ] Extract auth from index.html → auth.js
2. [x] Create i18n.js with toggle
3. [ ] Add language toggle to header (integrated)
4. [ ] Create module loader in app.js
