import fs from 'node:fs';
import path from 'node:path';

const filePath = path.resolve('src/main.jsx');
let source = fs.readFileSync(filePath, 'utf8');

if (source.includes("eq('chave', 'clientes_recorrentes_semanais')")) {
  console.log('Repetição semanal de clientes já preparada.');
  process.exit(0);
}

const stateMarker = "  const [routes, setRoutes] = useState(() => readLocal('wr_rotas', DEFAULT_ROUTES));";
if (!source.includes(stateMarker)) throw new Error('Estado de rotas não encontrado.');
source = source.replace(
  stateMarker,
  `${stateMarker}\n  const [weeklyClientIds, setWeeklyClientIds] = useState([]);`
);

const syncMarker = '  async function sync(silent = false) {';
if (!source.includes(syncMarker)) throw new Error('Função de sincronização não encontrada.');
source = source.replace(
  syncMarker,
  `  async function loadWeeklyClients() {
    const response = await supabase.from('wr_config').select('valor').eq('chave', 'clientes_recorrentes_semanais').maybeSingle();
    if (response.error) {
      console.warn('Não foi possível sincronizar os clientes semanais:', response.error.message);
      return;
    }
    const ids = Array.isArray(response.data?.valor) ? response.data.valor.map(value => String(value)) : [];
    setWeeklyClientIds(ids);
  }

${syncMarker}`
);

if (source.includes('await Promise.all([loadRoutes(), loadCashOuts()]);')) {
  source = source.replace(
    'await Promise.all([loadRoutes(), loadCashOuts()]);',
    'await Promise.all([loadRoutes(), loadCashOuts(), loadWeeklyClients()]);'
  );
} else if (source.includes('await loadRoutes();')) {
  source = source.replace('await loadRoutes();', 'await Promise.all([loadRoutes(), loadWeeklyClients()]);');
} else {
  throw new Error('Carregamento das configurações não encontrado.');
}

const saveEntityReplacement = `  async function saveEntity(type, object) {
    setError('');
    const repeatWeekly = object?._repetir_semanalmente;
    const cleanObject = { ...(object || {}) };
    delete cleanObject._repetir_semanalmente;
    const { id, payload } = noId(cleanObject);
    const table = TABLES[type];
    let request = id
      ? supabase.from(table).update(payload).eq('id', id)
      : supabase.from(table).insert([payload]);
    if (type === 'clientes') request = request.select('id').single();
    const response = await request;
    if (response.error) {
      setError(response.error.message);
      return null;
    }

    if (type === 'clientes' && typeof repeatWeekly === 'boolean') {
      const clientId = String(response.data?.id || id || '');
      if (clientId) {
        const currentIds = weeklyClientIds.map(value => String(value));
        const nextIds = repeatWeekly
          ? [...new Set([...currentIds, clientId])]
          : currentIds.filter(value => value !== clientId);
        const configResponse = await supabase
          .from('wr_config')
          .upsert([{ chave: 'clientes_recorrentes_semanais', valor: nextIds }]);
        if (configResponse.error) {
          setError('Cliente salvo, mas não foi possível atualizar a repetição semanal: ' + configResponse.error.message);
        } else {
          setWeeklyClientIds(nextIds);
        }
      }
    }

    addLog(id ? 'Registro atualizado' : 'Registro criado', \`${type}: \${payload.nome || payload.codigo || payload.cliente_nome || id || 'novo'}\`);
    setModal(null);
    setNotice(type === 'clientes'
      ? repeatWeekly
        ? 'Cliente salvo e marcado para repetição semanal. Nenhuma mensagem foi enviada pelo WhatsApp.'
        : 'Cliente salvo e sincronizado. Nenhuma mensagem foi enviada pelo WhatsApp.'
      : 'Alterações salvas e sincronizadas.');
    await sync(true);
    return response.data || { id };
  }`;

source = source.replace(
  /  async function saveEntity\(type, object\) \{[\s\S]*?\n  \}\n\n  async function deleteEntity/,
  saveEntityReplacement + '\n\n  async function deleteEntity'
);

