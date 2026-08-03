(() => {
  const enhanceDashboard = () => {
    const title = [...document.querySelectorAll('.topbar-title h1')].find(node => node.textContent.trim() === 'Dashboard');
    if (!title) return;

    const page = document.querySelector('.page-content .page-stack');
    if (!page || page.dataset.dashboardPremium === '1') return;

    const header = page.querySelector('.page-header');
    const largeMetrics = page.querySelector('.metric-grid-large');
    if (!header || !largeMetrics) return;

    page.dataset.dashboardPremium = '1';
    page.classList.add('dashboard-premium');

    const heading = header.querySelector('h2');
    const subtitle = header.querySelector('p');
    const actions = header.querySelector('.page-actions');
    const metricCards = [...largeMetrics.querySelectorAll('.metric-card')];
    const values = metricCards.map(card => card.querySelector('strong')?.textContent?.trim() || '0');
    const labels = metricCards.map(card => card.querySelector('span')?.textContent?.trim() || 'Indicador');
    const dateText = metricCards[0]?.querySelector('small')?.textContent?.trim() || '';

    const hero = document.createElement('section');
    hero.className = 'dashboard-hero';
    hero.innerHTML = `
      <div class="dashboard-hero-copy">
        <span class="dashboard-kicker">Operação semanal</span>
        <h2>${heading?.textContent?.trim() || 'Pedidos da semana'}</h2>
        <p>${subtitle?.textContent?.trim() || 'Acompanhe a produção, os pedidos e as entregas programadas para sexta-feira.'}</p>
        <div class="dashboard-hero-summary">
          <span><b>${values[1] || '0'}</b> ${labels[1] || 'pedidos'}</span>
          <span><b>${values[2] || '0'}</b> ${labels[2] || 'pendentes'}</span>
          <span><b>${values[3] || '0'}</b> ${labels[3] || 'clientes'}</span>
        </div>
      </div>
      <div class="dashboard-hero-side">
        <div class="dashboard-date-card">
          <small>PRÓXIMA ENTREGA</small>
          <strong>${dateText || 'Sexta-feira'}</strong>
          <span>Produção e separação da semana</span>
        </div>
        <div class="dashboard-hero-actions"></div>
      </div>
    `;

    const actionTarget = hero.querySelector('.dashboard-hero-actions');
    if (actions) [...actions.children].forEach(button => actionTarget.appendChild(button));
    header.replaceWith(hero);

    const sectionHeading = document.createElement('div');
    sectionHeading.className = 'dashboard-section-heading';
    sectionHeading.innerHTML = `
      <div>
        <small>Resumo operacional</small>
        <h3>Visão geral da sexta-feira</h3>
      </div>
      <span class="dashboard-live">Dados sincronizados</span>
    `;
    largeMetrics.before(sectionHeading);
  };

  const observer = new MutationObserver(enhanceDashboard);
  window.addEventListener('DOMContentLoaded', () => {
    enhanceDashboard();
    observer.observe(document.body, { childList: true, subtree: true });
  });
})();
