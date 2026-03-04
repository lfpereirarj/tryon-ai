/**
 * QA — Testes de integração: GET /api/public/sku-check
 *
 * Cobre:
 * - Parâmetros ausentes → { eligible: true } (fail-open)
 * - Loja não encontrada → { eligible: false }
 * - Loja suspensa       → { eligible: false }
 * - Loja cancelada      → { eligible: false }
 * - SKU não cadastrado  → { eligible: true } (sem restrição)
 * - SKU habilitado      → { eligible: true }
 * - SKU desabilitado    → { eligible: false }
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockFindStoreByApiKey = vi.fn();
const mockIsSkuEnabled = vi.fn();

vi.mock('@/lib/services/session.service', () => ({
  findStoreByApiKey: (...args: unknown[]) => mockFindStoreByApiKey(...args),
}));

vi.mock('@/lib/services/catalog.service', () => ({
  isSkuEnabled: (...args: unknown[]) => mockIsSkuEnabled(...args),
}));

// ---------------------------------------------------------------------------
// Imports (após vi.mock)
// ---------------------------------------------------------------------------

import { GET } from '@/app/api/public/sku-check/route';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

interface StoreRow {
  id: string;
  status: string;
}

const ACTIVE_STORE: StoreRow = { id: 'store-abc', status: 'active' };

function makeRequest(params: Record<string, string> = {}): NextRequest {
  const url = new URL('http://localhost:3000/api/public/sku-check');
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new NextRequest(url.toString(), { method: 'GET' });
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  mockFindStoreByApiKey.mockResolvedValue(ACTIVE_STORE);
  mockIsSkuEnabled.mockResolvedValue(true);
});

// ---------------------------------------------------------------------------
// Testes
// ---------------------------------------------------------------------------

describe('GET /api/public/sku-check', () => {
  // ── Parâmetros ausentes (fail-open) ────────────────────────────

  it('sem parâmetros → 200 { eligible: true }', async () => {
    const req = makeRequest();
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json() as { eligible: boolean };
    expect(body.eligible).toBe(true);
  });

  it('sem skuId → 200 { eligible: true }', async () => {
    const req = makeRequest({ storeApiKey: 'key-xyz' });
    const res = await GET(req);
    const body = await res.json() as { eligible: boolean };
    expect(body.eligible).toBe(true);
    expect(mockFindStoreByApiKey).not.toHaveBeenCalled();
  });

  it('sem storeApiKey → 200 { eligible: true }', async () => {
    const req = makeRequest({ skuId: 'sku-123' });
    const res = await GET(req);
    const body = await res.json() as { eligible: boolean };
    expect(body.eligible).toBe(true);
    expect(mockFindStoreByApiKey).not.toHaveBeenCalled();
  });

  // ── Loja inválida ───────────────────────────────────────────────

  it('loja não encontrada → { eligible: false }', async () => {
    mockFindStoreByApiKey.mockResolvedValue(null);
    const req = makeRequest({ storeApiKey: 'invalid-key', skuId: 'sku-123' });
    const res = await GET(req);
    const body = await res.json() as { eligible: boolean };
    expect(body.eligible).toBe(false);
    expect(mockIsSkuEnabled).not.toHaveBeenCalled();
  });

  it('loja suspensa → { eligible: false }', async () => {
    mockFindStoreByApiKey.mockResolvedValue({ id: 'store-abc', status: 'suspended' });
    const req = makeRequest({ storeApiKey: 'key-xyz', skuId: 'sku-123' });
    const res = await GET(req);
    const body = await res.json() as { eligible: boolean };
    expect(body.eligible).toBe(false);
    expect(mockIsSkuEnabled).not.toHaveBeenCalled();
  });

  it('loja cancelada → { eligible: false }', async () => {
    mockFindStoreByApiKey.mockResolvedValue({ id: 'store-abc', status: 'cancelled' });
    const req = makeRequest({ storeApiKey: 'key-xyz', skuId: 'sku-123' });
    const res = await GET(req);
    const body = await res.json() as { eligible: boolean };
    expect(body.eligible).toBe(false);
    expect(mockIsSkuEnabled).not.toHaveBeenCalled();
  });

  // ── SKU ─────────────────────────────────────────────────────────

  it('SKU habilitado → { eligible: true }', async () => {
    mockIsSkuEnabled.mockResolvedValue(true);
    const req = makeRequest({ storeApiKey: 'key-xyz', skuId: 'sku-enabled' });
    const res = await GET(req);
    const body = await res.json() as { eligible: boolean };
    expect(body.eligible).toBe(true);
    expect(mockIsSkuEnabled).toHaveBeenCalledWith('store-abc', 'sku-enabled');
  });

  it('SKU desabilitado → { eligible: false }', async () => {
    mockIsSkuEnabled.mockResolvedValue(false);
    const req = makeRequest({ storeApiKey: 'key-xyz', skuId: 'sku-disabled' });
    const res = await GET(req);
    const body = await res.json() as { eligible: boolean };
    expect(body.eligible).toBe(false);
    expect(mockIsSkuEnabled).toHaveBeenCalledWith('store-abc', 'sku-disabled');
  });

  it('SKU não cadastrado → isSkuEnabled retorna true → { eligible: true }', async () => {
    mockIsSkuEnabled.mockResolvedValue(true); // comportamento de isSkuEnabled para SKU não cadastrado
    const req = makeRequest({ storeApiKey: 'key-xyz', skuId: 'sku-unknown' });
    const res = await GET(req);
    const body = await res.json() as { eligible: boolean };
    expect(body.eligible).toBe(true);
  });

  // ── Encaminhamento de parâmetros ────────────────────────────────

  it('chama findStoreByApiKey com a chave da query string', async () => {
    const req = makeRequest({ storeApiKey: 'pub-key-123', skuId: 'sku-abc' });
    await GET(req);
    expect(mockFindStoreByApiKey).toHaveBeenCalledWith('pub-key-123');
  });
});
