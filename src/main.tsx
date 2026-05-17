import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

type Cliente = {
  id: string;
  nome: string;
  telefone: string;
  endereco: string;
  observacoes: string;
};

type Produto = {
  id: string;
  nome: string;
  unidade: string;
  preco: number;
  ativo: boolean;
};

type Pedido = {
  id: string;
  codigo: string;
  clienteId: string;
  clienteNome: string;
  telefone: string;
  produtoId: string;
  produtoNome: string;
  quantidade: number;
  precoUnitario: number;
  total: number;
  tipoEntrega: 'Retirada' | 'Entrega';
  endereco: string;
  formaPagamento: string;
  statusPagamento: string;
  statusPedido: string;
  observacoes: string;
  dataPedido: string;
  dataEntrega: string;
};

const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const moeda = (valor: number) => valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const hojeIso = () => new Date().toISOString().slice(0, 10);

function proximaSexta() {
  const d = new Date();
  const dia = d.getDay();
  const dias = (5 - dia + 7) % 7;
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
}

function useLocalStorage<T>(key: string, initial: T) {
  const [state, setState] = useState<T>(() => {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : initial;
  });
  function save(value: T) {
    setState(value);
    localStorage.setItem(key, JSON.stringify(value));
  }
  return [state, save] as const;
}

const produtosIniciais: Produto[] = [
  { id: 'queijo-1kg', nome: 'Queijo 1kg', unidade: 'kg', preco: 0, ativo: true },
  { id: 'queijo-500g', nome: 'Queijo 500g', unidade: '500g', preco: 0, ativo: true },
  { id: 'leite', nome: 'Leite', unidade: 'litro', preco: 0, ativo: true },
];

function App() {
  const [tela, setTela] = useState('dashboard');
  const [clientes, setClientes] = useLocalStorage<Cliente[]>('qlp_clientes', []);
  const [produtos, setProdutos] = useLocalStorage<Produto[]>('qlp_produtos', produtosIniciais);
  const [pedidos, setPedidos] = useLocalStorage<Pedido[]>('qlp_pedidos', []);

  const pedidosSexta = useMemo(() => pedidos.filter(p => p.dataEntrega === proximaSexta()), [pedidos]);
  const resumo = useMemo(() => {
    const ativos = pedidosSexta.filter(p => p.statusPedido !== 'Cancelado');
    return {
      totalPedidos: pedidosSexta.length,
      receita: ativos.reduce((s, p) => s + p.total, 0),
      pago: ativos.filter(p => p.statusPagamento === 'Pago').reduce((s, p) => s + p.total, 0),
      pendente: ativos.filter(p => p.statusPagamento !== 'Pago').reduce((s, p) => s + p.total, 0),
      queijo1kg: ativos.filter(p => p.produtoNome === 'Queijo 1kg').reduce((s, p) => s + p.quantidade, 0),
      queijo500g: ativos.filter(p => p.produtoNome === 'Queijo 500g').reduce((s, p) => s + p.quantidade, 0),
      leite: ativos.filter(p => p.produtoNome === 'Leite').reduce((s, p) => s + p.quantidade, 0),
      pendentes: ativos.filter(p => p.statusPedido === 'Pendente').length,
      entregues: ativos.filter(p => p.statusPedido === 'Entregue').length,
    };
  }, [pedidosSexta]);

  function adicionarCliente(cliente: Omit<Cliente, 'id'>) {
    setClientes([...clientes, { ...cliente, id: uid() }]);
    setTela('clientes');
  }

  function atualizarProduto(produto: Produto) {
    setProdutos(produtos.map(p => p.id === produto.id ? produto : p));
  }

  function adicionarPedido(dados: any) {
    const cliente = clientes.find(c => c.id === dados.clienteId);
    const produto = produtos.find(p => p.id === dados.produtoId);
    if (!cliente) return alert('Selecione um cliente cadastrado.');
    if (!produto) return alert('Selecione um produto.');
    const quantidade = Number(dados.quantidade || 0);
    if (quantidade <= 0) return alert('Informe uma quantidade válida.');
    if (dados.tipoEntrega === 'Entrega' && !dados.endereco.trim()) return alert('Informe o endereço para entrega.');
    const total = quantidade * produto.preco;
    const pedido: Pedido = {
      id: uid(),
      codigo: `PED-${new Date().getFullYear()}-${String(pedidos.length + 1).padStart(4, '0')}`,
      clienteId: cliente.id,
      clienteNome: cliente.nome,
      telefone: cliente.telefone,
      produtoId: produto.id,
      produtoNome: produto.nome,
      quantidade,
      precoUnitario: produto.preco,
      total,
      tipoEntrega: dados.tipoEntrega,
      endereco: dados.endereco,
      formaPagamento: dados.formaPagamento,
      statusPagamento: dados.statusPagamento,
      statusPedido: 'Pendente',
      observacoes: dados.observacoes,
      dataPedido: hojeIso(),
      dataEntrega: dados.dataEntrega,
    };
    setPedidos([pedido, ...pedidos]);
    setTela('pedidos');
  }

  function atualizarStatus(id: string, campo: 'statusPedido' | 'statusPagamento', valor: string) {
    setPedidos(pedidos.map(p => p.id === id ? { ...p, [campo]: valor } : p));
  }

  function excluirPedido(id: string) {
    if (confirm('Deseja excluir este pedido?')) setPedidos(pedidos.filter(p => p.id !== id));
  }

  return (
    <div>
      <header className="hero">
        <div>
          <h1>🧀 Queijo & Leite Pedidos</h1>
          <p>Sistema online para clientes, produtos e pedidos da sexta-feira</p>
        </div>
      </header>
      <nav className="menu">
        <button onClick={() => setTela('dashboard')}>Dashboard</button>
        <button onClick={() => setTela('clientes')}>Clientes</button>
        <button onClick={() => setTela('novoPedido')}>Novo pedido</button>
        <button onClick={() => setTela('pedidos')}>Pedidos</button>
        <button onClick={() => setTela('produtos')}>Produtos</button>
        <button onClick={() => setTela('sexta')}>Pedidos da sexta</button>
      </nav>
      <main className="container">
        {tela === 'dashboard' && <Dashboard resumo={resumo} />}
        {tela === 'clientes' && <Clientes clientes={clientes} onAdd={adicionarCliente} />}
        {tela === 'novoPedido' && <NovoPedido clientes={clientes} produtos={produtos} onAdd={adicionarPedido} onNovoCliente={() => setTela('clientes')} />}
        {tela === 'pedidos' && <Pedidos pedidos={pedidos} onStatus={atualizarStatus} onDelete={excluirPedido} />}
        {tela === 'produtos' && <Produtos produtos={produtos} onUpdate={atualizarProduto} />}
        {tela === 'sexta' && <Pedidos pedidos={pedidosSexta} onStatus={atualizarStatus} onDelete={excluirPedido} titulo="Pedidos da próxima sexta-feira" />}
      </main>
    </div>
  );
}

