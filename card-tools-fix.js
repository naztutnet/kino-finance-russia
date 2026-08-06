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
    const nativeButton = document.querySelector('[data-open-my]');
    if (nativeButton) {
      nativeButton.click();
      return;
    }
    const modal = document.getElementById('mvp-my-modal');
    if (modal) modal.classList.add('open');
  }

  function setupNavigation() {
    document.querySelectorAll('header.site nav.tabs').forEach(nav => {
      const links = [...nav.querySelectorAll('a')];
      const byFile = new Map();
      links.forEach(link => {
        const file = (link.getAttribute('href') || '').split('?')[0].split('/').pop();
        if (file) byFile.set(file, link);
      });

      ['index.html', 'istochniki.html', 'calendar.html'].forEach(file => {
        const link = byFile.get(file);
        if (link) nav.appendChild(link);
      });

      let favorites = nav.querySelector('[data-favorites-nav]');
      if (!favorites) {
        favorites = document.createElement('a');
        favorites.href = '#favorites';
        favorites.dataset.favoritesNav = 'true';
        favorites.className = 'mvp-favorites-tab';
        favorites.innerHTML = 'Избранное <span data-favorites-count hidden>0</span>';
        favorites.addEventListener('click', openFavorites);
        nav.appendChild(favorites);
      }
    });

    document.querySelectorAll('.mvp-header-tools [data-open-my]').forEach(button => {
      button.hidden = true;
      button.setAttribute('aria-hidden', 'true');
    });
    syncFavoriteCount();
  }

  function moveSearchToTop() {
    const type = document.getElementById('f-type');
    const query = document.getElementById('f-query');
    if (!type || !query) return;

    const topGrid = type.closest('.grid-filters');
    const searchField = query.closest('.field');
    const oldGrid = searchField?.closest('.grid-filters');
    if (!topGrid || !searchField || topGrid.contains(searchField)) return;

    topGrid.classList.add('grid-filters-4');
    topGrid.appendChild(searchField);
    if (oldGrid) oldGrid.classList.add('categories-only-grid');
  }

  function reorderPrimaryActions() {
    const go = document.getElementById('go-btn');
    const reset = document.getElementById('reset-btn');
    const open = document.querySelector('.mvp-open-filter');
    const actions = go?.closest('.actions');
    if (!go || !open || !actions) return;

    actions.insertBefore(open, go);
    if (reset) actions.appendChild(reset);
  }

  function transformCard(card) {
    if (!card || card.dataset.mvpLayoutFixed === '1') return;

    const rows = card.querySelector('.rows');
    const tools = card.querySelector('.mvp-card-tools');
    if (!rows || !tools) return;

    const verification = tools.querySelector('.mvp-verification');
    const actions = tools.querySelector('.mvp-card-actions');
    if (!verification || !actions) return;

    const verificationRow = document.createElement('div');
    verificationRow.className = 'row mvp-meta-row';
    verificationRow.innerHTML = '<div class="k">Проверка</div><div class="v mvp-meta-value"></div>';
    verificationRow.querySelector('.mvp-meta-value').appendChild(verification);

    const actionsRow = document.createElement('div');
    actionsRow.className = 'row mvp-actions-row';
    actionsRow.innerHTML = '<div class="k">Действия</div><div class="v mvp-actions-value"></div>';
    actionsRow.querySelector('.mvp-actions-value').appendChild(actions);

    rows.appendChild(verificationRow);
    rows.appendChild(actionsRow);
    tools.remove();
    card.dataset.mvpLayoutFixed = '1';
  }

  function refresh(root = document) {
    setupNavigation();
    moveSearchToTop();
    reorderPrimaryActions();
    if (root.matches?.('.card')) transformCard(root);
    root.querySelectorAll?.('.card').forEach(transformCard);
  }

  document.addEventListener('DOMContentLoaded', () => {
    refresh(document);

    const observer = new MutationObserver(records => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) refresh(node);
        }
      }
      refresh(document);
      syncFavoriteCount();
    });

    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    document.addEventListener('click', () => setTimeout(syncFavoriteCount, 0));
    document.addEventListener('change', () => setTimeout(syncFavoriteCount, 0));
    window.addEventListener('storage', syncFavoriteCount);
  });
})();
