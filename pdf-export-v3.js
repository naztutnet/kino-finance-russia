(() => {
  const HTML2CANVAS_URL = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
  const JSPDF_URL = 'https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js';
  let librariesPromise = null;

  function loadScript(src, test) {
    if (test()) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const existing = [...document.scripts].find(script => script.src === src);
      if (existing) {
        existing.addEventListener('load', resolve, { once: true });
        existing.addEventListener('error', reject, { once: true });
        return;
      }
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.crossOrigin = 'anonymous';
      script.addEventListener('load', resolve, { once: true });
      script.addEventListener('error', () => reject(new Error(`Не удалось загрузить ${src}`)), { once: true });
      document.head.appendChild(script);
    });
  }

  function loadLibraries() {
    if (librariesPromise) return librariesPromise;
    librariesPromise = Promise.all([
      loadScript(HTML2CANVAS_URL, () => Boolean(window.html2canvas)),
      loadScript(JSPDF_URL, () => Boolean(window.jspdf?.jsPDF))
    ]);
    return librariesPromise;
  }

  function visibleCards() {
    const grid = document.getElementById('results-grid');
    if (!grid || grid.hidden) return [];
    return [...grid.querySelectorAll('.card')].filter(card => {
      const style = getComputedStyle(card);
      return style.display !== 'none' && style.visibility !== 'hidden';
    });
  }

  function cleanClone(card) {
    const clone = card.cloneNode(true);
    clone.querySelectorAll('button,select,.mvp-card-actions,.mvp-actions-row,.mvp-card-tools').forEach(node => node.remove());
    clone.querySelectorAll('.row').forEach(row => {
      const label = (row.querySelector('.k')?.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
      const value = (row.querySelector('.v')?.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
      if (label === 'требования к подаче' || value.includes('открыть требования к подаче')) row.remove();
    });
    clone.querySelectorAll('details.application-requirements').forEach(details => {
      details.open = true;
      details.setAttribute('open', '');
    });
    clone.querySelectorAll('a').forEach(anchor => {
      anchor.style.color = '#0b57d0';
      anchor.style.textDecoration = 'underline';
    });
    clone.style.cssText += ';width:1120px!important;max-width:1120px!important;margin:0!important;box-sizing:border-box!important;background:#fff!important;';
    return clone;
  }

  function makeStage() {
    const stage = document.createElement('div');
    stage.id = 'pdf-v3-stage';
    stage.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:#fff;overflow:auto;padding:24px;box-sizing:border-box;color:#111;font-family:Arial,Helvetica,sans-serif;';
    stage.innerHTML = '<div style="width:1120px;margin:0 auto"><div style="font-size:13px;font-weight:800;margin-bottom:12px">Формируется PDF…</div><div data-pdf-v3-card></div></div>';
    document.body.appendChild(stage);
    return stage;
  }

  function addTextHeader(pdf, total) {
    pdf.setTextColor(17,17,17);
    pdf.setFont('helvetica','bold');
    pdf.setFontSize(9);
    pdf.text('СПРАВОЧНИК ПРОДЮСЕРА · РОССИЯ · 2026', 12, 12);
    pdf.setFontSize(20);
    pdf.text('Помощник в поиске финансирования проекта', 12, 22);
    pdf.setFont('helvetica','normal');
    pdf.setFontSize(9);
    pdf.setTextColor(75,75,75);
    pdf.text(`Результаты подбора: ${total}`, 12, 29);
    pdf.setDrawColor(100,100,100);
    pdf.setLineDashPattern([2,2],0);
    pdf.line(12,33,285,33);
    pdf.setLineDashPattern([],0);
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
    let stage = null;

    try {
      await loadLibraries();
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true });
      const pageWidth = 297;
      const pageHeight = 210;
      const marginX = 12;
      const maxWidth = pageWidth - marginX * 2;
      const topAfterHeader = 38;
      let y = topAfterHeader;
      let pageHasContent = false;

      addTextHeader(pdf, cards.length);
      stage = makeStage();
      const slot = stage.querySelector('[data-pdf-v3-card]');

      for (let index = 0; index < cards.length; index += 1) {
        slot.replaceChildren(cleanClone(cards[index]));
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

        const canvas = await window.html2canvas(slot.firstElementChild, {
          scale: 1.35,
          useCORS: true,
          backgroundColor: '#ffffff',
          logging: false,
          scrollX: 0,
          scrollY: 0,
          windowWidth: 1200
        });

        if (!canvas.width || !canvas.height) throw new Error('Пустой снимок карточки');
        const image = canvas.toDataURL('image/jpeg', 0.94);
        let imageHeight = maxWidth * canvas.height / canvas.width;
        let imageWidth = maxWidth;

        const availableFullPage = pageHeight - topAfterHeader - 12;
        if (imageHeight > availableFullPage) {
          const factor = availableFullPage / imageHeight;
          imageHeight *= factor;
          imageWidth *= factor;
        }

        if (pageHasContent && y + imageHeight > pageHeight - 10) {
          pdf.addPage('a4','landscape');
          addTextHeader(pdf, cards.length);
          y = topAfterHeader;
          pageHasContent = false;
        }

        pdf.addImage(image, 'JPEG', marginX, y, imageWidth, imageHeight, undefined, 'FAST');
        y += imageHeight + 5;
        pageHasContent = true;
      }

      const date = new Date().toISOString().slice(0,10);
      pdf.save(`kino-finance-selection-${date}.pdf`);
    } catch (error) {
      console.error('PDF v3 export failed', error);
      alert('Не удалось сформировать PDF. Обновите страницу и попробуйте ещё раз.');
    } finally {
      stage?.remove();
      button.disabled = false;
      button.textContent = previous || 'Экспорт в PDF';
    }
  }

  function intercept(event) {
    const button = event.target.closest('[data-export-pdf]');
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    exportPdf(button);
  }

  document.addEventListener('click', intercept, true);
  document.addEventListener('DOMContentLoaded', () => {
    const sync = () => document.querySelectorAll('[data-export-pdf]').forEach(button => button.textContent = 'Экспорт в PDF');
    [0,100,300,700,1500,3000].forEach(delay => setTimeout(sync, delay));
  });
})();
