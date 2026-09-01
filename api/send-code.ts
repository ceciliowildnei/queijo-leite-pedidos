declare const process: {
  env: {
    META_WHATSAPP_TOKEN?: string;
    META_WHATSAPP_PHONE_NUMBER_ID?: string;
    META_GRAPH_API_VERSION?: string;
  };
};

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Método não permitido.' });
  }

  try {
    const { phone, code } = req.body || {};
    const token = process.env.META_WHATSAPP_TOKEN;
    const phoneNumberId = process.env.META_WHATSAPP_PHONE_NUMBER_ID;
    const graphVersion = process.env.META_GRAPH_API_VERSION || 'v26.0';

    if (!phone || !code) {
      return res.status(400).json({ ok: false, error: 'Telefone e código são obrigatórios.' });
    }

    if (!token || !phoneNumberId) {
      return res.status(400).json({
        ok: false,
        error: 'API do WhatsApp não configurada. Configure META_WHATSAPP_TOKEN e META_WHATSAPP_PHONE_NUMBER_ID na Vercel.'
      });
    }

    const cleanPhone = String(phone).replace(/\D/g, '');
    const to = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    const message = `Seu código de acesso Queijos WR é: ${code}`;

    const response = await fetch(`https://graph.facebook.com/${graphVersion}/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: message }
      })
    });

    const result = await response.json();

    if (!response.ok) {
      return res.status(500).json({ ok: false, error: 'Falha ao enviar pelo WhatsApp.', details: result });
    }

    return res.status(200).json({ ok: true, result });
  } catch (error: any) {
    return res.status(500).json({ ok: false, error: error?.message || 'Erro inesperado.' });
  }
}
