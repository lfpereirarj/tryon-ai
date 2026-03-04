/**
 * /api/admin/stores/[id]/integration — GET/PUT integração VTEX da loja
 *
 * GET  → retorna integração (token mascarado)
 * PUT  → cria ou atualiza integração (token criptografado antes de salvar)
 *
 * Autorização: super_admin (qualquer loja) ou store_owner/store_manager (própria loja)
 * Header: Authorization: Bearer <supabase_jwt>
 */
import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';

import { getUserFromRequest } from '@/lib/auth/session';
import { requireRole, forbidCrossTenant, rbacError } from '@/lib/auth/rbac';
import { SaveIntegrationSchema } from '@/lib/contracts/integration';
import {
  getIntegration,
  saveIntegration,
} from '@/lib/services/vtex-integration.service';

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

  // Impede acesso cross-tenant para não-super_admins
  const crossTenantBlock = forbidCrossTenant(rbac, storeId);
  if (crossTenantBlock) return crossTenantBlock;

  try {
    const integration = await getIntegration(storeId);
    return NextResponse.json({ integration });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return safeError('Erro ao buscar integração.', 500, msg);
  }
}

export async function PUT(request: NextRequest, ctx: RouteContext) {
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

  let input: ReturnType<typeof SaveIntegrationSchema.parse>;
  try {
    input = SaveIntegrationSchema.parse(body);
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: 'Dados inválidos.', issues: err.issues }, { status: 422 });
    }
    throw err;
  }

  try {
    const integration = await saveIntegration(storeId, input);
    return NextResponse.json({ integration }, { status: 200 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // Evita expor detalhes de configuração de chave em produção
    if (IS_PRODUCTION && msg.includes('[crypto]')) {
      return safeError('Erro de configuração do servidor.', 500);
    }
    return safeError('Erro ao salvar integração.', 500, msg);
  }
}
