# Groups Module

## Purpose
Mission Groups - weekly discipleship gatherings with membership management and group chat.

## Status: ✅ Core Implementation Complete

## Files
```
modules/groups/
├── README.md       # This file
├── groups.js       # Group management, membership, join/leave
└── group-chat.js   # Real-time group chat
```

## Features

### For Members
- View current group info
- Request to join a group
- Search available groups
- Leave group
- Group chat

### For Leaders
- Create new group
- Accept/reject join requests
- View member list
- Group chat

## Usage

```javascript
// Initialize (called automatically on login)
await Groups.init();

// Search for groups
const groups = await Groups.searchGroups('Manila');

// Request to join
await Groups.requestJoinGroup('group_123');

// For leaders - accept request
await Groups.acceptRequest('user_uid');

// Open chat
GroupChat.open();
```

## Firestore Collections

### goMission_groups
```json
{
  "id": "group_1234567890",
  "name": "Taytay Youth Group",
  "schedule": {
    "day": "saturday",
    "time": "19:00",
    "timezone": "GMT+8",
    "platform": "zoom",
    "meetingLink": "https://..."
  },
  "leaderId": "user_uid",
  "leaderName": "Mike Pineda",
  "members": ["uid1", "uid2"],
  "pendingRequests": [
    {
      "uid": "user_uid",
      "name": "John Doe",
      "email": "john@email.com",
      "photoURL": "https://...",
      "requestedAt": "2026-01-20T12:00:00Z"
    }
  ],
  "currentCount": 5,
  "capacity": 12,
  "status": "active",
  "createdAt": timestamp
}
```

### goMission_chats
```json
{
  "groupId": "group_123",
  "senderId": "user_uid",
  "senderName": "Mike Pineda",
  "senderPhoto": "https://...",
  "text": "Hello everyone!",
  "type": "text",
  "createdAt": timestamp
}
```

### goMission_chats (devotion share)
```json
{
  "groupId": "group_123",
  "senderId": "user_uid",
  "senderName": "Mike Pineda",
  "senderPhoto": "https://...",
  "type": "devotion",
  "devotion": {
    "book": "JHN",
    "chapter": 3,
    "verses": [16],
    "question": "What does this verse mean to you?",
    "reflection": "God's love is so amazing..."
  },
  "createdAt": timestamp
}
```

## Firestore Rules Required

Add to your Firestore rules:
```javascript
match /goMission_chats/{docId} {
  allow read: if request.auth != null;
  allow write: if request.auth != null;
}
```

## Events

```javascript
// Listen for group changes
document.addEventListener('groupChanged', (e) => {
  console.log('Group updated:', e.detail.group);
});
```

## UI Elements

### Modals (in index.html)
- `#groupModal` - For join/create/requests
- `#chatModal` - Full-screen chat

### Dynamic Content
- `#groupCardContent` - Mission Group card content
- `#pendingRequestsBadge` - Badge showing pending requests count

## Dependencies
- Firebase Firestore
- modules/core/auth (window.currentUser)
- groups.js must load before group-chat.js
