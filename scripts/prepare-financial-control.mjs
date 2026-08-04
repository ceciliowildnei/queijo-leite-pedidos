import fs from 'node:fs';
import path from 'node:path';

const filePath = path.resolve('src/main.jsx');
let source = fs.readFileSync(filePath, 'utf8');

const routesMarker = `  async function loadRoutes() {
    const response = await supabase.from('wr_config').select('valor').eq('chave', 'rotas').maybeSingle();
    if (Array.isArray(response.data?.valor) && response.data.valor.length) {
      setRoutes(response.data.valor);
      writeLocal('wr_rotas', response.data.valor);
    }
  }`;

const routesAndCash = routesMarker + `

  async function loadCashOuts() {
    const response = await supabase.from('wr_config').select('valor').eq('chave', 'cash_outs').maybeSingle();
    if (response.error) {
      console.warn('Não foi possível sincronizar as saídas do caixa:', response.error.message);
      return;
    }
    const remote = Array.isArray(response.data?.valor) ? response.data.valor : [];
    const local = readLocal(CASH_KEY, []);
    const next = remote.length ? remote : local;
    setCashOuts(next);
    writeLocal(CASH_KEY, next);
    if (!remote.length && local.length) {
      const migration = await supabase.from('wr_config').upsert([{ chave: 'cash_outs', valor: local }]);
      if (migration.error) console.warn('Não foi possível migrar as saídas do caixa:', migration.error.message);
    }
  }`;

if (!source.includes('async function loadCashOuts()')) {
  if (!source.includes(routesMarker)) throw new Error('Função de rotas não encontrada.');
  source = source.replace(routesMarker, routesAndCash);
}
source = source.replace('      await loadRoutes();', '      await Promise.all([loadRoutes(), loadCashOuts()]);');

const cashFunctions = `  async function saveCashOut(out) {
    const previous = [...cashOuts];
    const next = [{ ...out, id: crypto.randomUUID?.() || String(Date.now()) }, ...cashOuts];
    setCashOuts(next);
    writeLocal(CASH_KEY, next);
    const response = await supabase.from('wr_config').upsert([{ chave: 'cash_outs', valor: next }]);
    if (response.error) {
      setCashOuts(previous);
      writeLocal(CASH_KEY, previous);
      setError(response.error.message);
      return;
    }
    addLog('Saída lançada', out.descricao + ' · ' + money(out.valor));
    setNotice('Saída registrada e sincronizada no controle financeiro.');
    setModal(null);
  }

  async function deleteCashOut(id) {
    const previous = [...cashOuts];
    const next = cashOuts.filter(item => item.id !== id);
    setCashOuts(next);
    writeLocal(CASH_KEY, next);
    const response = await supabase.from('wr_config').upsert([{ chave: 'cash_outs', valor: next }]);
    if (response.error) {
      setCashOuts(previous);
      writeLocal(CASH_KEY, previous);
      setError(response.error.message);
      return;
    }
    addLog('Saída removida', id);
    setNotice('Saída removida e caixa atualizado.');
  }`;

source = source.replace(/  function saveCashOut\(out\) \{[\s\S]*?\n  \}\n\n  function deleteCashOut\(id\) \{[\s\S]*?\n  \}/, cashFunctions);

