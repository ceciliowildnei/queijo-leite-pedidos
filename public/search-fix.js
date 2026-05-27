(() => {
  const normalize = (value) => String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  function getSearchInputs() {
    return Array.from(document.querySelectorAll('input')).filter((input) => {
      const ph = normalize(input.getAttribute('placeholder'));
      return ph.includes('buscar') || ph.includes('pesquisar');
    });
  }

  function currentQuery() {
    const focused = document.activeElement;
    if (focused && focused.tagName === 'INPUT') {
      const ph = normalize(focused.getAttribute('placeholder'));
      if (ph.includes('buscar') || ph.includes('pesquisar')) return focused.value;
    }
    const input = getSearchInputs().find((el) => el.value && el.offsetParent !== null) || getSearchInputs().find((el) => el.offsetParent !== null);
    return input ? input.value : '';
  }

  function filterRoutes(query) {
    const q = normalize(query);
    document.querySelectorAll('.route-card').forEach((card) => {
      const rows = Array.from(card.querySelectorAll('.delivery-row'));
      if (!rows.length) return;
      const headText = normalize(card.querySelector('.route-head')?.textContent || '');
      const routeMatches = q && headText.includes(q);
      let visible = 0;
      rows.forEach((row) => {
        const match = !q || routeMatches || normalize(row.textContent).includes(q);
        row.style.display = match ? '' : 'none';
        if (match) visible += 1;
      });
      card.style.display = (!q || visible > 0 || routeMatches) ? '' : 'none';
    });
  }

  function filterTables(query) {
    const q = normalize(query);
    document.querySelectorAll('.table tbody').forEach((tbody) => {
      const rows = Array.from(tbody.querySelectorAll('tr'));
      rows.forEach((row) => {
        if (row.querySelector('.empty')) return;
        row.style.display = (!q || normalize(row.textContent).includes(q)) ? '' : 'none';
      });
    });
  }

  function applySearch() {
    const q = currentQuery();
    filterRoutes(q);
    filterTables(q);
  }

  document.addEventListener('input', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    const ph = normalize(target.getAttribute('placeholder'));
    if (!ph.includes('buscar') && !ph.includes('pesquisar')) return;
    setTimeout(applySearch, 0);
  }, true);

  document.addEventListener('keyup', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    const ph = normalize(target.getAttribute('placeholder'));
    if (!ph.includes('buscar') && !ph.includes('pesquisar')) return;
    setTimeout(applySearch, 0);
  }, true);

  document.addEventListener('click', () => setTimeout(applySearch, 50), true);
  setInterval(() => {
    const hasValue = getSearchInputs().some((input) => input.value);
    if (hasValue) applySearch();
  }, 800);
})();