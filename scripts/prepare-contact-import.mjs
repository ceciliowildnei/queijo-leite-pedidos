import fs from 'node:fs';
import path from 'node:path';

const filePath = path.resolve('src/main.jsx');
let source = fs.readFileSync(filePath, 'utf8');

if (source.includes('Importar contatos do celular')) {
  console.log('Importação de contatos já preparada.');
  process.exit(0);
}

const updateOrderMarker = "  async function updateOrder(id, changes, detail = 'Status do pedido atualizado') {";
if (!source.includes(updateOrderMarker)) throw new Error('Ponto de importação não encontrado.');

const importFunction = `  async function importContacts(rows) {
    setError('');
    const existingPhones = new Set(db.clientes.map(item => onlyDigits(item.telefone || '')).filter(Boolean));
    const seen = new Set();
    const payload = (rows || []).map(item => ({
      nome: String(item.nome || '').trim(),
      telefone: onlyDigits(item.telefone || ''),
      observacoes: String(item.observacoes || 'Importado dos contatos').trim(),
    })).filter(item => item.nome && item.telefone.length >= 10 && !existingPhones.has(item.telefone) && !seen.has(item.telefone) && seen.add(item.telefone));
    if (!payload.length) return { imported: 0 };
    const response = await supabase.from('wr_clientes').insert(payload).select('id');
    if (response.error) { setError(response.error.message); return { imported: 0, error: response.error.message }; }
    addLog('Contatos importados', payload.length + ' novo(s) cliente(s)');
    setNotice(payload.length + ' contato(s) importado(s) com sucesso.');
    await sync(true);
    return { imported: payload.length };
  }

`;
source = source.replace(updateOrderMarker, importFunction + updateOrderMarker);

source = source.replace(
  'setQuery, setSelectedDate, setModal, saveEntity, deleteEntity, updateOrder, getClientPhoto,',
  'setQuery, setSelectedDate, setModal, saveEntity, deleteEntity, importContacts, updateOrder, getClientPhoto,'
);

