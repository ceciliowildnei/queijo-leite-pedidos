(() => {
  const text = node => node?.textContent?.trim() || '';
  const escapeHtml = value => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  const fridayOfWeek = value => {
    if (!value) return '';
    const date = new Date(`${String(value).slice(0, 10)}T12:00:00`);
    if (Number.isNaN(date.getTime())) return '';
    const day = date.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    date.setDate(date.getDate() + mondayOffset + 4);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const dayOfMonth = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${dayOfMonth}`;
  };

  const brDate = value => value ? String(value).slice(0, 10).split('-').reverse().join('/') : '—';

  const setInputValue = (input, value) => {
    if (!input || !value || input.value === value) return;
    const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
    descriptor?.set?.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  };

  const getOperationalDateInput = () => document.querySelector('.date-control input[type="date"]');

  const normalizeOrdersDate = () => {
    const topbarTitle = text(document.querySelector('.topbar-title h1'));
    if (topbarTitle !== 'Pedidos') return;
    const dateInput = getOperationalDateInput();
    if (!dateInput?.value) return;
    const friday = fridayOfWeek(dateInput.value);
    setInputValue(dateInput, friday);
  };

  const routeBoardMarkup = groups => {
    if (!groups.length) {
      return '<div class="weekly-route-empty">Nenhuma pessoa encontrada para as rotas e filtros desta sexta-feira.</div>';
    }

    return `<div class="weekly-route-grid">${groups.map(group => `
      <article class="weekly-route-card">
        <header>
          <div class="weekly-route-card-title">
            <small>Rota da semana</small>
            <strong>${escapeHtml(group.route)}</strong>
          </div>
          <span class="weekly-route-count">${group.clients.size}<br>pessoa(s)</span>
        </header>
        <div class="weekly-route-list">
          ${group.items.map(item => `
            <div class="weekly-route-person">
              <div>
                <strong>${escapeHtml(item.client)}</strong>
                <span>${escapeHtml(item.product)} · ${escapeHtml(item.status)}</span>
              </div>
              <b>${escapeHtml(item.quantity)} un.</b>
            </div>
          `).join('')}
        </div>
      </article>
    `).join('')}</div>`;
  };

  const enhanceOrdersPage = () => {
    const topbarTitle = text(document.querySelector('.topbar-title h1'));
    if (topbarTitle !== 'Pedidos') return;

    const pages = [...document.querySelectorAll('.page-content > .page-stack')];
    const page = pages.find(item => {
      const heading = text(item.querySelector('.page-header h2'));
      return heading === 'Pedidos' || heading === 'Pedido semanal';
    });
    if (!page) return;

    const dateInput = getOperationalDateInput();
    const friday = fridayOfWeek(dateInput?.value || '');
    const header = page.querySelector('.page-header');
    const heading = header?.querySelector('h2');
    const subtitle = header?.querySelector('p');

    if (heading && heading.textContent !== 'Pedido semanal') heading.textContent = 'Pedido semanal';
    if (subtitle) subtitle.textContent = `Pessoas, produtos e rotas com entrega na sexta-feira ${brDate(friday)}.`;

    let note = page.querySelector('.weekly-order-note');
    if (!note && header) {
      note = document.createElement('section');
      note.className = 'weekly-order-note';
      header.after(note);
    }
    if (note) {
      note.innerHTML = `
        <div>
          <small>Organização semanal</small>
          <strong>Pedidos separados por pessoas e rotas</strong>
          <span>A data é ajustada automaticamente para a sexta-feira da semana selecionada.</span>
        </div>
        <span class="weekly-order-date-badge">Sexta ${escapeHtml(brDate(friday))}</span>
      `;
    }

    const table = page.querySelector('.data-table-wrap');
    if (!table) return;

    const rows = [...table.querySelectorAll('tbody tr')].filter(row => !row.querySelector('.table-empty'));
    const grouped = new Map();

    rows.forEach(row => {
      const cells = row.children;
      if (cells.length < 8) return;
      const client = text(cells[1].querySelector('strong')) || text(cells[1]) || 'Cliente';
      const product = text(cells[2]) || 'Produto';
      const quantity = text(cells[3]) || '0';
      const route = text(cells[5]) || 'Sem rota';
      const status = text(cells[7]) || 'Sem status';
      if (!grouped.has(route)) grouped.set(route, { route, clients: new Set(), items: [] });
      const group = grouped.get(route);
      group.clients.add(client);
      group.items.push({ client, product, quantity, status });
    });

    const groups = [...grouped.values()].sort((a, b) => a.route.localeCompare(b.route, 'pt-BR'));
    const signature = JSON.stringify(groups.map(group => [group.route, [...group.clients], group.items]));

    let board = page.querySelector('.weekly-route-board');
    if (!board) {
      board = document.createElement('section');
      board.className = 'weekly-route-board';
      table.before(board);
    }

    if (board.dataset.signature !== signature) {
      board.dataset.signature = signature;
      board.innerHTML = `
        <div class="weekly-route-board-heading">
          <div>
            <small>Distribuição da semana</small>
            <h3>Pessoas por rota</h3>
          </div>
          <span>${groups.length} rota(s) com pedidos</span>
        </div>
        ${routeBoardMarkup(groups)}
      `;
    }
  };

  const enhanceOrderModals = () => {
    const operationalDate = getOperationalDateInput()?.value || '';
    const friday = fridayOfWeek(operationalDate);

    document.querySelectorAll('.modal-card').forEach(modal => {
      const title = text(modal.querySelector('header h2'));
      if (!/pedido/i.test(title)) return;

      const isNewOrder = /^novo/i.test(title);
      const fields = [...modal.querySelectorAll('label.field')];
      const routeField = fields.find(field => /^rota$/i.test(text(field.querySelector('span'))));
      const dateField = fields.find(field => /data de entrega|pedido semanal/i.test(text(field.querySelector('span'))));

      if (routeField?.querySelector('span')) routeField.querySelector('span').textContent = 'Rota da entrega semanal';
      if (dateField?.querySelector('span')) dateField.querySelector('span').textContent = 'Pedido semanal (sexta-feira)';

      if (isNewOrder) {
        const dateFieldInput = dateField?.querySelector('input[type="date"]');
        setInputValue(dateFieldInput, friday);
      }

      const content = modal.querySelector('.modal-content');
      if (!content) return;
      let note = content.querySelector('.weekly-order-modal-note');
      if (!note) {
        note = document.createElement('div');
        note.className = 'weekly-order-modal-note';
        const intro = content.querySelector('.stage2-modal-intro');
        if (intro) intro.after(note);
        else content.prepend(note);
      }
      note.innerHTML = `<strong>Pedido semanal:</strong> escolha a pessoa, selecione a rota e confirme a entrega para sexta-feira ${escapeHtml(brDate(friday))}.`;
    });
  };

  let scheduled = false;
  const enhance = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      normalizeOrdersDate();
      enhanceOrdersPage();
      enhanceOrderModals();
    });
  };

  const observer = new MutationObserver(enhance);
  window.addEventListener('DOMContentLoaded', () => {
    enhance();
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  });
})();
