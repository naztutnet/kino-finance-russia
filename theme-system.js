(() => {
  const STORAGE_KEY = 'kino-finance-theme-v1';
  const MODES = new Set(['auto', 'light', 'dark']);
  const media = window.matchMedia('(prefers-color-scheme: dark)');

  function readMode() {
    try {
      const value = localStorage.getItem(STORAGE_KEY);
      return MODES.has(value) ? value : 'auto';
    } catch (_) {
      return 'auto';
    }
  }

  function effectiveTheme(mode) {
    return mode === 'auto' ? (media.matches ? 'dark' : 'light') : mode;
  }

  function applyMode(mode) {
    const normalized = MODES.has(mode) ? mode : 'auto';
    const theme = effectiveTheme(normalized);
    document.documentElement.dataset.themeMode = normalized;
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    document.querySelectorAll('[data-theme-select]').forEach(select => {
      select.value = normalized;
    });
  }

  function saveMode(mode) {
    try { localStorage.setItem(STORAGE_KEY, mode); } catch (_) {}
    applyMode(mode);
  }

  function createControl() {
    const label = document.createElement('label');
    label.className = 'theme-control';
    label.title = 'Цветовая тема';
    label.innerHTML = `
      <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 3v2.2M12 18.8V21M3 12h2.2M18.8 12H21M5.64 5.64l1.56 1.56M16.8 16.8l1.56 1.56M18.36 5.64L16.8 7.2M7.2 16.8l-1.56 1.56"></path><circle cx="12" cy="12" r="3.6"></circle></svg>
      <span class="theme-control-label">Тема</span>
      <select data-theme-select aria-label="Цветовая тема">
        <option value="auto">Авто</option>
        <option value="light">Светлая</option>
        <option value="dark">Тёмная</option>
      </select>`;
    label.querySelector('select').addEventListener('change', event => saveMode(event.target.value));
    return label;
  }

  function ensureControl() {
    const wrap = document.querySelector('header.site > .wrap');
    if (!wrap || wrap.querySelector('.theme-control')) return;
    const workspaceActions = wrap.querySelector('.workspace-head-actions');
    if (workspaceActions) {
      workspaceActions.append(createControl());
    } else {
      let slot = wrap.querySelector('.theme-control-slot');
      if (!slot) {
        slot = document.createElement('div');
        slot.className = 'theme-control-slot';
        wrap.append(slot);
      }
      slot.append(createControl());
    }
    applyMode(readMode());
  }

  applyMode(readMode());
  media.addEventListener?.('change', () => {
    if (readMode() === 'auto') applyMode('auto');
  });
  document.addEventListener('DOMContentLoaded', () => {
    ensureControl();
    const header = document.querySelector('header.site');
    if (header) new MutationObserver(ensureControl).observe(header, { childList: true, subtree: true });
    window.setTimeout(ensureControl, 250);
  });
})();