const clientsPage = `function ClientsPage({ db, query, setQuery, setModal, deleteEntity, importContacts, getClientPhoto, saveClientPhoto, canDelete, weeklyClientIds = [], whatsappOptInClientIds = [] }) {
  const [district, setDistrict] = useState('todos');
  const [importOpen, setImportOpen] = useState(false);
  const [contactRows, setContactRows] = useState([]);
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState('');
  const districts = [...new Set(db.clientes.map(client => client.bairro).filter(Boolean))].sort();
  const filtered = db.clientes.filter(client => {
    const matches = !query || normalize(JSON.stringify(client)).includes(normalize(query));
    return matches && (district === 'todos' || client.bairro === district);
  });
  const phoneMap = new Map(db.clientes.map(client => [onlyDigits(client.telefone || ''), client]));
  const nameMap = new Map(db.clientes.map(client => [normalize(client.nome || ''), client]));
  const analyzed = contactRows.map((item, index) => {
    const phone = onlyDigits(item.telefone || '');
    const byPhone = phoneMap.get(phone);
    const byName = nameMap.get(normalize(item.nome || ''));
    const status = byPhone ? 'Já cadastrado' : byName ? 'Revisar nome' : phone.length >= 10 ? 'Novo' : 'Sem telefone válido';
    return { ...item, index, phone, status, existing: byPhone || byName || null };
  });
  const newRows = analyzed.filter(item => item.status === 'Novo');
  const existingRows = analyzed.filter(item => item.status === 'Já cadastrado');
  const reviewRows = analyzed.filter(item => item.status === 'Revisar nome');

  function parseCsv(text) {
    const lines = String(text || '').replace(/^\\uFEFF/, '').split(/\\r?\\n/).filter(Boolean);
    if (!lines.length) return [];
    const separator = (lines[0].match(/;/g) || []).length > (lines[0].match(/,/g) || []).length ? ';' : ',';
    const split = line => { const out = []; let value = ''; let quoted = false; for (let i = 0; i < line.length; i++) { const ch = line[i]; if (ch === '"' && line[i + 1] === '"' && quoted) { value += '"'; i++; } else if (ch === '"') quoted = !quoted; else if (ch === separator && !quoted) { out.push(value.trim()); value = ''; } else value += ch; } out.push(value.trim()); return out; };
    const header = split(lines[0]).map(value => normalize(value));
    const nameIndex = header.findIndex(value => /name|nome|given name|first name/.test(value));
    const phoneIndexes = header.map((value, index) => /phone|telefone|celular|mobile/.test(value) ? index : -1).filter(index => index >= 0);
    return lines.slice(1).flatMap(line => { const cols = split(line); const nome = cols[nameIndex >= 0 ? nameIndex : 0] || ''; const telefone = phoneIndexes.map(index => cols[index]).find(value => onlyDigits(value).length >= 10) || ''; return nome && telefone ? [{ nome, telefone }] : []; });
  }

  function parseVcf(text) {
    return String(text || '').split(/END:VCARD/i).flatMap(card => {
      if (!/BEGIN:VCARD/i.test(card)) return [];
      const fn = card.match(/(?:^|\\n)FN(?:;[^:]*)?:(.+)/i)?.[1]?.trim();
      const n = card.match(/(?:^|\\n)N(?:;[^:]*)?:(.+)/i)?.[1]?.split(';').filter(Boolean).reverse().join(' ').trim();
      const phones = [...card.matchAll(/(?:^|\\n)TEL(?:;[^:]*)?:(.+)/gi)].map(match => match[1].trim());
      const telefone = phones.find(value => onlyDigits(value).length >= 10) || '';
      return (fn || n) && telefone ? [{ nome: fn || n, telefone }] : [];
    });
  }

  function handleFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setImportMessage('');
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || '');
      const rows = /\\.vcf$/i.test(file.name) ? parseVcf(text) : parseCsv(text);
      const unique = Object.values(rows.reduce((acc, item) => { const phone = onlyDigits(item.telefone || ''); if (phone.length >= 10 && !acc[phone]) acc[phone] = { nome: String(item.nome || '').trim(), telefone: phone, observacoes: 'Importado dos contatos em ' + isoToday() }; return acc; }, {}));
      setContactRows(unique);
      setImportMessage(unique.length ? unique.length + ' contato(s) lido(s).' : 'Nenhum contato com nome e telefone válido foi encontrado.');
    };
    reader.readAsText(file, 'utf-8');
    event.target.value = '';
  }

  async function confirmImport() {
    if (!newRows.length || importing) return;
    setImporting(true);
    const result = await importContacts(newRows);
    setImporting(false);
    if (!result?.error) {
      setImportMessage((result?.imported || 0) + ' contato(s) novo(s) importado(s).');
      setContactRows([]);
    }
  }

  return (
    <div className="page-stack">
      <PageHeader title="Clientes" subtitle={\`${db.clientes.length} clientes cadastrados · ${weeklyClientIds.length} com repetição semanal · ${whatsappOptInClientIds.length} autorizados no WhatsApp.\`} actions={<><button className="btn btn-secondary" onClick={() => setImportOpen(value => !value)}>Importar contatos</button><button className="btn btn-primary" onClick={() => setModal({ type: 'entity', entity: 'clientes' })}>+ Novo cliente</button></>} />
      {importOpen && <Panel title="Importar contatos do celular"><div className="page-stack"><p>Exporte seus contatos em CSV ou VCF. O sistema cruza pelo telefone antes de importar e não cria duplicados com o mesmo número.</p><label className="btn btn-secondary" style={{ width: 'fit-content' }}>Selecionar arquivo CSV/VCF<input type="file" accept=".csv,.vcf,text/csv,text/vcard" onChange={handleFile} style={{ display: 'none' }} /></label>{importMessage && <Alert>{importMessage}</Alert>}{analyzed.length > 0 && <><div className="metric-grid metric-grid-compact"><MiniMetric label="Lidos" value={analyzed.length} /><MiniMetric label="Já cadastrados" value={existingRows.length} /><MiniMetric label="Novos" value={newRows.length} /><MiniMetric label="Revisar nome" value={reviewRows.length} /></div><DataTable compact columns={['Contato', 'Telefone', 'Resultado', 'Cliente relacionado']} rows={analyzed.slice(0, 100).map(item => [item.nome, formatPhone(item.phone), <Status key={'s-'+item.index} value={item.status} />, item.existing?.nome || '—'])} empty="Nenhum contato." />{analyzed.length > 100 && <small>Mostrando os primeiros 100 contatos. Todos os novos válidos serão considerados na importação.</small>}<div><button className="btn btn-primary" disabled={!newRows.length || importing} onClick={confirmImport}>{importing ? 'Importando...' : \`Importar ${newRows.length} contato(s) novo(s)\`}</button></div></>}</div></Panel>}
      <Toolbar><SearchInput value={query} onChange={setQuery} placeholder="Buscar por nome, telefone, bairro..." /><select value={district} onChange={event => setDistrict(event.target.value)}><option value="todos">Todos os bairros</option>{districts.map(item => <option key={item}>{item}</option>)}</select><span className="result-count">{filtered.length} resultado(s)</span></Toolbar>
      <DataTable columns={['Cliente', 'Telefone', 'Bairro', 'Endereço', 'Observações', 'Semanal', 'WhatsApp', 'Ações']} rows={filtered.map(client => [
        <ClientCell key={client.id} client={client} photo={getClientPhoto(client)} savePhoto={saveClientPhoto} />,
        formatPhone(client.telefone), client.bairro || '—', addressOf(client) || '—', client.observacoes || '—',
        weeklyClientIds.map(String).includes(String(client.id)) ? <Status value="Semanal" /> : '—',
        whatsappOptInClientIds.map(String).includes(String(client.id)) ? <Status value="Autorizado" /> : '—',
        <TableActions key={\`a-${client.id}\`}><button onClick={() => setModal({ type: 'client-history', client })}>Histórico</button><button onClick={() => setModal({ type: 'entity', entity: 'clientes', item: { ...client, repetir_semanalmente: weeklyClientIds.map(String).includes(String(client.id)), whatsapp_opt_in: whatsappOptInClientIds.map(String).includes(String(client.id)) } })}>Editar</button>{canDelete && <button className="danger-link" onClick={() => deleteEntity('clientes', client.id, client.nome)}>Excluir</button>}</TableActions>,
      ])} empty="Nenhum cliente encontrado." />
    </div>
  );
}`;

source = source.replace(/function ClientsPage\([\s\S]*?\n}\n\nfunction ProductsPage/, clientsPage + '\n\nfunction ProductsPage');

for (const check of ['Importar contatos do celular', 'async function importContacts', 'parseVcf', 'parseCsv']) {
  if (!source.includes(check)) throw new Error('Preparação incompleta: ' + check);
}

fs.writeFileSync(filePath, source, 'utf8');
console.log('Importação e cruzamento de contatos preparada.');
