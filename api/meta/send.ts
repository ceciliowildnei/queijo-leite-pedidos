import { sendButtons, sendTemplate, sendText } from '../../lib/meta.js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Método não permitido.' });

  const adminSecret = String(process.env.WR_ADMIN_API_SECRET || '');
  const authorization = String(req.headers.authorization || '');
  if (!adminSecret || authorization !== `Bearer ${adminSecret}`) {
    return res.status(401).json({ ok: false, error: 'Não autorizado.' });
  }

  try {
    const { to, type = 'text', text, template, language = 'pt_BR', components = [], buttons = [] } = req.body || {};
    if (!to) return res.status(400).json({ ok: false, error: 'Informe o telefone.' });

    let result;
    if (type === 'template') {
      if (!template) return res.status(400).json({ ok: false, error: 'Informe o nome do modelo aprovado.' });
      result = await sendTemplate(to, template, language, components);
    } else if (type === 'buttons') {
      if (!text || !buttons.length) return res.status(400).json({ ok: false, error: 'Informe texto e botões.' });
      result = await sendButtons(to, text, buttons);
    } else {
      if (!text) return res.status(400).json({ ok: false, error: 'Informe a mensagem.' });
      result = await sendText(to, text);
    }

    return res.status(200).json({ ok: true, result });
  } catch (error: any) {
    return res.status(error?.status || 500).json({ ok: false, error: error?.message || 'Falha no envio.', details: error?.details });
  }
}
