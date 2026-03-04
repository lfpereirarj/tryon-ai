/**
 * supabase-browser.ts — Supabase client para uso no browser (componentes React client-side)
 *
 * Usa @supabase/ssr createBrowserClient que persiste sessão em cookies,
 * permitindo que o middleware de autenticação server-side leia a sessão.
 * Importar apenas em Client Components ('use client').
 */
import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;

export function getSupabaseBrowser(): SupabaseClient {
  if (_client) return _client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      '[Supabase Browser] NEXT_PUBLIC_SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_ANON_KEY não configurados.',
    );
  }

  _client = createBrowserClient(url, anonKey);

  return _client;
}
