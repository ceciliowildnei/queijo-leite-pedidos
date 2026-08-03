import fs from 'node:fs';
import path from 'node:path';

const filePath = path.resolve('src/main.jsx');
let source = fs.readFileSync(filePath, 'utf8');

const deliveriesPage = `function DeliveriesPage({ selectedOrders, selectedDate, query, setQuery, routes, updateOrder, setModal, canManage, admin }) {
  const [selected, setSelected] = useState(null);
  const collaboratorOnly = normalize(admin?.papel) === 'colaborador';
  const visible = selectedOrders.filter(order => collaboratorOnly || !query || normalize(JSON.stringify(order)).includes(normalize(query)));
  const pending = visible.filter(order => normalize(order.status_pedido) !== 'entregue');
  const groups = routes.map(route => ({ route, orders: pending.filter(order => routeOf(order, routes) === route) })).filter(group => group.orders.length);

  if (collaboratorOnly) {
    return (
      <div className="page-stack collaborator-route-only">
        <PageHeader title="Roteiro de entregas" subtitle={\`Entregas de \${brDate(selectedDate)}, organizadas somente por rota.\`} />
        <section className="collaborator-route-list">
          {groups.map(group => (
            <Panel key={group.route} className="collaborator-route-panel" title={group.route} action={<span className="route-count">{group.orders.length} entrega(s)</span>}>
              {group.orders.map((order, index) => (
                <article className="collaborator-delivery-item" key={order.id}>
                  <div className="delivery-index">{index + 1}</div>
                  <div className="delivery-client">
                    <strong>{order.cliente_nome || 'Cliente'}</strong>
                    <span>{order.endereco || 'Endereço não informado'}</span>
                    <small>{order.produto_nome || 'Produto'} · {order.quantidade || 0} un.</small>
                  </div>
                </article>
              ))}
            </Panel>
          ))}
          {!groups.length && <EmptyState title="Nenhuma entrega pendente" text="Não há pedidos para este roteiro de entrega." />}
        </section>
      </div>
    );
  }

  const active = selected || pending[0];
  const mapUrl = active?.endereco ? \`https://www.google.com/maps?q=\${encodeURIComponent(active.endereco)}&output=embed\` : '';
  return (
    <div className="page-stack">
      <PageHeader title="Entregas" subtitle={\`Roteiro operacional de \${brDate(selectedDate)}.\`} actions={<>{canManage && <button className="btn btn-secondary" onClick={() => setModal({ type: 'routes' })}>Rotas</button>}<button className="btn btn-primary" onClick={() => printDeliveryList(pending, selectedDate, routes)}>Imprimir roteiro</button></>} />
      <div className="delivery-summary"><MiniMetric label="Pendentes" value={pending.length} /><MiniMetric label="Valor em rota" value={money(sum(pending, 'total'))} /><MiniMetric label="Quantidade" value={sum(pending, 'quantidade')} /><SearchInput value={query} onChange={setQuery} placeholder="Buscar cliente ou endereço..." /></div>
      <div className="deliveries-layout">
        <section className="route-list">{groups.map(group => <Panel key={group.route} className="route-panel" title={group.route} action={<span className="route-count">{group.orders.length} entrega(s)</span>}>{group.orders.map((order, index) => <article className={\`delivery-item \${active?.id === order.id ? 'selected' : ''}\`} key={order.id} onClick={() => setSelected(order)}><div className="delivery-index">{index + 1}</div><div className="delivery-client"><strong>{order.cliente_nome}</strong><span>{order.endereco || 'Endereço não informado'}</span><small>{order.produto_nome} · {order.quantidade} un.</small></div><div className="delivery-value"><strong>{money(order.total)}</strong><Status value={order.status_pedido} /></div><div className="delivery-actions"><button onClick={event => { event.stopPropagation(); updateOrder(order.id, { status_pedido: 'Em rota' }, 'Pedido saiu para entrega'); }}>Em rota</button><button className="primary-link" onClick={event => { event.stopPropagation(); updateOrder(order.id, { status_pedido: 'Entregue' }, 'Pedido entregue'); }}>Entregue</button></div></article>)}</Panel>)}{!groups.length && <EmptyState title="Nenhuma entrega pendente" text="Todos os pedidos desta data já foram entregues." />}</section>
        <aside className="map-panel panel"><div className="panel-heading"><div><span className="eyebrow">Mapa</span><h3>{active?.cliente_nome || 'Selecione uma entrega'}</h3><p>{active?.endereco || 'O endereço aparecerá aqui.'}</p></div></div>{mapUrl ? <iframe title="Mapa da entrega" src={mapUrl} loading="lazy" referrerPolicy="no-referrer-when-downgrade" /> : <div className="map-empty">Mapa indisponível.</div>}{active && <a className="btn btn-secondary map-link" href={\`https://www.google.com/maps/search/?api=1&query=\${encodeURIComponent(active.endereco || '')}\`} target="_blank" rel="noreferrer">Abrir rota no mapa</a>}</aside>
      </div>
    </div>
  );
}`;

const pattern = /function DeliveriesPage\([\s\S]*?\n}\n\nfunction CashPage/;
if (!pattern.test(source)) throw new Error('Tela de entregas não encontrada para o ajuste do colaborador.');
source = source.replace(pattern, `${deliveriesPage}\n\nfunction CashPage`);

if (!source.includes('collaborator-route-only')) {
  throw new Error('Roteiro simplificado do colaborador não foi aplicado.');
}

fs.writeFileSync(filePath, source, 'utf8');
console.log('Roteiro de entregas simplificado para o perfil Colaborador.');
