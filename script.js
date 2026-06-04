(() => {
  const year = document.querySelector('#year');
  if (year) {
    year.textContent = new Date().getFullYear().toString();
  }

  const cover = document.querySelector('.cover-frame img');
  if (cover && !cover.complete) {
    cover.addEventListener('error', () => {
      cover.closest('.cover-frame')?.classList.add('is-missing');
    });
  } else if (cover && cover.naturalWidth === 0) {
    cover.closest('.cover-frame')?.classList.add('is-missing');
  }

  document.querySelectorAll('[data-cta]').forEach((link) => {
    link.addEventListener('click', () => {
      document.documentElement.dataset.lastCta = link.dataset.cta || 'amazon';
    });
  });
})();
