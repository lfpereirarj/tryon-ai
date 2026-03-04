import { getSupabaseAdmin } from '@/lib/clients/supabase';

export interface KpiResult {
  totalGenerations: number;
  successCount: number;
  successRate: number;
  avgLatencyMs: number | null;
  influencedCount: number;
  influencedRevenue: number;
}

export async function getKpis(
  storeId: string,
  from: string,
  to: string,
): Promise<KpiResult> {
  const supabase = getSupabaseAdmin();

  const [generationsResult, influencedResult] = await Promise.all([
    supabase
      .from('tryon_sessions')
      .select('status, generation_time_ms')
      .eq('store_id', storeId)
      .gte('created_at', from)
      .lte('created_at', to),

    supabase
      .from('tracking_events')
      .select('metadata')
      .eq('store_id', storeId)
      .eq('event_name', 'influenced_order')
      .gte('timestamp', from)
      .lte('timestamp', to),
  ]);

  const sessions = generationsResult.data ?? [];
  const influenced = influencedResult.data ?? [];

  const totalGenerations = sessions.length;
  const successCount = sessions.filter((s) => s.status === 'completed').length;
  const successRate = totalGenerations > 0 ? successCount / totalGenerations : 0;

  const completedWithLatency = sessions.filter(
    (s) => s.status === 'completed' && typeof s.generation_time_ms === 'number',
  );
  const avgLatencyMs =
    completedWithLatency.length > 0
      ? completedWithLatency.reduce(
          (sum, s) => sum + (s.generation_time_ms as number),
          0,
        ) / completedWithLatency.length
      : null;

  const influencedCount = influenced.length;
  const influencedRevenue = influenced.reduce((sum, ev) => {
    const meta = ev.metadata as Record<string, unknown> | null;
    const revenue = typeof meta?.order_revenue === 'number' ? meta.order_revenue : 0;
    return sum + revenue;
  }, 0);

  return {
    totalGenerations,
    successCount,
    successRate,
    avgLatencyMs,
    influencedCount,
    influencedRevenue,
  };
}
