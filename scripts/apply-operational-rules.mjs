import fs from 'node:fs';
import path from 'node:path';

const targetPath = path.resolve(process.argv[2] || 'src/main.jsx');
let source = fs.readFileSync(targetPath, 'utf8');

if (source.includes("const isCanceledOrder = order => normalize(order?.status_pedido).includes('cancel');")) {
  console.log('As regras de cancelamento ja estao aplicadas.');
  process.exit(0);
}

const applied = [];
function replaceOnce(label, from, to) {
  if (!source.includes(from)) {
    throw new Error(`Trecho nao encontrado para a regra: ${label}`);
  }
  source = source.replace(from, to);
  applied.push(label);
}

replaceOnce(
  'predicado de pedido cancelado',
  String.raw`const normalize = value => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
const hasFullAccess`,
  String.raw`const normalize = value => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
const isCanceledOrder = order => normalize(order?.status_pedido).includes('cancel');
const isOperationalOrder = order => !isCanceledOrder(order);
const hasFullAccess`
);

replaceOnce(
  'cor visual de cancelamento',
  `const statusTone = value => {\n  const text = normalize(value);\n`,
  `const statusTone = value => {\n  const text = normalize(value);\n  if (text.includes('cancel')) return 'warning';\n`
);

replaceOnce(
  'pedidos de hoje sem cancelados',
  `const todayOrders = useMemo(() => db.pedidos.filter(order => orderDate(order) === isoToday()), [db.pedidos]);`,
  `const todayOrders = useMemo(() => db.pedidos.filter(order => isOperationalOrder(order) && orderDate(order) === isoToday()), [db.pedidos]);`
);

replaceOnce(
  'pedidos da semana sem cancelados',
  `return db.pedidos.filter(order => isBetween(orderDate(order), start, addDays(start, 6)));`,
  `return db.pedidos.filter(order => isOperationalOrder(order) && isBetween(orderDate(order), start, addDays(start, 6)));`
);

replaceOnce(
  'cancelamento do pedido inteiro',
  `  async function updateOrder(id, changes, detail = 'Status do pedido atualizado') {\n    const response = await supabase.from('wr_pedidos').update(changes).eq('id', id);\n    if (response.error) return setError(response.error.message);\n    addLog(detail, \`Pedido \${id}\`);\n    await sync(true);\n  }`,
  `  async function updateOrder(orderOrId, changes, detail = 'Status do pedido atualizado') {\n    const order = typeof orderOrId === 'object'\n      ? orderOrId\n      : db.pedidos.find(item => String(item.id) === String(orderOrId));\n    const id = order?.id || orderOrId;\n    const isCanceling = changes.status_pedido === 'Cancelado';\n    const isReactivating = isCanceledOrder(order) && changes.status_pedido === 'Separado';\n    if (isCanceling && !window.confirm(\`Cancelar o pedido \${order?.codigo || id} inteiro?\`)) return;\n    const request = supabase.from('wr_pedidos').update(changes);\n    const response = order?.codigo && (isCanceling || isReactivating)\n      ? await request.eq('codigo', order.codigo)\n      : await request.eq('id', id);\n    if (response.error) return setError(response.error.message);\n    addLog(detail, \`Pedido \${order?.codigo || id}\`);\n    if (isCanceling) setNotice('Pedido cancelado. Ele foi retirado dos totais, da semana, da producao e das entregas.');\n    if (isReactivating) setNotice('Pedido reativado e devolvido ao fluxo operacional.');\n    await sync(true);\n  }`
);

replaceOnce(
  'dashboard usa somente pedidos validos',
  `function Dashboard({ db, todayOrders, weekOrders, selectedOrders, selectedDate, cashOuts, setModal, selectTab, canManage }) {\n  const paid = selectedOrders.filter(order => normalize(order.status_pagamento).includes('pago'));`,
  `function Dashboard({ db, todayOrders, weekOrders, selectedOrders, selectedDate, cashOuts, setModal, selectTab, canManage }) {\n  const operationalOrders = selectedOrders.filter(isOperationalOrder);\n  const paid = operationalOrders.filter(order => normalize(order.status_pagamento).includes('pago'));`
);

