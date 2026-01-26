# Go Mission - Master Plan

> 🎯 Strategic roadmap for the disciple-making journey app

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
   - ❤️ **Tuklasin Ngayon Kung Gaano ka Kamahal ng Diyos** → Gospel Presentation
   - 📖 **Maglaan ng Oras sa Diyos** → Conversation with God Guide (locked until Gospel complete)
   - 👥 **Sumali sa Mission Group** → Join Group flow (locked until Gospel complete)

### Gospel Presentation (Interactive) ⭐ COMPLETED
**Location:** `/modules/gospel/gospel-presentation.js`
**Pattern:** See `/INTERACTIVE-PRESENTATION-PATTERN.md`

**"Ang Daan Papuntang Langit"** - 34 animated slides with question-based discovery:

**Truth 1: Mahal Ka ng Diyos**
- John 3:16 verse + image
- Q1: "Paano pinatunayan ng Diyos na mahal ka Niya?" → Ibinigay Niya ang Kanyang Anak
- Q2: "Ano ang gusto ng Diyos para sa iyo?" → Buhay na walang hanggan
- Transition: "Pero bakit hindi natin ito nararanasan?"

**Truth 2: Lahat Tayo ay Makasalanan**
- Romans 3:23 + image
- Q: "Sino ang nagkasala?" → Ang lahat ng tao
- Transition: "Hindi lang tayo nahiwalay... May kabayaran"
- Romans 6:23a + image
- Q: "Ano ang kabayaran ng kasalanan?" → Kamatayan
- Transition: "Pero bakit buhay pa ako?" → Dalawang kamatayan
- Physical vs Spiritual death explanation
- Revelation 21:8 (second death = lake of fire)
- Q: "Saan ang pangalawang kamatayan?" → Lawa ng apoy

**Truth 3: Si Hesus ang Tanging Daan**
- Human efforts fail (10 Commandments, Religion, Good Works, Rituals)
- Kawikaan 14:12 + image
- Transition: "Kung lahat tayo makasalanan... Paano maliligtas?"
- John 14:6 + image
- Q: "Sino ang TANGING daan?" → Si Hesus lamang
- Transition: "Pero bakit si Hesus?"
- 1 Peter 3:18
- Q: "Bakit namatay si Hesus?" → Para bayaran ang ating kasalanan

**Truth 4: Sumampalataya Para Maligtas**
- Transition: "Kung binayaran na, ligtas na ba ako?" → Hindi pa, kailangan ng pananampalataya
- Ephesians 2:8-9 (corrected translation)
- Formula Q: "Kung ilalagay sa formula ang kaligtasan..."
  - A) Pananampalataya + Mabuting Gawa = ❌
  - B) Pananampalataya + Sampung Utos = ❌
  - C) Pananampalataya + Wala = ✅
- Detailed wrong-answer explanation

**Decision Flow:**
- "Nais mo bang ilagay ang pananampalataya mo sa Panginoong Hesus ngayon?"
- **If "Hindi pa ako handa":** Record, encourage to continue seeking, return to app
- **If "Oo, ibibigay ko na":** Prayer intro → Prayer of Acceptance → Confirmation

**Prayer of Acceptance:**
> "Panginoong Hesus, Inaamin ko po na ako ay makasalanan. Patawarin Niyo po ako. Nananampalataya po ako na Ikaw ang nagbayad ng aking kasalanan sa krus. Ngayon nga ay binubuksan ko na ang aking puso. Pumasok Ka at manahan sa akin. Tinatanggap Kita bilang aking Panginoon at Tagapagligtas. Salamat sapagkat balang araw ay makakasama Kita sa langit. Simula ngayon ay tatalikdan ko ang aking kasalanan. Sinusuko ko na ang aking buhay sa Iyo. Amen."

**Firebase Tracking:**
- `gospelDecision.status`: 'not-ready', 'needs-followup', 'saved'
- `gospelDecision.acceptedAt`: timestamp
- `stats/gospel.savedCount`: incremented on salvation

**Celebration:**
- "MALIGAYANG BATI! Ikaw ay bagong nilalang!"
- Assurance verses (John 1:12, 1 John 5:11, 2 Cor 5:17)
- "Simulan ang Paglalakbay" → Continue journey

