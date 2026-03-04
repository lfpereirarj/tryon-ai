/**
 * middleware.ts — Proteção de rotas por autenticação (Edge Runtime)
 *
 * Regras:
 * - /dashboard/**  → requer sessão autenticada; sem sessão → redirect /login
 * - /login         → se já autenticado → redirect /dashboard
 * - /api/**        → sem redirect (autenticação feita por Bearer token nas rotas)
 *
 * Usa @supabase/ssr para ler a sessão a partir dos cookies HTTP
 * (definidos pelo createBrowserClient no lado do client).
 */
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createSupabaseMiddlewareClient } from '@/lib/clients/supabase-middleware';

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request });
  const { pathname } = request.nextUrl;

  // Rotas de API: não redirecionar, deixar a rota tratar o Bearer token
  if (pathname.startsWith('/api/')) {
    return response;
  }

  const supabase = createSupabaseMiddlewareClient(request, response);

  // Refresca a sessão e obtém o usuário (nunca confiar só no cookie sem revalidar)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthenticated = Boolean(user);
  const isDashboard = pathname.startsWith('/dashboard');
  const isLogin = pathname === '/login';

  // Usuário NÃO autenticado tentando acessar /dashboard/** → /login
  if (isDashboard && !isAuthenticated) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Usuário JÁ autenticado tentando acessar /login → /dashboard
  if (isLogin && isAuthenticated) {
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = '/dashboard';
    dashboardUrl.searchParams.delete('next');
    return NextResponse.redirect(dashboardUrl);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Aplica middleware em todas as rotas EXCETO:
     * - _next/static  (arquivos estáticos)
     * - _next/image   (otimização de imagens)
     * - favicon.ico   (favicon)
     * - arquivos com extensão (js, css, png, etc.)
     */
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)',
  ],
};
