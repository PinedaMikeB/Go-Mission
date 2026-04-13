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
].map((leader, index) => ({ ...leader, key: `${leader.name}-${leader.day}-${leader.time}-${index}` }));

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
  'leaderName',
  'mGroupGc'
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

const state = {
  seekers: [],
  selectedSeekerId: null,
  addMode: 'paste',
  addImages: [],
  loading: false
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

function populateStatusSelect() {
  elements.editStatus.innerHTML = STATUSES.map((status) => `<option value="${status}">${status}</option>`).join('');
}

function currentSeeker() {
  return state.seekers.find((seeker) => seeker.id === state.selectedSeekerId) || null;
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

function renderSeekerTable() {
  elements.seekerCount.textContent = String(state.seekers.length);

  if (!state.seekers.length) {
    elements.seekerTableBody.innerHTML = '<tr><td colspan="15" class="table-empty">No seekers saved yet.</td></tr>';
    return;
  }

  elements.seekerTableBody.innerHTML = state.seekers
    .map(
      (seeker) => `
        <tr>
          <td>${escapeHtml(seeker.dateRecorded || '')}</td>
          <td>${escapeHtml(seeker.name || '')}</td>
          <td>${escapeHtml(seeker.email || '')}</td>
          <td>${escapeHtml(seeker.age || '')}</td>
          <td>${escapeHtml(seeker.gender || '')}</td>
          <td>${escapeHtml(seeker.maritalStatus || '')}</td>
          <td>${escapeHtml(seeker.mobileNo || '')}</td>
          <td>${escapeHtml(seeker.preferredDay || '')}</td>
          <td>${escapeHtml(seeker.preferredTime || '')}</td>
          <td>${escapeHtml(seeker.church || '')}</td>
          <td class="profile-cell" title="${escapeHtml(seeker.profile || '')}">${seeker.profile ? escapeHtml(truncate(seeker.profile)) : '<span class="table-muted">(blank)</span>'}</td>
          <td>${escapeHtml(seeker.leaderName || '')}</td>
          <td>${escapeHtml(seeker.mGroupGc || '')}</td>
          <td><span class="status-pill">${escapeHtml(seeker.status || '')}</span></td>
          <td><button class="button table-action" type="button" data-edit-id="${seeker.id}">Edit</button></td>
        </tr>
      `
    )
    .join('');
}

async function fetchSeekers() {
  if (state.loading) return;
  state.loading = true;

  try {
    const response = await fetch('/seeker-monitoring/api/seekers');
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'Could not load seekers.');

    state.seekers = Array.isArray(payload.seekers) ? payload.seekers : [];
    renderSeekerTable();
    showFeedback('');
  } catch (error) {
    elements.seekerTableBody.innerHTML = `<tr><td colspan="15" class="table-empty">${escapeHtml(error.message)}</td></tr>`;
    showFeedback(error.message, 'error');
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
  elements.addImageInput.value = '';
  elements.addImageMeta.textContent = 'No image selected';
  state.addImages = [];
  MANUAL_FIELDS.forEach((field) => {
    const element = document.getElementById(`manual-${field}`);
    if (element) element.value = '';
  });
  setAddMode('paste');
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function handleAddImageChange(event) {
  const files = Array.from(event.target.files || []).filter((file) => file.type.startsWith('image/'));
  state.addImages = await Promise.all(files.map((file) => fileToDataUrl(file)));
  elements.addImageMeta.textContent = state.addImages.length
    ? `${state.addImages.length} image${state.addImages.length > 1 ? 's' : ''} selected`
    : 'No image selected';
}

async function savePastedSeeker() {
  const rawText = elements.addRawText.value.trim();
  if (!rawText && !state.addImages.length) {
    showFeedback('Paste seeker text or add a screenshot first.', 'error');
    return;
  }

  elements.savePastedBtn.disabled = true;
  showFeedback('Saving seeker...', 'info');

  try {
    const response = await fetch('/seeker-monitoring/api/ingest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rawText,
        images: state.addImages
      })
    });

    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'Could not save seeker.');

    await fetchSeekers();
    resetAddModal();
    closeModal(elements.addModal);
    showFeedback(`Saved ${payload.seeker?.name || 'new seeker'}.`, 'success');
  } catch (error) {
    showFeedback(error.message, 'error');
  } finally {
    elements.savePastedBtn.disabled = false;
  }
}

function getManualPayload() {
  const payload = {};
  MANUAL_FIELDS.forEach((field) => {
    const element = document.getElementById(`manual-${field}`);
    payload[field] = element?.value?.trim?.() || '';
  });
  return payload;
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
    const response = await fetch('/seeker-monitoring/api/ingest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ manualEntry })
    });

    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'Could not save seeker.');

    await fetchSeekers();
    resetAddModal();
    closeModal(elements.addModal);
    showFeedback(`Saved ${payload.seeker?.name || 'new seeker'}.`, 'success');
  } catch (error) {
    showFeedback(error.message, 'error');
  }
}

