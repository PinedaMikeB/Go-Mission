# Gospel Presentation Module

## Overview
Interactive gospel presentation based on "Ang Daan Papuntang Langit" (The Way to Heaven).

## Features
- Animated slide transitions
- 4 Truths Structure:
  1. God Loves You (John 3:16, John 10:10)
  2. Sin Separates (Romans 3:23, 6:23, Rev 21:8)
  3. Jesus is the Way (John 14:6, 1 Peter 3:18)
  4. Believe to be Saved (Ephesians 2:8-9)
- Interactive formula question
- Prayer of salvation
- Assurance verses
- Next steps guidance
- Audio narration support (pending audio file)

## Files
- `gospel-presentation.js` - Main module
- `/assets/images/gospel/` - Gospel tract images (5 images)

## Usage
```javascript
// Open the presentation
GospelPresentation.open();

// Close
GospelPresentation.close();
```

## Data Saved to Firebase
When user prays the prayer, saves:
- `gospelDecision.prayed` - boolean
- `gospelDecision.prayedAt` - timestamp
- `gospelDecision.completedAt` - timestamp

## Audio Setup (Pending)
Mike will provide one long audio file. The module will split it based on `audio.start` and `audio.end` timestamps in each slide.

## Next Steps
After completing the gospel presentation:
1. Opens "Conversation with God" guide (ConversationGuide module - to be built)
2. Guides user to daily Bible reading
3. Connects to journal and prayer request features

## Integration Points
- Home screen "Know How Much God Loves You" button
- Main menu access (for replay/sharing)
- Journey card can trigger this for new seekers
