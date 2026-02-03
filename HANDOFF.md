# Go Mission - AI Handoff Document

> ⚡ READ THIS FIRST - Everything you need to continue development

## Quick Context
- **App**: Disciple-making journey for Filipino seekers worldwide
- **Live**: https://gomission.netlify.app
- **Repo**: /Volumes/Wotg Drive Mike/GitHub/Go-Mission
- **Stack**: HTML/JS + Tailwind CDN + Firebase

---

## Current Session (2026-02-03) - JITSI MIGRATION

### ✅ COMPLETED - Jitsi Domain Migration

**Task**: Migrate Jitsi video calls from `meet.wotgonline.com` to `call.wotgonline.com`

**Files Updated**:
1. `/modules/groups/group-meeting.js` - Line 22: Changed `JITSI_DOMAIN` from `meet.wotgonline.com` to `call.wotgonline.com`
2. `/modules/training/training.js` - Line 635: Changed Jitsi URL from `meet.jit.si` to `call.wotgonline.com`

**New VPS Setup**:
- New VPS: 147.93.81.200 (Hostinger KVM 2, Indonesia)
- Control Panel: HestiaCP (https://147.93.81.200:8083)
- Jitsi: https://call.wotgonline.com

---

### 🔄 PREVIOUS - Journey Card Redesign (On Hold)

**Problem**: The path line shows THROUGH the circles instead of BEHIND them.
- Prototype (working): `/Users/mike/Downloads/go-mission-home-v2.html`
- Current (broken): Circles 2-5 appear transparent

**Root Cause Identified**:
The prototype uses CSS variables that resolve to solid gradients. Our implementation may have CSS specificity issues or the design-system.css is overriding the inline styles.

### What Was Done (Journey Card)

1. **Changed HTML class names** to match prototype
2. **Copied EXACT CSS from prototype** into index.html inline styles
3. **Path line with arrow** added

### TODO (Journey Card - when resumed)

1. Debug why circles 2-5 still show line through them
2. Check if `design-system.css` has conflicting rules
3. Once circles are solid, verify animations

---

## Key Files

| File | Purpose |
|------|---------|
| `/modules/groups/group-meeting.js` | Jitsi integration for group meetings |
| `/modules/training/training.js` | Training sessions with video call |
| `/index.html` | Main app - Journey card HTML & inline CSS |
| `/modules/core/design-system.css` | Design system CSS variables |

---

## Infrastructure

### VPS (New - 2026-02-03)
- **Provider**: Hostinger KVM 2
- **IP**: 147.93.81.200
- **Location**: Indonesia
- **OS**: Ubuntu 22.04 LTS
- **Panel**: HestiaCP (https://147.93.81.200:8083)
- **User**: pinedamikeb

### Domains on New VPS
- `call.wotgonline.com` → Jitsi Meet (video calls)

### Old VPS (Expiring)
- 145.223.75.230 - `meet.wotgonline.com` (don't renew)
- 62.72.26.131 - (expired 2026-01-29)

---

## Journey Stages Data

| # | Name | Description | Icon |
|---|------|-------------|------|
| 1 | SEEKER | Know God's love. Talk to God daily. | 🌱 |
| 2 | DISCIPLE | Grow in your Mission Group. Be trained and love others. | 📖 |
| 3 | DISCIPLE-MAKER | Lead others to follow Jesus. | 🤝 |
| 4 | BUILDER | Build mission groups. Raise disciple-makers. | 🏗️ |
| 5 | MULTIPLIER | Multiply movements across generations. | 🌟 |

---

## 🚫 BANNED (Do Not Use)

| Category | Banned | Use Instead |
|----------|--------|-------------|
| Colors | Random greens, blues, purples | `var(--color-gold)`, `var(--mission-red-bright)` |
| Buttons | Green buttons, blue buttons | `btn-primary` (burnt orange gradient) |
| Fonts | Arial, Inter, Roboto, system-ui | `var(--font-display)`, `var(--font-body)` |
| Styling | Inline colors, random hex codes | CSS variables from design-system.css |

---

*Last Updated: February 3, 2026 - 7:58 PM*
