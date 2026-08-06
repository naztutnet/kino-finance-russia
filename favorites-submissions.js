(() => {
  const STORAGE_KEY = 'kino-finance-mvp-v1';
  const DATA_FILES = 10;
  let items = [];
  const byId = new Map();
  let syncing = false;

  function readState() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      return { records: parsed.records || {}, compare: Array.isArray(parsed.compare) ? parsed.compare : [] };
    } catch (_) {
      return { records: {}, compare: [] };
    }
  }

  function writeState(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY, newValue: JSON.stringify(state) }));
  }

  function escapeHtml(value = '') {
    return String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  }

  async function loadItems() {
    const responses = await Promise.all(Array.from({ length: DATA_FILES }, (_, i) =>
      fetch(`./data-${String(i).padStart(2, '0')}.json`, { cache: 'no-store' }).catch(() => null)
    ));
    const parts = await Promise.all(responses.map(response => response?.ok ? response.json() : { items: [] }));
    items = parts.flatMap(part => part.items || []);
    items.forEach(item => byId.set(item.id, item));
  }

  function installStyles() {
    if (document.getElementById('favorites-submissions-style')) return;
    const style = document.createElement('style');
    style.id = 'favorites-submissions-style';
    style.textContent = `
      .card,.panel,.mvp-modal,.mvp-submission-row,.mvp-verification,.application-requirements,.quicknav,.mvp-exportbar,.mvp-modal-actions,.requirements-row,.results-grid{border-style:solid!important}
      .card{border:1px solid #aaa!important}
      .mvp-submission-row{border:1px solid #c9c9c9!important;border-radius:8px!important}
      .mvp-modal,.panel,.application-requirements{border-color:#bdbdbd!important}
      .mvp-card-actions,.mvp-submission-actions,.mvp-modal-actions,.favorites-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
      .mvp-card-actions button,.mvp-card-actions select,
      .mvp-submission-actions button,.mvp-submission-row select,
      .mvp-modal-actions button,.favorites-actions button,.favorites-actions a{
        height:38px!important;min-height:38px!important;box-sizing:border-box!important;
        padding:0 12px!important;border-radius:6px!important;font-size:12px!important;
        line-height:36px!important;vertical-align:middle!important;
      }
      .mvp-card-actions button,.mvp-submission-actions button,.mvp-modal-actions button,.favorites-actions button,.favorites-actions a{
        display:inline-flex!important;align-items:center!important;justify-content:center!important;text-decoration:none!important;
      }
      .mvp-card-actions select,.mvp-submission-row select{line-height:normal!important;padding-right:34px!important}
      .favorites-list{display:grid;gap:10px}
      .favorites-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:16px;align-items:center;padding:14px;border:1px solid #c9c9c9;border-radius:8px;background:#fff}
      .favorites-row strong{display:block;font-size:14px}
      .favorites-row small{display:block;margin-top:4px;color:#666;font-size:11px}
      .favorites-empty{padding:24px;border:1px solid #ccc;border-radius:8px;color:#666}
      #mvp-favorites-modal .mvp-modal{max-width:980px}
      @media(max-width:760px){.favorites-row{grid-template-columns:1fr}.favorites-actions{justify-content:flex-start}.mvp-submission-row{grid-template-columns:1fr!important}}
    `;
    document.head.appendChild(style);
  }

  function forceSolidBorders(root = document) {
    root.querySelectorAll?.('*').forEach(node => {
      const style = getComputedStyle(node);
      const dashed = [style.borderTopStyle, style.borderRightStyle, style.borderBottomStyle, style.borderLeftStyle]
        .some(value => value === 'dashed' || value === 'dotted');
      if (dashed) node.style.borderStyle = 'solid';
    });
  }

  function ensureFavoritesModal() {
    if (document.getElementById('mvp-favorites-modal')) return;
    document.body.insertAdjacentHTML('beforeend', `
      <div class="mvp-modal-backdrop" id="mvp-favorites-modal" role="dialog" aria-modal="true" aria-label="Избранное">
        <div class="mvp-modal">
          <div class="mvp-modal-head"><h2>Избранное</h2><button class="mvp-modal-close" data-close-favorites aria-label="Закрыть">×</button></div>
          <div data-favorites-list></div>
        </div>
      </div>`);
    const modal = document.getElementById('mvp-favorites-modal');
    modal.querySelector('[data-close-favorites]').addEventListener('click', () => modal.classList.remove('open'));
    modal.addEventListener('click', event => { if (event.target === modal) modal.classList.remove('open'); });
  }

  function favoriteIds() {
    const state = readState();
    return Object.entries(state.records).filter(([, record]) => record?.favorite).map(([id]) => id).filter(id => byId.has(id));
  }

  function submissionIds() {
    const state = readState();
    return Object.entries(state.records).filter(([, record]) => Boolean(record?.status)).map(([id]) => id).filter(id => byId.has(id));
  }

  function renderFavorites() {
    ensureFavoritesModal();
    const root = document.querySelector('[data-favorites-list]');
    const ids = favoriteIds();
    if (!ids.length) {
      root.innerHTML = '<div class="favorites-empty">Здесь появятся программы, которые вы отметили кнопкой «В избранное».</div>';
      syncCounts();
      return;
    }
    root.innerHTML = `<div class="favorites-list">${ids.map(id => {
      const item = byId.get(id);
      const source = item?.link && /^https?:\/\//i.test(item.link) ? item.link : '';
      return `<div class="favorites-row" data-favorite-id="${escapeHtml(id)}"><div><strong>${escapeHtml(item?.org || '')}</strong><small>${escapeHtml(item?.program || item?.title || '')}</small></div><div class="favorites-actions">${source ? `<a href="${escapeHtml(source)}" target="_blank" rel="noopener noreferrer">Открыть источник</a>` : ''}<button type="button" data-remove-favorite>Убрать из избранного</button></div></div>`;
    }).join('')}</div>`;
    root.querySelectorAll('[data-favorite-id]').forEach(row => {
      row.querySelector('[data-remove-favorite]').addEventListener('click', () => {
        const state = readState();
        const id = row.dataset.favoriteId;
        if (state.records[id]) {
          state.records[id].favorite = false;
          if (!state.records[id].status) delete state.records[id];
          writeState(state);
        }
        document.querySelectorAll(`.card[data-source-id="${CSS.escape(id)}"] [data-mvp-favorite]`).forEach(button => {
          button.classList.remove('active');
          button.textContent = '☆ В избранное';
        });
        renderFavorites();
        refineSubmissions();
      });
    });
    syncCounts();
  }

  function openFavorites(event) {
    event?.preventDefault();
    event?.stopImmediatePropagation();
    renderFavorites();
    document.getElementById('mvp-favorites-modal')?.classList.add('open');
  }

  function wireFavoritesNav() {
    document.querySelectorAll('[data-favorites-nav]').forEach(anchor => {
      if (anchor.dataset.separateFavorites === '1') return;
      const replacement = anchor.cloneNode(true);
      replacement.dataset.separateFavorites = '1';
      anchor.replaceWith(replacement);
      replacement.addEventListener('click', openFavorites);
    });
  }

  function refineSubmissions() {
    if (syncing) return;
    syncing = true;
    try {
      const state = readState();
      const root = document.querySelector('[data-my-list]');
      if (root) {
        const rows = [...root.querySelectorAll('[data-my-id]')];
        rows.forEach(row => {
          const record = state.records[row.dataset.myId];
          if (!record?.status) row.remove();
          else row.querySelector('[data-my-favorite]')?.remove();
        });
        if (!root.querySelector('[data-my-id]')) {
          root.innerHTML = '<div class="mvp-empty">Здесь появятся программы, которым вы назначили статус подачи.</div>';
        }
      }

      const clear = document.querySelector('[data-clear-tracked]');
      if (clear && clear.dataset.statusOnly !== '1') {
        const replacement = clear.cloneNode(true);
        replacement.dataset.statusOnly = '1';
        replacement.textContent = 'Очистить мои подачи';
        clear.replaceWith(replacement);
        replacement.addEventListener('click', event => {
          event.preventDefault();
          const current = readState();
          Object.entries(current.records).forEach(([id, record]) => {
            if (!record?.status) return;
            record.status = '';
            if (!record.favorite) delete current.records[id];
          });
          writeState(current);
          document.querySelectorAll('[data-mvp-status]').forEach(select => { select.value = ''; });
          document.querySelector('[data-my-list]').innerHTML = '<div class="mvp-empty">Здесь появятся программы, которым вы назначили статус подачи.</div>';
          syncCounts();
        });
      }

      root?.querySelectorAll('[data-my-remove]').forEach(button => {
        if (button.dataset.statusOnly === '1') return;
        const replacement = button.cloneNode(true);
        replacement.dataset.statusOnly = '1';
        button.replaceWith(replacement);
        replacement.addEventListener('click', event => {
          event.preventDefault();
          event.stopImmediatePropagation();
          const row = replacement.closest('[data-my-id]');
          const id = row?.dataset.myId;
          const current = readState();
          if (id && current.records[id]) {
            current.records[id].status = '';
            if (!current.records[id].favorite) delete current.records[id];
            writeState(current);
            document.querySelectorAll(`.card[data-source-id="${CSS.escape(id)}"] [data-mvp-status]`).forEach(select => { select.value = ''; });
          }
          row?.remove();
          if (!root.querySelector('[data-my-id]')) root.innerHTML = '<div class="mvp-empty">Здесь появятся программы, которым вы назначили статус подачи.</div>';
          syncCounts();
        });
      });
      syncCounts();
    } finally {
      syncing = false;
    }
  }

  function syncCounts() {
    const favorites = favoriteIds().length;
    const submissions = submissionIds().length;
    document.querySelectorAll('[data-favorites-count]').forEach(node => {
      node.textContent = String(favorites);
      node.hidden = favorites === 0;
    });
    document.querySelectorAll('[data-my-count]').forEach(node => { node.textContent = String(submissions); });
  }

  function syncAll() {
    installStyles();
    ensureFavoritesModal();
    wireFavoritesNav();
    refineSubmissions();
    forceSolidBorders(document);
    syncCounts();
  }

  document.addEventListener('DOMContentLoaded', async () => {
    await loadItems();
    syncAll();
    [100, 300, 700, 1500, 3000].forEach(delay => setTimeout(syncAll, delay));

    document.addEventListener('click', event => {
      if (event.target.closest('[data-mvp-favorite],[data-my-status],[data-mvp-status],[data-open-my]')) {
        [0, 50, 150].forEach(delay => setTimeout(syncAll, delay));
      }
    }, true);
    document.addEventListener('change', event => {
      if (event.target.matches('[data-my-status],[data-mvp-status]')) [0, 50, 150].forEach(delay => setTimeout(syncAll, delay));
    }, true);
    window.addEventListener('storage', () => setTimeout(syncAll, 0));

    const observer = new MutationObserver(records => {
      if (records.some(record => record.addedNodes.length)) requestAnimationFrame(syncAll);
    });
    observer.observe(document.body, { childList: true, subtree: true });
  });
})();