function ensureOption(select, value, label) {
  if (!value) return;
  if ([...select.options].some((option) => option.value === value)) return;
  select.insertAdjacentHTML('beforeend', `<option value="${escapeHtml(value)}">${escapeHtml(label || value)}</option>`);
}

function renderLeaderControls(seeker) {
  const matches = getMatchingLeaders(seeker.preferredDay, seeker.preferredTime);
  const options = matches.length ? matches : LEADERS;

  elements.editLeaderName.innerHTML = '<option value="">Select leader</option>' + options
    .map((leader) => `<option value="${escapeHtml(leader.name)}" data-key="${leader.key}">${escapeHtml(`${leader.name} • ${leader.day} ${leader.time}`)}</option>`)
    .join('');

  elements.editMGroupGc.innerHTML = '<option value="">Select M-Group GC</option>' + options
    .filter((leader) => leader.groupChatName)
    .map((leader) => `<option value="${escapeHtml(leader.groupChatName)}" data-key="${leader.key}">${escapeHtml(leader.groupChatName)}</option>`)
    .join('');

  ensureOption(elements.editLeaderName, seeker.leaderName, seeker.leaderName);
  ensureOption(elements.editMGroupGc, seeker.mGroupGc, seeker.mGroupGc);

  elements.editLeaderName.value = seeker.leaderName || '';
  elements.editMGroupGc.value = seeker.mGroupGc || '';

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
    ? `Leader and M-Group GC options are filtered from the seeker schedule.`
    : 'No schedule match found. You can still choose manually.';
}

function getEditFormSnapshot() {
  return {
    id: state.selectedSeekerId,
    preferredDay: document.getElementById('edit-preferredDay').value.trim(),
    preferredTime: document.getElementById('edit-preferredTime').value.trim(),
    leaderName: elements.editLeaderName.value.trim(),
    mGroupGc: elements.editMGroupGc.value.trim()
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
  return updates;
}

async function saveEdit(event) {
  event.preventDefault();
  const seeker = currentSeeker();
  if (!seeker) return;

  showFeedback('Saving changes...', 'info');

  try {
    const response = await fetch('/seeker-monitoring/api/seekers', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: seeker.id,
        updates: readEditPayload()
      })
    });

    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'Could not save seeker changes.');

    await fetchSeekers();
    closeModal(elements.editModal);
    showFeedback(`Updated ${payload.seeker?.name || 'seeker'}.`, 'success');
  } catch (error) {
    showFeedback(error.message, 'error');
  }
}

function syncLeaderAndGroupFromLeader(value) {
  const selectedKey = elements.editLeaderName.selectedOptions[0]?.dataset.key;
  const leader = LEADERS.find((entry) => entry.key === selectedKey) || LEADERS.find((entry) => entry.name === value);
  if (leader && leader.groupChatName) {
    ensureOption(elements.editMGroupGc, leader.groupChatName, leader.groupChatName);
    elements.editMGroupGc.value = leader.groupChatName;
  }
}

function syncLeaderAndGroupFromGc(value) {
  const selectedKey = elements.editMGroupGc.selectedOptions[0]?.dataset.key;
  const leader = LEADERS.find((entry) => entry.key === selectedKey) || LEADERS.find((entry) => entry.groupChatName === value);
  if (leader) {
    ensureOption(elements.editLeaderName, leader.name, `${leader.name} • ${leader.day} ${leader.time}`);
    elements.editLeaderName.value = leader.name;
  }
}

populateStatusSelect();
setAddMode('paste');
fetchSeekers();

elements.addSeekerBtn.addEventListener('click', () => {
  resetAddModal();
  openModal(elements.addModal);
});

elements.refreshBtn.addEventListener('click', fetchSeekers);
elements.addImageInput.addEventListener('change', handleAddImageChange);
elements.savePastedBtn.addEventListener('click', savePastedSeeker);
elements.manualForm.addEventListener('submit', saveManualSeeker);
elements.editForm.addEventListener('submit', saveEdit);
elements.modePasteBtn.addEventListener('click', () => setAddMode('paste'));
elements.modeManualBtn.addEventListener('click', () => setAddMode('manual'));
elements.editLeaderName.addEventListener('change', (event) => syncLeaderAndGroupFromLeader(event.target.value));
elements.editMGroupGc.addEventListener('change', (event) => syncLeaderAndGroupFromGc(event.target.value));
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
    ensureOption(elements.editLeaderName, leader.name, `${leader.name} • ${leader.day} ${leader.time}`);
    ensureOption(elements.editMGroupGc, leader.groupChatName, leader.groupChatName);
    elements.editLeaderName.value = leader.name;
    elements.editMGroupGc.value = leader.groupChatName || '';
  }
});
