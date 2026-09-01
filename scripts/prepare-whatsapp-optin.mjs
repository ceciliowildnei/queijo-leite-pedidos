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
  '  const [weeklyClientIds, setWeeklyClientIds] = useState([]);',
  '  const [weeklyClientIds, setWeeklyClientIds] = useState([]);\n  const [whatsappOptInClientIds, setWhatsappOptInClientIds] = useState([]);',
  'estado de autorizacao WhatsApp'
);

const syncMarker = '  async function sync(silent = false) {';
if (!source.includes('async function loadWhatsappOptIn()')) {
  mustReplace(syncMarker, `  async function loadWhatsappOptIn() {
    const response = await supabase.from('wr_config').select('valor').eq('chave', 'whatsapp_opt_in_client_ids').maybeSingle();
    if (response.error) return console.warn('Falha ao carregar autorizacoes WhatsApp:', response.error.message);
    setWhatsappOptInClientIds(Array.isArray(response.data?.valor) ? response.data.valor.map(value => String(value)) : []);
  }

${syncMarker}`, 'carregamento das autorizacoes WhatsApp');
}

source = source.replace(
  'await Promise.all([loadRoutes(), loadCashOuts(), loadWeeklyClients()]);',
  'await Promise.all([loadRoutes(), loadCashOuts(), loadWeeklyClients(), loadWhatsappOptIn()]);'
);
source = source.replace(
  'await Promise.all([loadRoutes(), loadWeeklyClients()]);',
  'await Promise.all([loadRoutes(), loadWeeklyClients(), loadWhatsappOptIn()]);'
);

mustReplace(
  "    const repeatWeekly = object?._repetir_semanalmente;\n    const cleanObject = { ...(object || {}) };\n    delete cleanObject._repetir_semanalmente;",
  "    const repeatWeekly = object?._repetir_semanalmente;\n    const whatsappOptIn = object?._whatsapp_opt_in;\n    const cleanObject = { ...(object || {}) };\n    delete cleanObject._repetir_semanalmente;\n    delete cleanObject._whatsapp_opt_in;",
  'flag de autorizacao no salvamento'
);

const afterWeekly = `    if (type === 'clientes' && typeof repeatWeekly === 'boolean') {
      const clientId = String(response.data?.id || id || '');`;
if (!source.includes(afterWeekly)) throw new Error('Bloco semanal nao encontrado.');

const logMarker = "    addLog(id ? 'Registro atualizado' : 'Registro criado', type + ': ' + (payload.nome || payload.codigo || payload.cliente_nome || id || 'novo'));";
if (!source.includes('whatsappOptInClientIds.map')) {
  mustReplace(logMarker, `    if (type === 'clientes' && typeof whatsappOptIn === 'boolean') {
      const clientId = String(response.data?.id || id || '');
      if (clientId) {
        const currentIds = whatsappOptInClientIds.map(value => String(value));
        const nextIds = whatsappOptIn
          ? [...new Set([...currentIds, clientId])]
          : currentIds.filter(value => value !== clientId);
        const updates = [{ chave: 'whatsapp_opt_in_client_ids', valor: nextIds }];
        if (whatsappOptIn) {
          const out = await supabase.from('wr_config').select('valor').eq('chave', 'whatsapp_opt_out_client_ids').maybeSingle();
          const outIds = Array.isArray(out.data?.valor) ? out.data.valor.map(value => String(value)).filter(value => value !== clientId) : [];
          updates.push({ chave: 'whatsapp_opt_out_client_ids', valor: outIds });
        }
        const configResponse = await supabase.from('wr_config').upsert(updates);
        if (configResponse.error) setError('Cliente salvo, mas a autorizacao do WhatsApp nao foi atualizada: ' + configResponse.error.message);
        else setWhatsappOptInClientIds(nextIds);
      }
    }

${logMarker}`, 'persistencia da autorizacao WhatsApp');
}

