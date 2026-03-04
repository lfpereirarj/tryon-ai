/**
 * catalog.service.ts — Gestão do catálogo elegível por loja
 *
 * Fluxo principal:
 *  1. searchVtexProducts() → busca ao vivo na VTEX (sem salvar)
 *  2. addProductToTryon()  → adiciona produto escolhido ao catálogo
 *  3. removeFromCatalog()  → remove produto do catálogo
 *  4. listCatalog()        → lista paginada do catálogo local
 *  5. toggleSku()          → habilita/desabilita um SKU
 *  6. isSkuEnabled()       → verificação rápida usada no /api/generate
 */
import { getSupabaseAdmin } from '@/lib/clients/supabase';
import type {
  VtexSearchInput,
  AddProductInput,
  VtexSearchResult,
  ToggleSkuInput,
  ListCatalogInput,
  ProductRow,
  CatalogPage,
} from '@/lib/contracts/catalog';

// ---------------------------------------------------------------------------
// Tipos internos
// ---------------------------------------------------------------------------

interface ProductDbRow {
  id: string;
  store_id: string;
  sku_id: string;
  product_id: string | null;
  platform: string;
  name: string;
  image_url: string | null;
  price: number | null;
  department: string | null;
  enabled: boolean;
  enabled_at: string | null;
  disabled_at: string | null;
  disabled_reason: string | null;
  synced_at: string;
  created_at: string;
  updated_at: string;
}

// Resposta da API pública: /api/catalog_system/pub/products/search
interface VtexPublicSku {
  itemId: string;
  name: string;
  images: Array<{ imageUrl: string }>;
  sellers: Array<{
    commertialOffer: { ListPrice: number; Price: number; AvailableQuantity: number };
  }>;
}

interface VtexPublicProduct {
  productId: string;
  productName: string;
  categories: string[]; // ex: ["/Roupas/", "/Feminino/"]
  items: VtexPublicSku[];
}

// ---------------------------------------------------------------------------
// Mapeador
// ---------------------------------------------------------------------------

