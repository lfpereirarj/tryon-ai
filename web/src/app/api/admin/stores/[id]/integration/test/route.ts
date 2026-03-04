/**
 * /api/admin/stores/[id]/integration/test — POST
 * Testa a conexão com a VTEX usando as credenciais salvas.
 *
 * Autorização: super_admin (qualquer loja) ou store_owner/store_manager (própria loja)
 * Header: Authorization: Bearer <supabase_jwt>
 */
import { NextRequest, NextResponse } from 'next/server';

import { getUserFromRequest } from '@/lib/auth/session';
import { requireRole, forbidCrossTenant, rbacError } from '@/lib/auth/rbac';
import { testVtexConnection } from '@/lib/services/vtex-integration.service';

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, ctx: RouteContext) {
  const { id: storeId } = await ctx.params;
  const user = await getUserFromRequest(request.headers.get('authorization'));
  const rbac = await requireRole(user, ['super_admin', 'store_owner', 'store_manager']);
  if (!rbac.ok) return rbacError(rbac);

  const crossTenantBlock = forbidCrossTenant(rbac, storeId);
  if (crossTenantBlock) return crossTenantBlock;

  try {
    const result = await testVtexConnection(storeId);

    return NextResponse.json(
      {
        ok: result.ok,
        message: result.message,
        ...(IS_PRODUCTION ? {} : { httpStatus: result.httpStatus }),
      },
      { status: result.ok ? 200 : 422 },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);

    // Não vazar detalhes de infra em produção
    if (IS_PRODUCTION && (msg.includes('[crypto]') || msg.includes('[vtex-integration]'))) {
      return NextResponse.json({ ok: false, error: 'Erro interno ao testar conexão.' }, { status: 500 });
    }

    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
