# Go Mission - Master Plan

> 🎯 Strategic roadmap for the disciple-making journey app

---

## Operating Rule

- Push every completed change to `main` automatically unless Mike explicitly says not to push.
- Keep commits scoped and do not stage unrelated local artifacts or user files.

## Current Implementation Notes

- 2026-05-02: Embedded Jitsi meeting on phone viewports should behave mobile-first in portrait and landscape. The current app-side approach detects phones by viewport short/long side, forces Jitsi non-responsive tile layout with max columns `2`, targets up to four visible rows (`8` tiles), recomputes after join/leave events, and requests square-ish mobile camera capture.
- 2026-05-02: Meeting slides now support default-on leader sync. Mission Group leaders can hide/unhide slides for all participants and drive the current slide; participants can uncheck follow mode to navigate locally.
- 2026-05-02: Meeting slides now have Small/Medium/Full icon controls in the meeting header. Portrait phones adjust bottom-sheet height; landscape phones adjust side-panel width. Preserve the working two-column Jitsi phone layout when changing slide UI.
- 2026-05-02: Portrait phone `Small` slide mode should remain a compact bottom sheet around `28vh`, with compact chrome and internal body scrolling so participant faces remain visible.
- 2026-05-02: Portrait phone `Small` slide mode should anchor above the Jitsi toolbar/home-indicator area, scroll to the top when opened/resized, and use arrow-only Prev/Next controls.
- 2026-05-05: Meeting slide overlays should not use a separate top header. Put slide count in the bottom nav after Prev, keep arrows visible, and keep the slide body as the scrollable area across phone, landscape, and desktop views.
- 2026-05-05: Preserve the working Jitsi portrait/landscape participant grid. Slide overlays must use a definite-height flex panel with fixed bottom controls so only the slide body scrolls.
- 2026-05-05: Slide overlays must route wheel and touch gestures to the slide body, because the embedded Jitsi iframe/pre-join layer can otherwise consume scroll input.
- 2026-05-05: Slide overlays should treat wheel/touch gestures as deck navigation when the current slide cannot scroll further, especially on title slides with no overflow.

---

## Vision
**Making Disciple-Making Leaders** - A mobile-first PWA guiding Filipino believers worldwide through a complete discipleship journey: from seeker to multiplier.

---

## 🚀 THE DISCIPLESHIP JOURNEY

### Core Concept: Journey-Centric Dashboard
The app revolves around ONE main card: **"Aking Paglalakbay"** (My Journey). Users always see where they are and what's next. Every feature connects back to helping them take their next step.

### The 5 Stages

```
┌─────────────────┐    ┌─────────────┐    ┌────────────────┐    ┌──────────────┐    ┌────────────────┐
│ NASA PAGLALAKBAY│───▶│   ALAGAD    │───▶│ TAGAPAG-HUBOG  │───▶│ TAGAPAG-TAYO │───▶│ TAGAPAG-PARAMI │
│    (Seeker)     │    │  (Disciple) │    │(Disciple-Maker)│    │   (Builder)  │    │  (Multiplier)  │
└─────────────────┘    └─────────────┘    └────────────────┘    └──────────────┘    └────────────────┘
```

---

## 📍 STAGE 1: NASA PAGLALAKBAY (Seeker)

### Goal
Know God's love, Accept Christ, Join community

### User Experience
1. User clicks **"HUMAKBANG NGAYON"** (Take a step today)
2. Modal shows options:
   - ❤️ **Tuklasin Ngayon...** → Gospel Presentation
   - 📖 **Makipag-usap sa Diyos Araw-araw** → Conversation with God Guide
   - 👥 **Sumali sa Mission Group** → Join Group flow

### Gospel Presentation ⭐ COMPLETED v2.0.0
**Location:** `/modules/gospel/gospel-presentation.js` (889 lines)
**Content:** `/modules/gospel/gospel-content.js` (666 lines)
**Audio:** `/modules/gospel/gospel-audio.js` (480 lines)

**Features:**
- 40 animated slides with smooth transitions
- Full bilingual support (English & Tagalog)
- Complete audio narration for all slides
- Question-based discovery learning (8 questions)
- Two-path decision flow
- Firebase tracking for decisions

**"Ang Daan Papuntang Langit" / "The Way to Heaven":**

| Section | Content |
|---------|---------|
| Truth 1 | God Loves You (John 3:16) + 2 questions |
| Truth 2 | All Have Sinned (Romans 3:23, 6:23, Rev 21:8) + 3 questions |
| Truth 3 | Jesus is the Only Way (Prov 14:12, John 14:6, 1 Peter 3:18) + 2 questions |
| Truth 4 | Believe to be Saved (Eph 2:8-9) + formula question |
| Decision | Prayer of Acceptance |
| Celebration | 3 Promises (John 1:12, 1 John 5:11-13, 2 Cor 5:17) |
| Final | Next steps instruction |

**Decision Tracking:**
```javascript
// Firestore: users/{uid}/gospelDecision
{
  accepted: true/false,
  acceptedAt: timestamp,
  status: 'saved' | 'not-ready' | 'needs-followup',
  prayerResponse: 'yes' | 'no',
  needsFollowUp: boolean
}

// Firestore: stats/gospel
{ savedCount: number, lastSavedAt: timestamp }
```

