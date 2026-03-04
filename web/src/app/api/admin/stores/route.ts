/**
 * /api/admin/stores — Lista e cria lojas (Super Admin only)
 *
 * GET  → lista todas as lojas
 * POST → cria nova loja
 *
 * Header obrigatório: Authorization: Bearer <supabase_jwt>
 */
import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';

import { getUserFromRequest } from '@/lib/auth/session';
import { requireRole, rbacError } from '@/lib/auth/rbac';
import { CreateStoreSchema } from '@/lib/contracts/admin';
import { listStores, createStore } from '@/lib/services/store.service';

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

function safeError(message: string, status: number, details?: string) {
  return NextResponse.json(
    { error: message, ...(IS_PRODUCTION ? {} : { details }) },
    { status },
  );
}

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request.headers.get('authorization'));
  const rbac = await requireRole(user, ['super_admin']);
  if (!rbac.ok) return rbacError(rbac);

  const stores = await listStores();
  return NextResponse.json({ stores });
}

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request.headers.get('authorization'));
  const rbac = await requireRole(user, ['super_admin']);
  if (!rbac.ok) return rbacError(rbac);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return safeError('Payload JSON inválido.', 400);
  }

  let input: ReturnType<typeof CreateStoreSchema.parse>;
  try {
    input = CreateStoreSchema.parse(body);
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
    const store = await createStore(input);
    return NextResponse.json({ store }, { status: 201 });
  } catch (err: unknown) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error('[Admin/Stores] Falha ao criar loja:', detail);
    return safeError('Falha ao criar loja.', 500, detail);
  }
}
