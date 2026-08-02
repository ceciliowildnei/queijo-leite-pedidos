import { env, graphVersion } from '../../lib/meta.js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'Método não permitido.' });

  const configured = {
    whatsappToken: Boolean(process.env.META_WHATSAPP_TOKEN),
    phoneNumberId: Boolean(process.env.META_WHATSAPP_PHONE_NUMBER_ID),
    verifyToken: Boolean(process.env.META_WEBHOOK_VERIFY_TOKEN),
    appSecret: Boolean(process.env.META_APP_SECRET),
    supabaseServiceRole: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    instagramToken: Boolean(process.env.META_INSTAGRAM_ACCESS_TOKEN),
    instagramUserId: Boolean(process.env.META_INSTAGRAM_USER_ID),
  };

  if (!configured.whatsappToken || !configured.phoneNumberId) {
    return res.status(200).json({ ok: false, connected: false, graphVersion: graphVersion(), configured });
  }

  try {
    const phoneNumberId = env('META_WHATSAPP_PHONE_NUMBER_ID');
    const token = env('META_WHATSAPP_TOKEN');
    const response = await fetch(`https://graph.facebook.com/${graphVersion()}/${phoneNumberId}?fields=display_phone_number,verified_name,quality_rating`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const result = await response.json();
    return res.status(response.ok ? 200 : 502).json({
      ok: response.ok,
      connected: response.ok,
      graphVersion: graphVersion(),
      configured,
      account: response.ok ? result : undefined,
      error: response.ok ? undefined : result?.error?.message || 'Não foi possível validar a conta.',
    });
  } catch (error: any) {
    return res.status(500).json({ ok: false, connected: false, configured, error: error?.message || 'Erro inesperado.' });
  }
}
