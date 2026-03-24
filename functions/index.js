/**
 * Go Mission - Firebase Cloud Functions (v2)
 * Push Notification System with Badge Support
 * Password Reset with Email Verification Codes
 */

const { onDocumentCreated, onDocumentUpdated } = require('firebase-functions/v2/firestore');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { getMessaging } = require('firebase-admin/messaging');
const { getAuth } = require('firebase-admin/auth');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

initializeApp();

const db = getFirestore();
const messaging = getMessaging();
const adminAuth = getAuth();
const ADMIN_UID_ALLOWLIST = new Set([
  '9zVKHJ11zaXD0f4GI6P7LHD6re32'
]);
const ADMIN_EMAIL_ALLOWLIST = new Set([
  'michael.marga@gmail.com',
  'vasquezperlie18@gmail.com'
]);

const SYSTEM_TEMPLATE_SOURCE = 'system_scheduler';
const MEMBER_NOTIFICATIONS_SUBCOLLECTION = 'notifications';
const ADMIN_NOTIFICATIONS_COLLECTION = 'goMission_adminNotifications';
const STAGE_ENCOURAGEMENT_RUNS_COLLECTION = 'goMission_stageEncouragementRuns';
const DAILY_ACTIVITY_COLLECTION = 'goMission_dailyActivity';
const MAX_FCM_TOKENS_PER_USER = 4;
const MOTIVATION_NOTIFICATION_TAG = 'motivation_conversation_time';
const MOTIVATION_TIMEZONE = 'Asia/Manila';
const MOTIVATION_START_DATE_KEY = '2026-03-06';
const MOTIVATION_TRIGGER_EVERY_DAYS = 2;
const MOTIVATION_ROTATION_STATE_DOC = 'notificationRotation_motivationConversationTime';
const JOIN_GROUP_NOTIFICATION_TAG = 'join_mission_group_sequence';
const JOIN_GROUP_ROTATION_STATE_DOC = 'notificationRotation_joinMissionGroupSequence';
const JOIN_GROUP_TIMEZONE = 'Asia/Manila';
const STAGE_ENCOURAGEMENT_TIMEZONE = 'Asia/Manila';
const STAGE_ENCOURAGEMENT_NOTIFICATION_TAG_PREFIX = 'stage_encouragement_';

const JOIN_GROUP_MESSAGES = [
  '🛡️ You are called! Step into your God-given purpose today. The mission awaits!',
  '⚔️ We are soldiers of Christ. Put on your armor today and share His light.',
  '🌍 God has a specific mission only you can fulfill. Ready to step up?',
  '✨ Your everyday life is your mission field. Who can you encourage today?',
  '📖 The Word is alive! Share a simple truth with someone today and watch it work.',
  '🔥 You are not here by accident. You are chosen for such a time as this!',
  '🤝 We go further together. Jump into the app and connect with your group today!',
  '👑 You represent the King. Walk in confidence and grace today.',
  "💡 Do not hide your light! Someone in your world needs the hope you carry.",
  '🛡️ A soldier does not fight alone. Stand strong with your Go Mission family today!',
  '👣 Every step of obedience is a victory. What is God asking you to do today?',
  "🗣️ Keep it simple. Sharing God's love does not have to be complicated.",
  '🌱 Seeds planted today bring a harvest tomorrow. Keep sharing the Word!',
  '⚓ Anchored in truth, ready for action. Let us impact the world today!',
  '🗓️ Halfway through the month! Stay focused. Your daily mission matters.',
  "🦅 Rise above the noise. Take a moment to listen to the Commander's voice today.",
  '💬 A simple conversation can change a destiny. Who will you talk to today?',
  '🛡️ Faith is our shield. March forward knowing God goes before you!',
  '❤️ Love is our greatest weapon. Show radical kindness to someone today.',
  '🗺️ Your community is your assignment. Be a blessing right where you are.',
  '⚔️ The battle belongs to the Lord, but He calls us to stand on the front lines.',
  '🌅 New day, new mercies, new opportunities for the Kingdom. Let us go!',
  '📖 Truth transforms. Open the app and share a verse that encouraged you recently.',
  '🙌 We are called to be fishers of men. Cast your net today!',
  '💪 You are equipped for every good work. Do not doubt what God has placed inside you.',
  '🌟 Be the salt and light today. Your presence brings flavor and hope.',
  '🏃‍♂️ Run the race with endurance. The eternal reward is worth the daily mission.',
  '🗣️ Your testimony is powerful. Do not be afraid to share your story!',
  '🌍 The world needs the gospel. Thank you for being a willing messenger.',
  '🎺 The call never stops! Stay engaged, stay equipped, and keep making disciples.'
];

const MOTIVATION_MESSAGES = [
  "Start your day with Jesus. Even 5 minutes of quiet conversation with God can change everything.",
  "Pause. Breathe. Talk to God. He's always listening.",
  "Your time with God today matters more than anything else on your schedule.",
  "Don't let the day end without having your 'Conversation Time' with the One who loves you most.",
  "Even when you're busy, God isn't. He's waiting to talk to you.",
  "A day started with God is a day led by peace. Don't skip your 'Conversation Time.'",
  "God's not asking for perfection, just connection. Talk to Him today.",
  "Your heart needs God more than your phone needs Wi-Fi. Connect through prayer.",
  "Life is noisy, but God's voice brings clarity. Make time to listen today.",
  "Don't just talk about prayer. Actually pray. Start now.",
  "Trade worry for worship. Talk to God about what's on your heart.",
  "God misses you when you don't show up. Take 10 minutes for Him today.",
  "Nothing is more powerful than a consistent prayer life. Start with today.",
  "Reset your soul - one prayer at a time. Prioritize God today.",
  "Jesus took time to pray. So should we.",
  "Prayer isn't a task - it's a relationship. Go have that conversation.",
  "Let God speak into your plans. Start your day with Him.",
  "Busy day? All the more reason to talk to God first.",
  "Don't run on empty. Fill up with God's presence today.",
  "Prayer time is soul care. Make space for it.",
  "When you give God your attention, He gives you direction.",
  "Prayer isn't a last resort. It's your first response.",
  "God desires time with you more than anything you could ever do for Him.",
  "Before you talk to the world, talk to God.",
  "One whisper to God can calm your heart. Don't skip today's moment with Him.",
  "You don't need fancy words - just a willing heart. Talk to Him today.",
  "Interrupt your scrolling for a moment of prayer.",
  "Prayer doesn't have to be long to be powerful. Start the conversation.",
  "God's presence is your safe space. Run there today.",
  "You'll never regret spending time with God. Do it now."
];

const DEFAULT_STAGE_ENCOURAGEMENT_TEMPLATES = [
  {
    id: 'stage_encouragement_seeker_group_01',
    title: 'Grow with others',
    body: 'Growth is stronger in community. Join a mission group this week and let others walk with you.',
    category: 'stage_encouragement',
    notificationTag: 'stage_encouragement_seeker',
    rotationGroup: 'stage_encouragement_seeker',
    audienceStage: 'seeker',
    focusArea: 'group',
    verseReference: 'Hebrews 10:24-25',
    verseText: 'Let us consider how we may spur one another on toward love and good deeds... not giving up meeting together.',
    sequence: 1
  },
  {
    id: 'stage_encouragement_seeker_training_02',
    title: 'Take the next step on Wednesday',
    body: 'Attend training this Wednesday and let God sharpen your faith with truth, practice, and community.',
    category: 'stage_encouragement',
    notificationTag: 'stage_encouragement_seeker',
    rotationGroup: 'stage_encouragement_seeker',
    audienceStage: 'seeker',
    focusArea: 'training',
    verseReference: '2 Timothy 2:15',
    verseText: 'Do your best to present yourself to God as one approved... who correctly handles the word of truth.',
    sequence: 2
  },
  {
    id: 'stage_encouragement_seeker_bible_03',
    title: 'Open the Word today',
    body: 'You do not need to know everything to begin. Read one passage today and ask God what He wants you to obey.',
    category: 'stage_encouragement',
    notificationTag: 'stage_encouragement_seeker',
    rotationGroup: 'stage_encouragement_seeker',
    audienceStage: 'seeker',
    focusArea: 'bible',
    verseReference: 'Psalm 119:105',
    verseText: 'Your word is a lamp for my feet, a light on my path.',
    sequence: 3
  },
  {
    id: 'stage_encouragement_disciple_group_01',
    title: 'Love people enough to lead',
    body: 'Your next growth step is not only receiving. Start preparing to lead a discipleship group and care for others well.',
    category: 'stage_encouragement',
    notificationTag: 'stage_encouragement_disciple',
    rotationGroup: 'stage_encouragement_disciple',
    audienceStage: 'disciple',
    focusArea: 'group',
    verseReference: 'John 13:34-35',
    verseText: 'Love one another. As I have loved you, so you must love one another.',
    sequence: 1
  },
  {
    id: 'stage_encouragement_disciple_training_02',
    title: 'Keep showing up for training',
    body: 'Training forms conviction and clarity. Keep attending and let God prepare you to guide others faithfully.',
    category: 'stage_encouragement',
    notificationTag: 'stage_encouragement_disciple',
    rotationGroup: 'stage_encouragement_disciple',
    audienceStage: 'disciple',
    focusArea: 'training',
    verseReference: 'Luke 6:40',
    verseText: 'Everyone who is fully trained will be like their teacher.',
    sequence: 2
  },
  {
    id: 'stage_encouragement_disciple_mission_03',
    title: 'Start thinking of one person',
    body: 'Ask God for one person you can encourage, pray for, and begin discipling this month.',
    category: 'stage_encouragement',
    notificationTag: 'stage_encouragement_disciple',
    rotationGroup: 'stage_encouragement_disciple',
    audienceStage: 'disciple',
    focusArea: 'mission',
    verseReference: 'Matthew 28:19',
    verseText: 'Go and make disciples of all nations.',
    sequence: 3
  },
  {
    id: 'stage_encouragement_disciple_maker_leadership_01',
    title: 'Do not stay an attender',
    body: 'A disciple-maker does more than gather. Train, notice, and mentor the people God has already placed around you.',
    category: 'stage_encouragement',
    notificationTag: 'stage_encouragement_disciple_maker',
    rotationGroup: 'stage_encouragement_disciple_maker',
    audienceStage: 'disciple-maker',
    focusArea: 'leadership',
    verseReference: '2 Timothy 2:2',
    verseText: 'Entrust to reliable people who will also be qualified to teach others.',
    sequence: 1
  },
  {
    id: 'stage_encouragement_disciple_maker_prayer_02',
    title: 'Pray over future leaders',
    body: 'Pray specifically for the members under you. Ask God who is ready for deeper responsibility and follow-up.',
    category: 'stage_encouragement',
    notificationTag: 'stage_encouragement_disciple_maker',
    rotationGroup: 'stage_encouragement_disciple_maker',
    audienceStage: 'disciple-maker',
    focusArea: 'prayer',
    verseReference: 'Luke 10:2',
    verseText: 'Ask the Lord of the harvest... to send out workers into his harvest field.',
    sequence: 2
  },
  {
    id: 'stage_encouragement_builder_leadership_01',
    title: 'Build leaders on purpose',
    body: 'You are now shaping leaders, not only members. Coach them, release them, and help them carry responsibility.',
    category: 'stage_encouragement',
    notificationTag: 'stage_encouragement_builder',
    rotationGroup: 'stage_encouragement_builder',
    audienceStage: 'builder',
    focusArea: 'leadership',
    verseReference: 'Exodus 18:21',
    verseText: 'Select capable men... and appoint them as officials.',
    sequence: 1
  },
  {
    id: 'stage_encouragement_builder_mission_02',
    title: 'Mobilize the whole network',
    body: 'Think in terms of movement. What concrete activity can help your groups share the gospel and multiply this week?',
    category: 'stage_encouragement',
    notificationTag: 'stage_encouragement_builder',
    rotationGroup: 'stage_encouragement_builder',
    audienceStage: 'builder',
    focusArea: 'mission',
    verseReference: '1 Corinthians 3:6',
    verseText: 'I planted the seed, Apollos watered it, but God has been making it grow.',
    sequence: 2
  },
  {
    id: 'stage_encouragement_multiplier_leadership_01',
    title: 'Strengthen leaders under your cluster',
    body: 'Multipliers do not carry everything alone. Strengthen builders and disciple-makers so the mission keeps spreading.',
    category: 'stage_encouragement',
    notificationTag: 'stage_encouragement_multiplier',
    rotationGroup: 'stage_encouragement_multiplier',
    audienceStage: 'multiplier',
    focusArea: 'leadership',
    verseReference: 'Titus 1:5',
    verseText: 'Appoint elders in every town, as I directed you.',
    sequence: 1
  },
  {
    id: 'stage_encouragement_multiplier_bible_02',
    title: 'Keep studying the Word deeply',
    body: 'Your influence is wide, so your roots must go deep. Keep studying Scripture carefully and leading from truth.',
    category: 'stage_encouragement',
    notificationTag: 'stage_encouragement_multiplier',
    rotationGroup: 'stage_encouragement_multiplier',
    audienceStage: 'multiplier',
    focusArea: 'bible',
    verseReference: 'Ezra 7:10',
    verseText: 'Ezra had devoted himself to the study and observance of the Law of the Lord, and to teaching.',
    sequence: 2
  }
];

function getManilaDateKey(input = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: MOTIVATION_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatter.format(input);
}

function dateKeyToUtcMs(dateKey) {
  const raw = String(dateKey || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  return Date.parse(`${raw}T00:00:00Z`);
}

function getDayDiff(startDateKey, endDateKey) {
  const startMs = dateKeyToUtcMs(startDateKey);
  const endMs = dateKeyToUtcMs(endDateKey);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return null;
  return Math.floor((endMs - startMs) / 86400000);
}

function isCadenceDay({ todayKey, startDateKey, everyDays }) {
  const cadence = Math.max(1, Number(everyDays || 1));
  const dayDiff = getDayDiff(startDateKey, todayKey);
  if (dayDiff === null || dayDiff < 0) return false;
  return dayDiff % cadence === 0;
}

function clampNumber(value, min, max, fallback) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(max, Math.max(min, num));
}

function randomInt(min, max) {
  const low = Math.min(min, max);
  const high = Math.max(min, max);
  return Math.floor(Math.random() * ((high - low) + 1)) + low;
}

function getDefaultStageEncouragementScheduleConfig() {
  return {
    nextSendAt: buildRandomStageEncouragementNextSendAt({
      minGapDays: 2,
      maxGapDays: 6,
      sendHourStart: 8,
      sendHourEnd: 20,
      timezone: STAGE_ENCOURAGEMENT_TIMEZONE
    }),
    loopEnabled: true,
    minGapDays: 2,
    maxGapDays: 6,
    sendHourStart: 8,
    sendHourEnd: 20,
    timezone: STAGE_ENCOURAGEMENT_TIMEZONE
  };
}

function buildRandomStageEncouragementNextSendAt(config = {}) {
  const minGapDays = clampNumber(config.minGapDays, 1, 30, 2);
  const maxGapDays = clampNumber(config.maxGapDays, minGapDays, 60, Math.max(6, minGapDays));
  const sendHourStart = clampNumber(config.sendHourStart, 0, 23, 8);
  const sendHourEnd = clampNumber(config.sendHourEnd, sendHourStart, 23, Math.max(20, sendHourStart));
  const now = new Date();
  const next = new Date(now.getTime() + (randomInt(minGapDays, maxGapDays) * 86400000));
  const randomHour = randomInt(sendHourStart, sendHourEnd);
  const randomMinute = randomInt(0, 59);

  if (String(config.timezone || STAGE_ENCOURAGEMENT_TIMEZONE).trim() === 'Asia/Manila') {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: STAGE_ENCOURAGEMENT_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    const dateKey = formatter.format(next);
    return new Date(`${dateKey}T${String(randomHour).padStart(2, '0')}:${String(randomMinute).padStart(2, '0')}:00+08:00`).toISOString();
  }

  next.setHours(randomHour, randomMinute, 0, 0);
  return next.toISOString();
}

function normalizeStageEncouragementScheduleConfig(raw = {}, options = {}) {
  const fallback = getDefaultStageEncouragementScheduleConfig();
  const config = (raw && typeof raw === 'object') ? raw : {};
  const minGapDays = clampNumber(config.minGapDays, 1, 30, fallback.minGapDays);
  const maxGapDays = clampNumber(config.maxGapDays, minGapDays, 60, Math.max(fallback.maxGapDays, minGapDays));
  const sendHourStart = clampNumber(config.sendHourStart, 0, 23, fallback.sendHourStart);
  const sendHourEnd = clampNumber(config.sendHourEnd, sendHourStart, 23, Math.max(fallback.sendHourEnd, sendHourStart));
  const timezone = String(config.timezone || fallback.timezone || STAGE_ENCOURAGEMENT_TIMEZONE).trim() || STAGE_ENCOURAGEMENT_TIMEZONE;
  const nextSendAt = String(config.nextSendAt || '').trim();

  return {
    nextSendAt: nextSendAt || buildRandomStageEncouragementNextSendAt({ minGapDays, maxGapDays, sendHourStart, sendHourEnd, timezone }),
    loopEnabled: options.forceLoopEnabled === true ? true : config.loopEnabled !== false,
    minGapDays,
    maxGapDays,
    sendHourStart,
    sendHourEnd,
    timezone,
    lastSentAt: config.lastSentAt || null,
    lastRecipientCount: Number(config.lastRecipientCount || 0)
  };
}

function normalizeJourneyStageValue(stage = '') {
  const raw = String(stage || '').trim().toLowerCase();
  if (!raw) return 'seeker';
  if (raw === 'believer' || raw === 'on the journey') return 'disciple';
  if (raw === 'discipler') return 'disciple-maker';
  return raw;
}

function formatJourneyStageLabel(stage = '') {
  const normalized = normalizeJourneyStageValue(stage);
  switch (normalized) {
    case 'disciple-maker':
      return 'Disciple-Maker';
    case 'builder':
      return 'Builder';
    case 'multiplier':
      return 'Multiplier';
    case 'disciple':
      return 'Disciple';
    default:
      return 'Seeker';
  }
}

function hasConfirmedGroupMembership(memberData = {}) {
  if (!memberData || typeof memberData !== 'object') return false;
  return Boolean(
    String(memberData.groupId || '').trim() ||
    String(memberData.uplineGroupId || '').trim()
  );
}

function getSafeProfileName(memberData = {}) {
  const displayName = String(
    memberData.displayName ||
    memberData.name ||
    memberData.fullName ||
    ''
  ).trim();
  if (displayName) return displayName;
  const email = String(memberData.email || '').trim();
  if (email && email.includes('@')) return email.split('@')[0];
  return 'Someone';
}

