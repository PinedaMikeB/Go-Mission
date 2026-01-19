# Journey Module

## Purpose
Display and manage user's discipleship journey through 5 stages.

## Status: 🚧 Partial (UI complete, logic pending)

## Files
```
modules/journey/
├── README.md      # This file
├── journey.js     # Journey card, stage progression
└── stages.json    # Stage definitions
```

## Journey Stages
| Stage | English | Tagalog | Requirements |
|-------|---------|---------|--------------|
| 1 | Seeker | Naghahanap | Default start |
| 2 | On The Journey | Nasa Paglalakbay | Join Mission Group |
| 3 | Disciple-Maker | Tagagawa ng Alagad | Start discipling 1+ person |
| 4 | Builder | Tagapagtayo | Lead a Mission Group |
| 5 | Multiplier | Tagapagparami | Launch new groups |

## Data Structure (stages.json)
```json
{
  "stages": [
    {
      "id": 1,
      "key": "seeker",
      "en": "Seeker",
      "tl": "Naghahanap",
      "icon": "🔍",
      "requirements": []
    }
  ]
}
```

## Firestore
Collection: `goMission_members`
```json
{
  "stage": "seeker",
  "stageUpdatedAt": timestamp
}
```

## Current Implementation
- ✅ Journey card UI with 5 stages
- ✅ Tagalog stage names
- ✅ Visual progress indicator
- 📋 Need: Stage progression logic
- 📋 Need: Requirements checking

## Dependencies
- modules/core/auth.js
- shared/firebase-config.js
