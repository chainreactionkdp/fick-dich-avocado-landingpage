(() => {
  const year = document.querySelector('#year');
  if (year) {
    year.textContent = new Date().getFullYear().toString();
  }

  document.querySelectorAll('[data-cta]').forEach((link) => {
    link.addEventListener('click', () => {
      document.documentElement.dataset.lastCta = link.dataset.cta || 'amazon';
    });
  });
})();
