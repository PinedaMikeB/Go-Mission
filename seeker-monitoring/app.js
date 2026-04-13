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
];

const state = {
  images: [],
  seekers: [],
  selectedSeekerId: null,
  loadingSeekers: false,
  matches: []
};

const elements = {
  fileInput: document.getElementById('file-input'),
  dropzone: document.getElementById('dropzone'),
  previewGrid: document.getElementById('preview-grid'),
  queueMeta: document.getElementById('queue-meta'),
  statusBadge: document.getElementById('status-badge'),
  statusLog: document.getElementById('status-log'),
  statusInput: document.getElementById('status-input'),
  statusHelp: document.getElementById('status-help'),
  remarksInput: document.getElementById('remarks-input'),
  rawTextInput: document.getElementById('raw-text-input'),
  submitBtn: document.getElementById('submit-btn'),
  clearBtn: document.getElementById('clear-btn'),
  refreshBtn: document.getElementById('refresh-btn'),
  seekerTableBody: document.getElementById('seeker-table-body'),
  seekerCount: document.getElementById('seeker-count'),
  leaderCount: document.getElementById('leader-count'),
  leaderTableBody: document.getElementById('leader-table-body'),
  matchNote: document.getElementById('match-note'),
  statusLadder: document.getElementById('status-ladder'),
  editorTitle: document.getElementById('editor-title'),
  editorForm: document.getElementById('editor-form'),
  editorMeta: document.getElementById('editor-meta'),
  saveBtn: document.getElementById('save-btn'),
  editStatus: document.getElementById('edit-status'),
  editStatusNotes: document.getElementById('edit-statusNotes')
};

const editorFieldIds = [
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
  'coordinatorNote',
  'leaderName',
  'leaderDay',
  'leaderTime',
  'leaderGroupChatName'
];

function populateStatusSelect(select) {
  select.innerHTML = STATUSES.map((status) => `<option value="${status}">${status}</option>`).join('');
}

function currentSelectedSeeker() {
  return state.seekers.find((seeker) => seeker.id === state.selectedSeekerId) || null;
}

function truncate(value = '', max = 90) {
  if (!value) return '';
  return value.length > max ? `${value.slice(0, max - 1)}...` : value;
}

