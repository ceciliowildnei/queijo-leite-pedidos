import { createClient } from '@supabase/supabase-js';

const SYNC_KEYS = [
  'qlp_clientes',
  'qlp_produtos',
  'qlp_pedidos',
  'qlp_admins',
  'qlp_whatsapp_negocio',
] as const;

const APP_ID = 'queijos-wr-pedidos';
const DEFAULT_SUPABASE_URL = 'https://ywwztahbqgiwervbwudg.supabase.co';
const DEFAULT_SUPABASE_KEY = 'sb_publishable_er0Z1O0s1opKniqu3cYkGg_svVBvXRx';
const url = import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_KEY;

const syncEnabled = Boolean(url && anonKey);

function isSyncKey(key: string) {
  return (SYNC_KEYS as readonly string[]).includes(key);
}

function safeJsonParse(value: string | null) {
  if (value === null) return null;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function stringifyValue(value: unknown) {
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
}

function getLocalUpdatedAt(key: string) {
  return localStorage.getItem(`${key}_updated_at`) || '';
}

function setLocalUpdatedAt(key: string, updatedAt: string) {
  localStorage.setItem(`${key}_updated_at`, updatedAt);
}

if (syncEnabled) {
  const supabase = createClient(url, anonKey);
  const originalSetItem = Storage.prototype.setItem;
  let pulling = false;

  async function pushKey(key: string, value: string) {
    if (!isSyncKey(key) || pulling) return;
    const updatedAt = new Date().toISOString();
    setLocalUpdatedAt(key, updatedAt);

    await supabase.from('app_state').upsert({
      app_id: APP_ID,
      key,
      value: safeJsonParse(value),
      updated_at: updatedAt,
    });
  }

  Storage.prototype.setItem = function patchedSetItem(key: string, value: string) {
    originalSetItem.call(this, key, value);
    if (this === window.localStorage && isSyncKey(key)) {
      pushKey(key, value).catch((error) => {
        console.warn('Falha ao sincronizar com Supabase:', error);
      });
    }
  };

  async function pullAll({ reloadOnChange }: { reloadOnChange: boolean }) {
    const { data, error } = await supabase
      .from('app_state')
      .select('key,value,updated_at')
      .eq('app_id', APP_ID)
      .in('key', [...SYNC_KEYS]);

    if (error) {
      console.warn('Falha ao buscar dados do Supabase:', error);
      return;
    }

    pulling = true;
    let changed = false;

    for (const row of data || []) {
      const key = String(row.key);
      const remoteUpdatedAt = String(row.updated_at || '');
      const localUpdatedAt = getLocalUpdatedAt(key);
      const remoteValue = stringifyValue(row.value);
      const localValue = localStorage.getItem(key);

      if (remoteUpdatedAt && remoteUpdatedAt > localUpdatedAt && remoteValue !== localValue) {
        originalSetItem.call(localStorage, key, remoteValue);
        setLocalUpdatedAt(key, remoteUpdatedAt);
        changed = true;
      }
    }

    pulling = false;

    if (changed && reloadOnChange) {
      window.location.reload();
    }
  }

  await pullAll({ reloadOnChange: false });

  window.addEventListener('focus', () => {
    pullAll({ reloadOnChange: true }).catch((error) => {
      console.warn('Falha ao atualizar dados:', error);
    });
  });

  setInterval(() => {
    pullAll({ reloadOnChange: true }).catch((error) => {
      console.warn('Falha ao atualizar dados:', error);
    });
  }, 12000);
} else {
  console.info('Supabase não configurado. O sistema continuará usando dados locais neste aparelho.');
}