const page = `function CashPage({ db, selectedDate, cashOuts, setModal, deleteCashOut }) {
  const [period, setPeriod] = useState('month');
  const today = isoToday();
  const monthKey = String(selectedDate || today).slice(0, 7);
  const isPaid = order => normalize(order.status_pagamento).includes('pago');
  const isCancelled = order => normalize(order.status_pedido).includes('cancel');
  const activeOrders = db.pedidos.filter(order => !isCancelled(order));
  const cancelledOrders = db.pedidos.filter(isCancelled);
  const inPeriod = date => {
    const value = String(date || '').slice(0, 10);
    if (period === 'all') return true;
    if (period === 'day') return value === selectedDate;
    return value.startsWith(monthKey);
  };
  const orders = activeOrders.filter(order => inPeriod(orderDate(order)));
  const outputs = cashOuts.filter(item => inPeriod(item.data));
  const paid = orders.filter(isPaid);
  const pending = orders.filter(order => !isPaid(order));
  const overdue = pending.filter(order => orderDate(order) && orderDate(order) < today);
  const dueToday = pending.filter(order => orderDate(order) === today);
  const futurePending = pending.filter(order => orderDate(order) > today);
  const gross = sum(orders, 'total');
  const received = sum(paid, 'total');
  const receivable = sum(pending, 'total');
  const expenses = sum(outputs, 'valor');
  const balance = received - expenses;
  const receiptRate = gross > 0 ? Math.round((received / gross) * 100) : 0;
  const allReceived = sum(activeOrders.filter(isPaid), 'total');
  const allReceivable = sum(activeOrders.filter(order => !isPaid(order)), 'total');
  const allExpenses = sum(cashOuts, 'valor');
  const allBalance = allReceived - allExpenses;
  const allGross = sum(activeOrders, 'total');
  const monthRaw = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(dateValue(selectedDate || today));
  const monthLabel = monthRaw.charAt(0).toUpperCase() + monthRaw.slice(1);
  const periodLabel = period === 'all' ? 'Todo o histórico' : period === 'day' ? brDate(selectedDate) : monthLabel;
  const flow = Array.from({ length: 14 }, (_, index) => {
    const date = addDays(selectedDate, index - 13);
    const dayReceived = activeOrders.filter(order => orderDate(order) === date && isPaid(order));
    const dayOutputs = cashOuts.filter(item => item.data === date);
    return { date, value: sum(dayReceived, 'total') - sum(dayOutputs, 'valor') };
  });
  const paymentBreakdown = Object.values(paid.reduce((acc, order) => {
    const name = order.forma_pagamento || 'Não informado';
    acc[name] = acc[name] || { name, count: 0, value: 0 };
    acc[name].count += 1;
    acc[name].value += number(order.total);
    return acc;
  }, {})).sort((a, b) => b.value - a.value);
  const receivableRows = [...pending].sort((a, b) => String(orderDate(a)).localeCompare(String(orderDate(b)))).map(order => [
    brDate(orderDate(order)), order.cliente_nome || '—', order.codigo || '—', order.forma_pagamento || 'Não informado',
    <Status value={orderDate(order) < today ? 'Em atraso' : 'Pendente'} />,
    <strong className="pending-value">{money(order.total)}</strong>
  ]);
  const outputRows = [...outputs].sort((a, b) => String(b.data || '').localeCompare(String(a.data || ''))).map(item => [
    brDate(item.data), item.descricao || 'Saída', <strong className="negative">{money(item.valor)}</strong>,
    <button className="danger-link" onClick={() => deleteCashOut(item.id)}>Excluir</button>
  ]);
  const movements = [
    ...paid.map(order => ({ id: 'received-' + order.id, date: orderDate(order), description: (order.cliente_nome || 'Cliente') + ' · ' + (order.produto_nome || 'Produto'), type: 'Entrada', value: number(order.total), status: 'Recebido' })),
    ...pending.map(order => ({ id: 'pending-' + order.id, date: orderDate(order), description: (order.cliente_nome || 'Cliente') + ' · ' + (order.produto_nome || 'Produto'), type: 'A receber', value: number(order.total), status: orderDate(order) < today ? 'Em atraso' : 'Pendente' })),
    ...outputs.map(item => ({ id: item.id, date: item.data, description: item.descricao || 'Saída', type: 'Saída', value: -number(item.valor), status: 'Despesa', removable: true }))
  ].sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
  return (
    <div className="page-stack financial-control-page">
      <PageHeader title="Controle financeiro" subtitle="Visão completa do que entrou, saiu, está pendente e do saldo disponível." actions={<button className="btn btn-primary" onClick={() => setModal({ type: 'cash-out' })}>+ Lançar saída</button>} />
      <section className="cash-overview-hero">
        <div className="cash-overview-primary"><span>Saldo geral disponível</span><strong className={allBalance < 0 ? 'negative' : ''}>{money(allBalance)}</strong><small>Total recebido menos todas as saídas registradas.</small></div>
        <div className="cash-overview-breakdown">
          <div><span>Total vendido</span><strong>{money(allGross)}</strong></div><div><span>Total recebido</span><strong>{money(allReceived)}</strong></div>
          <div><span>Total a receber</span><strong>{money(allReceivable)}</strong></div><div><span>Total de saídas</span><strong>{money(allExpenses)}</strong></div>
          <div><span>Pedidos cancelados</span><strong>{cancelledOrders.length}</strong></div>
        </div>
      </section>
      <div className="cash-period-control"><div><span>Período analisado</span><strong>{periodLabel}</strong></div><div className="cash-period-tabs">
        <button type="button" className={period === 'day' ? 'active' : ''} onClick={() => setPeriod('day')}>Dia</button>
        <button type="button" className={period === 'month' ? 'active' : ''} onClick={() => setPeriod('month')}>Mês</button>
        <button type="button" className={period === 'all' ? 'active' : ''} onClick={() => setPeriod('all')}>Geral</button>
      </div></div>
      <div className="metric-grid cash-metric-grid">
        <MetricCard label="Vendas do período" value={money(gross)} icon="R$" trend={orders.length + ' lançamento(s)'} tone="blue" />
        <MetricCard label="Entradas confirmadas" value={money(received)} icon="↗" trend={paid.length + ' recebido(s)'} tone="green" />
        <MetricCard label="A receber" value={money(receivable)} icon="◷" trend={pending.length + ' pendente(s)'} tone="gold" />
        <MetricCard label="Saídas" value={money(expenses)} icon="↘" trend={outputs.length + ' despesa(s)'} tone="orange" />
        <MetricCard label="Resultado do período" value={money(balance)} icon="=" trend={balance >= 0 ? 'Saldo positivo' : 'Saldo negativo'} tone={balance >= 0 ? 'green' : 'orange'} />
      </div>
      <div className="cash-health-grid">
        <Panel title="Situação dos recebimentos"><div className="cash-receipt-health">
          <div className="cash-progress-header"><span>Percentual já recebido</span><strong>{receiptRate}%</strong></div><div className="cash-progress-track"><span style={{ width: Math.min(receiptRate, 100) + '%' }} /></div>
          <div className="cash-status-list"><div><span>Recebidos</span><strong>{paid.length}</strong><small>{money(received)}</small></div><div><span>Pendentes</span><strong>{pending.length}</strong><small>{money(receivable)}</small></div><div className={overdue.length ? 'attention' : ''}><span>Em atraso</span><strong>{overdue.length}</strong><small>{money(sum(overdue, 'total'))}</small></div><div><span>Vencem hoje</span><strong>{dueToday.length}</strong><small>{money(sum(dueToday, 'total'))}</small></div><div><span>Futuros</span><strong>{futurePending.length}</strong><small>{money(sum(futurePending, 'total'))}</small></div></div>
        </div></Panel>
        <Panel title="Entradas por forma de pagamento"><div className="cash-payment-list">{paymentBreakdown.length ? paymentBreakdown.map(item => <div key={item.name}><span>{item.name}</span><small>{item.count} pagamento(s)</small><strong>{money(item.value)}</strong></div>) : <div className="cash-empty-inline">Nenhuma entrada confirmada neste período.</div>}</div></Panel>
      </div>
      <Panel title="Fluxo líquido dos últimos 14 dias"><BarChart data={flow} allowNegative /></Panel>
      <div className="cash-table-grid"><Panel title="Contas a receber"><DataTable compact columns={['Data','Cliente','Pedido','Forma','Situação','Valor']} rows={receivableRows} empty="Nenhuma conta pendente neste período." /></Panel><Panel title="Saídas registradas"><DataTable compact columns={['Data','Descrição','Valor','Ações']} rows={outputRows} empty="Nenhuma saída registrada neste período." /></Panel></div>
      <Panel title="Movimentações consolidadas"><DataTable compact columns={['Data','Descrição','Tipo','Valor','Status','Ações']} rows={movements.map(row => [brDate(row.date), row.description, row.type, <strong className={row.type === 'Saída' ? 'negative' : row.type === 'A receber' ? 'pending-value' : 'positive'}>{money(row.value)}</strong>, <Status value={row.status} />, row.removable ? <button className="danger-link" onClick={() => deleteCashOut(row.id)}>Excluir</button> : '—'])} empty="Nenhuma movimentação financeira neste período." /></Panel>
    </div>
  );
}`;

source = source.replace(/function CashPage\([\s\S]*?\n}\n\nfunction ReportsPage/, page + '\n\nfunction ReportsPage');
if (!source.includes('Saldo geral disponível')) throw new Error('Controle financeiro não aplicado.');
if (!source.includes("eq('chave', 'cash_outs')")) throw new Error('Sincronização das saídas não aplicada.');
fs.writeFileSync(filePath, source, 'utf8');
console.log('Controle financeiro geral, mensal e diário preparado.');
