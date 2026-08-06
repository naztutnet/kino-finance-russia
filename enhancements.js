(() => {
  const candidatePattern = /https?:\/\/[^\s<>"']+|www\.[^\s<>"']+|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-ZА-ЯЁ]{2,}|(?:[A-ZА-ЯЁ0-9-]+\.)+(?:[A-ZА-ЯЁ]{2,}|XN--[A-Z0-9-]{2,})(?:\/[^\s<>"']*)?/giu;

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
  }

  document.addEventListener('DOMContentLoaded', () => {
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
