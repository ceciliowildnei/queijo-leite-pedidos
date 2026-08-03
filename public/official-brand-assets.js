(() => {
  const label = node => node?.textContent?.trim().toLowerCase() || '';
  const iconByLabel = {
    dashboard: '/icons/dashboard.webp',
    clientes: '/icons/clientes.webp',
    pedidos: '/icons/pedidos.webp',
    entregas: '/icons/entregas.webp',
  };

  function applyOfficialBrand() {
    document.querySelectorAll('.sidebar-brand img, .login-brand img, .login-card-logo').forEach(image => {
      if (image.getAttribute('src') !== '/brand/logo-simbolo.webp') image.setAttribute('src', '/brand/logo-simbolo.webp');
      image.style.objectFit = 'contain';
    });

    document.querySelectorAll('.sidebar-nav button').forEach(button => {
      const name = label(button.querySelector('.nav-label'));
      const icon = button.querySelector('.wr-brand-icon');
      if (!icon || !iconByLabel[name]) return;
      icon.style.backgroundImage = `url('${iconByLabel[name]}')`;
      icon.style.backgroundSize = 'contain';
      icon.style.backgroundPosition = 'center';
      icon.style.backgroundRepeat = 'no-repeat';
    });

    document.querySelectorAll('.mobile-bottom-nav button').forEach(button => {
      const name = label(button.querySelector('span:last-child'));
      const key = name === 'início' ? 'dashboard' : name;
      const icon = button.querySelector('.wr-brand-icon');
      if (!icon || !iconByLabel[key]) return;
      icon.style.backgroundImage = `url('${iconByLabel[key]}')`;
      icon.style.backgroundSize = 'contain';
      icon.style.backgroundPosition = 'center';
      icon.style.backgroundRepeat = 'no-repeat';
    });
  }

  let scheduled = false;
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      applyOfficialBrand();
    });
  };

  window.addEventListener('DOMContentLoaded', () => {
    schedule();
    new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  });
})();
