import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createClient } from '@supabase/supabase-js';
import './style.css';

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(error => console.warn('Service Worker:', error));
  });
}

const supabase = createClient(
  'https://ywwztahbqgiwervbwudg.supabase.co',
  'sb_publishable_er0Z1O0s1opKniqu3cYkGg_svVBvXRx'
);

const LOGO = '/logo-queijos-wr-upload.svg';
const DEFAULT_ROUTES = ['Rota 01 - Zona Rural', 'Rota 02 - Centro', 'Rota 03 - Vila Nova'];
const CASH_KEY = 'wr_caixa_saidas';
const PHOTO_KEY = 'wr_client_photos_v1';
const LOG_KEY = 'wr_audit_logs_v1';
const VERSION = '2.0.0';

const TABLES = {
  clientes: 'wr_clientes',
  produtos: 'wr_produtos',
  pedidos: 'wr_pedidos',
  admins: 'wr_admins',
};

const NAV_ITEMS = [
  ['dashboard', 'Dashboard', 'dashboard'],
  ['clientes', 'Clientes', 'clientes'],
  ['produtos', 'Produtos', 'pedidos'],
  ['pedidos', 'Pedidos', 'pedidos'],
  ['entregas', 'Entregas', 'entregas'],
  ['caixa', 'Caixa', 'caixa'],
  ['relatorios', 'Relatórios', 'relatorios'],
  ['administracao', 'Administração', 'administracao'],
  ['pdfs', 'PDFs e comprovantes', 'pdf'],
];

const COLLABORATOR_NAV_KEYS = new Set(['dashboard', 'clientes', 'pedidos', 'entregas']);

const money = value => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const number = value => Number(value || 0);
const onlyDigits = value => String(value || '').replace(/\D/g, '');
const normalize = value => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
const hasFullAccess = user => normalize(user?.papel).includes('adm');
const isoToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const brDate = value => value ? String(value).slice(0, 10).split('-').reverse().join('/') : '—';
const sum = (items, key) => items.reduce((total, item) => total + number(item[key]), 0);
const formatPhone = value => {
  const digits = onlyDigits(value);
  if (digits.length === 11) return digits.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  if (digits.length === 10) return digits.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  return value || '—';
};
const addressOf = client => [client?.rua, client?.numero, client?.bairro, client?.cidade, client?.estado].filter(Boolean).join(', ');
const orderDate = order => String(order?.data_entrega || '').slice(0, 10);
const dateValue = value => new Date(`${String(value).slice(0, 10)}T12:00:00`);
const isBetween = (value, start, end) => {
  const current = dateValue(value).getTime();
  return current >= dateValue(start).getTime() && current <= dateValue(end).getTime();
};
const addDays = (value, days) => {
  const date = dateValue(value);
  date.setDate(date.getDate() + days);
  return new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
};
const weekStart = value => {
  const date = dateValue(value);
  const day = date.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + offset);
  return new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
};
const productSize = name => {
  const text = normalize(name);
  if (text.includes('leite')) return 'leite';
  if (text.includes('1kg') || text.includes('1 kg') || text.includes('grande') || text.includes('queijo g')) return '1kg';
  if (text.includes('500g') || text.includes('500 g') || text.includes('meio') || text.includes('pequeno') || text.includes('queijo p')) return '500g';
  return 'outro';
};
const routeOf = (order, routes) => {
  const route = order?.rota || order?.tipo_entrega || '';
  return routes.includes(route) ? route : routes[0] || DEFAULT_ROUTES[0];
};
const statusTone = value => {
  const text = normalize(value);
  if (text.includes('entregue') || text.includes('pago') || text.includes('ativo')) return 'success';
  if (text.includes('rota') || text.includes('separado')) return 'info';
  if (text.includes('pendente') || text.includes('aguard')) return 'warning';
  return 'neutral';
};
const readLocal = (key, fallback) => {
  try { return JSON.parse(localStorage.getItem(key) || '') || fallback; } catch { return fallback; }
};
const writeLocal = (key, value) => {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch (error) { console.warn(error); }
};
const noId = object => {
  const { id, ...payload } = object || {};
  Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);
  return { id, payload };
};
const initials = name => String(name || '?').split(/\s+/).slice(0, 2).map(part => part[0] || '').join('').toUpperCase();
const nextOrderCode = () => `WR-${Date.now().toString(36).slice(-6).toUpperCase()}`;

function Icon({ name, className = '' }) {
  return <i className={`wr-brand-icon wr-icon-${name} ${className}`} aria-hidden="true" />;
}

