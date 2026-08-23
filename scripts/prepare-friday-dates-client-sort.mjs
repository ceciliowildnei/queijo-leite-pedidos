import fs from 'node:fs';
import path from 'node:path';

const filePath = path.resolve('src/main.jsx');
let source = fs.readFileSync(filePath, 'utf8');

function replaceIfPresent(search, replacement) {
  if (source.includes(search)) source = source.replace(search, replacement);
}

const weekStartBlock = `const weekStart = value => {
  const date = dateValue(value);
  const day = date.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + offset);
  return new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
};`;

const lockedHelpers = `${weekStartBlock}
const fridayOfWeek = value => addDays(weekStart(value || isoToday()), 4);
const clientNameCompare = (a, b) => String(a?.nome || '').localeCompare(String(b?.nome || ''), 'pt-BR', { sensitivity: 'base' });
const sortedClients = clients => [...(clients || [])].sort(clientNameCompare);`;

const sortHelpers = `${weekStartBlock}
const clientNameCompare = (a, b) => String(a?.nome || '').localeCompare(String(b?.nome || ''), 'pt-BR', { sensitivity: 'base' });
const sortedClients = clients => [...(clients || [])].sort(clientNameCompare);`;

if (source.includes(lockedHelpers)) {
  source = source.replace(lockedHelpers, sortHelpers);
} else if (!source.includes('const sortedClients = clients =>')) {
  if (!source.includes(weekStartBlock)) throw new Error('Não foi possível localizar o bloco de datas.');
  source = source.replace(weekStartBlock, sortHelpers);
}

// Mantém os clientes em ordem alfabética, sem restringir datas.
replaceIfPresent(
  "supabase.from('wr_clientes').select('*').order('criado_em', { ascending: false })",
  "supabase.from('wr_clientes').select('*').order('nome', { ascending: true })"
);
replaceIfPresent(
  "setDb({ clientes: clients.data || [], produtos: products.data || [], pedidos: orders.data || [], admins: admins.data || [] });",
  "setDb({ clientes: sortedClients(clients.data || []), produtos: products.data || [], pedidos: orders.data || [], admins: admins.data || [] });"
);
replaceIfPresent(
  "db.clientes.filter(item => normalize(JSON.stringify(item)).includes(text))",
  "sortedClients(db.clientes).filter(item => normalize(JSON.stringify(item)).includes(text))"
);
replaceIfPresent(
  "const filtered = db.clientes.filter(client => {",
  "const filtered = sortedClients(db.clientes).filter(client => {"
);
source = source.replaceAll(
  "options={db.clientes.map(client => [client.id, client.nome])}",
  "options={sortedClients(db.clientes).map(client => [client.id, client.nome])}"
);

// Remove qualquer normalização automática para sexta-feira.
source = source.replaceAll(
  "data_entrega: fridayOfWeek(payload.data_entrega || selectedDate)",
  "data_entrega: payload.data_entrega || selectedDate"
);
source = source.replaceAll(
  "data_entrega: fridayOfWeek(form.data_entrega || selectedDate)",
  "data_entrega: form.data_entrega || selectedDate"
);
replaceIfPresent(
  "  const [selectedDate, setSelectedDate] = useState(() => fridayOfWeek(isoToday()));",
  "  const [selectedDate, setSelectedDate] = useState(isoToday());"
);
replaceIfPresent(
  "const [form, setForm] = useState({ cliente_id: '', rota: routes[0], data_entrega: fridayOfWeek(selectedDate), forma_pagamento: 'Pix', status_pagamento: 'Pendente', status_pedido: 'Separado', observacoes: '', items: [] });",
  "const [form, setForm] = useState({ cliente_id: '', rota: routes[0], data_entrega: selectedDate, forma_pagamento: 'Pix', status_pagamento: 'Pendente', status_pedido: 'Separado', observacoes: '', items: [] });"
);

replaceIfPresent(
  "<label className=\"date-control\"><span>Data operacional (sexta-feira)</span><input type=\"date\" min=\"2000-01-07\" step=\"7\" value={selectedDate} onChange={event => setSelectedDate(fridayOfWeek(event.target.value))} /></label>",
  "<label className=\"date-control\"><span>Data operacional</span><input type=\"date\" value={selectedDate} onChange={event => setSelectedDate(event.target.value)} /></label>"
);
replaceIfPresent(
  "<Field label=\"Pedido semanal (sexta-feira)\" type=\"date\" min=\"2000-01-07\" step=\"7\" value={fridayOfWeek(form.data_entrega || selectedDate)} onChange={value => set('data_entrega', fridayOfWeek(value))} />",
  "<Field label=\"Data de entrega\" type=\"date\" value={form.data_entrega || selectedDate} onChange={value => set('data_entrega', value)} />"
);
replaceIfPresent(
  "<Field label=\"Pedido semanal (sexta-feira)\" type=\"date\" min=\"2000-01-07\" step=\"7\" value={fridayOfWeek(form.data_entrega)} onChange={value => setForm(current => ({ ...current, data_entrega: fridayOfWeek(value) }))} />",
  "<Field label=\"Data de entrega\" type=\"date\" value={form.data_entrega} onChange={value => setForm(current => ({ ...current, data_entrega: value }))} />"
);

const requiredChecks = [
  'const sortedClients = clients =>',
  'Data operacional</span><input type="date" value={selectedDate}',
  'Field label="Data de entrega" type="date"',
  'clientes: sortedClients(clients.data || [])',
];
for (const check of requiredChecks) {
  if (!source.includes(check)) throw new Error(`Preparação incompleta: ${check}`);
}

const forbiddenChecks = [
  'Data operacional (sexta-feira)',
  'Pedido semanal (sexta-feira)',
  'step="7" value={selectedDate}',
  'fridayOfWeek(payload.data_entrega || selectedDate)',
  'fridayOfWeek(form.data_entrega || selectedDate)',
];
for (const check of forbiddenChecks) {
  if (source.includes(check)) throw new Error(`Calendário ainda está bloqueado: ${check}`);
}

fs.writeFileSync(filePath, source, 'utf8');
console.log('Calendário liberado para qualquer data; clientes mantidos em ordem alfabética.');
