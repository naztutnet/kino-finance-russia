(() => {
  const CORRECT_URL = 'https://www.kinoprimefoundation.com/#rec98743691';

  function fixLinks(root = document) {
    root.querySelectorAll?.('.card').forEach(card => {
      const title = `${card.querySelector('.org')?.textContent || ''} ${card.querySelector('.prog')?.textContent || ''}`;
      if (!/кинопрайм/i.test(title)) return;
      card.querySelectorAll('.application-requirements a').forEach(anchor => {
        const text = anchor.textContent.trim().toLowerCase();
        if (text.includes('кинопрайм') || text.includes('форма') || text.includes('требован')) {
          anchor.href = CORRECT_URL;
          anchor.target = '_blank';
          anchor.rel = 'noopener noreferrer';
        }
      });
    });
  }

  function run() {
    fixLinks(document);
    [50,150,400,900,1800,3500].forEach(delay => setTimeout(() => fixLinks(document), delay));
  }

  document.addEventListener('DOMContentLoaded', run);
  document.addEventListener('click', event => {
    if (event.target.closest('#go-btn,#reset-btn')) run();
  });
})();
