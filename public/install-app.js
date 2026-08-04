(() => {
  let deferredPrompt = null;
  const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

  function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/service-worker.js').catch(error => {
        console.warn('Não foi possível registrar o aplicativo instalável:', error);
      });
    });
  }

  function findInstallButton() {
    return document.querySelector('#wr-install-app');
  }

  function updateButton() {
    const button = findInstallButton();
    if (!button) return;
    if (isStandalone()) {
      button.hidden = true;
      return;
    }
    button.hidden = false;
    button.classList.toggle('is-ready', Boolean(deferredPrompt));
  }

  async function installApp() {
    if (isStandalone()) return;
    if (deferredPrompt) {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      deferredPrompt = null;
      updateButton();
      return;
    }

    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const message = isIOS
      ? 'No Safari, toque em Compartilhar e depois em Adicionar à Tela de Início.'
      : 'No Chrome, abra o menu de três pontos e toque em Instalar aplicativo ou Adicionar à tela inicial.';
    window.alert(message);
  }

  function createInstallButton() {
    if (findInstallButton() || isStandalone()) return;
    const button = document.createElement('button');
    button.id = 'wr-install-app';
    button.type = 'button';
    button.className = 'wr-install-app';
    button.innerHTML = '<img class="wr-install-logo" src="/brand/app-icon-192.webp" alt="Ícone Queijos WR"><span><strong>Instalar aplicativo</strong><small>Usar no celular com ícone</small></span>';
    button.addEventListener('click', installApp);
    document.body.appendChild(button);
    updateButton();
  }

  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    deferredPrompt = event;
    createInstallButton();
    updateButton();
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    findInstallButton()?.remove();
  });

  window.addEventListener('DOMContentLoaded', () => {
    createInstallButton();
    new MutationObserver(() => {
      if (!isStandalone() && document.querySelector('.app-shell')) createInstallButton();
      updateButton();
    }).observe(document.body, { childList: true, subtree: true });
  });

  registerServiceWorker();
})();