import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { paymentService, validSignature } from '../lib/mercado-pago-core.mjs';

function fixture() {
  const env = { MERCADOPAGO_ENABLED: 'true', MERCADOPAGO_ACCESS_TOKEN: 'test-only', MERCADOPAGO_WEBHOOK_SECRET: 'test-secret', MERCADOPAGO_MODE: 'production', APP_BASE_URL: 'https://example.com' };
  const rows = [{ id: 'a', codigo: 'WR-1', cliente_id: 'c', cliente_telefone: '000', total: 35, status_pagamento: 'Pendente' }, { id: 'b', codigo: 'WR-1', cliente_id: 'c', total: 10, status_pagamento: 'Pendente' }];
  const records = new Map();
  const calls = [];
  let payment;
  const service = paymentService({ env, getOrders: async () => rows,
    configGet: async k => records.get(k), configSet: async (k,v) => records.set(k,v),
    markPaid: async () => { const changed = rows.filter(r => r.status_pagamento !== 'Pago'); changed.forEach(r => { r.status_pagamento = 'Pago'; }); return changed; },
    fetcher: async (url, options) => {
      calls.push({url, options});
      if (options.method === 'POST') {
        const body = JSON.parse(options.body);
        payment = { ...body, id: 123, status: 'pending', currency_id: 'BRL', live_mode: true, date_of_expiration: new Date(Date.now()+86400000).toISOString(), point_of_interaction: { transaction_data: { qr_code: 'test-pix' } } };
      }
      return Response.json(payment);
    },
  });
  return { env, rows, records, calls, service, get payment() { return payment; } };
}
test('Pix totals all items and repeated requests reuse the same payment', async () => {
  const f = fixture();
  await f.service.createPix('WR-1','c','buyer@example.com');
  await f.service.createPix('WR-1','c','buyer@example.com');
  assert.equal(f.payment.transaction_amount,45);
  assert.equal(f.calls.filter(c => c.options.method === 'POST').length,1);
  assert.ok(f.calls[0].options.headers['X-Idempotency-Key']);
});
test('approved payment marks all items paid; repeated webhook changes no rows', async () => {
  const f = fixture(); await f.service.createPix('WR-1','c','buyer@example.com');
  f.payment.status = 'approved';
  assert.equal((await f.service.reconcile('123')).changed,true);
  assert.ok(f.rows.every(r => r.status_pagamento === 'Pago'));
  assert.equal((await f.service.reconcile('123')).changed,false);
});
for (const [name, mutate] of [
  ['pending',f => { f.payment.status = 'pending'; }],
  ['wrong amount',f => { f.payment.transaction_amount = 1; }],
  ['wrong currency',f => { f.payment.currency_id = 'USD'; }],
  ['wrong reference',f => { f.payment.external_reference = 'other'; }],
  ['test payment in production',f => { f.payment.live_mode = false; }],
  ['changed order',f => { f.rows[0].total = 36; }],
]) test(`${name} never marks order paid`, async () => {
  const f = fixture(); await f.service.createPix('WR-1','c','buyer@example.com');
  f.payment.status = 'approved'; mutate(f);
  await f.service.reconcile('123').catch(() => {});
  assert.ok(f.rows.every(r => r.status_pagamento === 'Pendente'));
});
test('disabled integration and wrong client cannot create a charge', async () => {
  const f = fixture();
  await assert.rejects(f.service.createPix('WR-1','another','buyer@example.com'));
  f.env.MERCADOPAGO_ENABLED = 'false';
  await assert.rejects(f.service.createPix('WR-1','c','buyer@example.com'));
  assert.equal(f.calls.length,0);
});
test('changed or expired charge is not silently replaced', async () => {
  const f = fixture(); await f.service.createPix('WR-1','c','buyer@example.com');
  f.payment.date_of_expiration = '2000-01-01T00:00:00Z';
  await assert.rejects(f.service.createPix('WR-1','c','buyer@example.com'));
  f.rows[0].total = 36;
  await assert.rejects(f.service.createPix('WR-1','c','buyer@example.com'));
  assert.equal(f.calls.filter(c => c.options.method === 'POST').length,1);
});
test('signature rejects tampered IDs and missing or malformed signatures', () => {
  const ts = '1704908010';
  const signature = createHmac('sha256','secret').update(`id:123;request-id:req;ts:${ts};`).digest('hex');
  const headers = {'x-request-id':'req','x-signature':`ts=${ts},v1=${signature}`};
  assert.equal(validSignature(new Request('https://example.com?data.id=123',{headers}),'secret'),true);
  assert.equal(validSignature(new Request('https://example.com?data.id=124',{headers}),'secret'),false);
  assert.equal(validSignature(new Request('https://example.com?data.id=123'),'secret'),false);
  assert.equal(validSignature(new Request('https://example.com?data.id=123',{headers:{...headers,'x-signature':'v1=garbage'}}),'secret'),false);
});
