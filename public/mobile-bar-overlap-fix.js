(() => {
  const mq = window.matchMedia('(max-width: 900px)');
  const root = document.documentElement;
  let frame = 0;

  function updateViewportState() {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      if (!mq.matches) {
        root.classList.remove('wr-mobile-keyboard-open');
        root.style.removeProperty('--wr-mobile-visual-bottom-inset');
        return;
      }

      const viewport = window.visualViewport;
      if (!viewport) return;

      const layoutHeight = window.innerHeight;
      const visibleHeight = viewport.height;
      const offsetBottom = Math.max(0, layoutHeight - visibleHeight - viewport.offsetTop);
      const keyboardOpen = offsetBottom > 120;

      root.classList.toggle('wr-mobile-keyboard-open', keyboardOpen);
      root.style.setProperty('--wr-mobile-visual-bottom-inset', keyboardOpen ? '0px' : `${Math.min(offsetBottom, 36)}px`);
    });
  }

  function removeDuplicateBars() {
    const bars = [...document.querySelectorAll('.mobile-bottom-nav')];
    const official = document.querySelector('#wr-mobile-bottom-nav');
    bars.forEach(bar => {
      if (official && bar !== official) bar.remove();
    });
  }

  function refresh() {
    removeDuplicateBars();
    updateViewportState();
  }

  window.addEventListener('DOMContentLoaded', () => {
    refresh();
    new MutationObserver(refresh).observe(document.body, { childList: true, subtree: true });
  });

  window.addEventListener('resize', updateViewportState, { passive: true });
  window.addEventListener('orientationchange', updateViewportState, { passive: true });
  window.visualViewport?.addEventListener('resize', updateViewportState, { passive: true });
  window.visualViewport?.addEventListener('scroll', updateViewportState, { passive: true });
  mq.addEventListener?.('change', refresh);
})();
