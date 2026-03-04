/**
 * store.service.ts — CRUD de lojas (multi-tenant)
 *
 * Todas as operações usam o Supabase Admin Client (service role).
 * A criação de storeApiKey garante unicidade via UUID v4.
 */
import { randomUUID } from 'node:crypto';

import { getSupabaseAdmin } from '@/lib/clients/supabase';
import type {
  CreateStoreInput,
  StoreStatus,
  StorePlan,
  UpdateStoreInput,
} from '@/lib/contracts/admin';

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export interface StoreRow {
  id: string;
  name: string;
  domain: string | null;
  public_api_key: string;
  status: StoreStatus;
  plan: StorePlan;
  allowed_origins: string[];
  created_at: string;
  updated_at: string;
}

export interface StoreUserRow {
  id: string;
  store_id: string;
  user_id: string;
  role: string;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Listagem
// ---------------------------------------------------------------------------

export async function listStores(): Promise<StoreRow[]> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('stores')
    .select('id, name, domain, public_api_key, status, plan, allowed_origins, created_at, updated_at')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[Store] Falha ao listar lojas:', error.message);
    return [];
  }

  return (data ?? []) as StoreRow[];
}

// ---------------------------------------------------------------------------
// Busca por ID
// ---------------------------------------------------------------------------

export async function getStoreById(storeId: string): Promise<StoreRow | null> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('stores')
    .select('id, name, domain, public_api_key, status, plan, allowed_origins, created_at, updated_at')
    .eq('id', storeId)
    .single();

  if (error || !data) return null;

  return data as StoreRow;
}

// ---------------------------------------------------------------------------
// Criação
// ---------------------------------------------------------------------------

export async function createStore(input: CreateStoreInput): Promise<StoreRow> {
  const supabase = getSupabaseAdmin();

  const publicApiKey = randomUUID();

  const { data, error } = await supabase
    .from('stores')
    .insert({
      name: input.name,
      domain: input.domain ?? null,
      public_api_key: publicApiKey,
      plan: input.plan ?? 'free',
      status: 'active',
      allowed_origins: [],
    })
    .select('id, name, domain, public_api_key, status, plan, allowed_origins, created_at, updated_at')
    .single();

  if (error || !data) {
    throw new Error(`[Store] Falha ao criar loja: ${error?.message}`);
  }

  return data as StoreRow;
}

// ---------------------------------------------------------------------------
// Atualização
// ---------------------------------------------------------------------------

export async function updateStore(
  storeId: string,
  input: UpdateStoreInput,
): Promise<StoreRow | null> {
  const supabase = getSupabaseAdmin();

  const patch: Record<string, unknown> = {};
  if (input.name !== undefined) patch.name = input.name;
  if (input.domain !== undefined) patch.domain = input.domain ?? null;
  if (input.plan !== undefined) patch.plan = input.plan;
  if (input.status !== undefined) patch.status = input.status;
  if (input.allowedOrigins !== undefined) patch.allowed_origins = input.allowedOrigins;

  if (Object.keys(patch).length === 0) {
    // Nada a atualizar — retorna estado atual
    return getStoreById(storeId);
  }

  const { data, error } = await supabase
    .from('stores')
    .update(patch)
    .eq('id', storeId)
    .select('id, name, domain, public_api_key, status, plan, allowed_origins, created_at, updated_at')
    .single();

  if (error || !data) {
    console.error('[Store] Falha ao atualizar loja:', error?.message);
    return null;
  }

  return data as StoreRow;
}

// ---------------------------------------------------------------------------
// Usuários de loja
// ---------------------------------------------------------------------------

export async function listStoreUsers(storeId: string): Promise<StoreUserRow[]> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('store_users')
    .select('id, store_id, user_id, role, created_at')
    .eq('store_id', storeId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[StoreUsers] Falha ao listar usuários:', error.message);
    return [];
  }

  return (data ?? []) as StoreUserRow[];
}

export async function addStoreUser(
  storeId: string,
  userId: string,
  role: string,
): Promise<StoreUserRow> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('store_users')
    .upsert(
      { store_id: storeId, user_id: userId, role },
      { onConflict: 'store_id,user_id' },
    )
    .select('id, store_id, user_id, role, created_at')
    .single();

  if (error || !data) {
    throw new Error(`[StoreUsers] Falha ao adicionar usuário: ${error?.message}`);
  }

  return data as StoreUserRow;
}
