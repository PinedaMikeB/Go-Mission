# Go Mission - Master Plan

> 🎯 Strategic roadmap for the disciple-making journey app

---

## Vision
**Making Disciple-Makers** - A mobile-first PWA helping Filipino believers worldwide grow in faith through Bible reading, training, and community.

---

## Core Pillars

### 1. 📖 Journey (Bible Reading)
- Daily Bible reading with Quick Insights
- Bilingual support (English/Tagalog)
- Reflection journaling
- Progress tracking

### 2. 🎓 Training (Discipleship)
- Structured training sessions
- Step-by-step lessons
- Completion tracking
- Certificate system

### 3. 👥 Groups (Community)
- Upline/Downline structure
- Video meetings via Jitsi
- Group chat
- Join requests with approval

### 4. 📊 Dashboard (Progress)
- Personal stats
- Reading streaks
- Training progress
- Group activity

---

## 🎧 NEW DIRECTION: Audio & Video Experience

### Concept: "Kindle-Style Audio" for Discipleship

**Problem:**
- Users commuting, driving, or busy can't read
- Training sessions require focused reading time
- Install guide requires visual attention

**Solution:**
- Add audio narration to ALL content
- Users can LISTEN while driving/commuting
- Complete training sessions "hands-free"
- Animated visual guides synced with audio

### Audio Features Roadmap

#### Phase 1: Install Guide Audio ✅ IN PROGRESS
- [x] English Android install guide script
- [x] Tagalog Android install guide script
- [x] English iPhone install guide script
- [x] Tagalog iPhone install guide script
- [x] Animated HTML guide with audio sync
- [ ] Integrate into PWA install flow
- [ ] Record professional audio files

#### Phase 2: Training Session Audio
- [ ] Text-to-speech for training content
- [ ] Pre-recorded audio for each session
- [ ] Play/pause controls
- [ ] Progress tracking while listening
- [ ] Background audio playback
- [ ] Lock screen controls

#### Phase 3: Bible Reading Audio
- [ ] Quick Insights audio narration
- [ ] Verse audio (optional)
- [ ] Reflection prompts audio
- [ ] Daily devotion audio mode

#### Phase 4: App-Wide Audio
- [ ] Welcome/onboarding audio
- [ ] Navigation audio cues
- [ ] Achievement celebrations
- [ ] Group notifications audio

### Audio Implementation Strategy

**Option A: Pre-recorded (Recommended for quality)**
- Record each training session
- Store in Firebase Storage or CDN
- Stream on demand
- Higher quality, personal touch

**Option B: Text-to-Speech (Faster to implement)**
- Use Web Speech API or Google TTS
- Generate on-the-fly
- Lower storage costs
- Less personal feel

**Option C: Hybrid Approach**
- Pre-recorded for training sessions
- TTS for dynamic content (Quick Insights)
- Best of both worlds

### Audio File Naming Convention
```
/audio/
  /install-guide/
    install-guide-en-android.mp3
    install-guide-en-iphone.mp3
    install-guide-tl-android.mp3
    install-guide-tl-iphone.mp3
  /training/
    session-01-en.mp3
    session-01-tl.mp3
    session-02-en.mp3
    ...
  /insights/
    GEN-1-1-en.mp3  (or TTS)
    GEN-1-1-tl.mp3
    ...
```

### Animated Guide System

**Purpose:** Visual tutorials synced with audio narration

**Components:**
1. Phone mockup showing app screens
2. Highlight animations on UI elements
3. Step indicator showing current step
4. Progress bar synced with audio
5. Play/pause controls

**Files Created:**
- `/docs/install-guide-script.md` - Audio recording scripts
- `/modules/install/install-guide-animated.html` - Animated guide prototype

---

## Quick Insights Generation

### Status: OT Complete, NT In Progress

**OT Books:** 37/39 complete
- Missing: JON (Jonah), HAG (Haggai) - No Tyndale source

**NT Books:** Generation running (25 books)
- Script: `/scripts/run-nt-generation.sh`
- Log: `/scripts/logs/nt-full-generation.log`
- Model: GPT-4o-mini
- Format: 4-section detailed paragraphs

**Missing Tyndale Sources (4 books):**
- JON (Jonah)
- HAG (Haggai)
- 1TH (1 Thessalonians)
- 2TH (2 Thessalonians)

---

## Feature Backlog

### High Priority
- [ ] Audio for training sessions
- [ ] Install guide with audio
- [ ] Complete NT Quick Insights
- [ ] Find Tyndale sources for missing books

### Medium Priority
- [ ] Reading streaks
- [ ] Achievement badges
- [ ] Share progress feature
- [ ] Offline mode improvements

### Low Priority
- [ ] Dark mode refinements
- [ ] Language auto-detection
- [ ] Social sharing cards
- [ ] App store listing (future)

---

## Technical Debt

- [ ] Consolidate group modules (groups.js vs my-groups.js)
- [ ] Add error boundaries
- [ ] Improve offline caching
- [ ] Add analytics tracking
- [ ] Performance optimization

---

## Metrics to Track

1. **User Engagement**
   - Daily active users
   - Session duration
   - Training completion rate

2. **Content Consumption**
   - Chapters read per user
   - Insights viewed
   - Audio listen time

3. **Community Health**
   - Groups created
   - Meeting attendance
   - Chat activity

---

## Timeline

### January 2026
- ✅ Groups restructure (Upline/Downline)
- ✅ Join request system
- ✅ Guest system
- ✅ Quick Insights OT generation
- 🔄 Quick Insights NT generation
- 🔄 Audio install guide prototype

### February 2026
- [ ] Complete NT Quick Insights
- [ ] Audio training sessions
- [ ] Install guide with audio in app
- [ ] Reading streaks

### March 2026
- [ ] Bible reading audio
- [ ] Achievement system
- [ ] Performance optimization
- [ ] Beta testing with 70 Mission Groups

---

## Notes

- Audio is the KEY differentiator for busy commuters
- Filipino users often have long commutes - perfect for audio
- Training sessions should be completable in ~15-20 minutes (commute time)
- Consider podcast-style delivery for training
