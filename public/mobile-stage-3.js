(() => {
  const mobileQuery = window.matchMedia('(max-width: 900px)');
  const text = node => node?.textContent?.trim() || '';
  const normalize = value => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

  const keys = ['dashboard', 'clientes', 'pedidos', 'entregas'];
  const navLabel = key => ({ dashboard: 'Início', clientes: 'Clientes', pedidos: 'Pedidos', entregas: 'Entregas' })[key] || key;
  const iconFor = key => key;

  const findSidebarButtons = () => [...document.querySelectorAll('.sidebar-nav button')];
  const sidebarKey = button => {
    const label = normalize(text(button?.querySelector('.nav-label')));
    if (label === 'dashboard') return 'dashboard';
    if (label === 'clientes') return 'clientes';
    if (label === 'pedidos' || label === 'pedido semanal') return 'pedidos';
    if (label === 'entregas') return 'entregas';
    return label;
  };
  const findSidebarButtonByKey = key => findSidebarButtons().find(button => sidebarKey(button) === key);
  const currentKey = () => sidebarKey(findSidebarButtons().find(button => button.classList.contains('active')));

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
    if (alreadyOpen) return;
    document.querySelector('.mobile-menu-btn')?.click();
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
      button.addEventListener('click', () => findSidebarButtonByKey(key)?.click());
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
    document.querySelectorAll('#wr-mobile-bottom-nav button').forEach(button => button.classList.toggle('active', button.dataset.mobileTab === activeKey));
    const quick = document.querySelector('#wr-mobile-quick-order');
    if (quick) quick.hidden = !findSidebarButtonByKey('pedidos');
  }

  function enhanceTables() {
    if (!mobileQuery.matches) return;
    document.querySelectorAll('.stage2-table').forEach(wrapper => {
      wrapper.classList.add('mobile-card-table');
      const headers = [...wrapper.querySelectorAll('thead th')].map(item => text(item));
      wrapper.querySelectorAll('tbody tr').forEach(row => [...row.children].forEach((cell, index) => {
        if (!cell.dataset.label) cell.dataset.label = headers[index] || 'Informação';
      }));
    });
  }

  function cleanupDesktop() {
    if (mobileQuery.matches) return;
    document.querySelectorAll('.mobile-bottom-nav,.mobile-quick-order,.wr-mobile-actions').forEach(node => node.remove());
    document.body.classList.remove('mobile-modal-open');
  }

  let scheduled = false;
  function enhance() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      cleanupDesktop();
      buildMobileActions();
      buildBottomNav();
      syncBottomNav();
      enhanceTables();
      document.body.classList.toggle('mobile-modal-open', Boolean(document.querySelector('.modal-backdrop')));
    });
  }

  window.addEventListener('DOMContentLoaded', () => {
    enhance();
    new MutationObserver(enhance).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  });
  mobileQuery.addEventListener?.('change', enhance);
})();
