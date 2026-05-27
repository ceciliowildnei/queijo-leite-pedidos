(() => {
  function isRelatorio() {
    return /relat/i.test(document.querySelector('main h1')?.textContent || '');
  }

  function getDateText() {
    const dateInput = document.querySelector('.delivery-date-picker input');
    if (dateInput && dateInput.value) {
      const parts = dateInput.value.split('-');
      if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    const p = document.querySelector('.top p')?.textContent || '';
    return p.replace('Data selecionada:', '').trim();
  }

  function buildPrintHeader() {
    let header = document.querySelector('.print-report-header');
    if (!header) {
      header = document.createElement('div');
      header.className = 'print-report-header';
      document.body.prepend(header);
    }
    header.innerHTML = `
      <div class="print-logo-row">
        <img src="/logo-queijos-wr-upload.svg" alt="Queijos WR" />
        <div>
          <h1>Relatório de Produção por Rotas</h1>
          <p>Data da entrega: <strong>${getDateText()}</strong></p>
        </div>
      </div>
    `;
  }

  function addButton() {
    if (!isRelatorio()) return;
    const actions = document.querySelector('.top-actions');
    if (!actions || document.querySelector('.pdf-report-btn')) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ghost pdf-report-btn';
    btn.textContent = 'Salvar PDF';
    btn.addEventListener('click', () => {
      buildPrintHeader();
      document.body.classList.add('printing-report');
      setTimeout(() => window.print(), 120);
      setTimeout(() => document.body.classList.remove('printing-report'), 1200);
    });
    actions.prepend(btn);
  }

  window.addEventListener('afterprint', () => {
    document.body.classList.remove('printing-report');
  });

  document.addEventListener('click', () => setTimeout(addButton, 120), true);
  document.addEventListener('DOMContentLoaded', addButton);
  setInterval(addButton, 800);
})();