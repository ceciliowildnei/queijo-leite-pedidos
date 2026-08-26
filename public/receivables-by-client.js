(() => {
  const SUPABASE_URL = 'https://ywwztahbqgiwervbwudg.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_er0Z1O0s1opKniqu3cYkGg_svVBvXRx';
  const headers = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` };
  let currentView = 'overview';
  let cachedOrders = [];
  let searchTerm = '';

  const normalize = value => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  const money = value => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const brDate = value => String(value || '').slice(0,10).split('-').reverse().join('/');
  const isPaid = order => normalize(order.status_pagamento).includes('pago');
  const isCancelled = order => normalize(order.status_pedido).includes('cancel');

  async function loadOrders() {
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/wr_pedidos?select=id,codigo,cliente_nome,produto_nome,quantidade,total,status_pagamento,status_pedido,data_entrega,forma_pagamento&order=cliente_nome.asc`, { headers, cache: 'no-store' });
      if (!response.ok) throw new Error(`Falha ao carregar valores (${response.status}).`);
      cachedOrders = await response.json();
    } catch (error) {
      console.error(error);
      cachedOrders = [];
    }
  }

  function aggregateByClient() {
    const open = cachedOrders.filter(order => !isCancelled(order) && !isPaid(order));
    const map = new Map();
    open.forEach(order => {
      const key = normalize(order.cliente_nome) || 'sem cliente';
      const current = map.get(key) || {
        cliente: order.cliente_nome || 'Sem cliente',
        total: 0,
        pedidos: 0,
        itens: 0,
        datas: [],
        detalhes: []
      };
      current.total += Number(order.total || 0);
      current.pedidos += 1;
      current.itens += Number(order.quantidade || 0);
      if (order.data_entrega) current.datas.push(String(order.data_entrega).slice(0,10));
      current.detalhes.push(order);
      map.set(key, current);
    });
    return [...map.values()].sort((a,b) => a.cliente.localeCompare(b.cliente, 'pt-BR'));
  }

  function clientCards() {
    let clients = aggregateByClient();
    if (searchTerm) clients = clients.filter(item => normalize(item.cliente).includes(normalize(searchTerm)));
    if (!clients.length) return '<div class="wr-client-receivable-empty">Nenhum valor em aberto encontrado.</div>';

    return clients.map(item => {
      const firstDate = item.datas.length ? item.datas.slice().sort()[0] : '';
      const details = item.detalhes.slice().sort((a,b) => String(a.data_entrega || '').localeCompare(String(b.data_entrega || '')));
      return `<article class="wr-client-receivable-card">
        <div class="wr-client-receivable-head">
          <div><span>Cliente</span><strong>${item.cliente}</strong></div>
          <strong class="wr-client-receivable-total">${money(item.total)}</strong>
        </div>
        <div class="wr-client-receivable-meta">
          <span>${item.pedidos} pedido(s)</span>
          <span>${item.itens} unidade(s)</span>
          <span>${firstDate ? `Mais antigo: ${brDate(firstDate)}` : 'Sem data'}</span>
        </div>
        <details>
          <summary>Ver pedidos</summary>
          <div class="wr-client-receivable-orders">
            ${details.map(order => `<div><span><strong>${order.codigo || 'Sem código'}</strong><small>${order.produto_nome || 'Produto'} · ${brDate(order.data_entrega)}</small></span><strong>${money(order.total)}</strong></div>`).join('')}
          </div>
        </details>
      </article>`;
    }).join('');
  }

  function renderClientPanel(panel) {
    const clients = aggregateByClient();
    const total = clients.reduce((sum,item) => sum + item.total, 0);
    panel.innerHTML = `
      <div class="wr-client-receivable-summary">
        <div><span>Total a receber</span><strong>${money(total)}</strong></div>
        <div><span>Clientes com pendência</span><strong>${clients.length}</strong></div>
      </div>
      <div class="wr-client-receivable-toolbar">
        <input id="wr-client-receivable-search" type="search" placeholder="Buscar cliente..." value="${searchTerm.replace(/"/g,'&quot;')}" />
      </div>
      <div class="wr-client-receivable-list">${clientCards()}</div>`;
    panel.querySelector('#wr-client-receivable-search')?.addEventListener('input', event => {
      searchTerm = event.target.value;
      renderClientPanel(panel);
    });
  }

  function applyView(root) {
    [...root.children].forEach(child => {
      if (child.id === 'wr-cash-view-tabs' || child.id === 'wr-client-receivable-panel') return;
      child.style.display = currentView === 'overview' ? '' : 'none';
    });
    const panel = root.querySelector('#wr-client-receivable-panel');
    if (panel) panel.style.display = currentView === 'clients' ? '' : 'none';
    root.querySelectorAll('#wr-cash-view-tabs button').forEach(button => {
      button.classList.toggle('active', button.dataset.cashView === currentView);
    });
  }

  async function ensure() {
    const title = document.querySelector('.topbar-title h1')?.textContent?.trim();
    if (normalize(title) !== 'caixa') return;
    const root = document.querySelector('#wr-financial-control');
    if (!root) return;

    let tabs = root.querySelector('#wr-cash-view-tabs');
    if (!tabs) {
      tabs = document.createElement('div');
      tabs.id = 'wr-cash-view-tabs';
      tabs.className = 'wr-cash-view-tabs';
      tabs.innerHTML = '<button type="button" data-cash-view="overview">Visão geral</button><button type="button" data-cash-view="clients">A receber por cliente</button>';
      root.prepend(tabs);
      tabs.addEventListener('click', async event => {
        const button = event.target.closest('[data-cash-view]');
        if (!button) return;
        currentView = button.dataset.cashView;
        if (currentView === 'clients') {
          await loadOrders();
          const panel = root.querySelector('#wr-client-receivable-panel');
          if (panel) renderClientPanel(panel);
        }
        applyView(root);
      });
    }

    let panel = root.querySelector('#wr-client-receivable-panel');
    if (!panel) {
      panel = document.createElement('section');
      panel.id = 'wr-client-receivable-panel';
      panel.className = 'wr-client-receivable-panel';
      panel.style.display = 'none';
      root.appendChild(panel);
    }

    applyView(root);
  }

  let scheduled = false;
  function refresh() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      ensure();
    });
  }

  window.addEventListener('DOMContentLoaded', () => {
    refresh();
    new MutationObserver(refresh).observe(document.body, { childList: true, subtree: true });
  });
})();
