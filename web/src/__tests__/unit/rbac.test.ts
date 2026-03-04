/**
 * QA-S2-01 — Testes unitários: RBAC + Isolamento multi-tenant
 *
 * Cobre:
 * - requireRole: usuário null → 401
 * - requireRole: usuário sem store_users → 403
 * - requireRole: role insatisfatório → 403
 * - requireRole: super_admin autorizado → ok
 * - requireRole: store_owner autorizado → ok, storeId preenchido
 * - forbidCrossTenant: super_admin → sempre null (acesso liberado)
 * - forbidCrossTenant: store_owner mesma loja → null (acesso liberado)
 * - forbidCrossTenant: store_owner loja diferente → 403 (bloqueio cross-tenant)
 * - forbidCrossTenant: result não-ok (já é erro) → retorna NextResponse
 * - rbacError: gera NextResponse com status correto
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextResponse } from 'next/server';
import {
  requireRole,
  forbidCrossTenant,
  rbacError,
} from '@/lib/auth/rbac';
import type { AuthUser } from '@/lib/auth/session';

// ---------------------------------------------------------------------------
// Mock do Supabase Admin (com factory — vi.mock é hoisted acima dos imports)
//
// requireRole constrói um QueryBuilder assim:
//   const query = supabase.from(...).select(...).eq('user_id', id)
//   const { data, error } = await query
//
// O Supabase QueryBuilder é *thenable*: tem .then()/.catch()/.finally()
// mas não é um Promise real. O builder precisa replicar isso.
//
// Nota: o factory function LEVA o _mockResult por REFERÊNCIA (closure).
// _mockResult é lido no momento da chamada .then(), não na hora do mock setup.
// ---------------------------------------------------------------------------

// Variável de controle — lida de forma lazy pelo thenable
type DbRow = { role: string; store_id: string };
type DbResult = { data: DbRow[]; error: null | { message: string } };

let _mockResult: DbResult = { data: [], error: null };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeThenableBuilder(): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const b: any = {};
  b.select = () => b;
  b.eq = () => b;
  // Torna o builder awaitable: resolve to _mockResult at call time
  b.then = (
    onFulfilled: (v: DbResult) => unknown,
    onRejected?: (r: unknown) => unknown,
  ) => Promise.resolve(_mockResult).then(onFulfilled, onRejected);
  b.catch = (onRejected: (r: unknown) => unknown) =>
    Promise.resolve(_mockResult).catch(onRejected);
  b.finally = (onFinally: () => void) =>
    Promise.resolve(_mockResult).finally(onFinally);
  return b;
}

vi.mock('@/lib/clients/supabase', () => ({
  // getSupabaseAdmin é reexportado como vi.fn para poder ser re-configurado
  getSupabaseAdmin: vi.fn(() => ({
    from: () => makeThenableBuilder(),
  })),
}));

// Import estático do mock — mesmo instância que rbac.ts usa
import { getSupabaseAdmin } from '@/lib/clients/supabase';

// Helpers para configurar o resultado simulado
function setDbResult(data: DbRow[]) {
  _mockResult = { data, error: null };
}

function setDbError(msg: string) {
  _mockResult = { data: [], error: { message: msg } };
}

// ---------------------------------------------------------------------------
// Constantes de teste
// ---------------------------------------------------------------------------

const STORE_A = 'store-uuid-aaa';
const STORE_B = 'store-uuid-bbb';
const USER: AuthUser = { id: 'user-uuid-1', email: 'admin@test.com' };

// ---------------------------------------------------------------------------
// requireRole
// ---------------------------------------------------------------------------

describe('requireRole()', () => {
  beforeEach(() => {
    setDbResult([]);
    vi.mocked(getSupabaseAdmin).mockImplementation(() => ({
      from: () => makeThenableBuilder(),
    } as unknown as ReturnType<typeof getSupabaseAdmin>));
  });

  it('retorna 401 se user for null', async () => {
    const result = await requireRole(null, ['super_admin']);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(401);
  });

  it('retorna 403 se não houver registros em store_users', async () => {
    setDbResult([]);
    const result = await requireRole(USER, ['store_owner']);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(403);
  });

  it('retorna 403 se erro de banco', async () => {
    setDbError('conexão recusada');
    const result = await requireRole(USER, ['super_admin']);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(403);
  });

  it('retorna 403 se role do usuário não está na lista allowedRoles', async () => {
    setDbResult([{ role: 'store_manager', store_id: STORE_A }]);
    const result = await requireRole(USER, ['super_admin', 'store_owner']);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(403);
  });

  it('autoriza super_admin e retorna role correto', async () => {
    setDbResult([{ role: 'super_admin', store_id: STORE_A }]);
    const result = await requireRole(USER, ['super_admin']);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.role).toBe('super_admin');
  });

  it('autoriza store_owner e popula storeId', async () => {
    setDbResult([{ role: 'store_owner', store_id: STORE_A }]);
    const result = await requireRole(USER, ['store_owner']);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.role).toBe('store_owner');
      expect(result.storeId).toBe(STORE_A);
    }
  });

  it('autoriza store_manager quando está na lista', async () => {
    setDbResult([{ role: 'store_manager', store_id: STORE_A }]);
    const result = await requireRole(USER, ['store_owner', 'store_manager']);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.role).toBe('store_manager');
  });
});

// ---------------------------------------------------------------------------
// forbidCrossTenant — controle de isolamento multi-tenant
// ---------------------------------------------------------------------------

describe('forbidCrossTenant()', () => {
  it('super_admin pode acessar qualquer loja -> retorna null', () => {
    const rbac = { ok: true as const, role: 'super_admin' as const, storeId: STORE_A };
    const result = forbidCrossTenant(rbac, STORE_B);
    expect(result).toBeNull();
  });

  it('store_owner na sua propria loja -> retorna null (permitido)', () => {
    const rbac = { ok: true as const, role: 'store_owner' as const, storeId: STORE_A };
    const result = forbidCrossTenant(rbac, STORE_A);
    expect(result).toBeNull();
  });

  it('store_owner tentando acessar loja diferente -> 403 (bloqueio cross-tenant)', () => {
    const rbac = { ok: true as const, role: 'store_owner' as const, storeId: STORE_A };
    const response = forbidCrossTenant(rbac, STORE_B);
    expect(response).toBeInstanceOf(NextResponse);
    expect(response?.status).toBe(403);
  });

  it('store_manager na sua loja -> retorna null (permitido)', () => {
    const rbac = { ok: true as const, role: 'store_manager' as const, storeId: STORE_A };
    const result = forbidCrossTenant(rbac, STORE_A);
    expect(result).toBeNull();
  });

  it('store_manager em loja diferente -> 403', () => {
    const rbac = { ok: true as const, role: 'store_manager' as const, storeId: STORE_A };
    const response = forbidCrossTenant(rbac, STORE_B);
    expect(response?.status).toBe(403);
  });

  it('result com ok=false -> retorna NextResponse com status do erro', () => {
    const rbac = { ok: false as const, error: 'Acesso negado.', status: 403 as const };
    const response = forbidCrossTenant(rbac, STORE_A);
    expect(response).toBeInstanceOf(NextResponse);
    expect(response?.status).toBe(403);
  });
});

// ---------------------------------------------------------------------------
// rbacError
// ---------------------------------------------------------------------------

describe('rbacError()', () => {
  it('gera NextResponse com status 401', () => {
    const err = { ok: false as const, error: 'Autenticacao necessaria.', status: 401 as const };
    const response = rbacError(err);
    expect(response).toBeInstanceOf(NextResponse);
    expect(response.status).toBe(401);
  });

  it('gera NextResponse com status 403', () => {
    const err = { ok: false as const, error: 'Forbidden.', status: 403 as const };
    const response = rbacError(err);
    expect(response.status).toBe(403);
  });
});
