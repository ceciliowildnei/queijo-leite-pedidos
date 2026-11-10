import { paymentService } from './mercado-pago-core.mjs';
import { dbGet, configGet, configSet, SUPABASE_URL, SUPABASE_KEY, sendText, money } from './wr-whatsapp.js';
declare const process: { env: Record<string, string | undefined> };

export const payments = paymentService({
  env: process.env, configGet, configSet,
  getOrders: (code: string) => dbGet(`wr_pedidos?codigo=eq.${encodeURIComponent(code)}&select=*`),
  markPaid: async (code: string, ids: string[]) => {
    // IDs originate from the stored order, never from the webhook payload.
    if (ids.some(id => !/^[\w-]+$/.test(id))) throw new Error('Identificador inválido.');
    const response = await fetch(`${SUPABASE_URL}/rest/v1/wr_pedidos?codigo=eq.${encodeURIComponent(code)}&id=in.(${ids.join(',')})&status_pagamento=neq.Pago`, {
      method: 'PATCH', headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
      body: JSON.stringify({ status_pagamento: 'Pago' }),
    });
    if (!response.ok) throw new Error(`Falha ao registrar pagamento: HTTP ${response.status}`);
    return response.json();
  },
});

export async function sendPix(code: string, client: any, email: string) {
  const payment = await payments.createPix(code, client.id, email);
  const data = payment.point_of_interaction?.transaction_data;
  if (!data?.qr_code) throw new Error('Pix ainda não disponível.');
  const link = data.ticket_url && new URL(data.ticket_url);
  const safeLink = link?.protocol === 'https:' && (link.hostname === 'mercadopago.com.br' || link.hostname.endsWith('.mercadopago.com.br')) ? link.href : '';
  await sendText(client.telefone, `Pix do pedido ${code}: ${money(payment.transaction_amount)}.\n\nCopia e cola:\n${data.qr_code}\n\n${safeLink ? `QR Code e instruções: ${safeLink}\n\n` : ''}O pagamento será confirmado após a verificação pelo Mercado Pago. Não é necessário enviar comprovante.`);
}
