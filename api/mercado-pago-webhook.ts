import { validSignature } from '../lib/mercado-pago-core.mjs';
import { configGet, configSet, sendMetaMessage } from '../lib/wr-whatsapp.js';
import { payments } from '../lib/wr-mercado-pago.js';
declare const process: { env: Record<string, string | undefined> };

export async function POST(request: Request) {
  if (!payments.enabled()) return new Response('Not configured', { status: 503 });
  if (!validSignature(request, process.env.MERCADOPAGO_WEBHOOK_SECRET)) return new Response('Invalid signature', { status: 401 });
  const id = new URL(request.url).searchParams.get('data.id') || '';
  if (!/^\d+$/.test(id)) return new Response('Invalid payment', { status: 400 });
  try {
    const body = await request.json();
    if (body.type !== 'payment' || String(body.data?.id) !== id) return new Response('Invalid event', { status: 400 });
    const result = await payments.reconcile(id);
    const template = process.env.META_WHATSAPP_PAYMENT_TEMPLATE;
    const notificationKey = `mp_payment_notice_${id}`;
    if (result.paid && result.phone && template && !(await configGet(notificationKey))) {
      await sendMetaMessage(result.phone, { type: 'template', template: {
        name: template, language: { code: 'pt_BR' },
        components: [{ type: 'body', parameters: [{ type: 'text', text: result.code }] }],
      } });
      await configSet(notificationKey, { sentAt: new Date().toISOString() });
    }
    return new Response('OK', { status: 200 });
  } catch {
    // 5xx preserves Mercado Pago retries; do not log payloads, payer data or secrets.
    return new Response('Payment verification pending', { status: 503 });
  }
}
