(() => {
  const DATA_FILES = 10;
  const STORAGE_KEY = 'kino-finance-mvp-v1';
  const PIPELINE = [
    ['', 'Без статуса'],
    ['planned', 'Планирую подаваться'],
    ['submitted', 'Заявка подана'],
    ['waiting', 'Жду результаты'],
    ['rejected', 'Не подходит']
  ];
  const MONTHS = {января:0,февраля:1,марта:2,апреля:3,мая:4,июня:5,июля:6,августа:7,сентября:8,октября:9,ноября:10,декабря:11};
  let items = [];
  const byId = new Map();
  const byKey = new Map();
  let state = loadState();
  let openFilter = null;
  let toastTimer = null;

  function loadState() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      return { records: parsed.records || {}, compare: Array.isArray(parsed.compare) ? parsed.compare.slice(0, 4) : [] };
    } catch (_) {
      return { records: {}, compare: [] };
    }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    updateGlobalCounts();
  }

  function normalize(value = '') {
    return String(value).replace(/\s+/g, ' ').trim().toLowerCase();
  }

  function escapeHtml(value = '') {
    return String(value).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  }

  function keyForItem(item) {
    return `${normalize(item.org)}|${normalize(item.program)}`;
  }

  function keyForCard(card) {
    return `${normalize(card.querySelector('.org')?.textContent)}|${normalize(card.querySelector('.prog')?.textContent)}`;
  }

  function itemForCard(card) {
    if (card.dataset.sourceId && byId.has(card.dataset.sourceId)) return byId.get(card.dataset.sourceId);
    const item = byKey.get(keyForCard(card));
    if (item) card.dataset.sourceId = item.id;
    return item || null;
  }

  function recordFor(id) {
    if (!state.records[id]) state.records[id] = { favorite: false, status: '', updatedAt: '' };
    return state.records[id];
  }

  function cleanRecord(id) {
    const record = state.records[id];
    if (!record) return;
    if (!record.favorite && !record.status) delete state.records[id];
  }

  function toast(message) {
    let node = document.querySelector('.mvp-toast');
    if (!node) {
      node = document.createElement('div');
      node.className = 'mvp-toast';
      document.body.append(node);
    }
    node.textContent = message;
    node.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => node.classList.remove('show'), 2400);
  }

  function urlFor(value) {
    const text = String(value || '').trim();
    if (!text || text === '—') return '';
    try {
      const candidate = /^https?:\/\//i.test(text) ? text : `https://${text}`;
      const url = new URL(candidate);
      return /^https?:$/.test(url.protocol) ? url.href : '';
    } catch (_) {
      return '';
    }
  }

  function parseDates(value) {
    const text = String(value || '').toLowerCase().replace(/ё/g, 'е');
    const explicitYears = [...text.matchAll(/\b(20\d{2})\b/g)].map(m => Number(m[1]));
    const fallbackYear = explicitYears.at(-1) || new Date().getFullYear();
    const names = Object.keys(MONTHS).join('|');
    const pattern = new RegExp(`(\\d{1,2})(?:\\s*[–—-]\\s*(\\d{1,2}))?\\s+(${names})(?:\\s+(20\\d{2}))?`, 'g');
    const out = [];
    for (const match of text.matchAll(pattern)) {
      const day = Number(match[2] || match[1]);
      const month = MONTHS[match[3]];
      const year = Number(match[4] || fallbackYear);
      const date = new Date(year, month, day, 23, 59, 59);
      if (date.getFullYear() === year && date.getMonth() === month && date.getDate() === day) out.push(date);
    }
    return out.sort((a, b) => a - b);
  }

  function dateWindow(item) {
    const dates = parseDates(item.deadline_text);
    return dates.length ? { start: dates[0], end: dates.at(-1) } : null;
  }

  function isOpenNow(item) {
    const text = normalize(`${item.status || ''} ${item.deadline_text || ''} ${item.results_summary || ''}`);
    if (/(приостанов|прием заверш|приём заверш|прием закрыт|приём закрыт|результаты опублик|не подтвержден|не объявлен|состоялся|дедлайн прош|завершен|завершён)/i.test(text)) return false;
    if (/непрерыв/i.test(text)) return true;
    const window = dateWindow(item);
    const now = new Date();
    if (window && now <= window.end) {
      if (window.start <= now) return true;
      if (/(прием открыт|приём открыт|до \d)/i.test(text)) return true;
    }
    return /(прием открыт|приём открыт|прием идет|приём идёт)/i.test(text);
  }

  function nextRelevantDate(item) {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const candidates = [
      ...parseDates(item.deadline_text).map(d => ({ date: d, kind: 'Дедлайн подачи' })),
      ...parseDates(item.defense_date).map(d => ({ date: d, kind: 'Защита / питчинг' })),
      ...parseDates(item.results_date).map(d => ({ date: d, kind: 'Публикация результатов' }))
    ].filter(x => x.date >= now).sort((a, b) => a.date - b.date);
    return candidates[0] || null;
  }

  function formatDate(date) {
    return new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
  }

  function verificationInfo(item) {
    const verified = item.verification_status === 'official' || Boolean(item.verified_at);
    const checked = item.verified_at ? formatDate(new Date(`${item.verified_at}T12:00:00`)) : 'дата проверки не указана';
    const source = urlFor(item.link);
    return { verified, checked, source };
  }

  function statusOptions(selected = '') {
    return PIPELINE.map(([value, label]) => `<option value="${value}"${value === selected ? ' selected' : ''}>${label}</option>`).join('');
  }

  function enhanceCard(card) {
    if (card.querySelector('.mvp-card-tools')) return;
    const item = itemForCard(card);
    if (!item) return;
    const record = recordFor(item.id);
    cleanRecord(item.id);
    const verification = verificationInfo(item);
    const reminder = nextRelevantDate(item);
    const tools = document.createElement('div');
    tools.className = 'mvp-card-tools';
    tools.innerHTML = `
      <div class="mvp-verification ${verification.verified ? 'verified' : ''}">
        <span class="mvp-verification-dot" aria-hidden="true"></span>
        <div><strong>${verification.verified ? 'Проверено по официальному источнику' : 'Требует уточнения'}</strong>
        <small>Последняя проверка: ${escapeHtml(verification.checked)}${verification.source ? ` · <a href="${escapeHtml(verification.source)}" target="_blank" rel="noopener noreferrer">источник</a>` : ' · официальный источник не указан'}</small></div>
      </div>
      <div class="mvp-card-actions">
        <button type="button" data-mvp-favorite class="${record.favorite ? 'active' : ''}">${record.favorite ? '★ В избранном' : '☆ В избранное'}</button>
        <select data-mvp-status aria-label="Статус моей подачи">${statusOptions(record.status)}</select>
        <button type="button" data-mvp-compare class="${state.compare.includes(item.id) ? 'active' : ''}">${state.compare.includes(item.id) ? '✓ В сравнении' : 'Сравнить'}</button>
        <button type="button" data-mvp-reminder ${reminder ? '' : 'disabled'} title="${reminder ? `${reminder.kind}: ${formatDate(reminder.date)}` : 'Нет подтверждённой будущей даты'}">Напоминание .ICS</button>
      </div>`;
    const cat = card.querySelector('.cat-bar');
    if (cat) cat.insertAdjacentElement('afterend', tools); else card.prepend(tools);

    tools.querySelector('[data-mvp-favorite]').addEventListener('click', event => {
      const rec = recordFor(item.id);
      rec.favorite = !rec.favorite;
      rec.updatedAt = new Date().toISOString();
      cleanRecord(item.id);
      saveState();
      event.currentTarget.classList.toggle('active', rec.favorite);
      event.currentTarget.textContent = rec.favorite ? '★ В избранном' : '☆ В избранное';
      renderFavorites();
    });

    tools.querySelector('[data-mvp-status]').addEventListener('change', event => {
      const rec = recordFor(item.id);
      rec.status = event.target.value;
      rec.updatedAt = new Date().toISOString();
      cleanRecord(item.id);
      saveState();
      renderMySubmissions();
    });

    tools.querySelector('[data-mvp-compare]').addEventListener('click', event => {
      const index = state.compare.indexOf(item.id);
      if (index >= 0) state.compare.splice(index, 1);
      else if (state.compare.length >= 4) return toast('Можно сравнить не более четырёх источников');
      else state.compare.push(item.id);
      saveState();
      event.currentTarget.classList.toggle('active', state.compare.includes(item.id));
      event.currentTarget.textContent = state.compare.includes(item.id) ? '✓ В сравнении' : 'Сравнить';
      renderCompare();
    });

    tools.querySelector('[data-mvp-reminder]').addEventListener('click', () => {
      if (!reminder) return;
      downloadIcs([item]);
    });
  }

  function enhanceCards(root = document) {
    const cards = root.matches?.('.card') ? [root] : [...(root.querySelectorAll?.('.card') || [])];
    cards.forEach(enhanceCard);
  }

  function favoriteIds() {
    return Object.entries(state.records).filter(([, r]) => r.favorite).map(([id]) => id).filter(id => byId.has(id));
  }

  function submissionIds() {
    return Object.entries(state.records).filter(([, r]) => r.status).map(([id]) => id).filter(id => byId.has(id));
  }

  function injectHeaderTools() {
    if (document.querySelector('.mvp-header-tools')) return;
    const nav = document.querySelector('header.site nav.tabs');
    if (!nav) return;
    const tools = document.createElement('div');
    tools.className = 'mvp-header-tools';
    tools.innerHTML = `<button type="button" class="mvp-button" data-open-favorites>Избранное <strong data-favorites-count>0</strong></button><button type="button" class="mvp-button" data-open-my>Мои подачи <strong data-my-count>0</strong></button><button type="button" class="mvp-button" data-open-compare-modal>Сравнение <strong data-compare-count>0</strong></button>`;
    nav.insertAdjacentElement('afterend', tools);
    tools.querySelector('[data-open-favorites]').addEventListener('click', () => openModal('mvp-favorites-modal'));
    tools.querySelector('[data-open-my]').addEventListener('click', () => openModal('mvp-my-modal'));
    tools.querySelector('[data-open-compare-modal]').addEventListener('click', () => openModal('mvp-compare-modal'));
  }

  function injectModals() {
    if (document.getElementById('mvp-my-modal')) return;
    document.body.insertAdjacentHTML('beforeend', `
      <div class="mvp-modal-backdrop" id="mvp-favorites-modal" role="dialog" aria-modal="true" aria-label="Избранное">
        <div class="mvp-modal"><div class="mvp-modal-head"><h2>Избранное</h2><button class="mvp-modal-close" data-close-modal aria-label="Закрыть">×</button></div>
        <div class="mvp-modal-actions"><button data-download-favorites>Скачать календарь избранного .ICS</button><button data-clear-favorites>Очистить избранное</button></div><div data-favorites-list></div></div>
      </div>
      <div class="mvp-modal-backdrop" id="mvp-my-modal" role="dialog" aria-modal="true" aria-label="Мои подачи">
        <div class="mvp-modal"><div class="mvp-modal-head"><h2>Мои подачи</h2><button class="mvp-modal-close" data-close-modal aria-label="Закрыть">×</button></div>
        <div class="mvp-modal-actions"><button data-download-tracked>Скачать календарь подач .ICS</button><button data-clear-tracked>Очистить мои подачи</button></div><div data-my-list></div></div>
      </div>
      <div class="mvp-modal-backdrop" id="mvp-compare-modal" role="dialog" aria-modal="true" aria-label="Сравнение источников">
        <div class="mvp-modal"><div class="mvp-modal-head"><h2>Сравнение источников</h2><button class="mvp-modal-close" data-close-modal aria-label="Закрыть">×</button></div><div data-compare-body></div></div>
      </div>`);
    document.querySelectorAll('[data-close-modal]').forEach(button => button.addEventListener('click', () => button.closest('.mvp-modal-backdrop').classList.remove('open')));
    document.querySelectorAll('.mvp-modal-backdrop').forEach(backdrop => backdrop.addEventListener('click', event => { if (event.target === backdrop) backdrop.classList.remove('open'); }));

    document.querySelector('[data-download-favorites]').addEventListener('click', () => downloadIcs(favoriteIds().map(id => byId.get(id))));
    document.querySelector('[data-clear-favorites]').addEventListener('click', () => {
      const ids = favoriteIds();
      if (!ids.length) return;
      ids.forEach(id => { state.records[id].favorite = false; cleanRecord(id); });
      saveState();
      document.querySelectorAll('[data-mvp-favorite]').forEach(button => { button.classList.remove('active'); button.textContent = '☆ В избранное'; });
      renderFavorites();
    });

    document.querySelector('[data-download-tracked]').addEventListener('click', () => downloadIcs(submissionIds().map(id => byId.get(id))));
    document.querySelector('[data-clear-tracked]').addEventListener('click', () => {
      const ids = submissionIds();
      if (!ids.length) return;
      ids.forEach(id => { state.records[id].status = ''; cleanRecord(id); });
      saveState();
      document.querySelectorAll('[data-mvp-status]').forEach(select => { select.value = ''; });
      renderMySubmissions();
    });
  }

  function openModal(id) {
    if (id === 'mvp-favorites-modal') renderFavorites();
    else if (id === 'mvp-my-modal') renderMySubmissions();
    else renderCompare();
    document.getElementById(id)?.classList.add('open');
  }

  function renderFavorites() {
    const root = document.querySelector('[data-favorites-list]');
    if (!root) return;
    const ids = favoriteIds();
    if (!ids.length) {
      root.innerHTML = '<div class="mvp-empty">Здесь появятся источники, отмеченные кнопкой «В избранное». Это закладки: статус подачи им назначать не обязательно.</div>';
      updateGlobalCounts();
      return;
    }
    root.innerHTML = `<div class="mvp-submission-list">${ids.map(id => {
      const item = byId.get(id);
      const next = nextRelevantDate(item);
      const source = urlFor(item.link);
      return `<div class="mvp-submission-row mvp-favorite-row" data-favorite-id="${id}"><div><strong>${escapeHtml(item.org)}</strong><small>${escapeHtml(item.program || item.title || '')}${next ? ` · ближайшая дата ${formatDate(next.date)}` : ' · точной будущей даты нет'}</small></div><div class="mvp-submission-actions">${source ? `<a class="mvp-rowlink" href="${escapeHtml(source)}" target="_blank" rel="noopener noreferrer">Источник</a>` : ''}<button data-favorite-ics ${next ? '' : 'disabled'}>.ICS</button><button data-favorite-remove>Убрать</button></div></div>`;
    }).join('')}</div>`;
    root.querySelectorAll('[data-favorite-id]').forEach(row => {
      const id = row.dataset.favoriteId;
      row.querySelector('[data-favorite-ics]').addEventListener('click', () => downloadIcs([byId.get(id)]));
      row.querySelector('[data-favorite-remove]').addEventListener('click', () => {
        const rec = recordFor(id);
        rec.favorite = false;
        cleanRecord(id);
        saveState();
        syncCardControls(id);
        renderFavorites();
      });
    });
    updateGlobalCounts();
  }

  function renderMySubmissions() {
    const root = document.querySelector('[data-my-list]');
    if (!root) return;
    const ids = submissionIds();
    if (!ids.length) {
      root.innerHTML = '<div class="mvp-empty">Здесь появятся источники, которым вы назначили статус подачи: «Планирую подаваться», «Заявка подана», «Жду результаты» или «Не подходит».</div>';
      updateGlobalCounts();
      return;
    }
    root.innerHTML = `<div class="mvp-submission-list">${ids.map(id => {
      const item = byId.get(id);
      const record = recordFor(id);
      const next = nextRelevantDate(item);
      return `<div class="mvp-submission-row" data-my-id="${id}"><div><strong>${escapeHtml(item.org)}</strong><small>${escapeHtml(item.program || item.title || '')}${next ? ` · ближайшая дата ${formatDate(next.date)}` : ' · точной будущей даты нет'}</small></div><select data-my-status>${statusOptions(record.status)}</select><div class="mvp-submission-actions"><button data-my-ics ${next ? '' : 'disabled'}>.ICS</button><button data-my-remove>Убрать</button></div></div>`;
    }).join('')}</div>`;
    root.querySelectorAll('[data-my-id]').forEach(row => {
      const id = row.dataset.myId;
      row.querySelector('[data-my-status]').addEventListener('change', event => { const rec = recordFor(id); rec.status = event.target.value; cleanRecord(id); saveState(); syncCardControls(id); renderMySubmissions(); });
      row.querySelector('[data-my-ics]').addEventListener('click', () => downloadIcs([byId.get(id)]));
      row.querySelector('[data-my-remove]').addEventListener('click', () => { const rec = recordFor(id); rec.status = ''; cleanRecord(id); saveState(); syncCardControls(id); renderMySubmissions(); });
    });
    updateGlobalCounts();
  }

  function syncCardControls(id) {
    const record = state.records[id] || { favorite: false, status: '' };
    document.querySelectorAll(`.card[data-source-id="${CSS.escape(id)}"]`).forEach(card => {
      const fav = card.querySelector('[data-mvp-favorite]');
      if (fav) { fav.classList.toggle('active', record.favorite); fav.textContent = record.favorite ? '★ В избранном' : '☆ В избранное'; }
      const select = card.querySelector('[data-mvp-status]');
      if (select) select.value = record.status || '';
    });
  }

  function boolText(value) {
    return value === true ? 'Да' : value === false ? 'Нет' : 'Не указано';
  }

  function renderCompare() {
    const root = document.querySelector('[data-compare-body]');
    if (!root) return;
    state.compare = state.compare.filter(id => byId.has(id)).slice(0, 4);
    saveState();
    const selected = state.compare.map(id => byId.get(id));
    if (!selected.length) {
      root.innerHTML = '<div class="mvp-empty">Нажмите «Сравнить» в карточках. Одновременно можно выбрать до четырёх источников.</div>';
      return;
    }
    const rows = [
      ['Организация', item => item.org],
      ['Программа', item => item.program || item.title],
      ['Для чего', item => item.what_for],
      ['Тип проекта', item => (item.types || []).join(', ')],
      ['Стадия', item => item.stage],
      ['Регион', item => item.region || 'Без ограничения'],
      ['Финансирование', item => item.max_amount_text || 'Нет данных'],
      ['Покрытие', item => item.coverage_pct || 'Нет данных'],
      ['Срок подачи', item => item.deadline_text || 'Нет данных'],
      ['Статус', item => item.status || 'Нет данных'],
      ['Софинансирование', item => boolText(item.needs_selffinance)],
      ['Питчинг / защита', item => boolText(item.needs_pitch)],
      ['Проверка', item => verificationInfo(item).verified ? `Проверено: ${verificationInfo(item).checked}` : 'Требует уточнения']
    ];
    root.innerHTML = `<div class="mvp-modal-actions">${selected.map(item => `<button data-remove-compare="${item.id}">Убрать: ${escapeHtml(item.org)}</button>`).join('')}</div><div class="mvp-compare-wrap"><table class="mvp-compare-table"><thead><tr><th>Параметр</th>${selected.map(item => `<th>${escapeHtml(item.org)}</th>`).join('')}</tr></thead><tbody>${rows.map(([label, getter]) => `<tr><td>${label}</td>${selected.map(item => `<td>${escapeHtml(getter(item) || 'Нет данных')}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
    root.querySelectorAll('[data-remove-compare]').forEach(button => button.addEventListener('click', () => {
      state.compare = state.compare.filter(id => id !== button.dataset.removeCompare);
      saveState();
      document.querySelectorAll(`.card[data-source-id="${CSS.escape(button.dataset.removeCompare)}"] [data-mvp-compare]`).forEach(btn => { btn.classList.remove('active'); btn.textContent = 'Сравнить'; });
      renderCompare();
    }));
  }

  function updateGlobalCounts() {
    document.querySelectorAll('[data-favorites-count]').forEach(node => { node.textContent = favoriteIds().length; });
    document.querySelectorAll('[data-my-count]').forEach(node => { node.textContent = submissionIds().length; });
    document.querySelectorAll('[data-compare-count]').forEach(node => { node.textContent = state.compare.length; });
  }

  function icsEscape(value) {
    return String(value || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
  }

  function icsDate(date) {
    return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
  }

  function downloadIcs(selectedItems) {
    const events = selectedItems.map(item => ({ item, next: nextRelevantDate(item) })).filter(x => x.next);
    if (!events.length) return toast('У выбранных программ нет подтверждённых будущих дат');
    const now = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
    const lines = ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Kino Finance Russia//MVP//RU','CALSCALE:GREGORIAN','METHOD:PUBLISH','X-WR-CALNAME:Мои подачи — финансирование кино'];
    events.forEach(({ item, next }) => {
      const end = new Date(next.date); end.setDate(end.getDate() + 1);
      const source = urlFor(item.apply_link) || urlFor(item.link);
      lines.push('BEGIN:VEVENT',`UID:${item.id}-${icsDate(next.date)}@kino-finance-russia`,`DTSTAMP:${now}`,`DTSTART;VALUE=DATE:${icsDate(next.date)}`,`DTEND;VALUE=DATE:${icsDate(end)}`,`SUMMARY:${icsEscape(next.kind + ': ' + item.org + ' — ' + (item.program || item.title || ''))}`,`DESCRIPTION:${icsEscape(item.deadline_text || item.status || '')}`);
      if (source) lines.push(`URL:${icsEscape(source)}`);
      lines.push('BEGIN:VALARM','TRIGGER:-P7D','ACTION:DISPLAY',`DESCRIPTION:${icsEscape('Через 7 дней: ' + item.org)}`,'END:VALARM','BEGIN:VALARM','TRIGGER:-P1D','ACTION:DISPLAY',`DESCRIPTION:${icsEscape('Завтра: ' + item.org)}`,'END:VALARM','END:VEVENT');
    });
    lines.push('END:VCALENDAR');
    downloadBlob(lines.join('\r\n') + '\r\n', events.length === 1 ? `napominanie-${events[0].item.id}.ics` : 'moi-podachi.ics', 'text/calendar;charset=utf-8');
  }

  function downloadBlob(content, filename, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url; anchor.download = filename; document.body.append(anchor); anchor.click(); anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function injectOpenFilter() {
    const actions = document.querySelector('.panel .actions');
    if (!actions || document.getElementById('mvp-open-now')) return;
    const label = document.createElement('label');
    label.className = 'mvp-open-filter';
    label.innerHTML = '<input type="checkbox" id="mvp-open-now"> Приём открыт сейчас';
    actions.prepend(label);
    openFilter = label.querySelector('input');

    if (typeof window.passes === 'function' && !window.__mvpPassesWrapped) {
      const originalPasses = window.passes;
      window.passes = function(item, filters) {
        return originalPasses(item, filters) && (!openFilter?.checked || isOpenNow(item));
      };
      window.__mvpPassesWrapped = true;
    }

    openFilter.addEventListener('change', () => {
      if (typeof window.hideResults === 'function' && document.getElementById('results-grid')) window.hideResults();
      if (document.getElementById('catalog-root') && typeof window.apply === 'function') {
        window.apply();
        applyCatalogOpenFilter();
      }
    });

    document.querySelectorAll('#f-query,.cat-checks input').forEach(control => control.addEventListener('input', () => setTimeout(applyCatalogOpenFilter, 0)));
  }

  function applyCatalogOpenFilter() {
    if (!document.getElementById('catalog-root')) return;
    const cards = [...document.querySelectorAll('#catalog-root .card')];
    cards.forEach(card => card.classList.remove('mvp-card-hidden-open'));
    if (openFilter?.checked) {
      cards.forEach(card => {
        const item = itemForCard(card);
        if (card.style.display !== 'none' && item && !isOpenNow(item)) card.classList.add('mvp-card-hidden-open');
      });
    }
    let visible = 0;
    cards.forEach(card => { if (card.style.display !== 'none' && !card.classList.contains('mvp-card-hidden-open')) visible++; });
    const count = document.getElementById('results-count');
    if (count) count.textContent = `Показано: ${visible} из ${items.length}`;
    document.querySelectorAll('[data-block]').forEach(grid => {
      const show = [...grid.querySelectorAll('.card')].some(card => card.style.display !== 'none' && !card.classList.contains('mvp-card-hidden-open'));
      grid.style.display = show ? '' : 'none';
      if (grid.previousElementSibling) grid.previousElementSibling.style.display = show ? '' : 'none';
      if (grid.previousElementSibling?.previousElementSibling) grid.previousElementSibling.previousElementSibling.style.display = show ? '' : 'none';
    });
  }

  function injectExportBar() {
    const head = document.getElementById('results-head');
    if (!head || document.querySelector('.mvp-exportbar')) return;
    const bar = document.createElement('div');
    bar.className = 'mvp-exportbar';
    bar.hidden = true;
    bar.innerHTML = '<button type="button" data-export-csv>Экспорт CSV</button><button type="button" data-export-pdf>Сохранить PDF</button><button type="button" data-copy-link>Скопировать ссылку на подбор</button><span class="mvp-export-note">PDF создаётся через системное окно печати браузера</span>';
    head.insertAdjacentElement('afterend', bar);
    bar.querySelector('[data-export-csv]').addEventListener('click', exportCsv);
    bar.querySelector('[data-export-pdf]').addEventListener('click', () => { document.body.classList.add('mvp-print-results'); window.print(); setTimeout(() => document.body.classList.remove('mvp-print-results'), 1000); });
    bar.querySelector('[data-copy-link]').addEventListener('click', copySelectionLink);
    document.getElementById('go-btn')?.addEventListener('click', () => setTimeout(syncExportBar, 20));
    document.getElementById('reset-btn')?.addEventListener('click', () => setTimeout(syncExportBar, 20));
  }

  function syncExportBar() {
    const bar = document.querySelector('.mvp-exportbar');
    const grid = document.getElementById('results-grid');
    if (bar && grid) bar.hidden = grid.hidden || !grid.querySelector('.card');
  }

  function visibleResultItems() {
    return [...document.querySelectorAll('#results-grid .card')].filter(card => card.style.display !== 'none').map(itemForCard).filter(Boolean);
  }

  function csvCell(value) {
    return `"${String(value || '').replace(/"/g, '""')}"`;
  }

  function exportCsv() {
    const selected = visibleResultItems();
    if (!selected.length) return toast('Сначала выполните подбор');
    const header = ['Организация','Программа','Для чего','Финансирование','Регион','Срок подачи','Статус','Официальный источник'];
    const lines = [header.map(csvCell).join(';'), ...selected.map(item => [item.org,item.program || item.title,item.what_for,item.max_amount_text,item.region,item.deadline_text,item.status,urlFor(item.link)].map(csvCell).join(';'))];
    downloadBlob('\uFEFF' + lines.join('\r\n'), 'podbor-finansirovaniya.csv', 'text/csv;charset=utf-8');
  }

  async function copySelectionLink() {
    const url = new URL(location.href);
    const values = {
      type: document.getElementById('f-type')?.value,
      stage: document.getElementById('f-stage')?.value,
      region: document.getElementById('f-region')?.value,
      query: document.getElementById('f-query')?.value,
      debut: document.getElementById('f-debut')?.checked ? '1' : '',
      open: openFilter?.checked ? '1' : '',
      cats: [...document.querySelectorAll('.cat-checks input:checked')].map(x => x.value).join(',')
    };
    Object.entries(values).forEach(([key, value]) => value ? url.searchParams.set(key, value) : url.searchParams.delete(key));
    try { await navigator.clipboard.writeText(url.href); toast('Ссылка на параметры подбора скопирована'); }
    catch (_) { prompt('Скопируйте ссылку', url.href); }
  }

  function applyUrlParameters() {
    const params = new URLSearchParams(location.search);
    if (![...params.keys()].length) return;
    const setValue = (id, key) => { const element = document.getElementById(id); const value = params.get(key); if (element && value !== null && [...element.options || []].some(o => o.value === value)) element.value = value; };
    setValue('f-type', 'type'); setValue('f-stage', 'stage'); setValue('f-region', 'region');
    const query = document.getElementById('f-query'); if (query && params.has('query')) query.value = params.get('query');
    const debut = document.getElementById('f-debut'); if (debut) debut.checked = params.get('debut') === '1';
    if (params.has('cats')) {
      const cats = new Set(params.get('cats').split(','));
      document.querySelectorAll('.cat-checks input').forEach(input => { input.checked = cats.has(input.value); });
    }
    if (openFilter) openFilter.checked = params.get('open') === '1';
    const panel = document.querySelector('.panel');
    if (panel && document.getElementById('go-btn')) {
      const note = document.createElement('div'); note.className = 'mvp-preloaded'; note.textContent = 'Параметры из ссылки загружены. Нажмите «Подобрать», чтобы увидеть результаты.'; panel.append(note);
    }
    if (document.getElementById('catalog-root') && typeof window.apply === 'function') { window.apply(); applyCatalogOpenFilter(); }
  }

  async function loadItems() {
    const responses = await Promise.all(Array.from({ length: DATA_FILES }, (_, i) => fetch(`./data-${String(i).padStart(2, '0')}.json`, { cache: 'no-store' }).catch(() => null)));
    const parts = await Promise.all(responses.map(response => response?.ok ? response.json() : { items: [] }));
    items = parts.flatMap(part => part.items || []);
    items.forEach(item => { byId.set(item.id, item); if (!byKey.has(keyForItem(item))) byKey.set(keyForItem(item), item); });
  }

  function watchCards() {
    const observer = new MutationObserver(records => {
      records.forEach(record => record.addedNodes.forEach(node => { if (node.nodeType === Node.ELEMENT_NODE) enhanceCards(node); }));
      syncExportBar();
      if (openFilter?.checked) applyCatalogOpenFilter();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  document.addEventListener('DOMContentLoaded', async () => {
    try {
      await loadItems();
      injectHeaderTools();
      injectModals();
      injectOpenFilter();
      injectExportBar();
      enhanceCards(document);
      applyUrlParameters();
      renderFavorites();
      renderMySubmissions();
      renderCompare();
      updateGlobalCounts();
      watchCards();
      document.querySelectorAll('#f-query,.cat-checks input').forEach(control => control.addEventListener('change', () => setTimeout(applyCatalogOpenFilter, 0)));
      window.addEventListener('afterprint', () => document.body.classList.remove('mvp-print-results'));
    } catch (error) {
      console.error('MVP enhancements failed', error);
    }
  });
})();
