import {
  auth,
  db,
  storage,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  onAuthStateChanged,
  serverTimestamp,
  storageRef,
  uploadBytes,
  getDownloadURL
} from '../js/firebase-config.js';

const SEEKER_COLLECTION = 'goMission_vlogEngagementSeekers';
const LEADER_COLLECTION = 'goMission_vlogEngagementLeaders';
const MEMBER_COLLECTION = 'goMission_members';
const SEEKER_MONITORING_ALLOWED_NAMES = ['Dona Perez', 'Chatty Claveria'];
const SEEKER_MONITORING_ADMIN_EMAILS = ['michael.marga@gmail.com', 'vasquezperlie18@gmail.com'];
const STATUSES = [
  'Processing',
  'Endorsed',
  'Shared Gospel',
  'Disciple',
  'Training',
  'Discipler',
  'Builder',
  'Multiplier'
];

const DEFAULT_LEADERS = [
  { name: 'Nick', day: 'Monday', time: '8PM', groupChatName: 'Bro. Nick Monday Group 8pm' },
  { name: 'Hener', day: 'Monday', time: '8PM', groupChatName: 'BRO HENER- WOTG MONDAY 8PM MALE' },
  { name: 'Marvin', day: 'Tuesday', time: '8PM', groupChatName: 'Bro Marvin - WOTG Tuesday 8PM' },
  { name: 'Marco', day: 'Tuesday', time: '8PM', groupChatName: 'BRO MARCO- WOTG TUESDAY 8PM MALE' },
  { name: 'Jonathan Situbal', day: 'Tuesday', time: '7PM', groupChatName: 'Bro jonathan / WOTG Tuesday 7pm' },
  { name: 'Dexter', day: 'Tuesday', time: '9PM', groupChatName: 'BRO DEXTER-WOTG TUESDAY 9PM MALE' },
  { name: 'Mike', day: 'Tuesday', time: '8PM', groupChatName: 'Bro.Mike Tuesday Group 8pm' },
  { name: 'Michael', day: 'Thursday', time: '7:30PM', groupChatName: 'BRO MICHAEL-WOTG THURSDAY 7:30PM MALE' },
  { name: 'Jonathan Tabo', day: 'Thursday', time: '8PM', groupChatName: 'BRO JOHN /WOTG THURSDAY MALE 8PM' },
  { name: 'Eric', day: 'Friday', time: '7PM', groupChatName: 'WOTG Bro Eric / Friday' },
  { name: 'Bobby', day: 'Friday', time: '9PM', groupChatName: 'Middle east time' },
  { name: 'Jeremy', day: 'Friday', time: '8PM', groupChatName: 'WOTG BRO JEREMY/ FRIDAY 8PM' },
  { name: 'Jeff Nicomedez', day: 'Friday', time: '8PM', groupChatName: 'WOTG Bro JEFF/ Friday 8pm' },
  { name: 'Donie', day: 'Friday', time: '7PM', groupChatName: 'BRO DONIE-WOTG FRIDAY 7PM MALE' },
  { name: 'Marco/Gary', day: 'Friday', time: '6AM', groupChatName: 'FRIDAY 6AM /WOTG WOTG FRIDAYgroup / bro jhomar' },
  { name: 'Junjun', day: 'Saturday', time: '9AM', groupChatName: 'BRO JUNJUN WOTG SATURDAY 11AM MALE' },
  { name: 'Fortune', day: 'Saturday', time: '7PM', groupChatName: 'BRO FORTUNE SATURDAY MALE 7PM' },
  { name: 'Mike', day: 'Saturday', time: '8PM', groupChatName: 'SATURDAY GROUP WOTG' },
  { name: 'Ptr Marco', day: 'Saturday', time: '8PM', groupChatName: 'WOTG SATURDAY MALE 7M PTR MARCO' },
  { name: 'Jong', day: 'Saturday', time: '8PM', groupChatName: '' },
  { name: 'Will', day: 'Saturday', time: '7:30PM', groupChatName: '' },
  { name: 'Warlee', day: 'Saturday', time: '8:30PM', groupChatName: 'WOTG BRO WARLEE/ Saturday 8:30 PM' },
  { name: 'Carlo', day: 'Saturday', time: '9PM', groupChatName: '' },
  { name: 'Joel', day: 'Sunday', time: '7PM', groupChatName: 'BRO JOEL-WOTG SUNDAY 7PM MALE' },
  { name: 'Jeff', day: 'Sunday', time: '9PM', groupChatName: 'BRO JEF-WOTG SUNDAY 9PM MALE' },
  { name: 'Tet', day: 'Monday', time: '2PM', groupChatName: '' },
  { name: 'Vivian', day: 'Monday', time: '2PM', groupChatName: '' },
  { name: 'Mveronica', day: 'Monday', time: '6PM', groupChatName: '' },
  { name: 'MC', day: 'Monday', time: '7PM', groupChatName: '' },
  { name: 'Jennifer', day: 'Monday', time: '', groupChatName: '' },
  { name: 'Cristina', day: 'Monday', time: '8PM', groupChatName: '' },
  { name: 'Rochelle', day: 'Tuesday', time: '8:30AM', groupChatName: '' },
  { name: 'Keyth', day: 'Tuesday', time: '2PM', groupChatName: '' },
  { name: 'Catherine', day: 'Tuesday', time: '2PM', groupChatName: '' },
  { name: 'Jen', day: 'Tuesday', time: '2PM', groupChatName: '' },
  { name: 'Clairelyn', day: 'Tuesday', time: '3PM', groupChatName: '' },
  { name: 'Gie', day: 'Tuesday', time: '7PM', groupChatName: '' },
  { name: 'Karen', day: 'Tuesday', time: '7PM', groupChatName: '' },
  { name: 'Nancy', day: 'Tuesday', time: '7PM', groupChatName: '' },
  { name: 'Faith (Ruby)', day: 'Tuesday', time: '7PM', groupChatName: '' },
  { name: 'Laila', day: 'Tuesday', time: '8PM', groupChatName: '' },
  { name: 'Miriam', day: 'Tuesday', time: '8PM', groupChatName: '' },
  { name: 'Myra', day: 'Wednesday', time: '1PM', groupChatName: '' },
  { name: 'Nanay Rosa', day: 'Wednesday', time: '2PM', groupChatName: '' },
  { name: 'Anne', day: 'Wednesday', time: '6PM', groupChatName: '' },
  { name: 'Grace', day: 'Wednesday', time: '8PM', groupChatName: '' },
  { name: 'May', day: 'Thursday', time: '7:30PM', groupChatName: '' },
  { name: 'Alma', day: 'Thursday', time: '5PM', groupChatName: '' },
  { name: 'Brenda', day: 'Thursday', time: '7PM', groupChatName: '' },
  { name: 'Ellen', day: 'Thursday', time: '8PM', groupChatName: '' },
  { name: 'Josie', day: 'Thursday', time: '8PM', groupChatName: '' },
  { name: 'Razel', day: 'Thursday', time: '8PM', groupChatName: '' },
  { name: 'Mariarita', day: 'Friday', time: '1PM', groupChatName: '' },
  { name: 'Merideth', day: 'Friday', time: '2PM', groupChatName: '' },
  { name: 'Mel', day: 'Friday', time: '2PM', groupChatName: '' },
  { name: 'Annaliza', day: 'Friday', time: '3PM', groupChatName: '' },
  { name: 'Evelyn', day: 'Friday', time: '4PM', groupChatName: '' },
  { name: 'Deza', day: 'Friday', time: '7PM', groupChatName: '' },
  { name: 'Malou', day: 'Friday', time: '7PM', groupChatName: '' },
  { name: 'Eva', day: 'Friday', time: '7PM', groupChatName: '' },
  { name: 'Aprilyn', day: 'Friday', time: '8PM', groupChatName: '' },
  { name: 'Corz', day: 'Friday', time: '8PM', groupChatName: '' },
  { name: 'CherryMae', day: 'Friday', time: '8PM', groupChatName: '' },
  { name: 'Rowena', day: 'Friday', time: '8PM', groupChatName: '' },
  { name: 'Kia', day: 'Friday', time: '8PM', groupChatName: '' },
  { name: 'Maureen', day: 'Friday', time: '8PM', groupChatName: '' },
  { name: 'Heidy', day: 'Friday', time: '8PM', groupChatName: '' },
  { name: 'Jhoana', day: 'Saturday', time: '11AM', groupChatName: '' },
  { name: 'Mariarita', day: 'Saturday', time: '2PM', groupChatName: '' },
  { name: 'Fe', day: 'Saturday', time: '4PM', groupChatName: '' },
  { name: 'Dona', day: 'Saturday', time: '6PM', groupChatName: '' },
  { name: 'Jiellyane', day: 'Saturday', time: '6PM', groupChatName: '' },
  { name: 'Den', day: 'Saturday', time: '8PM', groupChatName: '' },
  { name: 'Virgie', day: 'Saturday', time: '8PM', groupChatName: '' },
  { name: 'Michaela', day: 'Saturday', time: '8PM', groupChatName: '' },
  { name: 'Babylyn', day: 'Saturday', time: '8PM', groupChatName: '' },
  { name: 'Audrey', day: 'Saturday', time: '8PM', groupChatName: '' },
  { name: 'Klyn', day: 'Saturday', time: '8PM', groupChatName: '' },
  { name: 'Mary Ann', day: 'Saturday', time: '8PM', groupChatName: '' },
  { name: 'Rosemarie', day: 'Saturday', time: '10PM', groupChatName: '' },
  { name: 'Luz', day: 'Sunday', time: '5PM', groupChatName: '' },
  { name: 'Rose Palma', day: 'Sunday', time: '7PM', groupChatName: '' },
  { name: 'Irene', day: 'Sunday', time: '7PM (Israel Time)', groupChatName: '' },
  { name: 'Maricar', day: 'Sunday', time: '8PM', groupChatName: '' },
  { name: 'Let', day: 'Sunday', time: '9PM', groupChatName: '' }
].map((leader, index) => ({
  ...leader,
  messengerLink: leader.messengerLink || '',
  key: makeLeaderKey(leader, index)
}));