async function getAdminRecipientIds({ excludeUserId = '' } = {}) {
  const adminIds = new Set([...ADMIN_UID_ALLOWLIST]);
  try {
    const usersSnapshot = await db.collection('goMission_members').get();
    usersSnapshot.forEach((docSnap) => {
      const member = docSnap.data() || {};
      const roles = (member.roles && !Array.isArray(member.roles)) ? member.roles : {};
      const roleList = Array.isArray(member.roles) ? member.roles : [];
      const email = String(member.email || '').toLowerCase().trim();
      const isAdmin = Boolean(
        roles.isAdmin ||
        roleList.includes('admin') ||
        ADMIN_UID_ALLOWLIST.has(docSnap.id) ||
        ADMIN_EMAIL_ALLOWLIST.has(email)
      );
      if (isAdmin) {
        adminIds.add(docSnap.id);
      }
    });
  } catch (error) {
    console.warn('[AdminRecipients] Could not query member list:', error);
  }

  if (excludeUserId) {
    adminIds.delete(String(excludeUserId));
  }

  return [...adminIds];
}

async function assertAdminCaller(request) {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be logged in');
  }

  const callerEmail = String(request.auth.token?.email || '').toLowerCase().trim();
  if (ADMIN_UID_ALLOWLIST.has(request.auth.uid) || ADMIN_EMAIL_ALLOWLIST.has(callerEmail)) {
    return { uid: request.auth.uid, email: callerEmail, isAdmin: true };
  }

  const callerDoc = await db.collection('goMission_members').doc(request.auth.uid).get();
  const callerData = callerDoc.exists ? (callerDoc.data() || {}) : {};
  const roles = (callerData.roles && !Array.isArray(callerData.roles)) ? callerData.roles : {};
  const roleList = Array.isArray(callerData.roles) ? callerData.roles : [];
  const isAdmin = !!roles.isAdmin || roleList.includes('admin');

  if (!isAdmin) {
    throw new HttpsError('permission-denied', 'Admin access required');
  }

  return { uid: request.auth.uid, email: callerEmail, isAdmin: true };
}

function getLinkedUserId(entry) {
  if (!entry) return '';
  if (typeof entry === 'string') return entry.trim();
  return String(entry.odId || entry.uid || entry.id || entry.userId || entry.memberId || '').trim();
}

async function deleteMemberNotificationInbox(userId) {
  const inboxSnap = await db
    .collection('goMission_members')
    .doc(userId)
    .collection(MEMBER_NOTIFICATIONS_SUBCOLLECTION)
    .get();

  if (inboxSnap.empty) return 0;

  let deletedCount = 0;
  let batch = db.batch();
  let batchSize = 0;

  for (const docSnap of inboxSnap.docs) {
    batch.delete(docSnap.ref);
    batchSize += 1;
    deletedCount += 1;
    if (batchSize >= 400) {
      await batch.commit();
      batch = db.batch();
      batchSize = 0;
    }
  }

  if (batchSize > 0) {
    await batch.commit();
  }

  return deletedCount;
}

async function cleanupUserGroupMembershipLinks(userId) {
  const groupsSnap = await db.collection('goMission_groups').get();
  let updatedGroups = 0;

  for (const docSnap of groupsSnap.docs) {
    const group = docSnap.data() || {};
    if (String(group.leaderId || '').trim() === userId) continue;

    const rawMembers = Array.isArray(group.members) ? group.members : [];
    const rawGuests = Array.isArray(group.guests) ? group.guests : [];
    const rawJoinRequests = Array.isArray(group.joinRequests) ? group.joinRequests : [];
    const rawPendingRequests = Array.isArray(group.pendingRequests) ? group.pendingRequests : [];

    const nextMembers = rawMembers.filter((entry) => getLinkedUserId(entry) !== userId);
    const nextGuests = rawGuests.filter((entry) => getLinkedUserId(entry) !== userId);
    const nextJoinRequests = rawJoinRequests.filter((entry) => getLinkedUserId(entry) !== userId);
    const nextPendingRequests = rawPendingRequests.filter((entry) => getLinkedUserId(entry) !== userId);

    const changed =
      nextMembers.length !== rawMembers.length ||
      nextGuests.length !== rawGuests.length ||
      nextJoinRequests.length !== rawJoinRequests.length ||
      nextPendingRequests.length !== rawPendingRequests.length;

    if (!changed) continue;

    await docSnap.ref.set({
      members: nextMembers,
      guests: nextGuests,
      joinRequests: nextJoinRequests,
      pendingRequests: nextPendingRequests,
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });
    updatedGroups += 1;
  }

  return { updatedGroups };
}

async function upsertSystemNotificationTemplate({
  id,
  title,
  body,
  category = 'announcement',
  deliveryMode = 'one_time',
  notificationTag = '',
  rotationGroup = '',
  sequence = null,
  audienceStage = '',
  focusArea = '',
  verseReference = '',
  verseText = '',
  scheduleConfig = null,
  active = true
}) {
  if (!id || !title || !body) return;
  const ref = db.collection('goMission_notificationTemplates').doc(String(id));
  const snap = await ref.get();
  const existing = snap.exists ? (snap.data() || {}) : {};
  const resolvedScheduleConfig = category === 'stage_encouragement'
    ? normalizeStageEncouragementScheduleConfig(scheduleConfig || existing.scheduleConfig || {}, { forceLoopEnabled: true })
    : (scheduleConfig || existing.scheduleConfig || null);

  const payload = {
    title: String(title).trim(),
    body: String(body).trim(),
    category: category || existing.category || 'announcement',
    source: existing.source || SYSTEM_TEMPLATE_SOURCE,
    approvalStatus: existing.approvalStatus || 'approved',
    usageCount: Number(existing.usageCount || 0),
    deliveryMode: deliveryMode || existing.deliveryMode || 'one_time',
    notificationTag: notificationTag || existing.notificationTag || '',
    rotationGroup: rotationGroup || existing.rotationGroup || '',
    sequence: Number.isFinite(Number(sequence))
      ? Number(sequence)
      : (Number.isFinite(Number(existing.sequence)) ? Number(existing.sequence) : null),
    audienceStage: audienceStage || existing.audienceStage || '',
    focusArea: focusArea || existing.focusArea || '',
    verseReference: verseReference || existing.verseReference || '',
    verseText: verseText || existing.verseText || '',
    scheduleConfig: resolvedScheduleConfig,
    active: active !== false,
    updatedAt: FieldValue.serverTimestamp(),
    updatedByUid: 'system',
    updatedByEmail: 'system@gomission.local'
  };

  if (!snap.exists) {
    payload.createdAt = FieldValue.serverTimestamp();
    payload.createdByUid = 'system';
    payload.createdByEmail = 'system@gomission.local';
  }

  await ref.set(payload, { merge: true });
}

async function ensureSystemNotificationTemplatesSeeded() {
  const staticTemplates = [
    {
      id: 'sys_announcement_journal_update_20260306',
      title: 'Journal Update (March 6, 2026)',
      body: 'Journal now includes Prayer Tracker, improved mobile scrolling, entry view/edit actions, and better answered-prayer follow-up. Please refresh your app for the latest experience.',
      category: 'feature_release',
      deliveryMode: 'one_time',
      notificationTag: 'announcement_release',
      rotationGroup: ''
    },
    {
      id: 'sys_announcement_insights_1th_2th_hag_jon_20260305',
      title: 'New Bible Insights Ready',
      body: 'Insights are now available for 1 Thessalonians, 2 Thessalonians, Haggai, and Jonah. Open Bible and explore these books today.',
      category: 'feature_release',
      deliveryMode: 'one_time',
      notificationTag: 'announcement_release',
      rotationGroup: ''
    },
    {
      id: 'sys_announcement_system_maintenance_repeatable',
      title: 'System Maintenance Advisory',
      body: 'We are running scheduled maintenance to improve app stability. Some features may refresh during the update window. Thank you for your patience.',
      category: 'maintenance',
      deliveryMode: 'repeatable',
      notificationTag: 'announcement_maintenance',
      rotationGroup: 'ops_maintenance'
    }
  ];

  for (const item of staticTemplates) {
    await upsertSystemNotificationTemplate(item);
  }

  for (let i = 0; i < MOTIVATION_MESSAGES.length; i += 1) {
    await upsertSystemNotificationTemplate({
      id: `sys_motivation_conversation_time_${String(i + 1).padStart(2, '0')}`,
      title: 'Conversation Time with God',
      body: MOTIVATION_MESSAGES[i],
      category: 'motivation',
      deliveryMode: 'repeatable',
      notificationTag: MOTIVATION_NOTIFICATION_TAG,
      rotationGroup: 'motivation_conversation_time',
      sequence: i + 1
    });
  }

  for (const item of DEFAULT_STAGE_ENCOURAGEMENT_TEMPLATES) {
    await upsertSystemNotificationTemplate({
      ...item,
      deliveryMode: 'repeatable',
      scheduleConfig: getDefaultStageEncouragementScheduleConfig()
    });
  }
}

async function getMotivationTemplatesFromStore() {
  const snapshot = await db.collection('goMission_notificationTemplates').get();
  return snapshot.docs
    .map((docSnap) => ({ id: docSnap.id, data: docSnap.data() || {} }))
    .filter((item) =>
      item.data.notificationTag === MOTIVATION_NOTIFICATION_TAG &&
      item.data.active !== false
    )
    .sort((a, b) => {
      const seqA = Number(a.data.sequence || 0);
      const seqB = Number(b.data.sequence || 0);
      if (seqA !== seqB) return seqA - seqB;
      return String(a.id).localeCompare(String(b.id));
    });
}

async function isMotivationPushEnabled() {
  try {
    const configDoc = await db.collection('goMission_config').doc('pushSettings').get();
    const config = configDoc.exists ? (configDoc.data() || {}) : {};
    if (config.motivationEnabled === false) return false;
    if (config.devotionEnabled === false) return false;
    return true;
  } catch (error) {
    console.warn('[Motivation] Could not read pushSettings, defaulting to enabled:', error);
    return true;
  }
}

async function getPushSettingsConfig() {
  try {
    const configDoc = await db.collection('goMission_config').doc('pushSettings').get();
    return configDoc.exists ? (configDoc.data() || {}) : {};
  } catch (error) {
    console.warn('[PushSettings] Could not read pushSettings:', error);
    return {};
  }
}

async function isMovementActivityPushEnabled() {
  const config = await getPushSettingsConfig();
  return config.movementActivityEnabled !== false;
}

async function isAdminActivityMirrorEnabled() {
  const config = await getPushSettingsConfig();
  return config.adminActivityMirrorEnabled !== false;
}

async function getActiveMemberRecipientIds({ excludeUserIds = [] } = {}) {
  const excluded = new Set(uniqueUserIds(excludeUserIds));
  const usersSnapshot = await db.collection('goMission_members').get();
  return usersSnapshot.docs
    .map((docSnap) => ({ id: docSnap.id, data: docSnap.data() || {} }))
    .filter((entry) => isActiveProfile(entry.data))
    .map((entry) => entry.id)
    .filter((id) => !excluded.has(id));
}

async function sendMovementActivityNotification(notification = {}, { excludeUserIds = [] } = {}) {
  const enabled = await isMovementActivityPushEnabled();
  if (!enabled) {
    return { successCount: 0, failureCount: 0, errors: [{ error: 'movement_activity_disabled' }] };
  }

  const recipientIds = await getActiveMemberRecipientIds({ excludeUserIds });
  if (!recipientIds.length) {
    return { successCount: 0, failureCount: 0, errors: [] };
  }

  return sendToUsersInBatches(recipientIds, {
    ...notification,
    category: notification.category || 'movement_activity',
    priority: notification.priority || 'normal',
    data: {
      type: 'movement_activity',
      ...(notification.data || {})
    }
  });
}

async function mirrorNotificationToAdmins(notification = {}, { excludeUserId = '' } = {}) {
  const enabled = await isAdminActivityMirrorEnabled();
  if (!enabled) {
    return { successCount: 0, failureCount: 0, errors: [{ error: 'admin_activity_mirror_disabled' }] };
  }

  const adminRecipientIds = await getAdminRecipientIds({ excludeUserId });
  if (!adminRecipientIds.length) {
    return { successCount: 0, failureCount: 0, errors: [] };
  }

  return sendToUsersInBatches(adminRecipientIds, {
    ...notification,
    category: notification.category || 'admin_activity',
    data: {
      type: 'admin_event',
      ...(notification.data || {})
    }
  });
}

// ============================================
// EMAIL CONFIGURATION (using Firebase Secrets)
// ============================================
// To set up Gmail App Password:
// 1. Enable 2FA on your Google account
// 2. Go to https://myaccount.google.com/apppasswords
// 3. Create an app password for "Mail"
// 4. Run: firebase functions:secrets:set GMAIL_EMAIL
// 5. Run: firebase functions:secrets:set GMAIL_PASSWORD

const gmailEmail = defineSecret('GMAIL_EMAIL');
const gmailPassword = defineSecret('GMAIL_PASSWORD');

/**
 * Send email using nodemailer
 */
