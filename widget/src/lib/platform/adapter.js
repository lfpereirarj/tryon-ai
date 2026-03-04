/**
 * @typedef {{ success: boolean, error?: string }} CartResult
 */

/**
 * PlatformAdapter — interface para leitura de contexto de storefront.
 *
 * Cada plataforma (VTEX, Shopify, etc.) implementa este contrato.
 * O core do widget nunca acessa APIs de plataforma diretamente.
 *
 * @typedef {Object} PlatformAdapter
 * @property {string} platform - Identificador da plataforma implementada
 * @property {() => Promise<import('../types.js').StorefrontContextResult>} getContext
 *   Lê o contexto da PDP atual e retorna um StorefrontContextResult.
 *   Nunca lança exceção — erros são encapsulados no campo `error`.
 * @property {(skuId: string) => Promise<CartResult>} addToCart
 *   Adiciona o SKU ao carrinho da plataforma.
 *   Nunca lança exceção — erros são encapsulados no campo `error`.
 */

/**
 * Cria um adapter nulo de fallback (retorna erro imediato).
 * Usado quando a plataforma não é reconhecida.
 *
 * @param {string} platformName
 * @returns {PlatformAdapter}
 */
export function createNullAdapter(platformName) {
  return {
    platform: platformName,
    getContext: async () => ({
      context: null,
      error: `Plataforma não suportada: "${platformName}". Implemente um PlatformAdapter.`,
    }),
    addToCart: async () => ({
      success: false,
      error: `addToCart não implementado para a plataforma "${platformName}".`,
    }),
  };
}
