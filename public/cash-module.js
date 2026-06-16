import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient('https://ywwztahbqgiwervbwudg.supabase.co','sb_publishable_er0Z1O0s1opKniqu3cYkGg_svVBvXRx');
const STORE = 'wr_caixa_saidas_v1';
const money = v => Number(v || 0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const today = () => new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const br = d => d ? String(d).slice(0,10).split('-').reverse().join('/') : '-';
const loadOut = () => { try { return JSON.parse(localStorage.getItem(STORE) || '[]') || []; } catch(e) { return []; } };
const saveOut = rows => localStorage.setItem(STORE, JSON.stringify(rows));

function ensureButton(){
  const menu = document.querySelector('aside .menu');
  if(!menu || document.querySelector('[data-cash-tab]')) return;
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.dataset.cashTab = '1';
  btn.innerHTML = '<i>•</i>Caixa';
  btn.addEventListener('click', openCash);
  const rel = Array.from(menu.children).find(b => /relat/i.test(b.textContent || ''));
  menu.insertBefore(btn, rel || null);
}

async function getOrders(date){
  const {data,error} = await supabase.from('wr_pedidos').select('*').eq('data_entrega', date).order('cliente_nome');
  if(error) throw error;
  return data || [];
}
function getOut(date){ return loadOut().filter(x => x.data === date); }
function markPaid(id){ return supabase.from('wr_pedidos').update({status_pagamento:'Pago'}).eq('id', id); }
function addOut(date){
  const desc = prompt('Descrição da saída. Ex: combustível, embalagem, mercado');
  if(!desc) return;
  const val = Number(String(prompt('Valor da saída. Ex: 25.50') || '0').replace(',','.'));
  if(!val) return;
  const rows = loadOut();
  rows.push({id:Date.now(), data:date, descricao:desc, valor:val});
  saveOut(rows);
  openCash(date);
}
function delOut(id, date){
  if(!confirm('Excluir saída?')) return;
  saveOut(loadOut().filter(x => String(x.id) !== String(id)));
  openCash(date);
}

async function openCash(date = null){
  const selectedDate = date || document.querySelector('.delivery-date-picker input')?.value || today();
  document.querySelectorAll('aside .menu button').forEach(b => b.classList.remove('active'));
  document.querySelector('[data-cash-tab]')?.classList.add('active');
  const main = document.querySelector('main');
  if(!main) return;
  main.innerHTML = '<div class="cash-page"><div class="cash-top"><div><h1>Caixa / Financeiro</h1><p>Controle de entradas, saídas, recebimentos e saldo.</p></div><label><span>Data</span><input class="cash-date" type="date" value="'+selectedDate+'"></label></div><p class="ok">Carregando caixa...</p></div>';
  main.querySelector('.cash-date').addEventListener('change', e => openCash(e.target.value));
  try{
    const orders = await getOrders(selectedDate);
    const paid = orders.filter(p => String(p.status_pagamento || '').toLowerCase() === 'pago');
    const pending = orders.filter(p => String(p.status_pagamento || '').toLowerCase() !== 'pago');
    const outs = getOut(selectedDate);
    const entradas = paid.reduce((s,p) => s + Number(p.total || 0), 0);
    const aReceber = pending.reduce((s,p) => s + Number(p.total || 0), 0);
    const saidas = outs.reduce((s,x) => s + Number(x.valor || 0), 0);
    const saldo = entradas - saidas;
    main.innerHTML = `
      <div class="cash-page">
        <div class="cash-top">
          <div><h1>Caixa / Financeiro</h1><p>Fechamento de caixa da data ${br(selectedDate)}.</p></div>
          <div class="cash-actions"><label><span>Data</span><input class="cash-date" type="date" value="${selectedDate}"></label><button class="sync cash-refresh">Atualizar</button></div>
        </div>
        <div class="cash-cards">
          <div class="cash-card"><span>Entradas recebidas</span><strong>${money(entradas)}</strong></div>
          <div class="cash-card"><span>A receber</span><strong>${money(aReceber)}</strong></div>
          <div class="cash-card danger"><span>Saídas</span><strong>${money(saidas)}</strong></div>
          <div class="cash-card saldo"><span>Saldo do dia</span><strong>${money(saldo)}</strong></div>
        </div>
        <div class="cash-grid">
          <section class="cash-panel"><div class="cash-panel-head"><h2>Recebimentos pendentes</h2></div><div class="cash-list">${pending.length ? pending.map(p => `<div class="cash-row"><div><strong>${p.cliente_nome || '-'}</strong><small>${p.produto_nome || '-'} • ${p.quantidade || 1} un.</small></div><strong>${money(p.total)}</strong><button data-pay="${p.id}">Receber</button></div>`).join('') : '<p class="cash-empty">Nada pendente nesta data.</p>'}</div></section>
          <section class="cash-panel"><div class="cash-panel-head"><h2>Recebidos</h2></div><div class="cash-list">${paid.length ? paid.map(p => `<div class="cash-row paid"><div><strong>${p.cliente_nome || '-'}</strong><small>${p.produto_nome || '-'} • ${p.forma_pagamento || 'Pagamento'}</small></div><strong>${money(p.total)}</strong></div>`).join('') : '<p class="cash-empty">Nenhum recebimento confirmado.</p>'}</div></section>
          <section class="cash-panel"><div class="cash-panel-head"><h2>Saídas do caixa</h2><button class="cash-add-out">+ Saída</button></div><div class="cash-list">${outs.length ? outs.map(x => `<div class="cash-row"><div><strong>${x.descricao}</strong><small>${br(x.data)}</small></div><strong>${money(x.valor)}</strong><button data-delout="${x.id}">Excluir</button></div>`).join('') : '<p class="cash-empty">Nenhuma saída lançada.</p>'}</div></section>
        </div>
      </div>`;
    main.querySelector('.cash-date').addEventListener('change', e => openCash(e.target.value));
    main.querySelector('.cash-refresh').addEventListener('click', () => openCash(selectedDate));
    main.querySelector('.cash-add-out').addEventListener('click', () => addOut(selectedDate));
    main.querySelectorAll('[data-pay]').forEach(btn => btn.addEventListener('click', async () => { await markPaid(btn.dataset.pay); openCash(selectedDate); }));
    main.querySelectorAll('[data-delout]').forEach(btn => btn.addEventListener('click', () => delOut(btn.dataset.delout, selectedDate)));
  }catch(e){
    main.querySelector('.ok').outerHTML = '<p class="err">Erro ao carregar caixa: '+(e.message || e)+'</p>';
  }
}

document.addEventListener('DOMContentLoaded', ensureButton);
document.addEventListener('click', () => setTimeout(ensureButton, 100), true);
setInterval(ensureButton, 1000);