async function sendEmailWithCredentials(to, subject, html, email, password) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: email,
      pass: password
    }
  });
  
  const mailOptions = {
    from: `"Go Mission" <${email}>`,
    to: to,
    subject: subject,
    html: html
  };
  
  try {
    await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${to}`);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}

// ============================================
// NOTIFICATION HELPER FUNCTIONS
// ============================================

async function getUnreadCount(userId) {
  try {
    const userDoc = await db.collection('goMission_members').doc(userId).get();
    if (!userDoc.exists) return 0;
    return userDoc.data().unreadCount || 0;
  } catch (error) {
    return 0;
  }
}

async function incrementUnreadCount(userId) {
  try {
    await db.collection('goMission_members').doc(userId).update({
      unreadCount: FieldValue.increment(1)
    });
  } catch (error) {
    console.error('Error incrementing unread count:', error);
  }
}

const APP_BASE_URL = 'https://gomission.netlify.app';
const ACTIVE_CONTEXT_TTL_MS = 10 * 60 * 1000;

function normalizeNotificationData(data = {}, title = '', body = '') {
  const normalized = {};
  Object.entries((data && typeof data === 'object') ? data : {}).forEach(([key, value]) => {
    if (!key || value === undefined || value === null) return;
    normalized[key] = String(value);
  });
  if (title) normalized.notificationTitle = String(title);
  if (body) normalized.notificationBody = String(body);
  return normalized;
}

function hashNotificationKey(value = '') {
  return crypto.createHash('sha1').update(String(value)).digest('hex');
}

function resolveNotificationType(notification = {}, normalizedData = {}) {
  return String(
    notification.type ||
    normalizedData.type ||
    notification.notificationType ||
    'general'
  ).trim().toLowerCase() || 'general';
}

function buildNotificationAction(type, data = {}, title = '', body = '') {
  if ((type === 'dm' || type === 'direct_message' || type === 'friend_request_accepted') && (data.senderId || data.fromId || data.friendId)) {
    return {
      kind: 'dm',
      senderId: String(data.senderId || data.fromId || data.friendId),
      threadId: data.threadId ? String(data.threadId) : '',
      messageId: data.messageId ? String(data.messageId) : ''
    };
  }

  if ((type === 'chat' || type === 'chat_mention' || type === 'member_joined' || type === 'join_request' || type === 'guest_joined' || type === 'guest_approved' || type === 'prayer_answered') && data.groupId) {
    return {
      kind: 'group',
      groupId: String(data.groupId),
      messageId: data.messageId ? String(data.messageId) : ''
    };
  }

  if (type === 'friend_request') {
    return { kind: 'friend_requests' };
  }

  if ((type === 'watch_episode' || type === 'video_episode') && data.episodeId) {
    return {
      kind: 'watch',
      episodeId: String(data.episodeId)
    };
  }

  if (data.url) {
    return {
      kind: 'url',
      url: String(data.url)
    };
  }

  if (type === 'devotion') {
    return { kind: 'devotion' };
  }

  if (type === 'announcement' || data.announcementId || title || body) {
    return {
      kind: 'announcement',
      announcementId: data.announcementId ? String(data.announcementId) : '',
      title: String(title || ''),
      body: String(body || '')
    };
  }

  return { kind: 'general' };
}

function buildNotificationSourceKey(type, action = {}, data = {}, title = '', body = '') {
  const explicit = String(
    data.notificationId ||
    data.announcementId ||
    data.eventId ||
    data.sourceId ||
    ''
  ).trim();
  if (explicit) return explicit;

  if (action.kind === 'group' && action.groupId) {
    return `group:${action.groupId}:${action.messageId || title}`;
  }
  if (action.kind === 'dm' && action.senderId) {
    return `dm:${action.threadId || action.senderId}:${action.messageId || title}`;
  }
  if (action.kind === 'announcement') {
    return `announcement:${action.announcementId || `${title}|${body}`}`;
  }
  if (action.kind === 'watch' && action.episodeId) {
    return `watch:${action.episodeId}`;
  }
  if (action.kind === 'friend_requests') {
    return `friend-request:${title}|${body}`;
  }
  if (action.kind === 'url' && action.url) {
    return `url:${action.url}`;
  }
  return `${type}:${title}|${body}`;
}

function buildNotificationRecord(notification = {}, options = {}) {
  const title = String(notification.title || 'Notification').trim();
  const body = String(notification.body || '').trim();
  const normalizedData = normalizeNotificationData(notification.data || {}, title, body);
  const type = resolveNotificationType(notification, normalizedData);
  const action = buildNotificationAction(type, normalizedData, title, body);
  const sourceKey = buildNotificationSourceKey(type, action, normalizedData, title, body);
  const scopeKey = String(options.scopeKey || options.userId || options.adminScope || 'global');
  const explicitId = String(
    notification.notificationId ||
    normalizedData.notificationId ||
    normalizedData.announcementId ||
    normalizedData.eventId ||
    ''
  ).trim();
  const docId = explicitId
    ? hashNotificationKey(`${scopeKey}:${explicitId}`)
    : hashNotificationKey(`${scopeKey}:${sourceKey}`);

  return {
    docId,
    title,
    body,
    type,
    explicitId,
    normalizedData,
    action,
    sourceKey
  };
}

async function writeNotificationInbox(userId, notification = {}, options = {}) {
  const normalizedUserId = String(userId || '').trim();
  if (!normalizedUserId) {
    return { success: false, error: 'Missing userId' };
  }

  const record = buildNotificationRecord(notification, {
    ...options,
    scopeKey: options.scopeKey || `user:${normalizedUserId}`
  });
  const ref = db
    .collection('goMission_members')
    .doc(normalizedUserId)
    .collection(MEMBER_NOTIFICATIONS_SUBCOLLECTION)
    .doc(record.docId);

  const existingSnap = await ref.get();
  const existing = existingSnap.exists ? (existingSnap.data() || {}) : null;
  const shouldBeRead = options.read === true ? true : notification.read === true;
  const wasUnread = existing ? existing.read !== true : false;
  const shouldIncrementUnread = !shouldBeRead && !wasUnread;

  if (existing) {
    return {
      success: true,
      id: record.docId,
      unreadIncremented: false,
      sourceKey: record.sourceKey,
      alreadyExists: true,
      explicitId: record.explicitId
    };
  }

  await ref.set({
    title: record.title,
    body: record.body,
    type: record.type,
    category: String(notification.category || record.normalizedData.category || record.type),
    icon: notification.icon ? String(notification.icon) : (existing?.icon || ''),
    read: shouldBeRead,
    readAt: shouldBeRead ? FieldValue.serverTimestamp() : null,
    action: record.action,
    data: record.normalizedData,
    sourceKey: record.sourceKey,
    sourceEvent: String(notification.event || record.normalizedData.event || ''),
    sourceCollection: String(options.sourceCollection || notification.sourceCollection || ''),
    sourceEntityId: String(
      options.sourceEntityId ||
      notification.sourceEntityId ||
      record.normalizedData.groupId ||
      record.normalizedData.messageId ||
      record.normalizedData.announcementId ||
      record.normalizedData.episodeId ||
      ''
    ),
    priority: String(notification.priority || record.normalizedData.priority || 'normal'),
    audience: String(notification.audience || record.normalizedData.audience || ''),
    createdAt: existing?.createdAt || FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp()
  }, { merge: true });

  if (shouldIncrementUnread) {
    await incrementUnreadCount(normalizedUserId);
  }

  return {
    success: true,
    id: record.docId,
    unreadIncremented: shouldIncrementUnread,
    sourceKey: record.sourceKey,
    alreadyExists: false,
    explicitId: record.explicitId
  };
}

async function writeNotificationInboxes(userIds = [], notification = {}, options = {}) {
  const ids = uniqueUserIds(userIds);
  if (!ids.length) return [];
  return Promise.all(ids.map((userId) => writeNotificationInbox(userId, notification, options)));
}

async function writeAdminFeedNotification(notification = {}, options = {}) {
  const record = buildNotificationRecord(notification, {
    ...options,
    scopeKey: options.scopeKey || 'admin-feed'
  });
  const ref = db.collection(ADMIN_NOTIFICATIONS_COLLECTION).doc(record.docId);
  const existingSnap = await ref.get();
  const existing = existingSnap.exists ? (existingSnap.data() || {}) : null;

  if (existing) {
    return { success: true, id: record.docId, alreadyExists: true };
  }

  await ref.set({
    title: record.title,
    body: record.body,
    type: record.type,
    category: String(notification.category || record.normalizedData.category || record.type),
    action: record.action,
    data: record.normalizedData,
    sourceKey: record.sourceKey,
    sourceEvent: String(notification.event || record.normalizedData.event || ''),
    sourceCollection: String(options.sourceCollection || notification.sourceCollection || ''),
    sourceEntityId: String(
      options.sourceEntityId ||
      notification.sourceEntityId ||
      record.normalizedData.groupId ||
      record.normalizedData.announcementId ||
      record.normalizedData.episodeId ||
      ''
    ),
    visibility: String(notification.visibility || 'admin'),
    createdAt: existing?.createdAt || FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp()
  }, { merge: true });

  return { success: true, id: record.docId, alreadyExists: false };
}

function normalizeTokenList(tokens = [], incomingToken = '') {
  const ordered = [];
  const seen = new Set();

  for (const rawToken of [].concat(tokens || [])) {
    const token = String(rawToken || '').trim();
    if (!token || seen.has(token)) continue;
    seen.add(token);
    ordered.push(token);
  }

  const newestToken = String(incomingToken || '').trim();
  if (newestToken) {
    const filtered = ordered.filter((token) => token !== newestToken);
    filtered.push(newestToken);
    return filtered.slice(-MAX_FCM_TOKENS_PER_USER);
  }

  return ordered.slice(-MAX_FCM_TOKENS_PER_USER);
}

function buildStageEncouragementRecipientRecord(memberId = '', memberData = {}, options = {}) {
  const tokenCount = Array.isArray(memberData?.fcmTokens) ? memberData.fcmTokens.length : 0;
  const status = String(options.status || (tokenCount > 0 ? 'pending' : 'no_token')).trim().toLowerCase();
  return {
    userId: String(memberId || ''),
    name: getSafeProfileName(memberData),
    email: String(memberData?.email || '').trim(),
    stage: normalizeJourneyStageValue(memberData?.stage),
    tokenCount,
    status,
    error: String(options.error || '').trim()
  };
}

async function writeStageEncouragementRun(record = {}) {
  const runId = String(
    record.runId ||
    `stage_encouragement_run_${record.templateId || 'template'}_${Date.now()}`
  ).trim();
  if (!runId) return null;

  const targetedUsers = Array.isArray(record.targetedUsers) ? record.targetedUsers.slice(0, 200) : [];
  const noTokenUsers = targetedUsers.filter((item) => item.status === 'no_token').slice(0, 100);
  const failedUsers = targetedUsers.filter((item) => item.status === 'failed').slice(0, 100);

  await db.collection(STAGE_ENCOURAGEMENT_RUNS_COLLECTION).doc(runId).set({
    type: 'stage_encouragement_run',
    templateId: String(record.templateId || '').trim(),
    templateTitle: String(record.templateTitle || '').trim(),
    stage: normalizeJourneyStageValue(record.stage),
    focusArea: String(record.focusArea || '').trim(),
    startedAt: FieldValue.serverTimestamp(),
    startedAtIso: new Date().toISOString(),
    completedAt: FieldValue.serverTimestamp(),
    recipientCount: Number(record.recipientCount || 0),
    successCount: Number(record.successCount || 0),
    failureCount: Number(record.failureCount || 0),
    noTokenCount: Number(noTokenUsers.length),
    notificationId: String(record.notificationId || '').trim(),
    nextSendAt: String(record.nextSendAt || '').trim(),
    loopEnabled: record.loopEnabled !== false,
    targetedUsers,
    noTokenUsers,
    failedUsers,
    errors: Array.isArray(record.errors) ? record.errors.slice(0, 100) : [],
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp()
  }, { merge: true });

  return runId;
}

function buildNotificationDeepLink(data = {}, title = '', body = '') {
  const payload = (data && typeof data === 'object') ? data : {};
  const type = String(payload.type || '').toLowerCase();

  if ((type === 'chat' || type === 'chat_mention') && payload.groupId) {
    const params = new URLSearchParams({ openChat: String(payload.groupId) });
    if (payload.messageId) params.set('openChatMessage', String(payload.messageId));
    return `${APP_BASE_URL}/?${params.toString()}`;
  }

  if (type === 'dm' && payload.senderId) {
    const params = new URLSearchParams({
      openMessages: 'direct',
      openDmWith: String(payload.senderId)
    });
    return `${APP_BASE_URL}/?${params.toString()}`;
  }

  if (type === 'devotion') {
    return `${APP_BASE_URL}/?openDevotion=true`;
  }

  if (type === 'announcement' || (!type && (title || body))) {
    const params = new URLSearchParams({
      openAnnouncement: '1',
      openMessages: 'groups'
    });
    if (title) params.set('announcementTitle', truncateText(String(title), 180));
    if (body) params.set('announcementBody', truncateText(String(body), 2000));
    if (payload.announcementId) params.set('announcementId', String(payload.announcementId));
    return `${APP_BASE_URL}/?${params.toString()}`;
  }

  return `${APP_BASE_URL}/`;
}

async function sendToUser(userId, notification) {
  try {
    const userDoc = await db.collection('goMission_members').doc(userId).get();
    if (!userDoc.exists) return { success: false, error: 'User not found' };
    
    const userData = userDoc.data();
    const tokens = normalizeTokenList(userData.fcmTokens || []);
    const inboxResult = await writeNotificationInbox(userId, notification, {
      sourceCollection: notification.sourceCollection || '',
      sourceEntityId: notification.sourceEntityId || ''
    });
    if (inboxResult?.alreadyExists) {
      return {
        success: true,
        skippedDuplicate: true,
        badgeCount: Number(userData.unreadCount || 0),
        inboxId: inboxResult?.id || null
      };
    }
    const badgeCount = Math.max(
      0,
      Number(userData.unreadCount || 0) + (inboxResult?.unreadIncremented ? 1 : 0)
    );
    
    if (tokens.length === 0) {
      return { success: false, error: 'No tokens', badgeCount, inboxId: inboxResult?.id || null };
    }

    const normalizedData = normalizeNotificationData(
      notification.data || {},
      notification.title,
      notification.body
    );
    const deepLink = buildNotificationDeepLink(
      normalizedData,
      notification.title,
      notification.body
    );
    
    const message = {
      notification: {
        title: notification.title,
        body: notification.body,
      },
      data: normalizedData,
      android: {
        notification: {
          channelId: 'default',
          notificationCount: badgeCount,
          color: '#f59e0b'
        }
      },
      apns: {
        payload: {
          aps: {
            badge: badgeCount,
            sound: 'default'
          }
        }
      },
      webpush: {
        notification: {
          badge: '/icons/icon-192.png',
          icon: '/icons/icon-192.png',
          vibrate: [100, 50, 100]
        },
        fcmOptions: {
          link: deepLink
        }
      },
      tokens: tokens
    };
    
    const response = await messaging.sendEachForMulticast(message);
    const successCount = Number(response.successCount || 0);
    const failureCount = Number(response.failureCount || 0);
    const responseErrors = [];
    
    if (response.failureCount > 0) {
      const invalidTokens = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const code = resp.error?.code;
          if (code) {
            responseErrors.push(code);
          } else if (resp.error?.message) {
            responseErrors.push(String(resp.error.message));
          }
          if (code === 'messaging/invalid-registration-token' || 
              code === 'messaging/registration-token-not-registered') {
            invalidTokens.push(tokens[idx]);
          }
        }
      });
      
      if (invalidTokens.length > 0) {
        await db.collection('goMission_members').doc(userId).update({
          fcmTokens: FieldValue.arrayRemove(...invalidTokens)
        });
      }
    }

    if (successCount === 0) {
      return {
        success: false,
        error: responseErrors[0] || 'No valid tokens',
        successCount,
        failureCount,
        badgeCount,
        inboxId: inboxResult?.id || null
      };
    }

    return {
      success: true,
      successCount,
      failureCount,
      badgeCount,
      inboxId: inboxResult?.id || null
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function sendToUsers(userIds, notification) {
  return Promise.all(userIds.map(id => sendToUser(id, notification)));
}

async function sendToGroup(groupId, notification, excludeUserId = null) {
  try {
    const groupDoc = await db.collection('goMission_groups').doc(groupId).get();
    if (!groupDoc.exists) return { success: false, error: 'Group not found' };
    
    let memberIds = groupDoc.data().members || [];
    if (excludeUserId) {
      memberIds = memberIds.filter(id => id !== excludeUserId);
    }
    
    if (memberIds.length === 0) {
      return { success: true, message: 'No members to notify' };
    }
    
    // Filter out users who have this chat open (activeChat === groupId)
    const membersToNotify = [];
    for (const memberId of memberIds) {
      const memberDoc = await db.collection('goMission_members').doc(memberId).get();
      if (memberDoc.exists) {
        const memberData = memberDoc.data();
        // Skip if user has this chat open
        if (memberData.activeChat === groupId) {
          console.log(`Skipping notification for ${memberId} - chat is open`);
          continue;
        }
        membersToNotify.push(memberId);
      }
    }
    
    if (membersToNotify.length === 0) {
      return { success: true, message: 'All members have chat open' };
    }
    
    return await sendToUsers(membersToNotify, notification);
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function getGroupRecipientIds(groupId, excludeUserId = null) {
  const normalizedGroupId = String(groupId || '').trim();
  if (!normalizedGroupId) return [];
  const groupDoc = await db.collection('goMission_groups').doc(normalizedGroupId).get();
  if (!groupDoc.exists) return [];

  let memberIds = getGroupParticipantIds(groupDoc.data() || {});
  if (excludeUserId) {
    memberIds = memberIds.filter((id) => id !== excludeUserId);
  }
  return memberIds;
}

async function resolveAnnouncementRecipientIds(audience, { groupId = '', memberId = '' } = {}) {
  const normalizedAudience = String(audience || 'all_users').trim().toLowerCase();

  if (normalizedAudience === 'specific_member' && memberId) {
    return [String(memberId)];
  }

  if (normalizedAudience === 'specific_group' && groupId) {
    return getGroupRecipientIds(groupId);
  }

  const usersSnapshot = await db.collection('goMission_members').get();
  let members = usersSnapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    data: docSnap.data() || {}
  }));

  if (normalizedAudience === 'group_members' || normalizedAudience === 'ungrouped_users') {
    members = members.filter((entry) => (
      normalizedAudience === 'group_members'
        ? hasGroupMembership(entry.data)
        : !hasGroupMembership(entry.data)
    ));
  }

  if (normalizedAudience === 'leaders_only') {
    members = members.filter((entry) => isLeaderProfile(entry.data));
  }

  return members.map((entry) => entry.id);
}

async function ensureMemberProfileDocument(userId, profile = {}) {
  const normalizedUserId = String(userId || '').trim();
  if (!normalizedUserId) {
    throw new HttpsError('invalid-argument', 'Missing user id');
  }

  const userRef = db.collection('goMission_members').doc(normalizedUserId);
  const userDoc = await userRef.get();
  const existing = userDoc.exists ? (userDoc.data() || {}) : {};
  const displayName = String(
    profile.displayName ||
    profile.name ||
    existing.displayName ||
    existing.name ||
    ''
  ).trim();
  const email = String(profile.email || existing.email || '').trim().toLowerCase();
  const photoURL = String(profile.photoURL || existing.photoURL || '').trim();

  const basePayload = {
    id: normalizedUserId,
    name: displayName,
    displayName,
    email,
    photoURL,
    updatedAt: FieldValue.serverTimestamp()
  };

  if (!userDoc.exists) {
    await userRef.set({
      ...basePayload,
      stage: 'seeker',
      roles: {
        isMissionary: true,
        isGroupLeader: false,
        isTrainer: false,
        isShepherd: false,
        isWelcomeTeam: false,
        isAdmin: false
      },
      groupId: null,
      discipledBy: null,
      discipling: [],
      training: {
        currentPhase: 1,
        phases: {
          phase1: { status: 'enrolled', sessionsAttended: [] },
          phase2: { status: 'locked' },
          phase3: { status: 'locked' },
          phase4: { status: 'locked' }
        }
      },
      createdAt: FieldValue.serverTimestamp()
    }, { merge: true });

    return { created: true, updated: true };
  }

  await userRef.set(basePayload, { merge: true });
  return { created: false, updated: true };
}

function uniqueUserIds(values = []) {
  return [...new Set((Array.isArray(values) ? values : [])
    .filter((value) => typeof value === 'string' && value.trim())
    .map((value) => value.trim()))];
}

function normalizeCollectionEntries(value) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') {
    return Object.entries(value).map(([key, entry]) => {
      if (entry && typeof entry === 'object') return { ...entry, _key: key };
      return { id: key, value: entry, _key: key };
    });
  }
  return [];
}

function collectMentionedUserIds(message = {}) {
  const fromArray = [];
  if (Array.isArray(message.mentionedUserIds)) {
    fromArray.push(...message.mentionedUserIds);
  }
  if (Array.isArray(message.mentions)) {
    message.mentions.forEach((entry) => {
      if (typeof entry === 'string') fromArray.push(entry);
      else if (entry && typeof entry.uid === 'string') fromArray.push(entry.uid);
    });
  }
  return uniqueUserIds(fromArray);
}

function getGroupParticipantIds(groupData = {}) {
  const memberIds = normalizeCollectionEntries(groupData.members)
    .map((entry) => normalizeEntryUserId(entry))
    .filter(Boolean);
  const guestIds = normalizeCollectionEntries(groupData.guests)
    .map((entry) => normalizeEntryUserId(entry))
    .filter(Boolean);
  const leaderId = String(groupData?.leaderId || '').trim();
  return uniqueUserIds([leaderId, ...memberIds, ...guestIds]);
}

function toDateOrNull(value) {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value.toDate === 'function') {
    const date = value.toDate();
    return Number.isNaN(date?.getTime?.()) ? null : date;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function truncateText(value, maxLength = 120) {
  const str = String(value || '');
  if (str.length <= maxLength) return str;
  return `${str.slice(0, Math.max(1, maxLength - 1))}…`;
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function filterRecipientsByActiveContext(userIds = [], contextField, contextValue, options = {}) {
  const uniqueIds = uniqueUserIds(userIds);
  if (!uniqueIds.length) return [];
  if (!contextField) return uniqueIds;
  const timestampField = typeof options.timestampField === 'string' ? options.timestampField : '';
  const ttlMs = Number.isFinite(options.ttlMs) && options.ttlMs > 0
    ? Number(options.ttlMs)
    : ACTIVE_CONTEXT_TTL_MS;

  const recipients = [];
  for (const userId of uniqueIds) {
    try {
      const userDoc = await db.collection('goMission_members').doc(userId).get();
      if (!userDoc.exists) continue;
      const data = userDoc.data() || {};
      if (data[contextField] !== contextValue) {
        recipients.push(userId);
        continue;
      }

      // If context is stale, treat as inactive and deliver notification.
      if (timestampField) {
        const activeAt = toDateOrNull(data[timestampField]);
        const isFresh = activeAt && ((Date.now() - activeAt.getTime()) <= ttlMs);
        if (!isFresh) {
          recipients.push(userId);
          continue;
        }
      } else {
        continue;
      }
    } catch (error) {
      console.warn(`[Notifications] Could not evaluate active context for ${userId}:`, error);
      recipients.push(userId);
    }
  }
  return recipients;
}

function normalizeRequest(request) {
  if (!request || typeof request !== 'object') return null;
  const requesterId = request.odId || request.uid || null;
  if (!requesterId) return null;
  return {
    ...request,
    requesterId,
    name: request.name || request.displayName || 'Someone'
  };
}

function collectRequests(groupData) {
  const joinRequests = Array.isArray(groupData?.joinRequests) ? groupData.joinRequests : [];
  const pendingRequests = Array.isArray(groupData?.pendingRequests) ? groupData.pendingRequests : [];
  const merged = [...joinRequests, ...pendingRequests];

  const out = [];
  const seen = new Set();
  for (const request of merged) {
    const normalized = normalizeRequest(request);
    if (!normalized || seen.has(normalized.requesterId)) continue;
    seen.add(normalized.requesterId);
    out.push(normalized);
  }
  return out;
}

function normalizeInviteCode(value) {
  return String(value || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 6);
}

function normalizeEntryUserId(entry) {
  if (!entry) return '';
  if (typeof entry === 'string') return entry.trim();
  if (typeof entry === 'object') {
    return String(entry.odId || entry.uid || entry.id || entry.userId || entry.memberId || entry.profileId || entry._key || '').trim();
  }
  return '';
}

function getNormalizedGroupUserIds(entries = []) {
  if (!Array.isArray(entries)) return [];
  return uniqueUserIds(entries.map((entry) => normalizeEntryUserId(entry)).filter(Boolean));
}

function findGroupEntryByUserId(entries = [], userId = '') {
  const normalizedUserId = String(userId || '').trim();
  if (!normalizedUserId || !Array.isArray(entries)) return null;
  return entries.find((entry) => normalizeEntryUserId(entry) === normalizedUserId) || null;
}

function getGroupEntryDisplayName(entry) {
  if (!entry || typeof entry !== 'object') return '';
  return String(entry.name || entry.displayName || entry.fullName || '').trim();
}

function isUserAlreadyInGroup(groupData = {}, uid = '') {
  const normalizedUid = String(uid || '').trim();
  if (!normalizedUid) return false;

  if (String(groupData?.leaderId || '').trim() === normalizedUid) {
    return true;
  }

  const memberIds = getNormalizedGroupUserIds(groupData?.members);
  const guestIds = getNormalizedGroupUserIds(groupData?.guests);
  return memberIds.includes(normalizedUid) || guestIds.includes(normalizedUid);
}

async function resolveInviteGroupTarget(inviteCode) {
  const normalizedCode = normalizeInviteCode(inviteCode);
  if (!normalizedCode) return null;

  let codeDoc = await db.collection('goMission_groupInviteCodes').doc(normalizedCode).get();

  if (!codeDoc.exists) {
    const codeQuerySnapshot = await db.collection('goMission_groupInviteCodes')
      .where('code', '==', normalizedCode)
      .limit(1)
      .get();
    if (!codeQuerySnapshot.empty) {
      codeDoc = codeQuerySnapshot.docs[0];
    }
  }

  let groupDoc = null;
  let codeData = codeDoc.exists ? (codeDoc.data() || {}) : null;
  const linkedGroupId = String(codeData?.groupId || codeData?.group || codeData?.groupID || '').trim();

  if (linkedGroupId) {
    const candidate = await db.collection('goMission_groups').doc(linkedGroupId).get();
    if (candidate.exists) {
      const candidateData = candidate.data() || {};
      if (normalizeInviteCode(candidateData.inviteCode) === normalizedCode) {
        groupDoc = candidate;
      }
    }
  }

  if (!groupDoc) {
    const directGroupSnapshot = await db.collection('goMission_groups')
      .where('inviteCode', '==', normalizedCode)
      .limit(1)
      .get();
    if (!directGroupSnapshot.empty) {
      groupDoc = directGroupSnapshot.docs[0];
    }
  }

  if (!groupDoc) {
    const allGroupsSnapshot = await db.collection('goMission_groups').get();
    groupDoc = allGroupsSnapshot.docs.find((docSnap) => {
      const data = docSnap.data() || {};
      return normalizeInviteCode(data.inviteCode) === normalizedCode;
    }) || null;
  }

  if (!groupDoc || !groupDoc.exists) {
    return null;
  }

  const groupData = groupDoc.data() || {};
  if (!codeData) {
    codeData = null;
  }

  return {
    inviteCode: normalizedCode,
    groupRef: groupDoc.ref,
    groupDoc,
    groupData,
    codeRef: codeDoc.exists ? codeDoc.ref : null,
    codeData
  };
}

async function sendEventEmailToUser(userId, subject, html) {
  try {
    if (!userId) return false;
    const userDoc = await db.collection('goMission_members').doc(userId).get();
    if (!userDoc.exists) return false;

    const to = userDoc.data()?.email;
    if (!to) return false;

    const fromEmail = gmailEmail.value();
    const fromPassword = gmailPassword.value();
    if (!fromEmail || !fromPassword) return false;

    return await sendEmailWithCredentials(to, subject, html, fromEmail, fromPassword);
  } catch (error) {
    console.error('[Notifications] Email send error:', error);
    return false;
  }
}

// ============================================
// FIRESTORE TRIGGERS
// ============================================

exports.onNewChatMessage = onDocumentCreated({
  document: 'goMission_chats/{messageId}',
  secrets: [gmailEmail, gmailPassword]
}, async (event) => {
  const message = event.data?.data() || {};
  const { groupId, senderId, senderName, text, type } = message;
  if (!groupId || !senderId) return null;
  if (type === 'system') return null;

  const groupDoc = await db.collection('goMission_groups').doc(groupId).get();
  const groupData = groupDoc.exists ? (groupDoc.data() || {}) : {};
  const groupName = groupData.name || 'Your Group';
  const senderLabel = senderName || 'Someone';

  const baseBody = type === 'devotion'
    ? `${senderLabel} shared a reflection`
    : `${senderLabel}: ${truncateText(text, 100) || 'New message'}`;

  const participantIds = getGroupParticipantIds(groupData).filter((id) => id !== senderId);
  if (!participantIds.length) return null;

  const mentionedIds = collectMentionedUserIds(message)
    .filter((id) => id !== senderId && participantIds.includes(id));

  const mentionRecipients = await filterRecipientsByActiveContext(mentionedIds, 'activeChat', groupId, {
    timestampField: 'activeChatUpdatedAt',
    ttlMs: ACTIVE_CONTEXT_TTL_MS
  });
  if (mentionRecipients.length) {
    const mentionNotification = {
      title: `📣 Mention in ${groupName}`,
      body: `${senderLabel} mentioned you: ${truncateText(text, 100) || 'Open chat to reply.'}`,
      data: {
        type: 'chat_mention',
        groupId,
        messageId: event.params.messageId,
        senderId
      }
    };
    await sendToUsers(mentionRecipients, mentionNotification);

    const mentionEmailHtml = `
      <div style="font-family:Arial,sans-serif;line-height:1.5">
        <h2 style="margin:0 0 12px">📣 You were mentioned in ${escapeHtml(groupName)}</h2>
        <p><strong>${escapeHtml(senderLabel)}</strong> mentioned you in group chat.</p>
        <p style="padding:12px;border:1px solid #e5e7eb;border-radius:8px;background:#fafafa;">${escapeHtml(truncateText(text, 280) || 'Open Go Mission to view the message.')}</p>
      </div>
    `;
    await Promise.all(mentionRecipients.map((userId) => (
      sendEventEmailToUser(
        userId,
        `${senderLabel} mentioned you in ${groupName}`,
        mentionEmailHtml
      )
    )));
  }

  const regularRecipients = participantIds.filter((id) => !mentionedIds.includes(id));
  const regularRecipientsFiltered = await filterRecipientsByActiveContext(regularRecipients, 'activeChat', groupId, {
    timestampField: 'activeChatUpdatedAt',
    ttlMs: ACTIVE_CONTEXT_TTL_MS
  });
  if (regularRecipientsFiltered.length) {
    const notification = {
      title: `💬 ${groupName}`,
      body: baseBody,
      data: {
        type: 'chat',
        groupId,
        messageId: event.params.messageId,
        senderId
      }
    };
    await sendToUsers(regularRecipientsFiltered, notification);
  }

  return null;
});

exports.onNewDirectMessage = onDocumentCreated({
  document: 'goMission_dmMessages/{messageId}',
  secrets: [gmailEmail, gmailPassword]
}, async (event) => {
  const message = event.data?.data() || {};
  const senderId = message.senderId;
  const senderName = message.senderName || 'Someone';
  const threadId = message.threadId;
  const participants = uniqueUserIds(message.participants || []);
  if (!senderId || !threadId || !participants.length) return null;
  if (message.type === 'system') return null;

  const recipientIds = participants.filter((id) => id !== senderId);
  if (!recipientIds.length) return null;

  const recipients = await filterRecipientsByActiveContext(recipientIds, 'activeDmThread', threadId, {
    timestampField: 'activeDmThreadUpdatedAt',
    ttlMs: ACTIVE_CONTEXT_TTL_MS
  });
  if (!recipients.length) return null;

  const body = truncateText(message.text || 'Sent you a message.', 110);
  const notification = {
    title: `💬 ${senderName}`,
    body,
    data: {
      type: 'dm',
      threadId,
      senderId,
      messageId: event.params.messageId
    }
  };

  await sendToUsers(recipients, notification);

  const emailHtml = `
    <div style="font-family:Arial,sans-serif;line-height:1.5">
      <h2 style="margin:0 0 12px">💬 New direct message</h2>
      <p><strong>${escapeHtml(senderName)}</strong> sent you a message in Go Mission.</p>
      <p style="padding:12px;border:1px solid #e5e7eb;border-radius:8px;background:#fafafa;">${escapeHtml(body)}</p>
      <p>Open Go Mission to reply.</p>
    </div>
  `;
  await Promise.all(recipients.map((userId) => (
    sendEventEmailToUser(
      userId,
      `${senderName} sent you a message`,
      emailHtml
    )
  )));

  return null;
});

exports.onMemberJoined = onDocumentUpdated({
  document: 'goMission_groups/{groupId}',
  secrets: [gmailEmail, gmailPassword]
}, async (event) => {
  const before = event.data.before.data() || {};
  const after = event.data.after.data() || {};
  
  const oldMembers = before.members || [];
  const newMembers = after.members || [];
  const oldMemberIds = new Set(getNormalizedGroupUserIds(oldMembers));
  const newMemberIds = getNormalizedGroupUserIds(newMembers);
  
  // New member joined
  if (newMemberIds.length > oldMemberIds.size) {
    const newMemberId = newMemberIds.find((id) => !oldMemberIds.has(id));
    
    if (newMemberId) {
      const joinedEntry = findGroupEntryByUserId(newMembers, newMemberId);
      const newMemberDoc = await db.collection('goMission_members').doc(newMemberId).get();
      const newMemberName = getGroupEntryDisplayName(joinedEntry) ||
        (newMemberDoc.exists ? getSafeProfileName(newMemberDoc.data() || {}) : 'Someone');
      
      const notification = {
        title: `👋 New Member!`,
        body: `${newMemberName} joined ${after.name}`,
        data: {
          type: 'member_joined',
          groupId: event.params.groupId,
          memberId: newMemberId
        }
      };
      
      const existingMembers = getNormalizedGroupUserIds(oldMembers).filter((id) => id !== newMemberId);
      if (existingMembers.length > 0) {
        await sendToUsers(existingMembers, notification);
      }

      if (after.leaderId) {
        const memberHtml = `
          <div style="font-family:Arial,sans-serif;line-height:1.5">
            <h2 style="margin:0 0 12px">👋 New Member Joined</h2>
            <p><strong>${newMemberName}</strong> joined <strong>${after.name || 'your group'}</strong>.</p>
          </div>
        `;
        await sendEventEmailToUser(
          after.leaderId,
          `New member joined ${after.name || 'your group'}`,
          memberHtml
        );
      }
    }
  }
  
  // Join request (supports both joinRequests and legacy pendingRequests)
  const oldRequests = collectRequests(before);
  const newRequests = collectRequests(after);
  
  console.log('[onMemberJoined] Join requests (merged) - old:', oldRequests.length, 'new:', newRequests.length);
  
  if (newRequests.length > oldRequests.length) {
    const newRequest = newRequests.find((r) => !oldRequests.some((o) => o.requesterId === r.requesterId));
    
    console.log('[onMemberJoined] New request found:', newRequest?.name, 'Leader:', after.leaderId);
    
    if (newRequest && after.leaderId) {
      const notification = {
        title: '🔔 New Join Request',
        body: `${newRequest.name} wants to join ${after.name}`,
        data: {
          type: 'join_request',
          groupId: event.params.groupId
        }
      };
      
      const result = await sendToUser(after.leaderId, notification);
      console.log('[onMemberJoined] Notification result:', result);

      await writeAdminFeedNotification({
        title: '🔔 New join request',
        body: `${newRequest.name} wants to join ${after.name || 'a mission group'}.`,
        category: 'admin_growth',
        event: 'join_request_created',
        data: {
          type: 'admin_event',
          event: 'join_request_created',
          groupId: String(event.params.groupId || ''),
          memberId: String(newRequest.requesterId || ''),
          notificationId: `admin_join_request_${event.params.groupId}_${newRequest.requesterId}`
        }
      }, {
        sourceCollection: 'goMission_groups',
        sourceEntityId: String(event.params.groupId || '')
      });

      await mirrorNotificationToAdmins({
        title: '🔔 New join request',
        body: `${newRequest.name} wants to join ${after.name || 'a mission group'}.`,
        event: 'join_request_created',
        data: {
          event: 'join_request_created',
          groupId: String(event.params.groupId || ''),
          memberId: String(newRequest.requesterId || ''),
          notificationId: `admin_push_join_request_${event.params.groupId}_${newRequest.requesterId}`
        },
        sourceCollection: 'goMission_groups',
        sourceEntityId: String(event.params.groupId || '')
      });

      await sendMovementActivityNotification({
        title: '🔔 Someone wants to join a mission group',
        body: `${newRequest.name} requested to join ${after.name || 'a mission group'}. Pray they find community and keep growing.`,
        event: 'join_request_created',
        data: {
          event: 'join_request_created',
          groupId: String(event.params.groupId || ''),
          memberId: String(newRequest.requesterId || ''),
          notificationId: `movement_join_request_${event.params.groupId}_${newRequest.requesterId}`
        },
        sourceCollection: 'goMission_groups',
        sourceEntityId: String(event.params.groupId || '')
      });

      const requestHtml = `
        <div style="font-family:Arial,sans-serif;line-height:1.5">
          <h2 style="margin:0 0 12px">🔔 New Join Request</h2>
          <p><strong>${newRequest.name}</strong> wants to join <strong>${after.name || 'your group'}</strong>.</p>
          <p>Open Go Mission and tap <strong>View</strong> on your group card to approve.</p>
        </div>
      `;
      await sendEventEmailToUser(
        after.leaderId,
        `New join request for ${after.name || 'your group'}`,
        requestHtml
      );
    }
  }
  
  // Check for new guests
  const oldGuests = before.guests || [];
  const newGuests = after.guests || [];
  const oldGuestIds = new Set(getNormalizedGroupUserIds(oldGuests));
  const newGuestIds = getNormalizedGroupUserIds(newGuests);
  
  if (newGuestIds.length > oldGuestIds.size) {
    const newGuestId = newGuestIds.find((id) => !oldGuestIds.has(id));
    const newGuest = findGroupEntryByUserId(newGuests, newGuestId);
    
    if (newGuestId) {
      const guestName = getGroupEntryDisplayName(newGuest) || 'Someone';

      // Notify the new guest
      const guestNotification = {
        title: '🎫 You are now a Guest!',
        body: `Welcome to ${after.name} as a guest`,
        data: {
          type: 'guest_approved',
          groupId: event.params.groupId,
          groupName: after.name
        }
      };
      
      await sendToUser(newGuestId, guestNotification);
      
      // Notify other members
      const memberNotification = {
        title: `🎫 New Guest!`,
        body: `${guestName} joined ${after.name} as a guest`,
        data: {
          type: 'guest_joined',
          groupId: event.params.groupId,
          guestId: newGuestId
        }
      };
      
      const membersToNotify = getNormalizedGroupUserIds(after.members || []).filter((id) => id !== after.leaderId);
      if (membersToNotify.length > 0) {
        await sendToUsers(membersToNotify, memberNotification);
      }

      await writeAdminFeedNotification({
        title: '🎫 Guest approved',
        body: `${guestName} joined ${after.name || 'a mission group'} as a guest.`,
        category: 'admin_growth',
        event: 'guest_joined_group',
        data: {
          type: 'admin_event',
          event: 'guest_joined_group',
          groupId: String(event.params.groupId || ''),
          memberId: newGuestId,
          notificationId: `admin_guest_joined_group_${event.params.groupId}_${newGuestId}`
        }
      }, {
        sourceCollection: 'goMission_groups',
        sourceEntityId: String(event.params.groupId || '')
      });

      await mirrorNotificationToAdmins({
        title: '🎫 Guest approved',
        body: `${guestName} joined ${after.name || 'a mission group'} as a guest.`,
        event: 'guest_joined_group',
        data: {
          event: 'guest_joined_group',
          groupId: String(event.params.groupId || ''),
          memberId: newGuestId,
          notificationId: `admin_push_guest_joined_group_${event.params.groupId}_${newGuestId}`
        },
        sourceCollection: 'goMission_groups',
        sourceEntityId: String(event.params.groupId || '')
      });

      await sendMovementActivityNotification({
        title: '🎫 A guest joined a mission group',
        body: `${guestName} was added as a guest in ${after.name || 'a mission group'}. Welcome them and keep the mission moving.`,
        event: 'guest_joined_group',
        data: {
          event: 'guest_joined_group',
          groupId: String(event.params.groupId || ''),
          memberId: newGuestId,
          notificationId: `movement_guest_joined_group_${event.params.groupId}_${newGuestId}`
        },
        sourceCollection: 'goMission_groups',
        sourceEntityId: String(event.params.groupId || '')
      });
    }
  }
  
  return null;
});

exports.onDevotionShared = onDocumentCreated('goMission_devotions/{devotionId}', async (event) => {
  const devotion = event.data?.data() || {};
  const devotionId = String(event.params?.devotionId || '').trim();
  const devotionDate = String(devotion.date || '').trim() || getManilaDateKey();
  const devotionReference = [String(devotion.book || '').trim(), String(devotion.chapter || '').trim()]
    .filter(Boolean)
    .join(' ')
    .trim() || 'today\'s reading';
  const memberName = getSafeProfileName({
    displayName: devotion.userName,
    name: devotion.userName
  });

  await writeAdminFeedNotification({
    title: '📖 Bible time logged',
    body: `${memberName} saved a devotion in ${devotionReference}.`,
    category: 'admin_discipleship',
    event: 'devotion_logged',
    data: {
      type: 'admin_event',
      event: 'devotion_logged',
      devotionId,
      memberId: String(devotion.uid || '').trim(),
      notificationId: `admin_devotion_logged_${devotionId}`
    }
  }, {
    sourceCollection: 'goMission_devotions',
    sourceEntityId: devotionId
  });

  await mirrorNotificationToAdmins({
    title: '📖 Bible time logged',
    body: `${memberName} saved a devotion in ${devotionReference}.`,
    event: 'devotion_logged',
    data: {
      event: 'devotion_logged',
      devotionId,
      memberId: String(devotion.uid || '').trim(),
      notificationId: `admin_push_devotion_logged_${devotionId}`
    },
    sourceCollection: 'goMission_devotions',
    sourceEntityId: devotionId
  });

  await sendMovementActivityNotification({
    title: '📖 Someone spent time in the Word',
    body: `A devotion was logged in ${devotionReference}. Open the Bible and meet with God today.`,
    event: 'devotion_logged',
    data: {
      event: 'devotion_logged',
      devotionId,
      notificationId: `movement_devotion_logged_${devotionId}`
    },
    sourceCollection: 'goMission_devotions',
    sourceEntityId: devotionId
  });

  const dayRef = db.collection(DAILY_ACTIVITY_COLLECTION).doc(devotionDate);
  const daySnap = await dayRef.get();
  const dayData = daySnap.exists ? (daySnap.data() || {}) : {};
  const nextCount = Number(dayData.devotionsCompleted || 0) + 1;
  const milestone = [5, 10, 20].find((value) => value === nextCount);

  await dayRef.set({
    date: devotionDate,
    devotionsCompleted: FieldValue.increment(1),
    updatedAt: FieldValue.serverTimestamp()
  }, { merge: true });

  if (milestone && !(Array.isArray(dayData.devotionMilestonesSent) && dayData.devotionMilestonesSent.includes(milestone))) {
    await Promise.all([
      writeAdminFeedNotification({
        title: '📖 Bible activity milestone reached',
        body: `${milestone} devotions were logged on ${devotionDate}.`,
        category: 'admin_discipleship',
        event: 'devotion_milestone',
        data: {
          type: 'admin_event',
          event: 'devotion_milestone',
          devotionDate,
          milestone: String(milestone),
          notificationId: `admin_devotion_milestone_${devotionDate}_${milestone}`
        }
      }, {
        sourceCollection: DAILY_ACTIVITY_COLLECTION,
        sourceEntityId: devotionDate
      }),
      mirrorNotificationToAdmins({
        title: '📖 Bible activity milestone reached',
        body: `${milestone} devotions were logged on ${devotionDate}.`,
        event: 'devotion_milestone',
        data: {
          event: 'devotion_milestone',
          devotionDate,
          milestone: String(milestone),
          notificationId: `admin_push_devotion_milestone_${devotionDate}_${milestone}`
        },
        sourceCollection: DAILY_ACTIVITY_COLLECTION,
        sourceEntityId: devotionDate
      }),
      sendMovementActivityNotification({
        title: '📖 People are in the Word today',
        body: `${milestone} devotions have already been logged today. Open the Bible and join the movement.`,
        event: 'devotion_milestone',
        data: {
          event: 'devotion_milestone',
          devotionDate,
          milestone: String(milestone),
          notificationId: `movement_devotion_milestone_${devotionDate}_${milestone}`
        },
        sourceCollection: DAILY_ACTIVITY_COLLECTION,
        sourceEntityId: devotionDate
      })
    ]);

    await dayRef.set({
      devotionMilestonesSent: FieldValue.arrayUnion(milestone)
    }, { merge: true });
  }
  
  if (!devotion.sharedWithGroup || !devotion.groupId) return null;
  
  const notification = {
    title: '🔥 Shared Reflection',
    body: `${devotion.userName} shared their reflection on ${devotion.book} ${devotion.chapter}`,
    data: {
      type: 'devotion',
      devotionId,
      groupId: devotion.groupId
    }
  };
  
  await Promise.all([
    sendToGroup(devotion.groupId, notification, devotion.uid),
    sendMovementActivityNotification({
      title: '🔥 A reflection was shared',
      body: `${memberName} shared a reflection from ${devotionReference}. Open the app and encourage someone today.`,
      event: 'devotion_shared',
      data: {
        event: 'devotion_shared',
        devotionId,
        groupId: String(devotion.groupId || '').trim(),
        notificationId: `movement_devotion_shared_${devotionId}`
      },
      sourceCollection: 'goMission_devotions',
      sourceEntityId: devotionId
    })
  ]);
  return null;
});

exports.onMemberSignup = onDocumentCreated('goMission_members/{memberId}', async (event) => {
  const memberData = event.data?.data() || {};
  const memberId = String(event.params?.memberId || '').trim();
  if (!memberId) return null;

  const memberName = getSafeProfileName(memberData);
  const memberEmail = String(memberData.email || '').trim();
  const adminRecipientIds = await getAdminRecipientIds({ excludeUserId: memberId });

  const notification = {
    title: '🆕 New Member Signup',
    body: memberEmail
      ? `${memberName} just signed up (${memberEmail}).`
      : `${memberName} just signed up in Go Mission.`,
    data: {
      type: 'admin_event',
      event: 'member_signup',
      memberId
    }
  };

  await writeAdminFeedNotification({
    ...notification,
    category: 'admin_growth',
    event: 'member_signup'
  }, {
    sourceCollection: 'goMission_members',
    sourceEntityId: memberId
  });
  if (adminRecipientIds.length) {
    await sendToUsers(adminRecipientIds, notification);
  }

  await sendMovementActivityNotification({
    title: '🙌 Someone new joined Go Mission',
    body: 'A new person signed up today. Pray that they keep taking their next step with Jesus.',
    event: 'member_signup',
    data: {
      event: 'member_signup',
      memberId,
      notificationId: `movement_member_signup_${memberId}`
    },
    sourceCollection: 'goMission_members',
    sourceEntityId: memberId
  });
  return null;
});

exports.onGroupCreated = onDocumentCreated('goMission_groups/{groupId}', async (event) => {
  const groupData = event.data?.data() || {};
  const groupId = String(event.params?.groupId || '').trim();
  if (!groupId) return null;

  const groupName = String(groupData.name || 'Mission Group').trim();
  const creatorName = String(groupData.leaderName || groupData.createdByName || '').trim();
  const adminRecipientIds = await getAdminRecipientIds();

  const notification = {
    title: '🧭 New Group Formed',
    body: creatorName
      ? `${groupName} was formed by ${creatorName}.`
      : `${groupName} was newly formed in Go Mission.`,
    data: {
      type: 'admin_event',
      event: 'group_created',
      groupId
    }
  };

  await writeAdminFeedNotification({
    ...notification,
    category: 'admin_growth',
    event: 'group_created'
  }, {
    sourceCollection: 'goMission_groups',
    sourceEntityId: groupId
  });
  if (adminRecipientIds.length) {
    await sendToUsers(adminRecipientIds, notification);
  }

  await sendMovementActivityNotification({
    title: '🧭 A new mission group just formed',
    body: creatorName
      ? `${creatorName} just started ${groupName}. Pray for fruit, unity, and multiplication.`
      : 'A new mission group was just formed. Pray for fruit, unity, and multiplication.',
    event: 'group_created',
    data: {
      event: 'group_created',
      groupId,
      notificationId: `movement_group_created_${groupId}`
    },
    sourceCollection: 'goMission_groups',
    sourceEntityId: groupId
  });
  return null;
});

exports.onMemberJourneyUpdated = onDocumentUpdated('goMission_members/{memberId}', async (event) => {
  const before = event.data?.before?.data() || {};
  const after = event.data?.after?.data() || {};
  const memberId = String(event.params?.memberId || '').trim();
  if (!memberId) return null;

  const beforeStage = normalizeJourneyStageValue(before.stage);
  const afterStage = normalizeJourneyStageValue(after.stage);
  const beforeConfirmedMembership = hasConfirmedGroupMembership(before);
  const afterConfirmedMembership = hasConfirmedGroupMembership(after);

  if (beforeStage === afterStage && beforeConfirmedMembership === afterConfirmedMembership) {
    return null;
  }

  const memberName = getSafeProfileName(after);
  const movementTasks = [];

  if (!beforeConfirmedMembership && afterConfirmedMembership) {
    movementTasks.push(
      sendToUser(memberId, {
        title: '🤝 You joined a mission group',
        body: 'You are not walking alone anymore. Stay connected, show up, and keep growing.',
        category: 'journey',
        event: 'member_joined_group',
        data: {
          type: 'journey_update',
          event: 'member_joined_group',
          groupId: String(after.groupId || after.uplineGroupId || ''),
          notificationId: `member_joined_group_${memberId}`
        },
        sourceCollection: 'goMission_members',
        sourceEntityId: memberId
      }),
      writeAdminFeedNotification({
        title: '🤝 Member joined a mission group',
        body: `${memberName} is now connected to a mission group.`,
        category: 'admin_growth',
        event: 'member_joined_group',
        data: {
          type: 'admin_event',
          event: 'member_joined_group',
          memberId,
          notificationId: `admin_member_joined_group_${memberId}`
        }
      }, {
        sourceCollection: 'goMission_members',
        sourceEntityId: memberId
      }),
      sendMovementActivityNotification({
        title: '🤝 Someone joined a mission group',
        body: 'A user just took the next step into community. Pray that they grow strong in Christ and in mission.',
        event: 'member_joined_group',
        data: {
          event: 'member_joined_group',
          memberId,
          notificationId: `movement_member_joined_group_${memberId}`
        },
        sourceCollection: 'goMission_members',
        sourceEntityId: memberId
      }, {
        excludeUserIds: [memberId]
      })
    );
  }

  const shouldSkipStagePromotionBecauseJoinStep =
    !beforeConfirmedMembership &&
    afterConfirmedMembership &&
    beforeStage === 'seeker' &&
    afterStage === 'disciple';

  if (beforeStage !== afterStage && afterStage !== 'seeker' && !shouldSkipStagePromotionBecauseJoinStep) {
    const stageLabel = formatJourneyStageLabel(afterStage);
    movementTasks.push(
      sendToUser(memberId, {
        title: `🌱 You are now a ${stageLabel}`,
        body: `Praise God for this step. Keep obeying Jesus and keep helping others follow Him too.`,
        category: 'journey',
        event: 'stage_promoted',
        data: {
          type: 'journey_update',
          event: 'stage_promoted',
          stage: afterStage,
          notificationId: `stage_promoted_${memberId}_${afterStage}`
        },
        sourceCollection: 'goMission_members',
        sourceEntityId: memberId
      }),
      writeAdminFeedNotification({
        title: `🌱 Stage growth: ${stageLabel}`,
        body: `${memberName} is now in the ${stageLabel} stage.`,
        category: 'admin_growth',
        event: 'stage_promoted',
        data: {
          type: 'admin_event',
          event: 'stage_promoted',
          memberId,
          stage: afterStage,
          notificationId: `admin_stage_promoted_${memberId}_${afterStage}`
        }
      }, {
        sourceCollection: 'goMission_members',
        sourceEntityId: memberId
      }),
      sendMovementActivityNotification({
        title: `🌱 Someone stepped into ${stageLabel}`,
        body: `God is moving. A user just entered the ${stageLabel} stage. Pray for steady growth and multiplication.`,
        event: 'stage_promoted',
        data: {
          event: 'stage_promoted',
          memberId,
          stage: afterStage,
          notificationId: `movement_stage_promoted_${memberId}_${afterStage}`
        },
        sourceCollection: 'goMission_members',
        sourceEntityId: memberId
      }, {
        excludeUserIds: [memberId]
      })
    );
  }

  if (movementTasks.length) {
    await Promise.all(movementTasks);
  }

  return null;
});

exports.onFriendRequestCreated = onDocumentCreated('goMission_friendRequests/{requestId}', async (event) => {
  const request = event.data?.data() || {};
  const requestId = String(event.params?.requestId || '').trim();
  if (!requestId) return null;

  const toId = String(request.toId || '').trim();
  const fromId = String(request.fromId || '').trim();
  if (!toId || !fromId) return null;
  if (String(request.status || 'pending').toLowerCase() !== 'pending') return null;

  await sendToUser(toId, {
    title: '🤝 New friend request',
    body: `${request.fromName || 'Someone'} wants to connect with you.`,
    data: {
      type: 'friend_request',
      requestId,
      fromId,
      notificationId: `friend_request_${requestId}`
    },
    sourceCollection: 'goMission_friendRequests',
    sourceEntityId: requestId
  });

  return null;
});

exports.onFriendRequestAccepted = onDocumentUpdated('goMission_friendRequests/{requestId}', async (event) => {
  const before = event.data?.before?.data() || {};
  const after = event.data?.after?.data() || {};
  const requestId = String(event.params?.requestId || '').trim();
  if (!requestId) return null;

  const oldStatus = String(before.status || '').toLowerCase();
  const newStatus = String(after.status || '').toLowerCase();
  if (newStatus !== 'accepted' || oldStatus === 'accepted') return null;

  const fromId = String(after.fromId || '').trim();
  const toId = String(after.toId || '').trim();
  if (!fromId || !toId) return null;

  await sendToUser(fromId, {
    title: '✅ Friend request accepted',
    body: `${after.toName || 'Your friend'} accepted your request.`,
    data: {
      type: 'friend_request_accepted',
      fromId: toId,
      friendId: toId,
      requestId,
      notificationId: `friend_request_accepted_${requestId}`
    },
    sourceCollection: 'goMission_friendRequests',
    sourceEntityId: requestId
  });

  return null;
});

exports.onAnnouncementCreated = onDocumentCreated('goMission_announcements/{announcementId}', async (event) => {
  const announcement = event.data?.data() || {};
  const announcementId = String(event.params?.announcementId || '').trim();
  if (!announcementId) return null;

  const title = String(announcement.title || 'Go Mission Update').trim();
  const body = String(announcement.body || '').trim();
  if (!title && !body) return null;

  const recipientIds = await resolveAnnouncementRecipientIds(announcement.audience, {
    groupId: String(announcement.groupId || '').trim(),
    memberId: String(announcement.memberId || '').trim()
  });
  if (recipientIds.length) {
    await writeNotificationInboxes(recipientIds, {
      title,
      body,
      category: 'announcement',
      event: 'announcement_created',
      audience: String(announcement.audience || 'all_users'),
      data: {
        type: 'announcement',
        announcementId,
        notificationId: `announcement_${announcementId}`
      },
      sourceCollection: 'goMission_announcements',
      sourceEntityId: announcementId
    }, {
      sourceCollection: 'goMission_announcements',
      sourceEntityId: announcementId
    });
  }

  await writeAdminFeedNotification({
    title: '📣 Announcement published',
    body: `${title}${announcement.audience ? ` • Audience: ${announcement.audience}` : ''}`,
    category: 'admin_content',
    event: 'announcement_created',
    data: {
      type: 'admin_event',
      announcementId,
      audience: String(announcement.audience || 'all_users'),
      recipientCount: String(recipientIds.length),
      notificationId: `admin_announcement_${announcementId}`
    }
  }, {
    sourceCollection: 'goMission_announcements',
    sourceEntityId: announcementId
  });

  return null;
});

exports.onVideoEpisodeCreated = onDocumentCreated('video_episodes/{episodeId}', async (event) => {
  const episode = event.data?.data() || {};
  const episodeId = String(event.params?.episodeId || '').trim();
  if (!episodeId) return null;
  if (String(episode.status || '').toLowerCase() !== 'published') return null;

  const usersSnapshot = await db.collection('goMission_members').get();
  const recipientIds = usersSnapshot.docs
    .map((docSnap) => ({ id: docSnap.id, data: docSnap.data() || {} }))
    .filter((entry) => isActiveProfile(entry.data))
    .map((entry) => entry.id);

  if (recipientIds.length) {
    await sendToUsersInBatches(recipientIds, {
      title: '🎬 New episode is ready',
      body: `${episode.title || 'A new Go Mission episode'} is now available to watch.`,
      category: 'watch',
      event: 'video_episode_published',
      data: {
        type: 'watch_episode',
        episodeId,
        notificationId: `watch_episode_${episodeId}`
      },
      sourceCollection: 'video_episodes',
      sourceEntityId: episodeId
    });
  }

  await writeAdminFeedNotification({
    title: '🎬 Watch episode published',
    body: `${episode.title || episodeId} is now live.`,
    category: 'admin_content',
    event: 'video_episode_published',
    data: {
      type: 'admin_event',
      episodeId,
      notificationId: `admin_watch_episode_${episodeId}`
    }
  }, {
    sourceCollection: 'video_episodes',
    sourceEntityId: episodeId
  });

  return null;
});

exports.onVideoEpisodePublished = onDocumentUpdated('video_episodes/{episodeId}', async (event) => {
  const before = event.data?.before?.data() || {};
  const after = event.data?.after?.data() || {};
  const episodeId = String(event.params?.episodeId || '').trim();
  if (!episodeId) return null;

  const beforeStatus = String(before.status || '').toLowerCase();
  const afterStatus = String(after.status || '').toLowerCase();
  if (afterStatus !== 'published' || beforeStatus === 'published') return null;

  const usersSnapshot = await db.collection('goMission_members').get();
  const recipientIds = usersSnapshot.docs
    .map((docSnap) => ({ id: docSnap.id, data: docSnap.data() || {} }))
    .filter((entry) => isActiveProfile(entry.data))
    .map((entry) => entry.id);

  if (recipientIds.length) {
    await sendToUsersInBatches(recipientIds, {
      title: '🎬 New episode is ready',
      body: `${after.title || 'A new Go Mission episode'} is now available to watch.`,
      category: 'watch',
      event: 'video_episode_published',
      data: {
        type: 'watch_episode',
        episodeId,
        notificationId: `watch_episode_${episodeId}`
      },
      sourceCollection: 'video_episodes',
      sourceEntityId: episodeId
    });
  }

  await writeAdminFeedNotification({
    title: '🎬 Watch episode published',
    body: `${after.title || episodeId} is now live.`,
    category: 'admin_content',
    event: 'video_episode_published',
    data: {
      type: 'admin_event',
      episodeId,
      notificationId: `admin_watch_episode_${episodeId}`
    }
  }, {
    sourceCollection: 'video_episodes',
    sourceEntityId: episodeId
  });

  return null;
});

exports.onPrayerAnswered = onDocumentUpdated('goMission_groups/{groupId}/prayerRequests/{requestId}', async (event) => {
  const before = event.data?.before?.data() || {};
  const after = event.data?.after?.data() || {};
  const groupId = String(event.params?.groupId || '').trim();
  const requestId = String(event.params?.requestId || '').trim();
  if (!groupId || !requestId) return null;
  if (before.answered === true || after.answered !== true) return null;

  const memberId = String(after.memberId || '').trim();
  let groupName = 'your mission group';
  try {
    const groupDoc = await db.collection('goMission_groups').doc(groupId).get();
    if (groupDoc.exists) {
      groupName = String(groupDoc.data()?.name || groupName);
    }
  } catch (_) {}

  if (memberId) {
    await sendToUser(memberId, {
      title: '🙌 Prayer answered',
      body: `${groupName} marked one of your prayer requests as answered. Praise God.`,
      category: 'prayer',
      event: 'prayer_answered',
      data: {
        type: 'prayer_answered',
        groupId,
        requestId,
        notificationId: `prayer_answered_${requestId}`
      },
      sourceCollection: 'goMission_groups.prayerRequests',
      sourceEntityId: requestId
    });
  }

  await writeAdminFeedNotification({
    title: '🙌 Answered prayer recorded',
    body: `${groupName} recorded an answered prayer today.`,
    category: 'admin_discipleship',
    event: 'prayer_answered',
    data: {
      type: 'admin_event',
      groupId,
      requestId,
      notificationId: `admin_prayer_answered_${requestId}`
    }
  }, {
    sourceCollection: 'goMission_groups.prayerRequests',
    sourceEntityId: requestId
  });

  await Promise.all([
    mirrorNotificationToAdmins({
      title: '🙌 Answered prayer recorded',
      body: `${groupName} recorded an answered prayer today.`,
      event: 'prayer_answered',
      data: {
        event: 'prayer_answered',
        groupId,
        requestId,
        notificationId: `admin_push_prayer_answered_${requestId}`
      },
      sourceCollection: 'goMission_groups.prayerRequests',
      sourceEntityId: requestId
    }),
    sendMovementActivityNotification({
      title: '🙌 God answered a prayer',
      body: `${groupName} recorded an answered prayer today. Give thanks and keep praying boldly.`,
      event: 'prayer_answered',
      data: {
        event: 'prayer_answered',
        groupId,
        requestId,
        notificationId: `movement_prayer_answered_${requestId}`
      },
      sourceCollection: 'goMission_groups.prayerRequests',
      sourceEntityId: requestId
    })
  ]);

  return null;
});

exports.onMeetingStarted = onDocumentCreated('goMission_meetings/{meetingId}', async (event) => {
  const meeting = event.data?.data() || {};
  const meetingId = String(event.params?.meetingId || '').trim();
  const groupId = String(meeting.groupId || '').trim();
  const meetingDate = String(meeting.date || '').trim();
  if (!meetingId || !groupId || !meetingDate) return null;

  const groupDoc = await db.collection('goMission_groups').doc(groupId).get();
  const groupName = groupDoc.exists ? String(groupDoc.data()?.name || groupId) : groupId;

  await writeAdminFeedNotification({
    title: '🟢 Group meeting started',
    body: `${groupName} started meeting on ${meetingDate}.`,
    category: 'admin_activity',
    event: 'meeting_started',
    data: {
      type: 'admin_event',
      groupId,
      meetingId,
      meetingDate,
      notificationId: `meeting_started_${meetingId}`
    }
  }, {
    sourceCollection: 'goMission_meetings',
    sourceEntityId: meetingId
  });

  await mirrorNotificationToAdmins({
    title: '🟢 Group meeting started',
    body: `${groupName} started meeting on ${meetingDate}.`,
    event: 'meeting_started',
    data: {
      event: 'meeting_started',
      groupId,
      meetingId,
      meetingDate,
      notificationId: `admin_push_meeting_started_${meetingId}`
    },
    sourceCollection: 'goMission_meetings',
    sourceEntityId: meetingId
  });

  await sendMovementActivityNotification({
    title: '🟢 A mission group just started meeting',
    body: `${groupName} is meeting now${meetingDate ? ` (${meetingDate})` : ''}. Pray for truth, unity, and transformation.`,
    event: 'meeting_started',
    data: {
      event: 'meeting_started',
      groupId,
      meetingId,
      meetingDate,
      notificationId: `movement_meeting_started_${meetingId}`
    },
    sourceCollection: 'goMission_meetings',
    sourceEntityId: meetingId
  });

  const dayRef = db.collection(DAILY_ACTIVITY_COLLECTION).doc(meetingDate);
  const daySnap = await dayRef.get();
  const dayData = daySnap.exists ? (daySnap.data() || {}) : {};
  const nextCount = Number(dayData.meetingsStarted || 0) + 1;
  const milestone = [5, 10, 20].find((value) => value === nextCount);

  await dayRef.set({
    date: meetingDate,
    meetingsStarted: FieldValue.increment(1),
    updatedAt: FieldValue.serverTimestamp()
  }, { merge: true });

  if (milestone && !(Array.isArray(dayData.milestonesSent) && dayData.milestonesSent.includes(milestone))) {
    await writeAdminFeedNotification({
      title: '📈 Meeting milestone reached',
      body: `${milestone} groups have met on ${meetingDate}.`,
      category: 'admin_activity',
      event: 'meeting_milestone',
      data: {
        type: 'admin_event',
        meetingDate,
        milestone: String(milestone),
        notificationId: `meeting_milestone_${meetingDate}_${milestone}`
      }
    }, {
      sourceCollection: DAILY_ACTIVITY_COLLECTION,
      sourceEntityId: meetingDate
    });

    await Promise.all([
      mirrorNotificationToAdmins({
        title: '📈 Meeting milestone reached',
        body: `${milestone} groups have met on ${meetingDate}.`,
        event: 'meeting_milestone',
        data: {
          event: 'meeting_milestone',
          meetingDate,
          milestone: String(milestone),
          notificationId: `admin_push_meeting_milestone_${meetingDate}_${milestone}`
        },
        sourceCollection: DAILY_ACTIVITY_COLLECTION,
        sourceEntityId: meetingDate
      }),
      sendMovementActivityNotification({
        title: '🔥 Groups are meeting today',
        body: `${milestone} mission groups have already met today. God is moving through His people right now.`,
        event: 'meeting_milestone',
        data: {
          event: 'meeting_milestone',
          meetingDate,
          milestone: String(milestone),
          notificationId: `movement_meeting_milestone_${meetingDate}_${milestone}`
        },
        sourceCollection: DAILY_ACTIVITY_COLLECTION,
        sourceEntityId: meetingDate
      })
    ]);

    await dayRef.set({
      milestonesSent: FieldValue.arrayUnion(milestone)
    }, { merge: true });
  }

  return null;
});

exports.onMeetingCompleted = onDocumentUpdated('goMission_meetings/{meetingId}', async (event) => {
  const before = event.data?.before?.data() || {};
  const after = event.data?.after?.data() || {};
  const meetingId = String(event.params?.meetingId || '').trim();
  if (!meetingId) return null;
  if (after.adminCompletionNotifiedAt) return null;

  const beforeCompleted = Array.isArray(before.attendees) && before.attendees.some((item) => item?.leftAt);
  const afterCompleted = Array.isArray(after.attendees) && after.attendees.some((item) => item?.leftAt);
  if (!afterCompleted || beforeCompleted) return null;

  const groupId = String(after.groupId || '').trim();
  const meetingDate = String(after.date || '').trim();
  if (!groupId) return null;

  const groupDoc = await db.collection('goMission_groups').doc(groupId).get();
  const groupName = groupDoc.exists ? String(groupDoc.data()?.name || groupId) : groupId;
  const attendeeCount = Array.isArray(after.attendees) ? after.attendees.length : 0;

  await writeAdminFeedNotification({
    title: '✅ Group meeting finished',
    body: `${groupName} finished meeting${meetingDate ? ` on ${meetingDate}` : ''}${attendeeCount ? ` with ${attendeeCount} attendee${attendeeCount === 1 ? '' : 's'}` : ''}.`,
    category: 'admin_activity',
    event: 'meeting_completed',
    data: {
      type: 'admin_event',
      groupId,
      meetingId,
      meetingDate,
      attendeeCount: String(attendeeCount),
      notificationId: `meeting_completed_${meetingId}`
    }
  }, {
    sourceCollection: 'goMission_meetings',
    sourceEntityId: meetingId
  });

  await mirrorNotificationToAdmins({
    title: '✅ Group meeting finished',
    body: `${groupName} finished meeting${meetingDate ? ` on ${meetingDate}` : ''}${attendeeCount ? ` with ${attendeeCount} attendee${attendeeCount === 1 ? '' : 's'}` : ''}.`,
    event: 'meeting_completed',
    data: {
      event: 'meeting_completed',
      groupId,
      meetingId,
      meetingDate,
      attendeeCount: String(attendeeCount),
      notificationId: `admin_push_meeting_completed_${meetingId}`
    },
    sourceCollection: 'goMission_meetings',
    sourceEntityId: meetingId
  });

  await sendMovementActivityNotification({
    title: '✅ A mission group finished meeting',
    body: `${groupName} just finished meeting${attendeeCount ? ` with ${attendeeCount} attendee${attendeeCount === 1 ? '' : 's'}` : ''}. Thank God for what He is doing.`,
    event: 'meeting_completed',
    data: {
      event: 'meeting_completed',
      groupId,
      meetingId,
      meetingDate,
      attendeeCount: String(attendeeCount),
      notificationId: `movement_meeting_completed_${meetingId}`
    },
    sourceCollection: 'goMission_meetings',
    sourceEntityId: meetingId
  });

  await db.collection('goMission_meetings').doc(meetingId).set({
    adminCompletionNotifiedAt: FieldValue.serverTimestamp()
  }, { merge: true });

  return null;
});

// ============================================
// CALLABLE FUNCTIONS
// ============================================

function hasGroupMembership(memberData = {}) {
  if (!memberData || typeof memberData !== 'object') return false;
  const hasGuestGroups = Array.isArray(memberData.guestGroups) && memberData.guestGroups.length > 0;
  return Boolean(memberData.groupId || memberData.uplineGroupId || hasGuestGroups);
}

function isLeaderProfile(memberData = {}) {
  const roles = memberData.roles || {};
  return Boolean(
    roles.isGroupLeader ||
    roles.isTrainer ||
    roles.isShepherd ||
    roles.isAdmin ||
    memberData.groupRole === 'leader'
  );
}

function isActiveProfile(memberData = {}) {
  const status = String(memberData.status || '').toLowerCase();
  if (status === 'inactive' || status === 'paused') return false;
  return true;
}

async function sendToUsersInBatches(userIds = [], notification = {}, batchSize = 40) {
  let successCount = 0;
  let failureCount = 0;
  const errors = [];

  for (let i = 0; i < userIds.length; i += batchSize) {
    const chunk = userIds.slice(i, i + batchSize);
    const results = await sendToUsers(chunk, notification);

    results.forEach((result, idx) => {
      if (result?.success) {
        successCount += 1;
      } else {
        failureCount += 1;
        if (result?.error) {
          errors.push({
            userId: chunk[idx],
            error: String(result.error)
          });
        }
      }
    });
  }

  return { successCount, failureCount, errors };
}

exports.sendCustomNotification = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be logged in');
  }
  
  const {
    targetType,
    targetId,
    title,
    body,
    notificationType,
    targetFilter = {},
    announcementId = '',
    notificationId = ''
  } = request.data;
  const normalizedFilter = (targetFilter && typeof targetFilter === 'object') ? targetFilter : {};
  
  const userDoc = await db.collection('goMission_members').doc(request.auth.uid).get();
  const userData = userDoc.data() || {};
  const roleFlags = (userData.roles && !Array.isArray(userData.roles)) ? userData.roles : {};
  const roleList = Array.isArray(userData.roles) ? userData.roles : [];
  const callerEmail = String(request.auth.token?.email || userData.email || '').toLowerCase();
  const isAllowlistedAdmin =
    ADMIN_UID_ALLOWLIST.has(request.auth.uid) ||
    ADMIN_EMAIL_ALLOWLIST.has(callerEmail);
  const isAdmin = isAllowlistedAdmin || !!roleFlags.isAdmin || roleList.includes('admin');
  const isLeader = !!roleFlags.isGroupLeader ||
    !!roleFlags.isTrainer ||
    !!roleFlags.isShepherd ||
    roleList.includes('leader') ||
    roleList.includes('shepherd') ||
    isAdmin;
  
  if (!isLeader) {
    throw new HttpsError('permission-denied', 'Must be a leader or admin');
  }

  if (!title || !body) {
    throw new HttpsError('invalid-argument', 'Title and body are required');
  }
  
  const notification = {
    title,
    body,
    data: {
      type: notificationType || 'announcement',
      senderId: request.auth.uid,
      announcementId: announcementId ? String(announcementId) : '',
      notificationId: notificationId ? String(notificationId) : ''
    },
    sourceCollection: notificationType === 'announcement' ? 'goMission_announcements' : '',
    sourceEntityId: announcementId ? String(announcementId) : ''
  };
  
  let result;
  if (targetType === 'user') {
    if (!targetId) throw new HttpsError('invalid-argument', 'targetId is required for user');
    result = await sendToUser(targetId, notification);
  } else if (targetType === 'group') {
    if (!targetId) throw new HttpsError('invalid-argument', 'targetId is required for group');
    result = await sendToGroup(targetId, notification, request.auth.uid);
  } else if (targetType === 'all') {
    if (!isAdmin) {
      throw new HttpsError('permission-denied', 'Only admins can send to all users');
    }

    const usersSnapshot = await db.collection('goMission_members').get();
    let recipientIds = usersSnapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      data: docSnap.data() || {}
    }));

    if (normalizedFilter.inGroup === true) {
      recipientIds = recipientIds.filter((entry) => hasGroupMembership(entry.data));
    }
    if (normalizedFilter.leaderOnly === true) {
      recipientIds = recipientIds.filter((entry) => isLeaderProfile(entry.data));
    }
    if (normalizedFilter.activeOnly === true) {
      recipientIds = recipientIds.filter((entry) => isActiveProfile(entry.data));
    }

    const ids = recipientIds.map((entry) => entry.id);
    if (!ids.length) {
      return {
        success: true,
        targetCount: 0,
        successCount: 0,
        failureCount: 0,
        message: 'No recipients matched the selected filters.'
      };
    }

    const batchResult = await sendToUsersInBatches(ids, notification);
    result = {
      success: true,
      targetCount: ids.length,
      successCount: batchResult.successCount,
      failureCount: batchResult.failureCount,
      errors: batchResult.errors.slice(0, 25)
    };
  } else {
    throw new HttpsError('invalid-argument', 'Invalid target type');
  }
  
  return result;
});

exports.adminDeleteUser = onCall(async (request) => {
  const caller = await assertAdminCaller(request);
  const payload = (request.data && typeof request.data === 'object') ? request.data : {};
  const targetUid = String(payload.uid || '').trim();

  if (!targetUid) {
    throw new HttpsError('invalid-argument', 'uid is required');
  }

  if (targetUid === caller.uid) {
    throw new HttpsError('failed-precondition', 'Use Firebase Console for your own admin account. Self-delete is blocked here.');
  }

  const targetRef = db.collection('goMission_members').doc(targetUid);
  const targetSnap = await targetRef.get();
  const targetData = targetSnap.exists ? (targetSnap.data() || {}) : {};
  const targetEmail = String(targetData.email || '').toLowerCase().trim();
  const targetRoles = (targetData.roles && !Array.isArray(targetData.roles)) ? targetData.roles : {};
  const targetRoleList = Array.isArray(targetData.roles) ? targetData.roles : [];
  const targetIsAdmin = Boolean(
    targetRoles.isAdmin ||
    targetRoleList.includes('admin') ||
    ADMIN_UID_ALLOWLIST.has(targetUid) ||
    ADMIN_EMAIL_ALLOWLIST.has(targetEmail)
  );

  if (targetIsAdmin) {
    throw new HttpsError('failed-precondition', 'Admin accounts cannot be removed from this panel.');
  }

  const ledGroupsSnap = await db.collection('goMission_groups').where('leaderId', '==', targetUid).limit(5).get();
  if (!ledGroupsSnap.empty) {
    throw new HttpsError(
      'failed-precondition',
      `User is still leading ${ledGroupsSnap.size} group(s). Transfer or remove those groups first.`
    );
  }

  const { updatedGroups } = await cleanupUserGroupMembershipLinks(targetUid);
  const deletedNotifications = await deleteMemberNotificationInbox(targetUid);

  if (targetSnap.exists) {
    await targetRef.delete();
  }

  try {
    await adminAuth.deleteUser(targetUid);
  } catch (error) {
    if (error?.code !== 'auth/user-not-found') {
      throw error;
    }
  }

  return {
    success: true,
    uid: targetUid,
    deletedNotifications,
    cleanedGroups: updatedGroups
  };
});

exports.ensureMemberProfile = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be logged in');
  }

  const authUser = request.auth.token || {};
  const payload = (request.data && typeof request.data === 'object') ? request.data : {};
  const result = await ensureMemberProfileDocument(request.auth.uid, {
    displayName: String(payload.displayName || authUser.name || '').trim(),
    name: String(payload.name || payload.displayName || authUser.name || '').trim(),
    email: String(payload.email || authUser.email || '').trim(),
    photoURL: String(payload.photoURL || authUser.picture || '').trim()
  });

  return { success: true, ...result };
});

exports.submitMissionGroupJoinRequest = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be logged in');
  }

  const payload = (request.data && typeof request.data === 'object') ? request.data : {};
  const inviteCode = normalizeInviteCode(payload.code);
  if (!inviteCode || inviteCode.length !== 6) {
    throw new HttpsError('invalid-argument', 'Please enter a valid 6-character code.');
  }

  const target = await resolveInviteGroupTarget(inviteCode);
  if (!target?.groupRef) {
    throw new HttpsError('not-found', 'Invalid invite code.');
  }

  const authUser = request.auth.token || {};
  const userId = request.auth.uid;
  const memberDoc = await db.collection('goMission_members').doc(userId).get();
  const memberData = memberDoc.exists ? (memberDoc.data() || {}) : {};
  const targetGroupName = String(target.groupData?.name || 'this group');

  const joinRequest = {
    odId: userId,
    uid: userId,
    name: String(
      memberData.fullName ||
      memberData.displayName ||
      memberData.name ||
      authUser.name ||
      'Unknown'
    ).trim(),
    email: String(memberData.email || authUser.email || '').trim(),
    photo: String(memberData.photoURL || authUser.picture || '').trim(),
    requestedAt: new Date().toISOString(),
    inviteCode,
    hasExistingGroup: !!String(memberData.uplineGroupId || memberData.groupId || '').trim(),
    existingGroupId: String(memberData.uplineGroupId || memberData.groupId || '').trim() || null,
    existingGroupName: String(memberData.uplineGroupName || memberData.groupName || '').trim() || null,
    existingLeaderName: String(memberData.uplineLeaderName || '').trim() || null
  };

  try {
    const result = await db.runTransaction(async (transaction) => {
      const liveGroupDoc = await transaction.get(target.groupRef);
      if (!liveGroupDoc.exists) {
        throw new HttpsError('not-found', 'This group no longer exists.');
      }

      const liveGroupData = liveGroupDoc.data() || {};
      const liveGroupName = String(liveGroupData.name || targetGroupName || 'this group');
      const codeMatchesGroup = normalizeInviteCode(liveGroupData.inviteCode) === inviteCode;
      if (!codeMatchesGroup) {
        throw new HttpsError('failed-precondition', 'This invite code is no longer linked to this group.');
      }

      const codeExpiry = toDateOrNull(target.codeData?.expiresAt);
      const legacyExpiry = toDateOrNull(liveGroupData.inviteCodeExpiresAt);
      const effectiveExpiry = codeExpiry || legacyExpiry;
      if (effectiveExpiry && effectiveExpiry.getTime() < Date.now()) {
        throw new HttpsError('failed-precondition', 'This invite code has expired. Ask the group leader for a new code.');
      }

      let liveCodeUsedCount = Number(target.codeData?.usedCount || 0);

      if (target.codeRef) {
        const liveCodeDoc = await transaction.get(target.codeRef);
        if (liveCodeDoc.exists) {
          const liveCodeData = liveCodeDoc.data() || {};
          const liveMaxUses = Number(liveCodeData.maxUses || 0);
          liveCodeUsedCount = Number(liveCodeData.usedCount || 0);
          if (liveMaxUses > 0 && liveCodeUsedCount >= liveMaxUses) {
            throw new HttpsError('failed-precondition', 'This invite code has reached its usage limit.');
          }
        }
      }

      if (isUserAlreadyInGroup(liveGroupData, userId)) {
        throw new HttpsError('already-exists', `You are already part of ${liveGroupName}.`);
      }

      const existingRequests = collectRequests(liveGroupData);
      if (existingRequests.some((entry) => entry.requesterId === userId)) {
        throw new HttpsError('already-exists', `You already have a pending request for ${liveGroupName}.`);
      }

      const normalizedJoinRequests = Array.isArray(liveGroupData.joinRequests)
        ? liveGroupData.joinRequests.filter((entry) => entry && typeof entry === 'object')
        : [];

      transaction.set(target.groupRef, {
        joinRequests: [...normalizedJoinRequests, joinRequest]
      }, { merge: true });

      if (target.codeRef) {
        transaction.set(target.codeRef, {
          usedCount: liveCodeUsedCount + 1,
          lastUsedAt: FieldValue.serverTimestamp(),
          lastUsedBy: userId
        }, { merge: true });
      }

      return {
        success: true,
        groupId: liveGroupDoc.id,
        groupName: liveGroupName
      };
    });

    return result;
  } catch (error) {
    if (error instanceof HttpsError) {
      throw error;
    }

    console.error('[submitMissionGroupJoinRequest] Failed:', error);
    throw new HttpsError('internal', 'Could not send join request right now.');
  }
});

exports.registerToken = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be logged in');
  }
  
  const { token } = request.data;
  if (!token) {
    throw new HttpsError('invalid-argument', 'Token required');
  }
  
  const normalizedToken = String(token || '').trim();
  const memberRef = db.collection('goMission_members').doc(request.auth.uid);
  await db.runTransaction(async (transaction) => {
    const memberSnap = await transaction.get(memberRef);
    const memberData = memberSnap.exists ? (memberSnap.data() || {}) : {};
    transaction.set(memberRef, {
      fcmTokens: normalizeTokenList(memberData.fcmTokens || [], normalizedToken),
      lastTokenUpdate: FieldValue.serverTimestamp(),
      lastTokenUpdateIso: new Date().toISOString()
    }, { merge: true });
  });
  
  return { success: true };
});

exports.unregisterToken = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be logged in');
  }
  
  const { token } = request.data;
  if (!token) {
    throw new HttpsError('invalid-argument', 'Token required');
  }
  
  const normalizedToken = String(token || '').trim();
  const memberRef = db.collection('goMission_members').doc(request.auth.uid);
  await db.runTransaction(async (transaction) => {
    const memberSnap = await transaction.get(memberRef);
    const memberData = memberSnap.exists ? (memberSnap.data() || {}) : {};
    const nextTokens = normalizeTokenList(memberData.fcmTokens || []).filter((value) => value !== normalizedToken);
    transaction.set(memberRef, {
      fcmTokens: nextTokens,
      lastTokenUpdate: FieldValue.serverTimestamp(),
      lastTokenUpdateIso: new Date().toISOString()
    }, { merge: true });
  });
  
  return { success: true };
});

exports.clearBadge = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be logged in');
  }
  
  await db.collection('goMission_members').doc(request.auth.uid).update({
    unreadCount: 0
  });
  
  return { success: true };
});

exports.sendDailyReminder = onSchedule({
  schedule: '0 6 * * *',
  timeZone: 'Asia/Manila',
}, async (event) => {
  const usersSnapshot = await db.collection('goMission_members')
    .where('settings.dailyReminder', '==', true)
    .get();
  
  if (usersSnapshot.empty) return null;
  
  const notification = {
    title: '🌅 Good Morning!',
    body: 'Start your day with God. Your daily reading awaits.',
    data: { type: 'daily_reminder' }
  };
  
  const userIds = usersSnapshot.docs.map(doc => doc.id);
  await sendToUsers(userIds, notification);
  
  return null;
});

// ============================================
// PASSWORD RESET WITH EMAIL CODE
// ============================================

/**
 * Generate a 6-digit verification code
 */
function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Send password reset code to user's email
 * Stores code in Firestore with 15-minute expiry
 */
exports.sendPasswordResetCode = onCall({ secrets: [gmailEmail, gmailPassword] }, async (request) => {
  const { email } = request.data;
  
  if (!email) {
    throw new HttpsError('invalid-argument', 'Email is required');
  }
  
  const normalizedEmail = email.toLowerCase().trim();
  
  // Check if user exists in Firebase Auth
  let userRecord;
  try {
    userRecord = await adminAuth.getUserByEmail(normalizedEmail);
  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      // Don't reveal if email exists or not for security
      // But return success anyway to prevent email enumeration
      return { success: true, message: 'If an account exists, a code has been sent.' };
    }
    throw new HttpsError('internal', 'Error checking user');
  }
  
  // Generate 6-digit code
  const code = generateVerificationCode();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
  
  // Store code in Firestore
  await db.collection('goMission_passwordResets').doc(normalizedEmail).set({
    code: code,
    email: normalizedEmail,
    uid: userRecord.uid,
    expiresAt: expiresAt,
    attempts: 0,
    createdAt: FieldValue.serverTimestamp()
  });
  
  // Send email with verification code
  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #1a0505; color: #ffffff; padding: 40px 20px; margin: 0;">
      <div style="max-width: 500px; margin: 0 auto; background: linear-gradient(135deg, #2a0a0a 0%, #1a0505 100%); border-radius: 16px; padding: 40px; border: 1px solid #3d1515;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #f59e0b; font-size: 24px; margin: 0; letter-spacing: 3px;">★ GO MISSION ★</h1>
        </div>
        
        <h2 style="color: #ffffff; font-size: 20px; margin-bottom: 20px; text-align: center;">Password Reset Code</h2>
        
        <p style="color: #a8a29e; font-size: 14px; line-height: 1.6; margin-bottom: 30px; text-align: center;">
          You requested to reset your password. Use this verification code:
        </p>
        
        <div style="background: #3d1515; border-radius: 12px; padding: 25px; text-align: center; margin-bottom: 30px;">
          <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #f59e0b;">${code}</span>
        </div>
        
        <p style="color: #78716c; font-size: 12px; text-align: center; margin-bottom: 20px;">
          This code expires in <strong style="color: #f59e0b;">15 minutes</strong>
        </p>
        
        <hr style="border: none; border-top: 1px solid #3d1515; margin: 30px 0;">
        
        <p style="color: #57534e; font-size: 11px; text-align: center; line-height: 1.5;">
          If you didn't request this, you can safely ignore this email.<br>
          Your password will not be changed.
        </p>
      </div>
    </body>
    </html>
  `;
  
  // Try to send email using secrets
  const emailSent = await sendEmailWithCredentials(
    normalizedEmail,
    '🔐 Go Mission - Password Reset Code',
    emailHtml,
    gmailEmail.value(),
    gmailPassword.value()
  );
  
  // Log for debugging
  console.log(`Password reset code for ${normalizedEmail}: ${code} (email sent: ${emailSent})`);
  
  return { 
    success: true, 
    message: 'Verification code sent to your email.',
    emailSent: emailSent
  };
});

