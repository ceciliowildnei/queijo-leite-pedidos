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

for (const [from, to] of replacements) {
  source = source.split(from).join(to);
}

if (!source.includes('Relatório de separação e entrega')) {
  const marker = `      <div className="dashboard-grid"><Panel title="Ranking de produtos"><DataTable compact columns={['Produto', 'Quantidade', 'Faturamento']} rows={ranking.map(item => [item.name, item.quantity, money(item.value)])} empty="Sem dados." /></Panel><Panel title="Resumo por rota"><DataTable compact columns={['Rota', 'Pedidos', 'Qtd.', 'Valor']} rows={routeSummary.map(item => [item.route, item.orders, item.quantity, money(item.value)])} empty="Sem rotas com pedidos." /></Panel></div>`;

  const report = `${marker}\n      <Panel title="Relatório de separação e entrega"><DataTable compact columns={['Nome do cliente', 'Produto', 'Quantidade', 'Separado', 'Rota de entrega']} rows={[...selectedOrders].sort((a, b) => { const routeCompare = routeOf(a, routes).localeCompare(routeOf(b, routes)); if (routeCompare) return routeCompare; return String(a.cliente_nome || '').localeCompare(String(b.cliente_nome || '')); }).map(order => [order.cliente_nome || '—', order.produto_nome || '—', order.quantidade || 0, normalize(order.status_pedido) === 'separado' || normalize(order.status_pedido) === 'em rota' || normalize(order.status_pedido) === 'entregue' ? 'Sim' : 'Não', routeOf(order, routes)])} empty="Nenhum pedido nesta data." /></Panel>`;

  if (!source.includes(marker)) {
    throw new Error('Não foi possível localizar o ponto do relatório para inserir a nova tabela.');
  }

  source = source.replace(marker, report);
}

fs.writeFileSync(filePath, source, 'utf8');
console.log('Textos e relatório de separação/entrega preparados.');
