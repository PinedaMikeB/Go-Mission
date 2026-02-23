import {
  db,
  auth,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit
} from '../js/firebase-config.js';
import {
  addDoc,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';
import {
  onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js';

const THEME_STORAGE_KEY = 'goMission_theme';
const WATCH_SESSION_KEY = 'goMission_watch_session_id';
const EVENT_TYPES = new Set(['onPlay', 'watched_30s', 'watched_90pct', 'onEnd']);
const WATCH_MESSAGE_TYPES = new Set(['comment', 'prayer_request', 'chat_with_us']);

let authReadyResolved = false;
let currentUserId = 'guest';
let resolveAuthReady;
const authReady = new Promise((resolve) => {
  resolveAuthReady = resolve;
});

function resolveAuthOnce() {
  if (authReadyResolved) {
    return;
  }

  authReadyResolved = true;
  resolveAuthReady();
}

try {
  onAuthStateChanged(
    auth,
    (user) => {
      currentUserId = user?.uid || 'guest';
      resolveAuthOnce();
    },
    () => {
      currentUserId = 'guest';
      resolveAuthOnce();
    }
  );

  setTimeout(resolveAuthOnce, 2000);
} catch (error) {
  console.warn('[Watch] Auth listener unavailable:', error?.message || error);
  resolveAuthOnce();
}

function toNumeric(value, fallback = Number.MAX_SAFE_INTEGER) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeText(value, maxLength = 0) {
  const text = String(value == null ? '' : value).trim();
  if (maxLength <= 0) {
    return text;
  }

  return text.slice(0, maxLength);
}

function compareStrings(a, b) {
  return String(a || '').localeCompare(String(b || ''));
}

function mapDocToObject(docSnap) {
  const data = docSnap.data() || {};
  return {
    id: data.id || docSnap.id,
    ...data
  };
}

function sortSeriesItems(series) {
  return [...series].sort((a, b) => {
    const aPublish = toEpoch(a.publishAt);
    const bPublish = toEpoch(b.publishAt);
    if (aPublish !== bPublish) {
      if (aPublish == null) return 1;
      if (bPublish == null) return -1;
      return bPublish - aPublish;
    }

    const orderDiff = toNumeric(a.order) - toNumeric(b.order);
    if (orderDiff !== 0) {
      return orderDiff;
    }

    return compareStrings(a.title, b.title);
  });
}

function sortEpisodeItems(episodes) {
  return [...episodes].sort((a, b) => {
    const orderDiff = toNumeric(a.order) - toNumeric(b.order);
    if (orderDiff !== 0) {
      return orderDiff;
    }

    const weekDiff = toNumeric(a.weekNumber) - toNumeric(b.weekNumber);
    if (weekDiff !== 0) {
      return weekDiff;
    }

    return compareStrings(a.title, b.title);
  });
}

function toEpoch(value) {
  if (!value) {
    return null;
  }

  if (typeof value?.toDate === 'function') {
    const date = value.toDate();
    return Number.isFinite(date?.getTime?.()) ? date.getTime() : null;
  }

  if (typeof value === 'object' && typeof value.seconds === 'number') {
    return value.seconds * 1000;
  }

  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.getTime() : null;
}

function isPublishable(item) {
  const now = Date.now();
  const status = String(item?.status || '').toLowerCase();
  const publishAt = toEpoch(item?.publishAt);

  if (status === 'draft') {
    return false;
  }

  if (status === 'scheduled') {
    return publishAt ? publishAt <= now : false;
  }

  if (publishAt) {
    return publishAt <= now;
  }

  return true;
}

export function applyStoredThemePreference() {
  const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
  if (savedTheme === 'dark') {
    document.body.classList.remove('light-mode');
    return;
  }

  document.body.classList.add('light-mode');
}

export function getQueryParam(key) {
  const params = new URLSearchParams(window.location.search);
  return params.get(key);
}

function createSessionId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `watch_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function getSessionId() {
  const existing = sessionStorage.getItem(WATCH_SESSION_KEY);
  if (existing) {
    return existing;
  }

  const next = createSessionId();
  sessionStorage.setItem(WATCH_SESSION_KEY, next);
  return next;
}

async function resolveMemberContact(uid, user) {
  const fallbackName = normalizeText(user?.displayName || '', 120);
  const fallbackEmail = normalizeText(user?.email || '', 160).toLowerCase();

  try {
    const memberSnap = await getDoc(doc(db, 'goMission_members', uid));
    if (!memberSnap.exists()) {
      return { name: fallbackName || null, email: fallbackEmail || null };
    }

    const data = memberSnap.data() || {};
    const name = normalizeText(data.displayName || data.name || fallbackName, 120);
    const email = normalizeText(data.email || fallbackEmail, 160).toLowerCase();
    return { name: name || null, email: email || null };
  } catch (error) {
    console.warn('[Watch] Could not load member profile for inbox:', error?.message || error);
    return { name: fallbackName || null, email: fallbackEmail || null };
  }
}

export async function requireWatchAuth(statusElement = null) {
  await authReady;

  const user = auth?.currentUser || null;
  if (user?.uid) {
    currentUserId = user.uid;
    return user;
  }

  if (statusElement) {
    setStateMessage(statusElement, 'Sign in required. Redirecting...', true);
  }

  const intended = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  window.location.replace(`/?redirect=${encodeURIComponent(intended)}`);
  return null;
}

export async function fetchVideoSeries() {
  let snapshot;

  try {
    const orderedQuery = query(
      collection(db, 'video_series'),
      orderBy('order', 'asc')
    );
    snapshot = await getDocs(orderedQuery);
  } catch (error) {
    console.warn('[Watch] Falling back to unordered video_series read:', error?.message || error);
    snapshot = await getDocs(collection(db, 'video_series'));
  }

  const items = snapshot.docs
    .map(mapDocToObject)
    .filter(isPublishable);
  return sortSeriesItems(items);
}

export async function fetchSeriesById(seriesId) {
  if (!seriesId) {
    return null;
  }

  try {
    const seriesRef = doc(db, 'video_series', seriesId);
    const direct = await getDoc(seriesRef);
    if (direct.exists()) {
      const mapped = mapDocToObject(direct);
      return isPublishable(mapped) ? mapped : null;
    }
  } catch (error) {
    console.warn('[Watch] Could not read series by document id:', error?.message || error);
  }

  try {
    const fallbackQuery = query(
      collection(db, 'video_series'),
      where('id', '==', seriesId),
      limit(1)
    );
    const fallback = await getDocs(fallbackQuery);
    if (!fallback.empty) {
      const mapped = mapDocToObject(fallback.docs[0]);
      return isPublishable(mapped) ? mapped : null;
    }
  } catch (error) {
    console.warn('[Watch] Could not read series by id field:', error?.message || error);
  }

  return null;
}

export async function fetchEpisodesBySeries(seriesId) {
  if (!seriesId) {
    return [];
  }

  let snapshot;

  try {
    const orderedQuery = query(
      collection(db, 'video_episodes'),
      where('seriesId', '==', seriesId),
      orderBy('order', 'asc')
    );
    snapshot = await getDocs(orderedQuery);
  } catch (error) {
    console.warn('[Watch] Falling back to non-indexed episode read:', error?.message || error);
    const fallbackQuery = query(
      collection(db, 'video_episodes'),
      where('seriesId', '==', seriesId)
    );
    snapshot = await getDocs(fallbackQuery);
  }

  const items = snapshot.docs
    .map(mapDocToObject)
    .filter(isPublishable);
  return sortEpisodeItems(items);
}

export async function fetchEpisodeById(episodeId) {
  if (!episodeId) {
    return null;
  }

  try {
    const episodeRef = doc(db, 'video_episodes', episodeId);
    const direct = await getDoc(episodeRef);
    if (direct.exists()) {
      const mapped = mapDocToObject(direct);
      return isPublishable(mapped) ? mapped : null;
    }
  } catch (error) {
    console.warn('[Watch] Could not read episode by document id:', error?.message || error);
  }

  try {
    const fallbackQuery = query(
      collection(db, 'video_episodes'),
      where('id', '==', episodeId),
      limit(1)
    );
    const fallback = await getDocs(fallbackQuery);
    if (!fallback.empty) {
      const mapped = mapDocToObject(fallback.docs[0]);
      return isPublishable(mapped) ? mapped : null;
    }
  } catch (error) {
    console.warn('[Watch] Could not read episode by id field:', error?.message || error);
  }

  return null;
}

export async function logVideoEvent({ episodeId, eventType, sessionId }) {
  if (!episodeId || !eventType || !EVENT_TYPES.has(eventType)) {
    console.warn('[Watch] Ignoring malformed event payload:', { episodeId, eventType });
    return false;
  }

  await authReady;
  const userId = auth?.currentUser?.uid || currentUserId || '';
  if (!userId || userId === 'guest') {
    return false;
  }

  try {
    await addDoc(collection(db, 'video_events'), {
      userId,
      episodeId,
      eventType,
      ts: serverTimestamp(),
      sessionId: sessionId || getSessionId()
    });

    return true;
  } catch (error) {
    console.error('[Watch] Failed to save video event:', {
      episodeId,
      eventType,
      message: error?.message || String(error)
    });

    return false;
  }
}

export async function submitWatchInboxMessage({
  episodeId,
  seriesId = '',
  messageType = 'comment',
  message = '',
  sessionId = '',
  pagePath = ''
}) {
  const normalizedEpisodeId = normalizeText(episodeId, 200);
  const normalizedSeriesId = normalizeText(seriesId, 200);
  const normalizedType = normalizeText(messageType, 40).toLowerCase();
  const normalizedMessage = normalizeText(message, 1200);
  const normalizedSession = normalizeText(sessionId, 120) || getSessionId();
  const normalizedPath = normalizeText(pagePath, 400)
    || normalizeText(`${window.location.pathname}${window.location.search}`, 400);

  if (!normalizedEpisodeId) {
    return { ok: false, error: 'Episode is missing. Please reload this page.' };
  }

  if (!WATCH_MESSAGE_TYPES.has(normalizedType)) {
    return { ok: false, error: 'Please choose a valid message type.' };
  }

  if (normalizedMessage.length < 2) {
    return { ok: false, error: 'Please write at least 2 characters.' };
  }

  await authReady;
  const user = auth?.currentUser || null;
  const userId = user?.uid || currentUserId || '';
  if (!userId || userId === 'guest') {
    return { ok: false, error: 'Sign in is required.' };
  }

  try {
    const contact = await resolveMemberContact(userId, user);
    const userAgent = normalizeText(navigator?.userAgent || '', 512);
    const docRef = await addDoc(collection(db, 'video_inbox'), {
      userId,
      episodeId: normalizedEpisodeId,
      seriesId: normalizedSeriesId || null,
      messageType: normalizedType,
      message: normalizedMessage,
      contactName: contact.name,
      contactEmail: contact.email,
      status: 'new',
      source: 'watch_player',
      ts: serverTimestamp(),
      sessionId: normalizedSession,
      pagePath: normalizedPath || null,
      userAgent: userAgent || null
    });

    return { ok: true, id: docRef.id };
  } catch (error) {
    const code = String(error?.code || '');
    const messageText = String(error?.message || '');
    const isPermissionError = code.includes('permission-denied') || messageText.toLowerCase().includes('permission');

    if (isPermissionError) {
      return { ok: false, error: 'Permission denied. Please sign in as an approved user and retry.' };
    }

    console.error('[Watch] Failed to save inbox message:', {
      episodeId: normalizedEpisodeId,
      messageType: normalizedType,
      message: messageText
    });
    return { ok: false, error: 'Could not send message right now. Please try again.' };
  }
}

export function setStateMessage(element, message, isError = false) {
  if (!element) {
    return;
  }

  element.textContent = message;
  element.classList.toggle('error', Boolean(isError));
}