/**
 * Verify the password reset code
 */
exports.verifyPasswordResetCode = onCall(async (request) => {
  const { email, code } = request.data;
  
  if (!email || !code) {
    throw new HttpsError('invalid-argument', 'Email and code are required');
  }
  
  const normalizedEmail = email.toLowerCase().trim();
  
  // Get the reset document
  const resetDoc = await db.collection('goMission_passwordResets').doc(normalizedEmail).get();
  
  if (!resetDoc.exists) {
    throw new HttpsError('not-found', 'No reset code found. Please request a new one.');
  }
  
  const resetData = resetDoc.data();
  
  // Check if expired
  if (resetData.expiresAt.toDate() < new Date()) {
    await db.collection('goMission_passwordResets').doc(normalizedEmail).delete();
    throw new HttpsError('deadline-exceeded', 'Code has expired. Please request a new one.');
  }
  
  // Check attempts (max 5)
  if (resetData.attempts >= 5) {
    await db.collection('goMission_passwordResets').doc(normalizedEmail).delete();
    throw new HttpsError('resource-exhausted', 'Too many attempts. Please request a new code.');
  }
  
  // Increment attempts
  await db.collection('goMission_passwordResets').doc(normalizedEmail).update({
    attempts: FieldValue.increment(1)
  });
  
  // Verify code
  if (resetData.code !== code) {
    throw new HttpsError('permission-denied', 'Invalid code. Please try again.');
  }
  
  // Code is valid! Generate a temporary token for password reset
  // Mark as verified
  await db.collection('goMission_passwordResets').doc(normalizedEmail).update({
    verified: true,
    verifiedAt: FieldValue.serverTimestamp()
  });
  
  return { 
    success: true, 
    message: 'Code verified successfully.',
    uid: resetData.uid
  };
});

