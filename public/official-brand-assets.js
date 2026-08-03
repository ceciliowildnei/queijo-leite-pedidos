(() => {
  const normalize = value => String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

  const label = node => normalize(node?.textContent);
  const companyLogo = '/wr-app-icon.svg';
  const loginIconBase64 = '/icons/login-small.b64';
  const transparentImage = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%221%22 height=%221%22/%3E';

  const iconByLabel = {
    dashboard: '/icons/dashboard.webp',
    clientes: '/icons/clientes.webp',
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
  };

  let loginIconDataUrl = '';
  let loginIconPromise = null;

  function loadLoginIcon() {
    if (loginIconDataUrl) return Promise.resolve(loginIconDataUrl);
    if (loginIconPromise) return loginIconPromise;
    loginIconPromise = fetch(loginIconBase64, { cache: 'no-store' })
      .then(response => {
        if (!response.ok) throw new Error(`Ícone de login indisponível: ${response.status}`);
        return response.text();
      })
      .then(encoded => {
        const cleaned = encoded.replace(/\s+/g, '');
        if (!cleaned.startsWith('UklGR')) throw new Error('Arquivo do ícone de login inválido.');
        loginIconDataUrl = `data:image/webp;base64,${cleaned}`;
        return loginIconDataUrl;
      })
      .catch(error => {
        console.error(error);
        loginIconPromise = null;
        return '';
      });
    return loginIconPromise;
  }

  function setImage(image, source, className, alt) {
    if (!image) return;
    if (image.getAttribute('src') !== source) image.setAttribute('src', source);
    image.style.objectFit = 'contain';
    image.style.objectPosition = 'center';
    image.classList.remove('wr-login-logo', 'wr-login-icon', 'wr-login-truck', 'wr-sidebar-logo');
    if (className) image.classList.add(className);
    if (alt) image.alt = alt;
  }

  function applyLoginIcon() {
    document.querySelectorAll('.login-card-logo').forEach(image => {
      setImage(image, loginIconDataUrl || transparentImage, 'wr-login-icon', 'Acesso Queijos WR');
      image.style.visibility = loginIconDataUrl ? 'visible' : 'hidden';
    });
    if (!loginIconDataUrl) {
      loadLoginIcon().then(source => {
        if (!source) return;
        document.querySelectorAll('.login-card-logo').forEach(image => {
          setImage(image, source, 'wr-login-icon', 'Acesso Queijos WR');
          image.style.visibility = 'visible';
        });
      });
    }
  }

  function applyCompanyLogo() {
    document.querySelectorAll('.sidebar-brand img, .login-brand img').forEach(image => {
      const targetClass = image.closest('.sidebar-brand') ? 'wr-sidebar-logo' : 'wr-login-logo';
      setImage(image, companyLogo, targetClass, 'Queijos WR');
    });
    document.querySelectorAll('.sidebar-brand > div').forEach(block => {
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
    icon.style.backgroundSize = name === 'entregas' ? '115%' : 'contain';
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
