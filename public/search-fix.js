(() => {
  const norm = v => String(v || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  const money = v => Number(v || 0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  const num = v => Number(String(v || '0').replace(/[^0-9.,-]/g,'').replace(',','.')) || 0;
  function inputs(){ return Array.from(document.querySelectorAll('input')).filter(i => norm(i.placeholder).includes('buscar') || norm(i.placeholder).includes('pesquisar')); }
  function query(){ const el = inputs().find(i => i.value && i.offsetParent !== null); return el ? norm(el.value) : ''; }
  function size(name){let p=norm(name);if(p.includes('1kg')||p.includes('1 kg')||p.includes('queijo g')||p.includes('grande'))return 'G';if(p.includes('500g')||p.includes('500 g')||p.includes('meio')||p.includes('queijo p')||p.includes('pequeno'))return 'P';return '';}
  function addCard(parent, cls, title, value){let el=document.querySelector(cls);if(!el){el=document.createElement('div');el.className='card '+cls.slice(1);parent.appendChild(el)}el.innerHTML='<span>'+title+'</span><strong>'+value+'</strong>';}
  function applySearch(){
    const q=query();
    document.querySelectorAll('.route-card').forEach(card=>{let visible=0;card.querySelectorAll('.delivery-row').forEach(row=>{const ok=!q||norm(row.textContent).includes(q)||norm(card.querySelector('.route-head')?.textContent).includes(q);row.style.display=ok?'':'none';if(ok)visible++});if(card.querySelector('.delivery-row'))card.style.display=(!q||visible)?'':'none'});
    document.querySelectorAll('.table tbody tr').forEach(row=>{if(row.querySelector('.empty'))return;row.style.display=(!q||norm(row.textContent).includes(q))?'':'none'});
  }
  function dashboardGP(){
    const h=document.querySelector('main h1');if(!h||!norm(h.textContent).includes('dashboard'))return;
    const cards=document.querySelector('main .cards'), table=document.querySelector('main .table table');if(!cards||!table)return;
    const heads=[...table.querySelectorAll('thead th')].map(x=>norm(x.textContent));
    const ip=heads.findIndex(x=>x.includes('produto')), iq=heads.findIndex(x=>x.includes('qtd')||x.includes('quant'));
    let g=0,p=0;if(ip>=0&&iq>=0){[...table.querySelectorAll('tbody tr')].forEach(r=>{if(r.querySelector('.empty'))return;let c=r.querySelectorAll('td'),t=size(c[ip]?.textContent||''),q=num(c[iq]?.textContent||'0');if(t==='G')g+=q;if(t==='P')p+=q})}
    addCard(cards,'.dash-cheese-g','Queijos G da semana',g);addCard(cards,'.dash-cheese-p','Queijos P da semana',p);
  }
  function deliveryGP(){
    const h=document.querySelector('main h1');if(!h||!norm(h.textContent).includes('entregas'))return;
    const grid=document.querySelector('.summary-grid');if(!grid)return;
    let g=0,p=0;
    document.querySelectorAll('.delivery-row').forEach(row=>{if(row.style.display==='none')return;let text=row.textContent||'',t=size(text);if(t==='G')g+=1;if(t==='P')p+=1});
    addCard(grid,'.summary-g','Queijos G',g);addCard(grid,'.summary-p','Queijos P',p);
  }
  function ensureCash(){
    const menu=document.querySelector('aside .menu');if(!menu||document.querySelector('.wr-cash-tab'))return;
    const btn=document.createElement('button');btn.type='button';btn.className='wr-cash-tab';btn.innerHTML='<i>•</i>Caixa';
    btn.addEventListener('click',()=>{document.querySelectorAll('aside .menu button').forEach(b=>b.classList.remove('active'));btn.classList.add('active');openCash()});
    const rel=[...menu.children].find(b=>norm(b.textContent).includes('relatorios'));menu.insertBefore(btn,rel||null);
  }
  function currentDate(){return document.querySelector('.delivery-date-picker input')?.value||''}
  function rowsFromPedidos(){let rows=[];document.querySelectorAll('main .table tbody tr').forEach(r=>{if(r.querySelector('.empty'))return;let c=r.querySelectorAll('td');if(c.length>=9)rows.push({cliente:c[1]?.textContent||'-',produto:c[4]?.textContent||'-',qtd:c[5]?.textContent||'1',valor:num(c[6]?.textContent),pag:c[7]?.textContent||'',status:c[8]?.textContent||''})});return rows}
  function openCash(){
    const main=document.querySelector('main');if(!main)return;let date=currentDate(),rows=rowsFromPedidos(),out=JSON.parse(localStorage.getItem('wr_caixa_saidas')||'[]').filter(x=>x.data===date),paid=rows.filter(x=>norm(x.pag).includes('pago')),pend=rows.filter(x=>!norm(x.pag).includes('pago')),ent=paid.reduce((s,x)=>s+x.valor,0),rec=pend.reduce((s,x)=>s+x.valor,0),sai=out.reduce((s,x)=>s+Number(x.valor||0),0);
    main.innerHTML='<div class="top"><div><h1>Caixa</h1><p>Controle financeiro da data selecionada.</p></div><button class="sync wr-add-out">+ Lançar saída</button></div><div class="cards"><div class="card"><span>Entradas</span><strong>'+money(ent)+'</strong></div><div class="card"><span>A receber</span><strong>'+money(rec)+'</strong></div><div class="card"><span>Saídas</span><strong>'+money(sai)+'</strong></div><div class="card"><span>Saldo</span><strong>'+money(ent-sai)+'</strong></div></div><div class="panel table"><table><thead><tr><th>Cliente/Descrição</th><th>Produto</th><th>Qtd.</th><th>Valor</th><th>Status</th></tr></thead><tbody>'+pend.map(x=>'<tr><td>'+x.cliente+'</td><td>'+x.produto+'</td><td>'+x.qtd+'</td><td>'+money(x.valor)+'</td><td>Pendente</td></tr>').join('')+paid.map(x=>'<tr><td>'+x.cliente+'</td><td>'+x.produto+'</td><td>'+x.qtd+'</td><td>'+money(x.valor)+'</td><td>Recebido</td></tr>').join('')+out.map(x=>'<tr><td>'+x.descricao+'</td><td>Saída</td><td>-</td><td>'+money(x.valor)+'</td><td>Despesa</td></tr>').join('')+'</tbody></table></div>';
    document.querySelector('.wr-add-out')?.addEventListener('click',()=>{let descricao=prompt('Descrição da saída');if(!descricao)return;let valor=num(prompt('Valor da saída')||0);if(!valor)return;let all=JSON.parse(localStorage.getItem('wr_caixa_saidas')||'[]');all.push({data:date,descricao,valor});localStorage.setItem('wr_caixa_saidas',JSON.stringify(all));openCash()});
  }
  function run(){applySearch();dashboardGP();deliveryGP();ensureCash()}
  document.addEventListener('input',()=>setTimeout(run,0),true);document.addEventListener('click',()=>setTimeout(run,200),true);setInterval(run,1000);
})();