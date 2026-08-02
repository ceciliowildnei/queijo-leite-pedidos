from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]


def read(path):
    return (ROOT / path).read_text(encoding="utf-8")


def write(path, content):
    target = ROOT / path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content, encoding="utf-8")


def replace_once(text, old, new, label):
    if old not in text:
        raise RuntimeError(f"Trecho não encontrado: {label}")
    return text.replace(old, new, 1)


def replace_regex(text, pattern, replacement, label, flags=0):
    updated, count = re.subn(pattern, replacement, text, count=1, flags=flags)
    if count != 1:
        raise RuntimeError(f"Substituição inválida ({count}): {label}")
    return updated


main_path = "src/main.jsx"
main = read(main_path)
main = replace_once(main, "const VERSION = '2.0.0';", "const VERSION = '2.1.0';", "versão web")

old_status = """const statusTone = value => {
  const text = normalize(value);
  if (text.includes('entregue') || text.includes('pago') || text.includes('ativo')) return 'success';
  if (text.includes('rota') || text.includes('separado')) return 'info';
  if (text.includes('pendente') || text.includes('aguard')) return 'warning';
  return 'neutral';
};"""
new_status = """const statusTone = value => {
  const text = normalize(value);
  if (text.includes('cancel')) return 'danger';
  if (text.includes('entregue') || text.includes('pago') || text === 'ativo') return 'success';
  if (text.includes('rota') || text.includes('separado')) return 'info';
  if (text.includes('pendente') || text.includes('aguard')) return 'warning';
  return 'neutral';
};
const isCanceled = order => normalize(order?.status_pedido).includes('cancel');
const whatsappNumber = value => {
  const digits = onlyDigits(value);
  if (!digits) return '';
  return digits.startsWith('55') ? digits : `55${digits}`;
};
const whatsappOrderUrl = order => {
  const phone = whatsappNumber(order?.cliente_telefone);
  if (!phone) return '';
  const message = `Olá, ${order?.cliente_nome || ''}! Seu pedido da Queijos WR (${order?.produto_nome || 'produto'} · ${order?.quantidade || 0} un.) está com status ${order?.status_pedido || 'Separado'}. Total: ${money(order?.total)}.`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
};"""
main = replace_once(main, old_status, new_status, "status e WhatsApp")

old_orders_memos = """  const selectedOrders = useMemo(() => db.pedidos.filter(order => orderDate(order) === selectedDate), [db.pedidos, selectedDate]);
  const todayOrders = useMemo(() => db.pedidos.filter(order => orderDate(order) === isoToday()), [db.pedidos]);
  const weekOrders = useMemo(() => {
    const start = weekStart(isoToday());
    return db.pedidos.filter(order => isBetween(orderDate(order), start, addDays(start, 6)));
  }, [db.pedidos]);"""
new_orders_memos = """  const selectedOrders = useMemo(() => db.pedidos.filter(order => orderDate(order) === selectedDate), [db.pedidos, selectedDate]);
  const activeSelectedOrders = useMemo(() => selectedOrders.filter(order => !isCanceled(order)), [selectedOrders]);
  const todayOrders = useMemo(() => db.pedidos.filter(order => orderDate(order) === isoToday() && !isCanceled(order)), [db.pedidos]);
  const weekOrders = useMemo(() => {
    const start = weekStart(isoToday());
    return db.pedidos.filter(order => isBetween(orderDate(order), start, addDays(start, 6)) && !isCanceled(order));
  }, [db.pedidos]);"""
main = replace_once(main, old_orders_memos, new_orders_memos, "filtros de cancelados")

old_page_props = """  const pageProps = {
    db, query, selectedDate, selectedOrders, todayOrders, weekOrders, routes, cashOuts, photos, logs,
    setQuery, setSelectedDate, setModal, saveEntity, deleteEntity, updateOrder, getClientPhoto,
    saveClientPhoto, deleteCashOut, selectTab, sync, loading, admin,
  };"""
new_page_props = """  const pageProps = {
    db, query, selectedDate, selectedOrders: activeSelectedOrders, todayOrders, weekOrders, routes, cashOuts, photos, logs,
    setQuery, setSelectedDate, setModal, saveEntity, deleteEntity, updateOrder, getClientPhoto,
    saveClientPhoto, deleteCashOut, selectTab, sync, loading, admin,
  };"""
