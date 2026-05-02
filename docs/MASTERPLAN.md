# GO MISSION MASTERPLAN

**Project:** Disciple-Making Journey App for Word On The Go Online Fellowship  
**Owner:** Mike Pineda  
**Last Updated:** January 19, 2026  
**Current Version:** v0.5.0

---

## OPERATING RULE

- Push every completed change to `main` automatically unless Mike explicitly says not to push.
- Keep commits scoped and do not stage unrelated local artifacts or user files.

## CURRENT IMPLEMENTATION NOTES

- 2026-05-02: Embedded Jitsi meeting on phone viewports should keep participant tiles in a two-column tile grid. The current app-side approach sets phone tile max columns to `2`, disables responsive tile collapse on phones, and caps the mobile Jitsi layout width at `360px` so the second column is not clipped.
- 2026-05-02: Meeting slides now support default-on leader sync. Mission Group leaders can hide/unhide slides for all participants and drive the current slide; participants can uncheck follow mode to navigate locally.

---

## 🎯 VISION

**Goal:** To make disciple-making leaders

Go Mission is a disciple-making journey app that tracks every person from seeker to multiplying leader. We use "mission" language so they know from Day 1 this is not a club - they are being trained to make disciples who make disciples.

**Tagline:** "Making Disciple-Making Leaders"

---

## 🏛️ MINISTRY CONTEXT

| Item | Details |
|------|---------|
| Ministry Name | Word On The Go Online Fellowship |
| YouTube Channel | Word On The Go |
| Target Audience | Filipino seekers worldwide (Philippines, OFWs, immigrants) |
| Reach | 120 million+ potential (Filipinos worldwide) |
| Language | Tagalog/Taglish |
| Platform | Online (Messenger, Zoom, Facebook, YouTube) |
| Current Scale | 70 Mission Groups |
| Welcome Team | 2 people |

### The OFW Advantage
- Shared experience (loneliness, sacrifice, far from family)
- Same language (Tagalog heart-to-heart)
- Same platform (Messenger, Zoom)
- Flexible timezone (Dubai can disciple Qatar)
- Same felt needs (gospel meets them where they are)

### Broadcast → Response → Disciple Strategy
1. YouTube/Facebook bridging content (seeds)
2. Seekers type "JOIN" in comments (warm leads, not cold outreach)
3. Welcome Team matches to Mission Groups
4. Filipino missionaries disciple Filipino seekers

---

## 📖 THE JOURNEY FRAMEWORK

### Core Philosophy

```
"Join our Mission Group. God has a purpose for you. You have a mission - 
to know God and make Him known. This is where you find fulfillment. 
You are created for good works. We will train you to grow, share, and 
make disciples."
```

### The Journey Stages

```
SEEKER → DISCIPLE → DISCIPLE-MAKER → LEADER → MULTIPLIER
   │         │            │             │          │
   └─────────┴────────────┴─────────────┴──────────┘
                          │
                          ▼
              DISCIPLE-MAKING LEADER
                  (The One Goal)
```

### Two Tracks Working Together

| Track | Purpose | Frequency |
|-------|---------|-----------|
| **Mission Group** | Ongoing discipleship, accountability, community | Weekly (forever) |
| **Mission Training** | Progressive equipping with action requirements | 8 sessions per phase |

### Key Principle
**No advancement without multiplication.** You can't progress to next phase until action requirement is met.

---

## 🎓 MISSION TRAINING PHASES

### Phase 1: RECRUIT
*"Know Your Commander & Your Mission"*  
**Schedule:** Tuesdays 8PM Manila

| Session | Module |
|---------|--------|
| 1 | Know Your Commander: God |
| 2 | Know Your Captain: Jesus |
| 3 | Know Your Mission Orders: The Gospel |
| 4 | Know Your Security: Salvation |
| 5 | Know Your Power: The Holy Spirit |
| 6 | Know Your Manual: The Word of God |
| 7 | Know Your Lifeline: Prayer |
| 8 | Know Your First Assignment: Lead a Disciple |

**Entry:** None (open to all)  
**Exit:** Must start discipling at least 1 person

---

### Phase 2: FIELD MISSIONARY
*"Deployed to Make God Known"*  
**Schedule:** Wednesdays 8PM Manila

