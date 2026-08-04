(() => {
  const normalize = value => String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

  const shield = symbol => `
    <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <path class="wr-simple-shield" d="M32 3 55 11v18c0 15-9 26-23 32C18 55 9 44 9 29V11Z"/>
      <path class="wr-simple-shield-line" d="M32 7 51 14v15c0 12-7 21-19 27-12-6-19-15-19-27V14Z"/>
      ${symbol}
    </svg>`;

  const icons = {
    dashboard: shield(`
      <rect class="wr-icon-cream" x="20" y="19" width="10" height="10" rx="2"/>
      <rect class="wr-icon-cream" x="34" y="19" width="10" height="10" rx="2"/>
      <rect class="wr-icon-cream" x="20" y="33" width="10" height="10" rx="2"/>
      <rect class="wr-icon-gold" x="34" y="33" width="10" height="10" rx="2"/>
    `),
    clientes: shield(`
      <circle class="wr-icon-cream" cx="27" cy="25" r="7"/>
      <path class="wr-icon-cream" d="M16 43c1-8 5-12 11-12s10 4 11 12Z"/>
      <circle class="wr-icon-gold-soft" cx="41" cy="28" r="5"/>
      <path class="wr-icon-gold-soft" d="M35 43c.7-6 3-9 7-9 4.2 0 6.5 3 7 9Z"/>
    `),
    produtos: shield(`
      <path class="wr-icon-gold" d="M18 34c0-9 7-16 16-16 6 0 11 3 14 7L36 34Z"/>
      <path class="wr-icon-gold-soft" d="m36 34 12-9v17L36 47Z"/>
      <circle class="wr-icon-green-dot" cx="28" cy="27" r="2"/>
      <circle class="wr-icon-green-dot" cx="38" cy="30" r="2"/>
      <circle class="wr-icon-green-dot" cx="42" cy="38" r="2"/>
    `),
    pedidos: shield(`
      <rect class="wr-icon-cream" x="20" y="17" width="25" height="31" rx="4"/>
      <rect class="wr-icon-gold" x="27" y="14" width="11" height="5" rx="2"/>
      <path class="wr-icon-check" d="m24 27 3 3 5-6m-8 10 3 3 5-6m-8 10 3 3 5-6"/>
      <path class="wr-icon-line" d="M35 27h7m-7 7h7m-7 7h7"/>
    `),
    entregas: shield(`
      <rect class="wr-icon-gold" x="17" y="25" width="22" height="14" rx="3"/>
      <path class="wr-icon-gold-soft" d="M39 29h7l5 6v4H39Z"/>
      <circle class="wr-icon-cream" cx="25" cy="43" r="4"/>
      <circle class="wr-icon-cream" cx="45" cy="43" r="4"/>
      <path class="wr-icon-line-gold" d="M13 29h6m-8 5h8"/>
    `),
    caixa: shield(`
      <rect class="wr-icon-cream" x="18" y="25" width="29" height="20" rx="4"/>
      <rect class="wr-icon-gold-soft" x="24" y="18" width="17" height="10" rx="2"/>
      <rect class="wr-icon-green-dot" x="27" y="21" width="11" height="4" rx="1"/>
      <g class="wr-icon-gold"><rect x="23" y="31" width="5" height="4" rx="1"/><rect x="30" y="31" width="5" height="4" rx="1"/><rect x="37" y="31" width="5" height="4" rx="1"/></g>
      <path class="wr-icon-line" d="M23 40h19"/>
    `),
    relatorios: shield(`
      <rect class="wr-icon-green-light" x="19" y="34" width="7" height="12" rx="2"/>
      <rect class="wr-icon-cream" x="29" y="27" width="7" height="19" rx="2"/>
      <rect class="wr-icon-gold" x="39" y="20" width="7" height="26" rx="2"/>
      <path class="wr-icon-line-gold" d="M17 49h32"/>
    `),
    administracao: shield(`
      <path class="wr-icon-gold" d="m32 17 4 2 4-1 2 4 4 2-1 4 2 4-3 3v5l-4 1-3 4-4-2-4 2-3-4-5-1v-5l-3-3 2-4-1-4 4-2 2-4 4 1Z"/>
      <circle class="wr-icon-shield-hole" cx="32" cy="31" r="8"/>
    `),
    pdf: shield(`
      <path class="wr-icon-cream" d="M21 16h17l8 8v24H21Z"/>
      <path class="wr-icon-gold-soft" d="M38 16v9h8"/>
      <rect class="wr-icon-gold" x="18" y="33" width="27" height="10" rx="2"/>
      <text class="wr-icon-pdf-text" x="31.5" y="40.5" text-anchor="middle">PDF</text>
    `),
    sync: shield(`
      <path class="wr-icon-line-gold-thick" d="M20 31a13 13 0 0 1 22-8l4 4m0-7v7h-7M44 35a13 13 0 0 1-22 7l-4-4m0 7v-7h7"/>
    `),
    exit: shield(`
      <path class="wr-icon-cream" d="M20 17h18v31H20Z"/>
      <path class="wr-icon-line-gold-thick" d="M32 32h18m-6-6 6 6-6 6"/>
    `),
    more: shield(`
      <circle class="wr-icon-gold" cx="23" cy="32" r="4"/>
      <circle class="wr-icon-gold" cx="32" cy="32" r="4"/>
      <circle class="wr-icon-gold" cx="41" cy="32" r="4"/>
    `),

    'milk-bottle': `
      <svg viewBox="0 0 96 80" aria-hidden="true" focusable="false">
        <path class="wr-product-glass" d="M36 10h24v8l5 8v39c0 5-4 9-9 9H40c-5 0-9-4-9-9V26l5-8Z"/>
        <rect class="wr-product-gold" x="36" y="8" width="24" height="8" rx="3"/>
        <path class="wr-product-milk" d="M34 36h28v28c0 4-3 7-7 7H41c-4 0-7-3-7-7Z"/>
        <rect class="wr-product-green" x="33" y="40" width="30" height="13" rx="3"/>
        <circle class="wr-product-gold" cx="48" cy="46.5" r="4"/>
      </svg>`,
    'milk-carton': `
      <svg viewBox="0 0 96 80" aria-hidden="true" focusable="false">
        <path class="wr-product-cream" d="M31 17h31l9 10v44H29V27Z"/>
        <path class="wr-product-gold-soft" d="m31 17 10-8h24l-3 8Z"/>
        <path class="wr-product-green" d="M29 43c10-6 23 6 42 0v28H29Z"/>
        <circle class="wr-product-gold" cx="50" cy="52" r="8"/>
      </svg>`,
    'cheese-wheel': `
      <svg viewBox="0 0 96 80" aria-hidden="true" focusable="false">
        <ellipse class="wr-product-gold" cx="45" cy="31" rx="28" ry="16"/>
        <path class="wr-product-gold-soft" d="M17 31v22c0 9 13 16 28 16s28-7 28-16V31c0 9-13 16-28 16S17 40 17 31Z"/>
        <path class="wr-product-cream" d="m54 31 26-10v31L54 63Z"/>
        <circle class="wr-product-hole" cx="65" cy="36" r="3"/>
        <circle class="wr-product-hole" cx="72" cy="45" r="2.5"/>
      </svg>`,
    'cheese-half': `
      <svg viewBox="0 0 96 80" aria-hidden="true" focusable="false">
        <path class="wr-product-gold" d="M21 48c0-16 13-29 29-29 10 0 19 5 24 12L50 48Z"/>
        <path class="wr-product-gold-soft" d="M21 48h29v20H31c-6 0-10-4-10-10Z"/>
        <circle class="wr-product-hole" cx="38" cy="39" r="3"/>
        <circle class="wr-product-hole" cx="31" cy="55" r="2.5"/>
        <circle class="wr-product-hole" cx="43" cy="58" r="2"/>
      </svg>`,
    'cheese-slice': `
      <svg viewBox="0 0 96 80" aria-hidden="true" focusable="false">
        <path class="wr-product-gold" d="m20 62 28-44 30 30Z"/>
        <circle class="wr-product-hole" cx="49" cy="37" r="4"/>
        <circle class="wr-product-hole" cx="58" cy="48" r="3"/>
        <circle class="wr-product-hole" cx="40" cy="52" r="2.5"/>
      </svg>`,
    'cheese-block': `
      <svg viewBox="0 0 96 80" aria-hidden="true" focusable="false">
        <path class="wr-product-gold" d="m25 30 28-11 20 11-29 12Z"/>
        <path class="wr-product-gold-soft" d="M25 30v30l19 11V42Z"/>
        <path class="wr-product-cream" d="m44 42 29-12v30L44 71Z"/>
        <circle class="wr-product-hole" cx="57" cy="47" r="3"/>
        <circle class="wr-product-hole" cx="66" cy="57" r="2.5"/>
        <circle class="wr-product-hole" cx="35" cy="47" r="2"/>
      </svg>`,
    'product-box': `
      <svg viewBox="0 0 96 80" aria-hidden="true" focusable="false">
        <path class="wr-product-green" d="M18 27 48 13l30 14v35L48 75 18 62Z"/>
        <path class="wr-product-cream" d="m18 27 30 14 30-14-30-14Z"/>
        <path class="wr-product-gold" d="M44 15h8v58h-8Z"/>
        <circle class="wr-product-gold" cx="32" cy="49" r="7"/>
      </svg>`,
    catalog: `
      <svg viewBox="0 0 96 80" aria-hidden="true" focusable="false">
        <rect class="wr-product-green" x="25" y="13" width="47" height="58" rx="5"/>
        <rect class="wr-product-cream" x="31" y="18" width="35" height="46" rx="3"/>
        <path class="wr-product-gold" d="M48 26c7 0 13 5 13 12 0 8-6 14-13 14s-13-6-13-14c0-7 6-12 13-12Z"/>
        <path class="wr-product-green" d="m48 31 8 6-8 10-8-10Z"/>
        <path class="wr-product-gold-soft" d="M43 64h10v10l-5-3-5 3Z"/>
      </svg>`,
  };

  const keyFromIcon = icon => {
    const classes = [...icon.classList];
    const systemClass = classes.find(name => name.startsWith('wr-system-') && name !== 'wr-system-icon');
    if (systemClass) return systemClass.replace('wr-system-', '');
    const iconClass = classes.find(name => name.startsWith('wr-icon-'));
    return iconClass ? iconClass.replace('wr-icon-', '') : '';
  };

  const productKey = card => {
    const name = normalize(card.querySelector('h3')?.textContent);
    const unit = normalize(card.querySelector('.product-content > span')?.textContent);
    const text = `${name} ${unit}`;
    if (text.includes('catalog')) return 'catalog';
    if (text.includes('caixa') || text.includes('kit')) return 'product-box';
    if (text.includes('leite') && (text.includes('caixa') || text.includes('litro'))) return 'milk-carton';
    if (text.includes('leite')) return 'milk-bottle';
    if (text.includes('fatia')) return 'cheese-slice';
    if (text.includes('pedaco') || text.includes('cubo')) return 'cheese-block';
    if (text.includes('500') || text.includes('meio') || text.includes('pequeno')) return 'cheese-half';
    return 'cheese-wheel';
  };

  const render = (element, key) => {
    const markup = icons[key];
    if (!element || !markup) return;
    if (element.dataset.wrSimpleIcon === key && element.querySelector('svg')) return;
    element.innerHTML = markup;
    element.dataset.wrSimpleIcon = key;
    element.setAttribute('aria-hidden', 'true');
  };

  const renderSystemIcons = () => {
    document.querySelectorAll('.wr-brand-icon, .wr-system-icon').forEach(icon => {
      const key = keyFromIcon(icon);
      if (key) render(icon, key);
    });
  };

  const renderProductIcons = () => {
    document.querySelectorAll('.product-card').forEach(card => {
      const icon = card.querySelector('.product-art .wr-brand-icon');
      if (!icon) return;
      icon.className = 'wr-brand-icon wr-product-simple-icon';
      render(icon, productKey(card));
    });
  };

  let scheduled = false;
  const scan = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      renderSystemIcons();
      renderProductIcons();
    });
  };

  window.addEventListener('DOMContentLoaded', () => {
    scan();
    new MutationObserver(scan).observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class']
    });
  });
})();