for (const [label, from, to] of [
  ['pendentes do dashboard', `pending: selectedOrders.filter(order => normalize(order.status_pedido) !== 'entregue').length,`, `pending: operationalOrders.filter(order => normalize(order.status_pedido) !== 'entregue').length,`],
  ['entregues do dashboard', `delivered: selectedOrders.filter(order => normalize(order.status_pedido) === 'entregue').length,`, `delivered: operationalOrders.filter(order => normalize(order.status_pedido) === 'entregue').length,`],
  ['queijo 1kg do dashboard', `cheese1: sum(selectedOrders.filter(order => productSize(order.produto_nome) === '1kg'), 'quantidade'),`, `cheese1: sum(operationalOrders.filter(order => productSize(order.produto_nome) === '1kg'), 'quantidade'),`],
  ['queijo 500g do dashboard', `cheese500: sum(selectedOrders.filter(order => productSize(order.produto_nome) === '500g'), 'quantidade'),`, `cheese500: sum(operationalOrders.filter(order => productSize(order.produto_nome) === '500g'), 'quantidade'),`],
  ['leite do dashboard', `milk: sum(selectedOrders.filter(order => productSize(order.produto_nome) === 'leite'), 'quantidade'),`, `milk: sum(operationalOrders.filter(order => productSize(order.produto_nome) === 'leite'), 'quantidade'),`],
  ['entregas do dashboard', `deliveries: selectedOrders.length,`, `deliveries: operationalOrders.length,`],
  ['ultimos pedidos do dashboard', `const lastOrders = [...db.pedidos].sort((a, b) => String(b.criado_em || b.data_entrega || '').localeCompare(String(a.criado_em || a.data_entrega || ''))).slice(0, 6);`, `const lastOrders = db.pedidos.filter(isOperationalOrder).sort((a, b) => String(b.criado_em || b.data_entrega || '').localeCompare(String(a.criado_em || a.data_entrega || ''))).slice(0, 6);`],
  ['proximas entregas do dashboard', `const upcoming = db.pedidos.filter(order => orderDate(order) >= isoToday() && normalize(order.status_pedido) !== 'entregue').sort((a, b) => orderDate(a).localeCompare(orderDate(b))).slice(0, 6);`, `const upcoming = db.pedidos.filter(order => isOperationalOrder(order) && orderDate(order) >= isoToday() && normalize(order.status_pedido) !== 'entregue').sort((a, b) => orderDate(a).localeCompare(orderDate(b))).slice(0, 6);`],
  ['grafico do dashboard', `const items = db.pedidos.filter(order => orderDate(order) === date);`, `const items = db.pedidos.filter(order => isOperationalOrder(order) && orderDate(order) === date);`],
  ['ranking do dashboard', `const ranking = Object.values(selectedOrders.reduce((acc, order) => {`, `const ranking = Object.values(operationalOrders.reduce((acc, order) => {`],
]) replaceOnce(label, from, to);

replaceOnce(
  'lista padrao de pedidos sem cancelados',
  `const filtered = selectedOrders.filter(order => (!query || normalize(JSON.stringify(order)).includes(normalize(query))) && (status === 'todos' || normalize(order.status_pedido) === normalize(status)));`,
  `const filtered = selectedOrders.filter(order => {\n    const matchesQuery = !query || normalize(JSON.stringify(order)).includes(normalize(query));\n    const matchesStatus = status === 'todos'\n      ? isOperationalOrder(order)\n      : normalize(order.status_pedido) === normalize(status);\n    return matchesQuery && matchesStatus;\n  });`
);

replaceOnce(
  'filtro de status cancelado',
  `<option value="todos">Todos os status</option><option>Separado</option><option>Em rota</option><option>Entregue</option>`,
  `<option value="todos">Todos os status</option><option>Separado</option><option>Em rota</option><option>Entregue</option><option>Cancelado</option>`
);

replaceOnce(
  'acoes cancelar e reativar',
  `<button onClick={() => updateOrder(order.id, { status_pagamento: 'Pago' }, 'Pagamento confirmado')}>Pago</button><button onClick={() => setModal({ type: 'entity', entity: 'pedidos', item: order })}>Editar</button>`,
  `{!isCanceledOrder(order) && <button onClick={() => updateOrder(order.id, { status_pagamento: 'Pago' }, 'Pagamento confirmado')}>Pago</button>}{isCanceledOrder(order) ? <button onClick={() => updateOrder(order, { status_pedido: 'Separado' }, 'Pedido reativado')}>Reativar</button> : <button className="danger-link" onClick={() => updateOrder(order, { status_pedido: 'Cancelado' }, 'Pedido cancelado')}>Cancelar</button>}<button onClick={() => setModal({ type: 'entity', entity: 'pedidos', item: order })}>Editar</button>`
);

replaceOnce(
  'entregas sem cancelados',
  `const pending = visible.filter(order => normalize(order.status_pedido) !== 'entregue');`,
  `const pending = visible.filter(order => isOperationalOrder(order) && normalize(order.status_pedido) !== 'entregue');`
);

replaceOnce(
  'caixa sem cancelados',
  `const orders = db.pedidos.filter(order => orderDate(order) === selectedDate);`,
  `const orders = db.pedidos.filter(order => isOperationalOrder(order) && orderDate(order) === selectedDate);`
);

replaceOnce(
  'relatorios usam pedidos validos',
  `function ReportsPage({ db, selectedOrders, selectedDate, routes }) {\n  const production = selectedOrders.filter(order => normalize(order.status_pedido) !== 'entregue');`,
  `function ReportsPage({ db, selectedOrders, selectedDate, routes }) {\n  const operationalOrders = selectedOrders.filter(isOperationalOrder);\n  const production = operationalOrders.filter(order => normalize(order.status_pedido) !== 'entregue');`
);

