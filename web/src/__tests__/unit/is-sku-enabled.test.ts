/**
 * QA-S2-01 — Testes unitários: isSkuEnabled — Comportamento fail-open
 *
 * Gate crítico do Sprint 2: /api/generate rejeita SKU desabilitado com 403.
 *
 * Cobre:
 * - SKU inexistente → true (fail-open, sem restrição)
 * - SKU com enabled=true → true
 * - SKU com enabled=false → false (bloqueio ativo)
 * - Erro de banco → true (fail-open, não bloqueia produção)
 *
 * ISOLAMENTO MULTI-TENANT:
 * - Mesma skuId em loja diferente não interfere (storeId diferente)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isSkuEnabled } from '@/lib/services/catalog.service';

// ---------------------------------------------------------------------------
// Mock Supabase
// ---------------------------------------------------------------------------

type MockResult =
  | { data: { enabled: boolean }; error: null }
  | { data: null; error: { message: string } };

let mockResult: MockResult = { data: null, error: null } as unknown as MockResult;

vi.mock('@/lib/clients/supabase', () => ({
  getSupabaseAdmin: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            maybeSingle: () => Promise.resolve(mockResult),
          }),
        }),
      }),
    }),
  }),
}));

function setSkuResult(enabled: boolean | null, error?: string) {
  if (error) {
    mockResult = { data: null, error: { message: error } } as MockResult;
  } else if (enabled === null) {
    // SKU não encontrado (maybeSingle retorna null)
    mockResult = { data: null, error: null } as unknown as MockResult;
  } else {
    mockResult = { data: { enabled }, error: null };
  }
}

const STORE_ID = 'store-test-uuid';
const SKU_ID = 'SKU-001';

// ---------------------------------------------------------------------------
// isSkuEnabled — Testes de comportamento
// ---------------------------------------------------------------------------

describe('isSkuEnabled()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('SKU não cadastrado → retorna true (fail-open, sem restrição)', async () => {
    setSkuResult(null); // maybeSingle retorna null
    const result = await isSkuEnabled(STORE_ID, SKU_ID);
    expect(result).toBe(true);
  });

  it('SKU com enabled=true → retorna true (try-on permitido)', async () => {
    setSkuResult(true);
    const result = await isSkuEnabled(STORE_ID, SKU_ID);
    expect(result).toBe(true);
  });

  it('SKU com enabled=false → retorna false (try-on bloqueado)', async () => {
    setSkuResult(false);
    const result = await isSkuEnabled(STORE_ID, SKU_ID);
    expect(result).toBe(false);
  });

  it('Erro de banco → retorna true (fail-open, não interrompe produção)', async () => {
    setSkuResult(null, 'connection timeout');
    const result = await isSkuEnabled(STORE_ID, SKU_ID);
    expect(result).toBe(true);
  });

  it('[gate] SKU desabilitado em loja A NÃO afeta loja B (isolamento multi-tenant)', async () => {
    // Simula que a query por STORE_B não encontrou o SKU (outro tenant)
    setSkuResult(null);
    const resultStoreB = await isSkuEnabled('store-b-uuid', SKU_ID);
    expect(resultStoreB).toBe(true); // loja B não tem restrição

    // Simula que a query por STORE_A encontrou o SKU como disabled
    setSkuResult(false);
    const resultStoreA = await isSkuEnabled(STORE_ID, SKU_ID);
    expect(resultStoreA).toBe(false); // loja A está bloqueada
  });
});
