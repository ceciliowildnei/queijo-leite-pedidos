(() => {
  let deferredPrompt = null;
  const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  const isMobile = () => window.matchMedia('(max-width: 900px)').matches;

  function installButton() {
    let button = document.querySelector('#wr-install-app');
    if (button) return button;
    button = document.createElement('button');
    button.id = 'wr-install-app';
    button.type = 'button';
    button.className = 'wr-install-app';
    button.innerHTML = '<span class="wr-install-icon" aria-hidden="true">⬇</span><span><strong>Instalar Queijos WR</strong><small>Adicionar à tela inicial</small></span>';
    button.hidden = true;
    button.addEventListener('click', async () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        await deferredPrompt.userChoice;
        deferredPrompt = null;
        button.hidden = true;
        return;
      }
      const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
      alert(isIOS
        ? 'No Safari, toque em Compartilhar e depois em Adicionar à Tela de Início.'
        : 'No Chrome, toque no menu de três pontos e escolha Instalar aplicativo ou Adicionar à tela inicial.');
    });
    document.body.appendChild(button);
    return button;
  }

  function syncInstallButton() {
    const button = installButton();
    button.hidden = isStandalone() || !isMobile() || (!deferredPrompt && !/iphone|ipad|ipod/i.test(navigator.userAgent));
  }

  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    deferredPrompt = event;
    syncInstallButton();
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    const button = document.querySelector('#wr-install-app');
    if (button) button.hidden = true;
  });

  window.addEventListener('DOMContentLoaded', () => {
    syncInstallButton();
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(error => console.warn('Falha ao registrar modo instalável:', error));
    }
  });

  window.matchMedia('(display-mode: standalone)').addEventListener?.('change', syncInstallButton);
})();