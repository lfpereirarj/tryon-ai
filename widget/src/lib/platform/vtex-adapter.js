/**
 * VtexAdapter — lê o contexto da PDP em storefronts VTEX.
 *
 * Suporta as duas arquiteturas principais:
 *  - VTEX IO (React-based): window.__RUNTIME__.route.params + product context
 *  - VTEX Legacy/SmartCheckout: window.skuJson + window.vtxctx
 *
 * Fallback final: scraping do DOM (elemento com data-sku, og:image etc.)
 *
 * @param {string} storeApiKey - UUID da loja cadastrada no TryOn
 * @returns {import('./adapter.js').PlatformAdapter}
 */
export function createVtexAdapter(storeApiKey) {
  return {
    platform: 'vtex',
    getContext: async () => {
      try {
        const ctx = readVtexIo(storeApiKey)
          ?? readVtexLegacy(storeApiKey)
          ?? readFromDom(storeApiKey);

        if (!ctx) {
          return {
            context: null,
            error: 'Não foi possível ler o contexto do produto VTEX. Verifique se o widget está numa PDP.',
          };
        }

        return { context: ctx, error: null };
      } catch (err) {
        return {
          context: null,
          error: `VtexAdapter: erro ao ler contexto — ${err instanceof Error ? err.message : String(err)}`,
        };
      }
    },
    addToCart: async (skuId) => {
      try {
        const win = /** @type {any} */ (window);

        if (win.vtexjs?.checkout) {
          await win.vtexjs.checkout.addToCart([
            { id: Number(skuId), quantity: 1, seller: '1' },
          ]);
          return { success: true };
        }

        const res = await fetch('/api/checkout/pub/orderForm/items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderItems: [{ id: skuId, quantity: 1, seller: '1' }],
          }),
        });

        if (!res.ok) {
          return { success: false, error: 'Não foi possível adicionar ao carrinho.' };
        }

        return { success: true };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : 'Erro ao adicionar ao carrinho.',
        };
      }
    },
  };
}

/**
 * Tenta ler o contexto via VTEX IO.
 * A VTEX IO expõe dados de produto em window.__STORE_PRODUCT__  
 * ou via window.vtex.productDataLayer (variante mais comum).
 *
 * @param {string} storeApiKey
 * @returns {import('../types.js').StorefrontContext|null}
 */
function readVtexIo(storeApiKey) {
  const win = /** @type {any} */ (window);

  const product = win.__STORE_PRODUCT__
    || win.vtex?.productDataLayer?.product
    || win.__RUNTIME__?.route?.params?.skuId && win.__RUNTIME__?.queryData;

  if (!product) return null;

  const skuId = String(product.selectedSku?.itemId || product.skuId || product.sku || '');
  const productId = String(product.productId || product.id || '');
  const productImageUrl = product.selectedSku?.images?.[0]?.imageUrl
    || product.images?.[0]?.imageUrl
    || product.image
    || '';

  if (!skuId || !productId || !productImageUrl) return null;

  return {
    platform: 'vtex',
    storeApiKey,
    skuId,
    productId,
    productImageUrl,
    currency: product.currency || 'BRL',
    price: product.selectedSku?.sellers?.[0]?.commertialOffer?.Price,
  };
}

/**
 * Tenta ler o contexto via VTEX Legacy (SmartCheckout / CMS).
 * window.skuJson é injetado pelo CMS da VTEX em páginas de produto.
 *
 * @param {string} storeApiKey
 * @returns {import('../types.js').StorefrontContext|null}
 */
function readVtexLegacy(storeApiKey) {
  const win = /** @type {any} */ (window);
  const skuJson = win.skuJson;

  if (!skuJson) return null;

  const skuId = String(skuJson.skuId || '');
  const productId = String(skuJson.productId || skuJson.CacheVersionUsedToCallService || '');
  const sku = skuJson.skus?.find((/** @type {any} */ s) => String(s.sku) === skuId) || skuJson.skus?.[0];
  const productImageUrl = sku?.image || sku?.imageUrl || '';

  if (!skuId || !productImageUrl) return null;

  return {
    platform: 'vtex',
    storeApiKey,
    skuId,
    productId: productId || skuId,
    productImageUrl,
    currency: 'BRL',
  };
}

/**
 * Último recurso: tenta ler do DOM via meta tags e data-attributes.
 * Funciona em implementações customizadas que seguem boas práticas de SEO.
 *
 * @param {string} storeApiKey
 * @returns {import('../types.js').StorefrontContext|null}
 */
function readFromDom(storeApiKey) {
  const getContentByName = (/** @type {string} */ name) =>
    document.querySelector(`meta[property="${name}"]`)?.getAttribute('content')
    || document.querySelector(`meta[name="${name}"]`)?.getAttribute('content')
    || null;

  const skuId = document.querySelector('[data-sku-id]')?.getAttribute('data-sku-id')
    || document.querySelector('[data-product-sku]')?.getAttribute('data-product-sku')
    || null;

  const productId = document.querySelector('[data-product-id]')?.getAttribute('data-product-id')
    || null;

  const productImageUrl = getContentByName('og:image');

  if (!skuId || !productImageUrl) return null;

  return {
    platform: 'vtex',
    storeApiKey,
    skuId,
    productId: productId || skuId,
    productImageUrl,
  };
}
