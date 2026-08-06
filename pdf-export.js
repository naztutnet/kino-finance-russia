/*
 * Экспорт результатов подбора в PDF.
 *
 * Документ собирается программно через jsPDF: текст остаётся текстом —
 * его можно выделять и искать, а вес файла не зависит от числа карточек.
 * Скриншоты страницы намеренно не используются.
 */
(() => {
  const FONT = 'PTSans';
  const PAGE = { width: 210, height: 297, margin: 16 };
  const CONTENT_WIDTH = PAGE.width - PAGE.margin * 2;
  const COLORS = {
    ink: [17, 17, 17],
    muted: [95, 95, 95],
    hair: [205, 205, 205],
    panel: [244, 244, 244]
  };
  const CATEGORY_LABELS = {
    gov: 'Государственный',
    priv: 'Частный',
    reg: 'Региональный',
    pitch: 'Питчинг / фестиваль',
    grant: 'Грант / лаборатория',
    intl: 'Международный'
  };
  const TYPE_LABELS = {
    any: 'любой формат',
    feature: 'полнометражный игровой',
    series: 'сериал / видеоконтент',
    doc: 'документальный',
    animation: 'анимация',
    short: 'короткий метр'
  };
  const STAGE_LABELS = {
    any: 'не важно',
    project: 'в разработке / производстве',
    finished: 'фильм готов'
  };

  // Библиотека и шрифты весят под полмегабайта, поэтому подгружаются
  // только при первом нажатии на кнопку, а не на каждом открытии страницы.
  const ASSETS = ['vendor/jspdf.umd.min.js', 'vendor/pdf-font-ptsans.js'];
  let assetsPromise = null;

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`Не удалось загрузить ${src}`));
      document.head.append(script);
    });
  }

  function loadAssets() {
    if (window.jspdf?.jsPDF && window.KINO_PDF_FONT) return Promise.resolve();
    if (!assetsPromise) {
      assetsPromise = ASSETS.reduce(
        (chain, src) => chain.then(() => loadScript(src)),
        Promise.resolve()
      ).catch(error => {
        assetsPromise = null;
        throw error;
      });
    }
    return assetsPromise;
  }

  function text(value) {
    const cleaned = String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
    // В базе прочерк используется как заглушка «данных нет» — в отчёт он не нужен.
    return /^[—–-]$/.test(cleaned) ? '' : cleaned;
  }

  function registerFonts(doc) {
    const bundle = window.KINO_PDF_FONT;
    if (!bundle) throw new Error('Не загружен файл шрифта для PDF');
    bundle.files.forEach(file => {
      doc.addFileToVFS(file.name, file.data);
      doc.addFont(file.name, bundle.family, file.style);
    });
  }

  function today() {
    return new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date());
  }

  /* Читает выбранные параметры подбора, чтобы вынести их на титульный лист. */
  function selectionSummary() {
    const value = id => document.getElementById(id)?.value || '';
    const selectedText = id => {
      const select = document.getElementById(id);
      return select?.options?.[select.selectedIndex]?.textContent || '';
    };
    const parts = [];
    const type = value('f-type');
    if (type && type !== 'any') parts.push(['Тип проекта', TYPE_LABELS[type] || selectedText('f-type')]);
    const stage = value('f-stage');
    if (stage && stage !== 'any') parts.push(['Стадия', STAGE_LABELS[stage] || selectedText('f-stage')]);
    const region = value('f-region');
    if (region && region !== 'any') parts.push(['Регион съёмок', region]);
    const query = text(value('f-query'));
    if (query) parts.push(['Поиск по названию', query]);
    if (document.getElementById('f-debut')?.checked) parts.push(['Дебютный проект', 'да']);
    if (document.getElementById('mvp-open-now')?.checked) parts.push(['Приём', 'только открытый сейчас']);

    const boxes = [...document.querySelectorAll('.cat-checks input')];
    const checked = boxes.filter(box => box.checked);
    if (checked.length && checked.length !== boxes.length) {
      parts.push(['Категории', checked.map(box => CATEGORY_LABELS[box.value] || box.value).join(', ')]);
    }
    return parts;
  }

  function fieldsFor(item) {
    const financing = [item.max_amount_text, item.coverage_pct, item.returnable].map(text).filter(Boolean).join(' · ');
    const deadlines = [
      item.deadline_text && `приём: ${text(item.deadline_text)}`,
      item.defense_date && `защита: ${text(item.defense_date)}`,
      item.results_date && `результаты: ${text(item.results_date)}`
    ].filter(Boolean).join(' · ');
    const status = [item.results_summary, item.status].map(text).filter(Boolean).join(' · ');

    return [
      ['Для чего', text(item.what_for)],
      ['Финансирование', financing],
      ['Регион', text(item.region) || 'без привязки'],
      ['Сроки', deadlines],
      ['Статус', status],
      ['Контакты', text(item.contacts)],
      ['Источник', text(item.link)],
      ['Заметка', text(item.note)]
    ].filter(([, value]) => value);
  }

  function drawFooter(doc, pageNumber) {
    const y = PAGE.height - 10;
    doc.setDrawColor(...COLORS.hair);
    doc.setLineWidth(0.2);
    doc.line(PAGE.margin, y - 4.5, PAGE.width - PAGE.margin, y - 4.5);
    doc.setFont(FONT, 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...COLORS.muted);
    doc.text('Справочник продюсера · перед подачей сверяйтесь с официальным источником', PAGE.margin, y);
    doc.text(String(pageNumber), PAGE.width - PAGE.margin, y, { align: 'right' });
  }

  function drawCover(doc, count, summary) {
    let y = PAGE.margin + 6;

    doc.setFont(FONT, 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.muted);
    doc.text('СПРАВОЧНИК ПРОДЮСЕРА · РОССИЯ', PAGE.margin, y);

    y += 12;
    doc.setFontSize(26);
    doc.setTextColor(...COLORS.ink);
    const title = doc.splitTextToSize('Источники финансирования: результаты подбора', CONTENT_WIDTH);
    doc.text(title, PAGE.margin, y);
    y += title.length * 10.5 + 4;

    doc.setFont(FONT, 'normal');
    doc.setFontSize(10.5);
    doc.setTextColor(...COLORS.muted);
    doc.text(`Подбор от ${today()} · найдено источников: ${count}`, PAGE.margin, y);
    y += 12;

    if (summary.length) {
      const rowHeight = 7;
      const boxHeight = summary.length * rowHeight + 12;
      doc.setFillColor(...COLORS.panel);
      doc.roundedRect(PAGE.margin, y, CONTENT_WIDTH, boxHeight, 2, 2, 'F');

      let inner = y + 8;
      doc.setFont(FONT, 'bold');
      doc.setFontSize(8);
      doc.setTextColor(...COLORS.ink);
      doc.text('ПАРАМЕТРЫ ПОДБОРА', PAGE.margin + 6, inner);
      inner += 6.5;

      summary.forEach(([label, value]) => {
        doc.setFont(FONT, 'normal');
        doc.setFontSize(9);
        doc.setTextColor(...COLORS.muted);
        doc.text(`${label}:`, PAGE.margin + 6, inner);
        doc.setFont(FONT, 'bold');
        doc.setTextColor(...COLORS.ink);
        doc.text(doc.splitTextToSize(value, CONTENT_WIDTH - 58)[0], PAGE.margin + 46, inner);
        inner += rowHeight;
      });
      y += boxHeight + 10;
    } else {
      doc.setFontSize(9.5);
      doc.text('Фильтры не применялись — в отчёт вошла вся база источников.', PAGE.margin, y);
      y += 10;
    }

    doc.setFont(FONT, 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...COLORS.muted);
    const note = doc.splitTextToSize(
      'Отчёт сформирован автоматически из рабочей базы справочника. Сведения о сроках, суммах и условиях ' +
      'могут меняться: перед подачей заявки проверьте действующее положение конкурса на официальном сайте организатора. ' +
      'Позиции с пометкой «Требует уточнения» официальным источником не подтверждены.',
      CONTENT_WIDTH
    );
    doc.text(note, PAGE.margin, y);
  }

  /* Карточка источника: заголовок, категория и таблица полей. */
  function drawItem(doc, item, index, cursor) {
    const rows = fieldsFor(item);
    const labelWidth = 34;
    const valueWidth = CONTENT_WIDTH - labelWidth - 6;

    const heading = doc.splitTextToSize(`${index}. ${text(item.org)}`, CONTENT_WIDTH - 34);
    const program = text(item.program || item.title);
    const programLines = program ? doc.splitTextToSize(program, CONTENT_WIDTH - 34) : [];

    const measured = rows.map(([label, value]) => {
      const lines = doc.splitTextToSize(value, valueWidth);
      return { label, lines, height: Math.max(lines.length * 4.2, 4.6) + 2.4 };
    });

    const blockHeight = heading.length * 6.2 + programLines.length * 4.4 + 5 +
      measured.reduce((sum, row) => sum + row.height, 0) + 6;

    let y = cursor;
    // Не разрываем карточку между страницами.
    if (y + blockHeight > PAGE.height - 16) {
      doc.addPage();
      y = PAGE.margin;
    }

    const top = y;
    doc.setFont(FONT, 'bold');
    doc.setFontSize(12.5);
    doc.setTextColor(...COLORS.ink);
    doc.text(heading, PAGE.margin, y + 4.5);
    y += heading.length * 6.2;

    const seal = CATEGORY_LABELS[item.category] || '';
    if (seal) {
      doc.setFont(FONT, 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(...COLORS.muted);
      doc.text(seal.toUpperCase(), PAGE.width - PAGE.margin, top + 4, { align: 'right' });
    }

    if (programLines.length) {
      doc.setFont(FONT, 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...COLORS.muted);
      doc.text(programLines, PAGE.margin, y + 3.4);
      y += programLines.length * 4.4;
    }

    y += 3.4;
    doc.setDrawColor(...COLORS.hair);
    doc.setLineWidth(0.2);
    doc.line(PAGE.margin, y, PAGE.width - PAGE.margin, y);
    y += 4;

    measured.forEach(row => {
      doc.setFont(FONT, 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(...COLORS.muted);
      doc.text(row.label.toUpperCase(), PAGE.margin, y + 3);

      doc.setFont(FONT, 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...COLORS.ink);
      doc.text(row.lines, PAGE.margin + labelWidth, y + 3);
      y += row.height;
    });

    return y + 6;
  }

  function buildDocument(items) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true });

    registerFonts(doc);
    doc.setFont(FONT, 'normal');
    doc.setProperties({
      title: 'Источники финансирования — результаты подбора',
      subject: 'Подбор источников финансирования кинопроекта',
      creator: 'Справочник продюсера'
    });

    drawCover(doc, items.length, selectionSummary());

    doc.addPage();
    let cursor = PAGE.margin;
    items.forEach((item, index) => {
      cursor = drawItem(doc, item, index + 1, cursor);
    });

    const total = doc.getNumberOfPages();
    for (let page = 1; page <= total; page += 1) {
      doc.setPage(page);
      drawFooter(doc, page);
    }
    return doc;
  }

  function fileName() {
    const stamp = new Date().toISOString().slice(0, 10);
    return `podbor-finansirovaniya-${stamp}.pdf`;
  }

  function exportPdf(items) {
    return loadAssets().then(() => {
      buildDocument(items).save(fileName());
    });
  }

  window.KINO_PDF_EXPORT = exportPdf;
})();
