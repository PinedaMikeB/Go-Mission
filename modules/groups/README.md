# Groups Module

## Purpose
Mission Groups - weekly discipleship gatherings with attendance and chat.

## Status: 📋 Planned (UI skeleton only)

## Files
```
modules/groups/
├── README.md       # This file
├── groups.js       # Group management, membership
├── chat.js         # Real-time group chat
└── attendance.js   # Weekly check-in tracking
```

## Firestore Collections

### goMission_groups
```json
{
  "groupId": "auto",
  "name": "Makati Warriors",
  "leader": "userId",
  "coLeaders": ["userId"],
  "members": ["userId1", "userId2"],
  "meetingDay": "Sunday",
  "meetingTime": "3:00 PM",
  "timezone": "Asia/Manila",
  "createdAt": timestamp,
  "status": "active"
}
```

### goMission_attendance
```json
{
  "groupId": "groupId",
  "date": "2024-01-19",
  "present": ["userId1", "userId2"],
  "absent": ["userId3"],
  "notes": "Great discussion on John 3"
}
```

## Current Implementation
- ✅ Group card UI (static)
- ✅ Meeting time display
- ✅ Member checkboxes (non-functional)
- ✅ Chat button (non-functional)
- 📋 Need: Real group data
- 📋 Need: Chat implementation
- 📋 Need: Attendance tracking

## Dependencies
- modules/core/auth.js
- shared/firebase-config.js
