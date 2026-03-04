/**
 * /api/admin/stores/[id]/installation — GET snippet de instalação GTM
 *
 * GET → retorna payload com snippet HTML por plataforma (MVP: vtex)
 *
 * Autorização: super_admin (qualquer loja) ou store_owner/store_manager (própria loja)
 * Header: Authorization: Bearer <supabase_jwt>
 */
import { NextRequest, NextResponse } from 'next/server';

import { getUserFromRequest } from '@/lib/auth/session';
import { requireRole, forbidCrossTenant, rbacError } from '@/lib/auth/rbac';
import { getInstallationPayload } from '@/lib/services/installation.service';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, ctx: RouteContext) {
  const { id: storeId } = await ctx.params;

  const user = await getUserFromRequest(request.headers.get('authorization'));
  const rbac = await requireRole(user, [
    'super_admin',
    'store_owner',
    'store_manager',
  ]);
  if (!rbac.ok) return rbacError(rbac);

  const crossTenantBlock = forbidCrossTenant(rbac, storeId);
  if (crossTenantBlock) return crossTenantBlock;

  try {
    // Deriva api-url a partir do host da requisição como fallback
    const origin =
      request.headers.get('x-forwarded-host')
        ? `https://${request.headers.get('x-forwarded-host')}`
        : request.headers.get('origin') ??
          `${request.nextUrl.protocol}//${request.nextUrl.host}`;

    const payload = await getInstallationPayload(storeId, origin);
    return NextResponse.json(payload);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
