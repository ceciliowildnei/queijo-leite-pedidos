(() => {
  const TARGET_TITLES = new Set(['pedidos', 'entregas', 'relatorios', 'pdfs e comprovantes']);

  const normalize = value => String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

  function topDateInput() {
    return document.querySelector('.topbar-actions .date-control input[type="date"]');
  }

  function setReactDate(input, value) {
    if (!input || !value) return;
    const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
    descriptor?.set?.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function currentTitle() {
    return normalize(document.querySelector('.topbar-title h1')?.textContent);
  }

  function removeSelector() {
    document.getElementById('wr-document-date-selector')?.remove();
  }

  function buildSelector() {
    const title = currentTitle();
    if (!TARGET_TITLES.has(title)) {
      removeSelector();
      return;
    }

    const page = document.querySelector('.page-content .page-stack');
    const source = topDateInput();
    if (!page || !source) return;

    let box = document.getElementById('wr-document-date-selector');
    if (!box) {
      box = document.createElement('section');
      box.id = 'wr-document-date-selector';
      box.className = 'wr-document-date-selector';
      box.innerHTML = `
        <div class="wr-document-date-copy">
          <span>Data do documento</span>
          <strong>Escolha a data antes de gerar, imprimir ou salvar o PDF</strong>
        </div>
        <label class="wr-document-date-field">
          <span>Data</span>
          <input type="date" aria-label="Data para gerar documento" />
        </label>`;
      page.prepend(box);

      const localInput = box.querySelector('input[type="date"]');
      localInput.addEventListener('change', event => {
        setReactDate(topDateInput(), event.target.value);
      });
    }

    const localInput = box.querySelector('input[type="date"]');
    if (localInput && localInput.value !== source.value) localInput.value = source.value;
  }

  let scheduled = false;
  function refresh() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      buildSelector();
    });
  }

  window.addEventListener('DOMContentLoaded', () => {
    refresh();
    new MutationObserver(refresh).observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['class', 'value']
    });
  });
})();
