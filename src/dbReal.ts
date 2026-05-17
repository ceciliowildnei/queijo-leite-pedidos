import { createClient } from '@supabase/supabase-js';

export const ADMIN_PRINCIPAL = '18997232533';
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const db = createClient(supabaseUrl, supabaseKey);

export const nums = (v: string) => String(v || '').replace(/[^0-9]/g, '');
export const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
export const money = (v: number) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const today = () => new Date().toISOString().slice(0, 10);
export const nextFriday = () => { const d = new Date(); d.setDate(d.getDate() + ((5 - d.getDay() + 7) % 7)); return d.toISOString().slice(0, 10); };
export const address = (c?: any) => c ? [c.rua, c.numero, c.bairro, c.cidade, c.estado].filter(Boolean).join(', ') : '';

export async function loadAll() {
  const admins = await db.from('qlp_admins').select('*').order('nome');
  const clientes = await db.from('qlp_clientes').select('*').order('created_at', { ascending: false });
  const produtos = await db.from('qlp_produtos').select('*').order('nome');
  const pedidos = await db.from('qlp_pedidos').select('*').order('created_at', { ascending: false });
  if (admins.error) throw admins.error;
  if (clientes.error) throw clientes.error;
  if (produtos.error) throw produtos.error;
  if (pedidos.error) throw pedidos.error;
  return { admins: admins.data || [], clientes: clientes.data || [], produtos: produtos.data || [], pedidos: pedidos.data || [] };
}
