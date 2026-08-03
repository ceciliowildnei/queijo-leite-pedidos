(() => {
  const normalize = value => String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

  function updateCollaboratorState() {
    const role = normalize(document.querySelector('.profile-menu span')?.textContent);
    const isCollaborator = role.includes('colaborador');

    document.documentElement.classList.toggle('wr-collaborator-session', isCollaborator);

    const syncButton = document.querySelector('.topbar-actions .sync-btn');
    if (!syncButton) return;

    if (isCollaborator) {
      syncButton.setAttribute('aria-label', 'Sincronizar dados');
      syncButton.setAttribute('title', 'Sincronizar dados');
    }
  }

  let scheduled = false;
  function scheduleUpdate() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      updateCollaboratorState();
    });
  }

  window.addEventListener('DOMContentLoaded', () => {
    scheduleUpdate();
    new MutationObserver(scheduleUpdate).observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  });
})();
