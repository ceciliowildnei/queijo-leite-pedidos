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

declare global {
  interface Window {
    qlpSyncNow?: () => Promise<void>;
    qlpSyncStatus?: string;
  }
}

function isSyncKey(key: string) {
  return (SYNC_KEYS as readonly string[]).includes(key);
}

function safeJsonParse(value: string | null) {
  if (value === null || value === undefined) return null;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function stringifyValue(value: unknown) {
  return JSON.stringify(value ?? null);
}

function getLocalUpdatedAt(key: string) {
  return localStorage.getItem(`${key}_updated_at`) || '';
}

function setLocalUpdatedAt(key: string, updatedAt: string) {
  localStorage.setItem(`${key}_updated_at`, updatedAt);
}

function getLocalDirty(key: string) {
  return localStorage.getItem(`${key}_dirty`) === '1';
}

function setLocalDirty(key: string, dirty: boolean) {
  if (dirty) localStorage.setItem(`${key}_dirty`, '1');
  else localStorage.removeItem(`${key}_dirty`);
}

function normalizePhone(value: any) {
  return String(value || '').replace(/\D/g, '');
}

function stableItemId(item: any) {
  return String(item?.id || normalizePhone(item?.telefone) || item?.codigo || item?.nome || Math.random());
}

function normalizeArray(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function mergeAdditiveArray(localValue: unknown, remoteValue: unknown) {
  const map = new Map<string, any>();

  for (const item of normalizeArray(remoteValue)) {
    map.set(stableItemId(item), item);
  }

  for (const item of normalizeArray(localValue)) {
    const id = stableItemId(item);
    map.set(id, { ...(map.get(id) || {}), ...item });
  }

  return [...map.values()];
}

function mergeWhenBothChanged(key: string, localValue: unknown, remoteValue: unknown) {
  if (key === 'qlp_clientes' || key === 'qlp_pedidos' || key === 'qlp_produtos') {
    return mergeAdditiveArray(localValue, remoteValue);
  }

  // Para administradores, a versão mais recente precisa vencer para respeitar exclusões.
  // Caso contrário, um administrador apagado voltaria pela mesclagem.
  return localValue;
}

if (syncEnabled) {
  const supabase = createClient(url, anonKey);
  const originalSetItem = Storage.prototype.setItem;
  let pulling = false;
  let syncing = false;
  let pendingSync = false;

  async function upsertKey(key: string, rawValue: string, updatedAt: string) {
    const { error } = await supabase.from('app_state').upsert({
      app_id: APP_ID,
      key,
      value: safeJsonParse(rawValue),
      updated_at: updatedAt,
    });

    if (error) throw error;
  }

  async function pushKey(key: string, value: string) {
    if (!isSyncKey(key) || pulling) return;
    const updatedAt = new Date().toISOString();
    setLocalUpdatedAt(key, updatedAt);
    setLocalDirty(key, true);

    try {
      await upsertKey(key, value, updatedAt);
      setLocalDirty(key, false);
      window.qlpSyncStatus = `Sincronizado: ${key}`;
    } catch (error) {
      setLocalDirty(key, true);
      window.qlpSyncStatus = `Falha ao sincronizar: ${key}`;
      console.warn('Falha ao sincronizar com Supabase:', error);
    }
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
    if (syncing) {
      pendingSync = true;
      return;
    }

    syncing = true;

    try {
      const { data, error } = await supabase
        .from('app_state')
        .select('key,value,updated_at')
        .eq('app_id', APP_ID)
        .in('key', [...SYNC_KEYS]);

      if (error) {
        window.qlpSyncStatus = 'Falha ao buscar dados online';
        console.warn('Falha ao buscar dados do Supabase:', error);
        return;
      }

      const rowsByKey = new Map<string, any>();
      for (const row of data || []) rowsByKey.set(String(row.key), row);

      pulling = true;
      let changed = false;

      for (const key of SYNC_KEYS) {
        const row = rowsByKey.get(key);
        const localRaw = localStorage.getItem(key);
        const localUpdatedAt = getLocalUpdatedAt(key);
        const localDirty = getLocalDirty(key);

        if (!row) {
          if (localRaw !== null) {
            const updatedAt = localUpdatedAt || new Date().toISOString();
            pulling = false;
            await upsertKey(key, localRaw, updatedAt);
            pulling = true;
            setLocalUpdatedAt(key, updatedAt);
            setLocalDirty(key, false);
          }
          continue;
        }

        const remoteUpdatedAt = String(row.updated_at || '');
        const remoteText = stringifyValue(row.value);

        // Se este aparelho tem alteração pendente ou mais nova, ele manda para o banco.
        if (localRaw !== null && (localDirty || (localUpdatedAt && localUpdatedAt > remoteUpdatedAt))) {
          const localValue = safeJsonParse(localRaw);
          const remoteValue = row.value;
          const finalValue = localDirty && remoteUpdatedAt && remoteUpdatedAt > localUpdatedAt
            ? mergeWhenBothChanged(key, localValue, remoteValue)
            : localValue;
          const finalText = stringifyValue(finalValue);
          const updatedAt = new Date().toISOString();

          originalSetItem.call(localStorage, key, finalText);
          setLocalUpdatedAt(key, updatedAt);
          pulling = false;
          await upsertKey(key, finalText, updatedAt);
          pulling = true;
          setLocalDirty(key, false);
          continue;
        }

        // Se o banco tem dado mais novo, atualiza este aparelho.
        if (remoteUpdatedAt > localUpdatedAt || localRaw === null) {
          if (remoteText !== localRaw) {
            originalSetItem.call(localStorage, key, remoteText);
            changed = true;
          }
          setLocalUpdatedAt(key, remoteUpdatedAt || new Date().toISOString());
          setLocalDirty(key, false);
          continue;
        }
      }

      pulling = false;
      window.qlpSyncStatus = 'Sincronizado';

      if (changed && reloadOnChange) {
        window.location.reload();
      }
    } finally {
      pulling = false;
      syncing = false;

      if (pendingSync) {
        pendingSync = false;
        setTimeout(() => pullAll({ reloadOnChange }).catch(console.warn), 250);
      }
    }
  }

  await pullAll({ reloadOnChange: false });

  window.qlpSyncNow = async () => {
    await pullAll({ reloadOnChange: true });
  };

  window.addEventListener('focus', () => {
    pullAll({ reloadOnChange: true }).catch((error) => {
      console.warn('Falha ao atualizar dados:', error);
    });
  });

  window.addEventListener('online', () => {
    pullAll({ reloadOnChange: true }).catch((error) => {
      console.warn('Falha ao atualizar dados:', error);
    });
  });

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      pullAll({ reloadOnChange: true }).catch((error) => {
        console.warn('Falha ao atualizar dados:', error);
      });
    }
  });

  setInterval(() => {
    pullAll({ reloadOnChange: true }).catch((error) => {
      console.warn('Falha ao atualizar dados:', error);
    });
  }, 5000);
} else {
  console.info('Supabase não configurado. O sistema continuará usando dados locais neste aparelho.');
}
