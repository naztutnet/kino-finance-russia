(() => {
  const STORAGE_KEY = 'kino-finance-mvp-v1';
  const KINOPRIME_REQUIREMENTS_URL = 'https://www.kinoprimefoundation.com/#rec98743691';

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

  function removeDuplicateRequirements() {
    document.querySelectorAll('.card').forEach(card => {
      const detailed = card.querySelector('.application-requirements');
      if (!detailed) return;
      card.querySelectorAll('.row').forEach(row => {
        const label = (row.querySelector('.k')?.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
        const value = (row.querySelector('.v')?.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
        const duplicateLabel = label === 'требования к подаче';
        const duplicateContent = value.includes('открыть требования к подаче') &&
          (value.includes('документы:') || value.includes('как подавать:') || value.includes('параметры для фильтра:'));
        if ((duplicateLabel || duplicateContent) && !row.contains(detailed)) row.remove();
      });
    });
  }

  function fixKinoprimeRequirementsLink() {
    document.querySelectorAll('.card').forEach(card => {
      const org = `${card.querySelector('.org')?.textContent || ''} ${card.querySelector('.prog')?.textContent || ''}`;
      if (!/кинопрайм/i.test(org)) return;
      card.querySelectorAll('.application-requirements a').forEach(anchor => {
        const label = anchor.textContent.trim().toLowerCase();
        if (label.includes('форма') || label.includes('требования') || /kinoprimefoundation\.com/i.test(anchor.href)) {
          anchor.href = KINOPRIME_REQUIREMENTS_URL;
          anchor.target = '_blank';
          anchor.rel = 'noopener noreferrer';
        }
      });
    });
  }

  function installPdfDisabledStyle() {
    if (document.getElementById('pdf-disabled-style')) return;
    const style = document.createElement('style');
    style.id = 'pdf-disabled-style';
    style.textContent = `
      [data-export-pdf][aria-disabled="true"]{
        opacity:.5!important;
        cursor:not-allowed!important;
        filter:grayscale(1);
      }
      [data-export-pdf][aria-disabled="true"]:hover{
        opacity:.62!important;
      }
    `;
    document.head.appendChild(style);
  }

  function disablePdfExport() {
    installPdfDisabledStyle();
    document.querySelectorAll('[data-export-pdf]').forEach(button => {
      button.textContent = 'Экспорт в PDF';
      button.setAttribute('aria-disabled', 'true');
      button.setAttribute('aria-label', 'Экспорт в PDF — в разработке');
      button.setAttribute('title', 'В разработке');
      button.dataset.pdfDisabled = 'true';
      button.tabIndex = 0;
    });
    document.querySelectorAll('.mvp-export-note').forEach(note => {
      note.textContent = 'В разработке';
    });
  }

  function syncUi() {
    setupNavigation();
    reorderPrimaryActions();
    removeDuplicateRequirements();
    fixKinoprimeRequirementsLink();
    disablePdfExport();
  }

  function scheduleUiSync() {
    [0, 40, 150, 400, 900, 1800, 3500].forEach(delay => setTimeout(syncUi, delay));
  }

  document.addEventListener('DOMContentLoaded', () => {
    scheduleUiSync();

    document.addEventListener('click', event => {
      const pdfButton = event.target.closest('[data-export-pdf]');
      if (pdfButton) {
        event.preventDefault();
        event.stopImmediatePropagation();
        disablePdfExport();
        return;
      }
      if (event.target.closest('[data-mvp-favorite],[data-open-my],[data-favorites-nav]')) {
        setTimeout(syncFavoriteCount, 0);
      }
      if (event.target.closest('#go-btn,#reset-btn')) scheduleUiSync();
    }, true);

    document.addEventListener('keydown', event => {
      if ((event.key === 'Enter' || event.key === ' ') && event.target.closest('[data-export-pdf]')) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    }, true);

    document.addEventListener('change', event => {
      if (event.target.matches('[data-mvp-status]')) setTimeout(syncFavoriteCount, 0);
    });

    window.addEventListener('storage', syncFavoriteCount);
  });
})();
