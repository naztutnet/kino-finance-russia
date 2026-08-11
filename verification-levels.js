(() => {
  const FILES = 10;
  const LABELS = {
    A: ['A · Проверено', 'Данные подтверждены первичным источником'],
    B: ['B · Частично проверено', 'Программа подтверждена, но отдельные параметры требуют проверки'],
    C: ['C · Требуется проверка', 'Конкретный механизм или часть заявленных параметров пока не подтверждены'],
    D: ['D · Ограничено / реструктурировано', 'Есть существенное ограничение, ошибка исходной трактовки или структурное изменение']
  };
  const ORG_LOGOS = [
    { test: /фонд кино/i, src: 'https://fond-kino.ru/favicon.ico', alt: 'Фонд кино' },
    { test: /(^|\s|\()ири(?:\s|$|\()/i, src: 'https://xn--h1aax.xn--p1ai/favicon.ico', alt: 'ИРИ' },
    { test: /пфки|президентск.*фонд.*культурн.*инициатив/i, src: 'https://xn--80aeeqaabljrdbg6a3ahhcl4ay9hsa.xn--p1ai/favicon.ico', alt: 'ПФКИ' },
    { test: /кинопрайм|kinoprime/i, src: 'https://www.kinoprimefoundation.com/favicon.ico', alt: 'Кинопрайм' }
  ];
  const MONTHS = {января:0,февраля:1,марта:2,апреля:3,мая:4,июня:5,июля:6,августа:7,сентября:8,октября:9,ноября:10,декабря:11};
  let byId = new Map();
  let byKey = new Map();

  const norm = v => String(v || '').replace(/\s+/g, ' ').trim().toLowerCase();
  const key = (org, program) => `${norm(org)}|${norm(program)}`;
  const esc = v => String(v || '').replace(/[&<>'\"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','\"':'&quot;'}[c]));
  const logoFor = value => ORG_LOGOS.find(entry => entry.test.test(String(value || ''))) || null;
  const logoMarkup = value => {
    const logo = logoFor(value);
    return logo ? `<span class="fund-logo" aria-hidden="true"><img src="${esc(logo.src)}" alt="" loading="lazy" onerror="this.parentNode.remove()"></span>` : '';
  };

  function injectStyles() {
    if (document.getElementById('verification-level-styles')) return;
    const style = document.createElement('style');
    style.id = 'verification-level-styles';
    style.textContent = `
      .verification-level-badge{display:flex;align-items:center;gap:8px;margin:0;padding:8px 12px;border:1px solid rgba(0,0,0,.10);border-radius:999px;font-size:11px;line-height:1.25;background:#f5f5f5;color:#222}
      .verification-level-badge strong{font-size:10px;letter-spacing:.04em;text-transform:uppercase;white-space:nowrap}
      .verification-level-badge span{color:#5a5a5a}
      .verification-level-badge[data-level="A"]{background:#edf6ee;border-color:#a8d9b1;color:#26783a}
      .verification-level-badge[data-level="B"]{background:#fff7df;border-color:#e5c978;color:#8b6512}
      .verification-level-badge[data-level="C"]{background:#fff0ed;border-color:#e9b4ab;color:#a53d30}
      .verification-level-badge[data-level="D"]{background:#ececec;border-color:#c9c9c4;color:#50504d}
      .card .cat-bar .verification-level-badge{width:max-content;max-width:100%;margin-top:9px;padding:5px 8px}
      .card .cat-bar .verification-level-badge span{display:none}

      .fund-logo{display:inline-grid;place-items:center;flex:0 0 auto;width:24px;height:24px;border:1px solid #e4e4df;border-radius:7px;background:#fff;overflow:hidden}
      .fund-logo img{display:block;max-width:18px;max-height:18px;width:auto;height:auto;object-fit:contain}
      .card .cat-bar .org.has-fund-logo{display:flex;align-items:center;gap:8px}
      .card .cat-bar .org.has-fund-logo .fund-logo{width:22px;height:22px;border-radius:6px}
      .card .cat-bar .org.has-fund-logo .fund-logo img{max-width:16px;max-height:16px}

      body.product-home .key-sources-section .ed-section-head::after,
      body:not(.product-home) .results-head:has(+ .quicknav)::after{content:none!important;display:none!important}
      .verification-legend{display:flex;flex:0 0 100%;flex-wrap:wrap;align-items:center;gap:7px;margin:7px 0 0;font-size:11.5px;line-height:1.25;font-weight:650;color:#222}
      .verification-legend-item{display:inline-flex;align-items:center;gap:5px;min-height:27px;padding:5px 9px;border:1px solid transparent;border-radius:999px;white-space:nowrap}
      .verification-legend-item strong{font-size:11px;font-weight:850}
      .verification-legend-item[data-level="A"]{background:#edf8ef;border-color:#a8d9b1;color:#26783a}
      .verification-legend-item[data-level="B"]{background:#fff3d7;border-color:#e5c978;color:#8b6512}
      .verification-legend-item[data-level="C"]{background:#fff0ed;border-color:#e9b4ab;color:#a53d30}
      .verification-legend-item[data-level="D"]{background:#eeeeec;border-color:#c9c9c4;color:#50504d}

      body:not(.product-home) .catalog-verification-guide{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;width:100%;margin:10px 0 0}
      body:not(.product-home) .catalog-verification-guide-item{min-width:0;padding:10px 11px;border:1px solid #e4e4df;border-radius:11px;background:#fafaf8;font-weight:400}
      body:not(.product-home) .catalog-verification-guide-item .verification-legend-item{display:inline-flex;margin:0 0 7px;font-size:10px;min-height:25px;padding:4px 8px;cursor:pointer}
      body:not(.product-home) .catalog-verification-guide-item p{margin:0;color:#666;font-size:9.5px;line-height:1.38;font-weight:400}

      body.product-home .home-personal .home-verification-guide{display:grid;grid-template-columns:1fr;gap:8px;width:100%;margin:0}
      body.product-home .home-personal .home-verification-guide-item{min-width:0;padding:11px 12px;border:1px solid #e4e4df;border-radius:12px;background:#fafaf8}
      body.product-home .home-personal .home-verification-guide-item .verification-legend-item{display:inline-flex;margin:0 0 7px;font-size:10px;min-height:25px;padding:4px 8px}
      body.product-home .home-personal .home-verification-guide-item p{margin:0;color:#666;font-size:9.5px;line-height:1.4}

      body.product-home .ed-section.key-sources-section{padding-top:25px!important}
      body.product-home .ed-section.key-sources-section .ed-section-head{margin-bottom:13px!important}
      body.product-home .ed-section.key-sources-section .ed-open-grid{grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:12px!important;margin-bottom:0!important}
      .key-source-card{position:relative;display:flex;flex-direction:column;min-height:184px;padding:16px;border:1px solid #deded9;border-radius:14px;background:#fff;color:#111;text-decoration:none;transition:transform .14s ease,border-color .14s ease}
      .key-source-card:hover{transform:translateY(-1px);border-color:#aaa}
      .key-source-badge{position:absolute;top:13px;right:13px;display:grid;place-items:center;width:28px;height:28px;padding:0;border:1px solid #a8d9b1;border-radius:50%;background:#edf8ef;color:#20833a;font-size:10px;font-weight:900;line-height:1;letter-spacing:0;text-transform:uppercase}
      .key-source-badge[data-level="B"]{background:#fff3d7;border-color:#e5c978;color:#8b6512}
      .key-source-badge[data-level="C"]{background:#fff0ed;border-color:#e9b4ab;color:#a53d30}
      .key-source-badge[data-level="D"]{background:#eeeeec;border-color:#c9c9c4;color:#50504d}
      .key-source-name{max-width:calc(100% - 42px);font-size:15px;font-weight:800;line-height:1.08;letter-spacing:-.025em}
      .key-source-name.has-fund-logo{display:flex;align-items:center;gap:8px;max-width:calc(100% - 42px)}
      .key-source-role{margin-top:6px;min-height:28px;color:#666;font-size:8px;line-height:1.35}
      .key-source-types{margin-top:17px;color:#333;font-size:9px;line-height:1.35}
      .key-source-fact{margin-top:auto;padding-top:13px;border-top:1px solid #e4e4df;font-size:11px;font-weight:750;line-height:1.25}
      .key-source-link{margin-top:8px;color:#666;font-size:7.5px;font-weight:700}

      .home-open-now{margin-top:18px;border:1px solid #deded9;border-radius:14px;background:#fff;overflow:hidden}
      .home-open-now-head{display:flex;align-items:center;justify-content:space-between;padding:13px 16px 11px}
      .home-open-now-head h3{margin:0;font-size:13px;letter-spacing:-.025em}
      .home-open-now-head a{font-size:8px;color:#666;text-decoration:none}
      .home-open-row{display:grid;grid-template-columns:72px 160px minmax(0,1fr) 28px 18px;gap:12px;align-items:center;min-height:38px;padding:0 16px;border-top:1px solid #ecece8;color:#111;text-decoration:none;font-size:8.5px}
      .home-open-row:hover{background:#fafaf8}
      .home-open-row .open-date{font-weight:800}
      .home-open-row strong{font-size:8.8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .home-open-row .open-program{color:#666;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .home-open-row .open-level{display:inline-grid;place-items:center;width:23px;height:18px;border-radius:999px;background:#edf6ee;color:#26783a;font-size:7px;font-weight:900}
      .home-open-row .open-level[data-level="B"]{background:#fff3d7;color:#8b6512}
      .home-open-row .open-arrow{text-align:right;font-size:13px}
      .home-open-empty{padding:16px;border-top:1px solid #ecece8;color:#666;font-size:9px}

      @media(max-width:820px){
        body:not(.product-home) .catalog-verification-guide{grid-template-columns:repeat(2,minmax(0,1fr))}
        body.product-home .ed-section.key-sources-section .ed-open-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}
        .home-open-row{grid-template-columns:70px 1fr 28px 18px}.home-open-row .open-program{display:none}
      }
      @media(max-width:640px){
        .verification-level-badge{align-items:flex-start;flex-direction:column;gap:3px}
        .card .cat-bar .verification-level-badge{align-items:center;flex-direction:row}
        .verification-legend{gap:5px;font-size:10.5px}
        .verification-legend-item{padding:5px 8px}
        body:not(.product-home) .catalog-verification-guide{grid-template-columns:1fr}
        body:not(.product-home) .catalog-verification-guide-item p{font-size:10px}
        body.product-home .home-personal .home-verification-guide-item{padding:10px 11px}
        body.product-home .home-personal .home-verification-guide-item p{font-size:10px}
        body.product-home .ed-section.key-sources-section .ed-open-grid{grid-template-columns:1fr!important}
        .key-source-card{min-height:160px}
        .fund-logo{width:22px;height:22px}
        .fund-logo img{max-width:16px;max-height:16px}
      }
    `;
    document.head.append(style);
  }

  function findItem(card) {
    const sourceId = card.dataset.sourceId;
    if (sourceId && byId.has(sourceId)) return byId.get(sourceId);
    const org = card.querySelector('.org')?.textContent || '';
    const program = card.querySelector('.prog')?.textContent || '';
    return byKey.get(key(org, program)) || null;
  }

  function addCatalogLogo(card, item) {
    const org = card.querySelector('.cat-bar .org');
    if (!org || org.querySelector('.fund-logo')) return;
    const logo = logoFor(item?.org || org.textContent);
    if (!logo) return;
    org.classList.add('has-fund-logo');
    org.insertAdjacentHTML('afterbegin', logoMarkup(item?.org || org.textContent));
  }

  function enhance(card) {
    if (!(card instanceof Element) || !card.matches('.card')) return;
    const item = findItem(card);
    if (!item) return;
    addCatalogLogo(card, item);
    if (card.querySelector('.verification-level-badge')) return;
    const level = item.verification_level || (item.verification_status === 'official' ? 'A' : 'C');
    const info = LABELS[level] || LABELS.C;
    const badge = document.createElement('div');
    badge.className = 'verification-level-badge';
    badge.dataset.level = level;
    badge.title = info[1];
    badge.innerHTML = `<strong>${info[0]}</strong><span>${info[1]}</span>`;
    const cat = card.querySelector('.cat-bar');
    if (cat) cat.append(badge); else card.prepend(badge);
  }

  function scan(root = document) {
    if (root instanceof Element && root.matches('.card')) enhance(root);
    root.querySelectorAll?.('.card').forEach(enhance);
  }

  function verificationLevel(item) {
    return item.verification_level || (item.verification_status === 'official' ? 'A' : 'C');
  }

  function renderVerificationLegend() {
    const catalogHead = document.querySelector('body:not(.product-home) .results-head');
    if (!catalogHead || catalogHead.querySelector('.verification-legend')) return;
    const guide = document.createElement('div');
    guide.className = 'verification-legend catalog-verification-guide';
    guide.setAttribute('aria-label', 'Уровни проверки данных');
    guide.innerHTML = [
      ['A','Проверено','Программа и ключевые данные подтверждены первичным официальным источником.'],
      ['B','Частично проверено','Программа подтверждена, но отдельные параметры ещё требуют проверки.'],
      ['C','Требует проверки','Часть заявленных условий пока не подтверждена первичным официальным источником.'],
      ['D','Ограничено / реструктурировано','Есть существенное ограничение, исправлена исходная трактовка или карточка реструктурирована.']
    ].map(([level,label,text]) => `<div class="catalog-verification-guide-item"><span class="verification-legend-item" data-level="${level}" title="${esc(LABELS[level][1])}"><strong>${level}</strong>${esc(label)}</span><p>${esc(text)}</p></div>`).join('');
    catalogHead.append(guide);
  }

  function renderHomeVerificationGuide(section) {
    section.querySelector('.home-verification-guide')?.remove();
    const aside = document.querySelector('body.product-home .home-personal');
    if (!aside) return;
    aside.querySelector('.home-verification-guide')?.remove();
    const guide = document.createElement('div');
    guide.className = 'home-verification-guide';
    guide.setAttribute('aria-label', 'Что означают статусы проверки данных');
    guide.innerHTML = [
      ['A','Проверено','Программа и ключевые данные подтверждены первичным официальным источником.'],
      ['B','Частично проверено','Программа подтверждена, но отдельные параметры ещё требуют проверки.'],
      ['C','Требует проверки','Часть заявленных условий пока не подтверждена первичным официальным источником.'],
      ['D','Ограничено / реструктурировано','Есть существенное ограничение, исправлена исходная трактовка или карточка реструктурирована.']
    ].map(([level,label,text]) => `<div class="home-verification-guide-item"><span class="verification-legend-item" data-level="${level}"><strong>${level}</strong>${esc(label)}</span><p>${esc(text)}</p></div>`).join('');
    aside.append(guide);
  }

  function applyCatalogQueryFromUrl() {
    if ((location.pathname.split('/').pop() || '') !== 'istochniki.html') return;
    const value = new URLSearchParams(location.search).get('query');
    const input = document.getElementById('f-query');
    if (!input || !value || input.dataset.queryApplied === value) return;
    input.value = value;
    input.dataset.queryApplied = value;
    input.dispatchEvent(new Event('input', {bubbles:true}));
  }

  function renderHomeVariant(items) {
    if ((location.pathname.split('/').pop() || 'index.html') !== 'index.html') return;
    const section = document.querySelector('.ed-section');
    const grid = document.getElementById('ed-open-grid');
    if (!section || !grid) return;

    section.classList.add('key-sources-section');
    const title = section.querySelector('.ed-section-head h2');
    const allLink = section.querySelector('.ed-section-head a');
    if (title) title.textContent = 'Ключевые источники';
    if (allLink) { allLink.textContent = 'Весь каталог →'; allLink.href = 'istochniki.html'; }
    section.querySelector('.ed-section-head .verification-legend')?.remove();

    const keySources = [
      {
        name:'Фонд кино',
        role:'Государственная поддержка производства',
        types:'Игровое · анимация · детское · Дальний Восток',
        fact:'Несколько профильных отборов в год',
        query:'Фонд кино'
      },
      {
        name:'ИРИ',
        role:'Финансирование цифрового и интернет-контента',
        types:'Детский · молодёжный · AI · национальный · региональный',
        fact:'До 60 млн ₽ по подтверждённым направлениям',
        query:'ИРИ'
      },
      {
        name:'ПФКИ',
        role:'Гранты культурным и креативным проектам',
        types:'Кино · анимация · фестивали · междисциплинарные проекты',
        fact:'Конкурсные циклы 2026–2027',
        query:'ПФКИ'
      },
      {
        name:'Кинопрайм',
        role:'Частное финансирование современного кино',
        types:'Игровое · документальное · производство',
        fact:'До 50% бюджета · до 100 млн ₽',
        query:'Кинопрайм'
      }
    ];

    grid.innerHTML = keySources.map(source => `
      <a class="key-source-card" href="istochniki.html?query=${encodeURIComponent(source.query)}">
        <span class="key-source-badge" data-level="A" title="A — Проверено" aria-label="Статус A — проверено">A</span>
        <div class="key-source-name${logoFor(source.name) ? ' has-fund-logo' : ''}">${logoMarkup(source.name)}<span>${esc(source.name)}</span></div>
        <div class="key-source-role">${esc(source.role)}</div>
        <div class="key-source-types">${esc(source.types)}</div>
        <div class="key-source-fact">${esc(source.fact)}</div>
        <div class="key-source-link">Смотреть программы →</div>
      </a>`).join('');

    section.querySelector('.home-open-now')?.remove();
    section.querySelector('.home-verification-guide')?.remove();
    renderHomeVerificationGuide(section);
  }

  async function load() {
    injectStyles();
    const parts = await Promise.all(Array.from({length: FILES}, async (_, i) => {
      try {
        const r = await fetch(`./data-${String(i).padStart(2, '0')}.json`, {cache:'no-store'});
        return r.ok ? r.json() : {items:[]};
      } catch (_) { return {items:[]}; }
    }));
    const items = parts.flatMap(p => p.items || []);
    items.forEach(item => {
      byId.set(item.id, item);
      const k = key(item.org, item.program);
      if (!byKey.has(k)) byKey.set(k, item);
    });
    scan();
    renderHomeVariant(items);
    renderVerificationLegend();
    applyCatalogQueryFromUrl();
    setTimeout(() => { renderHomeVariant(items); renderVerificationLegend(); applyCatalogQueryFromUrl(); }, 350);
    setTimeout(() => { renderHomeVariant(items); renderVerificationLegend(); applyCatalogQueryFromUrl(); }, 1000);
    const observer = new MutationObserver(records => records.forEach(r => r.addedNodes.forEach(node => {
      if (node.nodeType === Node.ELEMENT_NODE) scan(node);
    })));
    observer.observe(document.body, {childList:true, subtree:true});
  }

  document.addEventListener('DOMContentLoaded', load);
})();
