import { getSupabaseAdmin } from '@/lib/clients/supabase';

export const ATTRIBUTION_WINDOW_MS = 24 * 60 * 60 * 1000;

export interface LastTryOnEntry {
  sessionId: string;
  skuId: string;
  createdAt: string;
}

export async function getLastTryOnInWindow(
  sessionId: string,
): Promise<LastTryOnEntry | null> {
  const supabase = getSupabaseAdmin();
  const windowStart = new Date(Date.now() - ATTRIBUTION_WINDOW_MS).toISOString();

  const { data, error } = await supabase
    .from('tryon_sessions')
    .select('session_id, sku_id, created_at')
    .eq('session_id', sessionId)
    .eq('status', 'completed')
    .gte('created_at', windowStart)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return null;

  return {
    sessionId: data.session_id as string,
    skuId: data.sku_id as string,
    createdAt: data.created_at as string,
  };
}

export async function isInfluencedOrder(
  sessionId: string,
  purchasedSkuId: string,
): Promise<boolean> {
  const lastTryOn = await getLastTryOnInWindow(sessionId);

  if (!lastTryOn) return false;

  return lastTryOn.skuId === purchasedSkuId;
}

export async function recordInfluencedOrder(input: {
  storeId: string;
  sessionId: string;
  skuId: string;
  orderId: string;
  orderRevenue: number;
  currency: string;
}): Promise<void> {
  const supabase = getSupabaseAdmin();

  const { error } = await supabase.from('tracking_events').insert({
    event_name: 'influenced_order',
    store_id: input.storeId,
    session_id: input.sessionId,
    sku_id: input.skuId,
    timestamp: new Date().toISOString(),
    metadata: {
      order_id: input.orderId,
      order_revenue: input.orderRevenue,
      currency: input.currency,
    },
  });

  if (error) {
    console.error('[Attribution] Falha ao registrar influenced_order:', error.message);
  }
}

export async function processOrderEvent(input: {
  storeId: string;
  sessionId: string;
  skuId: string;
  orderId: string;
  orderRevenue: number;
  currency: string;
}): Promise<boolean> {
  const influenced = await isInfluencedOrder(input.sessionId, input.skuId);
  if (!influenced) return false;
  await recordInfluencedOrder(input);
  return true;
}
