(() => {
  const candidatePattern = /https?:\/\/[^\s<>"']+|www\.[^\s<>"']+|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-ZА-ЯЁ]{2,}|(?:[A-ZА-ЯЁ0-9-]+\.)+(?:[A-ZА-ЯЁ]{2,}|XN--[A-Z0-9-]{2,})(?:\/[^\s<>"']*)?/giu;
  const resultLinks = {};
  const itemLookup = new Map();
  const allItems = [];
  const STORAGE_KEY = 'kino-finance-mvp-v1';

  if (location.hash === '#my-submissions') location.replace('my-submissions.html');
  document.addEventListener('click', event => {
    const node = event.target.closest?.('[data-open-favorites],[data-open-favorites-shortcut],[data-target-favorites]');
    if (node) {
      event.preventDefault();
      event.stopImmediatePropagation();
      location.href = 'favorites.html';
      return;
    }
    const mine = event.target.closest?.('[data-open-my],[data-open-my-shortcut],#ed-my-nav');
    if (mine) {
      event.preventDefault();
      event.stopImmediatePropagation();
      location.href = 'my-submissions.html';
    }
  }, true);

  function ensureStyles() {
    for (const href of ['product.css?v=2026081106', 'product-home.css?v=2026081106', 'white-theme.css?v=2026081107', 'approved-home.css?v=2026081121', 'header-system.css?v=2026081102', 'heading-system.css?v=2026081123']) {
      if ([...document.styleSheets].some(s => s.href?.includes(href.split('?')[0]))) continue;
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      document.head.append(link);
    }
    const headingStyles = [...document.querySelectorAll('link[rel="stylesheet"]')].find(link => link.href.includes('heading-system.css'));
    if (headingStyles) document.head.append(headingStyles);
  }

  function normalize(value = '') {
    return String(value).replace(/\s+/g, ' ').trim().toLowerCase();
  }

  function escapeHtml(value = '') {
    return String(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
  }

  function hrefFor(value) {
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(value)) return `mailto:${value}`;
    if (/^https?:\/\//iu.test(value)) return value;
    return `https://${value}`;
  }

  function splitTrailingPunctuation(value) {
    const match = value.match(/^(.*?)([.,;:!?)}\]]*)$/u);
    return { core: match?.[1] || value, tail: match?.[2] || '' };
  }

  function linkifyTextNode(node) {
    const text = node.nodeValue || '';
    candidatePattern.lastIndex = 0;
    if (!candidatePattern.test(text)) return;
    candidatePattern.lastIndex = 0;
    const fragment = document.createDocumentFragment();
    let cursor = 0;
    for (const match of text.matchAll(candidatePattern)) {
      const start = match.index ?? 0;
      if (start > cursor) fragment.append(document.createTextNode(text.slice(cursor, start)));
      const { core, tail } = splitTrailingPunctuation(match[0]);
      const anchor = document.createElement('a');
      anchor.href = hrefFor(core);
      anchor.textContent = core;
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
      fragment.append(anchor);
      if (tail) fragment.append(document.createTextNode(tail));
      cursor = start + match[0].length;
    }
    if (cursor < text.length) fragment.append(document.createTextNode(text.slice(cursor)));
    node.replaceWith(fragment);
  }

  function upgradeHeader() {
    const header = document.querySelector('header.site');
    if (!header) return;
    const path = location.pathname.split('/').pop() || 'index.html';
    const active = path === 'istochniki.html' ? 'sources' : path === 'calendar.html' ? 'calendar' : path === 'my-submissions.html' ? 'submissions' : 'home';
    if (!header.querySelector('.ed-brand')) {
      header.innerHTML = `
        <div class="wrap">
          <a class="ed-brand" href="index.html" aria-label="Кино-Финансирование.РФ — главная">
            <strong>КИНО-<br>ФИНАНСИРОВАНИЕ.РФ</strong>
            <span>Справочник источников финансирования российского и международного кино</span>
          </a>
          <nav class="tabs" aria-label="Основная навигация">
            <a href="index.html" class="${active === 'home' ? 'active' : ''}"><span><b>01</b> / ПОДБОР</span><small>найти подходящее</small></a>
            <a href="istochniki.html" class="${active === 'sources' ? 'active' : ''}"><span><b>02</b> / ИСТОЧНИКИ</span><small>весь каталог</small></a>
            <a href="calendar.html" class="${active === 'calendar' ? 'active' : ''}"><span><b>03</b> / ДЕДЛАЙНЫ</span><small>календарь приёмов</small></a>
            <a href="my-submissions.html" class="${active === 'submissions' ? 'active' : ''}"><span><b>04</b> / МОИ ПОДАЧИ</span><small>мои проекты</small></a>
          </nav>
        </div>`;
    } else {
      const my = header.querySelector('#ed-my-nav, nav.tabs a[href*="my-submissions"]');
      if (my) my.href = 'my-submissions.html';
    }
  }

  function addGeneratedHero() {
    if (document.querySelector('.generated-page-hero')) return;
    const path = location.pathname.split('/').pop();
    let title = '', text = '', index = '';
    if (path === 'istochniki.html') {
      index = '02 / Источники';
      title = 'Каталог источников';
      text = 'Государственные и частные фонды, региональные программы, питчинги, гранты и международные возможности — в едином каталоге.';
    } else if (path === 'calendar.html') {
      index = '03 / Дедлайны';
      title = 'Календарь дедлайнов';
      text = 'Сроки подачи заявок, защиты и публикации результатов. Если точная дата не подтверждена организатором, она не подменяется предположением.';
    } else return;
    const hero = document.createElement('section');
    hero.className = 'generated-page-hero';
    hero.innerHTML = `<div><span class="hero-index">${index}</span><h1>${title}</h1></div><p>${text}</p>`;
    document.querySelector('header.site')?.insertAdjacentElement('afterend', hero);
  }

  function cardKey(card) {
    return `${normalize(card.querySelector('.org')?.textContent)}|${normalize(card.querySelector('.prog')?.textContent)}`;
  }

  function itemKey(item) {
    return `${normalize(item.org)}|${normalize(item.program)}`;
  }

  function addRows(card) {
    const item = itemLookup.get(cardKey(card));
    if (!item) return;
    const rows = card.querySelector('.rows');
    if (!rows) return;
    const resultUrl = resultLinks[item.id] || item.results_link || '';
    if (resultUrl && !card.querySelector('.result-link-row')) {
      const row = document.createElement('div');
      row.className = 'row result-link-row';
      row.innerHTML = `<div class="k">Результаты</div><div class="v"><a href="${escapeHtml(resultUrl)}" target="_blank" rel="noopener noreferrer">Открыть опубликованные результаты</a></div>`;
      rows.append(row);
    }
  }

  function process(container = document) {
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!parent || parent.closest('a,script,style')) return NodeFilter.FILTER_REJECT;
        if (!parent.closest('.row .v')) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(linkifyTextNode);
    const cards = container.matches?.('.card') ? [container] : [...(container.querySelectorAll?.('.card') || [])];
    cards.forEach(addRows);
  }

  async function loadSupplementalData() {
    const requests = [
      fetch('./result-links.json', { cache: 'no-store' }),
      ...Array.from({ length: 10 }, (_, i) => fetch(`./data-${String(i).padStart(2, '0')}.json`, { cache: 'no-store' }))
    ];
    const [linkResponse, ...dataResponses] = await Promise.all(requests);
    Object.assign(resultLinks, linkResponse.ok ? await linkResponse.json() : {});
    const parts = await Promise.all(dataResponses.map(response => response.ok ? response.json() : { items: [] }));
    parts.flatMap(part => part.items || []).forEach(item => {
      allItems.push(item);
      itemLookup.set(itemKey(item), item);
    });
  }

  function parseState() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      return { records: parsed.records || {}, compare: Array.isArray(parsed.compare) ? parsed.compare : [] };
    } catch (_) {
      return { records: {}, compare: [] };
    }
  }

  function dateCandidates(item) {
    const text = item.deadline_text || '';
    const monthMap = {января:0,февраля:1,марта:2,апреля:3,мая:4,июня:5,июля:6,августа:7,сентября:8,октября:9,ноября:10,декабря:11};
    const re = /(\d{1,2})\s+(января|февраля|марта|апреля|мая|июня|июля|августа|сентября|октября|ноября|декабря)(?:\s+(20\d{2}))?/giu;
    const now = new Date();
    return [...text.matchAll(re)].map(m => new Date(Number(m[3] || now.getFullYear()), monthMap[m[2].toLowerCase()], Number(m[1]), 23, 59, 59)).filter(d => d >= now).sort((a,b) => a-b);
  }

  function deadlineCandidates() {
    const now = new Date();
    const seen = new Set();
    return allItems.filter(item => {
      const level = item.verification_level || (item.verification_status === 'official' ? 'A' : 'C');
      const state = `${item.status || ''} ${item.deadline_text || ''}`.toLowerCase();
      return (level === 'A' || level === 'B') && !/(заверш|закрыт|результат|архив|состоялся|приостанов)/i.test(state);
    }).map(item => {
      const date = dateCandidates(item)[0];
      return date ? { item, date, days: Math.max(0, Math.ceil((date - now) / 86400000)) } : null;
    }).filter(Boolean).sort((a,b) => a.date - b.date).filter(entry => {
      const key = `${entry.item.id || itemKey(entry.item)}|${entry.date.toISOString().slice(0,10)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0,5);
  }

  function makeDeadlineSection() {
    const entries = deadlineCandidates();
    const section = document.createElement('section');
    section.className = 'home-deadlines';
    section.innerHTML = `
      <div class="home-deadlines-head"><h2>Ближайшие дедлайны</h2><a href="calendar.html">Смотреть календарь →</a></div>
      ${entries.length ? entries.map(entry => {
        const item = entry.item;
        const date = new Intl.DateTimeFormat('ru-RU',{day:'2-digit',month:'2-digit',year:'numeric'}).format(entry.date);
        const urgent = entry.days <= 7;
        const level = item.verification_level || (item.verification_status === 'official' ? 'A' : 'C');
        const href = /^https?:\/\//i.test(item.link || '') ? item.link : 'calendar.html';
        return `<a class="home-deadline-row" href="${escapeHtml(href)}" ${href.startsWith('http') ? 'target="_blank" rel="noopener"' : ''} style="text-decoration:none;color:inherit"><strong>${escapeHtml(date)}</strong><strong>${escapeHtml(item.org || item.title || 'Источник')}</strong><span class="muted">${escapeHtml(item.program || item.what_for || 'Приём заявок')}</span><span class="${urgent ? 'urgent' : 'muted'}">${urgent ? `Осталось ${entry.days} дн.` : `${entry.days} дней`}</span><span class="deadline-level" data-level="${escapeHtml(level)}" title="Уровень проверки ${escapeHtml(level)}">${escapeHtml(level)}</span><span class="arrow">→</span></a>`;
      }).join('') : '<div class="home-deadline-row"><span class="muted">Нет подтверждённых ближайших дат</span></div>'}`;
    return section;
  }

  function ensureHeaderActions() {
    const wrap = document.querySelector('body.product-home header.site > .wrap');
    if (!wrap || wrap.querySelector('.target-header-actions')) return;
    const actions = document.createElement('div');
    actions.className = 'target-header-actions';
    actions.innerHTML = `
      <button class="target-header-action" type="button" data-target-search aria-label="Поиск"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"></circle><path d="M16 16l4.5 4.5"></path></svg></button>
      <a class="target-header-action" href="favorites.html" data-target-favorites aria-label="Избранное"><svg viewBox="0 0 24 24"><path d="M6.5 3.5h11v17l-5.5-3.2-5.5 3.2z"></path></svg></a>
      <button class="target-header-action" type="button" data-target-menu aria-label="Меню"><svg viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"></path></svg></button>`;
    wrap.append(actions);
    actions.querySelector('[data-target-search]')?.addEventListener('click', () => {
      document.getElementById('f-query')?.focus();
      document.getElementById('filters')?.scrollIntoView({behavior:'smooth',block:'center'});
    });
    actions.querySelector('[data-target-menu]')?.addEventListener('click', () => document.querySelector('header.site nav.tabs')?.classList.toggle('target-menu-open'));
  }

  function buildHomeLayout() {
    const main = document.querySelector('main.ed-main');
    if (!main || document.body.classList.contains('product-home')) return;
    document.body.classList.add('product-home');
    const hero = main.querySelector('.ed-hero');
    const panel = main.querySelector('.panel');
    const openSection = main.querySelector('.ed-section');
    const resultsHead = main.querySelector('.results-head');
    const resultsGrid = main.querySelector('.results-grid');
    const utility = main.querySelector('.ed-utility');
    const footer = main.querySelector('footer.site');
    if (!hero || !panel || !openSection) return;

    const title = hero.querySelector('h1');
    if (title) title.innerHTML = 'Финансирование<br>кино в России';
    const intro = hero.querySelector('.ed-intro p');
    if (intro) intro.textContent = 'Актуальная база государственных, региональных и частных программ поддержки кинопроектов.';
    const panelTitle = panel.querySelector('h2');
    if (panelTitle) panelTitle.textContent = 'Подберите подходящие программы';

    const left = document.createElement('div');
    left.className = 'product-home-main';
    const deadlines = makeDeadlineSection();
    [hero,panel,openSection,deadlines,resultsHead,resultsGrid].forEach(node => node && left.append(node));

    const state = parseState();
    const records = Object.values(state.records || {});
    const favoriteCount = records.filter(r => r.favorite).length;
    const statusValues = Object.values(state.records || {}).map(r => r.status).filter(Boolean);
    const activeCount = statusValues.filter(v => v !== 'rejected').length;
    const submittedCount = statusValues.filter(v => v === 'submitted').length;
    const waitingCount = statusValues.filter(v => v === 'waiting').length;
    const aside = document.createElement('aside');
    aside.className = 'home-personal';
    aside.id = 'my-submissions';
    aside.innerHTML = `
      <div class="home-personal-label">Моё</div>
      <section class="personal-card">
        <h3>Мои подачи</h3>
        <div class="personal-stats"><div class="personal-stat"><b>${activeCount}</b><span>активных</span></div><div class="personal-stat"><b>${submittedCount}</b><span>подано</span></div><div class="personal-stat"><b>${waitingCount}</b><span>ждут результатов</span></div></div>
        <div class="personal-actions"><a class="personal-action" href="my-submissions.html">Открыть мои подачи <span>→</span></a></div>
      </section>
      <section class="personal-card">
        <h3>Избранное и сравнение</h3>
        <div class="personal-stats" style="grid-template-columns:1fr 1fr"><div class="personal-stat"><b>${favoriteCount}</b><span>в избранном</span></div><div class="personal-stat"><b>${state.compare.length}</b><span>в сравнении</span></div></div>
        <div class="personal-actions"><a class="personal-action" href="favorites.html">Избранное <span>→</span></a><a class="personal-action" href="#" data-open-compare-shortcut>Сравнение <span>→</span></a></div>
      </section>
      <section class="personal-card personal-update">Данные и статусы хранятся локально в вашем браузере.</section>`;

    main.insertBefore(left, footer || main.firstChild);
    main.insertBefore(aside, footer || null);
    utility?.remove();
    ensureHeaderActions();

    aside.querySelector('[data-open-compare-shortcut]')?.addEventListener('click', e => { e.preventDefault(); document.querySelector('[data-open-compare-modal]')?.click(); });
  }

  function syncMissingSources(attempt = 0) {
    try {
      if (!Array.isArray(ITEMS) || ITEMS.length === 0) {
        if (attempt < 40) setTimeout(() => syncMissingSources(attempt + 1), 100);
        return;
      }
      const existing = new Set(ITEMS.map(item => item.id));
      const missing = allItems.filter(item => !existing.has(item.id));
      if (!missing.length) return;
      ITEMS.push(...missing);
      if (typeof renderAll === 'function' && document.getElementById('catalog-root')) {
        const seen = new Map();
        ITEMS.forEach(item => { if (!seen.has(item.block)) seen.set(item.block, item.block_title); });
        if (typeof BLOCKS !== 'undefined') {
          BLOCKS = [...seen.entries()].map(([num, title]) => ({ num, title })).sort((a, b) => a.num - b.num);
        }
        renderAll();
        if (typeof apply === 'function') apply();
      }
    } catch (error) {
      if (attempt < 40) setTimeout(() => syncMissingSources(attempt + 1), 100);
    }
  }

  ensureStyles();
  document.addEventListener('DOMContentLoaded', async () => {
    try {
      upgradeHeader();
      addGeneratedHero();
      await loadSupplementalData();
      syncMissingSources();
      process(document);
      if ((location.pathname.split('/').pop() || 'index.html') === 'index.html') setTimeout(buildHomeLayout, 250);
      const observer = new MutationObserver(records => {
        for (const record of records) {
          for (const node of record.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE) process(node);
            else if (node.nodeType === Node.TEXT_NODE && node.parentElement?.closest('.row .v')) linkifyTextNode(node);
          }
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
    } catch (error) {
      console.warn('Не удалось загрузить дополнительные данные справочника', error);
    }
  });
})();