main = replace_once(main, old_page_props, new_page_props, "propriedades das páginas")
main = replace_once(main, "{tab === 'pedidos' && <OrdersPage {...pageProps} />}", "{tab === 'pedidos' && <OrdersPage {...pageProps} selectedOrders={selectedOrders} />}", "pedidos com cancelados consultáveis")

login_button = """          <button className="btn btn-primary btn-lg" disabled={loading} type="submit">{loading ? <><Spinner /> Entrando...</> : 'Entrar no ERP'}</button>
          <p className="login-footnote">Sabor e tradição de família.</p>"""
login_downloads = """          <button className="btn btn-primary btn-lg" disabled={loading} type="submit">{loading ? <><Spinner /> Entrando...</> : 'Entrar no ERP'}</button>
          <div className="app-download-actions">
            <button type="button" className="btn btn-secondary" data-install-app>Instalar aplicativo</button>
            <a className="btn btn-secondary" href="/downloads/Queijos-WR-Mobile-v2.apk" download>Baixar APK Android</a>
          </div>
          <p className="login-footnote">Sabor e tradição de família.</p>"""
main = replace_once(main, login_button, login_downloads, "atalhos de instalação no login")

main = replace_once(
    main,
    "  const lastOrders = [...db.pedidos].sort((a, b) => String(b.criado_em || b.data_entrega || '').localeCompare(String(a.criado_em || a.data_entrega || ''))).slice(0, 6);",
    "  const lastOrders = db.pedidos.filter(order => !isCanceled(order)).sort((a, b) => String(b.criado_em || b.data_entrega || '').localeCompare(String(a.criado_em || a.data_entrega || ''))).slice(0, 6);",
    "últimos pedidos ativos",
)
main = replace_once(
    main,
    "  const upcoming = db.pedidos.filter(order => orderDate(order) >= isoToday() && normalize(order.status_pedido) !== 'entregue').sort((a, b) => orderDate(a).localeCompare(orderDate(b))).slice(0, 6);",
    "  const upcoming = db.pedidos.filter(order => orderDate(order) >= isoToday() && normalize(order.status_pedido) !== 'entregue' && !isCanceled(order)).sort((a, b) => orderDate(a).localeCompare(orderDate(b))).slice(0, 6);",
    "próximas entregas ativas",
)

