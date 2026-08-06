(() => {
  const VERIFIED_AT = '06.08.2026';

  const official = {
    fondKino: 'https://www.fond-kino.ru/projects/otbor-hudozestvennyh-nacionalnyh-filmov-v-celah-okazania-podderzki-proizvodstva-za-scet-sredstv-istocnikom-kotoryh-avlautsa-subsidii-podderzka-na-bezvozvratnoj-osnove-v-2026-godu/',
    fondKinoFarEast: 'https://www.fond-kino.ru/projects/otbor-nacionalnyh-filmov-o-dalnem-vostoke-i-na-dalnem-vostoke-v-celah-okazania-podderzki-proizvodstva-v-2026-godu-za-scet-sredstv-istocnikom-kotoryh-avlautsa-subsidii/',
    fondKinoDocuments: 'https://fond-kino.ru/documents/official/',
    cultureCabinet: 'https://kino.culture.gov.ru/',
    iriNational: 'https://xn--h1aax.xn--p1ai/contests/konkurs-natsionalnogo-kontenta-2026/',
    iriRegional: 'https://xn--h1aax.xn--p1ai/contests/otbor-regionalnykh-proektov/',
    iriMain: 'https://xn--h1aax.xn--p1ai/',
    pfkiDocuments: 'https://xn--80aeeqaabljrdbg6a3ahhcl4ay9hsa.xn--p1ai/documents?type=CONTEST',
    pfkiGrants: 'https://xn--80aeeqaabljrdbg6a3ahhcl4ay9hsa.xn--p1ai/grants',
    fprk: 'https://fundregion.ru/konkurs_korotkometrazhnih_filmov_fprk_2026',
    fprkApply: 'https://www.script.moviestart.ru/',
    kinoprime: 'https://www.kinoprimefoundation.com/'
  };

  const rules = [
    {
      test: text => /кинопрайм/i.test(text),
      status: 'Проверено по официальному сайту',
      documents: [
        'Официальное обращение от кинокомпании.',
        'Сценарий и синопсис фильма.',
        'Режиссёрская экспликация — при наличии.',
        'Лимит затрат и календарно-постановочный план производства.',
        'Презентация проекта.',
        'Все документы прикладываются к электронной форме одним архивом.'
      ],
      submit: 'Онлайн через форму на сайте фонда. Приём непрерывный; решение принимается после экспертизы и рассмотрения инвестором.',
      restrictions: 'Проект подаёт кинокомпания. В форме указываются общий бюджет, запрашиваемая сумма, собственные и привлечённые средства, государственная поддержка, сроки производства и сведения о правах.',
      links: [['Форма и требования Кинопрайм', official.kinoprime]]
    },
    {
      test: text => /фпрк|фонд поддержки регионального кинематографа/i.test(text) && /короткометраж|неигров|эксперимент/i.test(text),
      status: 'Проверено по официальной странице конкурса 2026',
      documents: [
        'Краткий синопсис.',
        'Расширенный синопсис, подписанный автором сценария.',
        'Режиссёрская экспликация, подписанная режиссёром проекта.',
        'Лимит затрат и календарный план реализации проекта.',
        'Информация о руководителе и авторах проекта.',
        'Описание целевой аудитории.',
        'План фестивального продвижения.',
        'Перечень каналов информационного сопровождения.',
        'Письма поддержки региональных органов власти и/или партнёров.',
        'Информация о компании.',
        'Справка об отсутствии налоговой задолженности либо гарантийное письмо о её предоставлении до заключения договора.'
      ],
      submit: 'Онлайн на платформе Script / MovieStart. Для конкурса 2026 заявки принимались до 29 марта 2026 года, 23:59 МСК. После отправки заявку нельзя редактировать: для исправлений её нужно отозвать и подать заново.',
      restrictions: 'Компании из любого субъекта РФ. Для заявителей из Москвы и Санкт-Петербурга не менее 60% съёмочной группы должны быть привлечены из регионов. Неигровой фильм — 15–40 минут; экспериментальный — 7–25 минут.',
      links: [['Официальная страница конкурса', official.fprk], ['Платформа подачи', official.fprkApply]]
    },
    {
      test: text => /фонд кино/i.test(text) && /дальн/i.test(text),
      status: 'Проверено по официальной странице отбора',
      documents: [
        'Комплект заявочной документации по приказу и Порядку конкретного отбора.',
        'Документы от третьих лиц, в том числе выписка ЕГРЮЛ, справка о сальдо единого налогового счёта по форме КНД 1160082, выписка из Государственного реестра национальных фильмов и иные документы, предусмотренные Порядком.',
        'Точный полный перечень находится в приложениях к приказу; в кратком объявлении на сайте он не перечислен.'
      ],
      submit: 'Основная заявка подаётся онлайн через ГИИС Минкультуры kino.culture.gov.ru. Оригиналы или нотариальные копии документов третьих лиц с рукописной подписью нужно передать на бумаге в Фонд кино до окончания приёма.',
      restrictions: 'Заявитель — продюсер национального фильма, являющийся юридическим лицом, либо иная организация кинематографии. Заявка после дедлайна не рассматривается.',
      links: [['Страница отбора', official.fondKinoFarEast], ['Личный кабинет подачи', official.cultureCabinet], ['Официальные документы Фонда кино', official.fondKinoDocuments]]
    },
    {
      test: text => /фонд кино/i.test(text),
      status: 'Проверено по официальным страницам отборов 2026',
      documents: [
        'Комплект заявочной документации по приказу и Порядку соответствующей категории фильма.',
        'Документы от третьих лиц, в том числе выписка ЕГРЮЛ, справка КНД 1160082, выписка из Государственного реестра национальных фильмов и другие документы по Порядку.',
        'Если документ выдан с электронной подписью, прикладываются сам документ и файл электронной подписи.',
        'Точный полный перечень документов нужно брать из приложений к приказу конкретного отбора: общий HTML-раздел его не раскрывает полностью.'
      ],
      submit: 'Заявка подаётся онлайн через kino.culture.gov.ru. Бумажная подача требуется только для предусмотренных Порядком оригиналов/нотариальных копий третьих лиц с рукописной подписью — до окончания приёма по адресу Фонда кино.',
      restrictions: 'Заявитель — продюсер национального фильма, являющийся юридическим лицом, или иная организация кинематографии. Категория заявителя и фильма должна соответствовать конкретному приказу отбора.',
      links: [['Раздел отбора 2026', official.fondKino], ['Личный кабинет подачи', official.cultureCabinet], ['Официальные документы Фонда кино', official.fondKinoDocuments]]
    },
    {
      test: text => /ири|институт развития интернета/i.test(text) && /регион/i.test(text),
      status: 'Проверено по официальной странице отбора',
      documents: [
        'Электронная заявка в личном кабинете.',
        'Бизнес-план, который формируется системой под выбранное направление.',
        'Презентация проекта и материалы по требованиям выбранного направления.',
        'Дополнительные документы по составу, форме и оформлению заявки — согласно конкурсной документации на странице отбора.'
      ],
      submit: 'Только онлайн через личный кабинет конкурс.ири.рф. Сначала нужно зарегистрироваться, выбрать направление и заполнить подготовленные системой формы.',
      restrictions: 'Для регионального отбора действуют отдельные тематические линии, лимит поддержки и KPI просмотров. Точные требования к заявителю и контенту проверяются в документации конкретного отбора.',
      links: [['Региональный отбор ИРИ', official.iriRegional], ['Главный сайт ИРИ', official.iriMain]]
    },
    {
      test: text => /ири|институт развития интернета/i.test(text),
      status: 'Проверено по официальной конкурсной странице ИРИ',
      documents: [
        'Электронная заявка.',
        'Бизнес-план, сформированный системой в зависимости от направления проекта.',
        'Презентация проекта.',
        'Материалы и приложения, указанные в документе «Требования к содержанию, форме, оформлению и составу Заявки».',
        'Рекомендации по заполнению заявки и общие требования к проектам размещаются отдельными файлами на странице конкурса.'
      ],
      submit: 'Исключительно онлайн через личный кабинет конкурс.ири.рф. Без регистрации участие невозможно. После выбора направления система формирует необходимые формы заявки и бизнес-плана.',
      restrictions: 'Проект должен соответствовать направлению контента, тематической линии, сроку реализации и KPI. Точные ограничения отличаются между национальным, детским, дебютным, молодёжным, AI- и региональным отборами.',
      links: [['Конкурс национального контента 2026', official.iriNational], ['Главный сайт ИРИ', official.iriMain]]
    },
    {
      test: text => /пфки|президентский фонд культурных инициатив/i.test(text),
      status: 'Проверено по комплекту документов конкурса 27-1',
      documents: [
        'Электронная заявка с описанием проекта, творческой концепцией, актуальностью, целью и задачами, географией, сроками, целевыми группами и ожидаемыми результатами.',
        'Бюджет проекта и сведения о собственном вкладе и привлечённых ресурсах.',
        'Информация о команде, опыте заявителя, партнёрах и информационном сопровождении.',
        'Документы заявителя и подтверждение полномочий подписанта — в случаях, установленных Положением.',
        'Для конкурса 27-1 опубликованы отдельные: Положение, инструкция по заполнению заявки, рекомендации по бюджету и чек-лист самопроверки.'
      ],
      submit: 'Онлайн в личном кабинете на сайте ПФКИ. Для конкурса 27-1 заявки принимались с 15 апреля по 30 июня 2026 года. После завершения срока новые заявки не принимаются.',
      restrictions: 'Участвуют негосударственные НКО, коммерческие и муниципальные организации и индивидуальные предприниматели в соответствии с Положением. Проект должен соответствовать тематическому направлению и традиционной духовно-нравственной ценности.',
      links: [['Документы конкурса ПФКИ', official.pfkiDocuments], ['Этапы конкурсов и личный кабинет', official.pfkiGrants]]
    },
    {
      test: text => /министерство культуры|минкульт/i.test(text),
      status: 'Способ подачи подтверждён; точный комплект требует проверки по приказу',
      documents: [
        'Нет данных по полному перечню документов в текущей карточке.',
        'Точный комплект нужно брать из приказа, объявления и приложений конкретного отбора Минкультуры: документы компании, проектные и финансовые материалы отличаются по категории фильма.',
        'Искать в личном кабинете заявителя и в конкурсной документации действующего отбора.'
      ],
      submit: 'Онлайн через личный кабинет заявителя kino.culture.gov.ru. Сроки и возможность редактирования заявки определяются документацией конкретного отбора.',
      restrictions: 'Тип заявителя, категория фильма, доля софинансирования и требования к национальному фильму зависят от конкретного приказа.',
      links: [['Личный кабинет Минкультуры', official.cultureCabinet], ['Официальный сайт Минкультуры', 'https://culture.gov.ru/']]
    }
  ];

  function escapeHtml(value = '') {
    return String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  }

  function existingOfficialLink(card) {
    const links = [...card.querySelectorAll('.row .v a[href]')];
    return links.find(link => /^https?:/i.test(link.href))?.href || '';
  }

  function fallbackFor(card) {
    const seal = (card.querySelector('.seal')?.textContent || '').trim();
    const source = existingOfficialLink(card);
    let where = 'на официальной странице программы, в разделе «Документы», «Положение», «Регламент» или «Как подать заявку»';
    if (seal === 'РЕГ') where = 'в постановлении региона, объявлении о субсидии/рибейте и приложениях к порядку отбора';
    if (seal === 'ПИТЧ') where = 'в регламенте питчинга, форме на MovieStart/Script или на сайте фестиваля';
    if (seal === 'ГРАНТ') where = 'в положении лаборатории, акселератора или грантового конкурса';
    if (seal === 'МЕЖД') where = 'в действующих правилах международной программы и требованиях к стране заявителя';
    return {
      status: 'Требует отдельной проверки официального регламента',
      documents: [
        'Нет данных по точному перечню документов для этой позиции.',
        `Искать ${where}.`,
        'До проверки регламента нельзя считать типовой список документов официальным требованием.'
      ],
      submit: 'Нет данных по точному способу подачи, формату файлов и возможности редактирования заявки. Проверить форму и FAQ текущего цикла программы.',
      restrictions: 'Нет подтверждённых данных по типу заявителя, территориальным ограничениям и обязательному софинансированию сверх сведений, уже указанных в карточке.',
      links: source ? [['Официальный источник из карточки', source]] : []
    };
  }

  function row(label, content) {
    return `<div class="requirements-row"><div class="requirements-label">${escapeHtml(label)}</div><div>${content}</div></div>`;
  }

  function list(items) {
    return `<ul>${items.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
  }

  function links(items) {
    if (!items.length) return '<span class="requirements-missing">Нет прямой официальной ссылки в карточке.</span>';
    return items.map(([label, url]) => `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a>`).join(' · ');
  }

  function requirementsFor(card) {
    const org = card.querySelector('.org')?.textContent || '';
    const program = card.querySelector('.prog')?.textContent || '';
    const text = `${org} ${program}`;
    return rules.find(rule => rule.test(text)) || fallbackFor(card);
  }

  function enhanceCard(card) {
    if (!card || card.dataset.requirementsReady === '1') return;
    const rows = card.querySelector('.rows');
    if (!rows) return;
    const data = requirementsFor(card);
    const details = document.createElement('details');
    details.className = 'application-requirements';
    details.innerHTML = `
      <summary>Требования к подаче <span>${escapeHtml(data.status)}</span></summary>
      <div class="requirements-body">
        ${row('Документы', list(data.documents))}
        ${row('Как подавать', `<p>${escapeHtml(data.submit)}</p>`)}
        ${row('Ограничения', `<p>${escapeHtml(data.restrictions)}</p>`)}
        ${row('Ссылки', links(data.links || []))}
        ${row('Проверка', `<p>Последняя проверка раздела: ${VERIFIED_AT}. Для подачи используйте только актуальную редакцию положения текущего цикла.</p>`)}
      </div>`;
    rows.append(details);
    card.dataset.requirementsReady = '1';
  }

  function enhanceAll() {
    document.querySelectorAll('.card').forEach(enhanceCard);
  }

  function installStyles() {
    if (document.getElementById('application-requirements-style')) return;
    const style = document.createElement('style');
    style.id = 'application-requirements-style';
    style.textContent = `
      .application-requirements{grid-column:1/-1;width:100%;min-width:0;margin:4px 0 0;border:1px solid #bbb;border-radius:6px;background:#fff;box-sizing:border-box}
      .application-requirements summary{display:flex;justify-content:space-between;gap:12px;align-items:center;padding:11px 12px;cursor:pointer;font-size:12px;font-weight:900;list-style:none}
      .application-requirements summary::-webkit-details-marker{display:none}
      .application-requirements summary::before{content:'＋';flex:0 0 auto}
      .application-requirements[open] summary::before{content:'−'}
      .application-requirements summary span{margin-left:auto;color:#666;font-size:10px;font-weight:700;text-align:right}
      .requirements-body{border-top:1px solid #ddd}
      .requirements-row{display:grid;grid-template-columns:120px minmax(0,1fr);gap:12px;padding:11px 12px;border-bottom:1px solid #eee;font-size:12px;line-height:1.45}
      .requirements-row:last-child{border-bottom:0}
      .requirements-label{font-size:10px;font-weight:900;text-transform:uppercase;color:#333}
      .requirements-row p{margin:0}
      .requirements-row ul{margin:0;padding-left:18px}
      .requirements-row li+li{margin-top:4px}
      .requirements-row a{color:#0b57d0;font-weight:700;text-decoration:underline;text-underline-offset:2px;overflow-wrap:anywhere}
      .requirements-missing{color:#777}
      @media(max-width:620px){.requirements-row{grid-template-columns:1fr;gap:5px}.application-requirements summary{align-items:flex-start;flex-wrap:wrap}.application-requirements summary span{width:100%;margin-left:22px;text-align:left}}
      @media print{.application-requirements{display:none!important}}
    `;
    document.head.append(style);
  }

  document.addEventListener('DOMContentLoaded', () => {
    installStyles();
    enhanceAll();
    [100, 300, 700, 1500, 3000].forEach(delay => setTimeout(enhanceAll, delay));
    document.getElementById('go-btn')?.addEventListener('click', () => {
      [0, 50, 200].forEach(delay => setTimeout(enhanceAll, delay));
    });
    document.getElementById('reset-btn')?.addEventListener('click', () => setTimeout(enhanceAll, 50));
  });
})();
