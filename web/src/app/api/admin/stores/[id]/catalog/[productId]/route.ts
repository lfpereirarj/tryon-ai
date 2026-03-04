/**
 * /api/admin/stores/[id]/catalog/[productId]
 *
 * PATCH → habilita ou desabilita um SKU para try-on
 *         body: { enabled: boolean, reason?: string }
 * DELETE → remove o produto do catálogo TryOn
 *
 * Autorização: super_admin (qualquer loja) ou store_owner (própria loja)
 * Header: Authorization: Bearer <supabase_jwt>
 */
import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';

import { getUserFromRequest } from '@/lib/auth/session';
import { requireRole, forbidCrossTenant, rbacError } from '@/lib/auth/rbac';
import { ToggleSkuSchema } from '@/lib/contracts/catalog';
import { toggleSku, removeFromCatalog } from '@/lib/services/catalog.service';

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

function safeError(message: string, status: number, details?: string) {
  return NextResponse.json(
    { error: message, ...(IS_PRODUCTION ? {} : { details }) },
    { status },
  );
}

interface RouteContext {
  params: Promise<{ id: string; productId: string }>;
}

export async function PATCH(request: NextRequest, ctx: RouteContext) {
  const { id: storeId, productId } = await ctx.params;
  const user = await getUserFromRequest(request.headers.get('authorization'));
  const rbac = await requireRole(user, ['super_admin', 'store_owner']);
  if (!rbac.ok) return rbacError(rbac);

  const crossTenantBlock = forbidCrossTenant(rbac, storeId);
  if (crossTenantBlock) return crossTenantBlock;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return safeError('Payload JSON inválido.', 400);
  }

  let input: ReturnType<typeof ToggleSkuSchema.parse>;
  try {
    input = ToggleSkuSchema.parse(body);
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: 'Dados inválidos.', issues: err.issues }, { status: 422 });
    }
    throw err;
  }

  try {
    const product = await toggleSku(storeId, productId, input);
    return NextResponse.json({ product });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('não encontrado')) return safeError(msg, 404);
    return safeError('Erro ao atualizar SKU.', 500, msg);
  }
}

export async function DELETE(request: NextRequest, ctx: RouteContext) {
  const { id: storeId, productId } = await ctx.params;

  const user = await getUserFromRequest(request.headers.get('authorization'));
  const rbac = await requireRole(user, ['super_admin', 'store_owner']);
  if (!rbac.ok) return rbacError(rbac);

  const crossTenantBlock = forbidCrossTenant(rbac, storeId);
  if (crossTenantBlock) return crossTenantBlock;

  try {
    await removeFromCatalog(storeId, productId);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return safeError('Erro ao remover produto do catálogo.', 500, msg);
  }
}
