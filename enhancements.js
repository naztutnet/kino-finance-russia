(() => {
  const candidatePattern = /https?:\/\/[^\s<>"']+|www\.[^\s<>"']+|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-ZА-ЯЁ]{2,}|(?:[A-ZА-ЯЁ0-9-]+\.)+(?:[A-ZА-ЯЁ]{2,}|XN--[A-Z0-9-]{2,})(?:\/[^\s<>"']*)?/giu;
  const resultLinks = {};
  const itemLookup = new Map();
  const allItems = [];
  let requirementOverrides = {};

  const typeLabels = {
    any: 'любой формат', feature: 'полнометражный игровой', series: 'сериал / видеоконтент',
    doc: 'документальный', animation: 'анимация', short: 'короткий метр'
  };
  const stageLabels = { any: 'любая стадия', project: 'разработка / производство', finished: 'готовый фильм' };
  const categoryLabels = {
    gov: 'государственная поддержка', priv: 'частное финансирование', reg: 'региональная программа',
    pitch: 'питчинг / фестиваль', grant: 'грант / лаборатория', intl: 'международная программа'
  };

  function normalize(value = '') {
    return String(value).replace(/\s+/g, ' ').trim().toLowerCase();
  }

  function escapeHtml(value = '') {
    return String(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
  }

  function hrefFor(value) {
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(value)) return `mailto:${value}`;
    if (/^https?:\/\//iu.test(value)) return value;
    return `https://${value}`;
  }

  function usableLink(value) {
    const text = String(value || '').trim();
    if (!text || text === '—') return '';
    if (/^https?:\/\//iu.test(text) || /^www\./iu.test(text)) return hrefFor(text);
    if (/^(?:[a-zа-яё0-9-]+\.)+(?:[a-zа-яё]{2,}|xn--[a-z0-9-]{2,})(?:\/\S*)?$/iu.test(text)) return hrefFor(text);
    return '';
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
    return `${normalize(card.querySelector('.org')?.textContent)}|${normalize(card.querySelector('.prog')?.textContent)}`;
  }

  function itemKey(item) {
    return `${normalize(item.org)}|${normalize(item.program)}`;
  }

  function filterParameters(item, override) {
    const parts = [];
    parts.push(`категория: ${categoryLabels[item.category] || item.category || 'нет данных'}`);
    parts.push(`тип проекта: ${(item.types || []).map(type => typeLabels[type] || type).join(', ') || 'нет данных'}`);
    parts.push(`стадия: ${stageLabels[item.stage] || item.stage || 'нет данных'}`);
    parts.push(`тип заявителя: ${override.applicant || 'Нет данных; проверить положение или регламент'}`);
    parts.push(`регион: ${item.region || 'ограничение не указано'}`);
    parts.push(`сумма: ${item.max_amount_text || 'Нет данных по сумме'}`);
    parts.push(`срок: ${item.deadline_text || 'Нет данных по сроку'}`);
    if (item.debut) parts.push('дебютные проекты: допускаются / приоритет отмечен в базе');
    if (item.needs_selffinance === true) parts.push('софинансирование: требуется или учитывается; точный размер проверить в положении');
    if (item.needs_distributor === true) parts.push('дистрибьютор: требуется');
    if (item.needs_pitch === true) parts.push('защита / питчинг: предусмотрены');
    return parts.join('; ');
  }

  function requirementsHtml(item) {
    const override = requirementOverrides[item.id] || {};
    const documents = override.documents || 'Нет данных по точному перечню документов, шаблонам и допустимым форматам. Искать в официальном положении, регламенте или объявлении об отборе.';
    const how = override.how || `Нет данных по точному способу подачи и техническим ограничениям. Искать на официальной странице программы. Срок, указанный в базе: ${item.deadline_text || 'нет данных'}.`;
    const resultUrl = resultLinks[item.id] || item.results_link || '';
    const links = [
      ['Официальный источник', item.link],
      ['Форма подачи', item.apply_link],
      ['Положение / регламент', override.regulation],
      ['Опубликованные результаты', resultUrl]
    ].map(([label, value]) => {
      const href = usableLink(value);
      return href ? `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${label}</a>` : '';
    }).filter(Boolean);
    const linksText = links.length ? links.join(' · ') : 'Нет данных по прямым ссылкам. Искать на официальном сайте организатора.';
    return `<details class="submission-details"><summary>Открыть требования к подаче</summary>
      <div class="submission-section"><strong>Документы:</strong> ${escapeHtml(documents)}</div>
      <div class="submission-section"><strong>Как подавать:</strong> ${escapeHtml(how)}</div>
      <div class="submission-section"><strong>Ссылки:</strong> ${linksText}</div>
      <div class="submission-section"><strong>Параметры для фильтра:</strong> ${escapeHtml(filterParameters(item, override))}</div>
    </details>`;
  }

  function addRows(card) {
    const item = itemLookup.get(cardKey(card));
    if (!item) return;
    const rows = card.querySelector('.rows');
    if (!rows) return;

    if (!card.querySelector('.submission-requirements-row')) {
      const row = document.createElement('div');
      row.className = 'row submission-requirements-row';
      row.innerHTML = `<div class="k">Требования к подаче</div><div class="v">${requirementsHtml(item)}</div>`;
      rows.append(row);
    }

    const resultUrl = resultLinks[item.id] || item.results_link || '';
    if (resultUrl && !card.querySelector('.result-link-row')) {
      const row = document.createElement('div');
      row.className = 'row result-link-row';
      row.innerHTML = `<div class="k">Результаты</div><div class="v"><a href="${escapeHtml(resultUrl)}" target="_blank" rel="noopener noreferrer">Открыть опубликованные результаты</a></div>`;
      rows.append(row);
    }
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
    const cards = container.matches?.('.card') ? [container] : [...(container.querySelectorAll?.('.card') || [])];
    cards.forEach(addRows);
  }

  async function loadSupplementalData() {
    const requests = [
      fetch('./result-links.json', { cache: 'no-store' }),
      fetch('./submission-overrides.json', { cache: 'no-store' }),
      ...Array.from({ length: 10 }, (_, i) => fetch(`./data-${String(i).padStart(2, '0')}.json`, { cache: 'no-store' }))
    ];
    const [linkResponse, overrideResponse, ...dataResponses] = await Promise.all(requests);
    Object.assign(resultLinks, linkResponse.ok ? await linkResponse.json() : {});
    requirementOverrides = overrideResponse.ok ? await overrideResponse.json() : {};
    const parts = await Promise.all(dataResponses.map(response => response.ok ? response.json() : { items: [] }));
    parts.flatMap(part => part.items || []).forEach(item => {
      allItems.push(item);
      itemLookup.set(itemKey(item), item);
    });
  }

  function syncMissingSources(attempt = 0) {
    try {
      if (!Array.isArray(ITEMS) || ITEMS.length === 0) {
        if (attempt < 40) setTimeout(() => syncMissingSources(attempt + 1), 100);
        return;
      }
      const existing = new Set(ITEMS.map(item => item.id));
      const missing = allItems.filter(item => !existing.has(item.id));
      if (!missing.length) return;
      ITEMS.push(...missing);
      if (typeof renderAll === 'function' && document.getElementById('catalog-root')) {
        const seen = new Map();
        ITEMS.forEach(item => { if (!seen.has(item.block)) seen.set(item.block, item.block_title); });
        if (typeof BLOCKS !== 'undefined') {
          BLOCKS = [...seen.entries()].map(([num, title]) => ({ num, title })).sort((a, b) => a.num - b.num);
        }
        renderAll();
        if (typeof apply === 'function') apply();
      }
    } catch (error) {
      if (attempt < 40) setTimeout(() => syncMissingSources(attempt + 1), 100);
    }
  }

  document.addEventListener('DOMContentLoaded', async () => {
    try {
      await loadSupplementalData();
      syncMissingSources();
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
    } catch (error) {
      console.warn('Не удалось загрузить дополнительные данные справочника', error);
    }
  });
})();
