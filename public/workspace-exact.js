(() => {
  const norm = value => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');

  function findNav(text) {
    const wanted = norm(text);
    return [...document.querySelectorAll('.sidebar-nav button')].find(button => norm(button.textContent).includes(wanted));
  }

  function renameInterface() {
    const dashboard = findNav('dashboard') || findNav('visao geral');
    const admin = findNav('administracao') || findNav('colaboradores');
    const pdf = findNav('pdfs');
    if (dashboard) {
      const label = dashboard.querySelector('.nav-label');
      if (label) label.textContent = 'Visão geral';
      dashboard.title = 'Visão geral';
    }
    if (admin) {
      const label = admin.querySelector('.nav-label');
      if (label) label.textContent = 'Colaboradores';
      admin.title = 'Colaboradores';
    }
    if (pdf) {
      const label = pdf.querySelector('.nav-label');
      if (label) label.textContent = 'Comprovantes';
    }
    const title = document.querySelector('.topbar-title h1');
    if (title && norm(title.textContent) === 'dashboard') title.textContent = 'Visão geral';
  }

  function metricByLabel(label) {
    const wanted = norm(label);
    const cards = [...document.querySelectorAll('.metric-card,.mini-metric')];
    const card = cards.find(node => norm(node.textContent).includes(wanted));
    if (!card) return null;
    const value = card.querySelector('strong')?.textContent?.trim() || '0';
    const secondary = card.querySelector('small')?.textContent?.trim() || '';
    return { value, secondary };
  }

  function currentUser() {
    return document.querySelector('.profile-menu strong')?.textContent?.trim()?.split(' ')[0] || 'Wildnei';
  }

  function ensureDashboardClone() {
    const stack = document.querySelector('.page-content .page-stack');
    if (!stack) return;
    const heading = stack.querySelector('.page-header h2');
    if (!heading || norm(heading.textContent) !== 'visaogeral') {
      stack.querySelector('.workspace-hero')?.remove();
      stack.querySelector('.workspace-kpis')?.remove();
      return;
    }
    if (stack.querySelector('.workspace-hero')) return;

    const revenue = metricByLabel('receita do dia') || metricByLabel('receita da semana') || { value: 'R$ 0,00' };
    const pendingMoney = metricByLabel('caixa') || { value: 'R$ 0,00' };
    const pending = metricByLabel('pedidos pendentes') || { value: '0' };
    const client = metricByLabel('clientes') || { value: '0' };

    const hero = document.createElement('section');
    hero.className = 'workspace-hero';
    hero.innerHTML = `
      <div class="workspace-hero-copy">
        <small>Resumo da operação</small>
        <h2>Olá,<br>${currentUser()}!</h2>
        <p>Pedidos, produção e recebimentos em uma única visão.</p>
        <button type="button">Ver próximas entregas →</button>
      </div>
      <div class="workspace-hero-mark">📈</div>
    `;
    hero.querySelector('button').addEventListener('click', () => findNav('entregas')?.click());

    const kpis = document.createElement('section');
    kpis.className = 'workspace-kpis';
    kpis.innerHTML = `
      <article class="workspace-kpi"><span>Faturamento</span><strong>${revenue.value}</strong><small>${client.value} clientes cadastrados</small></article>
      <article class="workspace-kpi gold"><span>A receber</span><strong>${pendingMoney.value}</strong><small>pagamentos e caixa operacional</small></article>
      <article class="workspace-kpi"><span>Em aberto</span><strong>${pending.value}</strong><small>pedidos aguardando conclusão</small></article>
    `;

    const header = stack.querySelector('.page-header');
    header.insertAdjacentElement('afterend', hero);
    hero.insertAdjacentElement('afterend', kpis);
    stack.querySelectorAll('.metric-grid').forEach(grid => grid.style.display = 'none');
  }

  function sync() {
    renameInterface();
    ensureDashboardClone();
  }

  document.addEventListener('DOMContentLoaded', sync);
  document.addEventListener('click', () => setTimeout(sync, 80), true);
  new MutationObserver(sync).observe(document.documentElement, { childList: true, subtree: true });
  setInterval(sync, 1200);
})();
