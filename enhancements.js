(() => {
  const candidatePattern = /https?:\/\/[^\s<>"']+|www\.[^\s<>"']+|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-ZА-ЯЁ]{2,}|(?:[A-ZА-ЯЁ0-9-]+\.)+(?:[A-ZА-ЯЁ]{2,}|XN--[A-Z0-9-]{2,})(?:\/[^\s<>"']*)?/giu;
  const resultLinks = {};
  const itemLookup = new Map();
  const allItems = [];

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

  document.addEventListener('DOMContentLoaded', async () => {
    try {
      await loadSupplementalData();
      syncMissingSources();
      process(document);
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
