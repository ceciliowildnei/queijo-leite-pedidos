import fs from 'node:fs';
import path from 'node:path';

const filePath = path.resolve('src/main.jsx');
let source = fs.readFileSync(filePath, 'utf8');

if (source.includes('Mesclar clientes cadastrados')) {
  console.log('Mesclagem direta de clientes já preparada.');
  process.exit(0);
}

const updateOrderMarker = "  async function updateOrder(id, changes, detail = 'Status do pedido atualizado') {";
if (!source.includes(updateOrderMarker)) throw new Error('Ponto para função de mesclagem não encontrado.');

const mergeClientsFunction = `  async function mergeClients(primaryId, duplicateId) {
    setError('');
    const primary = db.clientes.find(client => String(client.id) === String(primaryId));
    const duplicate = db.clientes.find(client => String(client.id) === String(duplicateId));
    if (!primary || !duplicate || String(primary.id) === String(duplicate.id)) {
      setError('Selecione dois clientes diferentes para mesclar.');
      return { ok: false };
    }

    const pick = (mainValue, duplicateValue) => String(mainValue ?? '').trim() || String(duplicateValue ?? '').trim();
    const primaryPhone = onlyDigits(primary.telefone || '');
    const duplicatePhone = onlyDigits(duplicate.telefone || '');
    const mergedPhone = primaryPhone || duplicatePhone;
    const notes = [];
    const primaryNotes = String(primary.observacoes || '').trim();
    const duplicateNotes = String(duplicate.observacoes || '').trim();
    if (primaryNotes) notes.push(primaryNotes);
    if (duplicateNotes && duplicateNotes !== primaryNotes) notes.push('Do cadastro mesclado: ' + duplicateNotes);
    if (duplicate.nome && normalize(duplicate.nome) !== normalize(primary.nome || '')) notes.push('Nome do cadastro mesclado: ' + duplicate.nome);
    if (primaryPhone && duplicatePhone && primaryPhone !== duplicatePhone && !notes.join(' ').includes(duplicatePhone)) notes.push('Telefone alternativo do cadastro mesclado: ' + formatPhone(duplicatePhone));

    const mergedClient = {
      nome: pick(primary.nome, duplicate.nome),
      telefone: mergedPhone,
      cep: pick(primary.cep, duplicate.cep),
      rua: pick(primary.rua, duplicate.rua),
      numero: pick(primary.numero, duplicate.numero),
      bairro: pick(primary.bairro, duplicate.bairro),
      cidade: pick(primary.cidade, duplicate.cidade),
      estado: pick(primary.estado, duplicate.estado),
      complemento: pick(primary.complemento, duplicate.complemento),
      observacoes: [...new Set(notes.filter(Boolean))].join(' | '),
    };

    const primaryUpdate = await supabase.from('wr_clientes').update(mergedClient).eq('id', primary.id);
    if (primaryUpdate.error) {
      setError('Não foi possível atualizar o cliente principal: ' + primaryUpdate.error.message);
      return { ok: false };
    }

    const duplicateOrders = db.pedidos.filter(order => String(order.cliente_id || '') === String(duplicate.id));
    const orderUpdate = await supabase.from('wr_pedidos').update({
      cliente_id: primary.id,
      cliente_nome: mergedClient.nome,
      cliente_telefone: mergedClient.telefone,
    }).in('cliente_id', [primary.id, duplicate.id]);
    if (orderUpdate.error) {
      setError('Cliente principal atualizado, mas não foi possível transferir os pedidos: ' + orderUpdate.error.message);
      return { ok: false };
    }

    const configKeys = ['clientes_semanais', 'whatsapp_opt_in_client_ids', 'whatsapp_opt_out_client_ids'];
    const configs = await supabase.from('wr_config').select('chave, valor').in('chave', configKeys);
    if (configs.error) {
      setError('Pedidos transferidos, mas não foi possível ler as configurações do cliente: ' + configs.error.message);
      return { ok: false };
    }
    const configMap = Object.fromEntries((configs.data || []).map(row => [row.chave, Array.isArray(row.valor) ? row.valor.map(String) : []]));
    const primaryKey = String(primary.id);
    const duplicateKey = String(duplicate.id);
    const weeklyCurrent = configMap.clientes_semanais || [];
    const optInCurrent = configMap.whatsapp_opt_in_client_ids || [];
    const optOutCurrent = configMap.whatsapp_opt_out_client_ids || [];
    const mergeMembership = (ids, includePrimary) => {
      const cleaned = ids.filter(id => id !== duplicateKey && id !== primaryKey);
      return includePrimary ? [...new Set([...cleaned, primaryKey])] : cleaned;
    };
    const weekly = mergeMembership(weeklyCurrent, weeklyCurrent.includes(primaryKey) || weeklyCurrent.includes(duplicateKey));
    const optedOut = optOutCurrent.includes(primaryKey) || optOutCurrent.includes(duplicateKey);
    const optOut = mergeMembership(optOutCurrent, optedOut);
    const optIn = mergeMembership(optInCurrent, !optedOut && (optInCurrent.includes(primaryKey) || optInCurrent.includes(duplicateKey)));
    const configUpdate = await supabase.from('wr_config').upsert([
      { chave: 'clientes_semanais', valor: weekly },
      { chave: 'whatsapp_opt_in_client_ids', valor: optIn },
      { chave: 'whatsapp_opt_out_client_ids', valor: optOut },
    ]);
    if (configUpdate.error) {
      setError('Pedidos transferidos, mas não foi possível consolidar as configurações: ' + configUpdate.error.message);
      return { ok: false };
    }

    const primaryPhoto = getClientPhoto(primary);
    const duplicatePhoto = getClientPhoto(duplicate);
    if (!primaryPhoto && duplicatePhoto) saveClientPhoto({ ...primary, ...mergedClient }, duplicatePhoto);

    const deletion = await supabase.from('wr_clientes').delete().eq('id', duplicate.id);
    if (deletion.error) {
      setError('A mesclagem foi preparada, mas o cadastro duplicado não pôde ser removido: ' + deletion.error.message);
      return { ok: false };
    }

    addLog('Clientes mesclados', (duplicate.nome || duplicate.id) + ' → ' + (mergedClient.nome || primary.id));
    setNotice('Clientes mesclados com sucesso. ' + duplicateOrders.length + ' item(ns) de pedido foram transferidos para ' + mergedClient.nome + '.');
    await sync(true);
    return { ok: true, ordersMoved: duplicateOrders.length };
  }

`;
source = source.replace(updateOrderMarker, mergeClientsFunction + updateOrderMarker);

