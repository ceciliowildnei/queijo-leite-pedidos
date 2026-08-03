import fs from 'node:fs';
import path from 'node:path';

const filePath = path.resolve('src/main.jsx');
let source = fs.readFileSync(filePath, 'utf8');

const replacements = [
  ["'Entrar no ERP'", "'Entrar'"],
  ['>ERP Queijos WR<', '>Queijos WR<'],
  ['>Queijos WR ERP<', '>Queijos WR<'],
  ['>ERP Gestão<', '>Gestão<'],
  ['Queijos WR ERP', 'Queijos WR']
];
for (const [from, to] of replacements) source = source.split(from).join(to);

const clientSaveVariants = [
  `    if (entity === 'clientes') return save(entity, { id: form.id, nome: form.nome, telefone: onlyDigits(form.telefone), bairro: form.bairro, rua: form.rua, numero: form.numero, cidade: form.cidade, estado: form.estado, observacoes: form.observacoes });`,
  `    if (entity === 'clientes') return save(entity, { id: form.id, nome: form.nome, telefone: onlyDigits(form.telefone), cep: onlyDigits(form.cep), rua: form.rua, numero: form.numero, bairro: form.bairro, cidade: form.cidade, estado: form.estado, complemento: form.complemento, observacoes: form.observacoes });`,
  `    if (entity === 'clientes') return save(entity, { id: form.id, nome: form.nome, telefone: onlyDigits(form.telefone) });`
];
const clientSave = `    if (entity === 'clientes') return save(entity, { id: form.id, nome: form.nome, telefone: onlyDigits(form.telefone || '') });`;
for (const variant of clientSaveVariants) source = source.replace(variant, clientSave);

const optionalClientForm = `{entity === 'clientes' && <><div className="form-note full"><strong>Cadastro sem disparo:</strong> o nome é obrigatório e o WhatsApp é opcional. Nenhuma mensagem será enviada ao salvar.</div><Field label="Nome" required value={form.nome} onChange={value => set('nome', value)} /><Field label="WhatsApp (opcional)" value={form.telefone} onChange={value => set('telefone', value)} /></>}`;
source = source.replace(/\{entity === 'clientes' && <>.*?<\/>>\}/s, optionalClientForm);

const createOriginal = `    const response = await supabase.from('wr_pedidos').insert(rows);\n    if (response.error) return setError(response.error.message);\n    addLog('Pedido criado', \`\${code} · \${client?.nome || 'Cliente'} · \${rows.length} item(ns)\`);\n    setModal(null);\n    setNotice(\`Pedido \${code} criado com sucesso.\`);\n    await sync(true);`;
const createReplacement = `    const response = await supabase.from('wr_pedidos').insert(rows);\n    if (response.error) return setError(response.error.message);\n    addLog('Pedido criado', \`\${code} · \${client?.nome || 'Cliente'} · \${rows.length} item(ns)\`);\n    setModal(null);\n    await sync(true);\n    if (payload.sendWhatsapp) {\n      const phone = onlyDigits(client?.telefone || '');\n      if (!phone) {\n        setNotice(\`Pedido \${code} salvo. Cliente sem WhatsApp cadastrado.\`);\n        return;\n      }\n      const destination = phone.startsWith('55') ? phone : \`55\${phone}\`;\n      const items = rows.map(row => \`- \${row.quantidade}x \${row.produto_nome}: \${money(row.total)}\`).join('\\n');\n      const text = \`Olá, \${client?.nome || 'cliente'}!\\n\\nSeu pedido \${code} foi salvo na Queijos WR.\\n\${items}\\n\\nTotal: \${money(sum(rows, 'total'))}\\nEntrega: \${brDate(payload.data_entrega || selectedDate)}\\n\\nObrigado pela preferência!\`;\n      window.open(\`https://wa.me/\${destination}?text=\${encodeURIComponent(text)}\`, '_blank');\n      setNotice(\`Pedido \${code} salvo. Mensagem aberta no WhatsApp.\`);\n      return;\n    }\n    setNotice(\`Pedido \${code} criado com sucesso.\`);`;
source = source.replace(createOriginal, createReplacement);

