/**
 * QA-S2 — Testes de integração: POST /api/auth/logout
 *
 * Cobre:
 * - Sem Authorization → 200 {ok:true} (logout sempre tem sucesso)
 * - Usuário autenticado → signOut chamado + 200 {ok:true}
 * - signOut lança exceção → ainda retorna 200 (logout best-effort)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/lib/auth/session', () => ({
  getUserFromRequest: vi.fn(),
}));

const mockSignOut = vi.fn();

vi.mock('@/lib/clients/supabase', () => ({
  getSupabaseAdmin: vi.fn(() => ({
    auth: {
      admin: { signOut: mockSignOut },
    },
  })),
}));

// ---------------------------------------------------------------------------
// Imports
// ---------------------------------------------------------------------------

import { getUserFromRequest } from '@/lib/auth/session';
import type { AuthUser } from '@/lib/auth/session';

import { POST } from '@/app/api/auth/logout/route';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const AUTHED_USER: AuthUser = { id: 'user-xyz', email: 'user@loja.com' };

function makeRequest(auth?: string): NextRequest {
  return new NextRequest('http://localhost:3000/api/auth/logout', {
    method: 'POST',
    headers: auth ? { Authorization: auth } : {},
  });
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getUserFromRequest).mockResolvedValue(null);
  mockSignOut.mockResolvedValue({ error: null });
});

// ---------------------------------------------------------------------------
// Testes
// ---------------------------------------------------------------------------

describe('POST /api/auth/logout', () => {
  it('sem Authorization → 200 {ok:true} (logout é idempotente)', async () => {
    const req = makeRequest();
    const res = await POST(req);
    expect(res.status).toBe(200);

    const body = await res.json() as { ok: boolean };
    expect(body.ok).toBe(true);
  });

  it('sem Authorization → NÃO chama signOut', async () => {
    const req = makeRequest();
    await POST(req);
    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it('usuário autenticado → chama signOut com o token', async () => {
    vi.mocked(getUserFromRequest).mockResolvedValue(AUTHED_USER);

    const req = makeRequest('Bearer valid-token-abc');
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(mockSignOut).toHaveBeenCalledOnce();
    expect(mockSignOut).toHaveBeenCalledWith('valid-token-abc');
  });

  it('usuário autenticado → retorna 200 {ok:true}', async () => {
    vi.mocked(getUserFromRequest).mockResolvedValue(AUTHED_USER);

    const req = makeRequest('Bearer some-token');
    const res = await POST(req);
    const body = await res.json() as { ok: boolean };
    expect(body.ok).toBe(true);
  });

  it('signOut lança exceção → ainda retorna 200 (logout é best-effort)', async () => {
    vi.mocked(getUserFromRequest).mockResolvedValue(AUTHED_USER);
    mockSignOut.mockRejectedValue(new Error('Supabase unreachable'));

    const req = makeRequest('Bearer another-token');
    const res = await POST(req);

    // Logout nunca deve falhar para o cliente — a revogação server-side é best-effort
    expect(res.status).toBe(200);
    const body = await res.json() as { ok: boolean };
    expect(body.ok).toBe(true);
  });
});
