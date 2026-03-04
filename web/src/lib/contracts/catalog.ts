/**
 * catalog.ts — Contratos Zod para catálogo de produtos por loja
 */
import { z } from 'zod';

// ---------------------------------------------------------------------------
// Produto / SKU
// ---------------------------------------------------------------------------

export const CATALOG_PLATFORMS = ['vtex', 'shopify', 'nuvemshop'] as const;
export type CatalogPlatform = (typeof CATALOG_PLATFORMS)[number];

/** Parâmetros para busca ao vivo na VTEX (não salva, retorna resultados brutos) */
export const VtexSearchSchema = z.object({
  q: z.string().min(1).max(200).describe('Termo de busca'),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  page: z.coerce.number().int().min(1).default(1),
});
export type VtexSearchInput = z.infer<typeof VtexSearchSchema>;

/** Payload para adicionar UM produto ao catálogo TryOn */
export const AddProductSchema = z.object({
  platform: z.enum(CATALOG_PLATFORMS).default('vtex'),
  skuId: z.string().min(1),
  productId: z.string().optional(),
  name: z.string().min(1).max(500),
  imageUrl: z.string().url().nullable().optional(),
  price: z.number().nullable().optional(),
  department: z.string().nullable().optional(),
});
export type AddProductInput = z.infer<typeof AddProductSchema>;

/** Payload para atualizar a flag de elegibilidade de um SKU */
export const ToggleSkuSchema = z.object({
  enabled: z.boolean(),
  reason: z.string().max(255).optional(),
});
export type ToggleSkuInput = z.infer<typeof ToggleSkuSchema>;

/** Parâmetros de listagem do catálogo local */
export const ListCatalogSchema = z.object({
  q: z.string().max(200).optional().describe('Busca textual por nome'),
  enabled: z
    .enum(['true', 'false', 'all'])
    .default('all')
    .describe('Filtro por elegibilidade'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});
export type ListCatalogInput = z.infer<typeof ListCatalogSchema>;

// ---------------------------------------------------------------------------
// Tipos de resposta
// ---------------------------------------------------------------------------

export interface ProductRow {
  id: string;
  storeId: string;
  skuId: string;
  productId: string | null;
  platform: CatalogPlatform;
  name: string;
  imageUrl: string | null;
  price: number | null;
  department: string | null;
  enabled: boolean;
  enabledAt: string | null;
  disabledAt: string | null;
  disabledReason: string | null;
  syncedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface CatalogPage {
  items: ProductRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/** Item retornado pela busca ao vivo na VTEX */
export interface VtexSearchResult {
  skuId: string;
  productId: string;
  name: string;
  imageUrl: string | null;
  price: number | null;
  department: string | null;
}
