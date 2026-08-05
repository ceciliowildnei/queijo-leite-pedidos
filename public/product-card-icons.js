(() => {
  const normalize = value => String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

  const typeFor = card => {
    const name = normalize(card.querySelector('h3')?.textContent);
    if (name.includes('leite')) return 'leite';
    if (name.includes('queijo g') || name.includes('1 kg') || name.includes('1kg')) return 'queijo-g';
    if (name.includes('queijo p') || name.includes('500')) return 'queijo-p';
    return '';
  };

  function applyProductIcons() {
    document.querySelectorAll('.product-card').forEach(card => {
      const type = typeFor(card);
      if (!type) return;
      const art = card.querySelector('.product-art');
      if (!art) return;

      art.classList.remove('wr-product-art-leite', 'wr-product-art-queijo-g', 'wr-product-art-queijo-p');
      art.classList.add(`wr-product-art-${type}`);
      art.setAttribute('data-wr-product-icon', type);
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
    new MutationObserver(schedule).observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  });
})();
