# Dashboard Module

## Purpose
Leader dashboard - view team stats, devotion completion, and reports.

## Status: 📋 Planned (UI skeleton only)

## Files
```
modules/dashboard/
├── README.md       # This file
├── dashboard.js    # Stats overview, metrics
└── reports.js      # Generate/export reports
```

## Dashboard Metrics
| Metric | Description | Query |
|--------|-------------|-------|
| Active Disciples | Members with devotion this week | goMission_devotions |
| Groups Led | Groups where user is leader | goMission_groups |
| Generations | Multiplication depth | goMission_members |
| Training Progress | Members in each phase | goMission_members |

## Access Levels
| Role | Can See |
|------|---------|
| Member | Own stats only |
| Group Leader | Own group stats |
| Coach | Multiple groups |
| Admin | All stats |

## Current Implementation
- ✅ Dashboard card UI (static)
- ✅ Stats display (hardcoded)
- 📋 Need: Real data queries
- 📋 Need: Role-based access
- 📋 Need: Export functionality

## Dependencies
- modules/core/auth.js
- shared/firebase-config.js