source = source.replace(
  'db, query, selectedDate, selectedOrders, todayOrders, weekOrders, routes, cashOuts, photos, logs,',
  'db, query, selectedDate, selectedOrders, todayOrders, weekOrders, routes, cashOuts, photos, logs, weeklyClientIds,'
);

source = source.replace(
  'function ClientsPage({ db, query, setQuery, setModal, deleteEntity, getClientPhoto, saveClientPhoto, canDelete }) {',
  'function ClientsPage({ db, query, setQuery, setModal, deleteEntity, getClientPhoto, saveClientPhoto, canDelete, weeklyClientIds = [] }) {'
);

source = source.replace(
  'title="Clientes" subtitle={`${db.clientes.length} clientes cadastrados sem alteração na estrutura do banco.`}',
  'title="Clientes" subtitle={`${db.clientes.length} clientes cadastrados · ${weeklyClientIds.length} com repetição semanal.`}'
);

source = source.replace(
  "columns={['Cliente', 'Telefone', 'Bairro', 'Endereço', 'Observações', 'Ações']}",
  "columns={['Cliente', 'Telefone', 'Bairro', 'Endereço', 'Observações', 'Semanal', 'Ações']}"
);

source = source.replace(
  "        client.observacoes || '—',\n        <TableActions key={`a-${client.id}`}><button onClick={() => setModal({ type: 'client-history', client })}>Histórico</button><button onClick={() => setModal({ type: 'entity', entity: 'clientes', item: client })}>Editar</button>{canDelete && <button className=\"danger-link\" onClick={() => deleteEntity('clientes', client.id, client.nome)}>Excluir</button>}</TableActions>,",
  "        client.observacoes || '—',\n        weeklyClientIds.map(value => String(value)).includes(String(client.id)) ? <Status value=\"Semanal\" /> : '—',\n        <TableActions key={`a-${client.id}`}><button onClick={() => setModal({ type: 'client-history', client })}>Histórico</button><button onClick={() => setModal({ type: 'entity', entity: 'clientes', item: { ...client, repetir_semanalmente: weeklyClientIds.map(value => String(value)).includes(String(client.id)) } })}>Editar</button>{canDelete && <button className=\"danger-link\" onClick={() => deleteEntity('clientes', client.id, client.nome)}>Excluir</button>}</TableActions>,"
);

source = source.replace(
  "if (entity === 'clientes') return save(entity, { id: form.id, nome: form.nome, telefone: onlyDigits(form.telefone), bairro: form.bairro, rua: form.rua, numero: form.numero, cidade: form.cidade, estado: form.estado, observacoes: form.observacoes });",
  "if (entity === 'clientes') return save(entity, { id: form.id, nome: form.nome, telefone: onlyDigits(form.telefone), bairro: form.bairro, rua: form.rua, numero: form.numero, cidade: form.cidade, estado: form.estado, observacoes: form.observacoes, _repetir_semanalmente: Boolean(form.repetir_semanalmente) });"
);

const oldClientFields = `<Field className="full" label="Observações" value={form.observacoes} onChange={value => set('observacoes', value)} /></>}`;
const newClientFields = `<Field className="full" label="Observações" value={form.observacoes} onChange={value => set('observacoes', value)} /><div className="weekly-repeat-option full"><ToggleField label="Repetir pedido semanalmente" checked={form.repetir_semanalmente} onChange={value => set('repetir_semanalmente', value)} /><small>Marque para identificar este cliente como recorrente nas entregas semanais.</small></div></>}`;
if (!source.includes(oldClientFields)) throw new Error('Campos do perfil do cliente não encontrados.');
source = source.replace(oldClientFields, newClientFields);

const requiredChecks = [
  "clientes_recorrentes_semanais",
  'Repetir pedido semanalmente',
  'weeklyClientIds',
  '_repetir_semanalmente',
];
for (const check of requiredChecks) {
  if (!source.includes(check)) throw new Error('Preparação incompleta: ' + check);
}

fs.writeFileSync(filePath, source, 'utf8');
console.log('Perfil do cliente com repetição semanal preparado.');
