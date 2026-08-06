(() => {
  const mobileQuery = window.matchMedia('(max-width: 900px)');
  const text = node => node?.textContent?.trim() || '';
  const normalize = value => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

  const keys = ['dashboard', 'clientes', 'pedidos', 'entregas'];
  const navLabel = key => ({ dashboard: 'Início', clientes: 'Clientes', pedidos: 'Pedidos', entregas: 'Entregas' })[key] || key;
  const iconFor = key => key;
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

  function openQuickOrder() {
    const button = [...document.querySelectorAll('button')].find(item => /novo pedido/i.test(text(item)) && !item.classList.contains('mobile-quick-order'));
    if (button) return button.click();
    findSidebarButtonByKey('pedidos')?.click();
    requestAnimationFrame(() => {
      [...document.querySelectorAll('button')].find(item => /novo pedido/i.test(text(item)) && !item.classList.contains('mobile-quick-order'))?.click();
    });
  }

  function syncData() {
    const sync = document.querySelector('.topbar-actions .sync-btn');
    if (!sync || sync.disabled) return;
    sync.click();
    const action = document.querySelector('#wr-mobile-actions .wr-mobile-sync');
    action?.classList.add('is-syncing');
    setTimeout(() => action?.classList.remove('is-syncing'), 900);
  }

  function logout() {
    const button = [...document.querySelectorAll('.profile-menu button')].find(item => /sair/i.test(text(item)));
    button?.click();
  }

  function buildMobileActions() {
    if (!mobileQuery.matches || !document.querySelector('.app-shell')) return;
    removeDuplicates('.wr-mobile-actions', 'wr-mobile-actions');
    if (document.querySelector('#wr-mobile-actions')) return;

    const actions = document.createElement('div');
    actions.id = 'wr-mobile-actions';
    actions.className = 'wr-mobile-actions';
    actions.setAttribute('aria-label', 'Ações rápidas');
    actions.innerHTML = `
      <button type="button" class="wr-mobile-action wr-mobile-sync" aria-label="Sincronizar dados">
        <i class="wr-system-icon wr-system-sync" aria-hidden="true"></i><span>Sincronizar</span>
      </button>
      <button type="button" class="wr-mobile-action wr-mobile-exit" aria-label="Sair do sistema">
        <i class="wr-system-icon wr-system-exit" aria-hidden="true"></i><span>Sair</span>
      </button>`;
    actions.querySelector('.wr-mobile-sync').addEventListener('click', syncData);
    actions.querySelector('.wr-mobile-exit').addEventListener('click', logout);
    document.querySelector('.topbar')?.insertAdjacentElement('afterend', actions);
  }

  function buildBottomNav() {
    if (!mobileQuery.matches || !document.querySelector('.app-shell')) return;
    removeDuplicates('.mobile-bottom-nav', 'wr-mobile-bottom-nav');
    removeDuplicates('.mobile-quick-order', 'wr-mobile-quick-order');
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
      button.innerHTML = `<span class="mobile-bottom-icon"><i class="wr-brand-icon wr-icon-${iconFor(key)}" aria-hidden="true"></i></span><span>${navLabel(key)}</span>`;
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

    const quick = document.createElement('button');
    quick.id = 'wr-mobile-quick-order';
    quick.type = 'button';
    quick.className = 'mobile-quick-order';
    quick.innerHTML = '<b>+</b><span>Novo pedido</span>';
    quick.addEventListener('click', openQuickOrder);
    document.body.appendChild(quick);
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
    const quick = document.querySelector('#wr-mobile-quick-order');
    if (quick) quick.hidden = !findSidebarButtonByKey('pedidos');
  }

  function enhanceTables() {
    if (!mobileQuery.matches) return;
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
    if (!mobileQuery.matches) return;
    document.querySelectorAll('.page-content > .page-stack').forEach(page => {
      const title = normalize(text(page.querySelector('.page-header h2')));
      if (title !== 'pedidos' && title !== 'pedido semanal') return;
      page.classList.add('stage2-operations-page', 'orders-stage-2');
      page.querySelector('.toolbar')?.classList.add('stage2-toolbar');
      page.querySelector('.data-table-wrap')?.classList.add('stage2-table', 'mobile-card-table', 'wr-mobile-card-table');
    });
  }

  function cleanupDesktop() {
    if (mobileQuery.matches) return;
    document.querySelectorAll('.mobile-bottom-nav,.mobile-quick-order,.wr-mobile-actions').forEach(node => node.remove());
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
      classifySidebarButtons();
      buildMobileActions();
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
  mobileQuery.addEventListener?.('change', enhance);
})();
