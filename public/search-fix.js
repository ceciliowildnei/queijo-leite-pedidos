(() => {
  const norm = (v) => String(v || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  function inputs(){ return Array.from(document.querySelectorAll('input')).filter(i => norm(i.placeholder).includes('buscar') || norm(i.placeholder).includes('pesquisar')); }
  function query(){ const el = inputs().find(i => i.value && i.offsetParent !== null); return el ? norm(el.value) : ''; }
  function apply(){
    const q = query();
    document.querySelectorAll('.route-card').forEach(card => {
      let visible = 0;
      card.querySelectorAll('.delivery-row').forEach(row => {
        const ok = !q || norm(row.textContent).includes(q) || norm(card.querySelector('.route-head')?.textContent).includes(q);
        row.style.display = ok ? '' : 'none';
        if(ok) visible++;
      });
      if(card.querySelector('.delivery-row')) card.style.display = (!q || visible) ? '' : 'none';
    });
    document.querySelectorAll('.table tbody tr').forEach(row => {
      if(row.querySelector('.empty')) return;
      row.style.display = (!q || norm(row.textContent).includes(q)) ? '' : 'none';
    });
  }
  document.addEventListener('input', e => { if(e.target && e.target.tagName === 'INPUT') setTimeout(apply, 0); }, true);
  setInterval(() => { if(inputs().some(i => i.value)) apply(); }, 1000);
})();
