(() => {
  const LIB_URL = 'https://cdn.jsdelivr.net/npm/html2pdf.js@0.10.1/dist/html2pdf.bundle.min.js';
  let libPromise;

  function loadLib() {
    if (window.html2pdf) return Promise.resolve(window.html2pdf);
    if (libPromise) return libPromise;
    libPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = LIB_URL;
      script.async = true;
      script.onload = () => window.html2pdf ? resolve(window.html2pdf) : reject(new Error('html2pdf не загрузился'));
      script.onerror = () => reject(new Error('Не удалось загрузить html2pdf'));
      document.head.appendChild(script);
    });
    return libPromise;
  }

  function visibleCards() {
    const grid = document.getElementById('results-grid');
    if (!grid || grid.hidden) return [];
    return [...grid.querySelectorAll('.card')].filter(card => {
      const style = getComputedStyle(card);
      return style.display !== 'none' && style.visibility !== 'hidden';
    });
  }

  function cloneCard(card) {
    const clone = card.cloneNode(true);
    clone.querySelectorAll('button,select,.mvp-card-actions,.mvp-actions-row,.mvp-card-tools').forEach(node => node.remove());
    clone.querySelectorAll('.row').forEach(row => {
      const label = (row.querySelector('.k')?.textContent || '').trim().toLowerCase();
      const value = (row.querySelector('.v')?.textContent || '').toLowerCase();
      if (label === 'требования к подаче' || value.includes('открыть требования к подаче')) row.remove();
    });
    clone.querySelectorAll('details.application-requirements').forEach(details => {
      details.open = true;
      details.setAttribute('open', '');
    });
    clone.removeAttribute('style');
    return clone;
  }

  function buildExport(cards) {
    const root = document.createElement('section');
    root.className = 'pdf-fixed-root';
    root.style.cssText = `position:absolute;left:0;top:${document.documentElement.scrollHeight + 100}px;width:1100px;background:#fff;color:#111;padding:28px;font-family:Arial,Helvetica,sans-serif;box-sizing:border-box;z-index:1;`;

    const title = document.createElement('header');
    title.innerHTML = '<div style="font-size:11px;font-weight:800;letter-spacing:.08em">СПРАВОЧНИК ПРОДЮСЕРА · РОССИЯ · 2026</div><h1 style="margin:8px 0 6px;font-size:34px;line-height:1.05">Помощник в поиске финансирования вашего проекта</h1><p style="margin:0;color:#444">Результаты подбора источников финансирования</p>';
    root.appendChild(title);

    const meta = document.createElement('div');
    meta.style.cssText = 'margin:22px 0 14px;padding:14px;border:1px dashed #555;border-radius:8px;background:#f5f5f5;font-size:12px';
    meta.textContent = `Найдено источников: ${cards.length}. Сформировано: ${new Intl.DateTimeFormat('ru-RU',{dateStyle:'long',timeStyle:'short'}).format(new Date())}`;
    root.appendChild(meta);

    const list = document.createElement('div');
    list.style.cssText = 'display:grid;gap:14px';
    cards.forEach(card => list.appendChild(cloneCard(card)));
    root.appendChild(list);

    const footer = document.createElement('div');
    footer.style.cssText = 'margin-top:18px;padding:12px;border:1px dashed #777;border-radius:7px;font-size:10px;color:#555';
    footer.textContent = 'Перед подачей заявки проверьте актуальную редакцию положения и официальный источник.';
    root.appendChild(footer);

    document.body.appendChild(root);
    return root;
  }

  async function exportPdf(button) {
    const cards = visibleCards();
    if (!cards.length) {
      alert('Сначала нажмите «Подобрать», чтобы сформировать результаты.');
      return;
    }

    const previous = button.textContent;
    button.disabled = true;
    button.textContent = 'Готовим PDF…';
    let root;
    try {
      const html2pdf = await loadLib();
      root = buildExport(cards);
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const filename = `kino-finance-selection-${new Date().toISOString().slice(0,10)}.pdf`;
      await html2pdf().set({
        margin: [7,7,7,7],
        filename,
        image: { type: 'jpeg', quality: 0.97 },
        html2canvas: { scale: 1.6, useCORS: true, backgroundColor: '#ffffff', logging: false, scrollX: 0, scrollY: 0 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape', compress: true },
        pagebreak: { mode: ['css','legacy'], avoid: ['.card','.application-requirements'] },
        enableLinks: true
      }).from(root).save();
    } catch (error) {
      console.error(error);
      alert('Не удалось сформировать PDF. Обновите страницу и попробуйте ещё раз.');
    } finally {
      root?.remove();
      button.disabled = false;
      button.textContent = previous || 'Экспорт в PDF';
    }
  }

  function install() {
    const current = document.querySelector('[data-export-pdf]');
    if (!current || current.dataset.pdfFixed === '1') return;
    const replacement = current.cloneNode(true);
    replacement.dataset.pdfFixed = '1';
    replacement.textContent = 'Экспорт в PDF';
    current.replaceWith(replacement);
    replacement.addEventListener('click', event => {
      event.preventDefault();
      event.stopImmediatePropagation();
      exportPdf(replacement);
    });
    const note = replacement.closest('.mvp-exportbar')?.querySelector('.mvp-export-note');
    if (note) note.textContent = 'PDF скачивается напрямую';
  }

  document.addEventListener('DOMContentLoaded', () => {
    [0,100,300,700,1500,3000].forEach(delay => setTimeout(install, delay));
    document.getElementById('go-btn')?.addEventListener('click', () => [30,120,300].forEach(delay => setTimeout(install, delay)));
  });
})();
