import {
  auth,
  db,
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  onAuthStateChanged,
  serverTimestamp
} from '../js/firebase-config.js';

const SEEKER_COLLECTION = 'goMission_vlogEngagementSeekers';
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

const LEADERS = [
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
  { name: 'Jeff', day: 'Sunday', time: '9PM', groupChatName: 'BRO JEF-WOTG SUNDAY 9PM MALE' }
].map((leader, index) => ({
  ...leader,
  messengerLink: leader.messengerLink || '',
  key: `${leader.name}-${leader.day}-${leader.time}-${index}`
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
  'Leader',
  'M-Group GC',
  'Messenger',
  'Status',
  'Action'
];

const state = {
  seekers: [],
  selectedSeekerId: null,
  addMode: 'paste',
  loading: false,
  authReady: false,
  currentUser: null
};

const elements = {
  seekerCount: document.getElementById('seeker-count'),
  feedbackBanner: document.getElementById('feedback-banner'),
  seekerTableBody: document.getElementById('seeker-table-body'),
  addSeekerBtn: document.getElementById('add-seeker-btn'),
  refreshBtn: document.getElementById('refresh-btn'),
  addModal: document.getElementById('add-modal'),
  editModal: document.getElementById('edit-modal'),
  pastePane: document.getElementById('paste-pane'),
  manualForm: document.getElementById('manual-form'),
  addRawText: document.getElementById('add-raw-text'),
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
  leaderMatchNote: document.getElementById('leader-match-note'),
  leaderTableBody: document.getElementById('leader-table-body')
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

function normalizeDay(value = '') {
  const match = value.match(/monday|tuesday|wednesday|thursday|friday|saturday|sunday/i);
  return match ? match[0].toLowerCase() : '';
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

function getMatchingLeaders(preferredDay = '', preferredTime = '') {
  const normalizedDay = normalizeDay(preferredDay);
  const preferredWindow = buildTimeWindow(preferredTime);

  const dayMatches = normalizedDay
    ? LEADERS.filter((leader) => normalizeDay(leader.day) === normalizedDay)
    : [...LEADERS];

  if (!preferredWindow) return dayMatches;

  const exactTimeMatches = dayMatches.filter((leader) => {
    const leaderWindow = buildTimeWindow(leader.time);
    if (!leaderWindow) return true;
    return leaderWindow.start >= preferredWindow.start && leaderWindow.end <= preferredWindow.end;
  });

  return exactTimeMatches.length ? exactTimeMatches : dayMatches;
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
    status: coerceText(record.status) || 'Processing',
    leaderName: coerceText(record.leaderName),
    mGroupGc: coerceText(record.mGroupGc),
    messengerLink: coerceText(record.messengerLink),
    rawPastedText: coerceText(record.rawPastedText),
    createdAt: record.createdAt || null,
    updatedAt: record.updatedAt || null
  };
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
    return 'Seeker Monitoring is using Firestore now, but this collection still needs Firestore rule access.';
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

function currentSeeker() {
  return state.seekers.find((seeker) => seeker.id === state.selectedSeekerId) || null;
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

function requireSignedIn() {
  if (state.currentUser) return;
  throw new Error('Sign in to Go Mission first, then reopen Seeker Monitoring.');
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
  if (elements.addModal.hidden && elements.editModal.hidden) {
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
  MANUAL_FIELDS.forEach((field) => {
    const element = document.getElementById(`manual-${field}`);
    if (element) element.value = '';
  });
  setAddMode('paste');
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
  requireSignedIn();
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

async function savePastedSeeker() {
  const rawText = elements.addRawText.value.trim();
  if (!rawText) {
    showFeedback('Paste the seeker details first.', 'error');
    return;
  }

  elements.savePastedBtn.disabled = true;
  showFeedback('Saving seeker...', 'info');

  try {
    const parsed = parseRawText(rawText);
    const id = await createSeeker(parsed);
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

function ensureLeaderOption(select, value, label, dataName = '', dataGc = '') {
  if (!value) return;
  if ([...select.options].some((option) => option.value === value)) return;
  select.insertAdjacentHTML(
    'beforeend',
    `<option value="${escapeHtml(value)}" data-name="${escapeHtml(dataName)}" data-gc="${escapeHtml(dataGc)}">${escapeHtml(label || value)}</option>`
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
  const options = matches.length ? matches : LEADERS;

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
    ensureLeaderOption(elements.editLeaderName, customValue, seeker.leaderName, seeker.leaderName, seeker.mGroupGc);
    elements.editLeaderName.value = customValue;
  } else {
    elements.editLeaderName.value = '';
  }

  if (matchingGcOption) {
    elements.editMGroupGc.value = matchingGcOption.value;
  } else if (seeker.mGroupGc) {
    const customValue = `custom-gc:${seeker.mGroupGc}`;
    ensureLeaderOption(elements.editMGroupGc, customValue, seeker.mGroupGc, seeker.leaderName, seeker.mGroupGc);
    elements.editMGroupGc.value = customValue;
  } else {
    elements.editMGroupGc.value = '';
  }

  elements.editMessengerLink.value = seeker.messengerLink || '';
  renderMessengerLinkAction(seeker.messengerLink || '');

  elements.leaderTableBody.innerHTML = options
    .map(
      (leader) => `
        <tr class="${leader.name === seeker.leaderName || leader.groupChatName === seeker.mGroupGc ? 'matched' : ''}">
          <td>${escapeHtml(leader.name)}</td>
          <td>${escapeHtml(leader.day)}</td>
          <td>${escapeHtml(leader.time)}</td>
          <td>${leader.groupChatName ? escapeHtml(leader.groupChatName) : '<span class="table-muted">(blank)</span>'}</td>
          <td><button class="button table-action" type="button" data-use-leader="${leader.key}">Use</button></td>
        </tr>
      `
    )
    .join('');

  elements.leaderMatchNote.textContent = options.length
    ? 'Leader and M-Group GC options are filtered from the seeker schedule.'
    : 'No schedule match found. You can still choose manually.';
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
  elements.editModalTitle.textContent = seeker.name ? `Edit ${seeker.name}` : 'Edit seeker';
  EDIT_FIELDS.forEach((field) => {
    const element = document.getElementById(`edit-${field}`);
    if (element) element.value = seeker[field] || '';
  });
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
    requireSignedIn();
    await updateDoc(doc(db, SEEKER_COLLECTION, seeker.id), {
      ...readEditPayload(),
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

function syncLeaderAndGroupFromLeader() {
  const option = elements.editLeaderName.selectedOptions[0];
  if (!option?.value) {
    renderMessengerLinkAction(elements.editMessengerLink.value);
    return;
  }
  const leader = LEADERS.find((entry) => entry.key === option.value);
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
  const leader = LEADERS.find((entry) => entry.key === option.value);
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

onAuthStateChanged(auth, async (user) => {
  state.currentUser = user;
  state.authReady = true;
  await fetchSeekers();
});

elements.addSeekerBtn.addEventListener('click', () => {
  if (!state.currentUser) {
    showFeedback('Sign in to Go Mission first, then reopen Seeker Monitoring.', 'error');
    return;
  }
  resetAddModal();
  openModal(elements.addModal);
});

elements.refreshBtn.addEventListener('click', fetchSeekers);
elements.savePastedBtn.addEventListener('click', savePastedSeeker);
elements.manualForm.addEventListener('submit', saveManualSeeker);
elements.editForm.addEventListener('submit', saveEdit);
elements.modePasteBtn.addEventListener('click', () => setAddMode('paste'));
elements.modeManualBtn.addEventListener('click', () => setAddMode('manual'));
elements.editLeaderName.addEventListener('change', syncLeaderAndGroupFromLeader);
elements.editMGroupGc.addEventListener('change', syncLeaderAndGroupFromGc);
elements.editMessengerLink.addEventListener('input', (event) => renderMessengerLinkAction(event.target.value));
document.getElementById('edit-preferredDay').addEventListener('input', () => renderLeaderControls(getEditFormSnapshot()));
document.getElementById('edit-preferredTime').addEventListener('input', () => renderLeaderControls(getEditFormSnapshot()));

document.addEventListener('click', (event) => {
  const closeTarget = event.target.closest('[data-close-modal]');
  if (closeTarget) {
    const modalName = closeTarget.dataset.closeModal;
    closeModal(modalName === 'add' ? elements.addModal : elements.editModal);
    return;
  }

  const editButton = event.target.closest('[data-edit-id]');
  if (editButton) {
    openEditModalById(editButton.dataset.editId);
    return;
  }

  const useLeaderButton = event.target.closest('[data-use-leader]');
  if (useLeaderButton) {
    const leader = LEADERS.find((entry) => entry.key === useLeaderButton.dataset.useLeader);
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
