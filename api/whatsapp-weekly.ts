import {
  configGet, configSet, getClients, getLastClientOrders, isoTodaySaoPaulo,
  localHourSaoPaulo, localWeekdaySaoPaulo, nextFriday, normalizePhone,
  publicError, sendWeeklyTemplate, weekKey,
} from '../lib/wr-whatsapp.js';

declare const process: { env: Record<string, string | undefined> };

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get('authorization') === `Bearer ${secret}`;
}

function previousLogicalOrder(rows: any[]) {
  if (!rows.length) return null;
  const firstCode = rows[0].codigo || rows[0].id;
  const group = rows.filter(row => (row.codigo || row.id) === firstCode);
  if (!group.length) return null;
  return {
    codigo: firstCode,
    items: group.map(row => ({
      produto_id: row.produto_id,
      produto_nome: row.produto_nome,
      quantidade: Number(row.quantidade || 0),
      preco_unitario: Number(row.preco_unitario || 0),
      total: Number(row.total || 0),
    })),
    rota: group[0].rota || '',
    tipo_entrega: group[0].tipo_entrega || 'Entrega',
    endereco: group[0].endereco || '',
    forma_pagamento: group[0].forma_pagamento || 'Pix',
    observacoes: group[0].observacoes || '',
  };
}

async function run(request: Request) {
  if (!authorized(request)) {
    return Response.json({ ok: false, error: 'Não autorizado.' }, { status: 401 });
  }

  try {
    const today = isoTodaySaoPaulo();
    const weekday = localWeekdaySaoPaulo();
    const hour = localHourSaoPaulo();
    const currentWeek = weekKey(today);
    const deliveryDate = nextFriday(today);

    if (weekday !== 'Mon') {
      return Response.json({ ok: true, skipped: true, reason: 'A campanha semanal só é enviada na segunda-feira.' });
    }
    if (hour < 8 || hour > 11) {
      return Response.json({ ok: true, skipped: true, reason: 'Fora da janela de envio da manhã.' });
    }

    const state = (await configGet('whatsapp_weekly_state')) || {};
    if (state.last_week === currentWeek) {
      return Response.json({ ok: true, skipped: true, reason: 'Campanha desta semana já processada.', state });
    }

    const optInIds = new Set((await configGet('whatsapp_opt_in_client_ids')) || []);
    const optOutIds = new Set((await configGet('whatsapp_opt_out_client_ids')) || []);
    const clients = await getClients();
    const eligible = clients.filter((client: any) => {
      const phone = normalizePhone(client.telefone);
      if (phone.length < 10) return false;
      if (optOutIds.has(String(client.id))) return false;
      return optInIds.has(String(client.id));
    });

    const sent: any[] = [];
    const failed: any[] = [];
    const pending: Record<string, any> = (await configGet('whatsapp_pending_campaigns')) || {};

    for (const client of eligible) {
      try {
        const lastOrders = await getLastClientOrders(String(client.id), 20);
        const suggestion = previousLogicalOrder(lastOrders);
        const result = await sendWeeklyTemplate(client.telefone, client.nome, deliveryDate);
        const messageId = result?.messages?.[0]?.id || null;
        const phone = normalizePhone(client.telefone);
        pending[phone] = {
          client_id: String(client.id),
          client_name: client.nome,
          week: currentWeek,
          delivery_date: deliveryDate,
          message_id: messageId,
          sent_at: new Date().toISOString(),
          suggestion,
        };
        sent.push({ client_id: String(client.id), nome: client.nome, message_id: messageId });
      } catch (error) {
        failed.push({ client_id: String(client.id), nome: client.nome, error: publicError(error) });
      }
    }

    await configSet('whatsapp_pending_campaigns', pending);
    await configSet('whatsapp_weekly_state', {
      last_week: currentWeek,
      delivery_date: deliveryDate,
      processed_at: new Date().toISOString(),
      eligible: eligible.length,
      sent: sent.length,
      failed: failed.length,
    });

    return Response.json({ ok: true, week: currentWeek, delivery_date: deliveryDate, eligible: eligible.length, sent, failed });
  } catch (error) {
    return Response.json({ ok: false, error: publicError(error) }, { status: 500 });
  }
}

export function GET(request: Request) {
  return run(request);
}

export function POST(request: Request) {
  return run(request);
}
