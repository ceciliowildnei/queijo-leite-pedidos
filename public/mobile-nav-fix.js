(() => {
  const items = [
    ['dashboard', 'Dashboard'],
    ['clientes', 'Clientes'],
    ['produtos', 'Produtos'],
    ['pedidos', 'Pedidos'],
    ['entregas', 'Entregas'],
    ['relatorios', 'Relatórios'],
    ['admins', 'ADMs'],
  ];

  const norm = (v) => String(v || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');

  function currentTitle(){
    return document.querySelector('main h1')?.textContent?.trim() || 'Entregas';
  }

  function clickMenu(label){
    const wanted = norm(label);
    const btn = Array.from(document.querySelectorAll('aside .menu button')).find((b) => norm(b.textContent).includes(wanted));
    if(btn){
      btn.dispatchEvent(new MouseEvent('click', {bubbles:true, cancelable:true, view:window}));
      document.querySelector('.app')?.classList.remove('menu-open');
      setTimeout(syncActive, 80);
      return true;
    }
    return false;
  }

  function syncActive(){
    const title = norm(currentTitle());
    document.querySelectorAll('.mobile-tab-btn').forEach((btn) => {
      btn.classList.toggle('active', title.includes(norm(btn.dataset.label)));
    });
    const select = document.querySelector('.mobile-tab-select');
    if(select){
      const found = items.find(([, label]) => title.includes(norm(label)));
      if(found) select.value = found[1];
    }
  }

  function build(){
    if(document.querySelector('.mobile-tabs-fix')) { syncActive(); return; }
    const main = document.querySelector('main');
    const top = document.querySelector('main .top');
    if(!main || !top) return;

    const wrap = document.createElement('div');
    wrap.className = 'mobile-tabs-fix';

    const select = document.createElement('select');
    select.className = 'mobile-tab-select';
    items.forEach(([, label]) => {
      const opt = document.createElement('option');
      opt.value = label;
      opt.textContent = label;
      select.appendChild(opt);
    });
    select.addEventListener('change', () => clickMenu(select.value));

    const buttons = document.createElement('div');
    buttons.className = 'mobile-tab-buttons';
    items.forEach(([, label]) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'mobile-tab-btn';
      btn.dataset.label = label;
      btn.textContent = label;
      btn.addEventListener('click', () => clickMenu(label));
      buttons.appendChild(btn);
    });

    wrap.appendChild(select);
    wrap.appendChild(buttons);
    top.insertAdjacentElement('afterend', wrap);
    syncActive();
  }

  document.addEventListener('DOMContentLoaded', build);
  document.addEventListener('click', () => setTimeout(() => { build(); syncActive(); }, 120), true);
  window.addEventListener('resize', build);
  setInterval(build, 1000);
})();