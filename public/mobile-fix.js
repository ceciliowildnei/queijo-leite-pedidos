(() => {
  window.addEventListener('error', function(event) {
    const msg = String(event.message || '');
    if (msg.includes('Unexpected token') && msg.includes('<')) {
      event.preventDefault();
    }
  }, true);
})();
