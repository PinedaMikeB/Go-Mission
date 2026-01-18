# CHANGELOG - GO MISSION

All notable changes and deployments. Use this for rollbacks.

---

## Version Format
`vX.Y.Z` — Major.Minor.Patch  
Each entry includes rollback instructions.

---

## [v0.2.1] - 2026-01-18 ⭐ CURRENT

### 🎨 Exact Design System Applied

**Summary:** Applied exact design system from `/Users/mike/Downloads/go-mission (1)` folder.

**Design Tokens:**
| Token | Value |
|-------|-------|
| mission-red-deep | `#2a0505` |
| mission-red-mid | `#4a0404` |
| mission-red-bright | `#800000` |
| mission-gold | `#fbbf24` |
| mission-text | `#fdfcf0` |

**Typography:**
- Headings: Cinzel (serif, bold, tracking-widest)
- Body: Inter (sans-serif)

**Components:**
- Glass-morphism cards with gold borders
- Maroon gradient buttons with gold text
- Custom gold checkbox styling
- Progress dots with gold glow
- fade-up animations

**Background:**
- Mountain sunset image with gradient overlay
- `url('https://images.unsplash.com/photo-1464822759023-fed622ff2c3b')`

**Git Commit:** `018db3e`

**Rollback:**
```bash
git checkout be0849d -- index.html
git commit -m "Rollback to v0.2.0"
git push origin main
```

---

## [v0.2.0] - 2026-01-18

### 🌅 Premium Sunset Theme

**Summary:** Created premium theme based on ChatGPT design mockups.

**Features:**
- Rich maroon gradient background
- Playfair Display + Inter fonts
- Gold gradient buttons with glow
- Sunset ocean imagery in journey card
- Tagalog UI text elements
- Glass-morphism card effects

**Git Commit:** `be0849d`

---

## [v0.1.3] - 2026-01-18

### 🌙 Dark Maroon Theme

**Summary:** Dark mode with 70% maroon background.

- 70% Dark Maroon backgrounds
- 30% Cream text
- 10% Gold buttons

**Git Commit:** `06c4d41`

---

## [v0.1.2] - 2026-01-18

### ☀️ Light Cream Theme

**Summary:** Correctly applied 70-30-10 rule with light background.

- 70% Cream/Off-white backgrounds
- 30% Dark Maroon accents
- 10% Gold buttons/CTAs

**Git Commit:** `4f7c126`

---

## [v0.1.1] - 2026-01-18

### 🎨 Initial Maroon/Gold Theme

**Summary:** First attempt at 70-30-10 color rule (incorrectly applied).

**Git Commit:** `738b043`

---

## [v0.1.0] - 2026-01-16

### 🚀 Main App with Google Sign-In

**Summary:** Built complete app foundation with authentication and dashboard.

**What's Working:**
- Google Sign-In authentication
- Auto-create user profile on first login
- Dashboard with 6 mission cards:
  - My Journey
  - My Mission Group
  - Weekly Debrief
  - My Generations
  - Mission Training
  - This Week's Guide
- Mobile responsive with bottom navigation
- User photo and name display
- Sign out functionality

**Git Commit:** `20e3f4a`

**Rollback:**
```bash
git checkout 20e3f4a -- index.html
git commit -m "Rollback to v0.1.0"
git push origin main
```

---

## [v0.0.2] - 2026-01-16

### 🗄️ Firebase Configuration & Database Schema

**Summary:** Set up Firebase backend infrastructure.

**What Was Done:**
- Firebase project: shaped-by-grace
- Enabled Google Sign-In
- Enabled Email/Password (backup)
- Designed database schema (7 collections)
- Deployed Firestore security rules
- Added authorized domains

**Collections Created:**
1. goMission_members
2. goMission_groups
3. goMission_training
4. goMission_debriefs
5. goMission_materials
6. goMission_contacts
7. goMission_settings

---

## [v0.0.1] - 2026-01-16

### 📋 Initial Planning Complete

**Summary:** Complete strategic planning and framework design.

**What Was Decided:**
- App Name: **Go Mission**
- Ministry: Word On The Go Online Fellowship
- Goal: To make disciple-making leaders
- Tagline: "Making Disciple-Making Leaders"

**Journey Framework:**
- Stages: Seeker → Disciple → Disciple-Maker → Leader → Multiplier
- Two tracks: Mission Groups (ongoing) + Mission Training (progressive)
- Mission Training: 4 phases with action requirements
- Each phase: 8 sessions

**Phase Structure:**
| Phase | Name | Exit Requirement |
|-------|------|------------------|
| 1 | Recruit | Discipling 1+ person |
| 2 | Field Missionary | 2nd generation exists |
| 3 | Mission Coach | Group doing outreach |
| 4 | Mission Leader | Launch new group |

**Files Created:**
- MASTERPLAN.md
- HANDOFF.md
- CHANGELOG.md
- DATABASE-SCHEMA.md

---

## Upcoming Versions

### v0.3.0 - Weekly Debrief (Planned)
- [ ] Debrief form modal
- [ ] Submit to Firestore
- [ ] Dynamic user data loading

### v0.4.0 - Generations & Groups (Planned)
- [ ] My Generations tree visualization
- [ ] Group assignment system
- [ ] Real member data

### v0.5.0 - Training Content (Planned)
- [ ] Session detail pages
- [ ] Track attendance
- [ ] Phase 2-4 content

### v1.0.0 - MVP Launch (Planned)
- [ ] All core features working
- [ ] Admin dashboards
- [ ] Tested with real users
- [ ] Deployed to production

---

## Rollback Quick Reference

### Full Site Rollback (Git)
```bash
cd "/Volumes/Wotg Drive Mike/GitHub/Go-Mission"

# See recent commits
git log --oneline -10

# Rollback to specific commit
git checkout <commit-hash> -- .

# Push rollback
git add .
git commit -m "Rollback to vX.X.X"
git push origin main
```

### Key Commits
| Version | Commit | Description |
|---------|--------|-------------|
| v0.2.1 | `018db3e` | Exact design system (CURRENT) |
| v0.2.0 | `be0849d` | Premium sunset theme |
| v0.1.3 | `06c4d41` | Dark maroon theme |
| v0.1.2 | `4f7c126` | Light cream theme |
| v0.1.0 | `20e3f4a` | Main app foundation |

### Netlify Dashboard Rollback
1. Go to Netlify → Deploys
2. Find last working deploy
3. Click "Publish deploy"

---

*Update this file after every deployment.*
