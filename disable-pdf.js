(() => {
  const CONTROLS = [
    { selector: '[data-export-pdf]', label: 'Экспорт в PDF', key: 'pdf' },
    { selector: '[data-export-csv]', label: 'Экспорт CSV', key: 'csv' },
    { selector: '[data-copy-link]', label: 'Скопировать ссылку на подбор', key: 'link' }
  ];

  function disableButton(button, config) {
    if (!button || button.dataset.disabledDevelopment === config.key) return;

    const replacement = button.cloneNode(true);
    replacement.dataset.disabledDevelopment = config.key;
    replacement.textContent = config.label;
    replacement.disabled = true;
    replacement.setAttribute('disabled', '');
    replacement.setAttribute('aria-disabled', 'true');
    replacement.setAttribute('title', 'В разработке');
    replacement.tabIndex = -1;
    replacement.style.opacity = '0.45';
    replacement.style.cursor = 'not-allowed';
    replacement.style.pointerEvents = 'none';

    const wrapper = document.createElement('span');
    wrapper.className = `development-disabled-wrapper development-disabled-${config.key}`;
    wrapper.title = 'В разработке';
    wrapper.setAttribute('aria-label', `${config.label} — в разработке`);
    wrapper.style.display = 'inline-flex';
    wrapper.style.cursor = 'not-allowed';

    button.replaceWith(wrapper);
    wrapper.appendChild(replacement);
  }

  function disableAll(root = document) {
    CONTROLS.forEach(config => {
      root.querySelectorAll?.(config.selector).forEach(button => disableButton(button, config));
    });

    document.querySelectorAll('.mvp-export-note').forEach(note => {
      note.textContent = 'Экспорт и ссылка — в разработке';
    });
  }

  function containsTarget(node) {
    if (node.nodeType !== Node.ELEMENT_NODE) return false;
    return CONTROLS.some(config => node.matches?.(config.selector) || node.querySelector?.(config.selector));
  }

  function install() {
    disableAll(document);

    const observer = new MutationObserver(records => {
      if (records.some(record => [...record.addedNodes].some(containsTarget))) disableAll(document);
    });

    observer.observe(document.body, { childList: true, subtree: true });
    [50, 150, 400, 900, 1800, 3500].forEach(delay => setTimeout(() => disableAll(document), delay));
  }

  document.addEventListener('DOMContentLoaded', install);
})();
