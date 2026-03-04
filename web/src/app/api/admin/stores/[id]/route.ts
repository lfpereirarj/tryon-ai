/**
 * /api/admin/stores/[id] — Detalhes / Atualização de loja (Super Admin only)
 *
 * GET   → detalhes da loja
 * PATCH → atualiza campos da loja (name, domain, plan, status, allowedOrigins)
 *
 * Header obrigatório: Authorization: Bearer <supabase_jwt>
 */
import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';

import { getUserFromRequest } from '@/lib/auth/session';
import { requireRole, rbacError } from '@/lib/auth/rbac';
import { UpdateStoreSchema } from '@/lib/contracts/admin';
import { getStoreById, updateStore } from '@/lib/services/store.service';

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
  const user = await getUserFromRequest(request.headers.get('authorization'));
  const rbac = await requireRole(user, ['super_admin']);
  if (!rbac.ok) return rbacError(rbac);

  const { id } = await ctx.params;
  const store = await getStoreById(id);
  if (!store) return safeError('Loja não encontrada.', 404);

  return NextResponse.json({ store });
}

export async function PATCH(request: NextRequest, ctx: RouteContext) {
  const user = await getUserFromRequest(request.headers.get('authorization'));
  const rbac = await requireRole(user, ['super_admin']);
  if (!rbac.ok) return rbacError(rbac);

  const { id } = await ctx.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return safeError('Payload JSON inválido.', 400);
  }

  let input: ReturnType<typeof UpdateStoreSchema.parse>;
  try {
    input = UpdateStoreSchema.parse(body);
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

  const updated = await updateStore(id, input);
  if (!updated) return safeError('Loja não encontrada ou falha ao atualizar.', 404);

  return NextResponse.json({ store: updated });
}
