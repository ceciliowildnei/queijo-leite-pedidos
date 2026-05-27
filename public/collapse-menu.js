(() => {
  function getApp(){ return document.querySelector('.app'); }
  function isMobile(){ return window.matchMedia('(max-width: 1100px)').matches; }
  function toggle(){
    const app = getApp();
    if(!app) return;
    if(isMobile()) {
      app.classList.toggle('menu-open');
    } else {
      app.classList.toggle('menu-collapsed');
      try { localStorage.setItem('wr_menu_collapsed', app.classList.contains('menu-collapsed') ? '1' : '0'); } catch(e) {}
    }
  }
  function boot(){
    const app = getApp();
    if(app && !isMobile()) {
      try { if(localStorage.getItem('wr_menu_collapsed') === '1') app.classList.add('menu-collapsed'); } catch(e) {}
    }
  }
  document.addEventListener('click', (event) => {
    const btn = event.target.closest('.hamb');
    if(!btn) return;
    event.preventDefault();
    event.stopPropagation();
    toggle();
  }, true);
  document.addEventListener('DOMContentLoaded', boot);
  setInterval(boot, 1000);
})();