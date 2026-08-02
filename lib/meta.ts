import crypto from 'node:crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const DEFAULT_GRAPH_VERSION = 'v25.0';
const DEFAULT_SUPABASE_URL = 'https://ywwztahbqgiwervbwudg.supabase.co';

let supabaseAdmin: SupabaseClient | null = null;

export function env(name: string, fallback = ''): string {
  const value = String(process.env[name] || fallback).trim();
  if (!value) throw new Error(`Variável obrigatória não configurada: ${name}`);
  return value;
}

export function graphVersion(): string {
  const configured = String(process.env.META_GRAPH_VERSION || DEFAULT_GRAPH_VERSION).trim();
  return configured.startsWith('v') ? configured : `v${configured}`;
}

export function normalizePhone(value: unknown): string {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('55') && digits.length >= 12) return digits;
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  return digits;
}

export function localBrazilPhone(value: unknown): string {
  const phone = normalizePhone(value);
  return phone.startsWith('55') ? phone.slice(2) : phone;
}

export function getSupabaseAdmin(): SupabaseClient {
  if (supabaseAdmin) return supabaseAdmin;
  const url = String(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL).trim();
  const serviceRoleKey = env('SUPABASE_SERVICE_ROLE_KEY');
  supabaseAdmin = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return supabaseAdmin;
}

export async function readRawBody(req: any): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks);
}

export function verifyMetaSignature(rawBody: Buffer, signatureHeader: unknown): boolean {
  const appSecret = env('META_APP_SECRET');
  const signature = Array.isArray(signatureHeader) ? signatureHeader[0] : String(signatureHeader || '');
  if (!signature.startsWith('sha256=')) return false;
  const expected = `sha256=${crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex')}`;
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

async function metaRequest(path: string, init: RequestInit = {}, accessToken?: string): Promise<any> {
  const token = accessToken || env('META_WHATSAPP_TOKEN');
  const response = await fetch(`https://graph.facebook.com/${graphVersion()}/${path.replace(/^\//, '')}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = result?.error?.message || `Falha na API da Meta (${response.status}).`;
    const error = new Error(message) as Error & { details?: unknown; status?: number };
    error.details = result;
    error.status = response.status;
    throw error;
  }
  return result;
}

export async function sendWhatsApp(payload: Record<string, unknown>): Promise<any> {
  const phoneNumberId = env('META_WHATSAPP_PHONE_NUMBER_ID');
  return metaRequest(`${phoneNumberId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ messaging_product: 'whatsapp', recipient_type: 'individual', ...payload }),
  });
}

export async function sendText(to: string, body: string): Promise<any> {
  return sendWhatsApp({
    to: normalizePhone(to),
    type: 'text',
    text: { preview_url: false, body },
  });
}

export async function sendButtons(
  to: string,
  body: string,
  buttons: Array<{ id: string; title: string }>,
  footer = 'Queijos WR',
): Promise<any> {
  return sendWhatsApp({
    to: normalizePhone(to),
    type: 'interactive',
    interactive: {
      type: 'button',
      body: { text: body },
      footer: { text: footer },
      action: {
        buttons: buttons.slice(0, 3).map(button => ({
          type: 'reply',
          reply: { id: button.id.slice(0, 256), title: button.title.slice(0, 20) },
        })),
      },
    },
  });
}

export async function sendList(
  to: string,
  body: string,
  buttonText: string,
  rows: Array<{ id: string; title: string; description?: string }>,
  sectionTitle = 'Opções',
): Promise<any> {
  return sendWhatsApp({
    to: normalizePhone(to),
    type: 'interactive',
    interactive: {
      type: 'list',
      body: { text: body },
      footer: { text: 'Queijos WR' },
      action: {
        button: buttonText.slice(0, 20),
        sections: [{
          title: sectionTitle.slice(0, 24),
          rows: rows.slice(0, 10).map(row => ({
            id: row.id.slice(0, 200),
            title: row.title.slice(0, 24),
            description: String(row.description || '').slice(0, 72),
          })),
        }],
      },
    },
  });
}

export async function sendTemplate(
  to: string,
  name: string,
  language = 'pt_BR',
  components: unknown[] = [],
): Promise<any> {
  return sendWhatsApp({
    to: normalizePhone(to),
    type: 'template',
    template: {
      name,
      language: { code: language },
      ...(components.length ? { components } : {}),
    },
  });
}

export async function markMessageRead(messageId: string): Promise<any> {
  return sendWhatsApp({ status: 'read', message_id: messageId });
}

export async function getConfig<T = any>(key: string, fallback: T): Promise<T> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from('wr_config').select('valor').eq('chave', key).maybeSingle();
  if (error) throw error;
  return (data?.valor ?? fallback) as T;
}

export async function setConfig(key: string, value: unknown): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from('wr_config').upsert([{ chave: key, valor: value }], { onConflict: 'chave' });
  if (error) throw error;
}

export function nextFridayISO(): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  const date = new Date(Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day), 12));
  let days = (5 - date.getUTCDay() + 7) % 7;
  if (days === 0) days = 7;
  date.setUTCDate(date.getUTCDate() + days);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

export async function publishInstagramImage(input: {
  imageUrl: string;
  caption?: string;
  mediaType?: 'FEED' | 'STORIES';
}): Promise<any> {
  const accessToken = env('META_INSTAGRAM_ACCESS_TOKEN');
  const instagramUserId = env('META_INSTAGRAM_USER_ID');
  const mediaType = input.mediaType || 'FEED';
  const params = new URLSearchParams({ image_url: input.imageUrl });
  if (mediaType === 'STORIES') params.set('media_type', 'STORIES');
  if (mediaType === 'FEED' && input.caption) params.set('caption', input.caption);

  const container = await metaRequest(`${instagramUserId}/media?${params.toString()}`, { method: 'POST' }, accessToken);
  if (!container?.id) throw new Error('A Meta não retornou o ID do conteúdo do Instagram.');
  return metaRequest(`${instagramUserId}/media_publish`, {
    method: 'POST',
    body: JSON.stringify({ creation_id: container.id }),
  }, accessToken);
}