/**
 * Complete password reset after code verification
 */
exports.completePasswordReset = onCall(async (request) => {
  const { email, code, newPassword } = request.data;
  
  if (!email || !code || !newPassword) {
    throw new HttpsError('invalid-argument', 'Email, code, and new password are required');
  }
  
  if (newPassword.length < 6) {
    throw new HttpsError('invalid-argument', 'Password must be at least 6 characters');
  }
  
  const normalizedEmail = email.toLowerCase().trim();
  
  // Get the reset document
  const resetDoc = await db.collection('goMission_passwordResets').doc(normalizedEmail).get();
  
  if (!resetDoc.exists) {
    throw new HttpsError('not-found', 'No reset session found. Please start over.');
  }
  
  const resetData = resetDoc.data();
  
  // Check if verified
  if (!resetData.verified) {
    throw new HttpsError('failed-precondition', 'Code not verified. Please verify first.');
  }
  
  // Check if still valid (give 5 more minutes after verification)
  const verifiedAt = resetData.verifiedAt?.toDate() || new Date(0);
  if (new Date() - verifiedAt > 5 * 60 * 1000) {
    await db.collection('goMission_passwordResets').doc(normalizedEmail).delete();
    throw new HttpsError('deadline-exceeded', 'Session expired. Please start over.');
  }
  
  // Verify code one more time
  if (resetData.code !== code) {
    throw new HttpsError('permission-denied', 'Invalid code.');
  }
  
  // Update password using Admin SDK
  try {
    await adminAuth.updateUser(resetData.uid, {
      password: newPassword
    });
  } catch (error) {
    console.error('Error updating password:', error);
    throw new HttpsError('internal', 'Failed to update password. Please try again.');
  }
  
  // Clean up reset document
  await db.collection('goMission_passwordResets').doc(normalizedEmail).delete();
  
  return { 
    success: true, 
    message: 'Password updated successfully. You can now sign in.'
  };
});

