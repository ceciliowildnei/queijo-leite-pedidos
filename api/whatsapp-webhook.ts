import {
  addressOf, configGet, configSet, dbGet, dbInsert, formatConfirmation,
  getActiveProducts, getClientByPhone, getLastClientOrders, isoTodaySaoPaulo,
  nextFriday, normalizePhone, normalizeText, parseOrderText, publicError,
  sendText, whatsappOrderCode,
} from '../lib/wr-whatsapp.js';

declare const process: { env: Record<string, string | undefined> };

async function verifySignature(request: Request, rawBody: string) {
  const appSecret = process.env.META_APP_SECRET;
  if (!appSecret) return false;
  const signature = request.headers.get('x-hub-signature-256') || '';
  if (!signature.startsWith('sha256=')) return false;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', encoder.encode(appSecret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const digest = await crypto.subtle.sign('HMAC', key, encoder.encode(rawBody));
  const expected = `sha256=${Array.from(new Uint8Array(digest)).map(byte => byte.toString(16).padStart(2, '0')).join('')}`;
  return signature.toLowerCase() === expected;
}

function firstInboundMessage(payload: any) {
  const entry = payload?.entry?.[0];
  const change = entry?.changes?.[0];
  const value = change?.value;
  const message = value?.messages?.[0];
  if (!message) return null;
  const sender = normalizePhone(message.from);
  const profile = (value?.contacts || []).find((item: any) => normalizePhone(item?.wa_id) === sender) || value?.contacts?.[0];
  return {
    id: message.id,
    from: message.from,
    type: message.type,
    profileName: String(profile?.profile?.name || '').trim(),
    text: message.text?.body || message.button?.text || message.interactive?.button_reply?.title || '',
  };
}

async function ensureClientFromWhatsApp(message: any) {
  const phone = normalizePhone(message.from);
  let client = await getClientByPhone(phone);
  if (client) return { client, created: false };

  const safeProfileName = String(message.profileName || '').replace(/\s+/g, ' ').trim().slice(0, 120);
  const fallbackName = `Contato WhatsApp ${phone.slice(-4) || 'novo'}`;
  const rows = await dbInsert('wr_clientes', [{
    nome: safeProfileName || fallbackName,
    telefone: phone,
    observacoes: `Captado automaticamente pelo WhatsApp em ${new Date().toISOString()}`,
  }]);

  client = rows?.[0] || await getClientByPhone(phone);
  if (!client) throw new Error('Não foi possível cadastrar o novo contato do WhatsApp.');
  return { client, created: true };
}

function logicalLastOrder(rows: any[]) {
  if (!rows.length) return null;
  const code = rows[0].codigo || rows[0].id;
  const group = rows.filter(row => (row.codigo || row.id) === code);
  return {
    items: group.map(row => ({
      produto_id: row.produto_id,
      produto_nome: row.produto_nome,
      quantidade: Number(row.quantidade || 0),
      preco_unitario: Number(row.preco_unitario || 0),
      total: Number(row.total || 0),
    })),
    rota: group[0].rota || group[0].tipo_entrega || '',
    tipo_entrega: group[0].tipo_entrega || group[0].rota || 'Entrega',
    endereco: group[0].endereco || '',
    forma_pagamento: group[0].forma_pagamento || 'Pix',
    observacoes: group[0].observacoes || '',
  };
}

async function alreadyProcessed(messageId: string) {
  const code = whatsappOrderCode(messageId);
  const rows = await dbGet(`wr_pedidos?codigo=eq.${encodeURIComponent(code)}&select=id&limit=1`);
  if (rows.length) return true;
  const processed = (await configGet('whatsapp_processed_message_ids')) || [];
  return processed.includes(messageId);
}

async function markProcessed(messageId: string) {
  const processed = (await configGet('whatsapp_processed_message_ids')) || [];
  const next = [messageId, ...processed.filter((item: string) => item !== messageId)].slice(0, 500);
  await configSet('whatsapp_processed_message_ids', next);
}

