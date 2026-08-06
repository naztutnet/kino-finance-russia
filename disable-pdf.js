(() => {
  function disableButton(button) {
    if (!button || button.dataset.pdfDisabledFinal === '1') return;

    const replacement = button.cloneNode(true);
    replacement.dataset.pdfDisabledFinal = '1';
    replacement.textContent = 'Экспорт в PDF';
    replacement.disabled = true;
    replacement.setAttribute('disabled', '');
    replacement.setAttribute('aria-disabled', 'true');
    replacement.tabIndex = -1;
    replacement.style.opacity = '0.45';
    replacement.style.cursor = 'not-allowed';
    replacement.style.pointerEvents = 'none';

    const wrapper = document.createElement('span');
    wrapper.className = 'pdf-disabled-wrapper';
    wrapper.title = 'В разработке';
    wrapper.setAttribute('aria-label', 'Экспорт в PDF — в разработке');
    wrapper.style.display = 'inline-flex';
    wrapper.style.cursor = 'not-allowed';

    button.replaceWith(wrapper);
    wrapper.appendChild(replacement);

    const note = wrapper.closest('.mvp-exportbar')?.querySelector('.mvp-export-note');
    if (note) note.textContent = 'В разработке';
  }

  function disableAll(root = document) {
    root.querySelectorAll?.('[data-export-pdf]').forEach(disableButton);
  }

  function install() {
    disableAll(document);

    const observer = new MutationObserver(records => {
      let needsScan = false;
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (node.nodeType !== Node.ELEMENT_NODE) continue;
          if (node.matches?.('[data-export-pdf]') || node.querySelector?.('[data-export-pdf]')) {
            needsScan = true;
            break;
          }
        }
        if (needsScan) break;
      }
      if (needsScan) disableAll(document);
    });

    observer.observe(document.body, { childList: true, subtree: true });
    [50, 150, 400, 900, 1800, 3500].forEach(delay => setTimeout(() => disableAll(document), delay));
  }

  document.addEventListener('DOMContentLoaded', install);
})();
