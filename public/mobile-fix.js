(() => {
  function app(){ return document.querySelector('.app'); }
  function closeMenu(){ app()?.classList.remove('menu-open'); }
  function toggleMenu(){ app()?.classList.toggle('menu-open'); }

  document.addEventListener('click', (event) => {
    const hamburger = event.target.closest('.hamb');
    if (hamburger) {
      event.preventDefault();
      toggleMenu();
      return;
    }

    const menuButton = event.target.closest('aside .menu button');
    if (menuButton) {
      closeMenu();
      return;
    }

    const backdrop = event.target.closest('.mobile-backdrop');
    if (backdrop) closeMenu();
  });

  function ensureBackdrop(){
    if(document.querySelector('.mobile-backdrop')) return;
    const div = document.createElement('div');
    div.className = 'mobile-backdrop';
    document.body.appendChild(div);
  }

  function ensureMenuTitle(){
    const aside = document.querySelector('aside');
    if(!aside || aside.querySelector('.mobile-drawer-title')) return;
    const title = document.createElement('div');
    title.className = 'mobile-drawer-title';
    title.innerHTML = '<strong>Queijos WR</strong><button type="button" aria-label="Fechar menu">×</button>';
    title.querySelector('button').addEventListener('click', closeMenu);
    aside.prepend(title);
  }

  function boot(){
    ensureBackdrop();
    ensureMenuTitle();
  }

  document.addEventListener('DOMContentLoaded', boot);
  setInterval(boot, 1000);
})();