| Session | Module |
|---------|--------|
| 1 | Your Field Report: Testimony |
| 2 | Your Mission Message: The Gospel |
| 3 | Handling Resistance in the Field |
| 4 | The Moment of Rescue: Leading to Christ |
| 5 | New Recruit Orientation |
| 6 | Coaching Your Recruit |
| 7 | When Recruits Struggle |
| 8 | Releasing Your Recruit to the Field |

**Entry:** Phase 1 complete + actively discipling 1+ person  
**Exit:** Your disciple is now discipling someone (2nd generation)

---

### Phase 3: MISSION COACH
*"Multiply Missionaries"*

| Session | Module |
|---------|--------|
| 1 | The Vision: Generational Multiplication |
| 2 | Coaching vs. Doing the Mission Yourself |
| 3 | Troubleshooting Mission Groups |
| 4 | Spotting Future Mission Leaders |
| 5 | Building a Bold Mission Culture |
| 6 | Planning Group Mission Outreach |
| 7 | Mobilizing Your Team for the Field |
| 8 | Leading Your First Group Mission |

**Entry:** Phase 2 complete + 2nd generation exists  
**Exit:** Mission Group is conducting outreach together

---

### Phase 4: MISSION LEADER
*"Lead the Mission"*

| Session | Module |
|---------|--------|
| 1 | The Heart of a Mission Leader |
| 2 | Casting the Mission Vision |
| 3 | Building Healthy Mission Culture |
| 4 | Raising Up New Mission Leaders |
| 5 | When to Multiply Your Group |
| 6 | Launching a New Mission Group |
| 7 | Staying Connected Across Groups |
| 8 | Your Legacy: Generations of Missionaries |

**Entry:** Phase 3 complete + group doing outreach  
**Exit:** Launch a new Mission Group

---

## 🗂️ APP MODULES

### Module 1: My Journey ✅ (UI Complete)
*Where am I in the mission?*
- [x] Current stage display (Seeker → Multiplier)
- [x] Progress path visualization
- [x] Next steps button
- [ ] Dynamic data from Firestore

### Module 2: My Mission Group ✅ (UI Complete)
*My team on mission*
- [x] Weekly meeting display
- [x] Accountability checklist (Bible Study, Share & Pray, Accountability)
- [x] Personal habits checklist (Prayer, Word, Faith sharing)
- [x] Chat with Group button
- [ ] Dynamic group assignment
- [ ] Real member list
- [ ] Actual chat functionality

### Module 3: Weekly Debrief ❌ (Form Not Built)
*How was my week?*
- [ ] Quiet time check (days 0-7)
- [ ] Mission Group huddle attendance
- [ ] Bold steps (gospel shared/recruited)
- [ ] Wins or struggles
- [ ] Submit to Firestore

### Module 4: My Generations ❌ (Not Built)
*Who am I discipling? Who are they discipling?*
- [ ] Visual family tree
- [ ] Status of each person
- [ ] Generations depth counter
- [ ] Multiplication celebration

### Module 5: Mission Training ✅ (UI Complete)
*Phase 1-4 content & tracking*
- [x] Phase 1 curriculum display
- [x] Checkbox progress indicators
- [x] Phase requirement display
- [ ] Session detail pages
- [ ] Track actual attendance
- [ ] Deployment requirements verification
- [ ] Phase 2-4 content

### Module 6: Discussion Guides ❌ (Not Built)
*Weekly materials for huddles*
- [ ] Series management
- [ ] Facilitator's Guide (leader view)
- [ ] Participant's Guide (member view)
- [ ] Share via Messenger

### Module 7: Pipeline Dashboard ❌ (Not Built)
*Welcome Team - New seekers management*
- [ ] New leads from YouTube/Facebook
- [ ] Contact details collection
- [ ] Availability matching
- [ ] Group placement
- [ ] Follow-up tracking

### Module 8: Shepherd Dashboard ❌ (Not Built)
*Pastoral care*
- [ ] Multiple groups oversight
- [ ] Connection status (green/yellow/red)
- [ ] Care list (who needs a call)
- [ ] Contact logging

### Module 9: Admin/Leader Dashboard ✅ (UI Complete)
*Mission health*
- [x] Stats display (Groups, Disciples, Recruits, Leaders)
- [x] Admin mode toggle
- [ ] Full pipeline visualization
- [ ] Phase progression stats
- [ ] Stuck/awaiting deployment alerts
- [ ] Group health overview
- [ ] Multiplication metrics

