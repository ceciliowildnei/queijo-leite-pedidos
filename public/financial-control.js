(() => {
  const SUPABASE_URL = 'https://ywwztahbqgiwervbwudg.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_er0Z1O0s1opKniqu3cYkGg_svVBvXRx';
  const headers = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' };
  const state = { period: 'month', orders: [], outputs: [], selectedDate: '' };

  const normalize = value => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  const number = value => Number(value || 0);
  const money = value => number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const dateOnly = value => String(value || '').slice(0, 10);
  const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const brDate = value => dateOnly(value) ? dateOnly(value).split('-').reverse().join('/') : '—';
  const sum = (items, key) => items.reduce((total, item) => total + number(item[key]), 0);
  const isPaid = order => normalize(order.status_pagamento).includes('pago');
  const isCancelled = order => normalize(order.status_pedido).includes('cancel');

  async function getJson(path) {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers, cache: 'no-store' });
    if (!response.ok) throw new Error(`Falha ao carregar o caixa (${response.status}).`);
    return response.json();
  }

  async function syncOutputs(local) {
    try {
      const rows = await getJson('wr_config?chave=eq.cash_outs&select=valor');
      const remote = Array.isArray(rows?.[0]?.valor) ? rows[0].valor : [];
      const merged = [...remote];
      local.forEach(item => {
        if (!merged.some(entry => String(entry.id) === String(item.id))) merged.push(item);
      });
      if (merged.length !== remote.length) {
        await fetch(`${SUPABASE_URL}/rest/v1/wr_config?on_conflict=chave`, {
          method: 'POST',
          headers: { ...headers, Prefer: 'resolution=merge-duplicates' },
          body: JSON.stringify([{ chave: 'cash_outs', valor: merged }]),
        });
      }
      return merged;
    } catch (error) {
      console.warn(error);
      return local;
    }
  }

  function selectedOperationalDate() {
    return document.querySelector('.date-control input[type="date"]')?.value || today();
  }

  function inPeriod(value) {
    const date = dateOnly(value);
    if (state.period === 'all') return true;
    if (state.period === 'day') return date === state.selectedDate;
    return date.startsWith(state.selectedDate.slice(0, 7));
  }

  function periodLabel() {
    if (state.period === 'all') return 'Todo o histórico';
    if (state.period === 'day') return brDate(state.selectedDate);
    const [year, month] = state.selectedDate.split('-').map(Number);
    const label = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date(year, month - 1, 1));
    return label.charAt(0).toUpperCase() + label.slice(1);
  }

  function metric(label, value, note, tone = '') {
    return `<article class="cash-summary-card ${tone}"><span>${label}</span><strong>${value}</strong><small>${note}</small></article>`;
  }

  function renderTableRows(items, type) {
    if (!items.length) return '<tr><td colspan="6" class="cash-financial-empty">Nenhuma movimentação encontrada.</td></tr>';
    return items.map(item => {
      if (type === 'pending') {
        const overdue = dateOnly(item.data_entrega) < today();
        return `<tr><td>${brDate(item.data_entrega)}</td><td>${item.cliente_nome || '—'}</td><td>${item.codigo || '—'}</td><td>${item.forma_pagamento || 'Não informado'}</td><td><span class="cash-state ${overdue ? 'overdue' : 'pending'}">${overdue ? 'Em atraso' : 'Pendente'}</span></td><td><strong>${money(item.total)}</strong></td></tr>`;
      }
      return `<tr><td>${brDate(item.data)}</td><td>${item.descricao || 'Saída'}</td><td><span class="cash-state expense">Despesa</span></td><td class="negative">-${money(item.valor)}</td></tr>`;
    }).join('');
  }

  function render() {
    const pageTitle = document.querySelector('.topbar-title h1')?.textContent?.trim();
    if (normalize(pageTitle) !== 'caixa') {
      document.querySelector('#wr-financial-control')?.remove();
      return;
    }

    state.selectedDate = selectedOperationalDate();
    const active = state.orders.filter(order => !isCancelled(order));
    const cancelled = state.orders.filter(isCancelled);
    const periodOrders = active.filter(order => inPeriod(order.data_entrega));
    const periodOutputs = state.outputs.filter(item => inPeriod(item.data));
    const paid = periodOrders.filter(isPaid);
    const pending = periodOrders.filter(order => !isPaid(order));
    const overdue = pending.filter(order => dateOnly(order.data_entrega) < today());
    const future = pending.filter(order => dateOnly(order.data_entrega) >= today());

    const gross = sum(periodOrders, 'total');
    const received = sum(paid, 'total');
    const receivable = sum(pending, 'total');
    const expenses = sum(periodOutputs, 'valor');
    const balance = received - expenses;

    const allReceived = sum(active.filter(isPaid), 'total');
    const allReceivable = sum(active.filter(order => !isPaid(order)), 'total');
    const allExpenses = sum(state.outputs, 'valor');
    const allBalance = allReceived - allExpenses;
    const receiptRate = gross > 0 ? Math.round((received / gross) * 100) : 0;

    const paymentMap = paid.reduce((acc, order) => {
      const name = order.forma_pagamento || 'Não informado';
      acc[name] = acc[name] || { count: 0, value: 0 };
      acc[name].count += 1;
      acc[name].value += number(order.total);
      return acc;
    }, {});
    const payments = Object.entries(paymentMap).sort((a, b) => b[1].value - a[1].value);

    let root = document.querySelector('#wr-financial-control');
    if (!root) {
      root = document.createElement('section');
      root.id = 'wr-financial-control';
      root.className = 'wr-financial-control';
      const page = document.querySelector('.page-content .page-stack');
      const header = page?.querySelector('.page-header');
      if (!page) return;
      header?.insertAdjacentElement('afterend', root);
      if (!header) page.prepend(root);
    }

    root.innerHTML = `
      <div class="cash-overview-hero">
        <div class="cash-overview-primary"><span>Saldo geral disponível</span><strong class="${allBalance < 0 ? 'negative' : ''}">${money(allBalance)}</strong><small>Total recebido menos todas as saídas registradas.</small></div>
        <div class="cash-overview-breakdown">
          <div><span>Total recebido</span><strong>${money(allReceived)}</strong></div>
          <div><span>Total a receber</span><strong>${money(allReceivable)}</strong></div>
          <div><span>Total de saídas</span><strong>${money(allExpenses)}</strong></div>
          <div><span>Pedidos ativos</span><strong>${active.length}</strong></div>
          <div><span>Cancelados</span><strong>${cancelled.length}</strong></div>
        </div>
      </div>
      <div class="cash-period-control"><div><span>Período analisado</span><strong>${periodLabel()}</strong></div><div class="cash-period-tabs"><button data-period="day" class="${state.period === 'day' ? 'active' : ''}">Dia</button><button data-period="month" class="${state.period === 'month' ? 'active' : ''}">Mês</button><button data-period="all" class="${state.period === 'all' ? 'active' : ''}">Geral</button></div></div>
      <div class="cash-summary-grid">
        ${metric('Vendas do período', money(gross), `${periodOrders.length} lançamento(s)`, 'sales')}
        ${metric('Entradas confirmadas', money(received), `${paid.length} recebimento(s)`, 'income')}
        ${metric('A receber', money(receivable), `${pending.length} pendência(s)`, 'pending')}
        ${metric('Saídas', money(expenses), `${periodOutputs.length} despesa(s)`, 'expense')}
        ${metric('Resultado do período', money(balance), balance >= 0 ? 'Saldo positivo' : 'Saldo negativo', balance >= 0 ? 'balance' : 'expense')}
      </div>
      <div class="cash-health-grid">
        <article class="cash-financial-panel"><header><h3>Situação dos recebimentos</h3><strong>${receiptRate}% recebido</strong></header><div class="cash-progress-track"><span style="width:${Math.min(receiptRate, 100)}%"></span></div><div class="cash-status-list"><div><span>Recebidos</span><strong>${paid.length}</strong><small>${money(received)}</small></div><div><span>Pendentes</span><strong>${pending.length}</strong><small>${money(receivable)}</small></div><div class="${overdue.length ? 'attention' : ''}"><span>Em atraso</span><strong>${overdue.length}</strong><small>${money(sum(overdue, 'total'))}</small></div><div><span>A vencer</span><strong>${future.length}</strong><small>${money(sum(future, 'total'))}</small></div></div></article>
        <article class="cash-financial-panel"><header><h3>Entradas por forma de pagamento</h3></header><div class="cash-payment-list">${payments.length ? payments.map(([name, item]) => `<div><span>${name}</span><small>${item.count} pagamento(s)</small><strong>${money(item.value)}</strong></div>`).join('') : '<p class="cash-financial-empty">Nenhuma entrada confirmada.</p>'}</div></article>
      </div>
      <div class="cash-table-grid">
        <article class="cash-financial-panel"><header><h3>Contas a receber</h3></header><div class="cash-table-scroll"><table><thead><tr><th>Data</th><th>Cliente</th><th>Pedido</th><th>Forma</th><th>Situação</th><th>Valor</th></tr></thead><tbody>${renderTableRows(pending, 'pending')}</tbody></table></div></article>
        <article class="cash-financial-panel"><header><h3>Saídas registradas</h3></header><div class="cash-table-scroll"><table><thead><tr><th>Data</th><th>Descrição</th><th>Tipo</th><th>Valor</th></tr></thead><tbody>${renderTableRows(periodOutputs, 'outputs')}</tbody></table></div></article>
      </div>`;

    root.querySelectorAll('[data-period]').forEach(button => button.addEventListener('click', () => {
      state.period = button.dataset.period;
      render();
    }));
  }

  async function refresh() {
    const pageTitle = normalize(document.querySelector('.topbar-title h1')?.textContent);
    if (pageTitle !== 'caixa') return render();
    try {
      const [orders, remoteConfig] = await Promise.all([
        getJson('wr_pedidos?select=*'),
        getJson('wr_config?chave=eq.cash_outs&select=valor'),
      ]);
      const local = (() => { try { return JSON.parse(localStorage.getItem('wr_caixa_saidas') || '[]'); } catch { return []; } })();
      const remote = Array.isArray(remoteConfig?.[0]?.valor) ? remoteConfig[0].valor : [];
      state.orders = Array.isArray(orders) ? orders : [];
      state.outputs = await syncOutputs([...remote, ...local.filter(item => !remote.some(entry => String(entry.id) === String(item.id)))]);
      render();
    } catch (error) {
      console.error(error);
      render();
    }
  }

  let timer;
  const schedule = () => {
    clearTimeout(timer);
    timer = setTimeout(refresh, 120);
  };
  window.addEventListener('DOMContentLoaded', () => {
    schedule();
    new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true, characterData: true });
    document.addEventListener('change', event => {
      if (event.target.matches('.date-control input[type="date"]')) schedule();
    });
  });
})();
