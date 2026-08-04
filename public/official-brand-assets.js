(() => {
  const normalize = value => String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

  const label = node => normalize(node?.textContent);
  const companyLogo = '/logo-queijos-wr-upload.svg';
  const loginIcon = '/icons/login-oficial.svg';

  const iconByLabel = {
    dashboard: '/icons/dashboard.webp',
    clientes: '/icons/clientes.webp',
    produtos: '/brand/logo-simbolo.webp',
    pedidos: '/icons/pedidos.webp',
    entregas: '/icons/entregas.webp',
  };

  const classByLabel = {
    dashboard: 'dashboard',
    clientes: 'clientes',
    produtos: 'produtos',
    pedidos: 'pedidos',
    entregas: 'entregas',
    caixa: 'caixa',
    relatorios: 'relatorios',
    administracao: 'administracao',
    'pdfs e comprovantes': 'pdf',
    pdfs: 'pdf',
    documentos: 'pdf',
  };

  function setImage(image, source, className, alt) {
    if (!image) return;
    if (image.getAttribute('src') !== source) image.setAttribute('src', source);
    image.style.objectFit = 'contain';
    image.style.objectPosition = 'center';
    image.classList.remove('wr-login-logo', 'wr-login-icon', 'wr-sidebar-logo');
    if (className) image.classList.add(className);
    if (alt) image.alt = alt;
  }

  function applyLoginIcon() {
    document.querySelectorAll('.login-card-logo').forEach(image => {
      setImage(image, loginIcon, 'wr-login-icon', 'Acesso seguro Queijos WR');
      image.style.visibility = 'visible';
    });
  }

  function applyCompanyLogo() {
    document.querySelectorAll('.sidebar-brand img, .login-brand img').forEach(image => {
      const targetClass = image.closest('.sidebar-brand') ? 'wr-sidebar-logo' : 'wr-login-logo';
      setImage(image, companyLogo, targetClass, 'Queijos WR — Sabor e tradição de família');
    });
    document.querySelectorAll('.sidebar-brand > div, .login-brand > span').forEach(block => {
      block.style.display = 'none';
    });
  }

  function prepareIcon(icon, name) {
    if (!icon) return;
    Object.values(classByLabel).forEach(className => icon.classList.remove(`wr-icon-${className}`));
    const className = classByLabel[name];
    if (className) icon.classList.add(`wr-icon-${className}`);

    const source = iconByLabel[name];
    if (source) icon.style.backgroundImage = `url('${source}')`;
    else icon.style.removeProperty('background-image');

    icon.style.backgroundSize = name === 'entregas' ? '112%' : 'contain';
    icon.style.backgroundPosition = 'center';
    icon.style.backgroundRepeat = 'no-repeat';
  }

  function applyModuleIcons() {
    document.querySelectorAll('.sidebar-nav button').forEach(button => {
      prepareIcon(button.querySelector('.wr-brand-icon'), label(button.querySelector('.nav-label')));
    });
    document.querySelectorAll('.mobile-bottom-nav button').forEach(button => {
      const name = label(button.querySelector('span:last-child'));
      prepareIcon(button.querySelector('.wr-brand-icon'), name === 'inicio' ? 'dashboard' : name);
    });
  }

  function applyOfficialBrand() {
    applyCompanyLogo();
    applyLoginIcon();
    applyModuleIcons();
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
