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
  function num(v){return Number(String(v||'0').replace(/[^0-9.,-]/g,'').replace(',','.'))||0;}
  function size(name){let p=norm(name);if(p.includes('queijo g')||p.includes('grande')||p.includes(' g '))return 'G';if(p.includes('queijo p')||p.includes('pequeno')||p.includes(' p '))return 'P';return '';}
  function dashboardGP(){
    const h=document.querySelector('main h1'); if(!h||!norm(h.textContent).includes('dashboard'))return;
    const cards=document.querySelector('main .cards'), table=document.querySelector('main .table table'); if(!cards||!table)return;
    const heads=[...table.querySelectorAll('thead th')].map(x=>norm(x.textContent));
    const ip=heads.findIndex(x=>x.includes('produto')), iq=heads.findIndex(x=>x.includes('qtd')||x.includes('quant'));
    let g=0,p=0; if(ip>=0&&iq>=0){[...table.querySelectorAll('tbody tr')].forEach(r=>{if(r.querySelector('.empty'))return;let c=r.querySelectorAll('td'), t=size(c[ip]?.textContent||''), q=num(c[iq]?.textContent||'0');if(t==='G')g+=q;if(t==='P')p+=q;});}
    let cg=document.querySelector('.dash-cheese-g'), cp=document.querySelector('.dash-cheese-p');
    if(!cg){cg=document.createElement('div');cg.className='card dash-cheese-g';cards.appendChild(cg)}
    if(!cp){cp=document.createElement('div');cp.className='card dash-cheese-p';cards.appendChild(cp)}
    cg.innerHTML='<span>Queijos G da semana</span><strong>'+g+'</strong>'; cp.innerHTML='<span>Queijos P da semana</span><strong>'+p+'</strong>';
  }
  document.addEventListener('input', e => { if(e.target && e.target.tagName === 'INPUT') setTimeout(()=>{apply();dashboardGP()}, 0); }, true);
  document.addEventListener('click',()=>setTimeout(dashboardGP,200),true);
  setInterval(() => { if(inputs().some(i => i.value)) apply(); dashboardGP(); }, 1000);
})();