---

## 🏗️ TECH STACK

| Layer | Technology |
|-------|------------|
| Frontend | HTML/JS with Tailwind CSS (CDN) |
| Backend | Netlify Functions (planned) |
| Database | Firebase Firestore |
| Auth | Firebase Authentication (Google Sign-In) |
| Hosting | Netlify (auto-deploy from GitHub) |
| Repo | GitHub |
| Design | Cinzel + Inter fonts, custom CSS |

### Firebase Project
- **Project:** shaped-by-grace
- **Console:** https://console.firebase.google.com/project/shaped-by-grace

### Collections (with `goMission_` prefix)
1. `goMission_members` - All users
2. `goMission_groups` - Mission Groups
3. `goMission_training` - Training batches
4. `goMission_debriefs` - Weekly debriefs
5. `goMission_materials` - Discussion guides
6. `goMission_contacts` - Contact logs
7. `goMission_settings` - App config

---

## 📁 KEY FILE LOCATIONS

| Item | Path/URL |
|------|----------|
| Local Repo | `/Volumes/Wotg Drive Mike/GitHub/Go-Mission` |
| GitHub Repo | https://github.com/PinedaMikeB/Go-Mission |
| Dev Standards | https://github.com/PinedaMikeB/dev-standards |
| Firebase Console | https://console.firebase.google.com/project/shaped-by-grace |
| Live Site | https://gomission.netlify.app |
| Netlify Dashboard | https://app.netlify.com/projects/gomission |
| Design System | `/Users/mike/Downloads/go-mission (1)` |

---

## ✅ TASK CHECKLIST

### Legend
- `[x]` Complete
- `[~]` In Progress  
- `[ ]` Not Started
- `[!]` Blocked

### Phase 1: Foundation & Planning ✅ COMPLETE
- [x] Define ministry vision and goal
- [x] Design the journey framework
- [x] Create Mission Training curriculum outline (Phase 1-4)
- [x] Define app modules and features (9 modules)
- [x] Establish naming conventions (Mission vocabulary)
- [x] Set up project documentation (MASTERPLAN, HANDOFF, CHANGELOG)
- [x] Create GitHub repository
- [x] Set up Firebase project (using shaped-by-grace)
- [x] Design database schema (7 collections)
- [x] Set up Netlify deployment

### Phase 2: Core App & Design ✅ COMPLETE
- [x] Authentication (Firebase Google Sign-In)
- [x] Auto user profile creation
- [x] Dashboard layout
- [x] Navigation structure
- [x] Premium design system applied
- [x] Mobile responsive
- [x] Deploy security rules

### Phase 3: Member Features 🔄 IN PROGRESS
- [x] My Journey screen (UI)
- [x] My Mission Group screen (UI)
- [x] Mission Training card (UI)
- [x] Spirit-Led Bible Reading System ✅
- [x] Bible Picker (search, browse, recent)
- [x] Bible Reader (full chapter, highlighting, navigation)
- [x] Quick Insights Commentary System ✅
- [ ] Weekly Debrief form (functional)
- [ ] My Generations tree
- [ ] Discussion Guides viewer
- [ ] Dynamic data loading

### Phase 3.5: Bible & Commentary System 🔄 IN PROGRESS
- [x] Download Bible data (EN BSB + TL ADB 1905)
- [x] Download Tyndale Open Study Notes (16,732 notes)
- [x] Convert Tyndale XML to JSON
- [x] Build hybrid AI enhancement system (Tyndale + Gemini 2.5 Pro)
- [x] Design 4-section Quick Insights format
- [x] Test bilingual output (EN + TL)
- [x] Cleanup unused commentary (Matthew Henry, John Gill)
- [~] Generate Quick Insights for John (30% complete)
- [ ] Generate Quick Insights for all 66 books
- [ ] Update bible-reader.js to show Quick Insights
- [ ] Add "Dig Deeper" button for full Tyndale note

### Phase 4: Leader Features
- [ ] Mission Group management
- [ ] Member list with debrief status
- [ ] Field reports view
- [ ] Group health indicators

### Phase 5: Training System
- [ ] Session detail pages
- [ ] Session attendance tracking
- [ ] Deployment requirements verification
- [ ] Phase advancement logic
- [ ] Phase 2-4 content