const submitOriginal = `  function submit(event) {\n    event.preventDefault();\n    if (!form.cliente_id || !form.items.length) return;\n    save(form);\n  }`;
const submitReplacement = `  function submit(event, sendWhatsapp = false) {\n    event.preventDefault();\n    if (!form.cliente_id || !form.items.length) return;\n    save({ ...form, sendWhatsapp });\n  }`;
source = source.replace(submitOriginal, submitReplacement);

source = source.replace(
  `<button className="btn btn-primary btn-lg" type="submit" disabled={!form.cliente_id || !form.items.length}>Finalizar pedido</button><button className="btn btn-ghost" type="button" onClick={close}>Cancelar</button>`,
  `<button className="btn btn-primary btn-lg" type="submit" disabled={!form.cliente_id || !form.items.length}>Salvar pedido</button><button className="btn btn-secondary btn-lg" type="button" disabled={!form.cliente_id || !form.items.length} onClick={event => submit(event, true)}>Salvar e enviar WhatsApp</button><button className="btn btn-ghost" type="button" onClick={close}>Cancelar</button>`
);

if (!source.includes('Salvar e enviar WhatsApp')) throw new Error('Botão de WhatsApp não foi inserido.');

const oldWeekOrders = `  const weekOrders = useMemo(() => {\n    const start = weekStart(isoToday());\n    return db.pedidos.filter(order => isBetween(orderDate(order), start, addDays(start, 6)));\n  }, [db.pedidos]);`;
const fridayWeekOrders = `  const dashboardFriday = useMemo(() => addDays(weekStart(selectedDate), 4), [selectedDate]);\n  const weekOrders = useMemo(() => db.pedidos.filter(order => orderDate(order) === dashboardFriday), [db.pedidos, dashboardFriday]);`;
source = source.replace(oldWeekOrders, fridayWeekOrders);
source = source.replace(
  `    db, query, selectedDate, selectedOrders, todayOrders, weekOrders, routes, cashOuts, photos, logs,`,
  `    db, query, selectedDate, selectedOrders, todayOrders, weekOrders, dashboardFriday, routes, cashOuts, photos, logs,`
);

