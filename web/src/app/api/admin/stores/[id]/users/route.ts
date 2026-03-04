/**
 * /api/admin/stores/[id]/users — Gerência de usuários de uma loja (Super Admin only)
 *
 * GET  → lista usuários vinculados à loja
 * POST → vincula usuário à loja com role
 *
 * Header obrigatório: Authorization: Bearer <supabase_jwt>
 */
import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';

import { getUserFromRequest } from '@/lib/auth/session';
import { requireRole, rbacError } from '@/lib/auth/rbac';
import { AddStoreUserSchema } from '@/lib/contracts/admin';
import { listStoreUsers, addStoreUser } from '@/lib/services/store.service';

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
  const users = await listStoreUsers(id);
  return NextResponse.json({ users });
}

export async function POST(request: NextRequest, ctx: RouteContext) {
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

  let input: ReturnType<typeof AddStoreUserSchema.parse>;
  try {
    input = AddStoreUserSchema.parse(body);
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

  try {
    const storeUser = await addStoreUser(id, input.userId, input.role);
    return NextResponse.json({ storeUser }, { status: 201 });
  } catch (err: unknown) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error('[Admin/StoreUsers] Falha:', detail);
    return safeError('Falha ao vincular usuário.', 500, detail);
  }
}
