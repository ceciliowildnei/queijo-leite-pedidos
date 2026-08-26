(() => {
  const mq = window.matchMedia('(max-width: 900px)');

  const isMobile = () => mq.matches;

  function shell() { return document.querySelector('.app-shell'); }

  function closeDrawer() {
    document.body.classList.remove('wr-drawer-open');
    document.documentElement.classList.remove('wr-mobile-more-open');
    shell()?.classList.remove('mobile-menu-open');
    document.querySelector('.sidebar-backdrop')?.classList.remove('show');
  }

  function openDrawer() {
    if (!isMobile()) return;
    document.body.classList.add('wr-drawer-open');
    document.documentElement.classList.add('wr-mobile-more-open');
    shell()?.classList.add('mobile-menu-open');
  }

  function ensureDrawer() {
    if (!isMobile() || !shell() || !document.querySelector('.sidebar')) return;

    /* A navegação antiga não é mais necessária no celular. */
    document.querySelectorAll('#wr-mobile-bottom-nav,.mobile-bottom-nav,.mobile-quick-order,.wr-mobile-actions').forEach(el => el.remove());

    if (!document.getElementById('wr-mobile-drawer-handle')) {
      const handle = document.createElement('button');
      handle.id = 'wr-mobile-drawer-handle';
      handle.type = 'button';
      handle.setAttribute('aria-label', 'Abrir menu');
      handle.setAttribute('title', 'Abrir menu');
      handle.addEventListener('click', openDrawer);
      document.body.appendChild(handle);
    }

    if (!document.getElementById('wr-mobile-drawer-backdrop')) {
      const backdrop = document.createElement('div');
      backdrop.id = 'wr-mobile-drawer-backdrop';
      backdrop.setAttribute('aria-hidden', 'true');
      backdrop.addEventListener('click', closeDrawer);
      document.body.appendChild(backdrop);
    }

    const sidebar = document.querySelector('.sidebar');
    if (sidebar && !document.getElementById('wr-mobile-drawer-close')) {
      const close = document.createElement('button');
      close.id = 'wr-mobile-drawer-close';
      close.type = 'button';
      close.setAttribute('aria-label', 'Fechar menu');
      close.setAttribute('title', 'Fechar menu');
      close.textContent = '×';
      close.addEventListener('click', closeDrawer);
      sidebar.appendChild(close);
    }
  }

  function cleanupDesktop() {
    if (isMobile()) return;
    closeDrawer();
    document.querySelectorAll('#wr-mobile-drawer-handle,#wr-mobile-drawer-backdrop,#wr-mobile-drawer-close').forEach(el => el.remove());
  }

  let scheduled = false;
  function refresh() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      cleanupDesktop();
      ensureDrawer();
    });
  }

  document.addEventListener('click', event => {
    if (!isMobile()) return;
    const navButton = event.target.closest('.sidebar-nav button');
    if (navButton) setTimeout(closeDrawer, 0);
  }, true);

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeDrawer();
  });

  window.addEventListener('DOMContentLoaded', () => {
    refresh();
    new MutationObserver(refresh).observe(document.body, { childList: true, subtree: true });
  });
  mq.addEventListener?.('change', refresh);
  window.addEventListener('resize', refresh, { passive: true });
})();