/**
 * Clean up expired password reset codes (runs daily)
 */
exports.cleanupExpiredResetCodes = onSchedule({
  schedule: '0 0 * * *', // Daily at midnight
  timeZone: 'Asia/Manila',
}, async (event) => {
  const now = new Date();
  
  const expiredDocs = await db.collection('goMission_passwordResets')
    .where('expiresAt', '<', now)
    .get();
  
  const batch = db.batch();
  expiredDocs.docs.forEach(doc => {
    batch.delete(doc.ref);
  });
  
  await batch.commit();
  console.log(`Cleaned up ${expiredDocs.size} expired password reset codes`);
  
  return null;
});

/**
 * One-time system dispatch for Journal update announcement.
 * Runs on a minute schedule but sends only once (guarded by fixed doc id).
 */
exports.dispatchJournalUpdateAnnouncement = onSchedule({
  schedule: '0 * * * *',
  timeZone: 'Asia/Manila',
}, async () => {
  await ensureSystemNotificationTemplatesSeeded();
  const sendAfter = Date.parse('2026-03-05T00:25:00+08:00');
  if (Number.isFinite(sendAfter) && Date.now() < sendAfter) {
    return null;
  }

  const announcementId = 'sys_journal_update_20260305';
  const announcementRef = db.collection('goMission_announcements').doc(announcementId);
  const title = 'Journal Update (March 6, 2026)';
  const body = 'Journal now includes Prayer Tracker, improved mobile scrolling, entry view/edit actions, and better answered-prayer follow-up. Please refresh your app for the latest experience.';

  try {
    await announcementRef.create({
      title,
      body,
      audience: 'all_users',
      pushRequested: true,
      source: 'system_scheduler',
      deliveryMode: 'one_time',
      notificationTag: 'announcement_release',
      status: 'dispatching',
      createdByUid: 'system',
      createdByEmail: 'system@gomission.local',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    });
  } catch (error) {
    const code = String(error?.code || '');
    const message = String(error?.message || '');
    if (code === '6' || code.toLowerCase() === 'already-exists' || message.includes('Already exists')) {
      return null;
    }
    throw error;
  }

  const usersSnapshot = await db.collection('goMission_members').get();
  const recipientIds = usersSnapshot.docs
    .map((docSnap) => ({ id: docSnap.id, data: docSnap.data() || {} }))
    .filter((entry) => isActiveProfile(entry.data))
    .map((entry) => entry.id);

  let sendResult = {
    successCount: 0,
    failureCount: 0,
    errors: []
  };

  if (recipientIds.length > 0) {
    sendResult = await sendToUsersInBatches(recipientIds, {
      title,
      body,
      data: {
        type: 'announcement',
        announcementId
      }
    });
  }

  console.log(
    `[JournalAnnouncement] Dispatch result: targets=${recipientIds.length}, success=${sendResult.successCount || 0}, failure=${sendResult.failureCount || 0}`
  );

  await announcementRef.set({
    status: 'sent',
    sentAt: FieldValue.serverTimestamp(),
    dispatch: {
      targetCount: recipientIds.length,
      successCount: Number(sendResult.successCount || 0),
      failureCount: Number(sendResult.failureCount || 0),
      errors: Array.isArray(sendResult.errors) ? sendResult.errors.slice(0, 25) : []
    },
    updatedAt: FieldValue.serverTimestamp()
  }, { merge: true });

  console.log('[JournalAnnouncement] Marked as sent.');

  return null;
});