function escapeHtml(value = '') {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function setRunStatus(kind, message) {
  elements.statusBadge.className = `status-inline ${kind}`;
  elements.statusBadge.textContent =
    kind === 'working' ? 'Working' : kind === 'done' ? 'Saved' : kind === 'error' ? 'Error' : 'Idle';
  elements.statusLog.textContent = message;
}

function updateQueueMeta() {
  const count = state.images.length;
  elements.queueMeta.textContent = count ? `${count} screenshot${count > 1 ? 's' : ''} queued` : 'Nothing queued yet';
}

function renderPreviews() {
  if (!state.images.length) {
    elements.previewGrid.innerHTML = '<p class="empty-copy">No screenshots queued yet.</p>';
    updateQueueMeta();
    return;
  }

  elements.previewGrid.innerHTML = state.images
    .map(
      (image, index) => `
        <figure class="preview-card">
          <img src="${image.dataUrl}" alt="Queued screenshot ${index + 1}" />
          <figcaption>Screenshot ${index + 1}</figcaption>
        </figure>
      `
    )
    .join('');

  updateQueueMeta();
}

function renderStatusHelper() {
  const status = elements.statusInput.value;
  elements.statusHelp.textContent = STATUS_DESCRIPTIONS[status] || '';
}

function renderStatusLadder(activeStatus = '') {
  elements.statusLadder.innerHTML = STATUSES.map(
    (status) => `
      <article class="ladder-item ${status === activeStatus ? 'active' : ''}">
        <h3>${status}</h3>
        <p>${STATUS_DESCRIPTIONS[status]}</p>
      </article>
    `
  ).join('');
}

function normalizeDay(value = '') {
  const match = value.match(/monday|tuesday|wednesday|thursday|friday|saturday|sunday/i);
  return match ? match[0].toLowerCase() : '';
}

function parseTimeTokens(value = '') {
  return [...value.toLowerCase().matchAll(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/g)].map((match) => {
    let hours = Number(match[1]) % 12;
    const minutes = Number(match[2] || '0');
    if (match[3] === 'pm') hours += 12;
    return hours * 60 + minutes;
  });
}

function buildTimeWindow(value = '') {
  const tokens = parseTimeTokens(value);
  if (!tokens.length) return null;
  if (tokens.length === 1) return { start: tokens[0], end: tokens[0] };
  return { start: Math.min(...tokens), end: Math.max(...tokens) };
}

function findLeaderMatches(day, time) {
  const normalizedDay = normalizeDay(day);
  const preferredWindow = buildTimeWindow(time);
  if (!normalizedDay) return [];

  return LEADERS.filter((leader) => {
    if (normalizeDay(leader.day) !== normalizedDay) return false;
    if (!preferredWindow) return true;

    const leaderWindow = buildTimeWindow(leader.time);
    if (!leaderWindow) return true;
    return leaderWindow.start >= preferredWindow.start && leaderWindow.end <= preferredWindow.end;
  });
}

function renderLeaders() {
  const seeker = currentSelectedSeeker();
  state.matches = seeker ? findLeaderMatches(seeker.preferredDay, seeker.preferredTime) : [];

  elements.leaderTableBody.innerHTML = LEADERS.map((leader) => {
    const matched = state.matches.some(
      (candidate) =>
        candidate.name === leader.name &&
        candidate.day === leader.day &&
        candidate.time === leader.time &&
        candidate.groupChatName === leader.groupChatName
    );

    return `
      <tr class="${matched ? 'matched' : ''}">
        <td>${leader.name}</td>
        <td>${leader.day}</td>
        <td>${leader.time}</td>
        <td>${leader.groupChatName || '<span class="table-muted">(blank)</span>'}</td>
        <td><button class="button table-action" type="button" data-leader="${escapeHtml(leader.name)}" data-day="${escapeHtml(leader.day)}" data-time="${escapeHtml(leader.time)}" data-group="${escapeHtml(leader.groupChatName || '')}">Use</button></td>
      </tr>
    `;
  }).join('');

  if (!seeker) {
    elements.matchNote.textContent = 'Matching leaders for the selected seeker will be highlighted here.';
  } else if (state.matches.length) {
    elements.matchNote.textContent = `Suggested leaders for ${seeker.preferredDay || 'the selected day'} ${seeker.preferredTime ? `at ${seeker.preferredTime}` : ''}: ${state.matches.map((leader) => leader.name).join(', ')}.`;
  } else {
    elements.matchNote.textContent = `No exact match found for ${seeker.preferredDay || 'this seeker'} ${seeker.preferredTime ? `at ${seeker.preferredTime}` : ''}. You can still assign a leader manually from the table.`;
  }
}

function renderSeekerTable() {
  elements.seekerCount.textContent = String(state.seekers.length);

  if (!state.seekers.length) {
    elements.seekerTableBody.innerHTML = '<tr><td colspan="13" class="table-empty">No seekers saved yet.</td></tr>';
    return;
  }

  elements.seekerTableBody.innerHTML = state.seekers.map((seeker) => {
    const selected = seeker.id === state.selectedSeekerId;
    return `
      <tr class="${selected ? 'selected-row' : ''}">
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
        <td class="profile-cell" title="${escapeHtml(seeker.profile || '')}">${seeker.profile ? escapeHtml(truncate(seeker.profile, 110)) : '<span class="table-muted">(blank)</span>'}</td>
        <td><span class="status-pill">${escapeHtml(seeker.status || '')}</span></td>
        <td><button class="button table-action" type="button" data-edit-id="${seeker.id}">View / Edit</button></td>
      </tr>
    `;
  }).join('');
}

function updateEditorStatus(status) {
  elements.editStatus.value = status;
  elements.editStatusNotes.textContent = STATUS_DESCRIPTIONS[status] || '';
  renderStatusLadder(status);
}

function fillEditor(seeker) {
  if (!seeker) {
    elements.editorTitle.textContent = 'Select a seeker from the table';
    elements.editorMeta.textContent = 'Pick a seeker row to load the details here.';
    elements.saveBtn.disabled = true;
    editorFieldIds.forEach((field) => {
      const element = document.getElementById(`edit-${field}`);
      if (!element) return;
      element.value = field === 'status' ? 'Processing' : '';
    });
    updateEditorStatus('Processing');
    renderLeaders();
    return;
  }

  elements.editorTitle.textContent = seeker.name ? `Editing ${seeker.name}` : `Editing ${seeker.id}`;
  elements.editorMeta.textContent = seeker.updatedAt ? `Last updated ${new Date(seeker.updatedAt).toLocaleString()}` : 'Loaded from seeker monitoring.';
  elements.saveBtn.disabled = false;

  editorFieldIds.forEach((field) => {
    const element = document.getElementById(`edit-${field}`);
    if (!element) return;
    element.value = seeker[field] || '';
  });

  updateEditorStatus(seeker.status || 'Processing');
  renderLeaders();
}

function selectSeeker(seekerId, shouldScroll = false) {
  state.selectedSeekerId = seekerId;
  renderSeekerTable();
  fillEditor(currentSelectedSeeker());
  if (shouldScroll) {
    elements.editorForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

async function fetchSeekers() {
  if (state.loadingSeekers) return;

  state.loadingSeekers = true;
  setRunStatus('working', 'Loading seeker list from Firebase...');

  try {
    const response = await fetch('/seeker-monitoring/api/seekers');
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'Could not load seeker records.');

    state.seekers = Array.isArray(payload.seekers) ? payload.seekers : [];
    if (state.selectedSeekerId && !state.seekers.some((seeker) => seeker.id === state.selectedSeekerId)) {
      state.selectedSeekerId = null;
    }
    renderSeekerTable();
    fillEditor(currentSelectedSeeker());
    setRunStatus('idle', 'Seeker list loaded.');
  } catch (error) {
    setRunStatus('error', error.message);
    elements.seekerTableBody.innerHTML = `<tr><td colspan="13" class="table-empty">${escapeHtml(error.message)}</td></tr>`;
  } finally {
    state.loadingSeekers = false;
  }
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function addFiles(fileList) {
  const files = Array.from(fileList).filter((file) => file.type.startsWith('image/'));
  const prepared = await Promise.all(
    files.map(async (file, index) => ({
      name: file.name || `image-${state.images.length + index + 1}`,
      dataUrl: await fileToDataUrl(file)
    }))
  );
  state.images.push(...prepared);
  renderPreviews();
  setRunStatus('idle', `Queued ${state.images.length} screenshot${state.images.length > 1 ? 's' : ''}.`);
}

async function handlePaste(event) {
  const files = Array.from(event.clipboardData?.files || []);
  if (!files.length) return;
  event.preventDefault();
  await addFiles(files);
}

async function submitSeeker() {
  const rawText = elements.rawTextInput.value.trim();
  if (!state.images.length && !rawText) {
    setRunStatus('error', 'Add at least one screenshot or pasted seeker text before saving.');
    return;
  }

  elements.submitBtn.disabled = true;
  setRunStatus('working', 'Extracting the seeker details and saving the record to Firebase...');

  try {
    const response = await fetch('/seeker-monitoring/api/ingest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        images: state.images.map((item) => item.dataUrl),
        rawText,
        followUpStatus: elements.statusInput.value,
        remarks: elements.remarksInput.value.trim()
      })
    });

    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'The seeker could not be saved.');

    if (payload.seeker) {
      state.seekers.unshift(payload.seeker);
      renderSeekerTable();
      selectSeeker(payload.seeker.id, true);
    }

    state.images = [];
    elements.rawTextInput.value = '';
    elements.remarksInput.value = '';
    renderPreviews();
    setRunStatus('done', `Saved ${payload.seeker?.name || 'new seeker'}.\n\n${payload.statusDescription || ''}\n\n${payload.summary || ''}`.trim());
  } catch (error) {
    setRunStatus('error', error.message);
  } finally {
    elements.submitBtn.disabled = false;
  }
}