const EDIT_FIELDS = [
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
  'messengerLink'
];

const MANUAL_FIELDS = [
  'name',
  'email',
  'age',
  'gender',
  'maritalStatus',
  'mobileNo',
  'preferredDay',
  'preferredTime',
  'church',
  'profile'
];

const TABLE_COLUMNS = [
  'Date Recorded',
  'Name',
  'Email',
  'Age',
  'Gender',
  'Marital Status',
  'Mobile No',
  'Preferred Day',
  'Preferred Time',
  'Church',
  'Profile',
  'Screenshots',
  'Leader',
  'M-Group GC',
  'Messenger',
  'Status',
  'Action'
];

const state = {
  seekers: [],
  leaders: [],
  selectedSeekerId: null,
  selectedLeaderId: null,
  addMode: 'paste',
  addImages: [],
  editImages: [],
  loading: false,
  authReady: false,
  currentUser: null,
  currentMember: null,
  isAuthorized: false
};

const elements = {
  seekerCount: document.getElementById('seeker-count'),
  leaderCount: document.getElementById('leader-count'),
  feedbackBanner: document.getElementById('feedback-banner'),
  seekerTableBody: document.getElementById('seeker-table-body'),
  leaderMasterTableBody: document.getElementById('leader-master-table-body'),
  addSeekerBtn: document.getElementById('add-seeker-btn'),
  addLeaderBtn: document.getElementById('add-leader-btn'),
  refreshBtn: document.getElementById('refresh-btn'),
  addModal: document.getElementById('add-modal'),
  editModal: document.getElementById('edit-modal'),
  leaderModal: document.getElementById('leader-modal'),
  pastePane: document.getElementById('paste-pane'),
  manualForm: document.getElementById('manual-form'),
  addRawText: document.getElementById('add-raw-text'),
  addImageInput: document.getElementById('add-image-input'),
  addImageMeta: document.getElementById('add-image-meta'),
  savePastedBtn: document.getElementById('save-pasted-btn'),
  modePasteBtn: document.getElementById('mode-paste-btn'),
  modeManualBtn: document.getElementById('mode-manual-btn'),
  editForm: document.getElementById('edit-form'),
  editModalTitle: document.getElementById('edit-modal-title'),
  editStatus: document.getElementById('edit-status'),
  editLeaderName: document.getElementById('edit-leaderName'),
  editMGroupGc: document.getElementById('edit-mGroupGc'),
  editMessengerLink: document.getElementById('edit-messengerLink'),
  editMessengerLinkAction: document.getElementById('edit-messenger-link-action'),
  editImageInput: document.getElementById('edit-image-input'),
  editImageMeta: document.getElementById('edit-image-meta'),
  editDropzone: document.getElementById('edit-dropzone'),
  leaderForm: document.getElementById('leader-form'),
  leaderModalTitle: document.getElementById('leader-modal-title'),
  saveLeaderBtn: document.getElementById('save-leader-btn'),
  leaderMessengerLink: document.getElementById('leader-messengerLink'),
  leaderMessengerLinkAction: document.getElementById('leader-messenger-link-action'),
  leaderMatchNote: document.getElementById('leader-match-note'),
  leaderTableBody: document.getElementById('leader-table-body'),
  editImageList: document.getElementById('edit-image-list')
};

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function truncate(value = '', max = 84) {
  return value.length > max ? `${value.slice(0, max - 1)}...` : value;
}

