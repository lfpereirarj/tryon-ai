import { getSupabaseAdmin } from '@/lib/clients/supabase';
import { TrackingEvent } from '@/lib/contracts/v1';

export async function insertTrackingEvent(event: TrackingEvent): Promise<void> {
  const supabase = getSupabaseAdmin();

  const { error } = await supabase.from('tracking_events').insert({
    event_name: event.eventName,
    store_id: event.storeId,
    session_id: event.sessionId,
    sku_id: event.skuId,
    timestamp: event.timestamp,
    metadata: event.metadata ?? null,
  });

  if (error) {
    console.error('[Tracking] Falha ao inserir evento:', error.message);
    throw new Error(`Falha ao persistir evento de tracking: ${error.message}`);
  }
}