orders_page = r'''function OrdersPage({ db, query, setQuery, selectedOrders, selectedDate, setModal, deleteEntity, updateOrder, routes }) {
  const [status, setStatus] = useState('ativos');
  const filtered = selectedOrders.filter(order => {
    const matchesQuery = !query || normalize(JSON.stringify(order)).includes(normalize(query));
    const matchesStatus = status === 'todos'
      || (status === 'ativos' && !isCanceled(order))
      || normalize(order.status_pedido) === normalize(status);
    return matchesQuery && matchesStatus;
  });
  return (
    <div className="page-stack">
      <PageHeader title="Pedidos" subtitle={`Pedidos com entrega em ${brDate(selectedDate)}.`} actions={<><button className="btn btn-secondary" onClick={() => printOrderList(filtered.filter(order => !isCanceled(order)), selectedDate)}>Imprimir</button><button className="btn btn-primary" onClick={() => setModal({ type: 'order-cart' })}>+ Novo pedido</button></>} />
      <Toolbar><SearchInput value={query} onChange={setQuery} placeholder="Buscar pedido, cliente ou produto..." /><select value={status} onChange={event => setStatus(event.target.value)}><option value="ativos">Pedidos ativos</option><option value="todos">Todos, incluindo cancelados</option><option>Separado</option><option>Em rota</option><option>Entregue</option><option>Cancelado</option></select><span className="result-count">{filtered.length} item(ns)</span></Toolbar>
      <DataTable columns={['Pedido', 'Cliente', 'Produto', 'Qtd.', 'Total', 'Rota', 'Pagamento', 'Status', 'Ações']} rows={filtered.map(order => [
        <strong key={order.id}>{order.codigo || '—'}</strong>,
        <div key={`c-${order.id}`}><strong>{order.cliente_nome || '—'}</strong><small>{formatPhone(order.cliente_telefone)}</small></div>,
        order.produto_nome || '—',
        order.quantidade || 0,
        money(order.total),
        routeOf(order, routes),
        <Status key={`p-${order.id}`} value={order.status_pagamento} />,
        <Status key={`s-${order.id}`} value={order.status_pedido} />,
        <TableActions key={`a-${order.id}`}>
          {!isCanceled(order) && <button onClick={() => updateOrder(order.id, { status_pagamento: 'Pago' }, 'Pagamento confirmado')}>Pago</button>}
          {whatsappOrderUrl(order) && <a href={whatsappOrderUrl(order)} target="_blank" rel="noreferrer">WhatsApp</a>}
          <button onClick={() => setModal({ type: 'entity', entity: 'pedidos', item: order })}>Editar</button>
          <button onClick={() => printReceipt(order, db.pedidos)}>PDF</button>
          <button className={isCanceled(order) ? 'primary-link' : 'danger-link'} onClick={() => updateOrder(order.id, { status_pedido: isCanceled(order) ? 'Separado' : 'Cancelado' }, isCanceled(order) ? 'Pedido reaberto' : 'Pedido cancelado')}>{isCanceled(order) ? 'Reabrir' : 'Cancelar'}</button>
          <button className="danger-link" onClick={() => deleteEntity('pedidos', order.id, order.codigo)}>Excluir</button>
        </TableActions>,
      ])} empty="Nenhum pedido nesta data." />
    </div>
  );
}

'''
main = replace_regex(main, r"function OrdersPage\(.*?\n\}\n\n(?=function DeliveriesPage)", orders_page, "página de pedidos", flags=re.S)
main = replace_once(main, "  const orders = db.pedidos.filter(order => orderDate(order) === selectedDate);", "  const orders = db.pedidos.filter(order => orderDate(order) === selectedDate && !isCanceled(order));", "caixa sem cancelados")

old_docs_header = "      <PageHeader title=\"PDFs e comprovantes\" subtitle=\"Central de impressão e geração de documentos.\" />"
new_docs_header = """      <PageHeader title="PDFs e comprovantes" subtitle="Central de impressão e geração de documentos." actions={<><button className="btn btn-secondary" type="button" data-install-app>Instalar aplicativo</button><a className="btn btn-primary" href="/downloads/Queijos-WR-Mobile-v2.apk" download>Baixar APK</a></>} />"""
main = replace_once(main, old_docs_header, new_docs_header, "downloads na central de documentos")

entity_title = "  const title = { clientes: 'cliente', produtos: 'produto', pedidos: 'item do pedido', admins: 'usuário' }[entity];\n"
entity_title_new = entity_title + """  async function lookupCep(value) {
    const cep = onlyDigits(value);
    if (cep.length !== 8) return;
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();
      if (data.erro) return;
      setForm(current => ({
        ...current,
        cep,
        rua: data.logradouro || current.rua || '',
        bairro: data.bairro || current.bairro || '',
        cidade: data.localidade || current.cidade || '',
        estado: data.uf || current.estado || '',
        complemento: current.complemento || data.complemento || '',
      }));
    } catch (error) {
      console.warn('Não foi possível consultar o CEP.', error);
    }
  }
"""
main = replace_once(main, entity_title, entity_title_new, "consulta ViaCEP")

old_client_save = "    if (entity === 'clientes') return save(entity, { id: form.id, nome: form.nome, telefone: onlyDigits(form.telefone), bairro: form.bairro, rua: form.rua, numero: form.numero, cidade: form.cidade, estado: form.estado, observacoes: form.observacoes });"
new_client_save = "    if (entity === 'clientes') return save(entity, { id: form.id, nome: form.nome, telefone: onlyDigits(form.telefone), cep: onlyDigits(form.cep), rua: form.rua, numero: form.numero, bairro: form.bairro, cidade: form.cidade, estado: form.estado, complemento: form.complemento, observacoes: form.observacoes });"
main = replace_once(main, old_client_save, new_client_save, "persistência completa de clientes")

