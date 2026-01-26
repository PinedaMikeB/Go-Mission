# Go Mission - AI Handoff Document

> ⚡ READ THIS FIRST - Everything you need to continue development

## Quick Context
- **App**: Disciple-making journey for Filipino seekers worldwide
- **Live**: https://gomission.netlify.app
- **Repo**: /Volumes/Wotg Drive Mike/GitHub/Go-Mission
- **Firebase**: wotg-app (Firestore + Auth + Cloud Functions)
- **Stack**: HTML/JS + Tailwind CDN + Firebase

---

## Current Session (2026-01-26)
- **MODULE**: Audio/Video Experience + Quick Insights NT Generation
- **STATUS**: 🔄 In Progress
- **TASK**: Add audio narration system, animated install guides

### 🎧 NEW DIRECTION: Audio Experience

**Vision:** "Kindle-Style Audio" for discipleship - users can LISTEN to training sessions while commuting/driving.

**Why This Matters:**
- Filipino users often have long commutes
- Can't read while driving/commuting
- Training sessions become "hands-free"
- Perfect for busy believers

### ✅ Install Guide Audio Scripts (COMPLETED)

**File:** `/docs/install-guide-script.md`

Created complete audio recording scripts:
- English Android (~58 seconds)
- English iPhone (~70 seconds)
- Tagalog Android (~58 seconds)
- Tagalog iPhone (~70 seconds)

Each script has:
- Step-by-step narration
- Tone/emotion guidance for recording
- Animation timing cues

### ✅ Animated Install Guide Prototype (COMPLETED)

**File:** `/modules/install/install-guide-animated.html`

Features:
- Phone mockup showing app screens
- Animations synced to audio timestamps
- Step 1: Menu dots highlight with pulse
- Step 2: Dropdown menu, "Add to Home Screen" highlight
- Step 3: Install popup with button highlight
- Step 4: Home screen, app icon appears with bounce
- Step 5: Notification permission dialog
- Success screen with confetti

**Timeline Configuration:**
```javascript
const timeline = [
  { time: 0, action: 'intro' },
  { time: 5, action: 'step1-start' },
  { time: 6, action: 'highlight-menu' },
  { time: 13, action: 'step2-start' },
  // ... adjustable to match audio
];
```

### 🔄 NT Quick Insights Generation (RUNNING)

**Status:** Running in background
**Script:** `/scripts/run-nt-generation.sh`
**Log:** `/scripts/logs/nt-full-generation.log`

**Books to Generate (25):**
```
MAT MRK LUK JHN ACT ROM 1CO 2CO GAL EPH PHP COL 
1TI 2TI TIT PHM HEB JAS 1PE 2PE 1JN 2JN 3JN JUD REV
```

**Missing (No Tyndale Source):**
- 1TH (1 Thessalonians)
- 2TH (2 Thessalonians)

**Monitor:**
```bash
tail -f "/Volumes/Wotg Drive Mike/GitHub/Go-Mission/scripts/logs/nt-full-generation.log"
```

### ✅ OT Quick Insights (COMPLETED)

**Status:** 37/39 books complete

**Missing (No Tyndale Source):**
- JON (Jonah)
- HAG (Haggai)

---

## 🎯 Audio Feature Roadmap

### Phase 1: Install Guide ← CURRENT
- [x] Write audio scripts (EN/TL)
- [x] Create animated HTML prototype
- [ ] Record audio files
- [ ] Integrate into app install flow

### Phase 2: Training Sessions
- [ ] Add audio player to training module
- [ ] Record/generate audio for each session
- [ ] Background playback support
- [ ] Lock screen controls

### Phase 3: Bible Reading
- [ ] Quick Insights audio (TTS or recorded)
- [ ] "Listen" button on each verse
- [ ] Auto-play through chapter

### Phase 4: App-Wide
- [ ] Onboarding audio
- [ ] Achievement sounds
- [ ] Notification audio

---

## Previous Session (2026-01-24)

### ✅ Join Request & Approval System
- Users request to join (not auto-added)
- Leader approves as Member or Guest
- Real-time badges show pending requests
- Push notifications to leader

### ✅ Guest System
- Guests can chat and join meetings
- Separate "Guest Groups" section
- "Leave as Guest" option

### ✅ Member Management
- View Members shows pending requests
- Leader can remove members
- Membership verification on chat/meeting

---

## Key Files Reference

### Audio/Video System (NEW)
| File | Purpose |
|------|---------|
| `/docs/install-guide-script.md` | Audio recording scripts (EN/TL) |
| `/modules/install/install-guide-animated.html` | Animated guide prototype |

### Quick Insights Generation
| File | Purpose |
|------|---------|
| `/scripts/generate-quick-insights-openai.js` | Main generation script |
| `/scripts/run-nt-generation.sh` | NT batch runner |
| `/modules/bible/data/quick-insights/*.json` | Generated insights |

### Groups System
| File | Purpose |
|------|---------|
| `/modules/groups/my-groups.js` | Upline/Downline/Guest groups |
| `/modules/groups/group-chat.js` | Real-time chat |
| `/modules/groups/group-meeting.js` | Jitsi video meetings |

---

## Quick Commands

### Check NT Generation Progress
```bash
tail -f "/Volumes/Wotg Drive Mike/GitHub/Go-Mission/scripts/logs/nt-full-generation.log"
```

### Count Completed Insights
```bash
ls "/Volumes/Wotg Drive Mike/GitHub/Go-Mission/modules/bible/data/quick-insights/" | wc -l
```

### Test Animated Install Guide
1. Open `/modules/install/install-guide-animated.html` in browser
2. Select audio file (download.wav)
3. Click "Play Guide"

---

## Git Commits This Session
```
2b4452d Add: Install guide audio script for English and Tagalog
ebfd189 Update HANDOFF and CHANGELOG for join requests, guests, member management
```

---

## Next Steps
1. Record audio files for install guide
2. Monitor NT generation completion
3. Integrate animated guide into app
4. Plan training session audio implementation
