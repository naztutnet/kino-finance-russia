(() => {
  function fixCard(card) {
    const rows = card.querySelector('.rows');
    const tools = card.querySelector('.mvp-card-tools');
    if (!rows || !tools || tools.parentElement === rows) return;
    rows.appendChild(tools);
    tools.classList.add('mvp-card-tools-inline');
  }

  function fixAll(root = document) {
    const cards = root.matches?.('.card') ? [root] : [...(root.querySelectorAll?.('.card') || [])];
    cards.forEach(fixCard);
  }

  document.addEventListener('DOMContentLoaded', () => {
    fixAll(document);
    const observer = new MutationObserver(records => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) fixAll(node);
        }
      }
      fixAll(document);
    });
    observer.observe(document.body, { childList: true, subtree: true });
  });
})();
