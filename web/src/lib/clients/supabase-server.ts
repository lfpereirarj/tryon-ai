/**
 * supabase-server.ts — Supabase client para Server Components e Route Handlers
 *
 * Usa @supabase/ssr para ler/persistir sessão em cookies HTTP-only.
 * Importar apenas em contextos server-side (Server Components, route.ts).
 *
 * Uso em Server Component:
 *   import { createSupabaseServerClient } from '@/lib/clients/supabase-server';
 *   import { cookies } from 'next/headers';
 *   const supabase = createSupabaseServerClient(await cookies());
 *
 * Uso em Route Handler (read-only, não precisa refresh):
 *   const supabase = createSupabaseServerClient(await cookies(), { readonly: true });
 */
import { createServerClient } from '@supabase/ssr';
import type { ReadonlyRequestCookies } from 'next/dist/server/web/spec-extension/adapters/request-cookies';

export function createSupabaseServerClient(
  cookieStore: ReadonlyRequestCookies,
) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            // cookieStore de Server Components é read-only — ignora silenciosamente
            // O refresh de token é feito pelo middleware, não aqui
            cookieStore.set?.(name, value, options),
          );
        } catch {
          // Ignorado em Server Components read-only
        }
      },
    },
  });
}
