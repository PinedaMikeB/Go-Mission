# Go Mission - Database Schema

## Firebase Project
- **Project ID:** shaped-by-grace
- **Console:** https://console.firebase.google.com/project/shaped-by-grace

---

## Collections Overview

```
firestore/
├── goMission_members/          # All users (seekers to leaders)
├── goMission_groups/           # Mission Groups
├── goMission_training/         # Mission Training batches
├── goMission_debriefs/         # Weekly debriefs
├── goMission_materials/        # Discussion guide series
├── goMission_modules/          # Individual lesson modules
├── goMission_contacts/         # Contact/follow-up logs
└── goMission_settings/         # App settings & config
```

*Note: Using `goMission_` prefix to namespace within shared Firebase project*

---

## Collection: goMission_members

```javascript
goMission_members/{memberId}
{
  // Basic Info
  id: "member_uuid",
  name: "Maria Santos",
  email: "maria@email.com",
  phone: "+639171234567",
  messenger: "m.me/maria.santos",
  photoURL: "https://...",
  
  // Location
  location: {
    type: "ofw",                    // "philippines" | "ofw" | "immigrant" | "other"
    country: "Saudi Arabia",
    city: "Riyadh",
    timezone: "GMT+3"
  },
  
  // Journey Stage
  stage: "disciple-maker",          // "seeker" | "believer" | "disciple" | "disciple-maker" | "coach" | "leader"
  
  // Roles (can have multiple)
  roles: {
    isMissionary: true,             // Everyone
    isGroupLeader: true,            // Leads a Mission Group
    isTrainer: false,               // Facilitates Mission Training
    isShepherd: false,              // Oversees multiple groups
    isWelcomeTeam: false,           // Handles new seekers
    isAdmin: false                  // Full access
  },
  
  // Mission Group Membership
  groupId: "group_mon_8pm_manila",  // Current Mission Group
  groupRole: "leader",              // "member" | "leader" | "apprentice"
  
  // Discipleship Tree
  discipledBy: "member_uuid",       // Who discipled them
  discipling: ["member_uuid", ...], // Who they're discipling
  generationDepth: 3,               // How deep in the tree (auto-calculated)
  
  // Mission Training Progress
  training: {
    currentPhase: 2,
    phases: {
      phase1: {
        status: "completed",        // "locked" | "enrolled" | "in_progress" | "completed"
        batchId: "batch_p1_2024_oct",
        enrolledDate: timestamp,
        completedDate: timestamp,
        sessionsAttended: [1,2,3,4,5,6,7,8],
        exitRequirementMet: true,
        exitRequirementMetDate: timestamp
      },
      phase2: {
        status: "in_progress",
        batchId: "batch_p2_2025_jan",
        enrolledDate: timestamp,
        sessionsAttended: [1,2,3,4,5],
        exitRequirementMet: false
      },
      phase3: { status: "locked" },
      phase4: { status: "locked" }
    }
  },
  
  // Key Dates
  joinedAsSeeker: timestamp,        // When they first responded
  believedDate: timestamp,          // When they received Christ
  baptizedDate: timestamp,          // If applicable
  startedDisciplingDate: timestamp, // When they first discipled someone
  becameLeaderDate: timestamp,      // When they became a group leader
  
  // Status
  status: "active",                 // "active" | "inactive" | "paused"
  lastActiveDate: timestamp,
  
  // Metadata
  createdAt: timestamp,
  updatedAt: timestamp,
  createdBy: "member_uuid",         // Usually welcome team
  source: "youtube_comment"         // "youtube" | "facebook" | "messenger" | "referral"
}
```

---

## Collection: goMission_groups

