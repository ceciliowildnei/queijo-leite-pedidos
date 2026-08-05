(() => {
  const normalize = value => String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

  const sourceFor = card => {
    const name = normalize(card.querySelector('h3')?.textContent);
    if (name.includes('leite')) return '/product-icons/leite.webp';
    if (name.includes('queijo g') || name.includes('1 kg') || name.includes('1kg')) return '/product-icons/queijo-g.webp';
    if (name.includes('queijo p') || name.includes('500')) return '/product-icons/queijo-p.webp';
    return '';
  };

  function applyProductIcons() {
    document.querySelectorAll('.product-card').forEach(card => {
      const source = sourceFor(card);
      if (!source) return;
      const art = card.querySelector('.product-art');
      if (!art) return;
      let image = art.querySelector('.wr-official-product-image');
      if (!image) {
        image = document.createElement('img');
        image.className = 'wr-official-product-image';
        image.alt = card.querySelector('h3')?.textContent || 'Produto';
        art.replaceChildren(image);
      }
      if (image.getAttribute('src') !== source) image.setAttribute('src', source);
    });
  }

  let scheduled = false;
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      applyProductIcons();
    });
  };

  window.addEventListener('DOMContentLoaded', () => {
    schedule();
    new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
  });
})();
