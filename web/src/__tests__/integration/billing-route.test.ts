/**
 * QA-S2 — Testes de integração: /api/admin/stores/[id]/billing
 *
 * Testa o route handler de billing diretamente.
 * Mock parcial de @/lib/auth/rbac: mantém forbidCrossTenant real (função pura),
 * substitui apenas requireRole e rbacError.
 *
 * Cobre:
 * - GET sem auth → 401
 * - GET autenticado sem role → 403
 * - GET store_owner na própria loja → 200
 * - GET store_owner em outra loja (cross-tenant) → 403
 * - GET super_admin → 200 em qualquer loja
 * - GET query params inválidos → 422
 * - GET listInvoices lança exceção → 500
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/lib/auth/session', () => ({
  getUserFromRequest: vi.fn(),
}));

// Partial mock: mantém forbidCrossTenant real, substitui requireRole + rbacError
vi.mock('@/lib/auth/rbac', async (importActual) => {
  const actual = await importActual<typeof import('@/lib/auth/rbac')>();
  return {
    ...actual,
    requireRole: vi.fn(),
    rbacError: vi.fn((r: { error: string; status: number }) =>
      new Response(JSON.stringify({ error: r.error }), {
        status: r.status,
        headers: { 'Content-Type': 'application/json' },
      }),
    ),
  };
});

vi.mock('@/lib/services/billing.service', () => ({
  listInvoices: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Imports
// ---------------------------------------------------------------------------

import { getUserFromRequest } from '@/lib/auth/session';
import { requireRole, rbacError } from '@/lib/auth/rbac';
import { listInvoices } from '@/lib/services/billing.service';
import type { AuthUser } from '@/lib/auth/session';
import type { RbacResult, RbacError } from '@/lib/auth/rbac';
import type { InvoicePage } from '@/lib/contracts/billing';

import { GET } from '@/app/api/admin/stores/[id]/billing/route';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const STORE_ID = 'store-billing-123';
const OTHER_STORE = 'store-other-456';

const USER: AuthUser = { id: 'user-uid', email: 'user@loja.com' };

const RBAC_OK_SA: RbacResult = { ok: true, role: 'super_admin', storeId: null };
const RBAC_OK_OWNER: RbacResult = {
  ok: true,
  role: 'store_owner',
  storeId: STORE_ID,
};
const RBAC_OK_OWNER_OTHER: RbacResult = {
  ok: true,
  role: 'store_owner',
  storeId: OTHER_STORE,   // loja diferente da requisição → cross-tenant
};
const RBAC_401: RbacError = { ok: false, error: 'Autenticação necessária.', status: 401 };
const RBAC_403: RbacError = { ok: false, error: 'Acesso negado.', status: 403 };

const EMPTY_PAGE: InvoicePage = {
  items: [],
  page: 1,
  limit: 12,
  total: 0,
  totalPages: 0,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeReq(storeId: string, auth?: string, searchParams = ''): NextRequest {
  return new NextRequest(
    `http://localhost:3000/api/admin/stores/${storeId}/billing${searchParams}`,
    { method: 'GET', headers: auth ? { Authorization: auth } : {} },
  );
}

function rbacResponse(r: { error: string; status: number }) {
  return new Response(JSON.stringify({ error: r.error }), {
    status: r.status,
    headers: { 'Content-Type': 'application/json' },
  }) as unknown as ReturnType<typeof rbacError>;
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getUserFromRequest).mockResolvedValue(null);
  vi.mocked(requireRole).mockResolvedValue(RBAC_401);
  vi.mocked(rbacError).mockImplementation(rbacResponse);
  vi.mocked(listInvoices).mockResolvedValue(EMPTY_PAGE);
});

// ---------------------------------------------------------------------------
// Testes
// ---------------------------------------------------------------------------

describe('GET /api/admin/stores/[id]/billing', () => {
  it('sem auth → 401', async () => {
    const req = makeReq(STORE_ID);
    const ctx = { params: Promise.resolve({ id: STORE_ID }) };
    const res = await GET(req, ctx);
    expect(res.status).toBe(401);
  });

  it('sem role válido → 403', async () => {
    vi.mocked(getUserFromRequest).mockResolvedValue(USER);
    vi.mocked(requireRole).mockResolvedValue(RBAC_403);

    const req = makeReq(STORE_ID, 'Bearer token');
    const ctx = { params: Promise.resolve({ id: STORE_ID }) };
    const res = await GET(req, ctx);
    expect(res.status).toBe(403);
  });

  it('store_owner na própria loja → 200', async () => {
    vi.mocked(getUserFromRequest).mockResolvedValue(USER);
    vi.mocked(requireRole).mockResolvedValue(RBAC_OK_OWNER);
    vi.mocked(listInvoices).mockResolvedValue(EMPTY_PAGE);

    const req = makeReq(STORE_ID, 'Bearer token');
    const ctx = { params: Promise.resolve({ id: STORE_ID }) };
    const res = await GET(req, ctx);
    expect(res.status).toBe(200);

    const body = await res.json() as InvoicePage;
    expect(body.items).toEqual([]);
    expect(body.page).toBe(1);
  });

  it('store_owner em loja diferente → 403 (cross-tenant)', async () => {
    vi.mocked(getUserFromRequest).mockResolvedValue(USER);
    vi.mocked(requireRole).mockResolvedValue(RBAC_OK_OWNER_OTHER);

    const req = makeReq(STORE_ID, 'Bearer token');
    const ctx = { params: Promise.resolve({ id: STORE_ID }) };
    const res = await GET(req, ctx);
    expect(res.status).toBe(403);
  });

  it('super_admin → 200 em qualquer loja', async () => {
    vi.mocked(getUserFromRequest).mockResolvedValue(USER);
    vi.mocked(requireRole).mockResolvedValue(RBAC_OK_SA);

    const req = makeReq(STORE_ID, 'Bearer token');
    const ctx = { params: Promise.resolve({ id: STORE_ID }) };
    const res = await GET(req, ctx);
    expect(res.status).toBe(200);

    expect(vi.mocked(listInvoices)).toHaveBeenCalledWith(
      STORE_ID,
      expect.objectContaining({ page: expect.any(Number) }),
    );
  });

  it('query param status inválido → 422', async () => {
    vi.mocked(getUserFromRequest).mockResolvedValue(USER);
    vi.mocked(requireRole).mockResolvedValue(RBAC_OK_SA);

    const req = makeReq(STORE_ID, 'Bearer token', '?status=INVALIDO');
    const ctx = { params: Promise.resolve({ id: STORE_ID }) };
    const res = await GET(req, ctx);
    expect(res.status).toBe(422);
  });

  it('listInvoices lança exceção → 500', async () => {
    vi.mocked(getUserFromRequest).mockResolvedValue(USER);
    vi.mocked(requireRole).mockResolvedValue(RBAC_OK_SA);
    vi.mocked(listInvoices).mockRejectedValue(new Error('DB timeout'));

    const req = makeReq(STORE_ID, 'Bearer token');
    const ctx = { params: Promise.resolve({ id: STORE_ID }) };
    const res = await GET(req, ctx);
    expect(res.status).toBe(500);
  });
});