source = source.replace(
  'setQuery, setSelectedDate, setModal, saveEntity, deleteEntity, importContacts, updateOrder, getClientPhoto,',
  'setQuery, setSelectedDate, setModal, saveEntity, deleteEntity, importContacts, mergeClients, updateOrder, getClientPhoto,'
);

source = source.replace(
  'function ClientsPage({ db, query, setQuery, setModal, deleteEntity, importContacts, getClientPhoto, saveClientPhoto, canDelete, weeklyClientIds = [], whatsappOptInClientIds = [] }) {',
  'function ClientsPage({ db, query, setQuery, setModal, deleteEntity, importContacts, mergeClients, getClientPhoto, saveClientPhoto, canDelete, weeklyClientIds = [], whatsappOptInClientIds = [] }) {'
);

source = source.replace(
  "  const [district, setDistrict] = useState('todos');",
  "  const [district, setDistrict] = useState('todos');\n  const [mergeOpen, setMergeOpen] = useState(false);\n  const [mergePrimaryId, setMergePrimaryId] = useState('');\n  const [mergeDuplicateId, setMergeDuplicateId] = useState('');\n  const [mergingClients, setMergingClients] = useState(false);"
);

const beforeReturn = "  return (\n    <div className=\"page-stack\">";
if (!source.includes(beforeReturn)) throw new Error('Retorno da tela Clientes não encontrado.');
source = source.replace(beforeReturn, `  const mergePrimary = db.clientes.find(client => String(client.id) === String(mergePrimaryId));
  const mergeDuplicate = db.clientes.find(client => String(client.id) === String(mergeDuplicateId));
  const mergeDuplicateOrders = mergeDuplicate ? db.pedidos.filter(order => String(order.cliente_id || '') === String(mergeDuplicate.id)).length : 0;

  function openMerge(client = null) {
    setMergeOpen(true);
    setMergePrimaryId(client?.id ? String(client.id) : '');
    setMergeDuplicateId('');
  }

  async function confirmDirectMerge() {
    if (!mergePrimaryId || !mergeDuplicateId || mergePrimaryId === mergeDuplicateId || mergingClients) return;
    const primaryName = mergePrimary?.nome || 'cliente principal';
    const duplicateName = mergeDuplicate?.nome || 'cliente duplicado';
    const confirmed = window.confirm('Mesclar "' + duplicateName + '" em "' + primaryName + '"? O cadastro principal será mantido, os pedidos serão transferidos e o duplicado será removido.');
    if (!confirmed) return;
    setMergingClients(true);
    const result = await mergeClients(mergePrimaryId, mergeDuplicateId);
    setMergingClients(false);
    if (result?.ok) {
      setMergeOpen(false);
      setMergePrimaryId('');
      setMergeDuplicateId('');
    }
  }

${beforeReturn}`);

