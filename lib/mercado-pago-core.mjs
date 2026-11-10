import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

export const cents = value => {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) throw new Error('Valor inválido.');
  return Math.round(n * 100);
};
export function snapshot(rows) {
  if (!rows.length || rows.some(r => !r.id || !r.codigo || r.codigo !== rows[0].codigo || r.cliente_id !== rows[0].cliente_id)) throw new Error('Pedido inválido.');
  const items = rows.map(r => ({ id: String(r.id), client: String(r.cliente_id), amount: cents(r.total) })).sort((a,b) => a.id.localeCompare(b.id));
  const amount = items.reduce((n,r) => n + r.amount, 0);
  if (amount <= 0) throw new Error('Pedido sem valor.');
  return { code: rows[0].codigo, items, amount, hash: createHash('sha256').update(JSON.stringify(items)).digest('hex') };
}
export function validSignature(request, secret) {
  if (!secret) return false;
  const id = new URL(request.url).searchParams.get('data.id');
  const requestId = request.headers.get('x-request-id');
  const parts = Object.fromEntries((request.headers.get('x-signature') || '').split(',').map(p => p.trim().split('=')));
  if (!id || !requestId || !/^\d+$/.test(parts.ts || '') || !/^[a-f0-9]{64}$/i.test(parts.v1 || '')) return false;
  const manifest = `id:${id.toLowerCase()};request-id:${requestId};ts:${parts.ts};`;
  const digest = createHmac('sha256', secret).update(manifest).digest();
  return timingSafeEqual(digest, Buffer.from(parts.v1, 'hex'));
}

// Dependencies are injected so payment validation can be exercised without real charges.
export function paymentService({ env, getOrders, configGet, configSet, markPaid, fetcher = fetch }) {
  const enabled = () => env.MERCADOPAGO_ENABLED === 'true' && !!env.MERCADOPAGO_ACCESS_TOKEN && !!env.MERCADOPAGO_WEBHOOK_SECRET && !!env.APP_BASE_URL;
  const keyFor = code => `mp_pix_${createHash('sha256').update(code).digest('hex')}`;
  async function api(path, options = {}) {
    const response = await fetcher(`https://api.mercadopago.com${path}`, { ...options, signal: AbortSignal.timeout(15000), headers: { Authorization: `Bearer ${env.MERCADOPAGO_ACCESS_TOKEN}`, 'Content-Type': 'application/json', ...options.headers } });
    if (!response.ok) throw new Error(`Mercado Pago HTTP ${response.status}`);
    return response.json();
  }
  async function createPix(code, clientId, email) {
    if (!enabled()) throw new Error('Pix automático ainda não está ativo.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || '') || email.length > 254) throw new Error('Informe um e-mail válido para a cobrança.');
    const rows = await getOrders(code);
    const current = snapshot(rows);
    if (rows.some(r => String(r.cliente_id) !== String(clientId))) throw new Error('Pedido de outro cliente.');
    if (rows.some(r => r.status_pagamento === 'Pago')) throw new Error('Pedido já tem pagamento registrado. Confira com a equipe.');
    const previous = await configGet(keyFor(code));
    if (previous && previous.hash !== current.hash) throw new Error('Pedido alterado após gerar cobrança. Confira com a equipe antes de cobrar novamente.');
    if (previous?.paymentId) {
      const payment = await api(`/v1/payments/${encodeURIComponent(previous.paymentId)}`);
      if (payment.status !== 'pending') throw new Error('Cobrança encerrada ou em processamento. Confira com a equipe.');
      if (new Date(payment.date_of_expiration).getTime() <= Date.now()) throw new Error('Pix expirado. Solicite uma nova cobrança à equipe.');
      return payment;
    }
    const base = new URL(env.APP_BASE_URL);
    if (base.protocol !== 'https:') throw new Error('Endereço de notificações inválido.');
    const reference = `wr:${createHash('sha256').update(`${code}:${current.hash}`).digest('hex')}`;
    const payment = await api('/v1/payments', { method: 'POST', headers: { 'X-Idempotency-Key': reference.slice(3) }, body: JSON.stringify({ transaction_amount: current.amount / 100, description: `Queijos WR — ${code}`, payment_method_id: 'pix', payer: { email }, external_reference: reference, metadata: { wr_order_code: code }, notification_url: new URL('/api/mercado-pago-webhook', base).href }) });
    if (!payment.id || payment.payment_method_id !== 'pix') throw new Error('Resposta de cobrança inválida.');
    await configSet(keyFor(code), { ...current, reference, paymentId: String(payment.id), createdAt: new Date().toISOString() });
    return payment;
  }
  async function reconcile(id) {
    if (!enabled()) throw new Error('Integração desativada.');
    const payment = await api(`/v1/payments/${encodeURIComponent(id)}`);
    if (String(payment.id) !== String(id)) throw new Error('Pagamento divergente.');
    if (payment.status !== 'approved') return { paid: false };
    if (payment.payment_method_id !== 'pix' || payment.currency_id !== 'BRL' || payment.live_mode !== (env.MERCADOPAGO_MODE === 'production')) throw new Error('Meio, moeda ou ambiente divergente.');
    const code = payment.metadata?.wr_order_code;
    if (typeof code !== 'string') return { paid: false };
    const record = await configGet(keyFor(code));
    if (!record || record.paymentId !== String(payment.id) || record.reference !== payment.external_reference || record.amount !== cents(payment.transaction_amount)) throw new Error('Cobrança não corresponde ao pedido.');
    const rows = await getOrders(code);
    const current = snapshot(rows);
    if (current.hash !== record.hash || current.amount !== record.amount) throw new Error('Pedido alterado. Conferência manual necessária.');
    // One PATCH updates all items of the logical order; no duplicate accounting entry.
    const changed = await markPaid(code, record.items.map(r => r.id));
    return { paid: true, changed: changed.length > 0, code, phone: rows[0].cliente_telefone };
  }
  return { enabled, createPix, reconcile };
}