function buildEditorPayload() {
  const updates = {};
  editorFieldIds.forEach((field) => {
    const element = document.getElementById(`edit-${field}`);
    updates[field] = element?.value?.trim?.() ?? '';
  });
  return updates;
}

async function saveSelectedSeeker(event) {
  event.preventDefault();
  const seeker = currentSelectedSeeker();
  if (!seeker) return;

  elements.saveBtn.disabled = true;
  setRunStatus('working', `Saving changes for ${seeker.name || 'selected seeker'}...`);

  try {
    const response = await fetch('/seeker-monitoring/api/seekers', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: seeker.id,
        updates: buildEditorPayload()
      })
    });

    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'The seeker update failed.');

    state.seekers = state.seekers.map((item) => (item.id === payload.seeker.id ? payload.seeker : item));
    renderSeekerTable();
    fillEditor(payload.seeker);
    setRunStatus('done', `Saved changes for ${payload.seeker.name || 'selected seeker'}.`);
  } catch (error) {
    setRunStatus('error', error.message);
  } finally {
    elements.saveBtn.disabled = false;
  }
}

function assignLeaderFromButton(button) {
  document.getElementById('edit-leaderName').value = button.dataset.leader || '';
  document.getElementById('edit-leaderDay').value = button.dataset.day || '';
  document.getElementById('edit-leaderTime').value = button.dataset.time || '';
  document.getElementById('edit-leaderGroupChatName').value = button.dataset.group || '';
}