source = source.replace(
  `actions={<><button className="btn btn-secondary" onClick={() => setImportOpen(value => !value)}>Importar contatos</button><button className="btn btn-primary" onClick={() => setModal({ type: 'entity', entity: 'clientes' })}>+ Novo cliente</button></>}`,
  `actions={<><button className="btn btn-secondary" onClick={() => setImportOpen(value => !value)}>Importar contatos</button><button className="btn btn-secondary" onClick={() => openMerge()}>Mesclar clientes</button><button className="btn btn-primary" onClick={() => setModal({ type: 'entity', entity: 'clientes' })}>+ Novo cliente</button></>}`
);

const importPanelEnd = "      <Toolbar><SearchInput value={query} onChange={setQuery} placeholder=\"Buscar por nome, telefone, bairro...\" />";
if (!source.includes(importPanelEnd)) throw new Error('Toolbar de clientes não encontrada.');
source = source.replace(importPanelEnd, `      {mergeOpen && <Panel title="Mesclar clientes cadastrados"><div className="page-stack"><Alert tone="warning">Escolha qual cadastro será mantido. Os pedidos e configurações do duplicado serão transferidos antes da remoção.</Alert><div className="form-grid"><label className="full">Cadastro principal — será mantido<select value={mergePrimaryId} onChange={event => { setMergePrimaryId(event.target.value); if (event.target.value === mergeDuplicateId) setMergeDuplicateId(''); }}><option value="">Selecione o cliente principal</option>{[...db.clientes].sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR')).map(client => <option key={'p-'+client.id} value={client.id}>{client.nome || 'Sem nome'} — {formatPhone(client.telefone)}</option>)}</select></label><label className="full">Cadastro duplicado — será incorporado e removido<select value={mergeDuplicateId} onChange={event => setMergeDuplicateId(event.target.value)}><option value="">Selecione o cadastro duplicado</option>{[...db.clientes].filter(client => String(client.id) !== String(mergePrimaryId)).sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR')).map(client => <option key={'d-'+client.id} value={client.id}>{client.nome || 'Sem nome'} — {formatPhone(client.telefone)}</option>)}</select></label></div>{mergePrimary && mergeDuplicate && <div className="dashboard-grid"><Panel title="Será mantido"><strong>{mergePrimary.nome}</strong><p>{formatPhone(mergePrimary.telefone)}</p><small>{addressOf(mergePrimary) || 'Sem endereço cadastrado'}</small></Panel><Panel title="Será incorporado"><strong>{mergeDuplicate.nome}</strong><p>{formatPhone(mergeDuplicate.telefone)}</p><small>{mergeDuplicateOrders} item(ns) de pedido vinculado(s)</small></Panel></div>}<div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}><button className="btn btn-primary" type="button" disabled={!mergePrimaryId || !mergeDuplicateId || mergePrimaryId === mergeDuplicateId || mergingClients} onClick={confirmDirectMerge}>{mergingClients ? 'Mesclando...' : 'Mesclar agora'}</button><button className="btn btn-secondary" type="button" disabled={mergingClients} onClick={() => { setMergeOpen(false); setMergePrimaryId(''); setMergeDuplicateId(''); }}>Cancelar</button></div></div></Panel>}
${importPanelEnd}`);

source = source.replace(
  `<button onClick={() => setModal({ type: 'client-history', client })}>Histórico</button><button onClick={() => setModal({ type: 'entity', entity: 'clientes', item: { ...client, repetir_semanalmente: weeklyClientIds.map(String).includes(String(client.id)), whatsapp_opt_in: whatsappOptInClientIds.map(String).includes(String(client.id)) } })}>Editar</button>`,
  `<button onClick={() => setModal({ type: 'client-history', client })}>Histórico</button><button onClick={() => openMerge(client)}>Mesclar</button><button onClick={() => setModal({ type: 'entity', entity: 'clientes', item: { ...client, repetir_semanalmente: weeklyClientIds.map(String).includes(String(client.id)), whatsapp_opt_in: whatsappOptInClientIds.map(String).includes(String(client.id)) } })}>Editar</button>`
);

for (const check of ['Mesclar clientes cadastrados', 'async function mergeClients', 'Mesclar agora', 'openMerge(client)']) {
  if (!source.includes(check)) throw new Error('Mesclagem direta incompleta: ' + check);
}

fs.writeFileSync(filePath, source, 'utf8');
console.log('Mesclagem direta na lista de clientes preparada.');
