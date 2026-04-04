import {
  applyStoredThemePreference,
  fetchSeriesById,
  fetchEpisodesBySeries,
  getQueryParam,
  requireWatchAuth,
  setStateMessage
} from './watch-shared.js';

function createEpisodeCard(episode) {
  const card = document.createElement('a');
  card.className = 'episode-card';
  card.href = `/watch/player.html?episodeId=${encodeURIComponent(episode.id)}`;

  const meta = document.createElement('div');
  meta.className = 'episode-meta';

  const week = document.createElement('p');
  week.className = 'episode-week';
  const weekLabel = Number.isFinite(Number(episode.weekNumber))
    ? `Week ${episode.weekNumber}`
    : 'Episode';
  week.textContent = weekLabel;

  const title = document.createElement('h3');
  title.className = 'episode-title';
  title.textContent = episode.title || 'Untitled Episode';

  const arrow = document.createElement('span');
  arrow.className = 'episode-arrow';
  arrow.textContent = '›';

  meta.append(week, title);
  card.append(meta, arrow);
  return card;
}

function renderSeriesHeader(series) {
  const cover = document.getElementById('seriesCover');
  const title = document.getElementById('seriesTitle');
  const description = document.getElementById('seriesDescription');

  if (cover) {
    cover.src = series.coverImageUrl || 'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?auto=format&fit=crop&w=1200&q=80';
    cover.alt = `${series.title || 'Series'} cover`;
    cover.onerror = () => {
      cover.src = 'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?auto=format&fit=crop&w=1200&q=80';
    };
  }

  if (title) {
    title.textContent = series.title || 'Series';
  }

  if (description) {
    description.textContent = series.description || 'No description available.';
  }
}

async function initSeriesPage() {
  applyStoredThemePreference();

  const seriesId = getQueryParam('seriesId');
  const status = document.getElementById('episodesState');
  const list = document.getElementById('episodeList');

  if (!status || !list) {
    return;
  }

  if (!(await requireWatchAuth(status))) {
    return;
  }

  if (!seriesId) {
    setStateMessage(status, 'Missing seriesId in URL. Open this page from Watch.', true);
    return;
  }

  setStateMessage(status, 'Loading series and episodes...');

  try {
    const [series, episodes] = await Promise.all([
      fetchSeriesById(seriesId),
      fetchEpisodesBySeries(seriesId)
    ]);

    if (!series) {
      setStateMessage(status, 'Series not found. It may have been removed or not published yet.', true);
      return;
    }

    renderSeriesHeader(series);

    if (!episodes.length) {
      list.innerHTML = '';
      setStateMessage(status, 'No episodes available yet for this series.');
      return;
    }

    list.replaceChildren(...episodes.map(createEpisodeCard));
    setStateMessage(status, `Showing ${episodes.length} episodes.`);
  } catch (error) {
    console.error('[Watch] Could not load series page:', error);
    setStateMessage(status, 'Could not load this series right now. Please try again.', true);
  }
}

initSeriesPage();
