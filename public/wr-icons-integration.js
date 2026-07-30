(()=>{
  const norm=v=>String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();
  const items=[
    ['dashboard','dashboard'],['clientes','clientes'],['pedidos','pedidos'],
    ['entregas','entregas'],['caixa','caixa'],['relatorios','relatorios'],
    ['administracao','administracao'],['adms','administracao'],
    ['pdf','pdf'],['comprovantes','pdf']
  ];
  function type(text){const t=norm(text);for(const [key,value] of items)if(t.includes(key))return value;return null}
  function add(el,name){
    if(!el||!name||el.querySelector(':scope > .wr-brand-icon'))return;
    const icon=document.createElement('i');
    icon.className='wr-brand-icon wr-icon-'+name;
    icon.setAttribute('aria-hidden','true');
    el.prepend(icon);
  }
  function menu(){document.querySelectorAll('aside .menu button,.menu button').forEach(button=>add(button,type(button.textContent)))}
  function headings(){document.querySelectorAll('main .top h1,main h1').forEach(title=>add(title,type(title.textContent)))}
  function login(){
    const card=document.querySelector('.login-card,.login form,.auth-card');
    if(!card||card.querySelector('.wr-login-symbol'))return;
    const icon=document.createElement('i');
    icon.className='wr-brand-icon wr-icon-login wr-login-symbol';
    icon.setAttribute('aria-hidden','true');
    card.prepend(icon);
  }
  function run(){menu();headings();login()}
  new MutationObserver(()=>requestAnimationFrame(run)).observe(document.documentElement,{childList:true,subtree:true});
  document.addEventListener('DOMContentLoaded',run);
  setInterval(run,1000);
  run();
})();