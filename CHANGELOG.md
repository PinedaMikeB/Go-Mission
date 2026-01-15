# CHANGELOG - GO MISSION

All notable changes and deployments. Use this for rollbacks.

---

## Version Format
`vX.Y.Z` — Major.Minor.Patch  
Each entry includes rollback instructions.

---

## [v0.0.1] - 2026-01-16

### 📋 Initial Planning Complete

**Summary:** Complete strategic planning and framework design for Go Mission app.

**What Was Decided:**

**App Identity:**
- App Name: **Go Mission**
- Ministry: Word On The Go Online Fellowship
- Goal: To make disciple-making leaders
- Tagline: "Making Disciple-Making Leaders"

**Journey Framework:**
- Two tracks: Mission Groups (ongoing) + Mission Training (progressive)
- Mission Training: 4 phases with action requirements
- Each phase: 8 sessions

**Phase Structure:**
| Phase | Name | Entry | Exit Requirement |
|-------|------|-------|------------------|
| 1 | Recruit | None | Discipling 1+ person |
| 2 | Field Missionary | Phase 1 + active disciple | 2nd generation exists |
| 3 | Mission Coach | Phase 2 + 2nd gen | Group doing outreach |
| 4 | Mission Leader | Phase 3 + outreach | Launch new group |

**App Modules Identified:**
1. My Journey
2. My Mission Group
3. My Generations
4. Weekly Debrief
5. Mission Training
6. Discussion Guides
7. Pipeline Dashboard
8. Shepherd Dashboard
9. Admin Dashboard

**Vocabulary Decisions:**
- Member → Missionary
- Leader → Mission Leader
- Check-in → Weekly Debrief
- Training levels → Phase 1-4
- Keep traditional: Quiet time, Prayer, Devotion, Worship

**Files Created:**
- MASTERPLAN.md (full roadmap)
- HANDOFF.md (current state)
- CHANGELOG.md (this file)

**Git Commit:** Initial commit (pending repo creation)

**Next Steps:**
1. Create GitHub repository
2. Set up Firebase project
3. Design database schema
4. Build basic app structure

---

## Upcoming Versions

### v0.1.0 - Foundation (Planned)
- [ ] GitHub repo created
- [ ] Firebase project set up
- [ ] Basic file structure
- [ ] Authentication working

### v0.2.0 - Core Screens (Planned)
- [ ] Dashboard
- [ ] My Journey
- [ ] My Mission Group

### v0.3.0 - Training System (Planned)
- [ ] Mission Training tracker
- [ ] Phase display
- [ ] Requirements verification

### v1.0.0 - MVP Launch (Planned)
- [ ] All core features working
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

### Single File Rollback
```bash
git checkout HEAD~1 -- path/to/file.html
```

### Netlify Dashboard Rollback
1. Go to Netlify → Deploys
2. Find last working deploy
3. Click "Publish deploy"

---

*Update this file after every deployment.*