source = source.replace(
  'db, query, selectedDate, selectedOrders, todayOrders, weekOrders, routes, cashOuts, photos, logs, weeklyClientIds,',
  'db, query, selectedDate, selectedOrders, todayOrders, weekOrders, routes, cashOuts, photos, logs, weeklyClientIds, whatsappOptInClientIds,'
);
source = source.replace(
  'function ClientsPage({ db, query, setQuery, setModal, deleteEntity, getClientPhoto, saveClientPhoto, canDelete, weeklyClientIds = [] }) {',
  'function ClientsPage({ db, query, setQuery, setModal, deleteEntity, getClientPhoto, saveClientPhoto, canDelete, weeklyClientIds = [], whatsappOptInClientIds = [] }) {'
);
source = source.replace(
  'clientes cadastrados · ${weeklyClientIds.length} com repetição semanal.',
  'clientes cadastrados · ${weeklyClientIds.length} recorrentes · ${whatsappOptInClientIds.length} autorizados no WhatsApp.'
);
source = source.replace(
  "columns={['Cliente', 'Telefone', 'Bairro', 'Endereço', 'Observações', 'Semanal', 'Ações']}",
  "columns={['Cliente', 'Telefone', 'Bairro', 'Endereço', 'Observações', 'Semanal', 'WhatsApp', 'Ações']}"
);
source = source.replace(
  "        weeklyClientIds.map(value => String(value)).includes(String(client.id)) ? <Status value=\"Semanal\" /> : '—',\n        <TableActions",
  "        weeklyClientIds.map(value => String(value)).includes(String(client.id)) ? <Status value=\"Semanal\" /> : '—',\n        whatsappOptInClientIds.map(value => String(value)).includes(String(client.id)) ? <Status value=\"Autorizado\" /> : '—',\n        <TableActions"
);
source = source.replace(
  "item: { ...client, repetir_semanalmente: weeklyClientIds.map(value => String(value)).includes(String(client.id)) }",
  "item: { ...client, repetir_semanalmente: weeklyClientIds.map(value => String(value)).includes(String(client.id)), whatsapp_opt_in: whatsappOptInClientIds.map(value => String(value)).includes(String(client.id)) }"
);

source = source.replace(
  "if (entity === 'clientes') return save(entity, { id: form.id, nome: form.nome, telefone: onlyDigits(form.telefone || '') });",
  "if (entity === 'clientes') return save(entity, { id: form.id, nome: form.nome, telefone: onlyDigits(form.telefone || ''), _repetir_semanalmente: Boolean(form.repetir_semanalmente), _whatsapp_opt_in: Boolean(form.whatsapp_opt_in) });"
);

const weeklyField = '<div className="weekly-repeat-option full"><ToggleField label="Repetir pedido semanalmente" checked={form.repetir_semanalmente} onChange={value => set(\'repetir_semanalmente\', value)} /><small>Marque para identificar este cliente como recorrente nas entregas semanais.</small></div>';
if (source.includes(weeklyField) && !source.includes('Autoriza mensagens semanais no WhatsApp')) {
  source = source.replace(weeklyField, `${weeklyField}<div className="weekly-repeat-option full"><ToggleField label="Autoriza mensagens semanais no WhatsApp" checked={form.whatsapp_opt_in} onChange={value => set('whatsapp_opt_in', value)} /><small>Ative somente quando o cliente tiver autorizado receber mensagens e ofertas pelo WhatsApp.</small></div>`);
}

for (const check of ['whatsapp_opt_in_client_ids', 'whatsappOptInClientIds', '_whatsapp_opt_in', 'Autoriza mensagens semanais no WhatsApp']) {
  if (!source.includes(check)) throw new Error(`Preparacao incompleta: ${check}`);
}

fs.writeFileSync(filePath, source, 'utf8');
console.log('Autorizacao de WhatsApp por cliente preparada.');
