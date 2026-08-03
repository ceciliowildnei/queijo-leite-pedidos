import fs from 'node:fs';
import path from 'node:path';

const filePath = path.resolve('src/main.jsx');
let source = fs.readFileSync(filePath, 'utf8');

const replacements = [
  ["'Entrar no ERP'", "'Entrar'"],
  ['>ERP Queijos WR<', '>Queijos WR<'],
  ['>Queijos WR ERP<', '>Queijos WR<'],
  ['>ERP Gestão<', '>Gestão<'],
  ['Queijos WR ERP', 'Queijos WR']
];
for (const [from, to] of replacements) source = source.split(from).join(to);

const clientSaveVariants = [
  `    if (entity === 'clientes') return save(entity, { id: form.id, nome: form.nome, telefone: onlyDigits(form.telefone), bairro: form.bairro, rua: form.rua, numero: form.numero, cidade: form.cidade, estado: form.estado, observacoes: form.observacoes });`,
  `    if (entity === 'clientes') return save(entity, { id: form.id, nome: form.nome, telefone: onlyDigits(form.telefone), cep: onlyDigits(form.cep), rua: form.rua, numero: form.numero, bairro: form.bairro, cidade: form.cidade, estado: form.estado, complemento: form.complemento, observacoes: form.observacoes });`,
  `    if (entity === 'clientes') return save(entity, { id: form.id, nome: form.nome, telefone: onlyDigits(form.telefone) });`
];
const clientSave = `    if (entity === 'clientes') return save(entity, { id: form.id, nome: form.nome, telefone: onlyDigits(form.telefone || '') });`;
for (const variant of clientSaveVariants) source = source.replace(variant, clientSave);

const optionalClientForm = `{entity === 'clientes' && <><div className="form-note full"><strong>Cadastro sem disparo:</strong> o nome é obrigatório e o WhatsApp é opcional. Nenhuma mensagem será enviada ao salvar.</div><Field label="Nome" required value={form.nome} onChange={value => set('nome', value)} /><Field label="WhatsApp (opcional)" value={form.telefone} onChange={value => set('telefone', value)} /></>}`;
source = source.replace(/\{entity === 'clientes' && <>.*?<\/>>\}/s, optionalClientForm);

const createOriginal = `    const response = await supabase.from('wr_pedidos').insert(rows);\n    if (response.error) return setError(response.error.message);\n    addLog('Pedido criado', \`\${code} · \${client?.nome || 'Cliente'} · \${rows.length} item(ns)\`);\n    setModal(null);\n    setNotice(\`Pedido \${code} criado com sucesso.\`);\n    await sync(true);`;
const createReplacement = `    const response = await supabase.from('wr_pedidos').insert(rows);\n    if (response.error) return setError(response.error.message);\n    addLog('Pedido criado', \`\${code} · \${client?.nome || 'Cliente'} · \${rows.length} item(ns)\`);\n    setModal(null);\n    await sync(true);\n    if (payload.sendWhatsapp) {\n      const phone = onlyDigits(client?.telefone || '');\n      if (!phone) {\n        setNotice(\`Pedido \${code} salvo. Cliente sem WhatsApp cadastrado.\`);\n        return;\n      }\n      const destination = phone.startsWith('55') ? phone : \`55\${phone}\`;\n      const items = rows.map(row => \`- \${row.quantidade}x \${row.produto_nome}: \${money(row.total)}\`).join('\\n');\n      const text = \`Olá, \${client?.nome || 'cliente'}!\\n\\nSeu pedido \${code} foi salvo na Queijos WR.\\n\${items}\\n\\nTotal: \${money(sum(rows, 'total'))}\\nEntrega: \${brDate(payload.data_entrega || selectedDate)}\\n\\nObrigado pela preferência!\`;\n      window.open(\`https://wa.me/\${destination}?text=\${encodeURIComponent(text)}\`, '_blank');\n      setNotice(\`Pedido \${code} salvo. Mensagem aberta no WhatsApp.\`);\n      return;\n    }\n    setNotice(\`Pedido \${code} criado com sucesso.\`);`;
source = source.replace(createOriginal, createReplacement);

const submitOriginal = `  function submit(event) {\n    event.preventDefault();\n    if (!form.cliente_id || !form.items.length) return;\n    save(form);\n  }`;
const submitReplacement = `  function submit(event, sendWhatsapp = false) {\n    event.preventDefault();\n    if (!form.cliente_id || !form.items.length) return;\n    save({ ...form, sendWhatsapp });\n  }`;
source = source.replace(submitOriginal, submitReplacement);

source = source.replace(
  `<button className="btn btn-primary btn-lg" type="submit" disabled={!form.cliente_id || !form.items.length}>Finalizar pedido</button><button className="btn btn-ghost" type="button" onClick={close}>Cancelar</button>`,
  `<button className="btn btn-primary btn-lg" type="submit" disabled={!form.cliente_id || !form.items.length}>Salvar pedido</button><button className="btn btn-secondary btn-lg" type="button" disabled={!form.cliente_id || !form.items.length} onClick={event => submit(event, true)}>Salvar e enviar WhatsApp</button><button className="btn btn-ghost" type="button" onClick={close}>Cancelar</button>`
);

if (!source.includes('Salvar e enviar WhatsApp')) throw new Error('Botão de WhatsApp não foi inserido.');

if (!source.includes('Relatório de separação')) {
  const marker = `      <div className="dashboard-grid"><Panel title="Ranking de produtos"><DataTable compact columns={['Produto', 'Quantidade', 'Faturamento']} rows={ranking.map(item => [item.name, item.quantity, money(item.value)])} empty="Sem dados." /></Panel><Panel title="Resumo por rota"><DataTable compact columns={['Rota', 'Pedidos', 'Qtd.', 'Valor']} rows={routeSummary.map(item => [item.route, item.orders, item.quantity, money(item.value)])} empty="Sem rotas com pedidos." /></Panel></div>`;
  const report = `${marker}\n      <Panel title="Relatório de separação"><DataTable compact columns={['Nome do cliente', 'Produto', 'Quantidade', 'Separado']} rows={[...selectedOrders].sort((a, b) => String(a.cliente_nome || '').localeCompare(String(b.cliente_nome || ''))).map(order => [order.cliente_nome || '—', order.produto_nome || '—', order.quantidade || 0, ['separado', 'em rota', 'entregue'].includes(normalize(order.status_pedido)) ? 'Sim' : 'Não'])} empty="Nenhum pedido nesta data." /></Panel>`;
  source = source.replace(marker, report);
}

fs.writeFileSync(filePath, source, 'utf8');
console.log('Ajustes visuais e envio opcional de pedido por WhatsApp preparados.');
