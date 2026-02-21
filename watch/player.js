import {
  applyStoredThemePreference,
  fetchEpisodeById,
  fetchSeriesById,
  getQueryParam,
  getSessionId,
  logVideoEvent,
  submitWatchInboxMessage,
  setStateMessage
} from './watch-shared.js';

let player;
let progressTimer = null;
const sessionId = getSessionId();
const sentEvents = new Set();
const MESSAGE_TYPE_PLACEHOLDERS = {
  comment: 'Share what spoke to you from this episode.',
  prayer_request: 'Share your prayer request. Our team will pray with you.',
  chat_with_us: 'Tell us how we can walk with you right now.'
};

function stopProgressWatcher() {
  if (!progressTimer) {
    return;
  }

  clearInterval(progressTimer);
  progressTimer = null;
}

function loadYouTubeApi() {
  if (window.YT && window.YT.Player) {
    return Promise.resolve(window.YT);
  }

  if (window.__goMissionYouTubeApiPromise) {
    return window.__goMissionYouTubeApiPromise;
  }

  window.__goMissionYouTubeApiPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-yt-api="true"]');
    const priorCallback = window.onYouTubeIframeAPIReady;

    window.onYouTubeIframeAPIReady = () => {
      if (typeof priorCallback === 'function') {
        priorCallback();
      }

      resolve(window.YT);
    };

    if (existing) {
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.async = true;
    script.dataset.ytApi = 'true';
    script.onerror = () => reject(new Error('YouTube API failed to load.'));
    document.head.appendChild(script);
  });

  return window.__goMissionYouTubeApiPromise;
}

async function trackEvent(episodeId, eventType) {
  if (sentEvents.has(eventType)) {
    return;
  }

  sentEvents.add(eventType);
  const ok = await logVideoEvent({ episodeId, eventType, sessionId });
  if (!ok) {
    sentEvents.delete(eventType);
  }
}

function startProgressWatcher(episodeId) {
  if (progressTimer || !player) {
    return;
  }

  progressTimer = setInterval(() => {
    try {
      const current = Number(player.getCurrentTime());
      const duration = Number(player.getDuration());

      if (!sentEvents.has('watched_30s') && current >= 30) {
        trackEvent(episodeId, 'watched_30s');
      }

      if (!sentEvents.has('watched_90pct') && duration > 0 && current / duration >= 0.9) {
        trackEvent(episodeId, 'watched_90pct');
      }
    } catch (error) {
      console.warn('[Watch] Progress watcher failed:', error?.message || error);
    }
  }, 1000);
}

function initPlayer(episode) {
  const status = document.getElementById('playerState');

  loadYouTubeApi()
    .then((YT) => {
      player = new YT.Player('youtubePlayer', {
        videoId: episode.youtubeVideoId,
        playerVars: {
          autoplay: 0,
          controls: 1,
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
          iv_load_policy: 3
        },
        events: {
          onReady: () => {
            if (status) {
              setStateMessage(status, 'Ready to play. Press play on YouTube to begin.');
            }
          },
          onStateChange: (event) => {
            if (event.data === window.YT.PlayerState.PLAYING) {
              trackEvent(episode.id, 'onPlay');
              startProgressWatcher(episode.id);
              return;
            }

            if (event.data === window.YT.PlayerState.ENDED) {
              stopProgressWatcher();
              trackEvent(episode.id, 'onEnd');
              return;
            }

            if (
              event.data === window.YT.PlayerState.PAUSED ||
              event.data === window.YT.PlayerState.BUFFERING ||
              event.data === window.YT.PlayerState.CUED
            ) {
              stopProgressWatcher();
            }
          },
          onError: () => {
            setStateMessage(status, 'Could not load this YouTube video. Please try another episode.', true);
          }
        }
      });
    })
    .catch((error) => {
      console.error('[Watch] Failed to initialize YouTube API:', error);
      setStateMessage(status, 'YouTube player failed to load. Check your connection and retry.', true);
    });
}

function setEngageStatus(statusEl, text, { error = false, success = false } = {}) {
  if (!statusEl) {
    return;
  }

  statusEl.textContent = text || '';
  statusEl.classList.toggle('error', Boolean(error));
  statusEl.classList.toggle('success', Boolean(success));
}

