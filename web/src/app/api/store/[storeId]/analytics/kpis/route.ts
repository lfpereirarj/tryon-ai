/**
 * GET /api/store/[storeId]/analytics/kpis
 *
 * Mesmas métricas do endpoint público, mas autenticado via JWT do Supabase.
 * Usado pelo dashboard do lojista — sem precisar digitar a API Key.
 *
 * Roles permitidos: super_admin, store_owner, store_manager (somente sua loja)
 */
import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';

import { KpiRequestSchema } from '@/lib/contracts/v1';
import { getKpis } from '@/lib/services/analytics.service';
import { getUserFromRequest } from '@/lib/auth/session';
import { requireRole, forbidCrossTenant, rbacError } from '@/lib/auth/rbac';

type RouteContext = { params: Promise<{ storeId: string }> };

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

function safeError(message: string, status: number, details?: string) {
  return NextResponse.json(
    { error: message, ...(IS_PRODUCTION ? {} : { details }) },
    { status },
  );
}

export async function GET(request: NextRequest, ctx: RouteContext) {
  const { storeId } = await ctx.params;

  const user = await getUserFromRequest(request.headers.get('authorization'));
  const rbac = await requireRole(user, ['super_admin', 'store_owner', 'store_manager']);
  if (!rbac.ok) return rbacError(rbac);

  const crossTenantBlock = forbidCrossTenant(rbac, storeId);
  if (crossTenantBlock) return crossTenantBlock;

  const { searchParams } = request.nextUrl;

  let parsed: ReturnType<typeof KpiRequestSchema.parse>;
  try {
    parsed = KpiRequestSchema.parse({
      from: searchParams.get('from'),
      to: searchParams.get('to'),
    });
  } catch (err) {
    if (err instanceof ZodError) {
      return safeError(
        'Parâmetros inválidos.',
        400,
        err.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join('; '),
      );
    }
    return safeError('Parâmetros inválidos.', 400);
  }

  const kpis = await getKpis(storeId, parsed.from, parsed.to);
  return NextResponse.json(kpis);
}