```javascript
goMission_groups/{groupId}
{
  id: "group_mon_8pm_manila",
  name: "Monday 8PM Manila",
  
  // Schedule
  schedule: {
    day: "monday",                  // "monday" | "tuesday" | etc.
    time: "20:00",
    timezone: "GMT+8",
    platform: "zoom",               // "zoom" | "messenger" | "google_meet"
    meetingLink: "https://zoom.us/j/..."
  },
  
  // Context
  context: "mixed",                 // "philippines" | "ofw" | "immigrant" | "mixed"
  countries: ["Philippines", "Saudi Arabia", "UAE"],
  language: "tagalog",
  
  // Leadership
  leaderId: "member_uuid",
  apprenticeId: "member_uuid",      // Future leader being trained
  
  // Capacity
  capacity: 12,
  currentCount: 8,
  
  // Current Study
  currentSeries: "foundations",
  currentWeek: 4,
  
  // Health Metrics (auto-calculated)
  health: {
    avgAttendance: 0.75,            // Last 4 weeks
    debriefSubmissionRate: 0.85,
    lastMeetingDate: timestamp,
    consecutiveMeetings: 12,
    missedMeetings: 0
  },
  
  // Status
  status: "active",                 // "active" | "paused" | "multiplying" | "closed"
  
  // Metadata
  createdAt: timestamp,
  updatedAt: timestamp,
  parentGroupId: "group_uuid",      // If multiplied from another group
  childGroups: ["group_uuid", ...]  // Groups that multiplied from this one
}
```

---

## Collection: goMission_training

```javascript
goMission_training/{batchId}
{
  id: "batch_p1_2025_jan",
  
  // Phase Info
  phase: 1,
  phaseName: "Recruit",
  phaseTagline: "Know Your Commander & Your Mission",
  
  // Schedule
  schedule: {
    day: "tuesday",
    time: "20:00",
    timezone: "GMT+8",
    platform: "zoom",
    startDate: timestamp,
    endDate: timestamp
  },
  
  // Sessions
  totalSessions: 8,
  currentSession: 5,
  sessions: [
    { number: 1, date: timestamp, topic: "Know Your Commander: God", completed: true },
    { number: 2, date: timestamp, topic: "Know Your Captain: Jesus", completed: true },
    // ... etc
  ],
  
  // Participants
  facilitatorId: "member_uuid",
  participants: ["member_uuid", ...],
  participantCount: 15,
  
  // Status
  status: "ongoing",                // "upcoming" | "ongoing" | "completed"
  
  // Metadata
  createdAt: timestamp,
  updatedAt: timestamp
}
```

---

## Collection: goMission_debriefs

```javascript
goMission_debriefs/{debriefId}
{
  id: "debrief_uuid",
  
  // Who & When
  memberId: "member_uuid",
  weekOf: "2025-01-13",             // Monday of that week
  submittedAt: timestamp,
  
  // Quiet Time
  daysWithGod: 5,                   // 0-7
  godShowedMe: "He reminded me of His faithfulness...",
  
  // Mission Group Attendance
  attendedHuddle: true,
  missedReason: null,               // If missed: "sick" | "work" | "travel" | "other"
  
  // Bold Steps
  sharedGospel: true,
  sharedGospelDetails: "Shared with coworker during lunch...",
  recruited: false,
  recruitedDetails: null,
  
  // Wins & Struggles
  winsOrStruggles: "Struggling with consistency in prayer...",
  
  // For Leaders: Group Report
  isLeaderReport: true,             // If they're a group leader
  groupReport: {
    groupId: "group_uuid",
    didMeet: true,
    attendees: ["member_uuid", ...],
    topicUsed: "foundations_week4", // or "other" | "open_sharing"
    customTopic: null,
    highlight: "Pedro shared that he started having daily QT!",
    concerns: "Juan has been absent 2 weeks",
    noMeetingReason: null           // If didn't meet
  },
  
  // Metadata
  createdAt: timestamp
}
```

---

## Collection: goMission_materials

