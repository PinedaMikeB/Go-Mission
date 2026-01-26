# Go Mission - AI Handoff Document

> ⚡ READ THIS FIRST - Everything you need to continue development
> 📚 For full discipleship system details, see **MASTERPLAN.md**

## Quick Context
- **App**: Disciple-making journey for Filipino seekers worldwide
- **Live**: https://gomission.netlify.app
- **Repo**: /Volumes/Wotg Drive Mike/GitHub/Go-Mission
- **Firebase**: wotg-app (Firestore + Auth + Cloud Functions)
- **Stack**: HTML/JS + Tailwind CDN + Firebase

---

## Current Session (2026-01-26 Evening)

### ✅ COMPLETED TODAY

#### 1. Home Screen Redesign
- Journey Card is now the **main/only** prominent card
- Button changed to **"SIMULAN ANG SUSUNOD NA HAKBANG"**
- Removed standalone "Know How Much God Loves You" button
- Gospel now accessed through Next Steps Modal

#### 2. Next Steps Modal
**Location:** `/modules/journey/next-steps-modal.js`

Shows stage-appropriate options:
- **Seeker:** Gospel, Quiet Time, Join Group
- **Disciple:** Bible reading, Training enrollment
- **Disciple-Maker:** Lead group, Level 2
- **Builder:** Develop leaders, Level 3
- **Multiplier:** Movement dashboard

#### 3. Gospel Presentation Module
**Location:** `/modules/gospel/gospel-presentation.js`

- 27 interactive slides based on "Ang Daan Papuntang Langit"
- 4 Truths structure with verses
- Formula question for engagement
- Prayer decision saved to Firebase
- Audio timestamps ready (awaiting recording)

**Images:** `/assets/images/gospel/gospel_tract1-5.jpg`

#### 4. NT Quick Insights Generation
**Status:** Running in background
**Log:** `/scripts/logs/nt-incomplete-generation.log`

```bash
# Monitor progress
tail -f "/Volumes/Wotg Drive Mike/GitHub/Go-Mission/scripts/logs/nt-incomplete-generation.log"
```

---

## 🎯 THE DISCIPLESHIP SYSTEM (Summary)

> Full details in **MASTERPLAN.md**

### 5 Stages
```
NASA PAGLALAKBAY → ALAGAD → TAGAPAG-HUBOG → TAGAPAG-TAYO → TAGAPAG-PARAMI
    (Seeker)      (Disciple)  (D-Maker)      (Builder)     (Multiplier)
```

### Stage Transitions
| From | To | Requirements |
|------|-----|--------------|
| Seeker | Disciple | Accept Christ + Join Group |
| Disciple | Disciple-Maker | Complete Level 1 (18 sessions) |
| Disciple-Maker | Builder | Lead Group + Complete Level 2 |
| Builder | Multiplier | Produce Leaders + Complete Level 3 |

### Wednesday Equipping (Level 1)
- **18 sessions** (18 weeks)
- **6-day weekly cycle** of daily readings
- **Wednesday** = Group processing
- **Daily format:** Intro → Topic → Verse → Story → Explanation → Question → Outro

---

## 📁 Key Files

### Modules
```
/modules/
  /gospel/
    gospel-presentation.js     # Interactive gospel (27 slides)
    README.md
  /journey/
    next-steps-modal.js        # Stage-based options modal
  /bible/
    /data/quick-insights/      # JSON files per book
```

### Scripts
```
/scripts/
  generate-quick-insights-openai.js  # Quick Insights generator
  run-nt-incomplete.sh               # NT batch runner
  /logs/                             # Generation logs
```

### Assets
```
/assets/images/gospel/
  gospel_tract1.jpg through gospel_tract5.jpg
```

---

## 🔜 WHAT'S NEXT

### Immediate (After Audio)
1. **Mike provides:** Gospel audio recording (one long file)
2. **Claude splits:** By slide timestamps
3. **Implement:** Audio playback in Gospel module

### Then Build
1. **Conversation with God Guide** - Quiet time tutorial modal
2. **Prayer Request Tracking** - Add to journal, mark answered
3. **Level 1 Training Content** - 18 sessions structure

### Later
4. Stage progression logic (auto-promote when requirements met)
5. Badge system
6. Leader dashboard (see members' progress)
7. Certificates

---

## 🧪 Testing

### Test Gospel Flow
1. Go to https://gomission.netlify.app
2. Click **"SIMULAN ANG SUSUNOD NA HAKBANG"**
3. Select **"Kilalanin ang Pag-ibig ng Diyos"**
4. Navigate through 27 slides
5. Test formula question (select option 3)
6. Test prayer button

### Test Next Steps Modal
1. Modal should show 3 options for Seekers
2. Completed items show ✓ checkmark
3. Gospel opens GospelPresentation
4. Join Group opens MyGroups.showJoinModal()

---

## 📝 Commands Reference

```bash
# Monitor NT generation
tail -f "/Volumes/Wotg Drive Mike/GitHub/Go-Mission/scripts/logs/nt-incomplete-generation.log"

# Check running processes
ps aux | grep "generate-quick-insights" | grep -v grep

# Git push
cd "/Volumes/Wotg Drive Mike/GitHub/Go-Mission" && git add -A && git commit -m "message" && git push origin main
```

---

*Last Updated: January 26, 2026 - 8:45 PM PST*
