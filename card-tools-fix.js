(() => {
  function transformCard(card) {
    if (!card || card.dataset.mvpLayoutFixed === '1') return;

    const rows = card.querySelector('.rows');
    const tools = card.querySelector('.mvp-card-tools');
    if (!rows || !tools) return;

    const verification = tools.querySelector('.mvp-verification');
    const actions = tools.querySelector('.mvp-card-actions');
    if (!verification || !actions) return;

    const verificationRow = document.createElement('div');
    verificationRow.className = 'row mvp-meta-row';
    verificationRow.innerHTML = '<div class="k">Проверка</div><div class="v mvp-meta-value"></div>';
    verificationRow.querySelector('.mvp-meta-value').appendChild(verification);

    const actionsRow = document.createElement('div');
    actionsRow.className = 'row mvp-actions-row';
    actionsRow.innerHTML = '<div class="k">Действия</div><div class="v mvp-actions-value"></div>';
    actionsRow.querySelector('.mvp-actions-value').appendChild(actions);

    rows.appendChild(verificationRow);
    rows.appendChild(actionsRow);
    tools.remove();
    card.dataset.mvpLayoutFixed = '1';
  }

  function transformAll(root = document) {
    if (root.matches?.('.card')) transformCard(root);
    root.querySelectorAll?.('.card').forEach(transformCard);
  }

  document.addEventListener('DOMContentLoaded', () => {
    transformAll(document);

    const observer = new MutationObserver(records => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) transformAll(node);
        }
      }
      transformAll(document);
    });

    observer.observe(document.body, { childList: true, subtree: true });
  });
})();