### Transition to ALAGAD
**Requirements:**
- ✅ Accepted Christ (Gospel completed)
- ✅ Joined a Mission Group

---

## 📍 STAGE 2: ALAGAD (Disciple)

### Goal
Grow in relationship with God, Learn foundations

### User Experience
1. Continue daily Quiet Time (Bible reading)
2. Attend Mission Group weekly
3. Enroll in **Wednesday Equipping** (Level 1 Training)

### Wednesday Equipping - Level 1 (18 Sessions)

**Format: 6-Day Weekly Cycle**

| Day | Activity |
|-----|----------|
| Mon | 📖 Day 1 reading + questions |
| Tue | 📖 Day 2 reading + questions |
| Wed | 👥 **Group Processing** |
| Thu | 📖 Day 3 reading + questions |
| Fri | 📖 Day 4 reading + questions |
| Sat | 📖 Day 5-6 reading + reflection |
| Sun | 🙏 Rest / Church |

**Session Topics (18 weeks):**
1. God's Way to Heaven (Assurance)
2. Your New Identity in Christ
3. The Holy Spirit
4. Prayer
5. The Bible
6. Obedience
7. Fellowship
8. Witnessing
9. Spiritual Warfare
10. Stewardship
11. Worship
12. Serving Others
13. Forgiveness
14. Faith
15. The Great Commission
16. Making Disciples
17. Leading Others
18. Multiplication Mindset

### Transition to TAGAPAG-HUBOG
- ✅ Completed Level 1 Training (18 sessions)

---

## 📍 STAGE 3: TAGAPAG-HUBOG (Disciple-Maker)

### Goal
Lead others, Start multiplying

### User Experience
1. Lead a Mission Group
2. Enroll in Level 2 Training
3. Guide new disciples

---

## 📍 STAGE 4: TAGAPAG-TAYO (Builder)

### Goal
Build leaders, Develop others to lead

---

## 📍 STAGE 5: TAGAPAG-PARAMI (Multiplier)

### Goal
Movement multiplication, Multiple generations

---

## 📖 BIBLE READING SYSTEM

### Quick Insights (4 Sections per Verse)
1. **Understanding This Verse** - Context & meaning
2. **Living It Out** - Practical application
3. **See God's Love** - God's character revealed
4. **Reflection Question** - Personal prompt

**Status:**
- OT Insights: In progress
- NT Insights: Check `/data/quick-insights/` for completion

### Journal Features
- Daily reflections saved
- Prayer requests with tracking
- Share with group (optional)

---

## 🔄 AUTO-UPDATE SYSTEM

**For Elderly Users - No prompts required!**

**Files:**
- `/modules/core/auto-update.js` (227 lines)
- `/netlify.toml` - Build configuration
- `/scripts/bump-version.sh` - Auto-version bumping

**How It Works:**
1. Push to GitHub
2. Netlify runs bump script automatically
3. Timestamps update (BUILD_TIMESTAMP, CACHE_VERSION)
4. Users get silent updates on app open

**No manual version changes needed!**

---

## 🛠️ TECHNICAL ARCHITECTURE

### Key Modules
```
/modules/
  /gospel/
    gospel-presentation.js     # Interactive slides (889 lines)
    gospel-content.js          # Bilingual content (666 lines)
    gospel-audio.js            # Audio controller (480 lines)
  /journey/
    next-steps-modal.js        # Stage options (499 lines)
  /core/
    auto-update.js             # Silent updates (227 lines)
    theme.js                   # Light/dark mode (206 lines)
    i18n.js                    # Language switching (464 lines)
  /bible/
    bible-reader.js            # Bible reading
    /data/quick-insights/      # JSON files per book
```

### Firebase Collections
```
users/{uid}/
  stage: "seeker" | "disciple" | "disciple-maker" | "builder" | "multiplier"
  gospelDecision: { accepted, acceptedAt, status, needsFollowUp }
  trainingProgress: { level1: 0-18 }
  
groups/{groupId}/
  members/, requests/

stats/gospel/
  savedCount, lastSavedAt
```

---

## 📅 ROADMAP

### Phase 1: Foundation ✅ COMPLETED
- [x] Journey card as main dashboard
- [x] Next Steps Modal with stage-based options
- [x] Gospel Presentation (40 slides, interactive)
- [x] Bilingual support (English & Tagalog)
- [x] Audio narration (all 40 slides)
- [x] Auto-update system for elderly users
- [x] Decision tracking in Firebase

### Phase 2: Training System (NEXT)
- [ ] Level 1 content structure (18 sessions)
- [ ] Daily reading interface
- [ ] Wednesday processing tracker
- [ ] Session completion tracking
- [ ] Audio for training sessions

### Phase 3: Bible Features
- [ ] Complete NT Quick Insights
- [ ] Complete OT Quick Insights
- [ ] Conversation with God guide

### Phase 4: Progression & Badges
- [ ] Stage transition logic
- [ ] Badge system
- [ ] Certificates
- [ ] Leader dashboard

---

## 📝 DEFAULTS (v2.0.0)

| Setting | Default | Notes |
|---------|---------|-------|
| Theme | Light | Forced for all users |
| Language | Tagalog | Forced for all users |
| Other Cards | Collapsed | Focus on Gospel first |

---

*Last Updated: January 27, 2026*
