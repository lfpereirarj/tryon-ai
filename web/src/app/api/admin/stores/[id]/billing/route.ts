/**
 * /api/admin/stores/[id]/billing — GET lista de faturas
 *
 * Autorização: super_admin (qualquer loja) ou store_owner/store_manager (própria loja)
 * Header: Authorization: Bearer <supabase_jwt>
 *
 * Query params: status (all|open|paid|overdue|cancelled), page, limit
 */
import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';

import { getUserFromRequest } from '@/lib/auth/session';
import { requireRole, forbidCrossTenant, rbacError } from '@/lib/auth/rbac';
import { ListInvoicesSchema } from '@/lib/contracts/billing';
import { listInvoices } from '@/lib/services/billing.service';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, ctx: RouteContext) {
  const { id: storeId } = await ctx.params;

  const user = await getUserFromRequest(request.headers.get('authorization'));
  const rbac = await requireRole(user, ['super_admin', 'store_owner', 'store_manager']);
  if (!rbac.ok) return rbacError(rbac);

  const crossTenantBlock = forbidCrossTenant(rbac, storeId);
  if (crossTenantBlock) return crossTenantBlock;

  const sp = Object.fromEntries(request.nextUrl.searchParams.entries());

  let params: ReturnType<typeof ListInvoicesSchema.parse>;
  try {
    params = ListInvoicesSchema.parse(sp);
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: 'Parâmetros inválidos.', issues: err.issues }, { status: 422 });
    }
    throw err;
  }

  try {
    const page = await listInvoices(storeId, params);
    return NextResponse.json(page);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
