(() => {
  const mq = window.matchMedia('(max-width: 900px)');
  let locked = false;

  function closeSidebarAfterNavigation(event) {
    if (!mq.matches) return;
    const button = event.target.closest('.sidebar-nav button');
    if (!button) return;
    requestAnimationFrame(() => document.querySelector('.sidebar-backdrop.show')?.click());
  }

  function preventRapidDoubleTap(event) {
    const target = event.target.closest('button, .btn, [role="button"]');
    if (!target || target.disabled || locked) return;
    locked = true;
    target.classList.add('wr-tap-active');
    setTimeout(() => {
      locked = false;
      target.classList.remove('wr-tap-active');
    }, 260);
  }

  function makeControlsAccessible() {
    document.querySelectorAll('button:not([aria-label])').forEach(button => {
      const title = button.getAttribute('title') || button.textContent.trim();
      if (title) button.setAttribute('aria-label', title);
    });
  }

  function enhance() {
    if (!mq.matches) return;
    makeControlsAccessible();
    document.querySelectorAll('.modal-backdrop, .sidebar, .page-content').forEach(node => {
      node.style.webkitOverflowScrolling = 'touch';
    });
  }

  document.addEventListener('click', closeSidebarAfterNavigation, true);
  document.addEventListener('pointerdown', preventRapidDoubleTap, { passive: true });

  window.addEventListener('DOMContentLoaded', () => {
    enhance();
    new MutationObserver(enhance).observe(document.body, { childList: true, subtree: true });
  });

  mq.addEventListener?.('change', enhance);
})();
