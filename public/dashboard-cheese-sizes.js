(function(){
  function n(v){return String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();}
  function isDash(){var h=document.querySelector('main h1');return h&&n(h.textContent).indexOf('dashboard')>=0;}
  function num(v){return Number(String(v||'0').replace(/[^0-9.,-]/g,'').replace(',','.'))||0;}
  function tipo(nome){var p=n(nome);if(p.indexOf('queijo g')>=0||p.indexOf('grande')>=0||p.indexOf(' g ')>=0)return 'G';if(p.indexOf('queijo p')>=0||p.indexOf('pequeno')>=0||p.indexOf(' p ')>=0)return 'P';return '';}
  function calc(){var g=0,p=0,t=document.querySelector('main .table table');if(!t)return{g:g,p:p};var th=[].slice.call(t.querySelectorAll('thead th')).map(function(x){return n(x.textContent)});var ip=th.findIndex(function(x){return x.indexOf('produto')>=0});var iq=th.findIndex(function(x){return x.indexOf('qtd')>=0||x.indexOf('quant')>=0});if(ip<0||iq<0)return{g:g,p:p};[].slice.call(t.querySelectorAll('tbody tr')).forEach(function(r){if(r.querySelector('.empty'))return;var c=r.querySelectorAll('td');var tp=tipo(c[ip]?c[ip].textContent:'');var q=num(c[iq]?c[iq].textContent:'0');if(tp==='G')g+=q;if(tp==='P')p+=q;});return{g:g,p:p};}
  function card(cls,titulo,valor){var cards=document.querySelector('main .cards');var el=document.querySelector(cls);if(!el){el=document.createElement('div');el.className='card dash-cheese-card '+cls.slice(1);cards.appendChild(el);}el.innerHTML='<span>'+titulo+'</span><strong>'+valor+'</strong>';}
  function run(){if(!isDash())return;var cards=document.querySelector('main .cards');if(!cards)return;var r=calc();card('.dash-cheese-g','Queijos G da semana',r.g);card('.dash-cheese-p','Queijos P da semana',r.p);}
  document.addEventListener('DOMContentLoaded',run);document.addEventListener('click',function(){setTimeout(run,150)},true);document.addEventListener('input',function(){setTimeout(run,150)},true);setInterval(run,1200);
})();
