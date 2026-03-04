/**
 * /api/admin/stores/[id]/catalog — GET lista / POST adiciona produto
 *
 * GET  → lista paginada do catálogo local (query, enabled, page, limit)
 * POST → adiciona UM produto ao catálogo TryOn (body: AddProductSchema)
 *
 * Para buscar produtos na VTEX ao vivo, use:
 *   GET /api/admin/stores/[id]/catalog/search?q=...
 *
 * Autorização: super_admin (qualquer loja) ou store_owner/store_manager (própria loja)
 * Header: Authorization: Bearer <supabase_jwt>
 */
import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';

import { getUserFromRequest } from '@/lib/auth/session';
import { requireRole, forbidCrossTenant, rbacError } from '@/lib/auth/rbac';
import { ListCatalogSchema, AddProductSchema } from '@/lib/contracts/catalog';
import { listCatalog, addProductToTryon } from '@/lib/services/catalog.service';

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

  let params: ReturnType<typeof ListCatalogSchema.parse>;
  try {
    params = ListCatalogSchema.parse(sp);
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: 'Parâmetros inválidos.', issues: err.issues }, { status: 422 });
    }
    throw err;
  }

  try {
    const page = await listCatalog(storeId, params);
    return NextResponse.json(page);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return safeError('Erro ao listar catálogo.', 500, msg);
  }
}

export async function POST(request: NextRequest, ctx: RouteContext) {
  const { id: storeId } = await ctx.params;
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

  let input: ReturnType<typeof AddProductSchema.parse>;
  try {
    input = AddProductSchema.parse(body);
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: 'Dados inválidos.', issues: err.issues }, { status: 422 });
    }
    throw err;
  }

  try {
    const product = await addProductToTryon(storeId, input);
    return NextResponse.json({ product }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return safeError('Erro ao adicionar produto ao catálogo.', 500, msg);
  }
}
