(() => {
  const label = node => node?.textContent?.trim().toLowerCase() || '';
  const companyLogo = '/brand/logo-horizontal-oficial.webp';
  const loginIcon = '/icons/login.webp';
  const deliveryTruck = '/icons/entregas.webp';
  const iconByLabel = {
    dashboard: '/icons/dashboard.webp',
    clientes: '/icons/clientes.webp',
    pedidos: '/icons/pedidos.webp',
    entregas: deliveryTruck,
  };

  function setImage(image, source, className, alt) {
    if (!image) return;
    if (image.getAttribute('src') !== source) image.setAttribute('src', source);
    image.style.objectFit = 'contain';
    image.classList.remove('wr-login-logo', 'wr-login-icon', 'wr-login-truck', 'wr-sidebar-logo');
    if (className) image.classList.add(className);
    if (alt) image.alt = alt;
  }

  function applyOfficialBrand() {
    document.querySelectorAll('.sidebar-brand img').forEach(image => {
      setImage(image, companyLogo, 'wr-sidebar-logo', 'Queijos WR');
    });
    document.querySelectorAll('.sidebar-brand > div').forEach(block => {
      block.style.display = 'none';
    });

    document.querySelectorAll('.login-brand img').forEach(image => {
      setImage(image, companyLogo, 'wr-login-logo', 'Queijos WR');
    });

    document.querySelectorAll('.login-card-logo').forEach(image => {
      setImage(image, loginIcon, 'wr-login-icon', 'Acesso Queijos WR');
    });

    document.querySelectorAll('.sidebar-nav button').forEach(button => {
      const name = label(button.querySelector('.nav-label'));
      const icon = button.querySelector('.wr-brand-icon');
      if (!icon || !iconByLabel[name]) return;
      icon.style.backgroundImage = `url('${iconByLabel[name]}')`;
      icon.style.backgroundSize = name === 'entregas' ? '115%' : 'contain';
      icon.style.backgroundPosition = 'center';
      icon.style.backgroundRepeat = 'no-repeat';
    });

    document.querySelectorAll('.mobile-bottom-nav button').forEach(button => {
      const name = label(button.querySelector('span:last-child'));
      const key = name === 'início' ? 'dashboard' : name;
      const icon = button.querySelector('.wr-brand-icon');
      if (!icon || !iconByLabel[key]) return;
      icon.style.backgroundImage = `url('${iconByLabel[key]}')`;
      icon.style.backgroundSize = key === 'entregas' ? '118%' : 'contain';
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
    new MutationObserver(schedule).observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class']
    });
  });
})();
