import crypto from 'node:crypto';

declare const process: { env: Record<string, string | undefined> };

const FALLBACK_SUPABASE_URL = 'https://ywwztahbqgiwervbwudg.supabase.co';
const FALLBACK_SUPABASE_KEY = 'sb_publishable_er0Z1O0s1opKniqu3cYkGg_svVBvXRx';

export const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || FALLBACK_SUPABASE_URL;
export const SUPABASE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || FALLBACK_SUPABASE_KEY;
export const META_GRAPH_VERSION = process.env.META_GRAPH_VERSION || 'v26.0';
export const META_PHONE_NUMBER_ID = process.env.META_WHATSAPP_PHONE_NUMBER_ID || '';
export const META_TOKEN = process.env.META_WHATSAPP_TOKEN || '';
export const META_WEEKLY_TEMPLATE = process.env.META_WHATSAPP_WEEKLY_TEMPLATE || 'oferta_semanal_queijos_wr';
export const META_WEEKLY_TEMPLATE_LANGUAGE = process.env.META_WHATSAPP_WEEKLY_TEMPLATE_LANGUAGE || 'pt_BR';

const baseHeaders = () => ({
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
});

export function onlyDigits(value: unknown) { return String(value || '').replace(/\D/g, ''); }
export function normalizePhone(value: unknown) {
  let digits = onlyDigits(value);
  if (digits.startsWith('55') && digits.length >= 12) digits = digits.slice(2);
  return digits;
}
export function normalizeText(value: unknown) {
  return String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\bqueijos\b/g, 'queijo').replace(/\blitros\b/g, 'litro').replace(/\s+/g, ' ').trim();
}
export function isoTodaySaoPaulo() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}
export function localHourSaoPaulo() {
  return Number(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Sao_Paulo', hour: '2-digit', hour12: false }).format(new Date()));
}
export function localWeekdaySaoPaulo() {
  return new Intl.DateTimeFormat('en-US', { timeZone: 'America/Sao_Paulo', weekday: 'short' }).format(new Date());
}
export function addDaysIso(value: string, days: number) {
  const date = new Date(`${value}T12:00:00-03:00`);
  date.setUTCDate(date.getUTCDate() + days);
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}
export function nextFriday(value = isoTodaySaoPaulo()) {
  const date = new Date(`${value}T12:00:00-03:00`);
  return addDaysIso(value, (5 - date.getUTCDay() + 7) % 7);
}
export function weekKey(value = isoTodaySaoPaulo()) {
  const date = new Date(`${value}T12:00:00-03:00`);
  const day = date.getUTCDay();
  return addDaysIso(value, day === 0 ? -6 : 1 - day);
}
export function brDate(value: string) { return value ? value.slice(0, 10).split('-').reverse().join('/') : ''; }
export function money(value: unknown) { return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }

export async function dbGet(path: string) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: baseHeaders(), cache: 'no-store' });
  const text = await response.text();
  if (!response.ok) throw new Error(`Supabase GET ${response.status}: ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : [];
}
export async function dbInsert(table: string, rows: unknown[]) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, { method: 'POST', headers: { ...baseHeaders(), Prefer: 'return=representation' }, body: JSON.stringify(rows) });
  const text = await response.text();
  if (!response.ok) throw new Error(`Supabase INSERT ${response.status}: ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : [];
}
export async function configGet(key: string) {
  const rows = await dbGet(`wr_config?chave=eq.${encodeURIComponent(key)}&select=valor&limit=1`);
  return rows?.[0]?.valor ?? null;
}
export async function configSet(key: string, value: unknown) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/wr_config`, { method: 'POST', headers: { ...baseHeaders(), Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify([{ chave: key, valor: value }]) });
  const text = await response.text();
  if (!response.ok) throw new Error(`Supabase CONFIG ${response.status}: ${text.slice(0, 300)}`);
}
export async function getClients() { return dbGet('wr_clientes?select=*&order=nome.asc'); }
export async function getClientByPhone(phone: string) {
  const target = normalizePhone(phone);
  const clients = await getClients();
  return clients.find((client: any) => {
    const current = normalizePhone(client.telefone);
    return current && (current === target || current.slice(-10) === target.slice(-10));
  }) || null;
}
export async function getActiveProducts() { return dbGet('wr_produtos?select=*&ativo=eq.true&order=nome.asc'); }
export async function getLastClientOrders(clientId: string, limit = 30) {
  return dbGet(`wr_pedidos?cliente_id=eq.${encodeURIComponent(clientId)}&select=*&order=data_entrega.desc,criado_em.desc&limit=${limit}`);
}
export function addressOf(client: any) { return [client?.rua, client?.numero, client?.bairro, client?.cidade, client?.estado].filter(Boolean).join(', '); }
export function whatsappOrderCode(messageId: string) {
  const hash = crypto.createHash('sha256').update(String(messageId || Date.now())).digest('hex').slice(0, 10).toUpperCase();
  return `WR-WA-${hash}`;
}
export async function sendMetaMessage(to: string, payload: Record<string, unknown>) {
  if (!META_TOKEN || !META_PHONE_NUMBER_ID) throw new Error('WhatsApp Cloud API ainda não está configurada no servidor.');
  const clean = onlyDigits(to);
  const destination = clean.startsWith('55') ? clean : `55${clean}`;
  const response = await fetch(`https://graph.facebook.com/${META_GRAPH_VERSION}/${META_PHONE_NUMBER_ID}/messages`, {
    method: 'POST', headers: { Authorization: `Bearer ${META_TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ messaging_product: 'whatsapp', to: destination, ...payload }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(String(result?.error?.message || `WhatsApp retornou HTTP ${response.status}`));
  return result;
}
export async function sendText(to: string, body: string) { return sendMetaMessage(to, { type: 'text', text: { preview_url: false, body } }); }
export async function sendWeeklyTemplate(to: string, clientName: string, deliveryDate: string) {
  return sendMetaMessage(to, { type: 'template', template: { name: META_WEEKLY_TEMPLATE, language: { code: META_WEEKLY_TEMPLATE_LANGUAGE }, components: [{ type: 'body', parameters: [{ type: 'text', text: clientName || 'cliente' }, { type: 'text', text: brDate(deliveryDate) }] }] } });
}
function productAliases(product: any) {
  const name = normalizeText(product?.nome);
  const aliases = new Set<string>();
  if (name) aliases.add(name);
  if (name.includes('leite')) ['leite', 'litro de leite'].forEach(value => aliases.add(value));
  if (name.includes('500') || /\bqueijo p\b/.test(name) || name.includes('pequeno')) ['queijo p', 'queijo pequeno', 'queijo 500g', 'queijo 500 g', '500g de queijo', '500 g de queijo'].forEach(value => aliases.add(value));
  if (name.includes('1kg') || name.includes('1 kg') || /\bqueijo g\b/.test(name) || name.includes('grande')) ['queijo g', 'queijo grande', 'queijo 1kg', 'queijo 1 kg', '1kg de queijo', '1 kg de queijo'].forEach(value => aliases.add(value));
  return [...aliases].sort((a, b) => b.length - a.length);
}
function escapeRegex(value: string) { return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
export function parseOrderText(textValue: string, products: any[]) {
  const text = normalizeText(textValue);
  const items: any[] = [];
  for (const product of products) {
    let quantity = 0;
    for (const alias of productAliases(product)) {
      const pattern = escapeRegex(alias).replace(/queijo/g, 'queijos?').replace(/litro/g, 'litros?');
      const before = new RegExp(`(?:^|\\b)(\\d+(?:[.,]\\d+)?)\\s*(?:x\\s*)?${pattern}(?:\\b|$)`, 'i');
      const after = new RegExp(`${pattern}\\s*(?:x\\s*)?(\\d+(?:[.,]\\d+)?)(?:\\b|$)`, 'i');
      const match = text.match(before) || text.match(after);
      if (match) { quantity = Number(String(match[1]).replace(',', '.')); break; }
    }
    if (quantity > 0) items.push({ produto_id: product.id, produto_nome: product.nome, quantidade, preco_unitario: Number(product.preco || 0), total: quantity * Number(product.preco || 0) });
  }
  return items;
}
export function formatConfirmation(items: any[], deliveryDate: string) {
  const lines = items.map(item => `• ${item.quantidade} x ${item.produto_nome} — ${money(item.total)}`);
  const total = items.reduce((sum, item) => sum + Number(item.total || 0), 0);
  return `Entendi seu pedido para ${brDate(deliveryDate)}:\n${lines.join('\n')}\n\nTotal: ${money(total)}\n\nResponda *CONFIRMAR* para registrar o pedido ou *CANCELAR* para desistir.`;
}
export function publicError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || 'Erro inesperado');
  return message.replace(/Bearer\s+\S+/gi, 'Bearer [oculto]').slice(0, 280);
}
