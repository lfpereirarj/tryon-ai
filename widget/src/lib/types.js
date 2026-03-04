/**
 * @typedef {Object} StorefrontContext
 * @property {string} platform - Identificador da plataforma. Ex: "vtex"
 * @property {string} storeApiKey - UUID da loja cadastrada no TryOn
 * @property {string} skuId - SKU do produto na PDP
 * @property {string} productId - ID do produto pai
 * @property {string} productImageUrl - URL pública da imagem do produto
 * @property {string} [currency] - Código ISO 4217. Ex: "BRL"
 * @property {number} [price] - Preço do produto no momento da exibição
 */

/**
 * @typedef {Object} StorefrontContextResult
 * @property {StorefrontContext|null} context - Contexto resolvido ou null se inválido
 * @property {string|null} error - Mensagem de erro legível pelo usuário
 */

/**
 * @typedef {Object} TryOnWidgetConfig
 * @property {string} storeApiKey - UUID da loja (obrigatório)
 * @property {string} [apiUrl] - URL base da API. Default: window.location.origin
 * @property {string} [platform] - Plataforma de e-commerce. Default: "vtex"
 */

/**
 * Validates a StorefrontContext object.
 * @param {Partial<StorefrontContext>} ctx
 * @returns {StorefrontContextResult}
 */
export function validateStorefrontContext(ctx) {
  const required = ['platform', 'storeApiKey', 'skuId', 'productId', 'productImageUrl'];

  for (const field of required) {
    if (!ctx[field] || typeof ctx[field] !== 'string' || ctx[field].trim() === '') {
      return {
        context: null,
        error: `Campo obrigatório ausente ou inválido: ${field}`,
      };
    }
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(ctx.storeApiKey)) {
    return { context: null, error: 'storeApiKey deve ser um UUID válido.' };
  }

  try {
    new URL(ctx.productImageUrl);
  } catch {
    return { context: null, error: 'productImageUrl deve ser uma URL válida.' };
  }

  return {
    context: /** @type {StorefrontContext} */ (ctx),
    error: null,
  };
}
