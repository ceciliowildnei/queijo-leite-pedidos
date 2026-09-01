import fs from 'node:fs';
import path from 'node:path';

const filePath = path.resolve('src/main.jsx');
let source = fs.readFileSync(filePath, 'utf8');

if (source.includes('Selecionar todos os novos')) {
  console.log('Seleção de contatos já preparada.');
  process.exit(0);
}

source = source.replace(
  "  const [contactRows, setContactRows] = useState([]);\n  const [importing, setImporting] = useState(false);",
  "  const [contactRows, setContactRows] = useState([]);\n  const [selectedImportPhones, setSelectedImportPhones] = useState([]);\n  const [importing, setImporting] = useState(false);"
);

source = source.replace(
  "      setContactRows(unique);\n      setImportMessage(unique.length ? unique.length + ' contato(s) lido(s).' : 'Nenhum contato com nome e telefone válido foi encontrado.');",
  "      setContactRows(unique);\n      setSelectedImportPhones([]);\n      setImportMessage(unique.length ? unique.length + ' contato(s) lido(s). Selecione quais deseja importar.' : 'Nenhum contato com nome e telefone válido foi encontrado.');"
);

source = source.replace(
  "  async function confirmImport() {\n    if (!newRows.length || importing) return;\n    setImporting(true);\n    const result = await importContacts(newRows);",
  "  function toggleImportPhone(phone) {\n    setSelectedImportPhones(current => current.includes(phone) ? current.filter(item => item !== phone) : [...current, phone]);\n  }\n\n  function selectAllNew() {\n    setSelectedImportPhones(newRows.map(item => item.phone));\n  }\n\n  function clearImportSelection() {\n    setSelectedImportPhones([]);\n  }\n\n  const selectedRows = newRows.filter(item => selectedImportPhones.includes(item.phone));\n\n  async function confirmImport() {\n    if (!selectedRows.length || importing) return;\n    setImporting(true);\n    const result = await importContacts(selectedRows);"
);

source = source.replace(
  "      setContactRows([]);\n    }\n  }",
  "      setContactRows([]);\n      setSelectedImportPhones([]);\n    }\n  }"
);

const oldBlock = `<DataTable compact columns={['Contato', 'Telefone', 'Resultado', 'Cliente relacionado']} rows={analyzed.slice(0, 100).map(item => [item.nome, formatPhone(item.phone), <Status key={'s-'+item.index} value={item.status} />, item.existing?.nome || '—'])} empty="Nenhum contato." />{analyzed.length > 100 && <small>Mostrando os primeiros 100 contatos. Todos os novos válidos serão considerados na importação.</small>}<div><button className="btn btn-primary" disabled={!newRows.length || importing} onClick={confirmImport}>{importing ? 'Importando...' : 'Importar ' + newRows.length + ' contato(s) novo(s)'}</button></div>`;

const newBlock = `<div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}><button className="btn btn-secondary" type="button" onClick={selectAllNew} disabled={!newRows.length}>Selecionar todos os novos</button><button className="btn btn-secondary" type="button" onClick={clearImportSelection} disabled={!selectedImportPhones.length}>Limpar seleção</button><strong>{selectedRows.length} selecionado(s)</strong></div><DataTable compact columns={['Importar', 'Contato', 'Telefone', 'Resultado', 'Cliente relacionado']} rows={analyzed.slice(0, 100).map(item => [item.status === 'Novo' ? <input key={'check-'+item.index} type="checkbox" checked={selectedImportPhones.includes(item.phone)} onChange={() => toggleImportPhone(item.phone)} aria-label={'Selecionar ' + item.nome} /> : '—', item.nome, formatPhone(item.phone), <Status key={'s-'+item.index} value={item.status} />, item.existing?.nome || '—'])} empty="Nenhum contato." />{analyzed.length > 100 && <small>Mostrando os primeiros 100 contatos. Para segurança, selecione apenas os contatos visíveis que deseja importar.</small>}<div><button className="btn btn-primary" disabled={!selectedRows.length || importing} onClick={confirmImport}>{importing ? 'Importando...' : 'Importar ' + selectedRows.length + ' contato(s) selecionado(s)'}</button></div>`;

if (!source.includes(oldBlock)) throw new Error('Tabela de importação não encontrada para aplicar seleção.');
source = source.replace(oldBlock, newBlock);

for (const check of ['Selecionar todos os novos', 'selectedImportPhones', 'selectedRows']) {
  if (!source.includes(check)) throw new Error('Seleção de contatos incompleta: ' + check);
}

fs.writeFileSync(filePath, source, 'utf8');
console.log('Seleção individual de contatos preparada.');
