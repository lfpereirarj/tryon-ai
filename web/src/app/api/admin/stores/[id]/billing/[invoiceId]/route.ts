/**
 * /api/admin/stores/[id]/billing/[invoiceId] — GET fatura individual
 *
 * Autorização: super_admin (qualquer loja) ou store_owner/store_manager (própria loja)
 * Header: Authorization: Bearer <supabase_jwt>
 */
import { NextRequest, NextResponse } from 'next/server';

import { getUserFromRequest } from '@/lib/auth/session';
import { requireRole, forbidCrossTenant, rbacError } from '@/lib/auth/rbac';
import { getInvoice } from '@/lib/services/billing.service';

interface RouteContext {
  params: Promise<{ id: string; invoiceId: string }>;
}

export async function GET(request: NextRequest, ctx: RouteContext) {
  const { id: storeId, invoiceId } = await ctx.params;

  const user = await getUserFromRequest(request.headers.get('authorization'));
  const rbac = await requireRole(user, ['super_admin', 'store_owner', 'store_manager']);
  if (!rbac.ok) return rbacError(rbac);

  const crossTenantBlock = forbidCrossTenant(rbac, storeId);
  if (crossTenantBlock) return crossTenantBlock;

  try {
    const invoice = await getInvoice(storeId, invoiceId);
    if (!invoice) {
      return NextResponse.json({ error: 'Fatura não encontrada.' }, { status: 404 });
    }
    return NextResponse.json({ invoice });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
