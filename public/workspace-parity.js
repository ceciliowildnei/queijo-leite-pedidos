(() => {
  const labels = {
    dashboard: 'Visão geral',
    clientes: 'Clientes',
    produtos: 'Produtos',
    pedidos: 'Pedidos',
    entregas: 'Entregas',
    caixa: 'Caixa',
    relatorios: 'Relatórios',
    administracao: 'Colaboradores',
    pdfs: 'Comprovantes',
  };

  const mobileItems = [
    ['dashboard', '⌂', 'Início'],
    ['pedidos', '▣', 'Pedidos'],
    ['entregas', '▤', 'Entregas'],
    ['clientes', '◎', 'Clientes'],
    ['menu', '☰', 'Menu'],
  ];

  function normalize(value) {
    return String(value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '');
  }

  function sidebarButtons() {
    return Array.from(document.querySelectorAll('.sidebar-nav button'));
  }

  function findButton(key) {
    const wanted = normalize(labels[key] || key);
    const aliases = {
      dashboard: ['dashboard', 'visao geral'],
      administracao: ['administracao', 'colaboradores'],
      pdfs: ['pdfs', 'comprovantes', 'pdfs e comprovantes'],
    };
    const terms = aliases[key] || [wanted];
    return sidebarButtons().find(button => terms.some(term => normalize(button.textContent).includes(normalize(term))));
  }

  function activeKey() {
    const active = document.querySelector('.sidebar-nav button.active');
    if (!active) return 'dashboard';
    const text = normalize(active.textContent);
    return Object.keys(labels).find(key => {
      const aliases = {
        dashboard: ['dashboard', 'visao geral'],
        administracao: ['administracao', 'colaboradores'],
        pdfs: ['pdfs', 'comprovantes'],
      };
      return (aliases[key] || [labels[key]]).some(term => text.includes(normalize(term)));
    }) || 'dashboard';
  }

  function renameNavigation() {
    sidebarButtons().forEach(button => {
      const text = normalize(button.textContent);
      let key = Object.keys(labels).find(item => {
        const aliases = {
          dashboard: ['dashboard', 'visao geral'],
          administracao: ['administracao', 'colaboradores'],
          pdfs: ['pdfs', 'comprovantes'],
        };
        return (aliases[item] || [item]).some(term => text.includes(normalize(term)));
      });
      if (!key) return;
      const label = button.querySelector('.nav-label');
      if (label) label.textContent = labels[key];
      button.title = labels[key];
    });

    const title = document.querySelector('.topbar-title h1');
    const key = activeKey();
    if (title && labels[key]) title.textContent = labels[key];
  }

  function ensureWelcome() {
    const stack = document.querySelector('.page-content .page-stack');
    if (!stack) return;
    const key = activeKey();
    document.body.classList.toggle('workspace-week-mode', key === 'dashboard' && localStorage.getItem('wr_dashboard_mode') === 'week');

    const existing = stack.querySelector('.workspace-welcome');
    if (key !== 'dashboard') {
      existing?.remove();
      return;
    }

    if (existing) return;
    const adminName = document.querySelector('.profile-menu strong')?.textContent?.trim() || 'Wildnei';
    const card = document.createElement('section');
    card.className = 'workspace-welcome';
    card.innerHTML = `
      <div class="workspace-welcome-copy">
        <small>Queijos WR Pedidos</small>
        <h2>Olá, ${adminName}!</h2>
        <p>Resumo da operação com pedidos e recebimentos em uma visão única.</p>
      </div>
      <button type="button">Ver próximas entregas</button>
    `;
    card.querySelector('button').addEventListener('click', () => findButton('entregas')?.click());
    const header = stack.querySelector('.page-header');
    if (header) header.insertAdjacentElement('afterend', card);
    else stack.prepend(card);
  }

  function ensureMobileNav() {
    if (document.querySelector('.workspace-mobile-nav')) return;
    const nav = document.createElement('nav');
    nav.className = 'workspace-mobile-nav';
    mobileItems.forEach(([key, icon, label]) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.key = key;
      button.innerHTML = `<i>${icon}</i><span>${label}</span>`;
      button.addEventListener('click', () => {
        if (key === 'menu') {
          document.querySelector('.mobile-menu-btn')?.click();
        } else {
          findButton(key)?.click();
        }
        setTimeout(sync, 100);
      });
      nav.appendChild(button);
    });
    document.body.appendChild(nav);
  }

  function syncMobile() {
    const key = activeKey();
    document.querySelectorAll('.workspace-mobile-nav button').forEach(button => {
      button.classList.toggle('active', button.dataset.key === key || (button.dataset.key === 'menu' && !['dashboard', 'pedidos', 'entregas', 'clientes'].includes(key)));
    });
  }

  function sync() {
    renameNavigation();
    ensureWelcome();
    ensureMobileNav();
    syncMobile();
  }

  document.addEventListener('DOMContentLoaded', sync);
  document.addEventListener('click', () => setTimeout(sync, 80), true);
  window.addEventListener('resize', sync);
  new MutationObserver(() => sync()).observe(document.documentElement, { childList: true, subtree: true });
  setInterval(sync, 1200);
})();
