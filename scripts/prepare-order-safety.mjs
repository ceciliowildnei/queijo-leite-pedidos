import fs from 'node:fs';
import path from 'node:path';

const filePath = path.resolve('src/main.jsx');
let source = fs.readFileSync(filePath, 'utf8');

function mustReplace(search, replacement, label) {
  if (source.includes(replacement)) return;
  if (!source.includes(search)) throw new Error(`Nao foi possivel aplicar: ${label}`);
  source = source.replace(search, replacement);
}

mustReplace(
  "function OrderCart({ close, db, routes, selectedDate, save }) {\n  const [form, setForm] = useState({ cliente_id: '', rota: routes[0], data_entrega: selectedDate, forma_pagamento: 'Pix', status_pagamento: 'Pendente', status_pedido: 'Separado', observacoes: '', items: [] });",
  "function OrderCart({ close, db, routes, selectedDate, save }) {\n  const [form, setForm] = useState({ cliente_id: '', rota: routes[0], data_entrega: isoToday(), forma_pagamento: 'Pix', status_pagamento: 'Pendente', status_pedido: 'Separado', observacoes: '', items: [] });\n  const [saving, setSaving] = useState(false);\n  const [localError, setLocalError] = useState('');",
  'data inicial'
);

const oldSubmit = source.includes('function submit(event, sendWhatsapp = false)')
  ? "  function submit(event, sendWhatsapp = false) {\n    event.preventDefault();\n    if (!form.cliente_id || !form.items.length) return;\n    save({ ...form, sendWhatsapp });\n  }"
  : "  function submit(event) {\n    event.preventDefault();\n    if (!form.cliente_id || !form.items.length) return;\n    save(form);\n  }";

mustReplace(oldSubmit,
  "  async function submit(event, sendWhatsapp = false) {\n    event.preventDefault();\n    if (saving || !form.cliente_id || !form.items.length) return;\n    setLocalError('');\n    if (!form.data_entrega) return setLocalError('Informe a data de entrega.');\n    if (form.data_entrega < isoToday()) return setLocalError('A data de entrega nao pode ser anterior a hoje. Para corrigir um pedido antigo, use Editar.');\n    setSaving(true);\n    try {\n      const ok = await save({ ...form, sendWhatsapp });\n      if (ok === false) setSaving(false);\n    } catch (error) {\n      console.error(error);\n      setLocalError('Nao foi possivel salvar o pedido. Tente novamente.');\n      setSaving(false);\n    }\n  }",
  'trava de duplo envio'
);

const cartTotal = '<div className="cart-total"><small>Total</small><strong>{money(total)}</strong></div>';
if (!source.includes('{localError && <Alert tone="danger">{localError}</Alert>}')) {
  mustReplace(cartTotal, `${cartTotal}{localError && <Alert tone="danger">{localError}</Alert>}`, 'feedback do carrinho');
}
source = source.replaceAll('disabled={!form.cliente_id || !form.items.length}', 'disabled={saving || !form.cliente_id || !form.items.length}');

mustReplace(
  "  async function createCartOrder(payload) {\n    const client = db.clientes.find(item => String(item.id) === String(payload.cliente_id));\n    const code = nextOrderCode();",
  "  async function createCartOrder(payload) {\n    const client = db.clientes.find(item => String(item.id) === String(payload.cliente_id));\n    if (!client) { setError('Cliente nao encontrado.'); return false; }\n    const deliveryDate = payload.data_entrega || isoToday();\n    if (deliveryDate < isoToday()) { setError('A data de entrega nao pode ser anterior a hoje.'); return false; }\n    const signature = (payload.items || []).map(item => `${item.produto_id}:${number(item.quantidade || 1)}:${number(item.preco_unitario || db.produtos.find(p => String(p.id) === String(item.produto_id))?.preco)}`).sort().join('|');\n    const recentCutoff = Date.now() - 120000;\n    const duplicate = Object.values(db.pedidos.reduce((acc, order) => {\n      if (String(order.cliente_id) !== String(client.id) || orderDate(order) !== deliveryDate) return acc;\n      const key = order.codigo || order.id;\n      acc[key] = acc[key] || { created: new Date(order.criado_em || 0).getTime(), items: [] };\n      acc[key].items.push(`${order.produto_id}:${number(order.quantidade)}:${number(order.preco_unitario)}`);\n      return acc;\n    }, {})).some(group => group.created >= recentCutoff && group.items.sort().join('|') === signature);\n    if (duplicate) { setError('Pedido identico ja foi registrado nos ultimos 2 minutos.'); return false; }\n    const code = nextOrderCode();",
  'anti duplicidade'
);

source = source.replace('        data_entrega: payload.data_entrega || selectedDate,', '        data_entrega: deliveryDate,');
source = source.replace('        data_entrega: payload.data_entrega || isoToday(),', '        data_entrega: deliveryDate,');
source = source.replace("    if (response.error) return setError(response.error.message);", "    if (response.error) { setError(response.error.message); return false; }");

for (const check of ['data_entrega: isoToday()', 'const [saving, setSaving] = useState(false)', 'Pedido identico ja foi registrado nos ultimos 2 minutos', 'data_entrega: deliveryDate']) {
  if (!source.includes(check)) throw new Error(`Preparacao incompleta: ${check}`);
}

fs.writeFileSync(filePath, source, 'utf8');
console.log('Protecoes de pedido aplicadas.');
