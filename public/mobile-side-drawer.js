(() => {
  const mq = window.matchMedia('(max-width: 900px)');
  const isMobile = () => mq.matches;
  const text = node => node?.textContent?.trim() || '';

  function removeLegacyMobileUi() {
    if (!isMobile()) return;
    document.documentElement.classList.remove('wr-mobile-more-open');
    document.querySelector('.app-shell')?.classList.remove('mobile-menu-open');
    document.querySelectorAll(
      '#wr-mobile-bottom-nav,.mobile-bottom-nav,.mobile-quick-order,.wr-mobile-actions,.wr-mobile-more-actions,.sidebar-backdrop,.mobile-menu-btn'
    ).forEach(el => el.remove());
  }

  function closeDrawer() {
    document.body.classList.remove('wr-drawer-open');
  }

  function openDrawer() {
    if (!isMobile()) return;
    removeLegacyMobileUi();
    buildDrawer();
    syncActiveState();
    document.body.classList.add('wr-drawer-open');
  }

  function originalNavButtons() {
    return [...document.querySelectorAll('.sidebar-nav button')];
  }

  function syncData() {
    const sync = document.querySelector('.topbar-actions .sync-btn');
    if (sync && !sync.disabled) sync.click();
  }

  function logout() {
    const button = [...document.querySelectorAll('.profile-menu button')]
      .find(item => /sair/i.test(text(item)));
    if (button) button.click();
  }

  function buildDrawerNav() {
    const nav = document.getElementById('wr-mobile-drawer-nav');
    if (!nav) return;
    nav.innerHTML = '';

    originalNavButtons().forEach((original, index) => {
      const clone = document.createElement('button');
      clone.type = 'button';
      clone.dataset.wrOriginalIndex = String(index);
      clone.className = original.classList.contains('active') ? 'active' : '';

      const icon = original.querySelector('.wr-brand-icon, .wr-system-icon, img, svg');
      if (icon) clone.appendChild(icon.cloneNode(true));

      const label = document.createElement('span');
      label.textContent = text(original.querySelector('.nav-label')) || text(original) || `Área ${index + 1}`;
      clone.appendChild(label);

      clone.addEventListener('click', () => {
        const target = originalNavButtons()[Number(clone.dataset.wrOriginalIndex)];
        target?.click();
        closeDrawer();
      });
      nav.appendChild(clone);
    });
  }

  function syncActiveState() {
    const originals = originalNavButtons();
    document.querySelectorAll('#wr-mobile-drawer-nav button').forEach(button => {
      const original = originals[Number(button.dataset.wrOriginalIndex)];
      button.classList.toggle('active', Boolean(original?.classList.contains('active')));
    });
  }

  function buildDrawer() {
    if (!isMobile() || !document.querySelector('.app-shell')) return;
    removeLegacyMobileUi();

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

    if (!document.getElementById('wr-mobile-drawer-panel')) {
      const panel = document.createElement('aside');
      panel.id = 'wr-mobile-drawer-panel';
      panel.setAttribute('aria-label', 'Menu principal');
      panel.innerHTML = `
        <div class="wr-mobile-drawer-head">
          <div class="wr-mobile-drawer-brand">
            <strong>Queijos WR</strong>
            <span>Menu do sistema</span>
          </div>
          <button id="wr-mobile-drawer-close" type="button" aria-label="Fechar menu">×</button>
        </div>
        <nav id="wr-mobile-drawer-nav" aria-label="Áreas do sistema"></nav>
        <div class="wr-mobile-drawer-actions">
          <button type="button" id="wr-mobile-drawer-sync"><i class="wr-system-icon wr-system-sync" aria-hidden="true"></i><span>Sincronizar</span></button>
          <button type="button" id="wr-mobile-drawer-exit"><i class="wr-system-icon wr-system-exit" aria-hidden="true"></i><span>Sair</span></button>
        </div>`;
      document.body.appendChild(panel);
      panel.querySelector('#wr-mobile-drawer-close')?.addEventListener('click', closeDrawer);
      panel.querySelector('#wr-mobile-drawer-sync')?.addEventListener('click', syncData);
      panel.querySelector('#wr-mobile-drawer-exit')?.addEventListener('click', logout);
    }

    buildDrawerNav();
    syncActiveState();
  }

  function cleanupDesktop() {
    if (isMobile()) return;
    closeDrawer();
    document.querySelectorAll('#wr-mobile-drawer-handle,#wr-mobile-drawer-backdrop,#wr-mobile-drawer-panel').forEach(el => el.remove());
  }

  let scheduled = false;
  function refresh() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      cleanupDesktop();
      if (!isMobile()) return;
      removeLegacyMobileUi();
      buildDrawer();
    });
  }

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeDrawer();
  });

  window.addEventListener('DOMContentLoaded', () => {
    refresh();
    new MutationObserver(refresh).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  });
  mq.addEventListener?.('change', refresh);
  window.addEventListener('resize', refresh, { passive: true });
})();
