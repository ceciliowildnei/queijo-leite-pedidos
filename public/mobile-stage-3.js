(() => {
  const widthQuery = window.matchMedia('(max-width: 900px)');
  const touchQuery = window.matchMedia('(pointer: coarse), (hover: none)');
  const mobileUserAgent = /Android|iPhone|iPad|iPod|Mobile|IEMobile|Opera Mini/i.test(navigator.userAgent || '');
  const isMobileExperience = () => widthQuery.matches && (touchQuery.matches || mobileUserAgent);
  const text = node => node?.textContent?.trim() || '';
  const normalize = value => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

  const keys = ['dashboard', 'clientes', 'pedidos', 'entregas'];
  const navLabel = key => ({ dashboard: 'Início', clientes: 'Clientes', pedidos: 'Pedidos', entregas: 'Entregas' })[key] || key;
  let moreRequested = false;

  const findSidebarButtons = () => [...document.querySelectorAll('.sidebar-nav button')];
  const sidebarKey = button => {
    const label = normalize(text(button?.querySelector('.nav-label')));
    if (label === 'dashboard' || label === 'inicio') return 'dashboard';
    if (label === 'clientes') return 'clientes';
    if (label === 'pedidos' || label === 'pedido semanal') return 'pedidos';
    if (label === 'entregas') return 'entregas';
    if (label === 'produtos') return 'produtos';
    if (label === 'caixa' || label === 'controle financeiro') return 'caixa';
    if (label === 'relatorios') return 'relatorios';
    if (label === 'administracao') return 'administracao';
    if (label.includes('pdf')) return 'pdfs';
    return label;
  };
  const findSidebarButtonByKey = key => findSidebarButtons().find(button => sidebarKey(button) === key);
  const currentKey = () => sidebarKey(findSidebarButtons().find(button => button.classList.contains('active')));

  function classifySidebarButtons() {
    findSidebarButtons().forEach(button => {
      const key = sidebarKey(button);
      button.dataset.wrMobileKey = key;
      button.dataset.wrMobilePrimary = keys.includes(key) ? 'true' : 'false';
    });
  }

  function setMoreMode(enabled) {
    document.documentElement.classList.toggle('wr-mobile-more-open', Boolean(enabled));
  }

  function removeDuplicates(selector, keepId) {
    const nodes = [...document.querySelectorAll(selector)];
    nodes.forEach((node, index) => {
      if (index === 0) {
        if (keepId) node.id = keepId;
        return;
      }
      node.remove();
    });
  }

  function openMore() {
    const shell = document.querySelector('.app-shell');
    const alreadyOpen = shell?.classList.contains('mobile-menu-open') || document.querySelector('.sidebar-backdrop.show');
    moreRequested = true;
    setMoreMode(true);
    if (!alreadyOpen) document.querySelector('.mobile-menu-btn')?.click();
    setTimeout(() => { moreRequested = false; }, 0);
  }

  function syncData() {
    const sync = document.querySelector('.topbar-actions .sync-btn');
    if (!sync || sync.disabled) return;
    sync.click();
    const action = document.querySelector('.wr-mobile-more-sync');
    action?.classList.add('is-syncing');
    setTimeout(() => action?.classList.remove('is-syncing'), 900);
  }

  function logout() {
    const button = [...document.querySelectorAll('.profile-menu button')].find(item => /sair/i.test(text(item)));
    button?.click();
  }

  function buildMoreActions() {
    if (!isMobileExperience()) return;
    const sidebar = document.querySelector('.sidebar');
    const sidebarNav = sidebar?.querySelector('.sidebar-nav');
    if (!sidebar || !sidebarNav) return;

    removeDuplicates('.wr-mobile-more-actions', 'wr-mobile-more-actions');
    const current = document.querySelector('#wr-mobile-more-actions');
    if (current) {
      if (current.nextElementSibling !== sidebarNav) sidebar.insertBefore(current, sidebarNav);
      return;
    }

    const actions = document.createElement('div');
    actions.id = 'wr-mobile-more-actions';
    actions.className = 'wr-mobile-more-actions wr-mobile-more-top-actions';
    actions.setAttribute('aria-label', 'Ações rápidas do sistema');
    actions.innerHTML = `
      <button type="button" class="wr-mobile-more-sync" aria-label="Sincronizar dados">
        <i class="wr-system-icon wr-system-sync" aria-hidden="true"></i><span>Sincronizar</span>
      </button>
      <button type="button" class="wr-mobile-more-exit" aria-label="Sair do sistema">
        <i class="wr-system-icon wr-system-exit" aria-hidden="true"></i><span>Sair</span>
      </button>`;
    actions.querySelector('.wr-mobile-more-sync').addEventListener('click', syncData);
    actions.querySelector('.wr-mobile-more-exit').addEventListener('click', logout);
    sidebar.insertBefore(actions, sidebarNav);
  }

  function buildBottomNav() {
    if (!isMobileExperience() || !document.querySelector('.app-shell')) return;
    removeDuplicates('.mobile-bottom-nav', 'wr-mobile-bottom-nav');
    document.querySelectorAll('.mobile-quick-order,.wr-mobile-actions').forEach(node => node.remove());
    if (document.querySelector('#wr-mobile-bottom-nav')) return;

    const nav = document.createElement('nav');
    nav.id = 'wr-mobile-bottom-nav';
    nav.className = 'mobile-bottom-nav';
    nav.setAttribute('aria-label', 'Navegação principal no celular');

    keys.forEach(key => {
      if (!findSidebarButtonByKey(key)) return;
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.mobileTab = key;
      button.innerHTML = `<span class="mobile-bottom-icon"><i class="wr-brand-icon wr-icon-${key}" aria-hidden="true"></i></span><span>${navLabel(key)}</span>`;
      button.addEventListener('click', () => {
        setMoreMode(false);
        findSidebarButtonByKey(key)?.click();
      });
      nav.appendChild(button);
    });

    const more = document.createElement('button');
    more.type = 'button';
    more.dataset.mobileTab = 'mais';
    more.innerHTML = '<span class="mobile-bottom-icon"><i class="wr-system-icon wr-system-more" aria-hidden="true"></i></span><span>Mais</span>';
    more.addEventListener('click', openMore);
    nav.appendChild(more);
    document.body.appendChild(nav);
  }

  function syncBottomNav() {
    const activeKey = currentKey();
    const isSecondary = Boolean(activeKey) && !keys.includes(activeKey);
    document.querySelectorAll('#wr-mobile-bottom-nav button').forEach(button => {
      const shouldActivate = button.dataset.mobileTab === activeKey || (button.dataset.mobileTab === 'mais' && isSecondary);
      button.classList.toggle('active', shouldActivate);
      if (shouldActivate) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });
  }

  function enhanceTables() {
    if (!isMobileExperience()) return;
    document.querySelectorAll('.data-table-wrap').forEach(wrapper => {
      const table = wrapper.querySelector('table');
      const headers = [...wrapper.querySelectorAll('thead th')].map(item => text(item));
      if (!table || !headers.length || wrapper.classList.contains('wr-keep-table-scroll')) return;

      wrapper.classList.add('mobile-card-table', 'wr-mobile-card-table');
      wrapper.querySelectorAll('tbody tr').forEach(row => {
        const cells = [...row.children];
        if (row.querySelector('.table-empty')) {
          row.classList.add('wr-mobile-empty-row');
          return;
        }
        cells.forEach((cell, index) => {
          if (!cell.dataset.label) cell.dataset.label = headers[index] || 'Informação';
        });
      });
    });
  }

  function enhanceWeeklyOrders() {
    if (!isMobileExperience()) return;
    document.querySelectorAll('.page-content > .page-stack').forEach(page => {
      const title = normalize(text(page.querySelector('.page-header h2')));
      if (title !== 'pedidos' && title !== 'pedido semanal') return;
      page.classList.add('stage2-operations-page', 'orders-stage-2');
      page.querySelector('.toolbar')?.classList.add('stage2-toolbar');
      page.querySelector('.data-table-wrap')?.classList.add('stage2-table', 'mobile-card-table', 'wr-mobile-card-table');
    });
  }

  function cleanupDesktop() {
    if (isMobileExperience()) return;
    document.querySelectorAll('.mobile-bottom-nav,.mobile-quick-order,.wr-mobile-actions,.wr-mobile-more-actions').forEach(node => node.remove());
    document.body.classList.remove('mobile-modal-open');
    setMoreMode(false);
  }

  function handleNavigationClick(event) {
    const target = event.target.closest('button, .sidebar-backdrop');
    if (!target) return;

    if (target.matches('#wr-mobile-bottom-nav [data-mobile-tab="mais"]')) {
      moreRequested = true;
      setMoreMode(true);
      return;
    }

    if (target.matches('.mobile-menu-btn') && !moreRequested) {
      setMoreMode(false);
      return;
    }

    if (target.matches('.sidebar-backdrop, .sidebar-nav button')) {
      setMoreMode(false);
    }
  }

  let scheduled = false;
  function enhance() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      cleanupDesktop();
      if (!isMobileExperience()) return;
      classifySidebarButtons();
      buildMoreActions();
      buildBottomNav();
      syncBottomNav();
      enhanceWeeklyOrders();
      enhanceTables();
      document.body.classList.toggle('mobile-modal-open', Boolean(document.querySelector('.modal-backdrop')));
    });
  }

  document.addEventListener('click', handleNavigationClick, true);
  window.addEventListener('DOMContentLoaded', () => {
    enhance();
    new MutationObserver(enhance).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  });
  widthQuery.addEventListener?.('change', enhance);
  touchQuery.addEventListener?.('change', enhance);
  window.addEventListener('resize', enhance, { passive: true });
})();