### Phase 6: Admin Features
- [ ] Pipeline dashboard (Welcome Team)
- [ ] Shepherd care dashboard
- [ ] Analytics and reporting
- [ ] Group management

### Phase 7: Polish & Launch
- [ ] PWA setup
- [ ] Testing with real users
- [ ] Documentation for volunteers
- [ ] Launch to ministry

---

## 📝 DECISION LOG

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-01-16 | App name: Go Mission | Connects to "Word On The Go" + Great Commission |
| 2026-01-16 | Group name: Mission Group | Sets expectation - not a club |
| 2026-01-16 | Training: Phase 1-4 | Clear progression with action requirements |
| 2026-01-16 | Goal: Disciple-making leaders | Not just disciples, but multiplying leaders |
| 2026-01-16 | Keep traditional spiritual terms | Quiet time, prayer, devotion - sacred and familiar |
| 2026-01-16 | Mission vocabulary for structure | Groups, training, roles use mission language |
| 2026-01-18 | Design: Dark maroon + gold | Matches Word On The Go branding |
| 2026-01-18 | Fonts: Cinzel + Inter | Premium, readable, mission feel |
| 2026-01-18 | Tagalog UI elements | Target audience is Filipino worldwide |
| 2026-01-19 | Spirit-led Bible reading | No fixed verse ranges - Holy Spirit guides |
| 2026-01-19 | Use Tyndale Open Study Notes | Modern, accessible, CC licensed (vs Matthew Henry - too old) |
| 2026-01-19 | Hybrid commentary (Tyndale + AI) | Tyndale for depth, AI for simplification |
| 2026-01-19 | 4-section Quick Insights | Understanding, Living It Out, See God's Love, Reflection |
| 2026-01-19 | Option C: On-Demand Tyndale | Simple view default, "Dig Deeper" shows full Tyndale |
| 2026-01-19 | Focus on ACTION | Doers of the Word, not just hearers (James 1:22) |
| 2026-01-19 | Use Gemini 2.5 Pro | Better quality than GPT-4o-mini, cost-effective |
| 2026-01-19 | Don't store Tyndale in quick-insights | Use tyndale-json files directly for "Dig Deeper" |
| 2026-01-19 | Remove Matthew Henry & John Gill | Only Tyndale needed, cleaner data structure |

---

## 📚 MISSION VOCABULARY REFERENCE

### People & Roles
| Old Term | Mission Term |
|----------|--------------|
| Member | Missionary |
| New believer | New Recruit |
| Leader | Mission Leader |
| Mentor | Mission Coach |

### Groups & Activities
| Old Term | Mission Term |
|----------|--------------|
| Small group | Mission Group |
| Meeting | Mission Huddle |
| Check-in | Weekly Debrief |
| Training levels | Phase 1-4 |

### Keep Traditional (Spiritual Practices)
- Quiet time
- Devotion
- Prayer
- Bible reading
- Worship

---

## 📣 VLOG CALL TO ACTION (Tagalog)

```
"Kaibigan, kung naantig ka sa video na ito...

Gusto kong imbitahan kang SUMALI SA AMING MISSION GROUP.

May PURPOSE ang Diyos para sa iyo. May MISYON ka.
Ang misyon na iyon ay MAKILALA ANG DIYOS at IPAKILALA SIYA sa iba.

Dito mo mahahanap ang FULFILLMENT.
NILIKHA KA PARA SA MABUBUTING GAWA.

Kung gusto mong MAG-MATTER ang buhay mo...
SASANAYIN ka namin. Tutulungan ka naming LUMAGO.
TUTURUAN ka naming I-SHARE ang Diyos.
SASANAYIN ka naming GUMAWA NG MGA ALAGAD.

I-type mo lang: JOIN

Download ang Go Mission app. At hihintayin ka namin."
```

---

## 🔧 DEVELOPMENT NOTES

### Starting a New Session
```
Read my dev standards from https://github.com/PinedaMikeB/dev-standards

Then use Desktop Commander to read HANDOFF.md, MASTERPLAN.md, and CHANGELOG.md 
from /Volumes/Wotg Drive Mike/GitHub/Go-Mission
```

### During Every Session
1. Update HANDOFF.md with current work
2. Update MASTERPLAN.md with completed tasks
3. Update CHANGELOG.md after deployments

---

*This file is the source of truth for project planning. Update after every session.*
