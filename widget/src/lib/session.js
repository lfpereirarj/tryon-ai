const SESSION_KEY = 'tryon_session_id';

/**
 * Gera um UUID v4 simples via crypto.randomUUID se disponível,
 * com fallback para Math.random em ambientes mais antigos.
 *
 * @returns {string}
 */
function generateUuid() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Retorna o sessionId estável para este navegador/dispositivo.
 *
 * O sessionId é gerado uma única vez e persiste em localStorage.
 * Identifica o mesmo dispositivo entre sessões para atribuição de pedidos.
 *
 * @returns {string} UUID estável
 */
export function getOrCreateSessionId() {
  try {
    const stored = localStorage.getItem(SESSION_KEY);
    if (stored && stored.trim() !== '') return stored;

    const id = generateUuid();
    localStorage.setItem(SESSION_KEY, id);
    return id;
  } catch {
    return generateUuid();
  }
}