const fridayDashboard = `function Dashboard({ weekOrders, dashboardFriday, cashOuts, setModal, selectTab, canManage }) {
  const fridayOrders = weekOrders;
  const paid = fridayOrders.filter(order => normalize(order.status_pagamento).includes('pago'));
  const outputs = cashOuts.filter(item => item.data === dashboardFriday);
  const orderKeys = new Set(fridayOrders.map(order => order.codigo || order.id));
  const clientKeys = new Set(fridayOrders.map(order => order.cliente_id || normalize(order.cliente_nome)).filter(Boolean));
  const pending = fridayOrders.filter(order => normalize(order.status_pedido) !== 'entregue');
  const delivered = fridayOrders.filter(order => normalize(order.status_pedido) === 'entregue');
  const metrics = {
    revenue: sum(fridayOrders, 'total'),
    orders: orderKeys.size,
    pending: pending.length,
    delivered: delivered.length,
    clients: clientKeys.size,
    cheese1: sum(fridayOrders.filter(order => productSize(order.produto_nome) === '1kg'), 'quantidade'),
    cheese500: sum(fridayOrders.filter(order => productSize(order.produto_nome) === '500g'), 'quantidade'),
    milk: sum(fridayOrders.filter(order => productSize(order.produto_nome) === 'leite'), 'quantidade'),
    deliveries: orderKeys.size,
    cash: sum(paid, 'total') - sum(outputs, 'valor'),
    quantity: sum(fridayOrders, 'quantidade'),
  };
  const lastOrders = [...fridayOrders].sort((a, b) => String(b.criado_em || '').localeCompare(String(a.criado_em || ''))).slice(0, 6);
  const upcoming = pending.slice().sort((a, b) => String(a.cliente_nome || '').localeCompare(String(b.cliente_nome || ''), 'pt-BR')).slice(0, 6);
  const chart = [{ date: dashboardFriday, value: metrics.revenue }];
  const ranking = Object.values(fridayOrders.reduce((acc, order) => {
    const key = order.produto_nome || 'Produto';
    acc[key] = acc[key] || { name: key, quantity: 0, value: 0 };
    acc[key].quantity += number(order.quantidade);
    acc[key].value += number(order.total);
    return acc;
  }, {})).sort((a, b) => b.quantity - a.quantity).slice(0, 5);

  return (
    <div className="page-stack">
      <PageHeader title="Pedidos da semana" subtitle={\`Entrega de sexta-feira: \${brDate(dashboardFriday)}. O Dashboard exibe somente os pedidos dessa sexta.\`} actions={<>{canManage && <button className="btn btn-secondary" onClick={() => setModal({ type: 'routes' })}>Gerenciar rotas</button>}<button className="btn btn-primary" onClick={() => setModal({ type: 'order-cart' })}>+ Novo pedido</button></>} />
      <div className="metric-grid metric-grid-large">
        <MetricCard label="Receita da sexta" value={money(metrics.revenue)} icon="R$" trend={brDate(dashboardFriday)} tone="green" />
        <MetricCard label="Pedidos da semana" value={metrics.orders} icon="↗" trend="Entrega na sexta-feira" tone="gold" />
        <MetricCard label="Pedidos pendentes" value={metrics.pending} icon="◷" trend={\`\${metrics.delivered} entregues\`} tone="orange" />
        <MetricCard label="Clientes da semana" value={metrics.clients} icon="◎" trend="Somente desta sexta" tone="blue" />
      </div>
      <div className="metric-grid metric-grid-compact">
        <MiniMetric label="Queijo 1kg" value={metrics.cheese1} /><MiniMetric label="Queijo 500g" value={metrics.cheese500} /><MiniMetric label="Leite" value={metrics.milk} /><MiniMetric label="Entregas da sexta" value={metrics.deliveries} /><MiniMetric label="Quantidade total" value={metrics.quantity} /><MiniMetric label="Caixa da sexta" value={money(metrics.cash)} />
      </div>
      <div className="dashboard-grid">
        <Panel className="chart-panel" title="Receita da sexta-feira" action={<button className="link-btn" onClick={() => selectTab('relatorios')}>Ver relatórios</button>}><BarChart data={chart} /></Panel>
        <Panel title="Ranking dos produtos da sexta"><RankingList items={ranking} /></Panel>
      </div>
      <div className="dashboard-grid">
        <Panel title="Pedidos desta sexta" action={<button className="link-btn" onClick={() => selectTab('pedidos')}>Ver todos</button>}><CompactOrderList orders={lastOrders} /></Panel>
        <Panel title="Entregas desta sexta" action={<button className="link-btn" onClick={() => selectTab('entregas')}>Abrir entregas</button>}><UpcomingList orders={upcoming} /></Panel>
      </div>
    </div>
  );
}`;

source = source.replace(/function Dashboard\([\s\S]*?\n}\n\nfunction ClientsPage/, `${fridayDashboard}\n\nfunction ClientsPage`);

if (!source.includes('O Dashboard exibe somente os pedidos dessa sexta.')) {
  throw new Error('Não foi possível aplicar o filtro de sexta-feira no Dashboard.');
}

if (!source.includes('Relatório de separação')) {
  const marker = `      <div className="dashboard-grid"><Panel title="Ranking de produtos"><DataTable compact columns={['Produto', 'Quantidade', 'Faturamento']} rows={ranking.map(item => [item.name, item.quantity, money(item.value)])} empty="Sem dados." /></Panel><Panel title="Resumo por rota"><DataTable compact columns={['Rota', 'Pedidos', 'Qtd.', 'Valor']} rows={routeSummary.map(item => [item.route, item.orders, item.quantity, money(item.value)])} empty="Sem rotas com pedidos." /></Panel></div>`;
  const report = `${marker}\n      <Panel title="Relatório de separação"><DataTable compact columns={['Nome do cliente', 'Produto', 'Quantidade', 'Separado']} rows={[...selectedOrders].sort((a, b) => String(a.cliente_nome || '').localeCompare(String(b.cliente_nome || ''))).map(order => [order.cliente_nome || '—', order.produto_nome || '—', order.quantidade || 0, ['separado', 'em rota', 'entregue'].includes(normalize(order.status_pedido)) ? 'Sim' : 'Não'])} empty="Nenhum pedido nesta data." /></Panel>`;
  source = source.replace(marker, report);
}

fs.writeFileSync(filePath, source, 'utf8');
console.log('Dashboard limitado à sexta-feira, ajustes visuais e WhatsApp preparados.');
