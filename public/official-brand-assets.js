(() => {
  const label = node => node?.textContent?.trim().toLowerCase() || '';
  const companyLogo = '/brand/logo-horizontal-oficial.webp';
  const loginIconBase64 = '/icons/login-small.b64';
  const transparentImage = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%221%22 height=%221%22/%3E';
  const deliveryTruck = '/icons/entregas.webp';
  const iconByLabel = {
    dashboard: '/icons/dashboard.webp',
    clientes: '/icons/clientes.webp',
    pedidos: '/icons/pedidos.webp',
    entregas: deliveryTruck,
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

    applyLoginIcon();

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
