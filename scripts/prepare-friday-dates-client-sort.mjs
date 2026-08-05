import fs from 'node:fs';
import path from 'node:path';

const filePath = path.resolve('src/main.jsx');
let source = fs.readFileSync(filePath, 'utf8');

function replaceRequired(search, replacement, label) {
  if (source.includes(replacement)) return;
  if (!source.includes(search)) throw new Error(`Não foi possível aplicar: ${label}.`);
  source = source.replace(search, replacement);
}

const weekStartBlock = `const weekStart = value => {
  const date = dateValue(value);
  const day = date.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + offset);
  return new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
};`;

const dateAndSortHelpers = `${weekStartBlock}
const fridayOfWeek = value => addDays(weekStart(value || isoToday()), 4);
const clientNameCompare = (a, b) => String(a?.nome || '').localeCompare(String(b?.nome || ''), 'pt-BR', { sensitivity: 'base' });
const sortedClients = clients => [...(clients || [])].sort(clientNameCompare);`;

replaceRequired(weekStartBlock, dateAndSortHelpers, 'funções de sexta-feira e ordenação alfabética');
replaceRequired(
  "  const [selectedDate, setSelectedDate] = useState(isoToday());",
  "  const [selectedDate, setSelectedDate] = useState(() => fridayOfWeek(isoToday()));",
  'data operacional inicial'
);

source = source.replace(
  "supabase.from('wr_clientes').select('*').order('criado_em', { ascending: false })",
  "supabase.from('wr_clientes').select('*').order('nome', { ascending: true })"
);
source = source.replace(
  "setDb({ clientes: clients.data || [], produtos: products.data || [], pedidos: orders.data || [], admins: admins.data || [] });",
  "setDb({ clientes: sortedClients(clients.data || []), produtos: products.data || [], pedidos: orders.data || [], admins: admins.data || [] });"
);

source = source.replace(
  "db.clientes.filter(item => normalize(JSON.stringify(item)).includes(text))",
  "sortedClients(db.clientes).filter(item => normalize(JSON.stringify(item)).includes(text))"
);
source = source.replace(
  "const filtered = db.clientes.filter(client => {",
  "const filtered = sortedClients(db.clientes).filter(client => {"
);
source = source.replaceAll(
  "options={db.clientes.map(client => [client.id, client.nome])}",
  "options={sortedClients(db.clientes).map(client => [client.id, client.nome])}"
);

source = source.replaceAll(
  "data_entrega: payload.data_entrega || selectedDate",
  "data_entrega: fridayOfWeek(payload.data_entrega || selectedDate)"
);
source = source.replaceAll(
  "data_entrega: form.data_entrega || selectedDate",
  "data_entrega: fridayOfWeek(form.data_entrega || selectedDate)"
);
source = source.replace(
  "const [form, setForm] = useState({ cliente_id: '', rota: routes[0], data_entrega: selectedDate, forma_pagamento: 'Pix', status_pagamento: 'Pendente', status_pedido: 'Separado', observacoes: '', items: [] });",
  "const [form, setForm] = useState({ cliente_id: '', rota: routes[0], data_entrega: fridayOfWeek(selectedDate), forma_pagamento: 'Pix', status_pagamento: 'Pendente', status_pedido: 'Separado', observacoes: '', items: [] });"
);

replaceRequired(
  "<label className=\"date-control\"><span>Data operacional</span><input type=\"date\" value={selectedDate} onChange={event => setSelectedDate(event.target.value)} /></label>",
  "<label className=\"date-control\"><span>Data operacional (sexta-feira)</span><input type=\"date\" min=\"2000-01-07\" step=\"7\" value={selectedDate} onChange={event => setSelectedDate(fridayOfWeek(event.target.value))} /></label>",
  'seletor da data operacional'
);

replaceRequired(
  "<Field label=\"Data de entrega\" type=\"date\" value={form.data_entrega || selectedDate} onChange={value => set('data_entrega', value)} />",
  "<Field label=\"Pedido semanal (sexta-feira)\" type=\"date\" min=\"2000-01-07\" step=\"7\" value={fridayOfWeek(form.data_entrega || selectedDate)} onChange={value => set('data_entrega', fridayOfWeek(value))} />",
  'data do formulário de pedido'
);

replaceRequired(
  "<Field label=\"Data de entrega\" type=\"date\" value={form.data_entrega} onChange={value => setForm(current => ({ ...current, data_entrega: value }))} />",
  "<Field label=\"Pedido semanal (sexta-feira)\" type=\"date\" min=\"2000-01-07\" step=\"7\" value={fridayOfWeek(form.data_entrega)} onChange={value => setForm(current => ({ ...current, data_entrega: fridayOfWeek(value) }))} />",
  'data do carrinho de pedidos'
);

replaceRequired(
  "function Field({ label, value, onChange, type = 'text', required = false, className = '', step }) { return <label className={`field ${className}`}><span>{label}</span><input required={required} type={type} step={step} value={value ?? ''} onChange={event => onChange(event.target.value)} /></label>; }",
  "function Field({ label, value, onChange, type = 'text', required = false, className = '', step, min }) { return <label className={`field ${className}`}><span>{label}</span><input required={required} type={type} step={step} min={min} value={value ?? ''} onChange={event => onChange(event.target.value)} /></label>; }",
  'suporte de restrição mínima no campo de data'
);

const requiredChecks = [
  'const fridayOfWeek = value =>',
  'const sortedClients = clients =>',
  'Data operacional (sexta-feira)',
  'Pedido semanal (sexta-feira)',
  'min="2000-01-07" step="7"',
  'clientes: sortedClients(clients.data || [])',
];

for (const check of requiredChecks) {
  if (!source.includes(check)) throw new Error(`Preparação incompleta: ${check}`);
}

fs.writeFileSync(filePath, source, 'utf8');
console.log('Datas de entrega fixadas nas sextas-feiras e clientes ordenados alfabeticamente.');