function slugify(value = '') {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function makeLeaderKey(leader = {}, index = 0) {
  return `${leader.name || 'Leader'}-${leader.day || 'Day'}-${leader.time || 'Time'}-${index}`
    .replaceAll('/', '-')
    .trim();
}

function buildUniqueLeaderKey(leader = {}) {
  const takenKeys = new Set(state.leaders.map((entry) => entry.key || entry.id));
  let attempt = 0;
  let nextKey = makeLeaderKey(leader, attempt);

  while (takenKeys.has(nextKey)) {
    attempt += 1;
    nextKey = makeLeaderKey(leader, attempt);
  }

  return nextKey;
}

function normalizeExternalUrl(value = '') {
  const trimmed = value.trim();
  if (!trimmed) return '';
  return /^[a-z]+:\/\//i.test(trimmed) || /^fb-messenger:/i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function splitLines(value = '') {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function coerceStringArray(value) {
  return Array.isArray(value) ? value.map((item) => String(item || '').trim()).filter(Boolean) : [];
}

function normalizePersonName(value = '') {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function getMemberProfileName(member = {}) {
  return member?.fullName || member?.displayName || member?.name || '';
}

function normalizeDay(value = '') {
  const match = value.match(/monday|tuesday|wednesday|thursday|friday|saturday|sunday/i);
  return match ? match[0].toLowerCase() : '';
}

function extractDayTokens(value = '') {
  return [...String(value || '').toLowerCase().matchAll(/monday|tuesday|wednesday|thursday|friday|saturday|sunday/g)].map((match) => match[0]);
}

function parseTimeTokens(value = '') {
  const normalized = value.replace(/\bnn\b/gi, 'pm');
  return [...normalized.toLowerCase().matchAll(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/g)].map((match) => {
    let hours = Number(match[1]) % 12;
    const minutes = Number(match[2] || '0');
    if (match[3] === 'pm') hours += 12;
    return hours * 60 + minutes;
  });
}

function buildTimeWindow(value = '') {
  const tokens = parseTimeTokens(value);
  if (!tokens.length) return null;
  return { start: Math.min(...tokens), end: Math.max(...tokens) };
}

function allLeaders() {
  return state.leaders.length ? state.leaders : DEFAULT_LEADERS;
}

function buildLeaderScheduleText(leader = {}) {
  return [leader.day, leader.time, leader.groupChatName].filter(Boolean).join(' ');
}

function getMatchingLeaders(preferredDay = '', preferredTime = '') {
  const preferredDays = [...new Set(extractDayTokens(preferredDay))];
  const preferredWindow = buildTimeWindow(preferredTime);
  const leaders = allLeaders();

  const dayMatches = preferredDays.length
    ? leaders.filter((leader) => {
        const scheduleText = buildLeaderScheduleText(leader);
        const leaderDays = new Set(extractDayTokens(scheduleText));
        const normalizedLeaderDay = normalizeDay(leader.day);
        if (normalizedLeaderDay) leaderDays.add(normalizedLeaderDay);
        return preferredDays.some((day) => leaderDays.has(day));
      })
    : [...leaders];

  if (!preferredWindow) return dayMatches;

  const exactTimeMatches = dayMatches.filter((leader) => {
    const leaderWindow = buildTimeWindow(buildLeaderScheduleText(leader));
    if (!leaderWindow) return true;
    return leaderWindow.start >= preferredWindow.start && leaderWindow.end <= preferredWindow.end;
  });

  if (!exactTimeMatches.length) return dayMatches;

  const exactMatchKeys = new Set(exactTimeMatches.map((leader) => leader.key));
  return [...exactTimeMatches, ...dayMatches.filter((leader) => !exactMatchKeys.has(leader.key))];
}

function getTodayString() {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila',
    month: 'numeric',
    day: 'numeric',
    year: '2-digit'
  }).format(new Date());
}

function firstMatch(text, pattern) {
  const match = text.match(pattern);
  return match ? match[0].trim() : '';
}

function toTitleCase(value = '') {
  return value ? value.charAt(0).toUpperCase() + value.slice(1).toLowerCase() : '';
}

function extractName(lines) {
  const labeled = lines.find((line) => /^name\s*[:\-]/i.test(line));
  if (labeled) return labeled.replace(/^name\s*[:\-]\s*/i, '').trim();

  return (
    lines.find((line) => {
      if (line.length < 3 || line.length > 40) return false;
      if (/\d/.test(line)) return false;
      if (/church|monday|tuesday|wednesday|thursday|friday|saturday|sunday|male|female|single|married|widowed|divorced/i.test(line)) {
        return false;
      }
      return /^[a-z .,'-]+$/i.test(line);
    }) || ''
  );
}

function extractAge(lines, text) {
  const labeled = text.match(/\bage\s*[:\-]?\s*(\d{1,2})\b/i);
  if (labeled) return labeled[1];

  const bare = lines.find((line) => /^\d{1,2}$/.test(line) && Number(line) >= 10 && Number(line) <= 99);
  return bare || '';
}

function extractPreferredDay(lines, text) {
  const labeled = lines.find((line) => /^preferred\s+day\s*[:\-]/i.test(line));
  if (labeled) return labeled.replace(/^preferred\s+day\s*[:\-]\s*/i, '').trim();

  const lineMatch = lines.find((line) => /monday|tuesday|wednesday|thursday|friday|saturday|sunday/i.test(line));
  if (lineMatch) return lineMatch;

  const textMatch = text.match(/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)(?:\s+to\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday))?\b/i);
  return textMatch ? textMatch[0] : '';
}

function extractPreferredTime(lines, text) {
  const labeled = lines.find((line) => /^preferred\s+time\s*[:\-]/i.test(line));
  if (labeled) return labeled.replace(/^preferred\s+time\s*[:\-]\s*/i, '').trim();

  const timeLines = lines.filter((line) => /(\d{1,2}(?::\d{2})?\s*(?:am|pm|nn))/.test(line.toLowerCase()));
  if (timeLines.length) return timeLines.join(' / ');

  return firstMatch(text, /\b\d{1,2}(?::\d{2})?\s*(?:am|pm|nn)\s*(?:to|-)\s*\d{1,2}(?::\d{2})?\s*(?:am|pm|nn)\b/i);
}