function App() {
  const [admin, setAdmin] = useState(null);
  const [login, setLogin] = useState({ telefone: '', pin: '' });
  const [tab, setTab] = useState('dashboard');
  const [query, setQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState(isoToday());
  const [modal, setModal] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('wr_menu_collapsed') === '1');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('wr_theme') || 'light');
  const [searchOpen, setSearchOpen] = useState(false);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [routes, setRoutes] = useState(() => readLocal('wr_rotas', DEFAULT_ROUTES));
  const [cashOuts, setCashOuts] = useState(() => readLocal(CASH_KEY, []));
  const [photos, setPhotos] = useState(() => readLocal(PHOTO_KEY, {}));
  const [logs, setLogs] = useState(() => readLocal(LOG_KEY, []));
  const [db, setDb] = useState({ clientes: [], produtos: [], pedidos: [], admins: [] });
  const fullAccess = hasFullAccess(admin);
  const visibleNavItems = fullAccess ? NAV_ITEMS : NAV_ITEMS.filter(([key]) => COLLABORATOR_NAV_KEYS.has(key));

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('wr_theme', theme);
  }, [theme]);

  useEffect(() => {
    const beforeInstall = event => {
      event.preventDefault();
      setInstallPrompt(event);
    };
    const installed = () => setInstallPrompt(null);
    window.addEventListener('beforeinstallprompt', beforeInstall);
    window.addEventListener('appinstalled', installed);
    return () => {
      window.removeEventListener('beforeinstallprompt', beforeInstall);
      window.removeEventListener('appinstalled', installed);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('wr_menu_collapsed', collapsed ? '1' : '0');
  }, [collapsed]);

  useEffect(() => {
    if (admin && !visibleNavItems.some(([key]) => key === tab)) setTab('dashboard');
  }, [admin, tab, fullAccess]);

  useEffect(() => {
    if (!admin) return undefined;
    sync(true);
    const channel = supabase.channel('wr-erp-live').on('postgres_changes', { event: '*', schema: 'public' }, () => sync(true)).subscribe();
    const timer = setInterval(() => sync(true), 30000);
    const focus = () => sync(true);
    window.addEventListener('focus', focus);
    return () => {
      supabase.removeChannel(channel);
      clearInterval(timer);
      window.removeEventListener('focus', focus);
    };
  }, [admin]);

  const selectedOrders = useMemo(() => db.pedidos.filter(order => orderDate(order) === selectedDate), [db.pedidos, selectedDate]);
  const todayOrders = useMemo(() => db.pedidos.filter(order => orderDate(order) === isoToday()), [db.pedidos]);
  const weekOrders = useMemo(() => {
    const start = weekStart(isoToday());
    return db.pedidos.filter(order => isBetween(orderDate(order), start, addDays(start, 6)));
  }, [db.pedidos]);

  const searchResults = useMemo(() => {
    const text = normalize(query);
    if (!text) return [];
    const results = [];
    db.clientes.filter(item => normalize(JSON.stringify(item)).includes(text)).slice(0, 5).forEach(item => results.push({ type: 'Cliente', tab: 'clientes', title: item.nome || 'Cliente', subtitle: formatPhone(item.telefone) }));
    db.produtos.filter(item => normalize(JSON.stringify(item)).includes(text)).slice(0, 5).forEach(item => results.push({ type: 'Produto', tab: 'produtos', title: item.nome || 'Produto', subtitle: money(item.preco) }));
    db.pedidos.filter(item => normalize(JSON.stringify(item)).includes(text)).slice(0, 8).forEach(item => results.push({ type: 'Pedido', tab: 'pedidos', title: item.cliente_nome || item.codigo || 'Pedido', subtitle: `${item.produto_nome || ''} · ${money(item.total)}` }));
    return results.filter(result => visibleNavItems.some(([key]) => key === result.tab)).slice(0, 12);
  }, [query, db, fullAccess]);

  function addLog(action, detail) {
    const entry = { id: crypto.randomUUID?.() || String(Date.now()), date: new Date().toISOString(), user: admin?.nome || 'Sistema', action, detail };
    const next = [entry, ...logs].slice(0, 250);
    setLogs(next);
    writeLocal(LOG_KEY, next);
  }

  async function loginSubmit(event) {
    event.preventDefault();
    setError('');
    setLoading(true);
    const response = await supabase.from('wr_admins').select('*').eq('telefone', onlyDigits(login.telefone)).eq('pin', String(login.pin || '').trim()).eq('ativo', true).maybeSingle();
    setLoading(false);
    if (response.error) return setError(response.error.message);
    if (!response.data) return setError('Celular ou PIN inválido.');
    setAdmin(response.data);
    setNotice(`Bem-vindo, ${response.data.nome}.`);
  }

  async function loadRoutes() {
    const response = await supabase.from('wr_config').select('valor').eq('chave', 'rotas').maybeSingle();
    if (Array.isArray(response.data?.valor) && response.data.valor.length) {
      setRoutes(response.data.valor);
      writeLocal('wr_rotas', response.data.valor);
    }
  }

  async function sync(silent = false) {
    if (!silent) setLoading(true);
    setError('');
    const [clients, products, orders, admins] = await Promise.all([
      supabase.from('wr_clientes').select('*').order('criado_em', { ascending: false }),
      supabase.from('wr_produtos').select('*').order('nome'),
      supabase.from('wr_pedidos').select('*').order('data_entrega', { ascending: false }),
      supabase.from('wr_admins').select('*').order('nome'),
    ]);
    const firstError = clients.error || products.error || orders.error || admins.error;
    if (firstError) setError(firstError.message);
    else {
      setDb({ clientes: clients.data || [], produtos: products.data || [], pedidos: orders.data || [], admins: admins.data || [] });
      await loadRoutes();
      if (!silent) setNotice('Dados sincronizados com o Supabase.');
    }
    if (!silent) setLoading(false);
  }

  async function saveEntity(type, object) {
    setError('');
    const { id, payload } = noId(object);
    const table = TABLES[type];
    const response = id ? await supabase.from(table).update(payload).eq('id', id) : await supabase.from(table).insert([payload]);
    if (response.error) return setError(response.error.message);
    addLog(id ? 'Registro atualizado' : 'Registro criado', `${type}: ${payload.nome || payload.codigo || payload.cliente_nome || id || 'novo'}`);
    setModal(null);
    setNotice(type === 'clientes'
      ? 'Cliente salvo e sincronizado. Nenhuma mensagem foi enviada pelo WhatsApp.'
      : 'Alterações salvas e sincronizadas.');
    await sync(true);
  }

  async function deleteEntity(type, id, label) {
    if (!window.confirm(`Excluir ${label || 'este registro'}?`)) return;
    const response = await supabase.from(TABLES[type]).delete().eq('id', id);
    if (response.error) return setError(response.error.message);
    addLog('Registro excluído', `${type}: ${label || id}`);
    await sync(true);
  }

  async function updateOrder(id, changes, detail = 'Status do pedido atualizado') {
    const response = await supabase.from('wr_pedidos').update(changes).eq('id', id);
    if (response.error) return setError(response.error.message);
    addLog(detail, `Pedido ${id}`);
    await sync(true);
  }

  async function createCartOrder(payload) {
    const client = db.clientes.find(item => String(item.id) === String(payload.cliente_id));
    const code = nextOrderCode();
    const rows = payload.items.map(item => {
      const product = db.produtos.find(entry => String(entry.id) === String(item.produto_id));
      const quantity = number(item.quantidade || 1);
      const unit = number(item.preco_unitario || product?.preco);
      return {
        codigo: code,
        cliente_id: client?.id,
        cliente_nome: client?.nome || payload.cliente_nome || 'Cliente',
        cliente_telefone: client?.telefone || '',
        produto_id: product?.id,
        produto_nome: product?.nome || item.produto_nome,
        quantidade: quantity,
        preco_unitario: unit,
        total: quantity * unit,
        rota: payload.rota,
        tipo_entrega: payload.rota,
        endereco: payload.endereco || addressOf(client),
        forma_pagamento: payload.forma_pagamento || 'Pix',
        status_pagamento: payload.status_pagamento || 'Pendente',
        status_pedido: payload.status_pedido || 'Separado',
        data_entrega: payload.data_entrega || selectedDate,
        observacoes: payload.observacoes || '',
      };
    });
    const response = await supabase.from('wr_pedidos').insert(rows);
    if (response.error) return setError(response.error.message);
    addLog('Pedido criado', `${code} · ${client?.nome || 'Cliente'} · ${rows.length} item(ns)`);
    setModal(null);
    setNotice(`Pedido ${code} criado com sucesso.`);
    await sync(true);
  }

  async function saveRoutes(nextRoutes) {
    if (!nextRoutes.length) return setError('Adicione pelo menos uma rota.');
    const previous = [...routes];
    setRoutes(nextRoutes);
    writeLocal('wr_rotas', nextRoutes);
    const response = await supabase.from('wr_config').upsert([{ chave: 'rotas', valor: nextRoutes }]);
    if (response.error) return setError(response.error.message);
    for (let index = 0; index < previous.length; index += 1) {
      if (nextRoutes[index] && previous[index] && nextRoutes[index] !== previous[index]) {
        await supabase.from('wr_pedidos').update({ rota: nextRoutes[index], tipo_entrega: nextRoutes[index] }).or(`rota.eq.${previous[index]},tipo_entrega.eq.${previous[index]}`);
      }
    }
    addLog('Rotas atualizadas', nextRoutes.join(', '));
    setModal(null);
    await sync(true);
  }

  function saveCashOut(out) {
    const next = [{ ...out, id: crypto.randomUUID?.() || String(Date.now()) }, ...cashOuts];
    setCashOuts(next);
    writeLocal(CASH_KEY, next);
    addLog('Saída lançada', `${out.descricao} · ${money(out.valor)}`);
    setModal(null);
  }

  function deleteCashOut(id) {
    const next = cashOuts.filter(item => item.id !== id);
    setCashOuts(next);
    writeLocal(CASH_KEY, next);
    addLog('Saída removida', id);
  }

  function saveClientPhoto(client, dataUrl) {
    const keys = [`id:${client.id}`, `tel:${onlyDigits(client.telefone)}`, `nome:${normalize(client.nome)}`].filter(key => !key.endsWith(':'));
    const next = { ...photos };
    keys.forEach(key => { next[key] = dataUrl; });
    setPhotos(next);
    writeLocal(PHOTO_KEY, next);
  }

  function getClientPhoto(client) {
    return photos[`id:${client.id}`] || photos[`tel:${onlyDigits(client.telefone)}`] || photos[`nome:${normalize(client.nome)}`] || '';
  }

  function selectTab(nextTab) {
    if (!visibleNavItems.some(([key]) => key === nextTab)) {
      setError('Seu perfil não possui acesso a esta área.');
      return;
    }
    setTab(nextTab);
    setMobileOpen(false);
    setSearchOpen(false);
  }

  async function installApp() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  }

  function logout() {
    addLog('Sessão encerrada', admin?.nome || 'Usuário');
    setAdmin(null);
    setLogin({ telefone: '', pin: '' });
  }

  if (!admin) return <Login login={login} setLogin={setLogin} onSubmit={loginSubmit} error={error} loading={loading} />;

  const pageProps = {
    db, query, selectedDate, selectedOrders, todayOrders, weekOrders, routes, cashOuts, photos, logs,
    setQuery, setSelectedDate, setModal, saveEntity, deleteEntity, updateOrder, getClientPhoto,
    saveClientPhoto, deleteCashOut, selectTab, sync, loading, admin,
    canDelete: fullAccess, canManage: fullAccess,
  };

  return (
    <div className={`app-shell ${collapsed ? 'sidebar-collapsed' : ''} ${mobileOpen ? 'mobile-menu-open' : ''}`}>
      <Sidebar items={visibleNavItems} tab={tab} onSelect={selectTab} collapsed={collapsed} setCollapsed={setCollapsed} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
      <main className="app-main">
        <Topbar
          items={visibleNavItems}
          tab={tab}
          query={query}
          setQuery={setQuery}
          searchOpen={searchOpen}
          setSearchOpen={setSearchOpen}
          searchResults={searchResults}
          onResult={result => selectTab(result.tab)}
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          sync={() => sync(false)}
          loading={loading}
          theme={theme}
          setTheme={setTheme}
          admin={admin}
          logout={logout}
          installPrompt={installPrompt}
          installApp={installApp}
          openMobile={() => setMobileOpen(true)}
        />
        <div className="page-content">
          {notice && <Alert tone="success" onClose={() => setNotice('')}>{notice}</Alert>}
          {error && <Alert tone="danger" onClose={() => setError('')}>{error}</Alert>}
          {tab === 'dashboard' && <Dashboard {...pageProps} />}
          {tab === 'clientes' && <ClientsPage {...pageProps} />}
          {fullAccess && tab === 'produtos' && <ProductsPage {...pageProps} />}
          {tab === 'pedidos' && <OrdersPage {...pageProps} />}
          {tab === 'entregas' && <DeliveriesPage {...pageProps} />}
          {fullAccess && tab === 'caixa' && <CashPage {...pageProps} />}
          {fullAccess && tab === 'relatorios' && <ReportsPage {...pageProps} />}
          {fullAccess && tab === 'administracao' && <AdminPage {...pageProps} />}
          {fullAccess && tab === 'pdfs' && <DocumentsPage {...pageProps} />}
        </div>
      </main>
      {modal && (
        <ModalRouter
          modal={modal}
          close={() => setModal(null)}
          db={db}
          routes={routes}
          selectedDate={selectedDate}
          saveEntity={saveEntity}
          createCartOrder={createCartOrder}
          saveRoutes={saveRoutes}
          saveCashOut={saveCashOut}
          updateOrder={updateOrder}
        />
      )}
    </div>
  );
}