populateStatusSelect(elements.statusInput);
populateStatusSelect(elements.editStatus);
elements.leaderCount.textContent = String(LEADERS.length);
elements.statusInput.value = 'Processing';
elements.editStatus.value = 'Processing';
renderStatusHelper();
renderStatusLadder('Processing');
renderPreviews();
renderLeaders();
fillEditor(null);

elements.statusInput.addEventListener('change', renderStatusHelper);
elements.editStatus.addEventListener('change', () => updateEditorStatus(elements.editStatus.value));
elements.fileInput.addEventListener('change', (event) => addFiles(event.target.files));
elements.dropzone.addEventListener('click', () => elements.fileInput.click());
elements.dropzone.addEventListener('dragover', (event) => {
  event.preventDefault();
  elements.dropzone.classList.add('dragover');
});
elements.dropzone.addEventListener('dragleave', () => elements.dropzone.classList.remove('dragover'));
elements.dropzone.addEventListener('drop', async (event) => {
  event.preventDefault();
  elements.dropzone.classList.remove('dragover');
  await addFiles(event.dataTransfer.files);
});
document.addEventListener('paste', handlePaste);
elements.submitBtn.addEventListener('click', submitSeeker);
elements.refreshBtn.addEventListener('click', fetchSeekers);
elements.clearBtn.addEventListener('click', () => {
  state.images = [];
  elements.rawTextInput.value = '';
  renderPreviews();
  setRunStatus('idle', 'Queue cleared.');
});
elements.editorForm.addEventListener('submit', saveSelectedSeeker);

document.addEventListener('click', (event) => {
  const editButton = event.target.closest('[data-edit-id]');
  if (editButton) {
    selectSeeker(editButton.dataset.editId, true);
    return;
  }

  const leaderButton = event.target.closest('[data-leader]');
  if (leaderButton) {
    assignLeaderFromButton(leaderButton);
  }
});

fetchSeekers();
