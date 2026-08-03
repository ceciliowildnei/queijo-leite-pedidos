(() => {
  const mobileQuery = window.matchMedia('(max-width: 900px)');
  const text = node => node?.textContent?.trim() || '';

  const iconFor = key => {
    if (key === 'dashboard') return 'dashboard';
    if (key === 'clientes') return 'clientes';
    if (key === 'pedidos') return 'pedidos';
    if (key === 'entregas') return 'entregas';
    return '';
  };

  const navLabel = key => ({
    dashboard: 'Início',
    clientes: 'Clientes',
    pedidos: 'Pedidos',
    entregas: 'Entregas',
  })[key] || key;

  const findSidebarButtons = () => [...document.querySelectorAll('.sidebar-nav button')];

  const findSidebarButtonByKey = key => findSidebarButtons().find(button => {
    const label = text(button.querySelector('.nav-label')).toLowerCase();
    return (key === 'dashboard' && label === 'dashboard')
      || (key === 'clientes' && label === 'clientes')
      || (key === 'pedidos' && label === 'pedidos')
      || (key === 'entregas' && label === 'entregas');
  });

  const currentKey = () => {
    const active = findSidebarButtons().find(button => button.classList.contains('active'));
    const label = text(active?.querySelector('.nav-label')).toLowerCase();
    if (label === 'dashboard') return 'dashboard';
    if (label === 'clientes') return 'clientes';
    if (label === 'pedidos') return 'pedidos';
    if (label === 'entregas') return 'entregas';
    return '';
  };

  const openMore = () => {
    const menuButton = document.querySelector('.mobile-menu-btn');
    menuButton?.click();
  };

  const openQuickOrder = () => {
    const candidates = [...document.querySelectorAll('button')];
    const button = candidates.find(item => /novo pedido/i.test(text(item)));
    if (button) {
      button.click();
      return;
    }
    findSidebarButtonByKey('pedidos')?.click();
    requestAnimationFrame(() => {
      const next = [...document.querySelectorAll('button')].find(item => /novo pedido/i.test(text(item)));
      next?.click();
    });
  };

  const buildBottomNav = () => {
    if (!mobileQuery.matches) return;
    const shell = document.querySelector('.app-shell');
    if (!shell || document.querySelector('.mobile-bottom-nav')) return;

    const nav = document.createElement('nav');
    nav.className = 'mobile-bottom-nav';
    nav.setAttribute('aria-label', 'Navegação principal no celular');

    ['dashboard', 'clientes', 'pedidos', 'entregas'].forEach(key => {
      if (!findSidebarButtonByKey(key)) return;
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.mobileTab = key;
      button.innerHTML = `
        <span class="mobile-bottom-icon"><i class="wr-brand-icon wr-icon-${iconFor(key)}" aria-hidden="true"></i></span>
        <span>${navLabel(key)}</span>
      `;
      button.addEventListener('click', () => findSidebarButtonByKey(key)?.click());
      nav.appendChild(button);
    });

    const more = document.createElement('button');
    more.type = 'button';
    more.dataset.mobileTab = 'mais';
    more.innerHTML = '<span class="mobile-bottom-icon mobile-more-icon">•••</span><span>Mais</span>';
    more.addEventListener('click', openMore);
    nav.appendChild(more);

    document.body.appendChild(nav);

    const quick = document.createElement('button');
    quick.type = 'button';
    quick.className = 'mobile-quick-order';
    quick.innerHTML = '<b>+</b><span>Novo pedido</span>';
    quick.addEventListener('click', openQuickOrder);
    document.body.appendChild(quick);
  };

  const syncBottomNav = () => {
    const activeKey = currentKey();
    document.querySelectorAll('.mobile-bottom-nav button').forEach(button => {
      button.classList.toggle('active', button.dataset.mobileTab === activeKey);
    });

    const quick = document.querySelector('.mobile-quick-order');
    if (quick) {
      const allowed = Boolean(findSidebarButtonByKey('pedidos'));
      quick.hidden = !allowed;
    }
  };

  const enhanceTables = () => {
    if (!mobileQuery.matches) return;
    document.querySelectorAll('.stage2-table').forEach(wrapper => {
      wrapper.classList.add('mobile-card-table');
      const headers = [...wrapper.querySelectorAll('thead th')].map(item => text(item));
      wrapper.querySelectorAll('tbody tr').forEach(row => {
        [...row.children].forEach((cell, index) => {
          if (!cell.dataset.label) cell.dataset.label = headers[index] || 'Informação';
        });
      });
    });
  };

  const syncModalState = () => {
    const open = Boolean(document.querySelector('.modal-backdrop'));
    document.body.classList.toggle('mobile-modal-open', open);
  };

  const cleanupDesktop = () => {
    if (mobileQuery.matches) return;
    document.querySelector('.mobile-bottom-nav')?.remove();
    document.querySelector('.mobile-quick-order')?.remove();
    document.body.classList.remove('mobile-modal-open');
  };

  let scheduled = false;
  const enhance = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      cleanupDesktop();
      buildBottomNav();
      syncBottomNav();
      enhanceTables();
      syncModalState();
    });
  };

  const observer = new MutationObserver(enhance);
  window.addEventListener('DOMContentLoaded', () => {
    enhance();
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  });
  mobileQuery.addEventListener?.('change', enhance);
})();