replaceOnce('ranking dos relatorios', `const ranking = Object.values(selectedOrders.reduce((acc, order) => {`, `const ranking = Object.values(operationalOrders.reduce((acc, order) => {`);
replaceOnce('rotas dos relatorios', `const orders = selectedOrders.filter(order => routeOf(order, routes) === route);`, `const orders = operationalOrders.filter(order => routeOf(order, routes) === route);`);
replaceOnce('exportacao dos relatorios', `onClick={() => exportCsv(selectedOrders, selectedDate)}`, `onClick={() => exportCsv(operationalOrders, selectedDate)}`);
replaceOnce(
  'metricas dos relatorios',
  `<MetricCard label="Faturamento" value={money(sum(selectedOrders, 'total'))} icon="R$" tone="green" /><MetricCard label="Pedidos" value={selectedOrders.length} icon="#" tone="blue" /><MetricCard label="Produção pendente" value={sum(production, 'quantidade')} icon="◷" tone="orange" /><MetricCard label="Clientes atendidos" value={new Set(selectedOrders.map(order => order.cliente_id || order.cliente_nome)).size} icon="◎" tone="gold" />`,
  `<MetricCard label="Faturamento" value={money(sum(operationalOrders, 'total'))} icon="R$" tone="green" /><MetricCard label="Pedidos" value={operationalOrders.length} icon="#" tone="blue" /><MetricCard label="Produção pendente" value={sum(production, 'quantidade')} icon="◷" tone="orange" /><MetricCard label="Clientes atendidos" value={new Set(operationalOrders.map(order => order.cliente_id || order.cliente_nome)).size} icon="◎" tone="gold" />`
);

replaceOnce(
  'documentos usam pedidos validos',
  `function DocumentsPage({ db, selectedOrders, selectedDate, routes }) {\n  return (`,
  `function DocumentsPage({ db, selectedOrders, selectedDate, routes }) {\n  const operationalOrders = selectedOrders.filter(isOperationalOrder);\n  return (`
);
replaceOnce('lista de pedidos dos documentos', `printOrderList(selectedOrders, selectedDate)`, `printOrderList(operationalOrders, selectedDate)`);
replaceOnce('roteiro dos documentos', `printDeliveryList(selectedOrders, selectedDate, routes)`, `printDeliveryList(operationalOrders, selectedDate, routes)`);
replaceOnce('comprovantes dos documentos', `rows={selectedOrders.map(order =>`, `rows={operationalOrders.map(order =>`);

replaceOnce(
  'historico financeiro sem cancelados',
  `function ClientHistory({ close, client, orders }) {\n  const history = orders.filter(order => String(order.cliente_id) === String(client.id) || normalize(order.cliente_nome) === normalize(client.nome)).sort((a, b) => orderDate(b).localeCompare(orderDate(a)));\n  return <Modal title={\`Histórico de \${client.nome}\`} close={close} wide><div className="history-summary"><MiniMetric label="Pedidos" value={history.length} /><MiniMetric label="Quantidade" value={sum(history, 'quantidade')} /><MiniMetric label="Total comprado" value={money(sum(history, 'total'))} />`,
  `function ClientHistory({ close, client, orders }) {\n  const history = orders.filter(order => String(order.cliente_id) === String(client.id) || normalize(order.cliente_nome) === normalize(client.nome)).sort((a, b) => orderDate(b).localeCompare(orderDate(a)));\n  const activeHistory = history.filter(isOperationalOrder);\n  return <Modal title={\`Histórico de \${client.nome}\`} close={close} wide><div className="history-summary"><MiniMetric label="Pedidos válidos" value={activeHistory.length} /><MiniMetric label="Quantidade" value={sum(activeHistory, 'quantidade')} /><MiniMetric label="Total comprado" value={money(sum(activeHistory, 'total'))} />`
);

replaceOnce(
  'impressao de pedidos sem cancelados',
  `function printOrderList(orders, date) {\n  const rows = orders.map(order =>`,
  `function printOrderList(orders, date) {\n  const activeOrders = orders.filter(isOperationalOrder);\n  const rows = activeOrders.map(order =>`
);
replaceOnce('total impresso sem cancelados', `Total: \${money(sum(orders, 'total'))}`, `Total: \${money(sum(activeOrders, 'total'))}`);
replaceOnce(
  'roteiro impresso sem cancelados',
  `const group = orders.filter(order => routeOf(order, routes) === route && normalize(order.status_pedido) !== 'entregue');`,
  `const group = orders.filter(order => isOperationalOrder(order) && routeOf(order, routes) === route && normalize(order.status_pedido) !== 'entregue');`
);

fs.writeFileSync(targetPath, source, 'utf8');
console.log(`Regras aplicadas em ${targetPath}:`);
for (const label of applied) console.log(`- ${label}`);