function toProductRow(r: ProductDbRow): ProductRow {
  return {
    id: r.id,
    storeId: r.store_id,
    skuId: r.sku_id,
    productId: r.product_id,
    platform: r.platform as ProductRow['platform'],
    name: r.name,
    imageUrl: r.image_url,
    price: r.price,
    department: r.department,
    enabled: r.enabled,
    enabledAt: r.enabled_at,
    disabledAt: r.disabled_at,
    disabledReason: r.disabled_reason,
    syncedAt: r.synced_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

// ---------------------------------------------------------------------------
// VTEX: busca produtos via API pública (sem autenticação)
//
// Endpoint: /api/catalog_system/pub/products/search
// ---------------------------------------------------------------------------

async function fetchVtexPublicSearch(
  account: string,
  { q, limit, page }: VtexSearchInput,
): Promise<VtexSearchResult[]> {
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const url = new URL(
    `https://${account}.vtexcommercestable.com.br/api/catalog_system/pub/products/search`,
  );
  url.searchParams.set('_from', String(from));
  url.searchParams.set('_to', String(to));
  url.searchParams.set('ft', q);

  const resp = await fetch(url.toString(), {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(15_000),
  });

  if (!resp.ok) {
    throw new Error(
      `[catalog] VTEX public search retornou HTTP ${resp.status} para conta "${account}".`,
    );
  }

  const products = (await resp.json()) as VtexPublicProduct[];
  if (!Array.isArray(products) || products.length === 0) return [];

  const results: VtexSearchResult[] = [];
  for (const product of products) {
    const topCategory =
      product.categories?.[product.categories.length - 1]
        ?.replace(/\//g, '')
        .trim() ?? null;

    for (const sku of product.items ?? []) {
      const listPrice = sku.sellers?.[0]?.commertialOffer?.ListPrice ?? null;
      results.push({
        skuId: sku.itemId,
        productId: product.productId,
        name: `${product.productName} — ${sku.name}`.trim(),
        imageUrl: sku.images?.[0]?.imageUrl ?? null,
        price: listPrice ? Math.round(listPrice * 100) / 100 : null,
        department: topCategory,
      });
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Operações públicas
// ---------------------------------------------------------------------------

/**
 * Busca produtos ao vivo na VTEX (API pública, sem token).
 * NÃO salva no banco — retorna resultados para o usuário escolher o que adicionar.
 */
export async function searchVtexProducts(
  storeId: string,
  input: VtexSearchInput,
): Promise<VtexSearchResult[]> {
  const supabase = getSupabaseAdmin();

  const { data: intRow } = await supabase
    .from('store_integrations')
    .select('account')
    .eq('store_id', storeId)
    .eq('platform', 'vtex')
    .maybeSingle();

  if (!intRow?.account) {
    throw new Error('Conta VTEX não configurada para esta loja. Acesse Configurações → Integração.');
  }

  return fetchVtexPublicSearch(intRow.account as string, input);
}

/**
 * Adiciona um único produto ao catálogo TryOn (upsert em store_products).
 * Produto adicionado começa habilitado por padrão.
 */
export async function addProductToTryon(
  storeId: string,
  input: AddProductInput,
): Promise<ProductRow> {
  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('store_products')
    .upsert(
      {
        store_id: storeId,
        platform: input.platform ?? 'vtex',
        sku_id: input.skuId,
        product_id: input.productId ?? null,
        name: input.name,
        image_url: input.imageUrl ?? null,
        price: input.price ?? null,
        department: input.department ?? null,
        enabled: true,
        enabled_at: now,
        synced_at: now,
      },
      { onConflict: 'store_id,platform,sku_id', ignoreDuplicates: false },
    )
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(`[catalog] addProductToTryon: ${error?.message}`);
  }

  return toProductRow(data as ProductDbRow);
}

/**
 * Remove um produto do catálogo TryOn (delete de store_products).
 */
export async function removeFromCatalog(
  storeId: string,
  productId: string,
): Promise<void> {
  const supabase = getSupabaseAdmin();

  const { error } = await supabase
    .from('store_products')
    .delete()
    .eq('id', productId)
    .eq('store_id', storeId); // isolamento cross-tenant

  if (error) throw new Error(`[catalog] removeFromCatalog: ${error.message}`);
}

/**
 * Lista o catálogo local com paginação + busca textual + filtro enabled.
 */
export async function listCatalog(
  storeId: string,
  params: ListCatalogInput,
): Promise<CatalogPage> {
  const supabase = getSupabaseAdmin();
  const { q, enabled, page, limit } = params;
  const offset = (page - 1) * limit;

  let query = supabase
    .from('store_products')
    .select('*', { count: 'exact' })
    .eq('store_id', storeId)
    .order('name', { ascending: true })
    .range(offset, offset + limit - 1);

  if (q) {
    query = query.ilike('name', `%${q}%`);
  }

  if (enabled !== 'all') {
    query = query.eq('enabled', enabled === 'true');
  }

  const { data, error, count } = await query;
  if (error) throw new Error(`[catalog] listCatalog: ${error.message}`);

  const total = count ?? 0;
  return {
    items: (data as ProductDbRow[]).map(toProductRow),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Habilita ou desabilita um SKU pelo seu ID de banco.
 */
export async function toggleSku(
  storeId: string,
  productId: string,
  input: ToggleSkuInput,
): Promise<ProductRow> {
  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();

  const updatePayload: Record<string, unknown> = {
    enabled: input.enabled,
    ...(input.enabled
      ? { enabled_at: now, disabled_at: null, disabled_reason: null }
      : { disabled_at: now, disabled_reason: input.reason ?? null }),
  };

  const { data, error } = await supabase
    .from('store_products')
    .update(updatePayload)
    .eq('id', productId)
    .eq('store_id', storeId) // isolamento cross-tenant
    .select('*')
    .single();

  if (error) throw new Error(`[catalog] toggleSku: ${error.message}`);
  if (!data) throw new Error('Produto não encontrado ou sem permissão.');

  return toProductRow(data as ProductDbRow);
}

/**
 * Verifica se um SKU está habilitado para try-on.
 * Retorna true se não houver registro (sem restrição) ou se enabled = true.
 * Retorna false explicitamente se enabled = false.
 */
export async function isSkuEnabled(
  storeId: string,
  skuId: string,
): Promise<boolean> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('store_products')
    .select('enabled')
    .eq('store_id', storeId)
    .eq('sku_id', skuId)
    .maybeSingle();

  if (error) {
    console.error(`[catalog] isSkuEnabled error: ${error.message}`);
    return true; // fail-open: não bloquear se houver erro de consulta
  }

  if (!data) return true; // SKU não cadastrado → sem restrição
  return (data as { enabled: boolean }).enabled;
}