async function pendingMap() {
  return (await configGet('whatsapp_pending_orders')) || {};
}

async function savePending(phone: string, value: any | null) {
  const pending = await pendingMap();
  if (value) pending[phone] = value;
  else delete pending[phone];
  await configSet('whatsapp_pending_orders', pending);
}

async function registerOrder(client: any, pending: any, messageId: string) {
  if (await alreadyProcessed(messageId)) return { duplicate: true };
  const code = whatsappOrderCode(messageId);
  const rows = (pending.items || []).map((item: any) => ({
    codigo: code,
    cliente_id: client.id,
    cliente_nome: client.nome,
    cliente_telefone: client.telefone,
    produto_id: item.produto_id,
    produto_nome: item.produto_nome,
    quantidade: Number(item.quantidade || 0),
    preco_unitario: Number(item.preco_unitario || 0),
    total: Number(item.quantidade || 0) * Number(item.preco_unitario || 0),
    rota: pending.rota || pending.tipo_entrega || '',
    tipo_entrega: pending.tipo_entrega || pending.rota || 'Entrega',
    endereco: pending.endereco || addressOf(client),
    forma_pagamento: pending.forma_pagamento || 'Pix',
    status_pagamento: 'Pendente',
    status_pedido: 'Separado',
    data_entrega: pending.delivery_date || nextFriday(isoTodaySaoPaulo()),
    observacoes: [pending.observacoes, 'Pedido confirmado pelo WhatsApp'].filter(Boolean).join(' | '),
  }));
  await dbInsert('wr_pedidos', rows);
  await markProcessed(messageId);
  return { duplicate: false, code, rows };
}

