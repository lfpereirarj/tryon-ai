import { getSupabaseAdmin } from '@/lib/clients/supabase';

export interface StoreRecord {
  id: string;
  public_api_key: string;
  allowed_origins: string[];
  status: string;
}

export interface CreateSessionInput {
  storeId: string;
  sessionId: string;
  skuId: string;
  originalImagePath: string;
  originalImageKey: string;
  generationTimeMs: number;
  expiresAt: Date;
}

export interface SessionRecord {
  id: string;
  store_id: string;
  session_id: string;
  sku_id: string;
  original_image_path: string;
  expires_at: string;
}

export async function findStoreByApiKey(
  apiKey: string,
): Promise<StoreRecord | null> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('stores')
    .select('id, public_api_key, allowed_origins, status')
    .eq('public_api_key', apiKey)
    .single();

  if (error || !data) return null;

  return {
    id: data.id as string,
    public_api_key: data.public_api_key as string,
    allowed_origins: (data.allowed_origins as string[] | null) ?? [],
    status: (data.status as string | null) ?? 'active',
  };
}

export async function createTryOnSession(
  input: CreateSessionInput,
): Promise<string | null> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('tryon_sessions')
    .insert({
      store_id: input.storeId,
      session_id: input.sessionId,
      sku_id: input.skuId,
      original_image_path: input.originalImagePath,
      original_image_key: input.originalImageKey,
      status: 'completed',
      generation_time_ms: input.generationTimeMs,
      expires_at: input.expiresAt.toISOString(),
    })
    .select('id')
    .single();

  if (error) {
    console.error('[Session] Falha ao criar tryon_session:', error.message);
    return null;
  }

  return data?.id as string | null;
}

export interface ExpiredSessionEntry {
  id: string;
  original_image_key: string;
}

export async function getExpiredSessions(
  limit = 200,
): Promise<ExpiredSessionEntry[]> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('tryon_sessions')
    .select('id, original_image_key')
    .lte('expires_at', new Date().toISOString())
    .eq('image_deleted', false)
    .limit(limit);

  if (error) {
    console.error('[Session] Falha ao buscar sessões expiradas:', error.message);
    return [];
  }

  return (data ?? []) as ExpiredSessionEntry[];
}

export async function markSessionsImageDeleted(ids: string[]): Promise<void> {
  if (ids.length === 0) return;

  const supabase = getSupabaseAdmin();

  const { error } = await supabase
    .from('tryon_sessions')
    .update({ image_deleted: true, deleted_at: new Date().toISOString() })
    .in('id', ids);

  if (error) {
    console.error('[Session] Falha ao marcar sessões como deletadas:', error.message);
  }
}