client_fields = """{entity === 'clientes' && <><Field label="Nome" required value={form.nome} onChange={value => set('nome', value)} /><Field label="Telefone" value={form.telefone} onChange={value => set('telefone', value)} /><Field label="CEP" inputMode="numeric" maxLength={9} value={form.cep} onChange={value => set('cep', value)} onBlur={event => lookupCep(event.target.value)} /><Field label="Rua" value={form.rua} onChange={value => set('rua', value)} /><Field label="Número" value={form.numero} onChange={value => set('numero', value)} /><Field label="Bairro" value={form.bairro} onChange={value => set('bairro', value)} /><Field label="Cidade" value={form.cidade} onChange={value => set('cidade', value)} /><Field label="Estado" value={form.estado} onChange={value => set('estado', value)} /><Field className="full" label="Complemento" value={form.complemento} onChange={value => set('complemento', value)} /><Field className="full" label="Observações" value={form.observacoes} onChange={value => set('observacoes', value)} /></>}"""
main = replace_regex(main, r"\{entity === 'clientes' && <><Field label=\"Nome\".*?</>\}", client_fields, "campos completos de cliente")
main = replace_once(main, "options={['Separado', 'Em rota', 'Entregue']}", "options={['Separado', 'Em rota', 'Entregue', 'Cancelado']}", "status cancelado no formulário")

old_field = "function Field({ label, value, onChange, type = 'text', required = false, className = '', step }) { return <label className={`field ${className}`}><span>{label}</span><input required={required} type={type} step={step} value={value ?? ''} onChange={event => onChange(event.target.value)} /></label>; }"
new_field = "function Field({ label, value, onChange, type = 'text', required = false, className = '', step, onBlur, inputMode, maxLength }) { return <label className={`field ${className}`}><span>{label}</span><input required={required} type={type} step={step} inputMode={inputMode} maxLength={maxLength} value={value ?? ''} onBlur={onBlur} onChange={event => onChange(event.target.value)} /></label>; }"
main = replace_once(main, old_field, new_field, "campo com suporte a CEP")
write(main_path, main)

css_path = "src/style.css"
css = read(css_path)
css_extra = r'''

/* Finalização 2.1: cancelamento, instalação e ações móveis. */
.badge.danger{background:#fde7e4;color:#a7332b}
.table-actions a{border:0;background:transparent;font-size:10px;font-weight:800;color:var(--green);display:inline-flex;align-items:center}
.app-download-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.app-download-actions .btn{width:100%;text-align:center}
@media(max-width:430px){.app-download-actions{grid-template-columns:1fr}}
'''
if "/* Finalização 2.1:" not in css:
    css += css_extra
write(css_path, css)

index_path = "index.html"
index = read(index_path)
index = replace_once(
    index,
    '    <meta name="description" content="ERP Queijos WR para gestão de clientes, pedidos, entregas e caixa." />',
    '    <meta name="description" content="ERP Queijos WR para gestão de clientes, pedidos, entregas e caixa." />\n    <meta name="application-name" content="Queijos WR Pedidos" />\n    <meta name="apple-mobile-web-app-capable" content="yes" />\n    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />',
    "metadados PWA",
)
index = replace_once(index, '    <link rel="apple-touch-icon" href="/wr-app-icon.svg" />', '    <link rel="apple-touch-icon" href="/wr-app-icon.svg" />\n    <link rel="manifest" href="/manifest.webmanifest" />', "manifesto PWA")
index = replace_once(index, '    <script type="module" src="/src/main.jsx"></script>', '    <script src="/app-install.js" defer></script>\n    <script type="module" src="/src/main.jsx"></script>', "instalação PWA")
write(index_path, index)

write("public/manifest.webmanifest", '''{
  "name": "Queijos WR Pedidos",
  "short_name": "Queijos WR",
  "description": "Gestão de clientes, produtos, pedidos, entregas e relatórios da Queijos WR.",
  "lang": "pt-BR",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "background_color": "#0d2f1d",
  "theme_color": "#123d27",
  "icons": [
    {
      "src": "/wr-app-icon.svg",
      "sizes": "any",
      "type": "image/svg+xml",
      "purpose": "any maskable"
    }
  ]
}
''')

