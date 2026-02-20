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

  try {
    await addDoc(collection(db, 'video_events'), {
      userId: currentUserId || 'guest',
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

export function setStateMessage(element, message, isError = false) {
  if (!element) {
    return;
  }

  element.textContent = message;
  element.classList.toggle('error', Boolean(isError));
}