function Dashboard({ resumo }: { resumo: any }) {
  const cards = [
    ['Pedidos da sexta', resumo.totalPedidos],
    ['Receita prevista', moeda(resumo.receita)],
    ['Total recebido', moeda(resumo.pago)],
    ['Total pendente', moeda(resumo.pendente)],
    ['Queijo 1kg', resumo.queijo1kg],
    ['Queijo 500g', resumo.queijo500g],
    ['Leite', resumo.leite],
    ['Pendentes', resumo.pendentes],
    ['Entregues', resumo.entregues],
  ];
  return <section><h2>Dashboard</h2><div className="cards">{cards.map(([a,b]) => <div className="card" key={a}><span>{a}</span><strong>{b}</strong></div>)}</div></section>;
}

function Clientes({ clientes, onAdd }: { clientes: Cliente[]; onAdd: (c: Omit<Cliente, 'id'>) => void }) {
  const [form, setForm] = useState({ nome: '', telefone: '', endereco: '', observacoes: '' });
  return <section className="panel"><h2>Cadastro de clientes</h2><p>Cadastre o cliente uma vez. Depois, selecione ele em Novo pedido.</p><div className="grid"><input placeholder="Nome" value={form.nome} onChange={e=>setForm({...form,nome:e.target.value})}/><input placeholder="Telefone/WhatsApp" value={form.telefone} onChange={e=>setForm({...form,telefone:e.target.value})}/><input placeholder="Endereço" value={form.endereco} onChange={e=>setForm({...form,endereco:e.target.value})}/><input placeholder="Observações" value={form.observacoes} onChange={e=>setForm({...form,observacoes:e.target.value})}/></div><button className="primary" onClick={()=>{ if(!form.nome.trim()) return alert('Informe o nome.'); onAdd(form); setForm({nome:'',telefone:'',endereco:'',observacoes:''});}}>Cadastrar cliente</button><div className="list">{clientes.map(c=><div className="row" key={c.id}><b>{c.nome}</b><span>{c.telefone}</span><span>{c.endereco}</span><a href={`https://wa.me/55${c.telefone.replace(/\D/g,'')}`} target="_blank">WhatsApp</a></div>)}</div></section>;
}

