# Groups Module

## Purpose
Mission Groups - weekly discipleship gatherings with membership management and group chat.

## Status: ✅ Core Implementation Complete

## Philosophy: Disciple First, Then Disciple-Maker
> "You must be a disciple before you become a disciple-maker"

Users cannot create their own group unless:
1. They are/were a member of a group (disciple history), OR
2. They have an endorsement code from admin/leader, OR
3. They are the admin (michael.marga@gmail.com)

## Files
```
modules/groups/
├── README.md       # This file
├── groups.js       # Group management, membership, join/leave, endorsement codes
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
- **Generate endorsement codes** (to authorize new leaders)
- Group chat

### For Admin (michael.marga@gmail.com)
- All leader features
- Can create groups without being a disciple first
- Can generate endorsement codes

## User Flow (Facebook → App)

```
1. FACEBOOK: Seeker comments "Join" on a post
2. MESSENGER: Welcome team chats with seeker, asks preferred schedule
3. ASSIGNMENT: Mission Group Manager assigns seeker to fitting group
4. INVITE: Leader generates invite code, shares with seeker:
   - Code: ABC123
   - Link: https://gomission.netlify.app/?join=ABC123
5. APP: Seeker opens link → Login with Google → Auto-joins group
```

## Two Types of Codes

| Code Type | Purpose | Who Can Generate | Collection |
|-----------|---------|------------------|------------|
| **Group Invite Code** | Join an existing group as member | Group Leaders | goMission_groupInviteCodes |
| **Endorsement Code** | Create your own group (bypass disciple rule) | Admin, Leaders | goMission_endorsementCodes |

## Usage

```javascript
// Initialize (called automatically on login)
await Groups.init();

// Join with invite code
await Groups.joinWithInviteCode('ABC123');

// For leaders - generate invite code
const code = await Groups.generateGroupInviteCode(7, null); // 7 days, unlimited uses

// For leaders - generate endorsement code (to authorize new leaders)
const endorseCode = await Groups.generateEndorsementCode();

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

### goMission_groupInviteCodes
```json
{
  "code": "ABC123",
  "groupId": "group_1234567890",
  "groupName": "Taytay Youth Group",
  "createdBy": "leader_uid",
  "createdByName": "Mike Pineda",
  "createdAt": "2026-01-20T12:00:00Z",
  "expiresAt": "2026-01-27T12:00:00Z",
  "maxUses": null,
  "usedCount": 3
}
```

### goMission_endorsementCodes
```json
{
  "code": "ABC12345",
  "createdBy": "admin_uid",
  "createdByName": "Mike Marga",
  "createdByEmail": "michael.marga@gmail.com",
  "createdAt": "2026-01-20T12:00:00Z",
  "expiresAt": "2026-02-20T12:00:00Z",
  "forEmail": null,
  "used": false,
  "usedBy": null,
  "usedAt": null,
  "groupCreated": null
}
```

## Firestore Rules Required

Add to your Firestore rules:
```javascript
match /goMission_chats/{docId} {
  allow read: if request.auth != null;
  allow write: if request.auth != null;
}

match /goMission_groupInviteCodes/{code} {
  allow read: if request.auth != null;
  allow write: if request.auth != null;
}

match /goMission_endorsementCodes/{code} {
  allow read: if request.auth != null;
  allow write: if request.auth != null 
    && (request.auth.token.email == 'michael.marga@gmail.com' 
        || resource == null 
        || resource.data.createdBy == request.auth.uid);
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
