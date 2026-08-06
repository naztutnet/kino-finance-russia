(() => {
  const candidatePattern = /https?:\/\/[^\s<>"']+|www\.[^\s<>"']+|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-ZА-ЯЁ]{2,}|(?:[A-ZА-ЯЁ0-9-]+\.)+(?:[A-ZА-ЯЁ]{2,}|XN--[A-Z0-9-]{2,})(?:\/[^\s<>"']*)?/giu;
  const resultLookup = new Map();

  function normalize(value = '') {
    return String(value).replace(/\s+/g, ' ').trim().toLowerCase();
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
    const org = normalize(card.querySelector('.org')?.textContent);
    const program = normalize(card.querySelector('.prog')?.textContent);
    return `${org}|${program}`;
  }

  function addResultLinks(container = document) {
    const cards = container.matches?.('.card') ? [container] : [...container.querySelectorAll?.('.card') || []];
    cards.forEach(card => {
      if (card.querySelector('.result-link-row')) return;
      const url = resultLookup.get(cardKey(card));
      if (!url) return;
      const rows = card.querySelector('.rows');
      if (!rows) return;
      const row = document.createElement('div');
      row.className = 'row result-link-row';
      row.innerHTML = `<div class="k">Результаты</div><div class="v"><a href="${url}" target="_blank" rel="noopener noreferrer">Открыть опубликованные результаты</a></div>`;
      rows.append(row);
    });
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
    addResultLinks(container);
  }

  async function loadResultLinks() {
    try {
      const [linkResponse, ...dataResponses] = await Promise.all([
        fetch('./result-links.json', { cache: 'no-store' }),
        ...Array.from({ length: 10 }, (_, i) => fetch(`./data-${String(i).padStart(2, '0')}.json`, { cache: 'no-store' }))
      ]);
      const links = linkResponse.ok ? await linkResponse.json() : {};
      const parts = await Promise.all(dataResponses.map(response => response.ok ? response.json() : { items: [] }));
      parts.flatMap(part => part.items || []).forEach(item => {
        const url = links[item.id];
        if (!url) return;
        resultLookup.set(`${normalize(item.org)}|${normalize(item.program)}`, url);
      });
    } catch (error) {
      console.warn('Не удалось загрузить прямые ссылки на результаты', error);
    }
  }

  document.addEventListener('DOMContentLoaded', async () => {
    await loadResultLinks();
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
  });
})();
