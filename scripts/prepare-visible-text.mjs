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

const formStateMarker = `  const [form, setForm] = useState({ ...item, rota: item.rota || item.tipo_entrega || routes[0], ativo: item.ativo !== false });`;
const formStateReplacement = `${formStateMarker}\n  const [loadingCep, setLoadingCep] = useState(false);\n  async function buscarCepCliente() {\n    const cep = onlyDigits(form.cep);\n    if (cep.length !== 8) return window.alert('Digite um CEP com 8 números.');\n    setLoadingCep(true);\n    try {\n      const response = await fetch(\`https://viacep.com.br/ws/\${cep}/json/\`);\n      if (!response.ok) throw new Error('Falha ao consultar o CEP.');\n      const data = await response.json();\n      if (data.erro) return window.alert('CEP não encontrado.');\n      setForm(current => ({\n        ...current,\n        cep,\n        rua: data.logradouro || current.rua || '',\n        bairro: data.bairro || current.bairro || '',\n        cidade: data.localidade || current.cidade || '',\n        estado: data.uf || current.estado || '',\n      }));\n    } catch {\n      window.alert('Não foi possível buscar o CEP agora.');\n    } finally {\n      setLoadingCep(false);\n    }\n  }`;

if (!source.includes('async function buscarCepCliente()')) {
  if (!source.includes(formStateMarker)) throw new Error('Não foi possível localizar o formulário de cliente.');
  source = source.replace(formStateMarker, formStateReplacement);
}

const clientSaveMarker = `    if (entity === 'clientes') return save(entity, { id: form.id, nome: form.nome, telefone: onlyDigits(form.telefone), bairro: form.bairro, rua: form.rua, numero: form.numero, cidade: form.cidade, estado: form.estado, observacoes: form.observacoes });`;
const clientSaveReplacement = `    if (entity === 'clientes') return save(entity, { id: form.id, nome: form.nome, telefone: onlyDigits(form.telefone), cep: onlyDigits(form.cep), rua: form.rua, numero: form.numero, bairro: form.bairro, cidade: form.cidade, estado: form.estado, complemento: form.complemento, observacoes: form.observacoes });`;

if (source.includes(clientSaveMarker)) {
  source = source.replace(clientSaveMarker, clientSaveReplacement);
}

const clientFormMarker = `{entity === 'clientes' && <><div className="form-note full"><strong>Cadastro sem disparo:</strong> ao salvar, o cliente será apenas cadastrado. Nenhuma mensagem será enviada pelo WhatsApp.</div><Field label="Nome" required value={form.nome} onChange={value => set('nome', value)} /><Field label="Telefone" value={form.telefone} onChange={value => set('telefone', value)} /><Field label="Bairro" value={form.bairro} onChange={value => set('bairro', value)} /><Field label="Rua" value={form.rua} onChange={value => set('rua', value)} /><Field label="Número" value={form.numero} onChange={value => set('numero', value)} /><Field label="Cidade" value={form.cidade} onChange={value => set('cidade', value)} /><Field label="Estado" value={form.estado} onChange={value => set('estado', value)} /><Field className="full" label="Observações" value={form.observacoes} onChange={value => set('observacoes', value)} /></>}`;
const clientFormReplacement = `{entity === 'clientes' && <><div className="form-note full"><strong>Cadastro sem disparo:</strong> ao salvar, o cliente será apenas cadastrado. Nenhuma mensagem será enviada pelo WhatsApp.</div><Field label="Nome do cliente" required value={form.nome} onChange={value => set('nome', value)} /><Field label="Telefone/WhatsApp" value={form.telefone} onChange={value => set('telefone', value)} /><Field label="CEP" value={form.cep} onChange={value => set('cep', value)} /><button type="button" className="btn btn-secondary" onClick={buscarCepCliente} disabled={loadingCep}>{loadingCep ? 'Buscando...' : 'Buscar CEP'}</button><Field label="Rua" value={form.rua} onChange={value => set('rua', value)} /><Field label="Número" value={form.numero} onChange={value => set('numero', value)} /><Field label="Bairro" value={form.bairro} onChange={value => set('bairro', value)} /><Field label="Cidade" value={form.cidade} onChange={value => set('cidade', value)} /><Field label="Estado" value={form.estado} onChange={value => set('estado', value)} /><Field label="Complemento" value={form.complemento} onChange={value => set('complemento', value)} /><Field className="full" label="Observações" value={form.observacoes} onChange={value => set('observacoes', value)} /></>}`;

if (source.includes(clientFormMarker)) {
  source = source.replace(clientFormMarker, clientFormReplacement);
}

if (!source.includes('Relatório de separação e entrega')) {
  const marker = `      <div className="dashboard-grid"><Panel title="Ranking de produtos"><DataTable compact columns={['Produto', 'Quantidade', 'Faturamento']} rows={ranking.map(item => [item.name, item.quantity, money(item.value)])} empty="Sem dados." /></Panel><Panel title="Resumo por rota"><DataTable compact columns={['Rota', 'Pedidos', 'Qtd.', 'Valor']} rows={routeSummary.map(item => [item.route, item.orders, item.quantity, money(item.value)])} empty="Sem rotas com pedidos." /></Panel></div>`;

  const report = `${marker}\n      <Panel title="Relatório de separação"><DataTable compact columns={['Nome do cliente', 'Produto', 'Quantidade', 'Separado']} rows={[...selectedOrders].sort((a, b) => String(a.cliente_nome || '').localeCompare(String(b.cliente_nome || ''))).map(order => [order.cliente_nome || '—', order.produto_nome || '—', order.quantidade || 0, normalize(order.status_pedido) === 'separado' || normalize(order.status_pedido) === 'em rota' || normalize(order.status_pedido) === 'entregue' ? 'Sim' : 'Não'])} empty="Nenhum pedido nesta data." /></Panel>`;

  if (!source.includes(marker)) {
    throw new Error('Não foi possível localizar o ponto do relatório para inserir a nova tabela.');
  }

  source = source.replace(marker, report);
}

fs.writeFileSync(filePath, source, 'utf8');
console.log('Cadastro de cliente e relatório de separação preparados.');
