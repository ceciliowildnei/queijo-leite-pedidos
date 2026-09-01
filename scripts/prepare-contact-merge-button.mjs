import fs from 'node:fs';
import path from 'node:path';

const filePath = path.resolve('src/main.jsx');
let source = fs.readFileSync(filePath, 'utf8');

if (source.includes('Mesclar com cliente')) {
  console.log('Botão de mesclagem já preparado.');
  process.exit(0);
}

const marker = "  async function confirmImport() {";
if (!source.includes(marker)) throw new Error('Ponto para botão Mesclar não encontrado.');

const mergeFunction = `  async function mergeContactIntoClient(item) {
    if (!item?.existing?.id) return;
    const client = item.existing;
    const importedPhone = onlyDigits(item.phone || item.telefone || '');
    const currentPhone = onlyDigits(client.telefone || '');
    const importedName = String(item.nome || '').trim();
    const currentName = String(client.nome || '').trim();
    const changes = {};

    if (!currentPhone && importedPhone.length >= 10) changes.telefone = importedPhone;
    if ((!currentName || /^contato\\s+whatsapp/i.test(currentName)) && importedName) changes.nome = importedName;

    if (currentPhone && importedPhone && currentPhone !== importedPhone) {
      const note = 'Telefone alternativo identificado na mesclagem: ' + formatPhone(importedPhone);
      const currentNotes = String(client.observacoes || '').trim();
      if (!currentNotes.includes(importedPhone)) changes.observacoes = currentNotes ? currentNotes + ' | ' + note : note;
    }

    const ok = window.confirm('Mesclar "' + importedName + '" com o cliente "' + (client.nome || 'Cliente') + '"? O cadastro principal será preservado.');
    if (!ok) return;

    if (Object.keys(changes).length) {
      const response = await supabase.from('wr_clientes').update(changes).eq('id', client.id);
      if (response.error) {
        setImportMessage('Erro ao mesclar: ' + response.error.message);
        return;
      }
    }

    setContactRows(current => current.filter(row => onlyDigits(row.telefone || '') !== importedPhone));
    setSelectedImportPhones(current => current.filter(phone => phone !== importedPhone));
    setImportMessage('Contato mesclado com ' + (client.nome || 'cliente') + '. Nenhum novo cliente foi criado.');
  }

`;
source = source.replace(marker, mergeFunction + marker);

const oldTable = `<DataTable compact columns={['Importar', 'Contato', 'Telefone', 'Resultado', 'Cliente relacionado']} rows={analyzed.slice(0, 100).map(item => [item.status === 'Novo' ? <input key={'check-'+item.index} type="checkbox" checked={selectedImportPhones.includes(item.phone)} onChange={() => toggleImportPhone(item.phone)} aria-label={'Selecionar ' + item.nome} /> : item.status === 'Mesclar' ? 'Mesclar' : '—', item.nome, formatPhone(item.phone), <Status key={'s-'+item.index} value={item.status} />, item.existing?.nome || '—'])} empty="Nenhum contato." />`;

const newTable = `<DataTable compact columns={['Importar', 'Contato', 'Telefone', 'Resultado', 'Cliente relacionado', 'Ações']} rows={analyzed.slice(0, 100).map(item => [item.status === 'Novo' ? <input key={'check-'+item.index} type="checkbox" checked={selectedImportPhones.includes(item.phone)} onChange={() => toggleImportPhone(item.phone)} aria-label={'Selecionar ' + item.nome} /> : '—', item.nome, formatPhone(item.phone), <Status key={'s-'+item.index} value={item.status} />, item.existing?.nome || '—', (item.status === 'Mesclar' || item.status === 'Revisar nome' || item.status === 'Já cadastrado') && item.existing ? <button key={'merge-'+item.index} className="btn btn-secondary" type="button" onClick={() => mergeContactIntoClient(item)}>Mesclar com cliente</button> : '—'])} empty="Nenhum contato." />`;

if (!source.includes(oldTable)) throw new Error('Tabela de contatos não encontrada para inserir botão Mesclar.');
source = source.replace(oldTable, newTable);

for (const check of ['Mesclar com cliente', 'mergeContactIntoClient', "columns={['Importar', 'Contato', 'Telefone', 'Resultado', 'Cliente relacionado', 'Ações']}"]) {
  if (!source.includes(check)) throw new Error('Botão Mesclar incompleto: ' + check);
}

fs.writeFileSync(filePath, source, 'utf8');
console.log('Botão manual de mesclagem preparado.');
