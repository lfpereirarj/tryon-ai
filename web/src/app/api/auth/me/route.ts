/**
 * GET /api/auth/me
 *
 * Retorna o perfil do usuário autenticado: role, storeId e email.
 * Usado pelo frontend para decidir para qual portal redirecionar após login.
 */
import { NextRequest, NextResponse } from 'next/server';

import { getUserFromRequest } from '@/lib/auth/session';
import { requireRole, rbacError } from '@/lib/auth/rbac';

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request.headers.get('authorization'));
  const rbac = await requireRole(user, ['super_admin', 'store_owner', 'store_manager']);

  if (!rbac.ok) return rbacError(rbac);

  return NextResponse.json({
    role: rbac.role,
    storeId: rbac.storeId,
    email: user!.email ?? null,
  });
}