### Conversation with God Guide
After accepting Christ, guide them to daily devotion:
1. Find a quiet place
2. Prepare your heart (set aside distractions)
3. Pray - Thank God, ask for His presence
4. Listen - Open Bible, read in order (start with John)
5. Meditate - When a verse strikes, stop and ask:
   - "What do you mean by this?"
   - "How does this connect to my life?"
   - "How can I apply it?"
6. Use Quick Insights for deeper understanding
7. Write reflection and prayer requests
8. Save to journal

### Transition to ALAGAD
**Requirements:**
- ✅ Accepted Christ (Gospel completed)
- ✅ Joined a Mission Group

**Visual:** Journey line turns GOLD when both complete

---

## 📍 STAGE 2: ALAGAD (Disciple)

### Goal
Grow in relationship with God, Learn foundations

### Dashboard Display
- Title changes to: **"AKO AY ISANG ALAGAD"**
- Encouragement message for disciples

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
| Wed | 👥 **Group Processing** (Wednesday Equipping) |
| Thu | 📖 Day 3 reading + questions |
| Fri | 📖 Day 4 reading + questions |
| Sat | 📖 Day 5-6 reading + reflection |
| Sun | 🙏 Rest / Church |

**Daily Reading Structure:**
1. **Intro** - Review previous day, introduce today's focus
2. **Main Topic** - Core teaching point
3. **Verse** - Scripture foundation
4. **Story/Illustration** - Relatable example
5. **Explanation** - Deeper understanding
6. **Reflection Question** - Personal application
7. **Outro** - Segue to next topic

**Session Topics (18 weeks):**
1. God's Way to Heaven (Assurance of Salvation)
2. Your New Identity in Christ
3. The Holy Spirit
4. Prayer - Talking with God
5. The Bible - God's Word
6. Obedience - Following Jesus
7. Fellowship - The Church
8. Witnessing - Sharing Your Faith
9. Spiritual Warfare
10. Stewardship - Time, Talent, Treasure
11. Worship
12. Serving Others
13. Forgiveness
14. Faith
15. The Great Commission
16. Making Disciples
17. Leading Others
18. Multiplication Mindset

**Completion:** 18 weeks → Badge earned → Ready to lead

### Transition to TAGAPAG-HUBOG
**Requirements:**
- ✅ Completed Level 1 Training (18 sessions)

---

## 📍 STAGE 3: TAGAPAG-HUBOG (Disciple-Maker)

### Goal
Lead others, Start multiplying

### Dashboard Display
- Title: **"AKO AY TAGAPAG-HUBOG"**

### User Experience
1. **Lead a Mission Group** (start your own group)
2. Enroll in **Level 2 Training** (Builder track)
3. Guide new disciples through their journey

### Level 2 Training
- Leadership development
- Group facilitation skills
- Multiplication principles
- Coaching new believers

### Transition to TAGAPAG-TAYO
**Requirements:**
- ✅ Leading an active Mission Group
- ✅ Completed Level 2 Training

---

## 📍 STAGE 4: TAGAPAG-TAYO (Builder)

### Goal
Build leaders, Develop others to lead

### Dashboard Display
- Title: **"AKO AY TAGAPAG-TAYO"**

### User Experience
1. Train group members to become leaders
2. Help them start their own groups
3. Enroll in **Level 3 Training**
4. Coach other Disciple-Makers

### Level 3 Training
- Movement building
- Multiplication strategies
- Leadership coaching
- Church planting foundations

### Transition to TAGAPAG-PARAMI
**Requirements:**
- ✅ Producing leaders who lead groups
- ✅ Completed Level 3 Training

---

## 📍 STAGE 5: TAGAPAG-PARAMI (Multiplier)

### Goal
Movement multiplication, Multiple generations

### Dashboard Display
- Title: **"AKO AY TAGAPAG-PARAMI"**

### User Experience
1. Oversee multiple generations of disciples
2. Movement leadership
3. Strategic planning
4. Mentoring Builders

---

## 🏆 BADGES & CERTIFICATES

