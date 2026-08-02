(() => {
  const apply = () => {
    document.querySelectorAll('.login-heading > span').forEach(el => { el.textContent = 'Gestão de pedidos'; });
    document.querySelectorAll('.login-heading h2').forEach(el => { el.textContent = 'Bem-vindo'; });
    document.querySelectorAll('.login-card .btn-primary').forEach(el => {
      if (!el.textContent.includes('Entrando')) el.textContent = 'Entrar no sistema';
    });
    document.querySelectorAll('.login-footnote').forEach(el => { el.textContent = 'Dados protegidos e sincronizados'; });

    document.querySelectorAll('.sidebar-nav button').forEach(button => {
      const label = button.querySelector('.nav-label');
      if (!label) return;
      if (label.textContent.trim() === 'Dashboard') label.textContent = 'Visão geral';
      if (label.textContent.trim() === 'Administração') label.textContent = 'Colaboradores';
      if (label.textContent.trim() === 'PDFs e comprovantes') label.textContent = 'Comprovantes';
    });

    document.querySelectorAll('.topbar-title h1').forEach(el => {
      if (el.textContent.trim() === 'Dashboard') el.textContent = 'Visão geral';
      if (el.textContent.trim() === 'Administração') el.textContent = 'Colaboradores';
    });

    document.querySelectorAll('.page-stack').forEach(stack => {
      const title = stack.querySelector('.page-header h2');
      stack.classList.toggle('workspace-dashboard', title?.textContent.trim() === 'Visão geral');
    });
  };

  const observer = new MutationObserver(apply);
  observer.observe(document.documentElement, { subtree: true, childList: true, characterData: true });
  document.addEventListener('DOMContentLoaded', apply);
  window.addEventListener('load', apply);
  apply();
})();
