/**
 * session.ts — Leitura de sessão de usuário via Supabase Auth
 *
 * Usado pelas rotas de API administrativas para identificar
 * o usuário autenticado a partir do JWT no header Authorization.
 */
import { getSupabaseAdmin } from '@/lib/clients/supabase';

export interface AuthUser {
  id: string;
  email: string | undefined;
}

/**
 * Extrai e verifica o JWT do header Authorization (Bearer <token>).
 * Retorna o usuário autenticado ou null se o token for inválido/ausente.
 */
export async function getUserFromRequest(
  authHeader: string | null,
): Promise<AuthUser | null> {
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.slice(7).trim();
  if (!token) return null;

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) return null;

  return {
    id: data.user.id,
    email: data.user.email,
  };
}
