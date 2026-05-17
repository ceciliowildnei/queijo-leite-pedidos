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

function byIdOrPhone(item: any) {
  return String(item?.id || item?.telefone || item?.phone || Math.random());
}

function mergeArrayById(localValue: unknown, remoteValue: unknown, key: string) {
  if (!Array.isArray(localValue) || !Array.isArray(remoteValue)) return remoteValue;
  const map = new Map<string, any>();

  for (const item of remoteValue) {
    map.set(byIdOrPhone(item), item);
  }

  for (const localItem of localValue) {
    const id = byIdOrPhone(localItem);
    const remoteItem = map.get(id);

    if (!remoteItem) {
      map.set(id, localItem);
      continue;
    }

    const merged = { ...remoteItem, ...localItem };

    if (key === 'qlp_admins') {
      merged.pin = localItem?.pin || remoteItem?.pin || '';
      merged.nome = localItem?.nome || remoteItem?.nome || '';
      merged.telefone = localItem?.telefone || remoteItem?.telefone || '';
      merged.papel = localItem?.papel || remoteItem?.papel || 'Administrador';
    }

    map.set(id, merged);
  }

  return [...map.values()];
}

function mergeValues(key: string, localRaw: string | null, remoteRawValue: unknown) {
  const localValue = safeJsonParse(localRaw);

  if (key === 'qlp_admins' || key === 'qlp_clientes' || key === 'qlp_pedidos' || key === 'qlp_produtos') {
    return mergeArrayById(localValue, remoteRawValue, key);
  }

  return remoteRawValue;
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
    let shouldPushMerged = false;

    for (const row of data || []) {
      const key = String(row.key);
      const remoteUpdatedAt = String(row.updated_at || '');
      const localUpdatedAt = getLocalUpdatedAt(key);
      const localValue = localStorage.getItem(key);
      const mergedValue = mergeValues(key, localValue, row.value);
      const mergedText = stringifyValue(mergedValue);
      const remoteText = stringifyValue(row.value);

      if (mergedText !== localValue) {
        originalSetItem.call(localStorage, key, mergedText);
        setLocalUpdatedAt(key, remoteUpdatedAt || new Date().toISOString());
        changed = true;
      }

      if (mergedText !== remoteText || (localUpdatedAt && localUpdatedAt > remoteUpdatedAt)) {
        shouldPushMerged = true;
        await supabase.from('app_state').upsert({
          app_id: APP_ID,
          key,
          value: safeJsonParse(mergedText),
          updated_at: new Date().toISOString(),
        });
      }
    }

    pulling = false;

    if ((changed || shouldPushMerged) && reloadOnChange) {
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