write("public/sw.js", r'''const CACHE = 'queijos-wr-2.1.0';
const SHELL = ['/', '/index.html', '/manifest.webmanifest', '/wr-app-icon.svg', '/logo-queijos-wr-upload.svg', '/wr-brand-icons.css', '/login-branding.css'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).catch(() => undefined));
  self.skipWaiting();
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))));
  self.clients.claim();
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).then(response => {
      const copy = response.clone();
      caches.open(CACHE).then(cache => cache.put(event.request, copy));
      return response;
    }).catch(() => caches.match(event.request).then(response => response || caches.match('/'))));
    return;
  }
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
    const copy = response.clone();
    caches.open(CACHE).then(cache => cache.put(event.request, copy));
    return response;
  })));
});
''')

write("public/app-install.js", r'''(() => {
  let installPrompt = null;
  const buttons = () => Array.from(document.querySelectorAll('[data-install-app]'));
  const standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(error => console.warn('Service worker:', error)));
  }

  if (standalone) {
    window.addEventListener('DOMContentLoaded', () => buttons().forEach(button => {
      button.textContent = 'Aplicativo instalado';
      button.disabled = true;
    }));
  }

  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    installPrompt = event;
  });

  document.addEventListener('click', async event => {
    const button = event.target.closest('[data-install-app]');
    if (!button) return;
    if (standalone) return;
    if (installPrompt) {
      installPrompt.prompt();
      await installPrompt.userChoice;
      installPrompt = null;
      return;
    }
    alert('No Android/Chrome, abra o menu ⋮ e toque em “Instalar aplicativo” ou “Adicionar à tela inicial”. No computador, use o ícone de instalação na barra do navegador.');
  });
})();
''')

java_path = "android/app/src/main/java/com/queijoswr/pedidos/MainActivity.java"
java = read(java_path).replace('queijos-wr-pedidos.workspace-332958.chatgpt.site', 'ceciliowildnei-queijo-leite-pedidos.vercel.app')
write(java_path, java)

gradle_path = "android/app/build.gradle.kts"
gradle = read(gradle_path).replace("versionCode = 2", "versionCode = 3").replace('versionName = "2.0"', 'versionName = "2.1"')
write(gradle_path, gradle)

android_readme = read("android/README.md").replace('https://queijos-wr-pedidos.workspace-332958.chatgpt.site/', 'https://ceciliowildnei-queijo-leite-pedidos.vercel.app/')
write("android/README.md", android_readme)

write(".github/workflows/android-apk.yml", '''name: Gerar APK Queijos WR

on:
  workflow_dispatch:
  push:
    branches:
      - agent/android-apk
    paths:
      - "android/**"
      - ".github/workflows/android-apk.yml"

permissions:
  contents: write

jobs:
  gerar-apk:
    runs-on: ubuntu-latest
    steps:
      - name: Baixar projeto
        uses: actions/checkout@v4

      - name: Preparar Java
        uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: "17"

      - name: Preparar Android
        uses: android-actions/setup-android@v3

      - name: Instalar Gradle
        uses: gradle/actions/setup-gradle@v4
        with:
          gradle-version: "8.9"

      - name: Preparar ícone oficial
        run: base64 --decode android/app-icon.b64 > android/app/src/main/res/drawable/queijos_wr_launcher.png

      - name: Compilar APK
        working-directory: android
        run: gradle :app:assembleDebug --stacktrace

      - name: Publicar APK no site
        run: |
          mkdir -p public/downloads
          cp android/app/build/outputs/apk/debug/app-debug.apk public/downloads/Queijos-WR-Mobile-v2.apk
          git config user.name "github-actions[bot]"
          git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
          git add public/downloads/Queijos-WR-Mobile-v2.apk
          git diff --cached --quiet || git commit -m "Atualiza APK oficial Queijos WR 2.1"
          git push

      - name: Disponibilizar instalador
        uses: actions/upload-artifact@v4
        with:
          name: Queijos-WR-Mobile-v2
          path: android/app/build/outputs/apk/debug/app-debug.apk
          if-no-files-found: error
''')

old_apk = ROOT / "downloads/Queijos-WR-Mobile-v2.apk"
if old_apk.exists():
    old_apk.unlink()

# O workflow de finalização é temporário e se remove no próprio commit final.
(ROOT / "scripts/finalize_app.py").unlink(missing_ok=True)
(ROOT / ".github/workflows/finalize-app.yml").unlink(missing_ok=True)