function Login({ login, setLogin, onSubmit, error, loading }) {
  const [showPin, setShowPin] = useState(false);
  return (
    <div className="login-page">
      <div className="login-visual">
        <div className="login-brand">
          <img src={LOGO} alt="Queijos WR" />
          <span>ERP Queijos WR</span>
        </div>
        <div className="login-copy">
          <span className="eyebrow">Gestão inteligente</span>
          <h1>Controle pedidos, entregas e resultados em um só lugar.</h1>
          <p>Uma experiência moderna para acompanhar toda a operação da Queijos WR.</p>
          <div className="login-highlights">
            <span>Supabase sincronizado</span><span>Responsivo</span><span>Tempo real</span>
          </div>
        </div>
      </div>
      <div className="login-form-area">
        <form className="login-card" onSubmit={onSubmit}>
          <img src={LOGO} alt="Queijos WR" className="login-card-logo" />
          <div className="login-heading"><span>Acesso administrativo</span><h2>Bem-vindo de volta</h2><p>Entre com seu celular e PIN.</p></div>
          <label>Celular<input autoFocus inputMode="tel" placeholder="(18) 99999-9999" value={login.telefone} onChange={event => setLogin({ ...login, telefone: event.target.value })} /></label>
          <label>PIN<div className="password-field"><input type={showPin ? 'text' : 'password'} placeholder="••••" value={login.pin} onChange={event => setLogin({ ...login, pin: event.target.value })} /><button type="button" onClick={() => setShowPin(value => !value)}>{showPin ? 'Ocultar' : 'Mostrar'}</button></div></label>
          {error && <Alert tone="danger">{error}</Alert>}
          <button className="btn btn-primary btn-lg" disabled={loading} type="submit">{loading ? <><Spinner /> Entrando...</> : 'Entrar no ERP'}</button>
          <p className="login-footnote">Sabor e tradição de família.</p>
        </form>
      </div>
    </div>
  );
}

