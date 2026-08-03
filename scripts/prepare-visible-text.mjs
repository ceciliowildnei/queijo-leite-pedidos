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

for (const [from, to] of replacements) {
  source = source.split(from).join(to);
}

const clientSaveOriginal = `    if (entity === 'clientes') return save(entity, { id: form.id, nome: form.nome, telefone: onlyDigits(form.telefone), bairro: form.bairro, rua: form.rua, numero: form.numero, cidade: form.cidade, estado: form.estado, observacoes: form.observacoes });`;
const clientSaveExpanded = `    if (entity === 'clientes') return save(entity, { id: form.id, nome: form.nome, telefone: onlyDigits(form.telefone), cep: onlyDigits(form.cep), rua: form.rua, numero: form.numero, bairro: form.bairro, cidade: form.cidade, estado: form.estado, complemento: form.complemento, observacoes: form.observacoes });`;
const clientSaveSimple = `    if (entity === 'clientes') return save(entity, { id: form.id, nome: form.nome, telefone: onlyDigits(form.telefone || '') });`;

source = source.replace(clientSaveOriginal, clientSaveSimple);
source = source.replace(clientSaveExpanded, clientSaveSimple);
source = source.replace(`    if (entity === 'clientes') return save(entity, { id: form.id, nome: form.nome, telefone: onlyDigits(form.telefone) });`, clientSaveSimple);

const clientFormOriginal = `{entity === 'clientes' && <><div className="form-note full"><strong>Cadastro sem disparo:</strong> ao salvar, o cliente será apenas cadastrado. Nenhuma mensagem será enviada pelo WhatsApp.</div><Field label="Nome" required value={form.nome} onChange={value => set('nome', value)} /><Field label="Telefone" value={form.telefone} onChange={value => set('telefone', value)} /><Field label="Bairro" value={form.bairro} onChange={value => set('bairro', value)} /><Field label="Rua" value={form.rua} onChange={value => set('rua', value)} /><Field label="Número" value={form.numero} onChange={value => set('numero', value)} /><Field label="Cidade" value={form.cidade} onChange={value => set('cidade', value)} /><Field label="Estado" value={form.estado} onChange={value => set('estado', value)} /><Field className="full" label="Observações" value={form.observacoes} onChange={value => set('observacoes', value)} /></>}`;
const clientFormExpanded = `{entity === 'clientes' && <><div className="form-note full"><strong>Cadastro sem disparo:</strong> ao salvar, o cliente será apenas cadastrado. Nenhuma mensagem será enviada pelo WhatsApp.</div><Field label="Nome do cliente" required value={form.nome} onChange={value => set('nome', value)} /><Field label="Telefone/WhatsApp" value={form.telefone} onChange={value => set('telefone', value)} /><Field label="CEP" value={form.cep} onChange={value => set('cep', value)} /><button type="button" className="btn btn-secondary" onClick={buscarCepCliente} disabled={loadingCep}>{loadingCep ? 'Buscando...' : 'Buscar CEP'}</button><Field label="Rua" value={form.rua} onChange={value => set('rua', value)} /><Field label="Número" value={form.numero} onChange={value => set('numero', value)} /><Field label="Bairro" value={form.bairro} onChange={value => set('bairro', value)} /><Field label="Cidade" value={form.cidade} onChange={value => set('cidade', value)} /><Field label="Estado" value={form.estado} onChange={value => set('estado', value)} /><Field label="Complemento" value={form.complemento} onChange={value => set('complemento', value)} /><Field className="full" label="Observações" value={form.observacoes} onChange={value => set('observacoes', value)} /></>}`;
const clientFormSimple = `{entity === 'clientes' && <><div className="form-note full"><strong>Cadastro sem disparo:</strong> ao salvar, o cliente será apenas cadastrado. Nenhuma mensagem será enviada pelo WhatsApp.</div><Field label="Nome" required value={form.nome} onChange={value => set('nome', value)} /><Field label="WhatsApp" value={form.telefone} onChange={value => set('telefone', value)} /></>}`;
const clientFormOptional = `{entity === 'clientes' && <><div className="form-note full"><strong>Cadastro sem disparo:</strong> o nome é obrigatório e o WhatsApp é opcional. Nenhuma mensagem será enviada ao salvar.</div><Field label="Nome" required value={form.nome} onChange={value => set('nome', value)} /><Field label="WhatsApp (opcional)" value={form.telefone} onChange={value => set('telefone', value)} /></>}`;

source = source.replace(clientFormOriginal, clientFormOptional);
source = source.replace(clientFormExpanded, clientFormOptional);
source = source.replace(clientFormSimple, clientFormOptional);

if (!source.includes(clientFormOptional)) {
  throw new Error('Não foi possível aplicar o cadastro com WhatsApp opcional.');
}

if (!source.includes('Relatório de separação')) {
  const marker = `      <div className="dashboard-grid"><Panel title="Ranking de produtos"><DataTable compact columns={['Produto', 'Quantidade', 'Faturamento']} rows={ranking.map(item => [item.name, item.quantity, money(item.value)])} empty="Sem dados." /></Panel><Panel title="Resumo por rota"><DataTable compact columns={['Rota', 'Pedidos', 'Qtd.', 'Valor']} rows={routeSummary.map(item => [item.route, item.orders, item.quantity, money(item.value)])} empty="Sem rotas com pedidos." /></Panel></div>`;
  const report = `${marker}\n      <Panel title="Relatório de separação"><DataTable compact columns={['Nome do cliente', 'Produto', 'Quantidade', 'Separado']} rows={[...selectedOrders].sort((a, b) => String(a.cliente_nome || '').localeCompare(String(b.cliente_nome || ''))).map(order => [order.cliente_nome || '—', order.produto_nome || '—', order.quantidade || 0, ['separado', 'em rota', 'entregue'].includes(normalize(order.status_pedido)) ? 'Sim' : 'Não'])} empty="Nenhum pedido nesta data." /></Panel>`;
  if (!source.includes(marker)) throw new Error('Não foi possível localizar o ponto do relatório.');
  source = source.replace(marker, report);
}

fs.writeFileSync(filePath, source, 'utf8');
console.log('Cadastro de cliente com WhatsApp opcional preparado.');