function initEngageComposer(episode) {
  const messageInput = document.getElementById('engageMessageInput');
  const nameInput = document.getElementById('engageNameInput');
  const emailInput = document.getElementById('engageEmailInput');
  const sendBtn = document.getElementById('engageSendBtn');
  const statusEl = document.getElementById('engageStatusText');
  const typeButtons = Array.from(document.querySelectorAll('.engage-type-btn'));

  if (!messageInput || !nameInput || !emailInput || !sendBtn || !statusEl || typeButtons.length === 0) {
    return;
  }

  let activeType = 'comment';
  let sending = false;

  const applyActiveType = (nextType) => {
    if (!MESSAGE_TYPE_PLACEHOLDERS[nextType]) {
      return;
    }

    activeType = nextType;
    typeButtons.forEach((button) => {
      const isActive = button.dataset.messageType === nextType;
      button.classList.toggle('active', isActive);
      button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
    messageInput.placeholder = MESSAGE_TYPE_PLACEHOLDERS[nextType];
  };

  typeButtons.forEach((button) => {
    button.setAttribute('aria-pressed', button.classList.contains('active') ? 'true' : 'false');
    button.addEventListener('click', () => {
      applyActiveType(button.dataset.messageType);
    });
  });

  sendBtn.addEventListener('click', async () => {
    if (sending) {
      return;
    }

    const message = String(messageInput.value || '').trim();
    if (message.length < 2) {
      setEngageStatus(statusEl, 'Please write at least 2 characters.', { error: true });
      messageInput.focus();
      return;
    }

    sending = true;
    sendBtn.disabled = true;
    sendBtn.textContent = 'Sending...';
    setEngageStatus(statusEl, 'Sending your message...');

    const result = await submitWatchInboxMessage({
      episodeId: episode?.id || '',
      seriesId: episode?.seriesId || '',
      messageType: activeType,
      message,
      contactName: nameInput.value,
      contactEmail: emailInput.value,
      sessionId,
      pagePath: `${window.location.pathname}${window.location.search}`.slice(0, 400)
    });

    if (result.ok) {
      messageInput.value = '';
      setEngageStatus(statusEl, 'Message sent. Our team will follow up soon.', { success: true });
    } else {
      setEngageStatus(statusEl, result.error || 'Could not send message right now. Please try again.', { error: true });
    }

    sending = false;
    sendBtn.disabled = false;
    sendBtn.textContent = 'Send Message';
  });

  applyActiveType(activeType);
}

async function initPlayerPage() {
  applyStoredThemePreference();

  const episodeId = getQueryParam('episodeId');
  const status = document.getElementById('playerState');
  const title = document.getElementById('episodeTitle');
  const subtitle = document.getElementById('episodeSubtitle');
  const backLink = document.getElementById('backToSeriesLink');

  if (!status || !title || !subtitle || !backLink) {
    return;
  }

  if (!episodeId) {
    setStateMessage(status, 'Missing episodeId in URL. Open this page from a series.', true);
    return;
  }

  setStateMessage(status, 'Loading episode...');

  try {
    const episode = await fetchEpisodeById(episodeId);

    if (!episode) {
      setStateMessage(status, 'Episode not found. It may have been removed or unpublished.', true);
      return;
    }

    if (!episode.youtubeVideoId) {
      setStateMessage(status, 'This episode has no YouTube video configured yet.', true);
      return;
    }

    title.textContent = episode.title || 'Untitled Episode';

    if (episode.seriesId) {
      backLink.href = `/watch/series.html?seriesId=${encodeURIComponent(episode.seriesId)}`;
      const series = await fetchSeriesById(episode.seriesId);
      if (series?.title) {
        subtitle.textContent = `${series.title}${Number.isFinite(Number(episode.weekNumber)) ? ` · Week ${episode.weekNumber}` : ''}`;
      } else {
        subtitle.textContent = Number.isFinite(Number(episode.weekNumber))
          ? `Week ${episode.weekNumber}`
          : 'Watch Episode';
      }
    } else {
      subtitle.textContent = Number.isFinite(Number(episode.weekNumber))
        ? `Week ${episode.weekNumber}`
        : 'Watch Episode';
    }

    initEngageComposer(episode);
    initPlayer(episode);
  } catch (error) {
    console.error('[Watch] Could not load player page:', error);
    setStateMessage(status, 'Could not load this episode right now. Please try again.', true);
  }
}

window.addEventListener('beforeunload', stopProgressWatcher);
initPlayerPage();