function Sidebar({ items, tab, onSelect, collapsed, setCollapsed, mobileOpen, setMobileOpen }) {
  return (
    <>
      <div className={`sidebar-backdrop ${mobileOpen ? 'show' : ''}`} onClick={() => setMobileOpen(false)} />
      <aside className="sidebar">
        <div className="sidebar-brand"><img src={LOGO} alt="Queijos WR" /><div><strong>Queijos WR</strong><span>ERP Gestão</span></div></div>
        <button className="sidebar-collapse" type="button" onClick={() => setCollapsed(value => !value)} aria-label="Recolher menu"><span>‹</span></button>
        <nav className="sidebar-nav">
          {items.map(([key, label, icon]) => (
            <button key={key} type="button" className={tab === key ? 'active' : ''} onClick={() => onSelect(key)} title={label}>
              <span className="nav-icon"><Icon name={icon} /></span><span className="nav-label">{label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-footer"><span className="connection-dot" /> <div><strong>Supabase conectado</strong><small>Versão {VERSION}</small></div></div>
      </aside>
    </>
  );
}

function Topbar({ items, tab, query, setQuery, searchOpen, setSearchOpen, searchResults, onResult, selectedDate, setSelectedDate, sync, loading, theme, setTheme, admin, logout, installPrompt, installApp, openMobile }) {
  const title = items.find(item => item[0] === tab)?.[1] || 'ERP';
  return (
    <header className="topbar">
      <div className="topbar-title"><button className="mobile-menu-btn" onClick={openMobile} type="button">☰</button><div><span className="eyebrow">Queijos WR ERP</span><h1>{title}</h1></div></div>
      <div className="topbar-search-wrap">
        <div className="global-search"><span>⌕</span><input placeholder="Pesquisar clientes, pedidos, produtos..." value={query} onFocus={() => setSearchOpen(true)} onChange={event => { setQuery(event.target.value); setSearchOpen(true); }} /><kbd>Ctrl K</kbd></div>
        {searchOpen && query && <div className="search-popover">{searchResults.length ? searchResults.map((result, index) => <button type="button" key={`${result.type}-${index}`} onClick={() => onResult(result)}><span className="search-type">{result.type}</span><strong>{result.title}</strong><small>{result.subtitle}</small></button>) : <div className="search-empty">Nenhum resultado encontrado.</div>}</div>}
      </div>
      <div className="topbar-actions">
        {installPrompt && <button className="btn btn-secondary install-app-btn" type="button" onClick={installApp}>Instalar no computador</button>}
        <label className="date-control"><span>Data operacional</span><input type="date" value={selectedDate} onChange={event => setSelectedDate(event.target.value)} /></label>
        <button className="icon-btn sync-btn" type="button" onClick={sync} title="Sincronizar">{loading ? <Spinner /> : '↻'}</button>
        <button className="icon-btn notification-btn" type="button" title="Notificações">♢<span>3</span></button>
        <button className="icon-btn" type="button" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} title="Alternar tema">{theme === 'light' ? '☾' : '☀'}</button>
        <div className="profile-menu"><div className="avatar">{initials(admin.nome)}</div><div><strong>{admin.nome}</strong><span>{admin.papel || 'Administrador'}</span></div><button type="button" onClick={logout}>Sair</button></div>
      </div>
    </header>
  );
}

function Dashboard({ db, todayOrders, weekOrders, selectedOrders, selectedDate, cashOuts, setModal, selectTab, canManage }) {
  const paid = selectedOrders.filter(order => normalize(order.status_pagamento).includes('pago'));
  const outputs = cashOuts.filter(item => item.data === selectedDate);
  const metrics = {
    todayRevenue: sum(todayOrders, 'total'),
    weekRevenue: sum(weekOrders, 'total'),
    pending: selectedOrders.filter(order => normalize(order.status_pedido) !== 'entregue').length,
    delivered: selectedOrders.filter(order => normalize(order.status_pedido) === 'entregue').length,
    clients: db.clientes.length,
    cheese1: sum(selectedOrders.filter(order => productSize(order.produto_nome) === '1kg'), 'quantidade'),
    cheese500: sum(selectedOrders.filter(order => productSize(order.produto_nome) === '500g'), 'quantidade'),
    milk: sum(selectedOrders.filter(order => productSize(order.produto_nome) === 'leite'), 'quantidade'),
    deliveries: selectedOrders.length,
    cash: sum(paid, 'total') - sum(outputs, 'valor'),
    profit: sum(paid, 'total') - sum(outputs, 'valor'),
  };
  const lastOrders = [...db.pedidos].sort((a, b) => String(b.criado_em || b.data_entrega || '').localeCompare(String(a.criado_em || a.data_entrega || ''))).slice(0, 6);
  const upcoming = db.pedidos.filter(order => orderDate(order) >= isoToday() && normalize(order.status_pedido) !== 'entregue').sort((a, b) => orderDate(a).localeCompare(orderDate(b))).slice(0, 6);
  const chart = Array.from({ length: 7 }, (_, index) => {
    const date = addDays(isoToday(), index - 6);
    const items = db.pedidos.filter(order => orderDate(order) === date);
    return { date, value: sum(items, 'total') };
  });
  const ranking = Object.values(selectedOrders.reduce((acc, order) => {
    const key = order.produto_nome || 'Produto';
    acc[key] = acc[key] || { name: key, quantity: 0, value: 0 };
    acc[key].quantity += number(order.quantidade);
    acc[key].value += number(order.total);
    return acc;
  }, {})).sort((a, b) => b.quantity - a.quantity).slice(0, 5);

  return (
    <div className="page-stack">
      <PageHeader title="Visão geral" subtitle={`Indicadores consolidados para ${brDate(selectedDate)}.`} actions={<>{canManage && <button className="btn btn-secondary" onClick={() => setModal({ type: 'routes' })}>Gerenciar rotas</button>}<button className="btn btn-primary" onClick={() => setModal({ type: 'order-cart' })}>+ Novo pedido</button></>} />
      <div className="metric-grid metric-grid-large">
        <MetricCard label="Receita do dia" value={money(metrics.todayRevenue)} icon="R$" trend="Atualizado agora" tone="green" />
        <MetricCard label="Receita da semana" value={money(metrics.weekRevenue)} icon="↗" trend="Segunda a domingo" tone="gold" />
        <MetricCard label="Pedidos pendentes" value={metrics.pending} icon="◷" trend={`${metrics.delivered} entregues`} tone="orange" />
        <MetricCard label="Clientes" value={metrics.clients} icon="◎" trend="Base cadastrada" tone="blue" />
      </div>
      <div className="metric-grid metric-grid-compact">
        <MiniMetric label="Queijo 1kg" value={metrics.cheese1} /><MiniMetric label="Queijo 500g" value={metrics.cheese500} /><MiniMetric label="Leite" value={metrics.milk} /><MiniMetric label="Entregas do dia" value={metrics.deliveries} /><MiniMetric label="Caixa" value={money(metrics.cash)} /><MiniMetric label="Lucro operacional" value={money(metrics.profit)} />
      </div>
      <div className="dashboard-grid">
        <Panel className="chart-panel" title="Receita dos últimos 7 dias" action={<button className="link-btn" onClick={() => selectTab('relatorios')}>Ver relatórios</button>}><BarChart data={chart} /></Panel>
        <Panel title="Ranking dos produtos"><RankingList items={ranking} /></Panel>
      </div>
      <div className="dashboard-grid">
        <Panel title="Últimos pedidos" action={<button className="link-btn" onClick={() => selectTab('pedidos')}>Ver todos</button>}><CompactOrderList orders={lastOrders} /></Panel>
        <Panel title="Próximas entregas" action={<button className="link-btn" onClick={() => selectTab('entregas')}>Abrir entregas</button>}><UpcomingList orders={upcoming} /></Panel>
      </div>
    </div>
  );
}

function ClientsPage({ db, query, setQuery, setModal, deleteEntity, getClientPhoto, saveClientPhoto, canDelete }) {
  const [district, setDistrict] = useState('todos');
  const districts = [...new Set(db.clientes.map(client => client.bairro).filter(Boolean))].sort();
  const filtered = db.clientes.filter(client => {
    const matches = !query || normalize(JSON.stringify(client)).includes(normalize(query));
    return matches && (district === 'todos' || client.bairro === district);
  });
  return (
    <div className="page-stack">
      <PageHeader title="Clientes" subtitle={`${db.clientes.length} clientes cadastrados sem alteração na estrutura do banco.`} actions={<button className="btn btn-primary" onClick={() => setModal({ type: 'entity', entity: 'clientes' })}>+ Novo cliente</button>} />
      <Toolbar><SearchInput value={query} onChange={setQuery} placeholder="Buscar por nome, telefone, bairro..." /><select value={district} onChange={event => setDistrict(event.target.value)}><option value="todos">Todos os bairros</option>{districts.map(item => <option key={item}>{item}</option>)}</select><span className="result-count">{filtered.length} resultado(s)</span></Toolbar>
      <DataTable columns={['Cliente', 'Telefone', 'Bairro', 'Endereço', 'Observações', 'Ações']} rows={filtered.map(client => [
        <ClientCell key={client.id} client={client} photo={getClientPhoto(client)} savePhoto={saveClientPhoto} />,
        formatPhone(client.telefone),
        client.bairro || '—',
        addressOf(client) || '—',
        client.observacoes || '—',
        <TableActions key={`a-${client.id}`}><button onClick={() => setModal({ type: 'client-history', client })}>Histórico</button><button onClick={() => setModal({ type: 'entity', entity: 'clientes', item: client })}>Editar</button>{canDelete && <button className="danger-link" onClick={() => deleteEntity('clientes', client.id, client.nome)}>Excluir</button>}</TableActions>,
      ])} empty="Nenhum cliente encontrado." />
    </div>
  );
}

function ProductsPage({ db, query, setQuery, setModal, deleteEntity }) {
  const filtered = db.produtos.filter(product => !query || normalize(JSON.stringify(product)).includes(normalize(query)));
  return (
    <div className="page-stack">
      <PageHeader title="Produtos" subtitle="Catálogo, preços e disponibilidade dos produtos." actions={<button className="btn btn-primary" onClick={() => setModal({ type: 'entity', entity: 'produtos' })}>+ Novo produto</button>} />
      <Toolbar><SearchInput value={query} onChange={setQuery} placeholder="Buscar produto..." /><span className="result-count">{filtered.length} produto(s)</span></Toolbar>
      <div className="product-grid">{filtered.map(product => <article className="product-card" key={product.id}><div className="product-art"><Icon name="pedidos" /><span className={`badge ${product.ativo ? 'success' : 'neutral'}`}>{product.ativo ? 'Ativo' : 'Inativo'}</span></div><div className="product-content"><span>{product.unidade || 'Unidade'}</span><h3>{product.nome}</h3><strong>{money(product.preco)}</strong><div className="product-actions"><button onClick={() => setModal({ type: 'entity', entity: 'produtos', item: product })}>Editar</button><button className="danger-link" onClick={() => deleteEntity('produtos', product.id, product.nome)}>Excluir</button></div></div></article>)}</div>
      {!filtered.length && <EmptyState title="Nenhum produto encontrado" text="Cadastre um produto ou ajuste a pesquisa." />}
    </div>
  );
}

function OrdersPage({ db, query, setQuery, selectedOrders, selectedDate, setModal, deleteEntity, updateOrder, routes, canDelete }) {
  const [status, setStatus] = useState('todos');
  const filtered = selectedOrders.filter(order => (!query || normalize(JSON.stringify(order)).includes(normalize(query))) && (status === 'todos' || normalize(order.status_pedido) === normalize(status)));
  return (
    <div className="page-stack">
      <PageHeader title="Pedidos" subtitle={`Pedidos com entrega em ${brDate(selectedDate)}.`} actions={<><button className="btn btn-secondary" onClick={() => printOrderList(filtered, selectedDate)}>Imprimir</button><button className="btn btn-primary" onClick={() => setModal({ type: 'order-cart' })}>+ Novo pedido</button></>} />
      <Toolbar><SearchInput value={query} onChange={setQuery} placeholder="Buscar pedido, cliente ou produto..." /><select value={status} onChange={event => setStatus(event.target.value)}><option value="todos">Todos os status</option><option>Separado</option><option>Em rota</option><option>Entregue</option></select><span className="result-count">{filtered.length} item(ns)</span></Toolbar>
      <DataTable columns={['Pedido', 'Cliente', 'Produto', 'Qtd.', 'Total', 'Rota', 'Pagamento', 'Status', 'Ações']} rows={filtered.map(order => [
        <strong key={order.id}>{order.codigo || '—'}</strong>,
        <div key={`c-${order.id}`}><strong>{order.cliente_nome || '—'}</strong><small>{formatPhone(order.cliente_telefone)}</small></div>,
        order.produto_nome || '—',
        order.quantidade || 0,
        money(order.total),
        routeOf(order, routes),
        <Status key={`p-${order.id}`} value={order.status_pagamento} />,
        <Status key={`s-${order.id}`} value={order.status_pedido} />,
        <TableActions key={`a-${order.id}`}><button onClick={() => updateOrder(order.id, { status_pagamento: 'Pago' }, 'Pagamento confirmado')}>Pago</button><button onClick={() => setModal({ type: 'entity', entity: 'pedidos', item: order })}>Editar</button><button onClick={() => printReceipt(order, db.pedidos)}>PDF</button>{canDelete && <button className="danger-link" onClick={() => deleteEntity('pedidos', order.id, order.codigo)}>Excluir</button>}</TableActions>,
      ])} empty="Nenhum pedido nesta data." />
    </div>
  );
}

function DeliveriesPage({ selectedOrders, selectedDate, query, setQuery, routes, updateOrder, setModal, canManage }) {
  const [selected, setSelected] = useState(null);
  const visible = selectedOrders.filter(order => !query || normalize(JSON.stringify(order)).includes(normalize(query)));
  const pending = visible.filter(order => normalize(order.status_pedido) !== 'entregue');
  const groups = routes.map(route => ({ route, orders: pending.filter(order => routeOf(order, routes) === route) })).filter(group => group.orders.length);
  const active = selected || pending[0];
  const mapUrl = active?.endereco ? `https://www.google.com/maps?q=${encodeURIComponent(active.endereco)}&output=embed` : '';
  return (
    <div className="page-stack">
      <PageHeader title="Entregas" subtitle={`Roteiro operacional de ${brDate(selectedDate)}.`} actions={<>{canManage && <button className="btn btn-secondary" onClick={() => setModal({ type: 'routes' })}>Rotas</button>}<button className="btn btn-primary" onClick={() => printDeliveryList(pending, selectedDate, routes)}>Imprimir roteiro</button></>} />
      <div className="delivery-summary"><MiniMetric label="Pendentes" value={pending.length} /><MiniMetric label="Valor em rota" value={money(sum(pending, 'total'))} /><MiniMetric label="Quantidade" value={sum(pending, 'quantidade')} /><SearchInput value={query} onChange={setQuery} placeholder="Buscar cliente ou endereço..." /></div>
      <div className="deliveries-layout">
        <section className="route-list">{groups.map(group => <Panel key={group.route} className="route-panel" title={group.route} action={<span className="route-count">{group.orders.length} entrega(s)</span>}>{group.orders.map((order, index) => <article className={`delivery-item ${active?.id === order.id ? 'selected' : ''}`} key={order.id} onClick={() => setSelected(order)}><div className="delivery-index">{index + 1}</div><div className="delivery-client"><strong>{order.cliente_nome}</strong><span>{order.endereco || 'Endereço não informado'}</span><small>{order.produto_nome} · {order.quantidade} un.</small></div><div className="delivery-value"><strong>{money(order.total)}</strong><Status value={order.status_pedido} /></div><div className="delivery-actions"><button onClick={event => { event.stopPropagation(); updateOrder(order.id, { status_pedido: 'Em rota' }, 'Pedido saiu para entrega'); }}>Em rota</button><button className="primary-link" onClick={event => { event.stopPropagation(); updateOrder(order.id, { status_pedido: 'Entregue' }, 'Pedido entregue'); }}>Entregue</button></div></article>)}</Panel>)}{!groups.length && <EmptyState title="Nenhuma entrega pendente" text="Todos os pedidos desta data já foram entregues." />}</section>
        <aside className="map-panel panel"><div className="panel-heading"><div><span className="eyebrow">Mapa</span><h3>{active?.cliente_nome || 'Selecione uma entrega'}</h3><p>{active?.endereco || 'O endereço aparecerá aqui.'}</p></div></div>{mapUrl ? <iframe title="Mapa da entrega" src={mapUrl} loading="lazy" referrerPolicy="no-referrer-when-downgrade" /> : <div className="map-empty">Mapa indisponível.</div>}{active && <a className="btn btn-secondary map-link" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(active.endereco || '')}`} target="_blank" rel="noreferrer">Abrir rota no mapa</a>}</aside>
      </div>
    </div>
  );
}

function CashPage({ db, selectedDate, cashOuts, setModal, deleteCashOut }) {
  const orders = db.pedidos.filter(order => orderDate(order) === selectedDate);
  const paid = orders.filter(order => normalize(order.status_pagamento).includes('pago'));
  const pending = orders.filter(order => !normalize(order.status_pagamento).includes('pago'));
  const outputs = cashOuts.filter(item => item.data === selectedDate);
  const entries = sum(paid, 'total');
  const receivable = sum(pending, 'total');
  const expenses = sum(outputs, 'valor');
  const balance = entries - expenses;
  const flow = Array.from({ length: 7 }, (_, index) => {
    const date = addDays(selectedDate, index - 6);
    const dayOrders = db.pedidos.filter(order => orderDate(order) === date && normalize(order.status_pagamento).includes('pago'));
    const dayOuts = cashOuts.filter(item => item.data === date);
    return { date, value: sum(dayOrders, 'total') - sum(dayOuts, 'valor') };
  });
  const rows = [
    ...paid.map(order => ({ id: order.id, date: orderDate(order), description: `${order.cliente_nome} · ${order.produto_nome}`, type: 'Entrada', value: number(order.total), status: 'Recebido' })),
    ...pending.map(order => ({ id: `pending-${order.id}`, date: orderDate(order), description: `${order.cliente_nome} · ${order.produto_nome}`, type: 'A receber', value: number(order.total), status: 'Pendente' })),
    ...outputs.map(item => ({ id: item.id, date: item.data, description: item.descricao, type: 'Saída', value: -number(item.valor), status: 'Despesa', removable: true })),
  ];
  return (
    <div className="page-stack">
      <PageHeader title="Caixa" subtitle={`Movimentação financeira de ${brDate(selectedDate)}.`} actions={<button className="btn btn-primary" onClick={() => setModal({ type: 'cash-out' })}>+ Lançar saída</button>} />
      <div className="metric-grid"><MetricCard label="Entradas" value={money(entries)} icon="↗" tone="green" /><MetricCard label="A receber" value={money(receivable)} icon="◷" tone="gold" /><MetricCard label="Saídas" value={money(expenses)} icon="↘" tone="orange" /><MetricCard label="Saldo" value={money(balance)} icon="R$" tone={balance >= 0 ? 'blue' : 'orange'} /></div>
      <Panel title="Fluxo dos últimos 7 dias"><BarChart data={flow} allowNegative /></Panel>
      <Panel title="Movimentações"><DataTable compact columns={['Data', 'Descrição', 'Tipo', 'Valor', 'Status', 'Ações']} rows={rows.map(row => [brDate(row.date), row.description, row.type, <strong className={row.value < 0 ? 'negative' : 'positive'}>{money(row.value)}</strong>, <Status value={row.status} />, row.removable ? <button className="danger-link" onClick={() => deleteCashOut(row.id)}>Excluir</button> : '—'])} empty="Nenhuma movimentação." /></Panel>
    </div>
  );
}

function ReportsPage({ db, selectedOrders, selectedDate, routes }) {
  const production = selectedOrders.filter(order => normalize(order.status_pedido) !== 'entregue');
  const ranking = Object.values(selectedOrders.reduce((acc, order) => {
    const key = order.produto_nome || 'Produto';
    acc[key] = acc[key] || { name: key, quantity: 0, value: 0 };
    acc[key].quantity += number(order.quantidade);
    acc[key].value += number(order.total);
    return acc;
  }, {})).sort((a, b) => b.value - a.value);
  const routeSummary = routes.map(route => {
    const orders = selectedOrders.filter(order => routeOf(order, routes) === route);
    return { route, orders: orders.length, quantity: sum(orders, 'quantidade'), value: sum(orders, 'total') };
  }).filter(item => item.orders);
  return (
    <div className="page-stack reports-print-area">
      <PageHeader title="Relatórios" subtitle={`Análises operacionais de ${brDate(selectedDate)}.`} actions={<><button className="btn btn-secondary" onClick={() => exportCsv(selectedOrders, selectedDate)}>Exportar CSV</button><button className="btn btn-primary" onClick={() => window.print()}>Salvar PDF</button></>} />
      <div className="metric-grid"><MetricCard label="Faturamento" value={money(sum(selectedOrders, 'total'))} icon="R$" tone="green" /><MetricCard label="Pedidos" value={selectedOrders.length} icon="#" tone="blue" /><MetricCard label="Produção pendente" value={sum(production, 'quantidade')} icon="◷" tone="orange" /><MetricCard label="Clientes atendidos" value={new Set(selectedOrders.map(order => order.cliente_id || order.cliente_nome)).size} icon="◎" tone="gold" /></div>
      <div className="dashboard-grid"><Panel title="Ranking de produtos"><DataTable compact columns={['Produto', 'Quantidade', 'Faturamento']} rows={ranking.map(item => [item.name, item.quantity, money(item.value)])} empty="Sem dados." /></Panel><Panel title="Resumo por rota"><DataTable compact columns={['Rota', 'Pedidos', 'Qtd.', 'Valor']} rows={routeSummary.map(item => [item.route, item.orders, item.quantity, money(item.value)])} empty="Sem rotas com pedidos." /></Panel></div>
      <Panel title="Relatório de produção">{routes.map(route => {
        const orders = production.filter(order => routeOf(order, routes) === route);
        if (!orders.length) return null;
        return <div className="production-group" key={route}><div className="production-title"><strong>{route}</strong><span>{sum(orders, 'quantidade')} unidade(s)</span></div><DataTable compact columns={['Cliente', 'Produto', 'Qtd.', 'Local', 'Observações']} rows={orders.map(order => [order.cliente_nome, order.produto_nome, order.quantidade, order.endereco || '—', order.observacoes || '—'])} /></div>;
      })}{!production.length && <EmptyState title="Nada para produzir" text="Não há pedidos pendentes nesta data." />}</Panel>
    </div>
  );
}

function AdminPage({ db, logs, setModal, deleteEntity, admin }) {
  const roles = [
    { role: 'ADM Geral', description: 'Acesso total ao sistema, usuários, caixa e relatórios.' },
    { role: 'Colaborador', description: 'Pode cadastrar e editar clientes e pedidos, além de acompanhar entregas. Sem acesso ao caixa ou à administração.' },
  ];
  return (
    <div className="page-stack">
      <PageHeader title="Administração" subtitle="Usuários, permissões e trilha de atividades." actions={<button className="btn btn-primary" onClick={() => setModal({ type: 'entity', entity: 'admins' })}>+ Novo usuário</button>} />
      <div className="admin-grid"><Panel title="Usuários"><DataTable compact columns={['Usuário', 'Telefone', 'Papel', 'Status', 'Ações']} rows={db.admins.map(user => [<div><strong>{user.nome}</strong><small>{user.id === admin.id ? 'Sessão atual' : ''}</small></div>, formatPhone(user.telefone), user.papel || 'Colaborador', <Status value={user.ativo ? 'Ativo' : 'Inativo'} />, <TableActions><button onClick={() => setModal({ type: 'entity', entity: 'admins', item: user })}>Editar</button><button className="danger-link" disabled={user.id === admin.id} onClick={() => deleteEntity('admins', user.id, user.nome)}>Excluir</button></TableActions>])} /></Panel><Panel title="Permissões">{roles.map(item => <div className="permission-row" key={item.role}><div className="permission-icon">✓</div><div><strong>{item.role}</strong><p>{item.description}</p></div></div>)}</Panel></div>
      <Panel title="Logs locais"><DataTable compact columns={['Data', 'Usuário', 'Ação', 'Detalhes']} rows={logs.slice(0, 100).map(log => [new Date(log.date).toLocaleString('pt-BR'), log.user, log.action, log.detail])} empty="Nenhuma atividade registrada neste dispositivo." /></Panel>
    </div>
  );
}

function DocumentsPage({ db, selectedOrders, selectedDate, routes }) {
  return (
    <div className="page-stack">
      <PageHeader title="PDFs e comprovantes" subtitle="Central de impressão e geração de documentos." />
      <div className="document-grid">
        <DocumentCard icon="pdf" title="Relatório completo" text="Indicadores, ranking, rotas e produção." action="Gerar PDF" onClick={() => window.print()} />
        <DocumentCard icon="pedidos" title="Lista de pedidos" text={`Pedidos de ${brDate(selectedDate)}.`} action="Imprimir lista" onClick={() => printOrderList(selectedOrders, selectedDate)} />
        <DocumentCard icon="entregas" title="Roteiro de entregas" text="Sequência por rota, cliente e endereço." action="Imprimir roteiro" onClick={() => printDeliveryList(selectedOrders, selectedDate, routes)} />
      </div>
      <Panel title="Comprovantes por pedido"><DataTable compact columns={['Pedido', 'Cliente', 'Produto', 'Valor', 'Ação']} rows={selectedOrders.map(order => [order.codigo, order.cliente_nome, order.produto_nome, money(order.total), <button className="primary-link" onClick={() => printReceipt(order, db.pedidos)}>Gerar comprovante</button>])} empty="Nenhum pedido nesta data." /></Panel>
    </div>
  );
}

function ModalRouter({ modal, close, db, routes, selectedDate, saveEntity, createCartOrder, saveRoutes, saveCashOut }) {
  if (modal.type === 'entity') return <EntityForm modal={modal} close={close} db={db} routes={routes} selectedDate={selectedDate} save={saveEntity} />;
  if (modal.type === 'order-cart') return <OrderCart close={close} db={db} routes={routes} selectedDate={selectedDate} save={createCartOrder} />;
  if (modal.type === 'routes') return <RoutesForm close={close} routes={routes} save={saveRoutes} />;
  if (modal.type === 'cash-out') return <CashOutForm close={close} selectedDate={selectedDate} save={saveCashOut} />;
  if (modal.type === 'client-history') return <ClientHistory close={close} client={modal.client} orders={db.pedidos} />;
  return null;
}

function EntityForm({ modal, close, db, routes, selectedDate, save }) {
  const { entity, item = {} } = modal;
  const [form, setForm] = useState({ ...item, rota: item.rota || item.tipo_entrega || routes[0], ativo: item.ativo !== false });
  const set = (key, value) => setForm(current => ({ ...current, [key]: value }));
  const title = { clientes: 'cliente', produtos: 'produto', pedidos: 'item do pedido', admins: 'usuário' }[entity];
  function submit(event) {
    event.preventDefault();
    if (entity === 'clientes') return save(entity, { id: form.id, nome: form.nome, telefone: onlyDigits(form.telefone), bairro: form.bairro, rua: form.rua, numero: form.numero, cidade: form.cidade, estado: form.estado, observacoes: form.observacoes });
    if (entity === 'produtos') return save(entity, { id: form.id, nome: form.nome, unidade: form.unidade, preco: number(form.preco), ativo: form.ativo !== false });
    if (entity === 'admins') return save(entity, { id: form.id, nome: form.nome, telefone: onlyDigits(form.telefone), pin: String(form.pin || '1234'), papel: form.papel || 'Colaborador', ativo: form.ativo !== false });
    const client = db.clientes.find(entry => String(entry.id) === String(form.cliente_id)) || {};
    const product = db.produtos.find(entry => String(entry.id) === String(form.produto_id)) || {};
    const quantity = number(form.quantidade || 1);
    const unit = number(form.preco_unitario || product.preco);
    return save(entity, { id: form.id, codigo: form.codigo || nextOrderCode(), cliente_id: client.id || form.cliente_id, cliente_nome: client.nome || form.cliente_nome, cliente_telefone: client.telefone || form.cliente_telefone || '', produto_id: product.id || form.produto_id, produto_nome: product.nome || form.produto_nome, quantidade: quantity, preco_unitario: unit, total: number(form.total || quantity * unit), rota: form.rota, tipo_entrega: form.rota, endereco: form.endereco || addressOf(client), forma_pagamento: form.forma_pagamento || 'Pix', status_pagamento: form.status_pagamento || 'Pendente', status_pedido: form.status_pedido || 'Separado', data_entrega: form.data_entrega || selectedDate, observacoes: form.observacoes || '' });
  }
  return (
    <Modal title={`${item.id ? 'Editar' : 'Novo'} ${title}`} close={close}><form className="form-grid" onSubmit={submit}>
      {entity === 'clientes' && <><div className="form-note full"><strong>Cadastro sem disparo:</strong> ao salvar, o cliente será apenas cadastrado. Nenhuma mensagem será enviada pelo WhatsApp.</div><Field label="Nome" required value={form.nome} onChange={value => set('nome', value)} /><Field label="Telefone" value={form.telefone} onChange={value => set('telefone', value)} /><Field label="Bairro" value={form.bairro} onChange={value => set('bairro', value)} /><Field label="Rua" value={form.rua} onChange={value => set('rua', value)} /><Field label="Número" value={form.numero} onChange={value => set('numero', value)} /><Field label="Cidade" value={form.cidade} onChange={value => set('cidade', value)} /><Field label="Estado" value={form.estado} onChange={value => set('estado', value)} /><Field className="full" label="Observações" value={form.observacoes} onChange={value => set('observacoes', value)} /></>}
      {entity === 'produtos' && <><Field label="Produto" required value={form.nome} onChange={value => set('nome', value)} /><Field label="Unidade" value={form.unidade} onChange={value => set('unidade', value)} /><Field label="Preço" type="number" step="0.01" value={form.preco} onChange={value => set('preco', value)} /><ToggleField label="Produto ativo" checked={form.ativo} onChange={value => set('ativo', value)} /></>}
      {entity === 'admins' && <><Field label="Nome" required value={form.nome} onChange={value => set('nome', value)} /><Field label="Telefone" required value={form.telefone} onChange={value => set('telefone', value)} /><Field label="PIN" required value={form.pin || ''} onChange={value => set('pin', value)} /><SelectField label="Papel" value={form.papel || 'Colaborador'} onChange={value => set('papel', value)} options={['ADM Geral', 'Colaborador']} /><ToggleField label="Usuário ativo" checked={form.ativo} onChange={value => set('ativo', value)} /></>}
      {entity === 'pedidos' && <><SelectField label="Cliente" value={form.cliente_id || ''} onChange={value => set('cliente_id', value)} options={db.clientes.map(client => [client.id, client.nome])} /><SelectField label="Produto" value={form.produto_id || ''} onChange={value => { const product = db.produtos.find(entry => String(entry.id) === String(value)); setForm(current => ({ ...current, produto_id: value, preco_unitario: product?.preco || current.preco_unitario, total: number(product?.preco || current.preco_unitario) * number(current.quantidade || 1) })); }} options={db.produtos.map(product => [product.id, product.nome])} /><Field label="Quantidade" type="number" value={form.quantidade || 1} onChange={value => set('quantidade', value)} /><Field label="Valor total" type="number" step="0.01" value={form.total || ''} onChange={value => set('total', value)} /><SelectField label="Rota" value={form.rota || routes[0]} onChange={value => set('rota', value)} options={routes} /><Field label="Data de entrega" type="date" value={form.data_entrega || selectedDate} onChange={value => set('data_entrega', value)} /><SelectField label="Pagamento" value={form.status_pagamento || 'Pendente'} onChange={value => set('status_pagamento', value)} options={['Pendente', 'Pago']} /><SelectField label="Status" value={form.status_pedido || 'Separado'} onChange={value => set('status_pedido', value)} options={['Separado', 'Em rota', 'Entregue']} /><Field className="full" label="Endereço" value={form.endereco || ''} onChange={value => set('endereco', value)} /><Field className="full" label="Observações" value={form.observacoes || ''} onChange={value => set('observacoes', value)} /></>}
      <FormActions close={close} />
    </form></Modal>
  );
}

function OrderCart({ close, db, routes, selectedDate, save }) {
  const [form, setForm] = useState({ cliente_id: '', rota: routes[0], data_entrega: selectedDate, forma_pagamento: 'Pix', status_pagamento: 'Pendente', status_pedido: 'Separado', observacoes: '', items: [] });
  const [item, setItem] = useState({ produto_id: '', quantidade: 1 });
  const selectedProduct = db.produtos.find(product => String(product.id) === String(item.produto_id));
  const total = form.items.reduce((amount, entry) => amount + number(entry.quantidade) * number(entry.preco_unitario), 0);
  function addItem() {
    if (!selectedProduct || number(item.quantidade) <= 0) return;
    setForm(current => ({ ...current, items: [...current.items, { produto_id: selectedProduct.id, produto_nome: selectedProduct.nome, quantidade: number(item.quantidade), preco_unitario: number(selectedProduct.preco) }] }));
    setItem({ produto_id: '', quantidade: 1 });
  }
  function submit(event) {
    event.preventDefault();
    if (!form.cliente_id || !form.items.length) return;
    save(form);
  }
  return <Modal title="Novo pedido com carrinho" close={close} wide><form className="cart-form" onSubmit={submit}><div className="cart-main"><div className="form-grid"><SelectField label="Cliente" value={form.cliente_id} onChange={value => setForm(current => ({ ...current, cliente_id: value }))} options={db.clientes.map(client => [client.id, client.nome])} /><SelectField label="Rota" value={form.rota} onChange={value => setForm(current => ({ ...current, rota: value }))} options={routes} /><Field label="Data de entrega" type="date" value={form.data_entrega} onChange={value => setForm(current => ({ ...current, data_entrega: value }))} /><SelectField label="Forma de pagamento" value={form.forma_pagamento} onChange={value => setForm(current => ({ ...current, forma_pagamento: value }))} options={['Pix', 'Dinheiro', 'Cartão', 'Prazo']} /></div><div className="cart-builder"><SelectField label="Produto" value={item.produto_id} onChange={value => setItem(current => ({ ...current, produto_id: value }))} options={db.produtos.filter(product => product.ativo !== false).map(product => [product.id, `${product.nome} · ${money(product.preco)}`])} /><Field label="Quantidade" type="number" value={item.quantidade} onChange={value => setItem(current => ({ ...current, quantidade: value }))} /><button className="btn btn-secondary" type="button" onClick={addItem}>Adicionar</button></div><div className="cart-items">{form.items.map((entry, index) => <div key={`${entry.produto_id}-${index}`}><div><strong>{entry.produto_nome}</strong><span>{entry.quantidade} × {money(entry.preco_unitario)}</span></div><strong>{money(entry.quantidade * entry.preco_unitario)}</strong><button type="button" onClick={() => setForm(current => ({ ...current, items: current.items.filter((_, itemIndex) => itemIndex !== index) }))}>×</button></div>)}{!form.items.length && <div className="cart-empty">Adicione produtos ao carrinho.</div>}</div><Field className="full" label="Observações" value={form.observacoes} onChange={value => setForm(current => ({ ...current, observacoes: value }))} /></div><aside className="cart-summary"><span>Resumo do pedido</span><div><small>Itens</small><strong>{form.items.length}</strong></div><div><small>Quantidade</small><strong>{form.items.reduce((amount, entry) => amount + number(entry.quantidade), 0)}</strong></div><div className="cart-total"><small>Total</small><strong>{money(total)}</strong></div><button className="btn btn-primary btn-lg" type="submit" disabled={!form.cliente_id || !form.items.length}>Finalizar pedido</button><button className="btn btn-ghost" type="button" onClick={close}>Cancelar</button></aside></form></Modal>;
}

function RoutesForm({ close, routes, save }) {
  const [text, setText] = useState(routes.join('\n'));
  const parsed = text.split(/[\n,;]+/).map(item => item.trim()).filter(Boolean).filter((item, index, array) => array.indexOf(item) === index);
  return <Modal title="Gerenciar rotas" close={close}><div className="route-form"><p>Uma rota por linha. Alterações de nome são aplicadas também aos pedidos existentes.</p><textarea rows="9" value={text} onChange={event => setText(event.target.value)} /><div className="route-preview">{parsed.map(item => <span key={item}>{item}</span>)}</div><div className="form-actions"><button className="btn btn-ghost" onClick={close}>Cancelar</button><button className="btn btn-primary" onClick={() => save(parsed)}>Salvar rotas</button></div></div></Modal>;
}

function CashOutForm({ close, selectedDate, save }) {
  const [form, setForm] = useState({ data: selectedDate, descricao: '', valor: '' });
  return <Modal title="Lançar saída" close={close}><form className="form-grid" onSubmit={event => { event.preventDefault(); save({ ...form, valor: number(form.valor) }); }}><Field label="Data" type="date" value={form.data} onChange={value => setForm(current => ({ ...current, data: value }))} /><Field label="Valor" type="number" step="0.01" value={form.valor} onChange={value => setForm(current => ({ ...current, valor: value }))} /><Field className="full" label="Descrição" required value={form.descricao} onChange={value => setForm(current => ({ ...current, descricao: value }))} /><FormActions close={close} /></form></Modal>;
}

function ClientHistory({ close, client, orders }) {
  const history = orders.filter(order => String(order.cliente_id) === String(client.id) || normalize(order.cliente_nome) === normalize(client.nome)).sort((a, b) => orderDate(b).localeCompare(orderDate(a)));
  return <Modal title={`Histórico de ${client.nome}`} close={close} wide><div className="history-summary"><MiniMetric label="Pedidos" value={history.length} /><MiniMetric label="Quantidade" value={sum(history, 'quantidade')} /><MiniMetric label="Total comprado" value={money(sum(history, 'total'))} /></div><DataTable compact columns={['Data', 'Pedido', 'Produto', 'Qtd.', 'Valor', 'Status']} rows={history.map(order => [brDate(order.data_entrega), order.codigo, order.produto_nome, order.quantidade, money(order.total), <Status value={order.status_pedido} />])} empty="Este cliente ainda não possui pedidos." /></Modal>;
}

function PageHeader({ title, subtitle, actions }) { return <div className="page-header"><div><h2>{title}</h2><p>{subtitle}</p></div>{actions && <div className="page-actions">{actions}</div>}</div>; }
function Panel({ title, action, children, className = '' }) { return <section className={`panel ${className}`}><div className="panel-heading"><div><h3>{title}</h3></div>{action}</div><div className="panel-body">{children}</div></section>; }
function MetricCard({ label, value, icon, trend, tone = 'green' }) { return <article className={`metric-card tone-${tone}`}><div className="metric-icon">{icon}</div><div><span>{label}</span><strong>{value}</strong>{trend && <small>{trend}</small>}</div></article>; }
function MiniMetric({ label, value }) { return <article className="mini-metric"><span>{label}</span><strong>{value}</strong></article>; }
function Alert({ tone, children, onClose }) { return <div className={`alert alert-${tone}`}><span>{children}</span>{onClose && <button onClick={onClose}>×</button>}</div>; }
function Spinner() { return <span className="spinner" />; }
function Status({ value }) { return <span className={`badge ${statusTone(value)}`}>{value || '—'}</span>; }
function Toolbar({ children }) { return <div className="toolbar">{children}</div>; }
function SearchInput({ value, onChange, placeholder }) { return <div className="search-input"><span>⌕</span><input value={value} placeholder={placeholder} onChange={event => onChange(event.target.value)} /></div>; }
function TableActions({ children }) { return <div className="table-actions">{children}</div>; }
function EmptyState({ title, text }) { return <div className="empty-state"><div>○</div><h3>{title}</h3><p>{text}</p></div>; }

function DataTable({ columns, rows = [], empty = 'Nenhum registro.', compact = false }) {
  return <div className={`data-table-wrap ${compact ? 'compact' : ''}`}><table><thead><tr>{columns.map(column => <th key={column}>{column}</th>)}</tr></thead><tbody>{rows.length ? rows.map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>) : <tr><td className="table-empty" colSpan={columns.length}>{empty}</td></tr>}</tbody></table></div>;
}

function ClientCell({ client, photo, savePhoto }) {
  const inputRef = useRef(null);
  async function upload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const dataUrl = await resizeImage(file);
    savePhoto(client, dataUrl);
  }
  return <div className="client-cell"><button className="client-avatar" onClick={() => inputRef.current?.click()}>{photo ? <img src={photo} alt={client.nome} /> : <span>{initials(client.nome)}</span>}</button><div><strong>{client.nome || 'Sem nome'}</strong><small>Clique na foto para alterar</small></div><input ref={inputRef} type="file" accept="image/*" hidden onChange={upload} /></div>;
}

function Field({ label, value, onChange, type = 'text', required = false, className = '', step }) { return <label className={`field ${className}`}><span>{label}</span><input required={required} type={type} step={step} value={value ?? ''} onChange={event => onChange(event.target.value)} /></label>; }
function SelectField({ label, value, onChange, options }) { const normalized = options.map(item => Array.isArray(item) ? item : [item, item]); return <label className="field"><span>{label}</span><select value={value ?? ''} onChange={event => onChange(event.target.value)}><option value="">Selecione</option>{normalized.map(([optionValue, optionLabel]) => <option key={String(optionValue)} value={optionValue}>{optionLabel}</option>)}</select></label>; }
function ToggleField({ label, checked, onChange }) { return <label className="toggle-field"><span>{label}</span><input type="checkbox" checked={Boolean(checked)} onChange={event => onChange(event.target.checked)} /><i /></label>; }
function FormActions({ close }) { return <div className="form-actions"><button className="btn btn-ghost" type="button" onClick={close}>Cancelar</button><button className="btn btn-primary" type="submit">Salvar</button></div>; }
function Modal({ title, close, children, wide = false }) { return <div className="modal-backdrop" onMouseDown={event => event.target === event.currentTarget && close()}><section className={`modal-card ${wide ? 'wide' : ''}`}><header><h2>{title}</h2><button type="button" onClick={close}>×</button></header><div className="modal-content">{children}</div></section></div>; }

function BarChart({ data, allowNegative = false }) {
  const max = Math.max(...data.map(item => Math.abs(item.value)), 1);
  return <div className={`bar-chart ${allowNegative ? 'allow-negative' : ''}`}>{data.map(item => <div className="bar-column" key={item.date}><div className="bar-value">{money(item.value)}</div><div className="bar-track"><div className={`bar ${item.value < 0 ? 'negative-bar' : ''}`} style={{ height: `${Math.max(Math.abs(item.value) / max * 100, item.value ? 8 : 2)}%` }} /></div><span>{dateValue(item.date).toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}</span></div>)}</div>;
}
function RankingList({ items }) { const max = Math.max(...items.map(item => item.quantity), 1); return <div className="ranking-list">{items.length ? items.map((item, index) => <div className="ranking-item" key={item.name}><span className="rank">{index + 1}</span><div><div><strong>{item.name}</strong><span>{item.quantity} un.</span></div><div className="progress"><i style={{ width: `${item.quantity / max * 100}%` }} /></div></div></div>) : <EmptyState title="Sem dados" text="Nenhum produto vendido na data." />}</div>; }
function CompactOrderList({ orders }) { return <div className="compact-list">{orders.length ? orders.map(order => <div key={order.id}><span className="compact-icon"><Icon name="pedidos" /></span><div><strong>{order.cliente_nome || 'Cliente'}</strong><span>{order.produto_nome} · {brDate(order.data_entrega)}</span></div><div><strong>{money(order.total)}</strong><Status value={order.status_pedido} /></div></div>) : <EmptyState title="Sem pedidos" text="Nenhum pedido recente." />}</div>; }
function UpcomingList({ orders }) { return <div className="upcoming-list">{orders.length ? orders.map(order => <div key={order.id}><div className="date-chip"><strong>{String(order.data_entrega).slice(8, 10)}</strong><span>{dateValue(order.data_entrega).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}</span></div><div><strong>{order.cliente_nome}</strong><span>{order.endereco || routeOf(order, DEFAULT_ROUTES)}</span></div><strong>{money(order.total)}</strong></div>) : <EmptyState title="Agenda livre" text="Nenhuma próxima entrega." />}</div>; }
function DocumentCard({ icon, title, text, action, onClick }) { return <article className="document-card"><div className="document-icon"><Icon name={icon} /></div><h3>{title}</h3><p>{text}</p><button className="btn btn-secondary" onClick={onClick}>{action}</button></article>; }

function resizeImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    const image = new Image();
    reader.onerror = reject;
    image.onerror = reject;
    reader.onload = () => { image.src = reader.result; };
    image.onload = () => {
      const max = 420;
      const scale = Math.min(1, max / Math.max(image.width, image.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(image.width * scale);
      canvas.height = Math.round(image.height * scale);
      canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.78));
    };
    reader.readAsDataURL(file);
  });
}

function printWindow(title, body) {
  const popup = window.open('', '_blank', 'width=1000,height=800');
  if (!popup) return;
  popup.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><style>body{font-family:Arial,sans-serif;color:#173824;padding:28px}header{display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid #1f6b3b;padding-bottom:14px;margin-bottom:22px}header img{height:74px}h1{font-size:22px;margin:0}table{width:100%;border-collapse:collapse;font-size:12px}th,td{padding:9px;border-bottom:1px solid #ddd;text-align:left}th{background:#edf5ef}.total{font-size:18px;font-weight:bold;text-align:right;margin-top:20px}.badge{display:inline-block;padding:4px 8px;border-radius:10px;background:#edf5ef}@media print{button{display:none}}</style></head><body><header><img src="${LOGO}"/><div><h1>${title}</h1><small>Queijos WR · ${new Date().toLocaleString('pt-BR')}</small></div></header>${body}<script>window.onload=()=>setTimeout(()=>window.print(),300)<\/script></body></html>`);
  popup.document.close();
}
function printReceipt(order, allOrders = []) {
  const group = allOrders.filter(item => order.codigo && item.codigo === order.codigo);
  const items = group.length ? group : [order];
  const rows = items.map(item => `<tr><td>${item.produto_nome || ''}</td><td>${item.quantidade || 0}</td><td>${money(item.preco_unitario)}</td><td>${money(item.total)}</td></tr>`).join('');
  printWindow(`Comprovante ${order.codigo || ''}`, `<p><strong>Cliente:</strong> ${order.cliente_nome || ''}</p><p><strong>Entrega:</strong> ${brDate(order.data_entrega)} · ${order.endereco || ''}</p><table><thead><tr><th>Produto</th><th>Qtd.</th><th>Unitário</th><th>Total</th></tr></thead><tbody>${rows}</tbody></table><div class="total">Total: ${money(sum(items, 'total'))}</div><p><strong>Pagamento:</strong> ${order.forma_pagamento || ''} · ${order.status_pagamento || ''}</p>`);
}
function printOrderList(orders, date) {
  const rows = orders.map(order => `<tr><td>${order.codigo || ''}</td><td>${order.cliente_nome || ''}</td><td>${order.produto_nome || ''}</td><td>${order.quantidade || 0}</td><td>${money(order.total)}</td><td>${order.status_pedido || ''}</td></tr>`).join('');
  printWindow(`Pedidos de ${brDate(date)}`, `<table><thead><tr><th>Pedido</th><th>Cliente</th><th>Produto</th><th>Qtd.</th><th>Total</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table><div class="total">Total: ${money(sum(orders, 'total'))}</div>`);
}
function printDeliveryList(orders, date, routes) {
  const sections = routes.map(route => {
    const group = orders.filter(order => routeOf(order, routes) === route && normalize(order.status_pedido) !== 'entregue');
    if (!group.length) return '';
    return `<h2>${route}</h2><table><thead><tr><th>#</th><th>Cliente</th><th>Endereço</th><th>Produto</th><th>Qtd.</th><th>Valor</th></tr></thead><tbody>${group.map((order, index) => `<tr><td>${index + 1}</td><td>${order.cliente_nome || ''}</td><td>${order.endereco || ''}</td><td>${order.produto_nome || ''}</td><td>${order.quantidade || 0}</td><td>${money(order.total)}</td></tr>`).join('')}</tbody></table>`;
  }).join('');
  printWindow(`Roteiro de entregas · ${brDate(date)}`, sections || '<p>Nenhuma entrega pendente.</p>');
}
function exportCsv(orders, date) {
  const headers = ['Pedido', 'Cliente', 'Produto', 'Quantidade', 'Valor', 'Rota', 'Pagamento', 'Status', 'Entrega'];
  const rows = orders.map(order => [order.codigo, order.cliente_nome, order.produto_nome, order.quantidade, order.total, order.rota || order.tipo_entrega, order.status_pagamento, order.status_pedido, order.data_entrega]);
  const content = [headers, ...rows].map(row => row.map(value => `"${String(value ?? '').replace(/"/g, '""')}"`).join(';')).join('\n');
  const blob = new Blob([`\ufeff${content}`], { type: 'text/csv;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `relatorio-queijos-wr-${date}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

createRoot(document.getElementById('root')).render(<App />);