export function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');
  if (mode === 'subscribe' && token && token === process.env.META_WHATSAPP_VERIFY_TOKEN) {
    return new Response(challenge || '', { status: 200 });
  }
  return new Response('Verification failed', { status: 403 });
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  if (!(await verifySignature(request, rawBody))) return new Response('Invalid signature', { status: 401 });

  let payload: any;
  try { payload = JSON.parse(rawBody || '{}'); } catch { return new Response('Invalid JSON', { status: 400 }); }
  const message = firstInboundMessage(payload);
  if (!message) return new Response('EVENT_RECEIVED', { status: 200 });

  try {
    if (!message.id || await alreadyProcessed(message.id)) return new Response('EVENT_RECEIVED', { status: 200 });

    const phone = normalizePhone(message.from);
    const ensured = await ensureClientFromWhatsApp(message);
    const client = ensured.client;
    const wasCaptured = ensured.created;

    const text = normalizeText(message.text);
    const optOutIds = new Set((await configGet('whatsapp_opt_out_client_ids')) || []);
    const optInIds = new Set((await configGet('whatsapp_opt_in_client_ids')) || []);

    if (/^(sair|parar|cancelar mensagens|nao quero receber|não quero receber)$/.test(text)) {
      optOutIds.add(String(client.id));
      optInIds.delete(String(client.id));
      await configSet('whatsapp_opt_out_client_ids', [...optOutIds]);
      await configSet('whatsapp_opt_in_client_ids', [...optInIds]);
      await savePending(phone, null);
      await markProcessed(message.id);
      await sendText(message.from, 'Pronto. Você não receberá novas mensagens promocionais da Queijos WR. Quando quiser voltar, envie *QUERO RECEBER*.');
      return new Response('EVENT_RECEIVED', { status: 200 });
    }

    if (/^(quero receber|ativar mensagens|ativar)$/.test(text)) {
      optOutIds.delete(String(client.id));
      optInIds.add(String(client.id));
      await configSet('whatsapp_opt_out_client_ids', [...optOutIds]);
      await configSet('whatsapp_opt_in_client_ids', [...optInIds]);
      await markProcessed(message.id);
      await sendText(message.from, 'Cadastro ativado. Você poderá receber as novidades e sugestões semanais da Queijos WR.');
      return new Response('EVENT_RECEIVED', { status: 200 });
    }

    const allPending = await pendingMap();
    const pending = allPending[phone];

    if (/^(cancelar|desistir|nao confirmar|não confirmar)$/.test(text) && pending) {
      await savePending(phone, null);
      await markProcessed(message.id);
      await sendText(message.from, 'Pedido cancelado. Nenhum pedido foi registrado.');
      return new Response('EVENT_RECEIVED', { status: 200 });
    }

    if (/^(confirmar|confirmo|sim confirmar)$/.test(text) && pending) {
      const result = await registerOrder(client, pending, message.id);
      await savePending(phone, null);
      if (!result.duplicate) {
        const total = result.rows.reduce((sum: number, row: any) => sum + Number(row.total || 0), 0);
        await sendText(message.from, `Pedido ${result.code} confirmado! Entrega prevista para ${String(pending.delivery_date || '').split('-').reverse().join('/')}. Total: ${total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}. Obrigado!`);
      }
      return new Response('EVENT_RECEIVED', { status: 200 });
    }

    const campaigns = (await configGet('whatsapp_pending_campaigns')) || {};
    const campaign = campaigns[phone];
    if (/^(sim|repetir|quero|pode repetir|o de sempre)$/.test(text)) {
      let suggestion = campaign?.suggestion || null;
      if (!suggestion) suggestion = logicalLastOrder(await getLastClientOrders(String(client.id), 20));
      if (!suggestion?.items?.length) {
        await markProcessed(message.id);
        await sendText(message.from, `${wasCaptured ? 'Seu contato já foi cadastrado na Queijos WR. ' : ''}Ainda não tenho um pedido anterior para repetir. Escreva seu pedido, por exemplo: *2 queijo grande e 3 litros de leite*.`);
        return new Response('EVENT_RECEIVED', { status: 200 });
      }
      const draft = {
        ...suggestion,
        delivery_date: campaign?.delivery_date || nextFriday(isoTodaySaoPaulo()),
        created_from_message_id: message.id,
      };
      await savePending(phone, draft);
      await markProcessed(message.id);
      await sendText(message.from, formatConfirmation(draft.items, draft.delivery_date));
      return new Response('EVENT_RECEIVED', { status: 200 });
    }

    const products = await getActiveProducts();
    const items = parseOrderText(message.text, products);
    if (items.length) {
      const last = logicalLastOrder(await getLastClientOrders(String(client.id), 20));
      const draft = {
        items,
        rota: last?.rota || '',
        tipo_entrega: last?.tipo_entrega || 'Entrega',
        endereco: last?.endereco || addressOf(client),
        forma_pagamento: last?.forma_pagamento || 'Pix',
        observacoes: wasCaptured ? 'Primeiro atendimento captado pelo WhatsApp' : '',
        delivery_date: campaign?.delivery_date || nextFriday(isoTodaySaoPaulo()),
        created_from_message_id: message.id,
      };
      await savePending(phone, draft);
      await markProcessed(message.id);
      await sendText(message.from, `${wasCaptured ? `Olá, ${client.nome}! Seu contato já foi cadastrado na Queijos WR.\n\n` : ''}${formatConfirmation(items, draft.delivery_date)}`);
      return new Response('EVENT_RECEIVED', { status: 200 });
    }

    await markProcessed(message.id);
    await sendText(message.from, `${wasCaptured ? `Olá, ${client.nome}! Seu contato foi cadastrado automaticamente na Queijos WR.\n\n` : ''}Posso anotar seu pedido por aqui. Escreva quantidade e produto, por exemplo: *1 queijo grande, 2 queijo pequeno e 3 litros de leite*. Se quiser repetir seu último pedido, responda *REPETIR*.`);
    return new Response('EVENT_RECEIVED', { status: 200 });
  } catch (error) {
    console.error('WhatsApp webhook:', publicError(error));
    return new Response('EVENT_RECEIVED', { status: 200 });
  }
}