/**
 * One-time system dispatch for newly added Bible insights books.
 * Sends once to all users and then no-ops on subsequent runs.
 */
exports.dispatchInsightsBooksAnnouncement = onSchedule({
  schedule: '0 * * * *',
  timeZone: 'Asia/Manila',
}, async () => {
  await ensureSystemNotificationTemplatesSeeded();
  const sendAfter = Date.parse('2026-03-05T14:30:00+08:00');
  if (Number.isFinite(sendAfter) && Date.now() < sendAfter) {
    return null;
  }

  const announcementId = 'sys_insights_books_1th_2th_hag_jon_20260305';
  const announcementRef = db.collection('goMission_announcements').doc(announcementId);
  const title = 'New Bible Insights Ready';
  const body = 'Insights are now available for 1 Thessalonians, 2 Thessalonians, Haggai, and Jonah. Open Bible and explore these books today.';

  try {
    await announcementRef.create({
      title,
      body,
      audience: 'all_users',
      pushRequested: true,
      source: 'system_scheduler',
      deliveryMode: 'one_time',
      notificationTag: 'announcement_release',
      status: 'dispatching',
      createdByUid: 'system',
      createdByEmail: 'system@gomission.local',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    });
  } catch (error) {
    const code = String(error?.code || '');
    const message = String(error?.message || '');
    if (code === '6' || code.toLowerCase() === 'already-exists' || message.includes('Already exists')) {
      return null;
    }
    throw error;
  }

  const usersSnapshot = await db.collection('goMission_members').get();
  const recipientIds = usersSnapshot.docs
    .map((docSnap) => ({ id: docSnap.id, data: docSnap.data() || {} }))
    .filter((entry) => isActiveProfile(entry.data))
    .map((entry) => entry.id);

  let sendResult = {
    successCount: 0,
    failureCount: 0,
    errors: []
  };

  if (recipientIds.length > 0) {
    sendResult = await sendToUsersInBatches(recipientIds, {
      title,
      body,
      data: {
        type: 'announcement',
        announcementId
      }
    });
  }

  await announcementRef.set({
    status: 'sent',
    sentAt: FieldValue.serverTimestamp(),
    dispatch: {
      targetCount: recipientIds.length,
      successCount: Number(sendResult.successCount || 0),
      failureCount: Number(sendResult.failureCount || 0),
      errors: Array.isArray(sendResult.errors) ? sendResult.errors.slice(0, 25) : []
    },
    updatedAt: FieldValue.serverTimestamp()
  }, { merge: true });

  console.log(
    `[InsightsAnnouncement] Sent: targets=${recipientIds.length}, success=${sendResult.successCount || 0}, failure=${sendResult.failureCount || 0}`
  );

  return null;
});

/**
 * Sends Conversation Time motivation notifications every other day.
 * Rotates through 30 repeatable templates stored in goMission_notificationTemplates.
 */
