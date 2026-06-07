(() => {
  function isReport(){ return /relat/i.test(document.querySelector('main h1')?.textContent || ''); }
  function addButton(){
    if(!isReport()) return;
    const actions = document.querySelector('.top-actions');
    if(!actions || document.querySelector('.pdf-report-btn')) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ghost pdf-report-btn';
    btn.textContent = 'Salvar PDF';
    btn.addEventListener('click', () => window.print());
    actions.prepend(btn);
  }
  document.addEventListener('DOMContentLoaded', addButton);
  document.addEventListener('click', () => setTimeout(addButton, 120), true);
  setInterval(addButton, 1000);
})();
