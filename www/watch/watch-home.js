import {
  applyStoredThemePreference,
  fetchVideoSeries,
  requireWatchAuth,
  setStateMessage
} from './watch-shared.js';

function createSeriesCard(series) {
  const card = document.createElement('a');
  card.className = 'series-card';
  card.href = `/watch/series.html?seriesId=${encodeURIComponent(series.id)}`;

  const cover = document.createElement('img');
  cover.className = 'series-cover';
  cover.loading = 'lazy';
  cover.alt = `${series.title || 'Series'} cover`;
  cover.src = series.coverImageUrl || 'https://images.unsplash.com/photo-1519491050282-cf00c82424b4?auto=format&fit=crop&w=900&q=80';
  cover.onerror = () => {
    cover.src = 'https://images.unsplash.com/photo-1519491050282-cf00c82424b4?auto=format&fit=crop&w=900&q=80';
  };

  const body = document.createElement('div');
  body.className = 'series-card-body';

  const title = document.createElement('h3');
  title.className = 'series-title';
  title.textContent = series.title || 'Untitled Series';

  const desc = document.createElement('p');
  desc.className = 'series-desc';
  desc.textContent = series.description || 'No description available yet.';

  body.append(title, desc);
  card.append(cover, body);
  return card;
}

async function initWatchPage() {
  applyStoredThemePreference();

  const grid = document.getElementById('seriesGrid');
  const status = document.getElementById('watchState');

  if (!grid || !status) {
    return;
  }

  if (!(await requireWatchAuth(status))) {
    return;
  }

  setStateMessage(status, 'Loading series...');

  try {
    const seriesList = await fetchVideoSeries();

    if (!seriesList.length) {
      grid.innerHTML = '';
      setStateMessage(status, 'No series available yet. Ask your admin to publish one in the Watch module.');
      return;
    }

    grid.replaceChildren(...seriesList.map(createSeriesCard));
    setStateMessage(status, `Showing ${seriesList.length} series.`);
  } catch (error) {
    console.error('[Watch] Could not load series:', error);
    setStateMessage(status, 'Could not load series right now. Please try again shortly.', true);
  }
}

initWatchPage();
