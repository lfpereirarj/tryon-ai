/**
 * QA-S2 — Testes de integração: /api/admin/stores
 *
 * Testa os route handlers diretamente, sem HTTP real.
 * Os módulos de autenticação, autorização e serviço são mockados
 * para isolar o comportamento do handler.
 *
 * Cobre:
 * - GET sem Authorization → 401
 * - GET com token inválido (getUserFromRequest null) → 401
 * - GET autenticado sem permissão → 403
 * - GET como super_admin → 200 com lista de lojas
 * - POST sem auth → 401
 * - POST body JSON inválido → 400
 * - POST campos obrigatórios faltando (ZodError) → 400
 * - POST super_admin com payload válido → 201
 * - POST createStore lança exceção → 500
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Mocks — devem vir antes dos imports dos módulos que dependem deles
// ---------------------------------------------------------------------------

vi.mock('@/lib/auth/session', () => ({
  getUserFromRequest: vi.fn(),
}));

vi.mock('@/lib/auth/rbac', () => ({
  requireRole: vi.fn(),
  rbacError: vi.fn((r: { error: string; status: number }) =>
    new Response(JSON.stringify({ error: r.error }), {
      status: r.status,
      headers: { 'Content-Type': 'application/json' },
    }),
  ),
}));

vi.mock('@/lib/services/store.service', () => ({
  listStores: vi.fn(),
  createStore: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Imports dos mocks (após vi.mock — hoistados pelo Vitest)
// ---------------------------------------------------------------------------

import { getUserFromRequest } from '@/lib/auth/session';
import { requireRole, rbacError } from '@/lib/auth/rbac';
import { listStores, createStore } from '@/lib/services/store.service';
import type { AuthUser } from '@/lib/auth/session';
import type { RbacResult, RbacError } from '@/lib/auth/rbac';

// ---------------------------------------------------------------------------
// Import dos handlers (após todos os mocks)
// ---------------------------------------------------------------------------

import { GET, POST } from '@/app/api/admin/stores/route';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const USER_SA: AuthUser = { id: 'sa-uid', email: 'sa@tryon.ai' };

const RBAC_OK: RbacResult = { ok: true, role: 'super_admin', storeId: null };
const RBAC_401: RbacError = { ok: false, error: 'Autenticação necessária.', status: 401 };
const RBAC_403: RbacError = { ok: false, error: 'Acesso negado.', status: 403 };

const MOCK_STORE = {
  id: 'store-aaa',
  name: 'Loja Teste',
  domain: 'lojateste.com.br',
  plan: 'pro' as const,
  status: 'active' as const,
  public_api_key: 'pub-key-123',
  allowed_origins: [],
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeReq(method: string, body?: unknown, auth?: string): NextRequest {
  return new NextRequest('http://localhost:3000/api/admin/stores', {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(auth ? { Authorization: auth } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
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
  vi.mocked(listStores).mockResolvedValue([]);
  vi.mocked(createStore).mockResolvedValue(MOCK_STORE);
});

// ---------------------------------------------------------------------------
// GET /api/admin/stores
// ---------------------------------------------------------------------------

describe('GET /api/admin/stores', () => {
  it('sem Authorization header → 401', async () => {
    const req = makeReq('GET');
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('token inválido (getUserFromRequest → null) → 401', async () => {
    vi.mocked(getUserFromRequest).mockResolvedValue(null);
    const req = makeReq('GET', undefined, 'Bearer invalido');
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('autenticado com role insuficiente → 403', async () => {
    vi.mocked(getUserFromRequest).mockResolvedValue(USER_SA);
    vi.mocked(requireRole).mockResolvedValue(RBAC_403);
    const req = makeReq('GET', undefined, 'Bearer token');
    const res = await GET(req);
    expect(res.status).toBe(403);
  });

  it('super_admin → 200 com lista de lojas', async () => {
    vi.mocked(getUserFromRequest).mockResolvedValue(USER_SA);
    vi.mocked(requireRole).mockResolvedValue(RBAC_OK);
    vi.mocked(listStores).mockResolvedValue([MOCK_STORE]);

    const req = makeReq('GET', undefined, 'Bearer valid-token');
    const res = await GET(req);
    expect(res.status).toBe(200);

    const body = await res.json() as { stores: typeof MOCK_STORE[] };
    expect(body.stores).toHaveLength(1);
    expect(body.stores[0].id).toBe('store-aaa');
    expect(body.stores[0].name).toBe('Loja Teste');
  });

  it('super_admin com listagem vazia → 200 com stores: []', async () => {
    vi.mocked(getUserFromRequest).mockResolvedValue(USER_SA);
    vi.mocked(requireRole).mockResolvedValue(RBAC_OK);
    vi.mocked(listStores).mockResolvedValue([]);

    const req = makeReq('GET', undefined, 'Bearer valid-token');
    const res = await GET(req);
    expect(res.status).toBe(200);

    const body = await res.json() as { stores: unknown[] };
    expect(body.stores).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// POST /api/admin/stores
// ---------------------------------------------------------------------------

describe('POST /api/admin/stores', () => {
  it('sem auth → 401', async () => {
    const req = makeReq('POST', { name: 'Loja X', domain: 'x.com' });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('role insuficiente → 403', async () => {
    vi.mocked(getUserFromRequest).mockResolvedValue(USER_SA);
    vi.mocked(requireRole).mockResolvedValue(RBAC_403);

    const req = makeReq('POST', { name: 'L', domain: 'x.com' }, 'Bearer t');
    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it('body JSON malformado → 400', async () => {
    vi.mocked(getUserFromRequest).mockResolvedValue(USER_SA);
    vi.mocked(requireRole).mockResolvedValue(RBAC_OK);

    const req = new NextRequest('http://localhost:3000/api/admin/stores', {
      method: 'POST',
      headers: { Authorization: 'Bearer t', 'Content-Type': 'text/plain' },
      body: 'não é json {{{}',
    });
    const res = await POST(req);
    expect(res.status).toBe(400);

    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/json/i);
  });

  it('campo obrigatório "name" ausente → 400 (ZodError)', async () => {
    vi.mocked(getUserFromRequest).mockResolvedValue(USER_SA);
    vi.mocked(requireRole).mockResolvedValue(RBAC_OK);

    const req = makeReq('POST', { domain: 'x.com.br' /* sem name */ }, 'Bearer t');
    const res = await POST(req);
    expect(res.status).toBe(400);

    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/inválid/i);
  });

  it('super_admin + payload válido → 201 com store criada', async () => {
    vi.mocked(getUserFromRequest).mockResolvedValue(USER_SA);
    vi.mocked(requireRole).mockResolvedValue(RBAC_OK);
    vi.mocked(createStore).mockResolvedValue(MOCK_STORE);

    const req = makeReq(
      'POST',
      { name: 'Loja Nova', domain: 'lojanova.com.br', plan: 'free' },
      'Bearer valid-token',
    );
    const res = await POST(req);
    expect(res.status).toBe(201);

    const body = await res.json() as { store: typeof MOCK_STORE };
    expect(body.store.id).toBe('store-aaa');
    expect(body.store.name).toBe('Loja Teste');
  });

  it('createStore lança exceção → 500', async () => {
    vi.mocked(getUserFromRequest).mockResolvedValue(USER_SA);
    vi.mocked(requireRole).mockResolvedValue(RBAC_OK);
    vi.mocked(createStore).mockRejectedValue(new Error('DB connection lost'));

    const req = makeReq(
      'POST',
      { name: 'Loja Crash', domain: 'crash.com.br', plan: 'pro' },
      'Bearer t',
    );
    const res = await POST(req);
    expect(res.status).toBe(500);

    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/falha/i);
  });
});
