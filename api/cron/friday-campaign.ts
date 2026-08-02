import { getConfig, publishInstagramImage, sendTemplate, setConfig } from '../../lib/meta.js';

export default async function handler(req: any, res: any) {
  const secret = String(process.env.CRON_SECRET || '');
  if (!secret || String(req.headers.authorization || '') !== `Bearer ${secret}`) {
    return res.status(401).json({ ok: false, error: 'Não autorizado.' });
  }

  try {
    const enabled = await getConfig('meta_campanha_sexta_ativa', false);
    if (!enabled) return res.status(200).json({ ok: true, skipped: true, reason: 'Campanha desativada.' });

    const contacts = await getConfig<any[]>('meta_contatos_marketing', []);
    const template = await getConfig('meta_template_sexta', 'oferta_queijos_semana');
    const language = await getConfig('meta_template_idioma', 'pt_BR');
    const lastRun = await getConfig('meta_campanha_ultima_execucao', '');
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
    if (lastRun === today) return res.status(200).json({ ok: true, skipped: true, reason: 'Campanha já executada hoje.' });

    const recipients = contacts.filter(contact => contact?.ativo === true && contact?.consentimento === true && contact?.telefone);
    const results: any[] = [];
    for (const contact of recipients) {
      try {
        const components = contact?.nome ? [{ type: 'body', parameters: [{ type: 'text', text: String(contact.nome) }] }] : [];
        const result = await sendTemplate(contact.telefone, template, language, components);
        results.push({ telefone: contact.telefone, ok: true, messageId: result?.messages?.[0]?.id });
      } catch (error: any) {
        results.push({ telefone: contact.telefone, ok: false, error: error?.message || 'Falha no envio.' });
      }
    }

    const instagram = await getConfig<any>('meta_instagram_sexta', null);
    let instagramResult: any = null;
    if (instagram?.ativo && instagram?.imageUrl) {
      try {
        instagramResult = await publishInstagramImage({
          imageUrl: instagram.imageUrl,
          caption: instagram.caption || '',
          mediaType: instagram.mediaType === 'STORIES' ? 'STORIES' : 'FEED',
        });
      } catch (error: any) {
        instagramResult = { ok: false, error: error?.message || 'Falha na publicação.' };
      }
    }

    await setConfig('meta_campanha_ultima_execucao', today);
    await setConfig('meta_campanha_ultimo_resultado', { executadoEm: new Date().toISOString(), whatsapp: results, instagram: instagramResult });
    return res.status(200).json({ ok: true, sent: results.filter(item => item.ok).length, failed: results.filter(item => !item.ok).length, instagram: instagramResult });
  } catch (error: any) {
    return res.status(500).json({ ok: false, error: error?.message || 'Falha na campanha.' });
  }
}
