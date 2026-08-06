(() => {
  const STORAGE_KEY = 'kino-finance-mvp-v1';

  function readFavoriteCount() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      return Object.values(parsed.records || {}).filter(record => record && record.favorite).length;
    } catch (_) {
      return 0;
    }
  }

  function syncFavoriteCount() {
    const count = readFavoriteCount();
    document.querySelectorAll('[data-favorites-count]').forEach(node => {
      node.textContent = String(count);
      node.hidden = count === 0;
    });
  }

  function openFavorites(event) {
    event?.preventDefault();
    const button = document.querySelector('[data-open-my]');
    if (button) button.click();
  }

  function setupNavigation() {
    document.querySelectorAll('header.site nav.tabs').forEach(nav => {
      if (nav.querySelector('[data-favorites-nav]')) return;
      const favorites = document.createElement('a');
      favorites.href = '#favorites';
      favorites.dataset.favoritesNav = 'true';
      favorites.className = 'mvp-favorites-tab';
      favorites.innerHTML = 'Избранное <span data-favorites-count hidden>0</span>';
      favorites.addEventListener('click', openFavorites);
      nav.appendChild(favorites);
    });
    syncFavoriteCount();
  }

  function reorderPrimaryActions() {
    const actions = document.querySelector('.panel .actions');
    const open = document.querySelector('.mvp-open-filter');
    const go = document.getElementById('go-btn');
    const reset = document.getElementById('reset-btn');
    if (!actions || !open || !go) return;
    if (open.nextElementSibling !== go) actions.insertBefore(open, go);
    if (reset && actions.lastElementChild !== reset) actions.appendChild(reset);
  }

  function loadPdfExporter() {
    if (document.querySelector('script[data-pdf-exporter]')) return;
    const script = document.createElement('script');
    script.src = 'pdf-export.js?v=202608061239';
    script.defer = true;
    script.dataset.pdfExporter = 'true';
    document.head.appendChild(script);
  }

  document.addEventListener('DOMContentLoaded', () => {
    setupNavigation();
    reorderPrimaryActions();
    loadPdfExporter();

    document.addEventListener('click', event => {
      if (event.target.closest('[data-mvp-favorite],[data-open-my],[data-favorites-nav]')) {
        setTimeout(syncFavoriteCount, 0);
      }
      if (event.target.closest('#go-btn')) setTimeout(reorderPrimaryActions, 0);
    });
    document.addEventListener('change', event => {
      if (event.target.matches('[data-mvp-status]')) setTimeout(syncFavoriteCount, 0);
    });
    window.addEventListener('storage', syncFavoriteCount);

    setTimeout(reorderPrimaryActions, 250);
    setTimeout(reorderPrimaryActions, 1000);
  });
})();