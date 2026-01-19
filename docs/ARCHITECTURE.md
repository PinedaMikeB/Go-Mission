# Go Mission - Modular Architecture

## 🎯 Design Principles

1. **Module Independence** - Each module is self-contained with its own README
2. **Fast Handoff** - AI reads only relevant module docs, not entire codebase
3. **Lazy Loading** - Load data only when needed
4. **Single Responsibility** - Each module handles one domain

---

## 📁 Project Structure

```
Go-Mission/
├── index.html                    # Main app shell (minimal, loads modules)
├── HANDOFF.md                    # Quick start for AI (< 50 lines)
├── CHANGELOG.md                  # Version history
│
├── docs/                         # Documentation
│   ├── ARCHITECTURE.md           # This file
│   ├── MASTERPLAN.md             # Full roadmap (reference only)
│   └── DATABASE-SCHEMA.md        # Firestore structure
│
├── modules/                      # Feature modules
│   ├── core/                     # Core app functionality
│   │   ├── README.md             # Module docs
│   │   ├── app.js                # App initialization, routing
│   │   ├── auth.js               # Firebase auth
│   │   ├── ui.js                 # Shared UI components
│   │   └── i18n.js               # Language/Taglish system
│   │
│   ├── bible/                    # Bible reading module
│   │   ├── README.md             # Bible module docs
│   │   ├── bible.js              # Bible display logic
│   │   ├── devotion.js           # Daily devotion feature
│   │   ├── commentary.js         # Commentary display
│   │   └── data/                 # Bible data files
│   │       ├── index.json        # Book list + metadata
│   │       ├── en/               # English (WEB)
│   │       │   └── JHN.json      # One file per book
│   │       ├── tl/               # Tagalog (Ang Bibliya)
│   │       │   └── JHN.json
│   │       └── commentary/       # Commentary data
│   │           ├── matthew-henry/
│   │           └── john-gill/
│   │
│   ├── journey/                  # My Journey module
│   │   ├── README.md
│   │   ├── journey.js            # Journey card, stages
│   │   └── stages.json           # Stage definitions
│   │
│   ├── groups/                   # Mission Groups module
│   │   ├── README.md
│   │   ├── groups.js             # Group management
│   │   ├── chat.js               # Group chat
│   │   └── attendance.js         # Check-in tracking
│   │
│   ├── training/                 # Mission Training module
│   │   ├── README.md
│   │   ├── training.js           # Training progress
│   │   ├── curriculum.js         # Session content
│   │   └── data/
│   │       └── phases.json       # 4 phases curriculum
│   │
│   └── dashboard/                # Leader Dashboard module
│       ├── README.md
│       ├── dashboard.js          # Stats, overview
│       └── reports.js            # Reports generation
│
├── shared/                       # Shared utilities
│   ├── firebase-config.js        # Firebase initialization
│   ├── utils.js                  # Helper functions
│   └── styles.css                # Shared styles (Tailwind)
│
└── scripts/                      # Build/utility scripts
    ├── download-bible.js         # Bible data downloader
    ├── translate-commentary.js   # AI translation script
    └── build.js                  # Production build
```

---

## 🚀 Fast Handoff System

### HANDOFF.md Structure (Keep Under 50 Lines)

```markdown
# Go Mission Handoff

## Current Session Focus
[MODULE]: bible
[TASK]: Add complete Tagalog Bible JSON
[STATUS]: In progress

## Quick Context
- Live: https://gomission.netlify.app
- Repo: /Volumes/Wotg Drive Mike/GitHub/Go-Mission
- Firebase: shaped-by-grace

## Active Module
Read: /modules/bible/README.md

## Recent Changes
- v0.4.1: Added language toggle
- v0.4.0: My Day with the Lord complete

## Next Steps
1. Download TagAngBiblia from CrossWire
2. Convert to module format
3. Test language switching
```

---

## 📦 Module README Template

Each module has its own README.md:

```markdown
# [Module Name] Module

## Purpose
One sentence description.

## Files
- file.js - What it does

## Data Structure
{ "example": "schema" }

## Key Functions
- functionName() - Description

## Dependencies
- core/auth.js
- shared/firebase-config.js

## Status
✅ Complete | 🚧 In Progress | 📋 Planned
```

---

## 🔄 Migration Plan

### Phase 1: Create Structure (Current)
1. Create /modules/ directory structure
2. Create README.md for each module
3. Keep existing index.html working

### Phase 2: Extract Bible Module
1. Move bible-data.js → modules/bible/
2. Create bible/README.md
3. Split into book files (JHN.json, etc.)

### Phase 3: Extract Other Modules
1. Journey card → modules/journey/
2. Training card → modules/training/
3. Dashboard → modules/dashboard/

### Phase 4: Refactor index.html
1. Convert to app shell
2. Implement module loading
3. Test all features

---

## 💡 Token Efficiency

| Approach | Tokens to Start | Time to Context |
|----------|-----------------|-----------------|
| Current (monolithic) | ~15,000 | 2-3 min |
| Modular (targeted) | ~3,000 | 30 sec |
| **Savings** | **80%** | **75%** |

### AI Session Protocol
1. Read HANDOFF.md first (50 lines)
2. Read active module README only
3. Work on targeted module
4. Update HANDOFF.md at end
