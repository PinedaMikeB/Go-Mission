# CHANGELOG - GO MISSION

All notable changes and deployments. Use this for rollbacks.

---

## Version Format
`vX.Y.Z` — Major.Minor.Patch  
Each entry includes rollback instructions.

---

## [v1.5.0] - 2026-01-26 Late Night ⭐ CURRENT

### 🎬 Interactive Gospel Presentation - Complete Overhaul

**Summary:** Complete redesign of Gospel presentation with animated transitions, question-based discovery learning, and salvation decision tracking.

**Major Features:**

#### 1. Animated Slide System
- 34 slides with smooth enter/exit transitions
- Staggered element animations (bounce, fade-up, scale-in)
- CSS keyframe animations injected dynamically
- Progress bar with glow effect
- Mobile-optimized (no scrolling needed)

#### 2. Question-Based Discovery Learning
- 7 interactive questions throughout presentation
- Immediate feedback for correct/wrong answers
- Detailed explanation for formula question wrong answers
- Next button appears after answering (with pulse animation)

#### 3. Enhanced Content Flow
**Truth 1: Mahal Ka ng Diyos**
- John 3:16 verse
- Q1: "Paano pinatunayan ng Diyos na mahal ka Niya?"
- Q2: "Ano ang gusto ng Diyos para sa iyo?"

**Truth 2: Lahat Tayo ay Makasalanan**
- "Pero bakit..." transition
- Romans 3:23 + Q: "Sino ang nagkasala?"
- "May Kabayaran" transition
- Romans 6:23 + Q: "Ano ang kabayaran?"
- Two kinds of death (Physical vs Spiritual)
- Revelation 21:8 + Q: "Saan ang pangalawang kamatayan?"

**Truth 3: Si Hesus ang Tanging Daan**
- Human efforts fail (grid showing 4 attempts)
- Kawikaan 14:12 verse
- "Paano maliligtas?" transition
- John 14:6 + Q: "Sino ang TANGING daan?"
- "Pero bakit si Hesus?" transition
- 1 Peter 3:18 + Q: "Bakit namatay si Hesus?"

**Truth 4: Sumampalataya Para Maligtas**
- "Kung binayaran na..." transition
- Ephesians 2:8-9 (corrected translation)
- Formula question with detailed wrong-answer explanation

#### 4. Two-Path Decision Flow
**Decision Slide:**
- "Nais mo bang ilagay ang pananampalataya mo sa Panginoong Hesus ngayon?"
- Two buttons: "Hindi pa ako handa" / "Oo, ibibigay ko na"

**If "Hindi pa ako handa":**
- Records status: 'not-ready'
- Shows encouragement message
- Invites to continue reading Bible
- Returns to Next Steps Modal

**If "Oo, ibibigay ko na":**
- Prayer intro slide
- Full prayer of acceptance (updated Tagalog)
- Confirmation: "Tinanggap mo ba?" (Hindi / Oo)
- If Yes: Records as SAVED, increments stats, shows celebration
- If No: Records for follow-up

#### 5. Firebase Tracking
```javascript
users/{uid}/gospelDecision: {
    status: 'not-ready' | 'needs-followup' | 'saved',
    acceptedAt: timestamp,
    needsFollowUp: boolean
}

stats/gospel: {
    savedCount: number,
    lastSavedAt: timestamp
}
```

#### 6. Updated Prayer of Acceptance
```
"Panginoong Hesus, Inaamin ko po na ako ay makasalanan. 
Patawarin Niyo po ako. Nananampalataya po ako na Ikaw ang 
nagbayad ng aking kasalanan sa krus. Ngayon nga ay binubuksan 
ko na ang aking puso. Pumasok Ka at manahan sa akin. 
Tinatanggap Kita bilang aking Panginoon at Tagapagligtas. 
Salamat sapagkat balang araw ay makakasama Kita sa langit. 
Simula ngayon ay tatalikdan ko ang aking kasalanan. 
Sinusuko ko na ang aking buhay sa Iyo. Amen."
```

**Files Modified:**
- `/modules/gospel/gospel-presentation.js` (934 lines - complete rewrite)
- `/index.html` (button text: "HUMAKBANG NGAYON")
- `/modules/journey/next-steps-modal.js`

**Documentation Created:**
- `/INTERACTIVE-PRESENTATION-PATTERN.md` (reusable pattern for future)
- `/HANDOFF.md` (updated)
- `/MASTERPLAN.md` (updated)

**Rollback:**
```bash
git revert HEAD~10..HEAD
# Or restore from v1.4.0 tag
```

---

## [v1.4.0] - 2026-01-26

### 🚀 Journey-Centric Dashboard + Initial Gospel

**Summary:** Major redesign making the app journey-centric. Users always know where they are and what's next.

**New Features:**

#### 1. Journey-Centric Home Screen
- Journey Card is now the **main/only** prominent card
- Single CTA: **"SIMULAN ANG SUSUNOD NA HAKBANG"**

#### 2. Next Steps Modal
- Bottom sheet modal with stage-appropriate options
- Sequential locking (Gospel must complete first)

#### 3. Initial Gospel Presentation
- 27 slides with basic Q&A
- Simple decision tracking

**Files Created:**
- `/modules/journey/next-steps-modal.js`
- `/modules/gospel/gospel-presentation.js`
- `/assets/images/gospel/gospel_tract1-5.jpg`

---

## [v1.3.0] - 2026-01-25

### Bible Quick Insights System
- AI-generated 3-sentence summaries for each book
- GPT-4o-mini for cost efficiency
- Stored in `/data/quick-insights/`

---

## [v1.2.0] - 2026-01-24

### PWA Installation Flow
- Force update system
- Install prompts for iOS/Android
- Version checking

---

## [v1.1.0] - 2026-01-23

### Bible Reader Module
- Bilingual support (English/Tagalog)
- Chapter navigation
- Offline caching

---

## [v1.0.0] - 2026-01-20

### Initial Release
- User authentication (Firebase)
- Basic home screen
- Profile management