```javascript
goMission_materials/{seriesId}
{
  id: "foundations",
  title: "Foundations",
  description: "8-week series for new believers",
  coverImage: "https://...",
  totalWeeks: 8,
  
  // Weeks
  weeks: [
    {
      weekNumber: 1,
      title: "Who is Jesus?",
      
      // Facilitator's Guide
      facilitatorGuide: {
        goal: "Help members understand who Jesus truly is...",
        timeline: [
          { activity: "Opening/icebreaker", minutes: 5 },
          { activity: "Scripture reading", minutes: 5 },
          { activity: "Discussion", minutes: 25 },
          { activity: "Prayer/closing", minutes: 10 }
        ],
        openingQuestion: "What did you know about Jesus before?",
        openingTip: "Let everyone share briefly...",
        scriptures: ["John 1:1-14", "Colossians 1:15-20"],
        scriptureInstructions: "Have someone read aloud...",
        questions: [
          {
            question: "What do these verses tell us about Jesus?",
            leaderNotes: "He is God, Creator, before all things...",
            tip: null
          },
          // ... more questions
        ],
        watchOutFor: ["Some may have wrong views about Jesus..."],
        takeHome: {
          challenge: "This week, thank Jesus for who He is...",
          tip: "Ask them to share next week what they thanked Him for"
        },
        closingPrayer: ["Thank God for Jesus", "Ask for deeper revelation"]
      },
      
      // Participant's Guide
      participantGuide: {
        focus: "Who is Jesus and why does it matter?",
        scriptures: ["John 1:1-14", "Colossians 1:15-20"],
        questions: [
          "What did you know about Jesus before?",
          "What do these verses tell us about Jesus?",
          "How does knowing who Jesus is change your life?"
        ],
        takeHome: "This week, thank Jesus for who He is..."
      }
    },
    // ... more weeks
  ],
  
  // Metadata
  status: "active",                 // "draft" | "active" | "archived"
  createdAt: timestamp,
  updatedAt: timestamp
}
```

---

## Collection: goMission_contacts

```javascript
goMission_contacts/{contactId}
{
  id: "contact_uuid",
  
  // Who was contacted
  memberId: "member_uuid",
  
  // Who made contact
  contactedBy: "member_uuid",
  
  // Details
  date: timestamp,
  method: "call",                   // "call" | "message" | "video" | "in_person"
  notes: "Called to check in. She's recovering from flu, will join next week.",
  
  // Outcome
  outcome: "positive",              // "positive" | "neutral" | "concern" | "unreachable"
  followUpNeeded: false,
  followUpDate: null,
  
  // Context
  reason: "missed_huddle",          // "missed_huddle" | "stuck_phase" | "inactive" | "care" | "other"
  
  // Metadata
  createdAt: timestamp
}
```

---

## Collection: goMission_settings

```javascript
goMission_settings/config
{
  // Training Schedule
  trainingSchedule: {
    phase1: { day: "tuesday", time: "20:00" },
    phase2: { day: "wednesday", time: "20:00" },
    phase3: { day: "thursday", time: "20:00" },
    phase4: { day: "friday", time: "20:00" }
  },
  
  // Phase Requirements
  phaseRequirements: {
    phase1: { type: "has_disciples", minimum: 1 },
    phase2: { type: "has_generations", minimum: 2 },
    phase3: { type: "group_outreach", minimum: 1 },
    phase4: { type: "launched_group", minimum: 1 }
  },
  
  // Connection Status Thresholds
  connectionThresholds: {
    connected: 14,                  // Days - green
    checkIn: 21,                    // Days - yellow
    reachOut: 28                    // Days - red
  },
  
  // App Settings
  currentMaterialsSeries: "foundations",
  currentMaterialsWeek: 4,
  
  // Metadata
  updatedAt: timestamp,
  updatedBy: "member_uuid"
}
```

---

## Indexes Required

```javascript
// For querying members by group
goMission_members: groupId, stage

// For querying members by discipler
goMission_members: discipledBy

// For querying debriefs by member and week
goMission_debriefs: memberId, weekOf

// For querying debriefs by group (leader reports)
goMission_debriefs: groupReport.groupId, weekOf

// For querying contacts by member
goMission_contacts: memberId, date DESC

// For querying training batches
goMission_training: phase, status
```

---

## Security Rules (Basic)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Go Mission collections - require authentication
    match /goMission_members/{docId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
    
    match /goMission_groups/{docId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
    
    match /goMission_training/{docId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
    
    match /goMission_debriefs/{docId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
    
    match /goMission_materials/{docId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
    
    match /goMission_contacts/{docId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
    
    match /goMission_settings/{docId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
  }
}
```

---

*This schema supports all Go Mission features. Update as needed during development.*
