(() => {
  const text = node => node?.textContent?.trim() || '';

  const metric = (label, value, detail, icon) => `
    <article class="stage2-summary-card">
      <span class="stage2-summary-icon">${icon}</span>
      <small>${label}</small>
      <strong>${value}</strong>
      <span>${detail}</span>
    </article>`;

  const enhancePage = page => {
    const heading = page.querySelector('.page-header h2');
    const title = text(heading);
    if (!['Clientes', 'Pedidos'].includes(title)) return;
    if (page.dataset.stage2Enhanced === '1') return;

    page.dataset.stage2Enhanced = '1';
    page.classList.add('stage2-operations-page', title === 'Clientes' ? 'clients-stage-2' : 'orders-stage-2');

    const header = page.querySelector('.page-header');
    const titleBlock = header?.querySelector('div:first-child');
    if (titleBlock) {
      titleBlock.classList.add('stage2-title-wrap');
      const kicker = document.createElement('span');
      kicker.className = 'stage2-page-kicker';
      kicker.textContent = title === 'Clientes' ? 'Relacionamento e cadastro' : 'Operação e vendas';
      titleBlock.prepend(kicker);
    }

    const toolbar = page.querySelector('.toolbar');
    toolbar?.classList.add('stage2-toolbar');

    const table = page.querySelector('.data-table-wrap');
    table?.classList.add('stage2-table');

    const rows = table ? [...table.querySelectorAll('tbody tr')].filter(row => !row.querySelector('.table-empty')) : [];
    const summary = document.createElement('section');
    summary.className = 'stage2-summary-strip';

    if (title === 'Clientes') {
      const withPhone = rows.filter(row => {
        const phone = text(row.children[1]);
        return phone && phone !== '—';
      }).length;
      const withoutPhone = Math.max(rows.length - withPhone, 0);
      summary.innerHTML = [
        metric('Clientes exibidos', String(rows.length), 'Conforme a pesquisa atual', '◎'),
        metric('Com WhatsApp', String(withPhone), 'Contato disponível', 'W'),
        metric('Sem WhatsApp', String(withoutPhone), 'Cadastro permitido', '—')
      ].join('');
    } else {
      const totals = rows.reduce((acc, row) => {
        const quantity = Number(text(row.children[3]).replace(/[^0-9,.-]/g, '').replace(',', '.')) || 0;
        const value = Number(text(row.children[4]).replace(/[^0-9,.-]/g, '').replace('.', '').replace(',', '.')) || 0;
        const status = text(row.children[7]).toLowerCase();
        acc.quantity += quantity;
        acc.value += value;
        if (status.includes('entregue')) acc.delivered += 1;
        else acc.pending += 1;
        return acc;
      }, { quantity: 0, value: 0, pending: 0, delivered: 0 });
      summary.innerHTML = [
        metric('Pedidos exibidos', String(rows.length), 'Data e filtros atuais', '↗'),
        metric('Quantidade total', String(totals.quantity), 'Unidades nos pedidos', '∑'),
        metric('Pendentes', String(totals.pending), `${totals.delivered} entregue(s)`, '◷'),
        metric('Valor total', totals.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), 'Soma dos itens exibidos', 'R$')
      ].join('');
    }

    if (toolbar) toolbar.before(summary);

    table?.querySelectorAll('.table-actions').forEach(actions => {
      [...actions.querySelectorAll('button')].forEach(button => {
        const label = text(button).toLowerCase();
        if (label === 'editar' || label === 'pago' || label === 'histórico') button.classList.add('stage2-action-primary');
        if (label === 'pdf') button.classList.add('stage2-action-document');
      });
    });
  };

  const enhanceModals = () => {
    document.querySelectorAll('.modal-card').forEach(modal => {
      if (modal.dataset.stage2Enhanced === '1') return;
      const title = text(modal.querySelector('header h2'));
      const isClient = /cliente/i.test(title);
      const isOrder = /pedido/i.test(title);
      if (!isClient && !isOrder) return;

      modal.dataset.stage2Enhanced = '1';
      modal.classList.add('stage2-modal');
      if (isOrder) modal.classList.add('stage2-order-modal');

      const content = modal.querySelector('.modal-content');
      if (!content) return;

      const intro = document.createElement('div');
      intro.className = 'stage2-modal-intro';
      intro.textContent = isClient
        ? 'Cadastre o nome do cliente. O WhatsApp é opcional e pode ser informado depois.'
        : 'Revise cliente, produtos, quantidades e entrega antes de salvar o pedido.';
      content.prepend(intro);
    });
  };

  const enhance = () => {
    document.querySelectorAll('.page-content > .page-stack').forEach(enhancePage);
    enhanceModals();
  };

  const observer = new MutationObserver(enhance);
  window.addEventListener('DOMContentLoaded', () => {
    enhance();
    observer.observe(document.body, { childList: true, subtree: true });
  });
})();
