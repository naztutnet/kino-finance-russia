(() => {
  const FILES = 10;
  const LABELS = {
    A: ['A · Проверено', 'Данные подтверждены первичным источником'],
    B: ['B · Частично проверено', 'Программа подтверждена, но отдельные параметры требуют проверки'],
    C: ['C · Требуется проверка', 'Конкретный механизм или часть заявленных параметров пока не подтверждены'],
    D: ['D · Ограничено / реструктурировано', 'Есть существенное ограничение, ошибка исходной трактовки или структурное изменение']
  };
  const MONTHS = {января:0,февраля:1,марта:2,апреля:3,мая:4,июня:5,июля:6,августа:7,сентября:8,октября:9,ноября:10,декабря:11};
  let byId = new Map();
  let byKey = new Map();

  const norm = v => String(v || '').replace(/\s+/g, ' ').trim().toLowerCase();
  const key = (org, program) => `${norm(org)}|${norm(program)}`;
  const esc = v => String(v || '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));

  function injectStyles() {
    if (document.getElementById('verification-level-styles')) return;
    const style = document.createElement('style');
    style.id = 'verification-level-styles';
    style.textContent = `
      .verification-level-badge{display:flex;align-items:center;gap:8px;margin:0;padding:8px 12px;border-top:1px solid rgba(0,0,0,.10);border-bottom:1px solid rgba(0,0,0,.10);font-size:11px;line-height:1.25;background:#f5f5f5;color:#222}
      .verification-level-badge strong{font-size:10px;letter-spacing:.04em;text-transform:uppercase;white-space:nowrap}
      .verification-level-badge span{color:#5a5a5a}
      .verification-level-badge[data-level="A"]{background:#edf6ee}
      .verification-level-badge[data-level="B"]{background:#fff7df}
      .verification-level-badge[data-level="C"]{background:#fff0ed}
      .verification-level-badge[data-level="D"]{background:#ececec}

      body.product-home .ed-section.key-sources-section{padding-top:25px!important}
      body.product-home .ed-section.key-sources-section .ed-section-head{margin-bottom:13px!important}
      body.product-home .ed-section.key-sources-section .ed-open-grid{grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:12px!important;margin-bottom:0!important}
      .key-source-card{position:relative;display:flex;flex-direction:column;min-height:184px;padding:16px;border:1px solid #deded9;border-radius:14px;background:#fff;color:#111;text-decoration:none;transition:transform .14s ease,border-color .14s ease}
      .key-source-card:hover{transform:translateY(-1px);border-color:#aaa}
      .key-source-badge{position:absolute;top:13px;right:13px;padding:3px 6px;border:1px solid #a8d9b1;border-radius:999px;background:#edf8ef;color:#20833a;font-size:6.5px;font-weight:850;letter-spacing:.03em;text-transform:uppercase}
      .key-source-name{max-width:70%;font-size:15px;font-weight:800;line-height:1.08;letter-spacing:-.025em}
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
        body.product-home .ed-section.key-sources-section .ed-open-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}
        .home-open-row{grid-template-columns:70px 1fr 28px 18px}.home-open-row .open-program{display:none}
      }
      @media(max-width:640px){
        .verification-level-badge{align-items:flex-start;flex-direction:column;gap:3px}
        body.product-home .ed-section.key-sources-section .ed-open-grid{grid-template-columns:1fr!important}
        .key-source-card{min-height:160px}
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

  function enhance(card) {
    if (!(card instanceof Element) || !card.matches('.card') || card.querySelector('.verification-level-badge')) return;
    const item = findItem(card);
    if (!item) return;
    const level = item.verification_level || (item.verification_status === 'official' ? 'A' : 'C');
    const info = LABELS[level] || LABELS.C;
    const badge = document.createElement('div');
    badge.className = 'verification-level-badge';
    badge.dataset.level = level;
    badge.innerHTML = `<strong>${info[0]}</strong><span>${info[1]}</span>`;
    const cat = card.querySelector('.cat-bar');
    if (cat) cat.insertAdjacentElement('afterend', badge); else card.prepend(badge);
  }

  function scan(root = document) {
    if (root instanceof Element && root.matches('.card')) enhance(root);
    root.querySelectorAll?.('.card').forEach(enhance);
  }

  function verificationLevel(item) {
    return item.verification_level || (item.verification_status === 'official' ? 'A' : 'C');
  }

  function deadlineDate(text) {
    const value = String(text || '').toLowerCase().replace(/ё/g,'е');
    const names = Object.keys(MONTHS).join('|');
    const re = new RegExp(`(\\d{1,2})(?:\\s*[–—-]\\s*(\\d{1,2}))?\\s+(${names})(?:\\s+(20\\d{2}))?`, 'g');
    const found = [...value.matchAll(re)];
    if (!found.length) return null;
    const m = found.at(-1);
    const year = Number(m[4] || new Date().getFullYear());
    const date = new Date(year, MONTHS[m[3]], Number(m[2] || m[1]), 23, 59, 59);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function isOpenNow(item) {
    const level = verificationLevel(item);
    if (level !== 'A' && level !== 'B') return false;
    const text = norm(`${item.status || ''} ${item.deadline_text || ''}`);
    if (/(заверш|закрыт|результат|не объявлен|не подтвержден|архив|состоялся|приостанов)/i.test(text)) return false;
    const date = deadlineDate(item.deadline_text);
    if (!date || date < new Date()) return false;
    return /(открыт|прием|приём|до \d|дедлайн)/i.test(text) || Boolean(date);
  }

  function shortDate(date) {
    return new Intl.DateTimeFormat('ru-RU', {day:'numeric', month:'short'}).format(date).replace('.', '');
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
        <span class="key-source-badge">A · проверено</span>
        <div class="key-source-name">${esc(source.name)}</div>
        <div class="key-source-role">${esc(source.role)}</div>
        <div class="key-source-types">${esc(source.types)}</div>
        <div class="key-source-fact">${esc(source.fact)}</div>
        <div class="key-source-link">Смотреть программы →</div>
      </a>`).join('');

    section.querySelector('.home-open-now')?.remove();
    const open = items
      .filter(isOpenNow)
      .map(item => ({item, date: deadlineDate(item.deadline_text)}))
      .filter(x => x.date)
      .sort((a,b) => a.date - b.date || verificationLevel(a.item).localeCompare(verificationLevel(b.item)))
      .slice(0,5);

    const block = document.createElement('div');
    block.className = 'home-open-now';
    block.innerHTML = `
      <div class="home-open-now-head"><h3>Открыто сейчас</h3><a href="calendar.html">Все дедлайны →</a></div>
      ${open.length ? open.map(({item,date}) => {
        const level = verificationLevel(item);
        const href = /^https?:\/\//i.test(item.link || '') ? item.link : `istochniki.html?query=${encodeURIComponent(item.org || item.title || '')}`;
        return `<a class="home-open-row" href="${esc(href)}" ${href.startsWith('http') ? 'target="_blank" rel="noopener"' : ''}>
          <span class="open-date">${esc(shortDate(date))}</span>
          <strong>${esc(item.org || item.title)}</strong>
          <span class="open-program">${esc(item.program || item.what_for || 'Приём заявок')}</span>
          <span class="open-level" data-level="${esc(level)}">${esc(level)}</span>
          <span class="open-arrow">→</span>
        </a>`;
      }).join('') : '<div class="home-open-empty">Сейчас нет подтверждённых открытых приёмов с фиксированным дедлайном.</div>'}`;
    grid.insertAdjacentElement('afterend', block);
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
    setTimeout(() => renderHomeVariant(items), 350);
    setTimeout(() => renderHomeVariant(items), 1000);
    const observer = new MutationObserver(records => records.forEach(r => r.addedNodes.forEach(node => {
      if (node.nodeType === Node.ELEMENT_NODE) scan(node);
    })));
    observer.observe(document.body, {childList:true, subtree:true});
  }

  document.addEventListener('DOMContentLoaded', load);
})();
