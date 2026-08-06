(() => {
  const LIB_URL = 'https://cdn.jsdelivr.net/npm/html2pdf.js@0.14.0/dist/html2pdf.bundle.min.js';
  let libraryPromise = null;

  function loadLibrary() {
    if (window.html2pdf) return Promise.resolve(window.html2pdf);
    if (libraryPromise) return libraryPromise;
    libraryPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${LIB_URL}"]`);
      if (existing) {
        existing.addEventListener('load', () => resolve(window.html2pdf), { once: true });
        existing.addEventListener('error', () => reject(new Error('Не удалось загрузить библиотеку PDF')), { once: true });
        return;
      }
      const script = document.createElement('script');
      script.src = LIB_URL;
      script.async = true;
      script.crossOrigin = 'anonymous';
      script.addEventListener('load', () => window.html2pdf ? resolve(window.html2pdf) : reject(new Error('Библиотека PDF не инициализирована')), { once: true });
      script.addEventListener('error', () => reject(new Error('Не удалось загрузить библиотеку PDF')), { once: true });
      document.head.append(script);
    });
    return libraryPromise;
  }

  function escapeHtml(value = '') {
    return String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));
  }

  function currentFilters() {
    const value = id => document.getElementById(id)?.selectedOptions?.[0]?.textContent || document.getElementById(id)?.value || '';
    const categories = [...document.querySelectorAll('.cat-checks input:checked')]
      .map(input => input.closest('label')?.textContent?.trim())
      .filter(Boolean);
    const debut = document.getElementById('f-debut')?.checked ? 'Да' : 'Нет';
    const openOnly = document.querySelector('.mvp-open-filter input')?.checked ? 'Да' : 'Нет';
    return [
      ['Тип проекта', value('f-type')],
      ['Стадия', value('f-stage')],
      ['Регион', value('f-region')],
      ['Поиск', document.getElementById('f-query')?.value?.trim() || '—'],
      ['Дебютный проект', debut],
      ['Только открытый приём', openOnly],
      ['Категории', categories.join(', ') || '—']
    ];
  }

  function visibleResultCards() {
    const grid = document.getElementById('results-grid');
    if (!grid || grid.hidden) return [];
    return [...grid.querySelectorAll('.card')].filter(card => {
      const style = getComputedStyle(card);
      return style.display !== 'none' && style.visibility !== 'hidden';
    });
  }

  function removeDuplicateRequirementRows(root) {
    root.querySelectorAll('.row').forEach(row => {
      const label = (row.querySelector('.k')?.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
      const value = (row.querySelector('.v')?.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
      const duplicateLabel = label === 'требования к подаче';
      const duplicateContent = value.includes('открыть требования к подаче') &&
        (value.includes('документы:') || value.includes('как подавать:') || value.includes('параметры для фильтра:'));
      if (duplicateLabel || duplicateContent) row.remove();
    });
  }

  function cleanCard(card) {
    const clone = card.cloneNode(true);
    clone.removeAttribute('style');
    removeDuplicateRequirementRows(clone);
    clone.querySelectorAll('button, select, .mvp-card-actions, .mvp-actions-row').forEach(node => node.remove());
    clone.querySelectorAll('.mvp-card-tools').forEach(tools => {
      const verification = tools.querySelector('.mvp-verification');
      if (verification) {
        const wrapper = document.createElement('div');
        wrapper.className = 'pdf-verification';
        wrapper.append(verification.cloneNode(true));
        tools.replaceWith(wrapper);
      } else tools.remove();
    });
    clone.querySelectorAll('details.application-requirements').forEach(details => {
      details.open = true;
      details.setAttribute('open', '');
    });
    clone.querySelectorAll('a').forEach(anchor => {
      anchor.setAttribute('target', '_blank');
      anchor.setAttribute('rel', 'noopener noreferrer');
    });
    return clone;
  }

  function buildDocument(cards) {
    const container = document.createElement('section');
    container.className = 'pdf-export-document';
    container.setAttribute('aria-hidden', 'true');

    const filters = currentFilters();
    const generated = new Intl.DateTimeFormat('ru-RU', {
      day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
    }).format(new Date());

    container.innerHTML = `
      <header class="pdf-site-header">
        <div class="pdf-eyebrow">СПРАВОЧНИК ПРОДЮСЕРА · РОССИЯ · 2026</div>
        <h1>Помощник в поиске финансирования вашего проекта</h1>
        <p>Подбор источников финансирования по выбранным параметрам проекта.</p>
      </header>
      <section class="pdf-filter-box">
        <div class="pdf-section-title">Параметры подбора</div>
        <div class="pdf-filter-grid">
          ${filters.map(([label, value]) => `<div><strong>${escapeHtml(label)}</strong><span>${escapeHtml(value)}</span></div>`).join('')}
        </div>
      </section>
      <div class="pdf-results-heading">
        <h2>Результаты</h2>
        <span>${cards.length} ${cards.length === 1 ? 'источник' : 'источников'}</span>
      </div>
      <div class="pdf-results-list"></div>
      <footer class="pdf-footer">
        <strong>Важно:</strong> перед подачей заявки проверьте актуальную редакцию положения и официальный источник. Файл сформирован ${escapeHtml(generated)} на сайте kino-finance-russia.
      </footer>`;

    const list = container.querySelector('.pdf-results-list');
    cards.forEach(card => list.append(cleanCard(card)));
    document.body.append(container);
    return container;
  }

  function installStyles() {
    if (document.getElementById('pdf-export-style')) return;
    const style = document.createElement('style');
    style.id = 'pdf-export-style';
    style.textContent = `
      .pdf-export-document{position:fixed;left:-100000px;top:0;width:1120px;padding:0;background:#fff;color:#111;font-family:Arial,Helvetica,sans-serif;box-sizing:border-box;z-index:-1}
      .pdf-site-header{padding:34px 38px 28px;border-bottom:2px dashed #222;background:#fff}
      .pdf-site-header h1{max-width:900px;margin:8px 0 10px;font-size:39px;line-height:1.04;letter-spacing:-1.5px}
      .pdf-site-header p{max-width:850px;margin:0;font-size:17px;line-height:1.45;color:#333}
      .pdf-eyebrow{font-size:11px;font-weight:900;letter-spacing:1px}
      .pdf-filter-box{margin:24px 30px 0;padding:17px 18px;border:1px dashed #333;border-radius:8px;background:#f4f4f4;break-inside:avoid}
      .pdf-section-title{margin-bottom:11px;font-size:15px;font-weight:900}
      .pdf-filter-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px}
      .pdf-filter-grid>div{padding:10px 11px;border-radius:6px;background:#fff;border:1px solid #d0d0d0}
      .pdf-filter-grid strong{display:block;margin-bottom:4px;font-size:9px;letter-spacing:.4px;text-transform:uppercase}
      .pdf-filter-grid span{font-size:12px;line-height:1.35}
      .pdf-results-heading{display:flex;justify-content:space-between;align-items:end;margin:27px 30px 11px}
      .pdf-results-heading h2{margin:0;font-size:23px}
      .pdf-results-heading span{font-size:12px;font-weight:700;color:#555}
      .pdf-results-list{display:grid;gap:13px;margin:0 30px}
      .pdf-results-list .card{display:grid!important;grid-template-columns:300px minmax(0,1fr)!important;grid-template-areas:'head rows' 'chips rows' 'verification verification'!important;gap:0!important;width:100%!important;min-width:0!important;margin:0!important;padding:10px!important;border:1px dashed #777!important;border-radius:8px!important;background:#fff!important;box-sizing:border-box!important;break-inside:avoid!important;page-break-inside:avoid!important;box-shadow:none!important;overflow:visible!important}
      .pdf-results-list .card::after{display:none!important}
      .pdf-results-list .cat-bar{grid-area:head!important;min-height:72px!important;padding:12px 55px 12px 13px!important;border-left:5px solid var(--accent,#777)!important;background:#fff!important}
      .pdf-results-list .org{font-size:16px!important;font-weight:900!important;line-height:1.2!important}
      .pdf-results-list .prog{margin-top:5px!important;font-size:12px!important;line-height:1.35!important;color:#444!important}
      .pdf-results-list .seal{top:10px!important;right:8px!important}
      .pdf-results-list .reasons{grid-area:chips!important;padding:5px 0 0!important}
      .pdf-results-list .rows{grid-area:rows!important;display:block!important;overflow:visible!important;border-radius:7px!important;background:#f1f1f1!important}
      .pdf-results-list .row{display:grid!important;grid-template-columns:120px minmax(0,1fr)!important;gap:10px!important;padding:9px 11px!important;border-bottom:2px solid #fff!important;break-inside:avoid!important}
      .pdf-results-list .row:last-child{border-bottom:0!important}
      .pdf-results-list .row .k{font-size:9px!important;font-weight:900!important;line-height:1.25!important}
      .pdf-results-list .row .v{font-size:11px!important;line-height:1.38!important;overflow-wrap:anywhere!important}
      .pdf-results-list .row a{color:#111!important;text-decoration:underline!important}
      .pdf-results-list .application-requirements{margin-top:2px!important;border:1px solid #bbb!important;background:#fff!important}
      .pdf-results-list .application-requirements summary{padding:9px 10px!important;font-size:11px!important}
      .pdf-results-list .requirements-body{display:block!important}
      .pdf-verification{grid-area:verification;margin-top:8px;padding:9px 11px;border-radius:6px;background:#fafafa;border:1px dashed #aaa}
      .pdf-verification .mvp-verification{display:flex!important;gap:8px!important}
      .pdf-verification strong{font-size:10px!important}
      .pdf-verification small{display:block!important;margin-top:2px!important;font-size:9px!important;color:#555!important}
      .pdf-footer{margin:22px 30px 0;padding:15px 17px;border:1px dashed #777;border-radius:7px;font-size:10px;line-height:1.5;color:#444;break-inside:avoid}
      body.pdf-export-busy{cursor:progress}
      body.pdf-export-busy [data-export-pdf]{opacity:.7;cursor:progress}
    `;
    document.head.append(style);
  }

  async function exportPdf(button) {
    const cards = visibleResultCards();
    if (!cards.length) {
      alert('Сначала нажмите «Подобрать», чтобы сформировать результаты.');
      return;
    }

    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = 'Готовим PDF…';
    document.body.classList.add('pdf-export-busy');
    let exportNode = null;

    try {
      const html2pdf = await loadLibrary();
      exportNode = buildDocument(cards);
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

      const date = new Date().toISOString().slice(0, 10);
      const options = {
        margin: [8, 8, 8, 8],
        filename: `kino-finance-selection-${date}.pdf`,
        image: { type: 'jpeg', quality: 0.96 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff',
          logging: false,
          width: 1120,
          windowWidth: 1120,
          scrollX: 0,
          scrollY: 0
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape', compress: true },
        pagebreak: { mode: ['css', 'legacy'], avoid: ['.card', '.pdf-filter-box', '.pdf-footer'] },
        enableLinks: true
      };

      await html2pdf().set(options).from(exportNode).save();
    } catch (error) {
      console.error('PDF export failed', error);
      alert('Не удалось сформировать PDF. Проверьте подключение к интернету и попробуйте ещё раз.');
    } finally {
      exportNode?.remove();
      document.body.classList.remove('pdf-export-busy');
      button.disabled = false;
      button.textContent = 'Экспорт в PDF';
    }
  }

  function replacePdfButton() {
    const current = document.querySelector('[data-export-pdf]');
    if (!current || current.dataset.directPdf === '1') return Boolean(current);
    const replacement = current.cloneNode(true);
    replacement.dataset.directPdf = '1';
    replacement.textContent = 'Экспорт в PDF';
    current.replaceWith(replacement);
    replacement.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      exportPdf(replacement);
    });
    const note = replacement.closest('.mvp-exportbar')?.querySelector('.mvp-export-note');
    if (note) note.textContent = 'PDF скачивается напрямую';
    return true;
  }

  function init() {
    installStyles();
    const attempts = [0, 100, 300, 700, 1500, 3000, 5000];
    attempts.forEach(delay => setTimeout(replacePdfButton, delay));
    document.getElementById('go-btn')?.addEventListener('click', () => {
      [20, 100, 300].forEach(delay => setTimeout(replacePdfButton, delay));
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
