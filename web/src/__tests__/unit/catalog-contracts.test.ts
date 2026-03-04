/**
 * QA-S2-01 — Testes unitários: Contratos Zod do Catálogo
 *
 * Cobre:
 * - VtexSearchSchema: busca ao vivo na VTEX
 * - AddProductSchema: adicionar um produto ao catálogo TryOn
 * - ListCatalogSchema: defaults, coerção de tipos, limites
 * - ToggleSkuSchema: enabled obrigatório, reason opcional
 */
import { describe, it, expect } from 'vitest';
import {
  VtexSearchSchema,
  AddProductSchema,
  ListCatalogSchema,
  ToggleSkuSchema,
} from '@/lib/contracts/catalog';

// ---------------------------------------------------------------------------
// VtexSearchSchema
// ---------------------------------------------------------------------------

describe('VtexSearchSchema', () => {
  it('aceita query mínima', () => {
    const result = VtexSearchSchema.parse({ q: 'camiseta' });
    expect(result.q).toBe('camiseta');
    expect(result.limit).toBe(20);
    expect(result.page).toBe(1);
  });

  it('rejeita q vazio', () => {
    expect(() => VtexSearchSchema.parse({ q: '' })).toThrow();
  });

  it('rejeita q com > 200 chars', () => {
    expect(() => VtexSearchSchema.parse({ q: 'x'.repeat(201) })).toThrow();
  });

  it('coerce limit e page de string para number', () => {
    const result = VtexSearchSchema.parse({ q: 'tênis', limit: '10', page: '2' });
    expect(result.limit).toBe(10);
    expect(result.page).toBe(2);
  });

  it('rejeita limit > 50', () => {
    expect(() => VtexSearchSchema.parse({ q: 'x', limit: 51 })).toThrow();
  });

  it('rejeita limit < 1', () => {
    expect(() => VtexSearchSchema.parse({ q: 'x', limit: 0 })).toThrow();
  });

  it('rejeita page < 1', () => {
    expect(() => VtexSearchSchema.parse({ q: 'x', page: 0 })).toThrow();
  });
});

// ---------------------------------------------------------------------------
// AddProductSchema
// ---------------------------------------------------------------------------

describe('AddProductSchema', () => {
  it('aceita payload mínimo válido', () => {
    const result = AddProductSchema.parse({ skuId: '123', name: 'Camiseta Branca' });
    expect(result.skuId).toBe('123');
    expect(result.name).toBe('Camiseta Branca');
    expect(result.platform).toBe('vtex');
  });

  it('aceita todos os campos opcionais', () => {
    const result = AddProductSchema.parse({
      platform: 'vtex',
      skuId: '456',
      productId: 'p-001',
      name: 'Calça Jeans',
      imageUrl: 'https://img.example.com/calca.jpg',
      price: 199.9,
      department: 'Roupas',
    });
    expect(result.price).toBe(199.9);
    expect(result.department).toBe('Roupas');
  });

  it('rejeita skuId vazio', () => {
    expect(() => AddProductSchema.parse({ skuId: '', name: 'Produto' })).toThrow();
  });

  it('rejeita name vazio', () => {
    expect(() => AddProductSchema.parse({ skuId: '1', name: '' })).toThrow();
  });

  it('rejeita imageUrl inválida', () => {
    expect(() =>
      AddProductSchema.parse({ skuId: '1', name: 'X', imageUrl: 'nao-eh-url' }),
    ).toThrow();
  });

  it('aceita imageUrl null', () => {
    const result = AddProductSchema.parse({ skuId: '1', name: 'X', imageUrl: null });
    expect(result.imageUrl).toBeNull();
  });

  it('rejeita plataforma inválida', () => {
    expect(() =>
      AddProductSchema.parse({ skuId: '1', name: 'X', platform: 'magento' }),
    ).toThrow();
  });
});

// ---------------------------------------------------------------------------
// ListCatalogSchema
// ---------------------------------------------------------------------------

describe('ListCatalogSchema', () => {
  it('default: enabled=all, page=1, limit=30', () => {
    const result = ListCatalogSchema.parse({});
    expect(result.enabled).toBe('all');
    expect(result.page).toBe(1);
    expect(result.limit).toBe(30);
  });

  it('aceita enabled "true" / "false" / "all"', () => {
    for (const v of ['true', 'false', 'all'] as const) {
      expect(ListCatalogSchema.parse({ enabled: v }).enabled).toBe(v);
    }
  });

  it('rejeita enabled com valor inválido', () => {
    expect(() => ListCatalogSchema.parse({ enabled: 'yes' })).toThrow();
  });

  it('coerce page de string para number', () => {
    const result = ListCatalogSchema.parse({ page: '3' });
    expect(result.page).toBe(3);
  });

  it('rejeita limit > 100', () => {
    expect(() => ListCatalogSchema.parse({ limit: 101 })).toThrow();
  });

  it('rejeita page < 1', () => {
    expect(() => ListCatalogSchema.parse({ page: 0 })).toThrow();
  });
});

// ---------------------------------------------------------------------------
// ToggleSkuSchema
// ---------------------------------------------------------------------------

describe('ToggleSkuSchema', () => {
  it('aceita { enabled: true }', () => {
    const result = ToggleSkuSchema.parse({ enabled: true });
    expect(result.enabled).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it('aceita { enabled: false, reason: "..." }', () => {
    const result = ToggleSkuSchema.parse({
      enabled: false,
      reason: 'Produto descontinuado',
    });
    expect(result.enabled).toBe(false);
    expect(result.reason).toBe('Produto descontinuado');
  });

  it('rejeita se enabled ausente', () => {
    expect(() => ToggleSkuSchema.parse({})).toThrow();
  });

  it('rejeita reason com > 255 chars', () => {
    expect(() =>
      ToggleSkuSchema.parse({ enabled: false, reason: 'x'.repeat(256) }),
    ).toThrow();
  });
});
