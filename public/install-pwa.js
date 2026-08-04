(() => {
  let deferredPrompt = null;
  const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  const isMobile = () => window.matchMedia('(max-width: 900px)').matches;

  function removeInstallUI() {
    document.querySelectorAll('.wr-install-app').forEach(node => node.remove());
  }

  function showInstalledNotice() {
    const notice = document.createElement('div');
    notice.className = 'wr-install-toast';
    notice.textContent = 'Queijos WR instalado no celular.';
    document.body.appendChild(notice);
    setTimeout(() => notice.remove(), 3500);
  }

  async function installApp() {
    if (!deferredPrompt) {
      const help = document.querySelector('.wr-install-help');
      help?.classList.add('show');
      return;
    }
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    deferredPrompt = null;
    if (choice?.outcome === 'accepted') removeInstallUI();
  }

  function buildInstallUI() {
    if (!isMobile() || isStandalone() || document.querySelector('.wr-install-app')) return;

    const wrapper = document.createElement('div');
    wrapper.className = 'wr-install-app';
    wrapper.innerHTML = `
      <button type="button" class="wr-install-button" aria-label="Instalar Queijos WR no celular">
        <img src="/brand/app-icon-192.webp" alt="" />
        <span><strong>Instalar Queijos WR</strong><small>Adicionar à tela inicial</small></span>
      </button>
      <div class="wr-install-help">
        No Google Chrome, toque no menu <b>⋮</b> e depois em <b>Instalar aplicativo</b> ou <b>Adicionar à tela inicial</b>.
      </div>`;
    wrapper.querySelector('.wr-install-button').addEventListener('click', installApp);
    document.body.appendChild(wrapper);
  }

  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    deferredPrompt = event;
    buildInstallUI();
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    removeInstallUI();
    showInstalledNotice();
  });

  window.addEventListener('DOMContentLoaded', () => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(error => console.warn('Service Worker não registrado:', error));
    }
    setTimeout(buildInstallUI, 900);
  });
})();
