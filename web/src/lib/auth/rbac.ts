/**
 * rbac.ts — Utilitários de autorização por role (RBAC)
 *
 * Fluxo padrão nas rotas admin:
 *   const user = await getUserFromRequest(authHeader)
 *   const result = await requireRole(user, ['super_admin'])
 *   if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })
 */
import { NextResponse } from 'next/server';

import { getSupabaseAdmin } from '@/lib/clients/supabase';
import type { AuthUser } from './session';

export type UserRole = 'super_admin' | 'store_owner' | 'store_manager';

export interface RbacResult {
  ok: true;
  role: UserRole;
  storeId: string | null;
}

export interface RbacError {
  ok: false;
  error: string;
  status: 401 | 403;
}

export type RbacCheckResult = RbacResult | RbacError;

/**
 * Verifica se o usuário autenticado possui um dos roles exigidos.
 *
 * - Se `user` for null → 401 Unauthorized
 * - Se o usuário não tiver nenhum registro em store_users → 403 Forbidden
 * - Se o role do usuário não estiver na lista `allowedRoles` → 403 Forbidden
 *
 * @param user        Usuário autenticado (retornado por getUserFromRequest)
 * @param allowedRoles Lista de roles que podem acessar o recurso
 * @param storeId     Quando fornecido, garante que o usuário pertence à loja (isolamento cross-tenant)
 */
export async function requireRole(
  user: AuthUser | null,
  allowedRoles: UserRole[],
  storeId?: string,
): Promise<RbacCheckResult> {
  if (!user) {
    return { ok: false, error: 'Autenticação necessária.', status: 401 };
  }

  const supabase = getSupabaseAdmin();

  // Super admins não são vinculados a uma loja específica
  // — busca qualquer registro de super_admin para o usuário
  const query = supabase
    .from('store_users')
    .select('role, store_id')
    .eq('user_id', user.id);

  if (storeId) {
    query.eq('store_id', storeId);
  }

  const { data, error } = await query;

  if (error || !data || data.length === 0) {
    return { ok: false, error: 'Acesso negado.', status: 403 };
  }

  // Super admin pode acessar qualquer loja
  const superAdminEntry = data.find((r) => r.role === 'super_admin');
  if (superAdminEntry && allowedRoles.includes('super_admin')) {
    return {
      ok: true,
      role: 'super_admin',
      storeId: (superAdminEntry.store_id as string) ?? null,
    };
  }

  // Busca a entrada relevante (por loja ou a primeira com Role válida)
  const matchEntry = data.find((r) =>
    allowedRoles.includes(r.role as UserRole),
  );

  if (!matchEntry) {
    return { ok: false, error: 'Acesso negado.', status: 403 };
  }

  return {
    ok: true,
    role: matchEntry.role as UserRole,
    storeId: (matchEntry.store_id as string) ?? null,
  };
}

/**
 * Garante que o usuário pertence apenas à loja solicitada.
 * Retorna NextResponse 403 caso seja acesso cross-tenant.
 *
 * Uso: verificar `storeId` em rotas do tipo /api/store/[id]/...
 */
export function forbidCrossTenant(
  checkResult: RbacCheckResult,
  requestedStoreId: string,
): NextResponse | null {
  if (!checkResult.ok) {
    return NextResponse.json({ error: checkResult.error }, { status: checkResult.status });
  }

  // Super admin pode acessar qualquer loja
  if (checkResult.role === 'super_admin') return null;

  if (checkResult.storeId !== requestedStoreId) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  }

  return null;
}

/**
 * Gera resposta de erro padrão de RBAC como NextResponse.
 */
export function rbacError(result: RbacError): NextResponse {
  return NextResponse.json({ error: result.error }, { status: result.status });
}
