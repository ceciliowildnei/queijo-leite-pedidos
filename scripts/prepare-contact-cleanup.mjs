import fs from 'node:fs';
import path from 'node:path';

const filePath = path.resolve('src/main.jsx');
let source = fs.readFileSync(filePath, 'utf8');
if (source.includes('Descartados automaticamente')) process.exit(0);

source = source.replace("  const [importMessage, setImportMessage] = useState('');", "  const [importMessage, setImportMessage] = useState('');\n  const [discardedCount, setDiscardedCount] = useState(0);");

source = source.replace("  const analyzed = contactRows.map((item, index) => {\n    const phone = onlyDigits(item.telefone || '');\n    const byPhone = phoneMap.get(phone);\n    const byName = nameMap.get(normalize(item.nome || ''));\n    const status = byPhone ? 'Já cadastrado' : byName ? 'Revisar nome' : phone.length >= 10 ? 'Novo' : 'Sem telefone válido';\n    return { ...item, index, phone, status, existing: byPhone || byName || null };\n  });", `  function looksLikeNonPerson(item) {
    const name = String(item?.nome || '').trim();
    const clean = normalize(name);
    if (!name || item?.organization) return true;
    if (/@/.test(name) || /https?:\\/\\/|www\\.|\\.(com|com\\.br|net|org|gov)(\\b|\\/)/i.test(name)) return true;
    if (/^(email|e-mail|gmail|hotmail|outlook|yahoo|contato|atendimento|suporte|sac|comercial|financeiro|administrativo)$/i.test(clean)) return true;
    return /\\b(empresa|loja|mercado|supermercado|prefeitura|secretaria|escola|colegio|igreja|banco|restaurante|lanchonete|hotel|pousada|farmacia|clinica|oficina|auto pecas|autopecas|construtora|imobiliaria|transportadora|distribuidora|associacao|sindicato|condominio)\\b/i.test(clean);
  }
  const analyzed = contactRows.map((item, index) => {
    const phone = onlyDigits(item.telefone || '');
    const byPhone = phoneMap.get(phone);
    const byName = nameMap.get(normalize(item.nome || ''));
    let status = phone.length < 10 || looksLikeNonPerson(item) ? 'Descartado' : byPhone ? 'Já cadastrado' : (byName && onlyDigits(byName.telefone || '').length < 10) ? 'Mesclar' : byName ? 'Revisar nome' : 'Novo';
    return { ...item, index, phone, status, existing: byPhone || byName || null };
  });`);

source = source.replace("  const reviewRows = analyzed.filter(item => item.status === 'Revisar nome');", "  const reviewRows = analyzed.filter(item => item.status === 'Revisar nome');\n  const mergeRows = analyzed.filter(item => item.status === 'Mesclar');\n  const discardedRows = analyzed.filter(item => item.status === 'Descartado');");

source = source.replace("    const phoneIndexes = header.map((value, index) => /phone|telefone|celular|mobile/.test(value) ? index : -1).filter(index => index >= 0);\n    return lines.slice(1).flatMap(line => { const cols = split(line); const nome = cols[nameIndex >= 0 ? nameIndex : 0] || ''; const telefone = phoneIndexes.map(index => cols[index]).find(value => onlyDigits(value).length >= 10) || ''; return nome && telefone ? [{ nome, telefone }] : []; });", "    const phoneIndexes = header.map((value, index) => /phone|telefone|celular|mobile/.test(value) ? index : -1).filter(index => index >= 0);\n    const orgIndexes = header.map((value, index) => /organization|organizacao|organização|company|empresa/.test(value) ? index : -1).filter(index => index >= 0);\n    return lines.slice(1).flatMap(line => { const cols = split(line); const nome = cols[nameIndex >= 0 ? nameIndex : 0] || ''; const telefone = phoneIndexes.map(index => cols[index]).find(value => onlyDigits(value).length >= 10) || ''; const organization = orgIndexes.map(index => cols[index]).find(Boolean) || ''; return nome ? [{ nome, telefone, organization }] : []; });");

source = source.replace("      const telefone = phones.find(value => onlyDigits(value).length >= 10) || '';\n      return (fn || n) && telefone ? [{ nome: fn || n, telefone }] : [];", "      const telefone = phones.find(value => onlyDigits(value).length >= 10) || '';\n      const organization = card.match(/(?:^|\\n)ORG(?:;[^:]*)?:(.+)/i)?.[1]?.trim() || '';\n      return (fn || n) ? [{ nome: fn || n, telefone, organization }] : [];");

source = source.replace("<MiniMetric label=\"Lidos\" value={analyzed.length} /><MiniMetric label=\"Já cadastrados\" value={existingRows.length} /><MiniMetric label=\"Novos\" value={newRows.length} /><MiniMetric label=\"Revisar nome\" value={reviewRows.length} />", "<MiniMetric label=\"Lidos\" value={analyzed.length} /><MiniMetric label=\"Já cadastrados\" value={existingRows.length} /><MiniMetric label=\"Mesclar\" value={mergeRows.length} /><MiniMetric label=\"Novos\" value={newRows.length} /><MiniMetric label=\"Revisar nome\" value={reviewRows.length} /><MiniMetric label=\"Descartados automaticamente\" value={discardedRows.length} />");

source = source.replace("item.status === 'Novo' ? <input key={'check-'+item.index} type=\"checkbox\" checked={selectedImportPhones.includes(item.phone)} onChange={() => toggleImportPhone(item.phone)} aria-label={'Selecionar ' + item.nome} /> : '—'", "item.status === 'Novo' ? <input key={'check-'+item.index} type=\"checkbox\" checked={selectedImportPhones.includes(item.phone)} onChange={() => toggleImportPhone(item.phone)} aria-label={'Selecionar ' + item.nome} /> : item.status === 'Mesclar' ? 'Mesclar' : '—'");

fs.writeFileSync(filePath, source, 'utf8');
console.log('Limpeza e classificação de contatos preparada.');
