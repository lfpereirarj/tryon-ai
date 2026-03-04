/**
 * POST /api/auth/logout — Encerra a sessão do usuário
 */
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/clients/supabase';
import { getUserFromRequest } from '@/lib/auth/session';

export async function POST(req: Request) {
  const user = await getUserFromRequest(req.headers.get('Authorization'));

  // Se houver token válido, tenta revogar a sessão no lado do servidor.
  // Logout é best-effort: mesmo que a revogação falhe, o cliente já limpou
  // os cookies via createBrowserClient.signOut(), então nunca retornamos erro.
  if (user) {
    try {
      const supabase = getSupabaseAdmin();
      await supabase.auth.admin.signOut(
        req.headers.get('Authorization')!.slice(7),
      );
    } catch {
      // Ignora falhas de revogação — não interrompe o fluxo de logout
    }
  }

  return NextResponse.json({ ok: true });
}