exports.dispatchConversationTimeMotivation = onSchedule({
  schedule: '0 6 * * *',
  timeZone: MOTIVATION_TIMEZONE,
}, async () => {
  await ensureSystemNotificationTemplatesSeeded();

  const motivationEnabled = await isMotivationPushEnabled();
  if (!motivationEnabled) {
    console.log('[Motivation] Skipped: push setting disabled.');
    return null;
  }

  const stateRef = db.collection('goMission_config').doc(MOTIVATION_ROTATION_STATE_DOC);
  const stateDoc = await stateRef.get();
  const state = stateDoc.exists ? (stateDoc.data() || {}) : {};

  if (state.enabled === false) {
    console.log('[Motivation] Skipped: rotation disabled in config.');
    return null;
  }

  const startDateKey = String(state.startDate || MOTIVATION_START_DATE_KEY);
  const todayKey = getManilaDateKey();
  const everyDays = Math.max(1, Number(state.triggerEveryDays || MOTIVATION_TRIGGER_EVERY_DAYS));
  const dayDiff = getDayDiff(startDateKey, todayKey);

  if (dayDiff === null || dayDiff < 0) {
    console.log(`[Motivation] Skipped: before start date (${startDateKey}).`);
    return null;
  }
  if (dayDiff % everyDays !== 0) {
    console.log(`[Motivation] Skipped: cadence check failed (every ${everyDays} days).`);
    return null;
  }
  if (String(state.lastSentDateKey || '') === todayKey) {
    console.log(`[Motivation] Skipped: already sent on ${todayKey}.`);
    return null;
  }

  const templates = await getMotivationTemplatesFromStore();
  if (!templates.length) {
    console.log('[Motivation] Skipped: no active templates found.');
    return null;
  }

  const nextIndexRaw = Number(state.nextIndex || 0);
  const nextIndex = Number.isFinite(nextIndexRaw) && nextIndexRaw >= 0 ? nextIndexRaw : 0;
  const selectedTemplate = templates[nextIndex % templates.length];
  const title = String(selectedTemplate?.data?.title || 'Conversation Time with God').trim();
  const body = String(selectedTemplate?.data?.body || '').trim();
  if (!body) {
    console.log('[Motivation] Skipped: selected template body is empty.');
    return null;
  }

  const announcementId = `sys_motivation_conversation_time_${todayKey.replace(/-/g, '')}`;
  const announcementRef = db.collection('goMission_announcements').doc(announcementId);

  try {
    await announcementRef.create({
      title,
      body,
      audience: 'all_users',
      pushRequested: true,
      source: SYSTEM_TEMPLATE_SOURCE,
      deliveryMode: 'repeatable',
      notificationTag: MOTIVATION_NOTIFICATION_TAG,
      templateId: selectedTemplate.id,
      status: 'dispatching',
      createdByUid: 'system',
      createdByEmail: 'system@gomission.local',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    });
  } catch (error) {
    const code = String(error?.code || '');
    const message = String(error?.message || '');
    if (code === '6' || code.toLowerCase() === 'already-exists' || message.includes('Already exists')) {
      console.log('[Motivation] Skipped: daily announcement already exists.');
      return null;
    }
    throw error;
  }

  const usersSnapshot = await db.collection('goMission_members').get();
  const recipientIds = usersSnapshot.docs
    .map((docSnap) => ({ id: docSnap.id, data: docSnap.data() || {} }))
    .filter((entry) => isActiveProfile(entry.data))
    .map((entry) => entry.id);

  let sendResult = { successCount: 0, failureCount: 0, errors: [] };
  if (recipientIds.length > 0) {
    sendResult = await sendToUsersInBatches(recipientIds, {
      title,
      body,
      data: {
        type: 'announcement',
        notificationTag: MOTIVATION_NOTIFICATION_TAG,
        announcementId,
        templateId: selectedTemplate.id
      }
    });
  }

  await announcementRef.set({
    status: 'sent',
    sentAt: FieldValue.serverTimestamp(),
    dispatch: {
      targetCount: recipientIds.length,
      successCount: Number(sendResult.successCount || 0),
      failureCount: Number(sendResult.failureCount || 0),
      errors: Array.isArray(sendResult.errors) ? sendResult.errors.slice(0, 25) : []
    },
    updatedAt: FieldValue.serverTimestamp()
  }, { merge: true });

  await stateRef.set({
    enabled: state.enabled !== false,
    startDate: startDateKey,
    triggerEveryDays: everyDays,
    nextIndex: (nextIndex + 1) % templates.length,
    lastSentDateKey: todayKey,
    lastTemplateId: selectedTemplate.id,
    lastSentAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp()
  }, { merge: true });

  console.log(
    `[Motivation] Sent ${selectedTemplate.id} to ${recipientIds.length} users (success=${sendResult.successCount || 0}, failure=${sendResult.failureCount || 0})`
  );

  return null;
});

/**
 * Sends Join Mission Group encouragement sequence every other day
 * on dates that are NOT Conversation Time motivation dates.
 *
 * Target: active users who are not yet in any mission group.
 * Sequence: 30 messages, advancing per user on each successful send.
 */
exports.dispatchJoinMissionGroupSequence = onSchedule({
  schedule: '30 6 * * *',
  timeZone: JOIN_GROUP_TIMEZONE,
}, async () => {
  const todayKey = getManilaDateKey();

  const motivationStateDoc = await db.collection('goMission_config').doc(MOTIVATION_ROTATION_STATE_DOC).get();
  const motivationState = motivationStateDoc.exists ? (motivationStateDoc.data() || {}) : {};
  const motivationStartDateKey = String(motivationState.startDate || MOTIVATION_START_DATE_KEY);
  const motivationEveryDays = Math.max(
    1,
    Number(motivationState.triggerEveryDays || MOTIVATION_TRIGGER_EVERY_DAYS)
  );
  const motivationCadenceDay = isCadenceDay({
    todayKey,
    startDateKey: motivationStartDateKey,
    everyDays: motivationEveryDays
  });
  const motivationAlreadySentToday = String(motivationState.lastSentDateKey || '') === todayKey;

  if (motivationCadenceDay || motivationAlreadySentToday) {
    console.log('[JoinGroupSequence] Skipped: conversation-time motivation is active today.');
    return null;
  }

  const stateRef = db.collection('goMission_config').doc(JOIN_GROUP_ROTATION_STATE_DOC);
  const stateDoc = await stateRef.get();
  const state = stateDoc.exists ? (stateDoc.data() || {}) : {};
  if (state.enabled === false) {
    console.log('[JoinGroupSequence] Skipped: sequence disabled in config.');
    return null;
  }
  if (String(state.lastSentDateKey || '') === todayKey) {
    console.log(`[JoinGroupSequence] Skipped: already sent on ${todayKey}.`);
    return null;
  }

  const announcementId = `sys_join_mission_group_sequence_${todayKey.replace(/-/g, '')}`;
  const announcementRef = db.collection('goMission_announcements').doc(announcementId);
  const title = '🤝 Join a Mission Group';
  const body = 'Take your next step: connect with a mission group and grow together.';

  try {
    await announcementRef.create({
      title,
      body,
      audience: 'ungrouped_users',
      pushRequested: true,
      source: SYSTEM_TEMPLATE_SOURCE,
      deliveryMode: 'repeatable',
      notificationTag: JOIN_GROUP_NOTIFICATION_TAG,
      status: 'dispatching',
      createdByUid: 'system',
      createdByEmail: 'system@gomission.local',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    });
  } catch (error) {
    const code = String(error?.code || '');
    const message = String(error?.message || '');
    if (code === '6' || code.toLowerCase() === 'already-exists' || message.includes('Already exists')) {
      console.log('[JoinGroupSequence] Skipped: daily announcement already exists.');
      return null;
    }
    throw error;
  }

  const usersSnapshot = await db.collection('goMission_members').get();
  const activeUngroupedUsers = usersSnapshot.docs
    .map((docSnap) => ({ id: docSnap.id, data: docSnap.data() || {} }))
    .filter((entry) => isActiveProfile(entry.data))
    .filter((entry) => !hasGroupMembership(entry.data));

  let successCount = 0;
  let failureCount = 0;
  let skippedCount = 0;
  const errors = [];

  for (const entry of activeUngroupedUsers) {
    const memberId = entry.id;
    const memberData = entry.data || {};
    const campaignState = (memberData.notificationCampaigns?.joinMissionGroup || {});
    const lastSentDateKey = String(campaignState.lastSentDateKey || '');
    if (lastSentDateKey === todayKey) {
      skippedCount += 1;
      continue;
    }

    const nextIndexRaw = Number(campaignState.nextIndex);
    const nextIndex = Number.isFinite(nextIndexRaw) && nextIndexRaw >= 0 ? nextIndexRaw : 0;
    if (nextIndex >= JOIN_GROUP_MESSAGES.length) {
      skippedCount += 1;
      continue;
    }

    const messageNumber = nextIndex + 1;
    const messageBody = JOIN_GROUP_MESSAGES[nextIndex];
    const sendResult = await sendToUser(memberId, {
      title: `🤝 Join Mission Group (${messageNumber}/${JOIN_GROUP_MESSAGES.length})`,
      body: messageBody,
      data: {
        type: 'announcement',
        notificationTag: JOIN_GROUP_NOTIFICATION_TAG,
        campaign: 'join_mission_group',
        sequenceIndex: String(messageNumber),
        announcementId
      }
    });

    if (sendResult?.success) {
      successCount += 1;
      const nextMessageIndex = nextIndex + 1;
      const campaignUpdate = {
        nextIndex: nextMessageIndex,
        lastSentDateKey: todayKey,
        lastSentAt: FieldValue.serverTimestamp(),
        lastMessageNumber: messageNumber,
        lastMessageBody: messageBody,
        updatedAt: FieldValue.serverTimestamp()
      };
      if (nextMessageIndex >= JOIN_GROUP_MESSAGES.length) {
        campaignUpdate.completed = true;
        campaignUpdate.completedAt = FieldValue.serverTimestamp();
      }

      await db.collection('goMission_members').doc(memberId).set({
        notificationCampaigns: {
          joinMissionGroup: campaignUpdate
        }
      }, { merge: true });
    } else {
      failureCount += 1;
      errors.push({
        userId: memberId,
        error: String(sendResult?.error || 'Unknown error')
      });
    }
  }

  await announcementRef.set({
    status: 'sent',
    sentAt: FieldValue.serverTimestamp(),
    dispatch: {
      targetCount: activeUngroupedUsers.length,
      successCount,
      failureCount,
      skippedCount,
      errors: errors.slice(0, 25)
    },
    updatedAt: FieldValue.serverTimestamp()
  }, { merge: true });

  await sendMovementActivityNotification({
    title: '🤝 A fresh mission invitation is live today',
    body: 'Go Mission is inviting people to join community and take their next step. Open the app and encourage someone today.',
    event: 'join_group_sequence_broadcast',
    data: {
      event: 'join_group_sequence_broadcast',
      announcementId,
      notificationId: `movement_join_group_sequence_${todayKey}`
    },
    sourceCollection: 'goMission_announcements',
    sourceEntityId: announcementId
  });

  await stateRef.set({
    enabled: state.enabled !== false,
    lastSentDateKey: todayKey,
    lastSentAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp()
  }, { merge: true });

  console.log(
    `[JoinGroupSequence] Sent to ungrouped users: targets=${activeUngroupedUsers.length}, success=${successCount}, failure=${failureCount}, skipped=${skippedCount}`
  );

  return null;
});

/**
 * Dispatches due stage encouragement notifications and rolls forward next send time.
 */
exports.dispatchStageEncouragements = onSchedule({
  schedule: '*/30 * * * *',
  timeZone: STAGE_ENCOURAGEMENT_TIMEZONE,
}, async () => {
  await ensureSystemNotificationTemplatesSeeded();

  const templatesSnapshot = await db.collection('goMission_notificationTemplates').get();
  const dueTemplates = templatesSnapshot.docs
    .map((docSnap) => ({ id: docSnap.id, data: docSnap.data() || {}, ref: docSnap.ref }))
    .filter((entry) => entry.data.category === 'stage_encouragement' && entry.data.active !== false)
    .map((entry) => ({
      ...entry,
      scheduleConfig: normalizeStageEncouragementScheduleConfig(entry.data.scheduleConfig || {})
    }))
    .filter((entry) => entry.data.audienceStage)
    .filter((entry) => {
      const nextSendMs = Date.parse(String(entry.scheduleConfig.nextSendAt || ''));
      return Number.isFinite(nextSendMs) && nextSendMs <= Date.now();
    });

  if (!dueTemplates.length) {
    console.log('[StageEncouragement] No due templates.');
    return null;
  }

  const membersSnapshot = await db.collection('goMission_members').get();
  const members = membersSnapshot.docs.map((docSnap) => ({ id: docSnap.id, data: docSnap.data() || {} }));

  for (const template of dueTemplates) {
    const audienceStage = normalizeJourneyStageValue(template.data.audienceStage);
    const recipientEntries = members
      .filter((entry) => isActiveProfile(entry.data))
      .filter((entry) => normalizeJourneyStageValue(entry.data.stage) === audienceStage)
      .map((entry) => ({
        id: entry.id,
        data: entry.data || {},
        tokenCount: Array.isArray(entry.data?.fcmTokens) ? entry.data.fcmTokens.length : 0
      }));
    const recipientIds = recipientEntries.map((entry) => entry.id);

    const notificationId = `stage_encouragement_${template.id}_${Date.now()}`;
    let sendResult = { successCount: 0, failureCount: 0, errors: [] };

    if (recipientIds.length) {
      sendResult = await sendToUsersInBatches(recipientIds, {
        title: String(template.data.title || 'Mission Encouragement'),
        body: String(template.data.body || '').trim(),
        category: 'stage_encouragement',
        notificationTag: String(template.data.notificationTag || `${STAGE_ENCOURAGEMENT_NOTIFICATION_TAG_PREFIX}${audienceStage}`),
        notificationId,
        data: {
          type: 'announcement',
          notificationId,
          notificationTag: String(template.data.notificationTag || `${STAGE_ENCOURAGEMENT_NOTIFICATION_TAG_PREFIX}${audienceStage}`),
          stage: audienceStage,
          templateId: template.id,
          focusArea: String(template.data.focusArea || ''),
          verseReference: String(template.data.verseReference || '')
        }
      });
    }

    const errorMap = new Map(
      (Array.isArray(sendResult.errors) ? sendResult.errors : []).map((item) => [
        String(item?.userId || '').trim(),
        String(item?.error || '').trim()
      ]).filter(([userId]) => !!userId)
    );
    const targetedUsers = recipientEntries.map((entry) => {
      if (entry.tokenCount <= 0) {
        return buildStageEncouragementRecipientRecord(entry.id, entry.data, {
          status: 'no_token',
          error: 'No tokens'
        });
      }
      if (errorMap.has(entry.id)) {
        return buildStageEncouragementRecipientRecord(entry.id, entry.data, {
          status: 'failed',
          error: errorMap.get(entry.id)
        });
      }
      return buildStageEncouragementRecipientRecord(entry.id, entry.data, {
        status: 'sent'
      });
    });

    await writeAdminFeedNotification({
      title: `Stage encouragement sent: ${template.data.title || template.id}`,
      body: `Stage: ${audienceStage}. Recipients: ${recipientIds.length}. Success: ${sendResult.successCount || 0}. Failures: ${sendResult.failureCount || 0}.`,
      category: 'stage_encouragement',
      data: {
        type: 'stage_encouragement_admin',
        templateId: template.id,
        stage: audienceStage,
        recipientCount: String(recipientIds.length),
        successCount: String(sendResult.successCount || 0),
        failureCount: String(sendResult.failureCount || 0)
      },
      sourceCollection: 'goMission_notificationTemplates',
      sourceEntityId: template.id
    });

    await mirrorNotificationToAdmins({
      title: `📬 Stage encouragement sent`,
      body: `${template.data.title || template.id} went to ${formatJourneyStageLabel(audienceStage)} users. Recipients: ${recipientIds.length}. Success: ${sendResult.successCount || 0}. Failures: ${sendResult.failureCount || 0}.`,
      event: 'stage_encouragement_sent',
      data: {
        event: 'stage_encouragement_sent',
        templateId: template.id,
        stage: audienceStage,
        recipientCount: String(recipientIds.length),
        successCount: String(sendResult.successCount || 0),
        failureCount: String(sendResult.failureCount || 0),
        notificationId: `admin_push_stage_encouragement_${template.id}_${Date.now()}`
      },
      sourceCollection: 'goMission_notificationTemplates',
      sourceEntityId: template.id
    });

    await sendMovementActivityNotification({
      title: '📬 Fresh mission encouragement is live',
      body: `${template.data.title || 'A new encouragement'} is now active in Go Mission. Open the app and respond today.`,
      event: 'stage_encouragement_broadcast',
      data: {
        event: 'stage_encouragement_broadcast',
        templateId: template.id,
        stage: audienceStage,
        notificationId: `movement_stage_encouragement_${template.id}_${Date.now()}`
      },
      sourceCollection: 'goMission_notificationTemplates',
      sourceEntityId: template.id
    });

    const nextScheduleConfig = normalizeStageEncouragementScheduleConfig({
      ...template.scheduleConfig,
      nextSendAt: template.scheduleConfig.loopEnabled === false
        ? ''
        : buildRandomStageEncouragementNextSendAt(template.scheduleConfig),
      lastSentAt: new Date().toISOString(),
      lastRecipientCount: recipientIds.length
    });

    if (template.scheduleConfig.loopEnabled === false) {
      nextScheduleConfig.nextSendAt = '';
    }

    await writeStageEncouragementRun({
      runId: `stage_encouragement_run_${template.id}_${Date.now()}`,
      templateId: template.id,
      templateTitle: String(template.data.title || template.id),
      stage: audienceStage,
      focusArea: String(template.data.focusArea || ''),
      recipientCount: recipientIds.length,
      successCount: Number(sendResult.successCount || 0),
      failureCount: Number(sendResult.failureCount || 0),
      notificationId,
      nextSendAt: String(nextScheduleConfig.nextSendAt || ''),
      loopEnabled: nextScheduleConfig.loopEnabled !== false,
      targetedUsers,
      errors: Array.isArray(sendResult.errors) ? sendResult.errors : []
    });

    await template.ref.set({
      scheduleConfig: nextScheduleConfig,
      updatedAt: FieldValue.serverTimestamp(),
      updatedByUid: 'system',
      updatedByEmail: 'system@gomission.local'
    }, { merge: true });

    console.log(
      `[StageEncouragement] Template=${template.id} stage=${audienceStage} recipients=${recipientIds.length} success=${sendResult.successCount || 0} failure=${sendResult.failureCount || 0}`
    );
  }

  return null;
});
