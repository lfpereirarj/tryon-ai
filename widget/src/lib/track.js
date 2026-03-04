/**
 * @typedef {'tryon_view'|'tryon_upload'|'tryon_generated'|'tryon_add_to_cart'|'order_completed'|'influenced_order'} TrackingEventName
 */

/**
 * Envia um evento de tracking para o servidor.
 * Fire-and-forget — nunca lança exceção nem bloqueia a UI.
 * Usa sendBeacon quando disponível (seguro em page-unload), fallback para fetch.
 *
 * @param {Object} params
 * @param {string} params.apiUrl
 * @param {string} params.storeApiKey
 * @param {string} params.sessionId
 * @param {string} params.skuId
 * @param {TrackingEventName} params.eventName
 * @param {Record<string, unknown>} [params.metadata]
 */
export function sendEvent({ apiUrl, storeApiKey, sessionId, skuId, eventName, metadata }) {
  if (!apiUrl || !storeApiKey || !sessionId || !skuId) return;

  try {
    const url = `${apiUrl}/api/tracking`;
    const body = JSON.stringify({
      storeApiKey,
      sessionId,
      skuId,
      eventName,
      timestamp: new Date().toISOString(),
      ...(metadata ? { metadata } : {}),
    });

    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }));
    } else {
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      }).catch(() => {});
    }
  } catch {}
}
