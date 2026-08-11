(() => {
  const FILES = 10;
  const LABELS = {
    A: ['A · Проверено', 'Данные подтверждены первичным источником'],
    B: ['B · Частично проверено', 'Программа подтверждена, но отдельные параметры требуют проверки'],
    C: ['C · Требуется проверка', 'Конкретный механизм или часть заявленных параметров пока не подтверждены'],
    D: ['D · Ограничено / реструктурировано', 'Есть существенное ограничение, ошибка исходной трактовки или структурное изменение']
  };
  let byId = new Map();
  let byKey = new Map();

  const norm = v => String(v || '').replace(/\s+/g, ' ').trim().toLowerCase();
  const key = (org, program) => `${norm(org)}|${norm(program)}`;

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
      @media(max-width:640px){.verification-level-badge{align-items:flex-start;flex-direction:column;gap:3px}}
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
    const observer = new MutationObserver(records => records.forEach(r => r.addedNodes.forEach(node => {
      if (node.nodeType === Node.ELEMENT_NODE) scan(node);
    })));
    observer.observe(document.body, {childList:true, subtree:true});
  }

  document.addEventListener('DOMContentLoaded', load);
})();
