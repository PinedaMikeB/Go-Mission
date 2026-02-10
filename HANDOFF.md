# Go Mission - AI Handoff Document

> ⚡ READ THIS FIRST - Everything you need to continue development

## Quick Context
- **App**: Disciple-making journey for Filipino seekers worldwide
- **Live**: https://gomission.netlify.app
- **Repo**: /Volumes/Wotg Drive Mike/GitHub/Go-Mission
- **Stack**: HTML/JS + Tailwind CDN + Firebase

---

## Current Task Status (2026-02-10)

- **Active module**: Groups (Jitsi meetings)
  - `/modules/groups/my-groups.js`
  - `/modules/groups/group-meeting.js`
- **Goal**: Make embedded meetings and leader tools reliable (self-hosted Jitsi `call.wotgonline.com`)
- **Status**: ✅ Join Meeting click reliability fixed + in-app embedded Jitsi improved
  - Added 12s “Still connecting…” status hint if embed stalls (common when iframe/CSP blocks or the call server is slow)
  - Made room-name generation resilient if a group is missing a name (prevents a hard JS crash)
  - Updated inline `onclick="MyGroups.*"` handlers to `onclick="window.MyGroups.*"` (fixes cases where inline handlers can’t resolve `const MyGroups` in some browser scopes)
  - Removed all Jitsi “open in new tab” behavior so meetings stay embedded in the PWA
  - Added fast call-server reachability check + in-modal Retry button to avoid long blank/timeout screens when `call.wotgonline.com` is slow/offline
- **Status**: ✅ Leader “Generate Invite Code” + pending-request visibility improved on Mission Groups dashboard
  - Leader cards now show 4 actions side-by-side: Invite Code, Chat, View (with pending badge), Join Meeting
  - If there are pending join requests, leader sees “X requests pending” and can approve as Member or Guest
- **Next steps**
  - Push + deploy to Netlify, then test:
    - Mission Groups Dashboard (“Group Status” cards): Invite Code, pending badge, View & Approve, Join Meeting
    - My Groups screen: Join with Invite Code flow
  - Verify end-to-end invite flow:
    - Leader taps Invite Code → shares code (expires in 7 days)
    - Member taps “Join with Invite Code” → request appears as pending
    - Leader approves as Member or Guest

---

## ✅ COMPLETED - Session 2026-02-04

### 1. Git Push & API Key Fix ✅
- **Problem**: Netlify was 4 commits behind, Quick Insights showing empty
- **Fix**: Removed exposed OpenAI API key from git history using `git filter-branch`
- **Result**: Successfully pushed all commits to GitHub/Netlify

### 2. Welcome Modal Spacing ✅
- **Problem**: Button was below viewport, required scrolling
- **Fix**: Reduced spacing in `/modules/install/install-modal.js`
- Padding, margins, logo size all reduced to fit in one view

### 3. Onboarding Modal Spacing ✅
- **Problem**: "START YOUR JOURNEY" button cut off at bottom
- **Fix**: Reduced spacing in `index.html` welcome modal styles
- Content padding: 2rem → 1rem
- Header padding-top: 3rem → 1.5rem
- CTA section padding: 1rem 1.5rem 3rem → 0.75rem 1.5rem 1.5rem

### 4. Carousel Cards Content ✅
- **Problem**: Second set showed "stageSeeker", "stageDiscipleDesc" (untranslated i18n keys)
- **Fix**: Removed broken `data-i18n` attributes, hardcoded bilingual content
- First set: English (SEEKER, DISCIPLE, DISCIPLE-MAKER, BUILDER, MULTIPLIER)
- Second set: Tagalog (NAGHAHANAP, ALAGAD, TAGAPAG-HUBOG, TAGAPAG-TAYO, TAGAPAG-PARAMI)

### 5. Loading Sequence Flash Fix ✅
- **Problem**: Dashboard flashed briefly before welcome modal appeared
- **Root Cause**: mainApp shown before WelcomeModal.init() called
- **Fix**: Check `goMission_welcomeSeen` before showing mainApp
  - If NOT seen → Show welcome modal, keep mainApp hidden
  - If seen → Show mainApp directly
  - On "START YOUR JOURNEY" click → Show mainApp, then hide modal

---

## Loading Sequence (VERIFIED CORRECT)

1. **Loading animation** shows (HTML default visible)
2. `auto-update.js` initializes during loading (checks updates silently)
3. Firebase initializes
4. `onAuthStateChanged` fires → Loading hides
5. If new user → Welcome/Onboarding modal (mainApp stays hidden)
6. If returning user → mainApp shows directly
7. User clicks "START YOUR JOURNEY" → mainApp shows, modal fades

---

## Previous Session (2026-02-03) - Jitsi Migration ✅

**Task**: Migrated Jitsi from `meet.wotgonline.com` to `call.wotgonline.com`

**Files Updated**:
- `/modules/groups/group-meeting.js` - Changed `JITSI_DOMAIN`
- `/modules/training/training.js` - Changed Jitsi URL

---

## Quick Insights System

### Coverage Status
| Category | Count |
|----------|-------|
| Total Bible verses | 31,133 |
| Verses with insights | 15,864 (51%) |
| Missing verses | 15,269 (49%) |
| Books with files | 63/66 |
| Missing books | 1TH, 2TH, HAG, JON |

### Working Flow:
1. User taps verse → highlights it
2. BibleLoader.getQuickInsights() fetches from JSON
3. Returns `{understanding, livingItOut, godsLove, reflection}` for language
4. BibleReader.renderCommentary() displays in sidebar

---

## Key Files

| File | Purpose |
|------|---------|
| `index.html` | Main app, welcome modal, auth flow |
| `/modules/install/install-modal.js` | PWA install modal |
| `/modules/core/auto-update.js` | Silent update system |
| `/modules/bible/bible-loader.js` | Loads Quick Insights JSON |
| `/modules/bible/bible-reader.js` | Renders insights in sidebar |
| `/modules/bible/data/quick-insights/*.json` | Insight data (63 books) |

---

## Git Push Command (if needed)
```bash
cd "/Volumes/Wotg Drive Mike/GitHub/Go-Mission"
git push origin main
```

Note: If authentication fails, use Personal Access Token:
```bash
git push https://TOKEN@github.com/PinedaMikeB/Go-Mission.git main
```
