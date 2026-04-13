const { cert, getApps, initializeApp } = require('firebase-admin/app');
const { FieldValue, getFirestore } = require('firebase-admin/firestore');

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS'
};

const SEEKER_COLLECTION = 'goMission_vlogEngagementSeekers';

const STATUS_DESCRIPTIONS = {
  Processing: 'Coordinating with leaders',
  Endorsed: 'Pasted the profile to messenger group chat of the leader who will share the gospel',
  'Shared Gospel': 'They were able to share the gospel and the person accepted',
  Disciple: 'Actively joining group',
  Training: 'Active and Enrolled in Disciple-Making Launchpad',
  Discipler: 'Leading his own M-Group',
  Builder: 'Has 6 generations of disciples',
  Multiplier: 'Has 8 and up generations of disciples'
};

const EDITABLE_FIELDS = [
  'dateRecorded',
  'name',
  'email',
  'age',
  'gender',
  'maritalStatus',
  'mobileNo',
  'preferredDay',
  'preferredTime',
  'church',
  'profile',
  'status',
  'statusNotes',
  'coordinatorNote',
  'leaderName',
  'leaderDay',
  'leaderTime',
  'leaderGroupChatName'
];

let dbInstance = null;

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function getServiceAccount() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    const parsed = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    if (parsed.private_key) {
      parsed.private_key = parsed.private_key.replace(/\\n/g, '\n');
    }
    return parsed;
  }

  return {
    projectId: requiredEnv('FIREBASE_PROJECT_ID'),
    clientEmail: requiredEnv('FIREBASE_CLIENT_EMAIL'),
    privateKey: requiredEnv('FIREBASE_PRIVATE_KEY').replace(/\\n/g, '\n')
  };
}

function getDb() {
  if (dbInstance) return dbInstance;

  if (!getApps().length) {
    initializeApp({
      credential: cert(getServiceAccount())
    });
  }

  dbInstance = getFirestore();
  return dbInstance;
}

function json(statusCode, payload) {
  return {
    statusCode,
    headers: JSON_HEADERS,
    body: JSON.stringify(payload)
  };
}

function optionsResponse() {
  return {
    statusCode: 204,
    headers: JSON_HEADERS
  };
}

function manilaDate() {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila',
    year: '2-digit',
    month: 'numeric',
    day: 'numeric'
  }).format(new Date());
}

function sanitizeStatus(status) {
  return STATUS_DESCRIPTIONS[status] ? status : 'Processing';
}

function pickName(extraction = {}) {
  return extraction.seeker_name || extraction.facebook_profile_name || extraction.messenger_contact || '';
}

function buildProfileSummary(extraction = {}, rawText = '', coordinatorNote = '') {
  const sections = [];

  if (extraction.facebook_profile_name && extraction.facebook_profile_name !== pickName(extraction)) {
    sections.push(`Facebook profile: ${extraction.facebook_profile_name}`);
  }
  if (extraction.lead_stage) sections.push(`Lead stage: ${extraction.lead_stage}`);
  if (extraction.location) sections.push(`Location: ${extraction.location}`);
  if (extraction.messenger_contact) sections.push(`Messenger: ${extraction.messenger_contact}`);
  if (extraction.profile_image_notes) sections.push(`Profile image: ${extraction.profile_image_notes}`);
  if (extraction.screenshot_notes) sections.push(`Screenshot notes: ${extraction.screenshot_notes}`);
  if (rawText) sections.push(`Pasted text: ${rawText}`);
  if (extraction.raw_pasted_text) sections.push(`Visible text: ${extraction.raw_pasted_text}`);
  if (coordinatorNote) sections.push(`Coordinator note: ${coordinatorNote}`);

  return sections.join(' | ');
}

function buildSeekerRecord({ extraction = {}, followUpStatus = 'Processing', coordinatorNote = '', rawText = '' }) {
  const status = sanitizeStatus(followUpStatus);

  return {
    recordType: 'seeker_monitoring',
    sourceChannel: 'vlogs_engagement',
    isAppUser: false,
    dateRecorded: manilaDate(),
    name: pickName(extraction),
    email: extraction.email || '',
    age: extraction.age || '',
    gender: extraction.gender || '',
    maritalStatus: extraction.marital_status || '',
    mobileNo: extraction.mobile_number || '',
    preferredDay: extraction.preferred_day || '',
    preferredTime: extraction.preferred_time || '',
    church: extraction.church || '',
    profile: buildProfileSummary(extraction, rawText, coordinatorNote),
    status,
    statusNotes: STATUS_DESCRIPTIONS[status],
    coordinatorNote,
    leaderName: '',
    leaderDay: '',
    leaderTime: '',
    leaderGroupChatName: '',
    summary: extraction.summary || '',
    rawPastedText: rawText || extraction.raw_pasted_text || '',
    extraction
  };
}

function serializeTimestamp(value) {
  if (!value) return '';
  if (typeof value.toDate === 'function') {
    return value.toDate().toISOString();
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  return String(value);
}

function serializeSeekerDoc(snapshot) {
  const data = snapshot.data() || {};
  const status = sanitizeStatus(data.status);

  return {
    id: snapshot.id,
    recordType: data.recordType || 'seeker_monitoring',
    sourceChannel: data.sourceChannel || 'vlogs_engagement',
    isAppUser: data.isAppUser === true,
    dateRecorded: data.dateRecorded || '',
    name: data.name || '',
    email: data.email || '',
    age: data.age || '',
    gender: data.gender || '',
    maritalStatus: data.maritalStatus || '',
    mobileNo: data.mobileNo || '',
    preferredDay: data.preferredDay || '',
    preferredTime: data.preferredTime || '',
    church: data.church || '',
    profile: data.profile || '',
    status,
    statusNotes: data.statusNotes || STATUS_DESCRIPTIONS[status],
    coordinatorNote: data.coordinatorNote || '',
    leaderName: data.leaderName || '',
    leaderDay: data.leaderDay || '',
    leaderTime: data.leaderTime || '',
    leaderGroupChatName: data.leaderGroupChatName || '',
    summary: data.summary || '',
    rawPastedText: data.rawPastedText || '',
    createdAt: serializeTimestamp(data.createdAt),
    updatedAt: serializeTimestamp(data.updatedAt)
  };
}

function buildUpdatePatch(input = {}) {
  const patch = {};

  for (const field of EDITABLE_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(input, field)) {
      patch[field] = typeof input[field] === 'string' ? input[field].trim() : input[field];
    }
  }

  if (Object.prototype.hasOwnProperty.call(patch, 'status')) {
    patch.status = sanitizeStatus(patch.status);
    patch.statusNotes = STATUS_DESCRIPTIONS[patch.status];
  }

  patch.updatedAt = FieldValue.serverTimestamp();
  return patch;
}

module.exports = {
  FieldValue,
  SEEKER_COLLECTION,
  STATUS_DESCRIPTIONS,
  buildSeekerRecord,
  buildUpdatePatch,
  getDb,
  json,
  optionsResponse,
  sanitizeStatus,
  serializeSeekerDoc
};