### Completion Badges
| Badge | Earned When |
|-------|-------------|
| 🌱 **Bagong Nilalang** | Accepted Christ |
| 👥 **Kasama sa Grupo** | Joined a Mission Group |
| 📖 **Alagad ni Kristo** | Completed Level 1 |
| ⭐ **Tagapag-Hubog** | Leading a group + Level 2 |
| 🏗️ **Tagapag-Tayo** | Producing leaders + Level 3 |
| 🌍 **Tagapag-Parami** | Multiple generations |

### Streak Badges
- 7-Day Reading Streak
- 30-Day Reading Streak
- 100-Day Reading Streak

### Training Certificates
- Level 1 Completion Certificate
- Level 2 Completion Certificate
- Level 3 Completion Certificate

---

## 📊 LEADER DASHBOARD

### What Leaders See
- Members' progress (which stage, training progress)
- Who completed daily readings
- Training session completion rates
- Prayer requests from members
- Group activity metrics

---

## 🔊 AUDIO EXPERIENCE

### Audio Features
1. **Gospel Presentation** - Full audio narration (Mike recording)
2. **Training Sessions** - Audio for daily readings
3. **Quick Insights** - TTS or recorded
4. **Install Guide** - Animated with audio

### Why Audio Matters
- Filipino commuters have long travel times
- Training sessions completable while driving/commuting
- Accessibility for those who prefer listening
- Personal touch with pastor's voice

---

## 📖 BIBLE READING SYSTEM

### Quick Insights (4 Sections per Verse)
1. **Understanding This Verse** - Context & meaning
2. **Living It Out** - Practical application
3. **See God's Love** - God's character revealed
4. **Reflection Question** - Personal prompt

### Journal Features
- Daily reflections saved
- Prayer requests with tracking
- Mark prayers as answered
- Filter by answered/pending
- Share with group (optional)

---

## 🛠️ TECHNICAL ARCHITECTURE

### Key Modules
```
/modules/
  /gospel/
    gospel-presentation.js     # Interactive gospel slides
    README.md
  /journey/
    next-steps-modal.js        # Stage-based options modal
    conversation-guide.js      # Quiet time tutorial (planned)
  /bible/
    bible-reader.js            # Bible reading interface
    /data/
      /quick-insights/         # JSON files per book
  /training/
    training.js                # Training system
    /content/                   # Session content (planned)
  /groups/
    my-groups.js               # Group management
```

### Firebase Collections
```
users/
  {uid}/
    stage: "seeker" | "disciple" | "disciple-maker" | "builder" | "multiplier"
    gospelDecision: { prayed: bool, prayedAt: timestamp }
    trainingProgress: { level1: 0-18, level2: 0-X, level3: 0-X }
    badges: []
    stageHistory: { disciple: timestamp, ... }

groups/
  {groupId}/
    members/
    requests/
    
devotions/
  {uid}/
    {date}/
      passage, reflection, prayerRequests, shared
```

---

## 📅 ROADMAP

### Phase 1: Foundation (Current)
- [x] Journey card as main dashboard
- [x] Next Steps Modal with stage-based options
- [x] Gospel Presentation (interactive slides)
- [x] Gospel images downloaded
- [ ] Audio for Gospel (pending Mike's recording)
- [ ] Conversation with God guide

### Phase 2: Training System
- [ ] Level 1 content structure (18 sessions)
- [ ] Daily reading interface
- [ ] Wednesday processing tracker
- [ ] Session completion tracking
- [ ] Audio for training sessions

### Phase 3: Progression & Badges
- [ ] Stage transition logic
- [ ] Badge system
- [ ] Certificates
- [ ] Leader dashboard
- [ ] Progress tracking for leaders

### Phase 4: Polish
- [ ] Celebration animations
- [ ] Push notifications
- [ ] Offline support
- [ ] Performance optimization

---

## 📝 NOTES

- **Journey is central** - Everything connects back to "Where am I? What's next?"
- **Audio is key** - Filipino commuters can learn while traveling
- **Groups are essential** - No lone-ranger Christianity
- **Training is structured** - 18 sessions, 6 days/week, Wednesday processing
- **Leaders see progress** - Shepherding through data

---

*Last Updated: January 26, 2026*
