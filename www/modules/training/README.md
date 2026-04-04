# Training Module

## Purpose
Mission Training curriculum - 4 phases of disciple-maker development.

## Status: 📋 Planned (UI skeleton only)

## Files
```
modules/training/
├── README.md        # This file
├── training.js      # Training progress, session tracking
├── curriculum.js    # Session content display
└── data/
    └── phases.json  # All 4 phases curriculum
```

## Training Phases
| Phase | Name | Sessions | Exit Requirement |
|-------|------|----------|------------------|
| 1 | RECRUIT | 8 | Start discipling 1+ person |
| 2 | FIELD MISSIONARY | 8 | 2nd generation disciple exists |
| 3 | MISSION COACH | 8 | Group conducting outreach |
| 4 | MISSION LEADER | 8 | Launch new Mission Group |

## Data Structure (phases.json)
```json
{
  "phases": [
    {
      "id": 1,
      "name": "RECRUIT",
      "subtitle": "Know Your Commander & Your Mission",
      "sessions": [
        {
          "id": 1,
          "title": "The Mission",
          "description": "Understanding the Great Commission",
          "duration": "45 min",
          "materials": ["handout.pdf"]
        }
      ],
      "exitRequirement": "Start discipling 1+ person"
    }
  ]
}
```

## Firestore
Collection: `goMission_members`
```json
{
  "trainingPhase": 1,
  "trainingSession": 3,
  "trainingCompletedAt": null
}
```

Collection: `goMission_training` (batches)
```json
{
  "batchId": "2024-Q1",
  "phase": 1,
  "facilitator": "userId",
  "members": ["userId1", "userId2"],
  "startDate": timestamp
}
```

## Current Implementation
- ✅ Training card UI
- ✅ Phase 1 session list (static)
- 📋 Need: Session content
- 📋 Need: Progress tracking
- 📋 Need: Batch management

## Dependencies
- modules/core/auth.js
- shared/firebase-config.js
