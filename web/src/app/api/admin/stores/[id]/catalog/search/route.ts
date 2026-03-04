/**
 * /api/admin/stores/[id]/catalog/search — Busca ao vivo na VTEX
 *
 * GET ?q=<termo>&limit=20&page=1
 *   → pesquisa na API pública da VTEX sem salvar nada no banco
 *   → retorna { results: VtexSearchResult[] }
 *
 * Autorização: super_admin ou store_owner/store_manager da loja
 * Header: Authorization: Bearer <supabase_jwt>
 */
import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';

import { getUserFromRequest } from '@/lib/auth/session';
import { requireRole, forbidCrossTenant, rbacError } from '@/lib/auth/rbac';
import { VtexSearchSchema } from '@/lib/contracts/catalog';
import { searchVtexProducts } from '@/lib/services/catalog.service';

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

function safeError(message: string, status: number, details?: string) {
  return NextResponse.json(
    { error: message, ...(IS_PRODUCTION ? {} : { details }) },
    { status },
  );
}

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

  let input: ReturnType<typeof VtexSearchSchema.parse>;
  try {
    input = VtexSearchSchema.parse(sp);
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: 'Parâmetros inválidos.', issues: err.issues }, { status: 422 });
    }
    throw err;
  }

  try {
    const results = await searchVtexProducts(storeId, input);
    return NextResponse.json({ results });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('não configurada')) return safeError(msg, 400);
    return safeError('Erro ao buscar produtos na VTEX.', 500, msg);
  }
}