function parseRawText(rawText) {
  const text = rawText.trim();
  const lines = splitLines(text);
  const gender = toTitleCase(firstMatch(text, /\b(male|female)\b/i));
  const rawMaritalStatus = firstMatch(text, /\b(single|married|marriage|widowed|divorced|separated)\b/i);
  const maritalStatus = /^marriage$/i.test(rawMaritalStatus) ? 'Married' : toTitleCase(rawMaritalStatus);
  const email = firstMatch(text, /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  const mobileNo = firstMatch(text, /(?:\+?63|0)\d{10}\b/);
  const churchLine =
    lines.find((line) => /church/i.test(line)) ||
    firstMatch(text, /[A-Za-z0-9 .,'-]*church[A-Za-z0-9 .,'-]*/i);

  return {
    dateRecorded: getTodayString(),
    name: extractName(lines),
    email,
    age: extractAge(lines, text),
    gender,
    maritalStatus,
    mobileNo,
    preferredDay: extractPreferredDay(lines, text),
    preferredTime: extractPreferredTime(lines, text),
    church: churchLine,
    profile: text,
    profileImageUrls: [],
    rawPastedText: text,
    status: 'Processing',
    leaderName: '',
    mGroupGc: ''
  };
}

function coerceText(value) {
  return value == null ? '' : String(value).trim();
}

function normalizeSeeker(record = {}) {
  return {
    id: record.id || '',
    dateRecorded: coerceText(record.dateRecorded),
    name: coerceText(record.name),
    email: coerceText(record.email),
    age: coerceText(record.age),
    gender: coerceText(record.gender),
    maritalStatus: coerceText(record.maritalStatus),
    mobileNo: coerceText(record.mobileNo),
    preferredDay: coerceText(record.preferredDay),
    preferredTime: coerceText(record.preferredTime),
    church: coerceText(record.church),
    profile: coerceText(record.profile),
    profileImageUrls: coerceStringArray(record.profileImageUrls),
    status: coerceText(record.status) || 'Processing',
    leaderName: coerceText(record.leaderName),
    mGroupGc: coerceText(record.mGroupGc),
    messengerLink: coerceText(record.messengerLink),
    rawPastedText: coerceText(record.rawPastedText),
    createdAt: record.createdAt || null,
    updatedAt: record.updatedAt || null
  };
}

function normalizeLeader(record = {}) {
  return {
    id: record.id || record.key || '',
    key: record.key || record.id || '',
    name: coerceText(record.name),
    day: coerceText(record.day),
    time: coerceText(record.time),
    groupChatName: coerceText(record.groupChatName),
    messengerLink: normalizeExternalUrl(coerceText(record.messengerLink)),
    createdAt: record.createdAt || null,
    updatedAt: record.updatedAt || null
  };
}

function renderImageLinks(urls = [], emptyLabel = '(none)') {
  if (!urls.length) return `<span class="table-muted">${escapeHtml(emptyLabel)}</span>`;

  return urls
    .map(
      (url, index) =>
        `<a class="button table-action" href="${escapeHtml(normalizeExternalUrl(url))}" target="_blank" rel="noopener noreferrer">Image ${index + 1}</a>`
    )
    .join(' ');
}

function getTimestampMs(value) {
  return value && typeof value.toMillis === 'function' ? value.toMillis() : 0;
}

function setTableMessage(message) {
  elements.seekerTableBody.innerHTML = `<tr><td colspan="${TABLE_COLUMNS.length}" class="table-empty">${escapeHtml(message)}</td></tr>`;
}

function showFeedback(message, kind = 'info') {
  if (!message) {
    elements.feedbackBanner.hidden = true;
    elements.feedbackBanner.textContent = '';
    elements.feedbackBanner.className = 'feedback-banner';
    return;
  }

  elements.feedbackBanner.hidden = false;
  elements.feedbackBanner.textContent = message;
  elements.feedbackBanner.className = `feedback-banner ${kind}`;
}

function humanizeError(error) {
  const message = error?.message || 'Something went wrong.';
  if (/Missing or insufficient permissions/i.test(message)) {
    return 'You do not have access to Seeker Monitoring.';
  }
  return message;
}

function populateStatusSelect() {
  elements.editStatus.innerHTML = STATUSES.map((status) => `<option value="${status}">${status}</option>`).join('');
}

function renderMessengerLinkAction(value = '') {
  const normalized = normalizeExternalUrl(value);
  if (!normalized) {
    elements.editMessengerLinkAction.hidden = true;
    elements.editMessengerLinkAction.removeAttribute('href');
    return;
  }

  elements.editMessengerLinkAction.hidden = false;
  elements.editMessengerLinkAction.href = normalized;
}

function renderLeaderMessengerLinkAction(value = '') {
  const normalized = normalizeExternalUrl(value);
  if (!normalized) {
    elements.leaderMessengerLinkAction.hidden = true;
    elements.leaderMessengerLinkAction.removeAttribute('href');
    return;
  }

  elements.leaderMessengerLinkAction.hidden = false;
  elements.leaderMessengerLinkAction.href = normalized;
}

function currentSeeker() {
  return state.seekers.find((seeker) => seeker.id === state.selectedSeekerId) || null;
}

function currentLeader() {
  return state.leaders.find((leader) => leader.id === state.selectedLeaderId) || null;
}

function renderSeekerTable() {
  elements.seekerCount.textContent = String(state.seekers.length);

  if (!state.seekers.length) {
    setTableMessage('No seekers saved yet.');
    return;
  }

  elements.seekerTableBody.innerHTML = state.seekers
    .map(
      (seeker) => `
        <tr>
          <td data-label="Date Recorded">${escapeHtml(seeker.dateRecorded || '')}</td>
          <td data-label="Name">${escapeHtml(seeker.name || '')}</td>
          <td data-label="Email">${escapeHtml(seeker.email || '')}</td>
          <td data-label="Age">${escapeHtml(seeker.age || '')}</td>
          <td data-label="Gender">${escapeHtml(seeker.gender || '')}</td>
          <td data-label="Marital Status">${escapeHtml(seeker.maritalStatus || '')}</td>
          <td data-label="Mobile No">${escapeHtml(seeker.mobileNo || '')}</td>
          <td data-label="Preferred Day">${escapeHtml(seeker.preferredDay || '')}</td>
          <td data-label="Preferred Time">${escapeHtml(seeker.preferredTime || '')}</td>
          <td data-label="Church">${escapeHtml(seeker.church || '')}</td>
          <td data-label="Profile" class="profile-cell" title="${escapeHtml(seeker.profile || '')}">${seeker.profile ? escapeHtml(truncate(seeker.profile)) : '<span class="table-muted">(blank)</span>'}</td>
          <td data-label="Screenshots">${renderImageLinks(seeker.profileImageUrls, '(none)')}</td>
          <td data-label="Leader">${escapeHtml(seeker.leaderName || '')}</td>
          <td data-label="M-Group GC">${escapeHtml(seeker.mGroupGc || '')}</td>
          <td data-label="Messenger">${seeker.messengerLink ? `<a class="button table-action" href="${escapeHtml(normalizeExternalUrl(seeker.messengerLink))}" target="_blank" rel="noopener noreferrer">Open chat</a>` : '<span class="table-muted">(none)</span>'}</td>
          <td data-label="Status"><span class="status-pill">${escapeHtml(seeker.status || '')}</span></td>
          <td data-label="Action"><button class="button table-action" type="button" data-edit-id="${seeker.id}">Edit</button></td>
        </tr>
      `
    )
    .join('');
}

function setLeaderTableMessage(message) {
  elements.leaderMasterTableBody.innerHTML = `<tr><td colspan="6" class="table-empty">${escapeHtml(message)}</td></tr>`;
}

function renderMasterLeaderTable() {
  elements.leaderCount.textContent = String(state.leaders.length);

  if (!state.leaders.length) {
    setLeaderTableMessage('No leaders saved yet.');
    return;
  }

  elements.leaderMasterTableBody.innerHTML = state.leaders
    .map(
      (leader) => `
        <tr>
          <td data-label="Leader">${escapeHtml(leader.name)}</td>
          <td data-label="Day">${escapeHtml(leader.day)}</td>
          <td data-label="Time">${escapeHtml(leader.time)}</td>
          <td data-label="M-Group GC">${leader.groupChatName ? escapeHtml(leader.groupChatName) : '<span class="table-muted">(blank)</span>'}</td>
          <td data-label="Messenger Link">${leader.messengerLink ? `<a class="button table-action" href="${escapeHtml(leader.messengerLink)}" target="_blank" rel="noopener noreferrer">Open chat</a>` : '<span class="table-muted">(none)</span>'}</td>
          <td data-label="Action"><button class="button table-action" type="button" data-edit-leader-id="${leader.id}">Edit</button></td>
        </tr>
      `
    )
    .join('');
}

function requireSignedIn() {
  if (state.currentUser) return;
  throw new Error('Sign in to Go Mission first, then reopen Seeker Monitoring.');
}

function requireAuthorized() {
  requireSignedIn();
  if (state.isAuthorized) return;
  throw new Error('You do not have access to Seeker Monitoring.');
}

function showUnauthorizedState() {
  state.seekers = [];
  state.leaders = [];
  elements.seekerCount.textContent = '0';
  elements.leaderCount.textContent = '0';
  setTableMessage('You do not have access to Seeker Monitoring.');
  setLeaderTableMessage('You do not have access to Seeker Monitoring.');
  showFeedback('Only Dona Perez and Chatty Claveria can access Seeker Monitoring.', 'error');
}

async function loadCurrentMemberProfile(user) {
  const snapshot = await getDoc(doc(db, MEMBER_COLLECTION, user.uid));
  return snapshot.exists() ? snapshot.data() : null;
}

function isAuthorizedUser(user, member) {
  const email = String(user?.email || '').trim().toLowerCase();
  if (SEEKER_MONITORING_ADMIN_EMAILS.includes(email)) return true;

  const normalizedName = normalizePersonName(getMemberProfileName(member));
  return SEEKER_MONITORING_ALLOWED_NAMES.some((name) => normalizePersonName(name) === normalizedName);
}

async function seedLeadersIfNeeded() {
  const snapshot = await getDocs(collection(db, LEADER_COLLECTION));
  const existingIds = new Set(snapshot.docs.map((record) => record.id));
  const missingLeaders = DEFAULT_LEADERS.filter((leader) => !existingIds.has(leader.key));

  if (!missingLeaders.length) return snapshot;

  await Promise.all(
    missingLeaders.map((leader) =>
      setDoc(doc(db, LEADER_COLLECTION, leader.key), {
        name: leader.name,
        day: leader.day,
        time: leader.time,
        groupChatName: leader.groupChatName,
        messengerLink: leader.messengerLink,
        key: leader.key,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })
    )
  );

  return getDocs(collection(db, LEADER_COLLECTION));
}

async function fetchLeaders() {
  if (!state.authReady) return;
  if (!state.currentUser) {
    state.leaders = [];
    elements.leaderCount.textContent = '0';
    setLeaderTableMessage('Sign in to Go Mission first, then refresh.');
    return;
  }
  if (!state.isAuthorized) {
    showUnauthorizedState();
    return;
  }

  try {
    const snapshot = await seedLeadersIfNeeded();
    state.leaders = snapshot.docs
      .map((record) => normalizeLeader({ id: record.id, ...record.data() }))
      .sort((left, right) => {
        const daySort = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        const dayDiff = daySort.indexOf(normalizeDay(left.day)) - daySort.indexOf(normalizeDay(right.day));
        if (dayDiff !== 0) return dayDiff;
        const timeDiff = (buildTimeWindow(left.time)?.start || 0) - (buildTimeWindow(right.time)?.start || 0);
        if (timeDiff !== 0) return timeDiff;
        return left.name.localeCompare(right.name);
      });
    renderMasterLeaderTable();
  } catch (error) {
    const message = humanizeError(error);
    state.leaders = [];
    elements.leaderCount.textContent = '0';
    setLeaderTableMessage(message);
    showFeedback(message, 'error');
  }
}

async function fetchSeekers() {
  if (state.loading || !state.authReady) return;
  if (!state.currentUser) {
    state.seekers = [];
    elements.seekerCount.textContent = '0';
    setTableMessage('Sign in to Go Mission first, then refresh.');
    showFeedback('Sign in to Go Mission first, then reopen Seeker Monitoring.', 'error');
    return;
  }
  if (!state.isAuthorized) {
    showUnauthorizedState();
    return;
  }

  state.loading = true;
  showFeedback('Loading seekers...', 'info');

  try {
    const snapshot = await getDocs(collection(db, SEEKER_COLLECTION));
    state.seekers = snapshot.docs
      .map((record) => normalizeSeeker({ id: record.id, ...record.data() }))
      .sort((left, right) => {
        const updatedDiff = getTimestampMs(right.updatedAt) - getTimestampMs(left.updatedAt);
        if (updatedDiff !== 0) return updatedDiff;
        return getTimestampMs(right.createdAt) - getTimestampMs(left.createdAt);
      });
    renderSeekerTable();
    showFeedback('');
  } catch (error) {
    const message = humanizeError(error);
    state.seekers = [];
    elements.seekerCount.textContent = '0';
    setTableMessage(message);
    showFeedback(message, 'error');
  } finally {
    state.loading = false;
  }
}

function openModal(modal) {
  modal.hidden = false;
  document.body.classList.add('modal-open');
}

function closeModal(modal) {
  modal.hidden = true;
  if (elements.addModal.hidden && elements.editModal.hidden && elements.leaderModal.hidden) {
    document.body.classList.remove('modal-open');
  }
}

function setAddMode(mode) {
  state.addMode = mode;
  const isPaste = mode === 'paste';
  elements.pastePane.hidden = !isPaste;
  elements.manualForm.hidden = isPaste;
  elements.modePasteBtn.classList.toggle('active', isPaste);
  elements.modeManualBtn.classList.toggle('active', !isPaste);
}

function resetAddModal() {
  elements.addRawText.value = '';
  if (elements.addImageInput) elements.addImageInput.value = '';
  if (elements.addImageMeta) elements.addImageMeta.textContent = 'No image selected';
  state.addImages = [];
  MANUAL_FIELDS.forEach((field) => {
    const element = document.getElementById(`manual-${field}`);
    if (element) element.value = '';
  });
  setAddMode('paste');
}

function handleAddImageChange(event) {
  state.addImages = Array.from(event.target.files || []).filter((file) => file.type.startsWith('image/'));
  if (!elements.addImageMeta) return;
  elements.addImageMeta.textContent = state.addImages.length
    ? `${state.addImages.length} image${state.addImages.length > 1 ? 's' : ''} selected`
    : 'No image selected';
}

function updateEditImageMeta() {
  if (!elements.editImageMeta) return;
  elements.editImageMeta.textContent = state.editImages.length
    ? `${state.editImages.length} image${state.editImages.length > 1 ? 's' : ''} ready to upload`
    : 'No new image selected';
}

function setEditImages(files = []) {
  state.editImages = Array.from(files).filter((file) => file.type.startsWith('image/'));
  if (elements.editImageInput && elements.editImageInput.files !== state.editImages) {
    // FileList is read-only, so we only sync UI text here.
  }
  updateEditImageMeta();
}

function handleEditImageChange(event) {
  setEditImages(event.target.files || []);
}

function bindEditDropzone() {
  if (!elements.editDropzone || !elements.editImageInput) return;

  const dropzone = elements.editDropzone;

  dropzone.addEventListener('click', () => elements.editImageInput.click());
  dropzone.addEventListener('dragover', (event) => {
    event.preventDefault();
    dropzone.classList.add('drag-over');
  });
  dropzone.addEventListener('dragleave', () => {
    dropzone.classList.remove('drag-over');
  });
  dropzone.addEventListener('drop', (event) => {
    event.preventDefault();
    dropzone.classList.remove('drag-over');
    const files = event.dataTransfer?.files || [];
    setEditImages(files);
  });
}

function getManualPayload() {
  const payload = {};
  MANUAL_FIELDS.forEach((field) => {
    const element = document.getElementById(`manual-${field}`);
    payload[field] = element?.value?.trim?.() || '';
  });
  return payload;
}

function buildStoredPayload(payload) {
  const base = normalizeSeeker(payload);
  return {
    dateRecorded: base.dateRecorded || getTodayString(),
    name: base.name,
    email: base.email,
    age: base.age,
    gender: base.gender,
    maritalStatus: base.maritalStatus,
    mobileNo: base.mobileNo,
    preferredDay: base.preferredDay,
    preferredTime: base.preferredTime,
    church: base.church,
    profile: base.profile,
    profileImageUrls: coerceStringArray(base.profileImageUrls),
    status: base.status || 'Processing',
    leaderName: base.leaderName,
    mGroupGc: base.mGroupGc,
    messengerLink: normalizeExternalUrl(base.messengerLink),
    rawPastedText: base.rawPastedText,
    sourceChannel: 'vlogs_engagement',
    recordType: 'seeker_monitoring',
    isAppUser: false
  };
}

async function createSeeker(payload) {
  requireAuthorized();
  const ref = doc(collection(db, SEEKER_COLLECTION));
  const user = state.currentUser;

  await setDoc(ref, {
    ...buildStoredPayload(payload),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdByUid: user.uid,
    createdByEmail: user.email || '',
    updatedByUid: user.uid,
    updatedByEmail: user.email || ''
  });

  return ref.id;
}

async function uploadSeekerImages(seekerId, files = []) {
  if (!files.length) return [];

  const uploads = files.map(async (file, index) => {
    const safeName = slugify(file.name.replace(/\.[^.]+$/, '')) || `image-${index + 1}`;
    const extension = (file.name.split('.').pop() || 'jpg').replace(/[^a-z0-9]/gi, '').toLowerCase() || 'jpg';
    const path = `goMission/seeker-monitoring/${seekerId}/${Date.now()}-${index + 1}-${safeName}.${extension}`;
    const ref = storageRef(storage, path);
    const result = await uploadBytes(ref, file, { contentType: file.type || 'image/jpeg' });
    return getDownloadURL(result.ref);
  });

  return Promise.all(uploads);
}

async function savePastedSeeker() {
  const rawText = elements.addRawText.value.trim();
  if (!rawText && !state.addImages.length) {
    showFeedback('Paste the seeker details or add the Messenger screenshots first.', 'error');
    return;
  }

  elements.savePastedBtn.disabled = true;
  showFeedback('Saving seeker...', 'info');

  try {
    const parsed = rawText
      ? parseRawText(rawText)
      : {
          dateRecorded: getTodayString(),
          profile: '',
          profileImageUrls: [],
          status: 'Processing',
          leaderName: '',
          mGroupGc: '',
          messengerLink: ''
        };
    const id = await createSeeker(parsed);
    const uploadedImages = await uploadSeekerImages(id, state.addImages);
    if (uploadedImages.length) {
      await updateDoc(doc(db, SEEKER_COLLECTION, id), {
        profileImageUrls: uploadedImages,
        updatedAt: serverTimestamp(),
        updatedByUid: state.currentUser.uid,
        updatedByEmail: state.currentUser.email || ''
      });
    }
    await fetchSeekers();
    resetAddModal();
    closeModal(elements.addModal);
    const seeker = state.seekers.find((entry) => entry.id === id);
    showFeedback(`Saved ${seeker?.name || 'new seeker'}.`, 'success');
  } catch (error) {
    showFeedback(humanizeError(error), 'error');
  } finally {
    elements.savePastedBtn.disabled = false;
  }
}

async function saveManualSeeker(event) {
  event.preventDefault();
  const manualEntry = getManualPayload();
  if (!manualEntry.name && !manualEntry.mobileNo && !manualEntry.profile) {
    showFeedback('Add at least a name, mobile number, or profile before saving manually.', 'error');
    return;
  }

  showFeedback('Saving seeker...', 'info');

  try {
    await createSeeker({
      ...manualEntry,
      dateRecorded: getTodayString(),
      rawPastedText: '',
      status: 'Processing',
      leaderName: '',
      mGroupGc: ''
    });
    await fetchSeekers();
    resetAddModal();
    closeModal(elements.addModal);
    showFeedback(`Saved ${manualEntry.name || 'new seeker'}.`, 'success');
  } catch (error) {
    showFeedback(humanizeError(error), 'error');
  }
}

function ensureLeaderOption(select, value, label, dataName = '', dataGc = '', dataLink = '') {
  if (!value) return;
  if ([...select.options].some((option) => option.value === value)) return;
  select.insertAdjacentHTML(
    'beforeend',
    `<option value="${escapeHtml(value)}" data-name="${escapeHtml(dataName)}" data-gc="${escapeHtml(dataGc)}" data-link="${escapeHtml(dataLink)}">${escapeHtml(label || value)}</option>`
  );
}

function selectedLeaderName() {
  const option = elements.editLeaderName.selectedOptions[0];
  return option?.dataset.name || '';
}

function selectedGroupChat() {
  const option = elements.editMGroupGc.selectedOptions[0];
  return option?.dataset.gc || '';
}

function renderLeaderControls(seeker) {
  const matches = getMatchingLeaders(seeker.preferredDay, seeker.preferredTime);
  const options = matches.length ? matches : allLeaders();

  elements.editLeaderName.innerHTML =
    '<option value="" data-name="" data-gc="" data-link="">Select leader</option>' +
    options
      .map(
        (leader) =>
          `<option value="${leader.key}" data-name="${escapeHtml(leader.name)}" data-gc="${escapeHtml(leader.groupChatName)}" data-link="${escapeHtml(leader.messengerLink)}">${escapeHtml(`${leader.name} • ${leader.day} ${leader.time}`)}</option>`
      )
      .join('');

  elements.editMGroupGc.innerHTML =
    '<option value="" data-name="" data-gc="" data-link="">Select M-Group GC</option>' +
    options
      .filter((leader) => leader.groupChatName)
      .map(
        (leader) =>
          `<option value="${leader.key}" data-name="${escapeHtml(leader.name)}" data-gc="${escapeHtml(leader.groupChatName)}" data-link="${escapeHtml(leader.messengerLink)}">${escapeHtml(leader.groupChatName)}</option>`
      )
      .join('');

  const matchingLeaderOption = [...elements.editLeaderName.options].find(
    (option) =>
      option.dataset.name === seeker.leaderName &&
      (!seeker.mGroupGc || option.dataset.gc === seeker.mGroupGc)
  );

  const matchingGcOption = [...elements.editMGroupGc.options].find(
    (option) =>
      option.dataset.gc === seeker.mGroupGc &&
      (!seeker.leaderName || option.dataset.name === seeker.leaderName)
  );

  if (matchingLeaderOption) {
    elements.editLeaderName.value = matchingLeaderOption.value;
  } else if (seeker.leaderName) {
    const customValue = `custom-leader:${seeker.leaderName}`;
    ensureLeaderOption(elements.editLeaderName, customValue, seeker.leaderName, seeker.leaderName, seeker.mGroupGc, seeker.messengerLink);
    elements.editLeaderName.value = customValue;
  } else {
    elements.editLeaderName.value = '';
  }

  if (matchingGcOption) {
    elements.editMGroupGc.value = matchingGcOption.value;
  } else if (seeker.mGroupGc) {
    const customValue = `custom-gc:${seeker.mGroupGc}`;
    ensureLeaderOption(elements.editMGroupGc, customValue, seeker.mGroupGc, seeker.leaderName, seeker.mGroupGc, seeker.messengerLink);
    elements.editMGroupGc.value = customValue;
  } else {
    elements.editMGroupGc.value = '';
  }

  const inheritedMessengerLink = matchingLeaderOption?.dataset.link || matchingGcOption?.dataset.link || '';
  elements.editMessengerLink.value = seeker.messengerLink || inheritedMessengerLink || '';
  renderMessengerLinkAction(elements.editMessengerLink.value);

  elements.leaderTableBody.innerHTML = options
    .map(
      (leader) => `
        <tr class="${leader.name === seeker.leaderName || leader.groupChatName === seeker.mGroupGc ? 'matched' : ''}">
          <td data-label="Leader">${escapeHtml(leader.name)}</td>
          <td data-label="Day">${escapeHtml(leader.day)}</td>
          <td data-label="Time">${escapeHtml(leader.time)}</td>
          <td data-label="M-Group GC">${leader.groupChatName ? escapeHtml(leader.groupChatName) : '<span class="table-muted">(blank)</span>'}</td>
          <td data-label="Messenger">${leader.messengerLink ? `<a class="button table-action" href="${escapeHtml(leader.messengerLink)}" target="_blank" rel="noopener noreferrer">Open chat</a>` : '<span class="table-muted">(none)</span>'}</td>
          <td data-label="Use"><button class="button table-action" type="button" data-use-leader="${leader.key}">Use</button></td>
        </tr>
      `
    )
    .join('');

  elements.leaderMatchNote.textContent = options.length
    ? 'Leader and M-Group GC options are filtered from the seeker schedule.'
    : 'No schedule match found. You can still choose manually.';
}

function renderEditImageList(seeker) {
  if (!elements.editImageList) return;
  elements.editImageList.innerHTML = seeker.profileImageUrls?.length
    ? renderImageLinks(seeker.profileImageUrls)
    : '<span class="table-muted">(none)</span>';
}

function getEditFormSnapshot() {
  return {
    preferredDay: document.getElementById('edit-preferredDay').value.trim(),
    preferredTime: document.getElementById('edit-preferredTime').value.trim(),
    leaderName: selectedLeaderName(),
    mGroupGc: selectedGroupChat()
  };
}

function fillEditModal(seeker) {
  state.selectedSeekerId = seeker.id;
  state.editImages = [];
  elements.editModalTitle.textContent = seeker.name ? `Edit ${seeker.name}` : 'Edit seeker';
  EDIT_FIELDS.forEach((field) => {
    const element = document.getElementById(`edit-${field}`);
    if (element) element.value = seeker[field] || '';
  });
  if (elements.editImageInput) elements.editImageInput.value = '';
  updateEditImageMeta();
  renderEditImageList(seeker);
  renderLeaderControls(seeker);
}

function openEditModalById(seekerId) {
  const seeker = state.seekers.find((item) => item.id === seekerId);
  if (!seeker) return;
  fillEditModal(seeker);
  openModal(elements.editModal);
}

function readEditPayload() {
  const updates = {};
  EDIT_FIELDS.forEach((field) => {
    const element = document.getElementById(`edit-${field}`);
    if (element) updates[field] = element.value.trim();
  });
  updates.leaderName = selectedLeaderName();
  updates.mGroupGc = selectedGroupChat();
  updates.messengerLink = normalizeExternalUrl(elements.editMessengerLink.value);
  return updates;
}

async function saveEdit(event) {
  event.preventDefault();
  const seeker = currentSeeker();
  if (!seeker) return;

  showFeedback('Saving changes...', 'info');

  try {
    requireAuthorized();
    const uploadedImages = await uploadSeekerImages(seeker.id, state.editImages);
    await updateDoc(doc(db, SEEKER_COLLECTION, seeker.id), {
      ...readEditPayload(),
      profileImageUrls: [...(seeker.profileImageUrls || []), ...uploadedImages],
      updatedAt: serverTimestamp(),
      updatedByUid: state.currentUser.uid,
      updatedByEmail: state.currentUser.email || ''
    });
    await fetchSeekers();
    closeModal(elements.editModal);
    showFeedback(`Updated ${readEditPayload().name || 'seeker'}.`, 'success');
  } catch (error) {
    showFeedback(humanizeError(error), 'error');
  }
}

function fillLeaderModal(leader) {
  state.selectedLeaderId = leader.id;
  elements.leaderModalTitle.textContent = leader.name ? `Edit ${leader.name}` : 'Edit leader';
  if (elements.saveLeaderBtn) elements.saveLeaderBtn.textContent = 'Save leader';
  document.getElementById('leader-name').value = leader.name || '';
  document.getElementById('leader-day').value = leader.day || '';
  document.getElementById('leader-time').value = leader.time || '';
  document.getElementById('leader-groupChatName').value = leader.groupChatName || '';
  elements.leaderMessengerLink.value = leader.messengerLink || '';
  renderLeaderMessengerLinkAction(leader.messengerLink || '');
}

function openAddLeaderModal() {
  state.selectedLeaderId = null;
  elements.leaderModalTitle.textContent = 'Add leader';
  if (elements.saveLeaderBtn) elements.saveLeaderBtn.textContent = 'Create leader';
  document.getElementById('leader-name').value = '';
  document.getElementById('leader-day').value = '';
  document.getElementById('leader-time').value = '';
  document.getElementById('leader-groupChatName').value = '';
  elements.leaderMessengerLink.value = '';
  renderLeaderMessengerLinkAction('');
  openModal(elements.leaderModal);
}

function openLeaderModalById(leaderId) {
  const leader = state.leaders.find((item) => item.id === leaderId);
  if (!leader) return;
  fillLeaderModal(leader);
  openModal(elements.leaderModal);
}

async function saveLeader(event) {
  event.preventDefault();
  showFeedback('Saving leader...', 'info');

  try {
    requireAuthorized();
    const formValues = {
      name: document.getElementById('leader-name').value.trim(),
      day: document.getElementById('leader-day').value.trim(),
      time: document.getElementById('leader-time').value.trim(),
      groupChatName: document.getElementById('leader-groupChatName').value.trim(),
      messengerLink: normalizeExternalUrl(elements.leaderMessengerLink.value)
    };

    if (!formValues.name || !formValues.day || !formValues.time) {
      throw new Error('Add at least the leader name, day, and time.');
    }

    const leader = currentLeader();
    const payload = {
      ...formValues,
      key: leader?.key || buildUniqueLeaderKey(formValues),
      updatedAt: serverTimestamp()
    };

    if (leader) {
      await updateDoc(doc(db, LEADER_COLLECTION, leader.id), payload);
    } else {
      await setDoc(doc(db, LEADER_COLLECTION, payload.key), {
        ...payload,
        createdAt: serverTimestamp()
      });
    }
    await fetchLeaders();

    if (!elements.editModal.hidden) {
      const seeker = currentSeeker();
      if (seeker) {
        renderLeaderControls({
          ...seeker,
          preferredDay: document.getElementById('edit-preferredDay').value.trim(),
          preferredTime: document.getElementById('edit-preferredTime').value.trim(),
          leaderName: selectedLeaderName(),
          mGroupGc: selectedGroupChat(),
          messengerLink: elements.editMessengerLink.value.trim()
        });
      }
    }

    closeModal(elements.leaderModal);
    showFeedback(`${leader ? 'Updated' : 'Added'} ${payload.name || 'leader'}.`, 'success');
  } catch (error) {
    showFeedback(humanizeError(error), 'error');
  }
}

function syncLeaderAndGroupFromLeader() {
  const option = elements.editLeaderName.selectedOptions[0];
  if (!option?.value) {
    renderMessengerLinkAction(elements.editMessengerLink.value);
    return;
  }
  const leader = allLeaders().find((entry) => entry.key === option.value);
  if (leader?.groupChatName) {
    const gcOption = [...elements.editMGroupGc.options].find((entry) => entry.value === leader.key);
    if (gcOption) {
      elements.editMGroupGc.value = gcOption.value;
    }
  }
  if (leader?.messengerLink) {
    elements.editMessengerLink.value = leader.messengerLink;
  }
  renderMessengerLinkAction(elements.editMessengerLink.value);
}

function syncLeaderAndGroupFromGc() {
  const option = elements.editMGroupGc.selectedOptions[0];
  if (!option?.value) {
    renderMessengerLinkAction(elements.editMessengerLink.value);
    return;
  }
  const leader = allLeaders().find((entry) => entry.key === option.value);
  if (leader) {
    const leaderOption = [...elements.editLeaderName.options].find((entry) => entry.value === leader.key);
    if (leaderOption) {
      elements.editLeaderName.value = leaderOption.value;
    }
  }
  if (leader?.messengerLink) {
    elements.editMessengerLink.value = leader.messengerLink;
  }
  renderMessengerLinkAction(elements.editMessengerLink.value);
}

populateStatusSelect();
setAddMode('paste');
setTableMessage('Checking sign-in...');
setLeaderTableMessage('Checking sign-in...');

onAuthStateChanged(auth, async (user) => {
  state.currentUser = user;
  state.authReady = true;
  state.currentMember = null;
  state.isAuthorized = false;

  if (!user) {
    await fetchLeaders();
    await fetchSeekers();
    return;
  }

  try {
    state.currentMember = await loadCurrentMemberProfile(user);
    state.isAuthorized = isAuthorizedUser(user, state.currentMember);
  } catch (error) {
    state.isAuthorized = false;
  }

  if (!state.isAuthorized) {
    showUnauthorizedState();
    return;
  }

  await fetchLeaders();
  await fetchSeekers();
});

elements.addSeekerBtn.addEventListener('click', () => {
  if (!state.currentUser || !state.isAuthorized) {
    showFeedback(!state.currentUser ? 'Sign in to Go Mission first, then reopen Seeker Monitoring.' : 'You do not have access to Seeker Monitoring.', 'error');
    return;
  }
  resetAddModal();
  openModal(elements.addModal);
});

elements.addLeaderBtn.addEventListener('click', () => {
  if (!state.currentUser || !state.isAuthorized) {
    showFeedback(!state.currentUser ? 'Sign in to Go Mission first, then reopen Seeker Monitoring.' : 'You do not have access to Seeker Monitoring.', 'error');
    return;
  }
  openAddLeaderModal();
});

elements.refreshBtn.addEventListener('click', async () => {
  await fetchLeaders();
  await fetchSeekers();
});
if (elements.addImageInput) {
  elements.addImageInput.addEventListener('change', handleAddImageChange);
}
if (elements.editImageInput) {
  elements.editImageInput.addEventListener('change', handleEditImageChange);
}
bindEditDropzone();
elements.savePastedBtn.addEventListener('click', savePastedSeeker);
elements.manualForm.addEventListener('submit', saveManualSeeker);
elements.editForm.addEventListener('submit', saveEdit);
elements.leaderForm.addEventListener('submit', saveLeader);
elements.modePasteBtn.addEventListener('click', () => setAddMode('paste'));
elements.modeManualBtn.addEventListener('click', () => setAddMode('manual'));
elements.editLeaderName.addEventListener('change', syncLeaderAndGroupFromLeader);
elements.editMGroupGc.addEventListener('change', syncLeaderAndGroupFromGc);
elements.editMessengerLink.addEventListener('input', (event) => renderMessengerLinkAction(event.target.value));
elements.leaderMessengerLink.addEventListener('input', (event) => renderLeaderMessengerLinkAction(event.target.value));
document.getElementById('edit-preferredDay').addEventListener('input', () => renderLeaderControls(getEditFormSnapshot()));
document.getElementById('edit-preferredTime').addEventListener('input', () => renderLeaderControls(getEditFormSnapshot()));

document.addEventListener('click', (event) => {
  const closeTarget = event.target.closest('[data-close-modal]');
  if (closeTarget) {
    const modalName = closeTarget.dataset.closeModal;
    closeModal(modalName === 'add' ? elements.addModal : modalName === 'leader' ? elements.leaderModal : elements.editModal);
    return;
  }

  const editButton = event.target.closest('[data-edit-id]');
  if (editButton) {
    openEditModalById(editButton.dataset.editId);
    return;
  }

  const editLeaderButton = event.target.closest('[data-edit-leader-id]');
  if (editLeaderButton) {
    openLeaderModalById(editLeaderButton.dataset.editLeaderId);
    return;
  }

  const useLeaderButton = event.target.closest('[data-use-leader]');
  if (useLeaderButton) {
    const leader = allLeaders().find((entry) => entry.key === useLeaderButton.dataset.useLeader);
    if (!leader) return;
    elements.editLeaderName.value = leader.key;
    if (leader.groupChatName) {
      const matchingGc = [...elements.editMGroupGc.options].find((entry) => entry.value === leader.key);
      if (matchingGc) elements.editMGroupGc.value = leader.key;
    } else {
      elements.editMGroupGc.value = '';
    }
    if (leader.messengerLink) {
      elements.editMessengerLink.value = leader.messengerLink;
    }
    renderMessengerLinkAction(elements.editMessengerLink.value);
  }
});
