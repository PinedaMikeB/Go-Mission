# Go Mission - AI Handoff Document

> ⚡ READ THIS FIRST - Everything you need to continue development

## Quick Context
- **App**: Disciple-making journey for Filipino seekers worldwide
- **Live**: https://gomission.netlify.app
- **Repo**: /Volumes/Wotg Drive Mike/GitHub/Go-Mission
- **Firebase**: wotg-app (Firestore + Auth + Cloud Functions)
- **Stack**: HTML/JS + Tailwind CDN + Firebase

---

## Current Session (2026-01-24)
- **MODULE**: Group Join Requests + Guest System + Member Management
- **STATUS**: ✅ Complete
- **TASK**: Implement join request approval system with member/guest options

### ✅ Join Request & Approval System (COMPLETED)

**Flow:**
1. User enters invite code → Creates join request (NOT auto-added)
2. Leader sees "🔔 1 Pending Request" badge on group card
3. Leader clicks "View Members" → Sees pending requests at TOP
4. Leader chooses: ✅ Member | 🎫 Guest | ✕ Decline
5. User gets notified and can access group

**Features:**
- Real-time badges via Firestore `onSnapshot`
- Red badge on Groups nav icon showing total pending requests
- Red badge on "View Members" button per group
- Pending requests shown at top of View Members modal
- Cloud Function sends push notification to leader on new request

### ✅ Guest System (COMPLETED)

**Guest vs Member:**
| Feature | Member | Guest |
|---------|--------|-------|
| Group Chat | ✅ | ✅ |
| Join Meeting | ✅ | ✅ |
| View in My Groups | Upline section | Guest Groups section |
| Invite others | ❌ | ❌ |
| Leave group | Via leader | Self ("Leave as Guest") |

**Guest Groups Section:**
- New section in My Groups: "🎫 GUEST GROUPS"
- Blue border on guest group cards
- "Guest" badge on card header
- "Leave as Guest" button

**Firestore Schema:**
```javascript
// goMission_groups/{groupId}
{
  members: ["uid1", "uid2"],           // Full members
  guests: [{                            // Guest visitors
    odId: "uid3",
    name: "Guest Name",
    photo: "url",
    homeGroupId: "original-group-id",
    homeGroupName: "Original Group",
    joinedAsGuestAt: "timestamp"
  }],
  joinRequests: [{                      // Pending requests
    odId: "uid4",
    name: "Requester Name",
    email: "email@example.com",
    photo: "url",
    requestedAt: "timestamp",
    hasExistingGroup: true/false,
    existingGroupId: "group-id",
    existingGroupName: "Group Name"
  }]
}

// goMission_members/{odId}
{
  uplineGroupId: "group-id",           // Primary group (as member)
  guestGroups: ["group-id-1", "group-id-2"]  // Groups visiting as guest
}
```

### ✅ Member Management (COMPLETED)

**View Members Modal:**
- Leader shown at top with 👑 crown and gold border
- "DISCIPLES (X)" section with all members
- "Remove" button for leader to remove members
- "🎫 GUESTS (X)" section for guests

**Remove Member Flow:**
1. Leader clicks "Remove" next to member
2. Confirms removal
3. Member removed from `members[]` array
4. Member's `uplineGroupId` cleared
5. Removed member can't access chat/meeting
6. Removed member sees "You are no longer a member"

### ✅ Notifications (COMPLETED)

**Cloud Functions (`functions/index.js`):**
- `onMemberJoined` trigger detects:
  - New join requests → Notifies leader
  - New members → Notifies existing members
  - New guests → Notifies guest + members

**Files Modified:**
| File | Changes |
|------|---------|
| `/modules/groups/my-groups.js` | Join requests, guests, badges, member management |
| `/modules/groups/group-chat.js` | Membership verification, showMembers fix |
| `/functions/index.js` | Guest notifications, logging |
| `/index.html` | Groups nav badge, guest groups section |

---

## 🔄 Background: OT Quick Insights Generation

**Status:** Running in background (independent of Claude)
**Script:** `/scripts/run-ot-generation.sh`
**Log:** `/scripts/logs/background-generation.log`

**Monitor:**
```bash
tail -f /Volumes/Wotg\ Drive\ Mike/GitHub/Go-Mission/scripts/logs/background-generation.log
```

**Books Being Generated:** 36 OT books
- Uses GPT-4o-mini
- Detailed 4-section format (Understanding, Living It Out, God's Love, Reflection)
- Bilingual (English + Tagalog)
- Skips verses that already have insights

---

## Key Files Reference

### Groups System
| File | Purpose |
|------|---------|
| `/modules/groups/my-groups.js` | Upline/Downline/Guest groups, join requests |
| `/modules/groups/group-chat.js` | Real-time chat with membership checks |
| `/modules/groups/group-meeting.js` | Jitsi video meetings |
| `/modules/groups/groups.js` | Legacy group management |

### Cloud Functions
| Function | Trigger |
|----------|---------|
| `onMemberJoined` | Group document update - handles join requests, new members, guests |
| `onNewChatMessage` | New chat message - sends notifications |
| `sendCustomNotification` | Callable - for manual notifications |

### Firebase Collections
| Collection | Purpose |
|------------|---------|
| `goMission_members` | User profiles, FCM tokens, uplineGroupId, guestGroups |
| `goMission_groups` | Groups with members[], guests[], joinRequests[] |
| `goMission_chats` | Group chat messages |

---

## Recent Changes Summary

### Join Request Flow
```
User enters code → joinWithCode() → 
  Creates joinRequest in group → 
  Cloud Function notifies leader →
  Leader sees badge →
  Leader opens View Members →
  Leader approves as Member/Guest →
  User added to members[] or guests[] →
  Cloud Function notifies user →
  User can access group
```

### Group Access Check
```javascript
// Check if user can access group
const isMember = group.members?.includes(userId);
const isGuest = group.guests?.some(g => g.odId === userId);
const canAccess = isMember || isGuest;
```

### Badge System
```javascript
// Real-time listener for pending requests
window.onSnapshot(groupsQuery, (snapshot) => {
  this.downlineGroups = snapshot.docs.map(...);
  this.updateBadges();  // Updates nav + button badges
});
```

---

## Development Notes

### Testing Join Requests
1. Get invite code from leader's group
2. Log in as different user
3. Enter code → Should see "Request sent" message
4. Leader should see badge appear (real-time)
5. Leader opens View Members → Approves
6. User refreshes → Should see group

### Testing Guest Access
1. Approve user as "Guest" instead of "Member"
2. User should see group in "Guest Groups" section
3. User can chat and join meetings
4. User cannot invite others
5. User can "Leave as Guest"

### Common Issues
- **"Group not found"** → Check if `guestGroups` array is being searched
- **Badge not appearing** → Check `onSnapshot` listener is active
- **Notification not received** → Check FCM tokens in Firestore

---

## Git Commits This Session
```
56e3207 Fix: Guest users can now join meetings and open group chat
c6b1b5d Fix: Guest users can now see and access their guest groups
e7da052 Fix: View Members now shows pending requests at top
a2c6c68 Add logging to join request Cloud Function for debugging
772cfa6 Add: Join request badges + real-time updates
f180eb3 Fix: Group chat members list and count
8709df8 Fix: Removed member's group card disappears immediately
0d91da7 Fix: Member management - show names, add remove button, verify membership
ef28fec Fix: Join requests with member/guest approval + notifications
```
