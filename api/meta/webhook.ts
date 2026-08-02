import { getConfig, getSupabaseAdmin, localBrazilPhone, markMessageRead, normalizePhone, readRawBody, sendButtons, sendList, sendText, verifyMetaSignature } from '../../lib/meta.js';

export const config = { api: { bodyParser: false } };

const textOf = (message: any) => String(
  message?.text?.body ||
  message?.interactive?.button_reply?.title ||
  message?.interactive?.list_reply?.title ||
  ''
).trim();

async function findOrCreateClient(phone: string, profileName = '') {
  const supabase = getSupabaseAdmin();
  const local = localBrazilPhone(phone);
  const candidates = [local, normalizePhone(phone)];
  const { data } = await supabase.from('wr_clientes').select('*').in('telefone', candidates).limit(1);
  if (data?.[0]) return data[0];
  const payload = { nome: profileName || `Cliente ${local.slice(-4)}`, telefone: local };
  const created = await supabase.from('wr_clientes').insert([payload]).select('*').single();
  if (created.error) throw created.error;
  return created.data;
}

async function showMenu(to: string) {
  await sendButtons(to, 'Olá! Sou o atendimento automático da Queijos WR. Como posso ajudar?', [
    { id: 'menu_produtos', title: 'Fazer pedido' },
    { id: 'menu_pedido', title: 'Meu pedido' },
    { id: 'menu_atendente', title: 'Falar com atendente' },
  ]);
}

async function showProducts(to: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from('wr_produtos').select('*').eq('ativo', true).order('nome');
  if (error) throw error;
  const rows = (data || []).slice(0, 10).map(product => ({
    id: `produto:${product.id}`,
    title: String(product.nome || 'Produto'),
    description: Number(product.preco || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
  }));
  if (!rows.length) return sendText(to, 'No momento não há produtos disponíveis. Digite ATENDENTE para falar conosco.');
  return sendList(to, 'Escolha o produto que deseja reservar:', 'Ver produtos', rows, 'Produtos disponíveis');
}

async function createOrderFromProduct(to: string, productId: string, profileName: string) {
  const supabase = getSupabaseAdmin();
  const client = await findOrCreateClient(to, profileName);
  const productResponse = await supabase.from('wr_produtos').select('*').eq('id', productId).maybeSingle();
  if (productResponse.error || !productResponse.data) return sendText(to, 'Esse produto não foi encontrado. Digite MENU para tentar novamente.');
  const product = productResponse.data;
  const deliveryDate = await getConfig('proxima_entrega', null);
  const payload = {
    codigo: `WR-BOT-${Date.now().toString(36).toUpperCase()}`,
    cliente_id: client.id,
    cliente_nome: client.nome,
    cliente_telefone: client.telefone,
    produto_id: product.id,
    produto_nome: product.nome,
    quantidade: 1,
    preco_unitario: Number(product.preco || 0),
    total: Number(product.preco || 0),
    tipo_entrega: 'A confirmar',
    forma_pagamento: 'A confirmar',
    status_pagamento: 'Pendente',
    status_pedido: 'Pendente',
    data_entrega: deliveryDate,
    observacoes: 'Pedido iniciado automaticamente pelo WhatsApp. Confirmar quantidade, entrega e pagamento com o cliente.',
  };
  const created = await supabase.from('wr_pedidos').insert([payload]).select('*').single();
  if (created.error) throw created.error;
  await sendText(to, `Reserva iniciada com sucesso! Produto: ${product.nome}. Quantidade inicial: 1. Nossa equipe confirmará entrega e pagamento. Código: ${payload.codigo}.`);
}

async function latestOrder(to: string) {
  const supabase = getSupabaseAdmin();
  const phones = [localBrazilPhone(to), normalizePhone(to)];
  const { data, error } = await supabase.from('wr_pedidos').select('*').in('cliente_telefone', phones).order('criado_em', { ascending: false }).limit(1);
  if (error) throw error;
  const order = data?.[0];
  if (!order) return sendText(to, 'Não encontrei pedidos para este número. Digite PEDIDO para iniciar uma reserva.');
  return sendText(to, `Seu pedido ${order.codigo || ''}: ${order.produto_nome || 'produto'} · quantidade ${order.quantidade || 1} · status ${order.status_pedido || 'Pendente'} · pagamento ${order.status_pagamento || 'Pendente'}.`);
}

async function processMessage(message: any, contact: any) {
  const to = normalizePhone(message.from);
  const id = message?.interactive?.button_reply?.id || message?.interactive?.list_reply?.id || '';
  const text = textOf(message).toLowerCase();
  if (message.id) markMessageRead(message.id).catch(() => undefined);

  if (String(id).startsWith('produto:')) return createOrderFromProduct(to, String(id).split(':')[1], contact?.profile?.name || '');
  if (id === 'menu_produtos' || /pedido|comprar|reservar|queijo|leite/.test(text)) return showProducts(to);
  if (id === 'menu_pedido' || /meu pedido|status|acompanhar/.test(text)) return latestOrder(to);
  if (id === 'menu_atendente' || /atendente|humano|wilson|rosely/.test(text)) return sendText(to, 'Certo. Encaminhei sua solicitação para um atendente da Queijos WR.');
  return showMenu(to);
}

export default async function handler(req: any, res: any) {
  if (req.method === 'GET') {
    const mode = String(req.query['hub.mode'] || '');
    const token = String(req.query['hub.verify_token'] || '');
    const challenge = String(req.query['hub.challenge'] || '');
    if (mode === 'subscribe' && token && token === process.env.META_WEBHOOK_VERIFY_TOKEN) return res.status(200).send(challenge);
    return res.status(403).send('Verificação recusada.');
  }
  if (req.method !== 'POST') return res.status(405).json({ ok: false });

  try {
    const rawBody = await readRawBody(req);
    if (!verifyMetaSignature(rawBody, req.headers['x-hub-signature-256'])) return res.status(401).json({ ok: false, error: 'Assinatura inválida.' });
    const body = JSON.parse(rawBody.toString('utf8'));
    res.status(200).json({ ok: true });
    const changes = body?.entry?.flatMap((entry: any) => entry?.changes || []) || [];
    for (const change of changes) {
      const value = change?.value || {};
      for (const message of value.messages || []) {
        const contact = (value.contacts || []).find((item: any) => item.wa_id === message.from) || value.contacts?.[0];
        await processMessage(message, contact);
      }
    }
  } catch (error) {
    console.error('Meta webhook:', error);
    if (!res.headersSent) return res.status(500).json({ ok: false });
  }
}