function NovoPedido({ clientes, produtos, onAdd, onNovoCliente }: any) {
  const [clienteId, setClienteId] = useState('');
  const cliente = clientes.find((c: Cliente) => c.id === clienteId);
  const [produtoId, setProdutoId] = useState('');
  const produto = produtos.find((p: Produto) => p.id === produtoId);
  const [quantidade, setQuantidade] = useState(1);
  const [tipoEntrega, setTipoEntrega] = useState<'Retirada' | 'Entrega'>('Retirada');
  const [endereco, setEndereco] = useState('');
  const [formaPagamento, setFormaPagamento] = useState('Pix');
  const [statusPagamento, setStatusPagamento] = useState('Pendente');
  const [dataEntrega, setDataEntrega] = useState(proximaSexta());
  const [observacoes, setObservacoes] = useState('');
  const total = (produto?.preco || 0) * Number(quantidade || 0);
  return <section className="panel"><h2>Novo pedido</h2><p>Selecione um cliente já cadastrado. O sistema não cria cliente automaticamente no pedido.</p><div className="grid"><select value={clienteId} onChange={e=>{setClienteId(e.target.value); const c=clientes.find((x:Cliente)=>x.id===e.target.value); if(c) setEndereco(c.endereco)}}><option value="">Selecione o cliente</option>{clientes.map((c:Cliente)=><option key={c.id} value={c.id}>{c.nome} - {c.telefone}</option>)}</select><button className="secondary" onClick={onNovoCliente}>Cadastrar novo cliente</button><select value={produtoId} onChange={e=>setProdutoId(e.target.value)}><option value="">Selecione o produto</option>{produtos.filter((p:Produto)=>p.ativo).map((p:Produto)=><option key={p.id} value={p.id}>{p.nome} - {moeda(p.preco)}</option>)}</select><input type="number" min="1" value={quantidade} onChange={e=>setQuantidade(Number(e.target.value))}/><select value={tipoEntrega} onChange={e=>setTipoEntrega(e.target.value as any)}><option>Retirada</option><option>Entrega</option></select><input value={endereco} onChange={e=>setEndereco(e.target.value)} placeholder="Endereço para entrega"/><select value={formaPagamento} onChange={e=>setFormaPagamento(e.target.value)}><option>Pix</option><option>Dinheiro</option><option>Cartão</option><option>Fiado</option></select><select value={statusPagamento} onChange={e=>setStatusPagamento(e.target.value)}><option>Pendente</option><option>Pago</option><option>Parcial</option></select><input type="date" value={dataEntrega} onChange={e=>setDataEntrega(e.target.value)}/><input placeholder="Observações" value={observacoes} onChange={e=>setObservacoes(e.target.value)}/></div>{cliente && <div className="notice">Cliente: {cliente.nome} • {cliente.telefone}</div>}<div className="total">Total: {moeda(total)}</div><button className="primary" onClick={()=>onAdd({clienteId, produtoId, quantidade, tipoEntrega, endereco, formaPagamento, statusPagamento, dataEntrega, observacoes})}>Salvar pedido</button></section>;
}

function Pedidos({ pedidos, onStatus, onDelete, titulo = 'Pedidos' }: any) {
  const [busca, setBusca] = useState('');
  const filtrados = pedidos.filter((p: Pedido) => p.clienteNome.toLowerCase().includes(busca.toLowerCase()) || p.telefone.includes(busca));
  return <section className="panel"><h2>{titulo}</h2><input className="search" placeholder="Buscar por cliente ou telefone" value={busca} onChange={e=>setBusca(e.target.value)}/><div className="table">{filtrados.map((p: Pedido)=><div className="pedido" key={p.id}><div><b>{p.codigo}</b><h3>{p.clienteNome}</h3><p>{p.telefone}</p><p>{p.produtoNome} • Qtd: {p.quantidade}</p><p>{p.tipoEntrega}: {p.endereco || 'retirada'}</p><p>Entrega: {p.dataEntrega}</p></div><div><strong>{moeda(p.total)}</strong><select value={p.statusPedido} onChange={e=>onStatus(p.id,'statusPedido',e.target.value)}><option>Pendente</option><option>Recebido</option><option>Separado</option><option>Saiu para entrega</option><option>Entregue</option><option>Cancelado</option></select><select value={p.statusPagamento} onChange={e=>onStatus(p.id,'statusPagamento',e.target.value)}><option>Pendente</option><option>Pago</option><option>Parcial</option></select><a className="whatsapp" href={`https://wa.me/55${p.telefone.replace(/\D/g,'')}?text=${encodeURIComponent(`Olá, ${p.clienteNome}! Seu pedido foi registrado. Produto: ${p.produtoNome}. Quantidade: ${p.quantidade}. Total: ${moeda(p.total)}. Entrega/retirada: sexta-feira, ${p.dataEntrega}.`)}`} target="_blank">WhatsApp</a><button className="danger" onClick={()=>onDelete(p.id)}>Excluir</button></div></div>)}</div></section>;
}

function Produtos({ produtos, onUpdate }: { produtos: Produto[]; onUpdate: (p: Produto) => void }) {
  return <section className="panel"><h2>Produtos e preços</h2>{produtos.map(p=><div className="row" key={p.id}><b>{p.nome}</b><span>{p.unidade}</span><input type="number" step="0.01" value={p.preco} onChange={e=>onUpdate({...p,preco:Number(e.target.value)})}/><label><input type="checkbox" checked={p.ativo} onChange={e=>onUpdate({...p,ativo:e.target.checked})}/> Ativo</label></div>)}</section>;
}

createRoot(document.getElementById('root')!).render(<App />);
