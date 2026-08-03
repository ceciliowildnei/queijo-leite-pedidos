(() => {
  const SUPABASE_URL = 'https://ywwztahbqgiwervbwudg.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_er0Z1O0s1opKniqu3cYkGg_svVBvXRx';
  const API = `${SUPABASE_URL}/rest/v1/wr_pedidos`;
  const headers = {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    Accept: 'application/json'
  };

  let panel;
  let bell;
  let notifications = [];

  const normalize = value => String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

  const isCanceled = order => normalize(order.status_pedido).includes('cancel');
  const isoDate = value => String(value || '').slice(0, 10);
  const today = () => new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());

  const formatDate = value => {
    const date = isoDate(value);
    if (!date) return 'Sem data';
    return date.split('-').reverse().join('/');
  };

  const money = value => Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });

  function closePanel() {
    panel?.classList.remove('open');
    bell?.setAttribute('aria-expanded', 'false');
  }

  function goToSection(text) {
    const buttons = [...document.querySelectorAll('.sidebar-nav button')];
    const target = buttons.find(button => normalize(button.textContent).includes(normalize(text)));
    target?.click();
    closePanel();
  }

  function renderPanel() {
    if (!panel) return;
    const body = panel.querySelector('.wr-notification-body');
    const badge = bell?.querySelector('span');
    if (badge) {
      badge.textContent = String(notifications.length);
      badge.hidden = notifications.length === 0;
    }

    if (!notifications.length) {
      body.innerHTML = `
        <div class="wr-notification-empty">
          <strong>Tudo certo!</strong>
          <span>Nenhuma pendência encontrada.</span>
        </div>`;
      return;
    }

    body.innerHTML = notifications.map(item => `
      <button type="button" class="wr-notification-item" data-section="${item.section}">
        <span class="wr-notification-icon">${item.icon}</span>
        <span class="wr-notification-copy">
          <strong>${item.title}</strong>
          <small>${item.description}</small>
        </span>
      </button>`).join('');

    body.querySelectorAll('[data-section]').forEach(button => {
      button.addEventListener('click', () => goToSection(button.dataset.section));
    });
  }

  function buildNotifications(orders) {
    const current = today();
    const active = orders.filter(order => !isCanceled(order));
    const todayOrders = active.filter(order => isoDate(order.data_entrega) === current);
    const pendingToday = todayOrders.filter(order => normalize(order.status_pedido) !== 'entregue');
    const unpaid = active.filter(order => !normalize(order.status_pagamento).includes('pago'));
    const future = active
      .filter(order => isoDate(order.data_entrega) > current && normalize(order.status_pedido) !== 'entregue')
      .sort((a, b) => isoDate(a.data_entrega).localeCompare(isoDate(b.data_entrega)));

    const next = [];

    if (pendingToday.length) {
      next.push({
        icon: '🚚',
        title: `${pendingToday.length} entrega(s) pendente(s) hoje`,
        description: `${pendingToday[0]?.cliente_nome || 'Cliente'}${pendingToday.length > 1 ? ` e mais ${pendingToday.length - 1}` : ''}`,
        section: 'Entregas'
      });
    }

    if (unpaid.length) {
      next.push({
        icon: '💰',
        title: `${unpaid.length} pagamento(s) pendente(s)`,
        description: `Total em aberto: ${money(unpaid.reduce((sum, order) => sum + Number(order.total || 0), 0))}`,
        section: 'Pedidos'
      });
    }

    if (future.length) {
      next.push({
        icon: '📅',
        title: `${future.length} próxima(s) entrega(s)`,
        description: `A mais próxima está marcada para ${formatDate(future[0].data_entrega)}`,
        section: 'Entregas'
      });
    }

    const recent = active
      .filter(order => order.criado_em)
      .sort((a, b) => String(b.criado_em).localeCompare(String(a.criado_em)))[0];
    if (recent) {
      next.push({
        icon: '📦',
        title: 'Pedido mais recente',
        description: `${recent.cliente_nome || 'Cliente'} · ${recent.produto_nome || 'Produto'} · ${money(recent.total)}`,
        section: 'Pedidos'
      });
    }

    notifications = next.slice(0, 4);
    renderPanel();
  }

  async function loadNotifications() {
    try {
      const response = await fetch(`${API}?select=id,codigo,cliente_nome,produto_nome,total,data_entrega,status_pedido,status_pagamento,criado_em&order=criado_em.desc&limit=200`, { headers });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      buildNotifications(await response.json());
    } catch (error) {
      console.warn('Notificações Queijos WR:', error);
      notifications = [{
        icon: '⚠️',
        title: 'Não foi possível atualizar',
        description: 'Clique em sincronizar e tente novamente.',
        section: 'Dashboard'
      }];
      renderPanel();
    }
  }

  function mount() {
    bell = document.querySelector('.notification-btn');
    if (!bell || bell.dataset.notificationReady === '1') return false;
    bell.dataset.notificationReady = '1';
    bell.type = 'button';
    bell.innerHTML = '🔔<span hidden>0</span>';
    bell.setAttribute('aria-label', 'Abrir notificações');
    bell.setAttribute('aria-expanded', 'false');

    panel = document.createElement('aside');
    panel.className = 'wr-notification-panel';
    panel.innerHTML = `
      <header>
        <div>
          <strong>Notificações</strong>
          <small>Atualizadas com os pedidos</small>
        </div>
        <button type="button" class="wr-notification-refresh" title="Atualizar">↻</button>
      </header>
      <div class="wr-notification-body">
        <div class="wr-notification-loading">Carregando...</div>
      </div>`;
    document.body.appendChild(panel);

    bell.addEventListener('click', event => {
      event.stopPropagation();
      const open = panel.classList.toggle('open');
      bell.setAttribute('aria-expanded', String(open));
      if (open) loadNotifications();
    });
    panel.addEventListener('click', event => event.stopPropagation());
    panel.querySelector('.wr-notification-refresh').addEventListener('click', loadNotifications);
    document.addEventListener('click', closePanel);
    document.addEventListener('keydown', event => event.key === 'Escape' && closePanel());

    loadNotifications();
    setInterval(loadNotifications, 60000);
    return true;
  }

  const observer = new MutationObserver(() => mount());
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('DOMContentLoaded', mount);
  mount();
})();
