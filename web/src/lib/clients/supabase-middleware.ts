/**
 * supabase-middleware.ts — Supabase client para uso no Edge Middleware
 *
 * Necessário estar separado do server client pois o middleware usa
 * NextRequest/NextResponse ao invés de ReadonlyRequestCookies.
 */
import { createServerClient } from '@supabase/ssr';
import type { NextRequest, NextResponse } from 'next/server';

export function createSupabaseMiddlewareClient(
  request: NextRequest,
  response: NextResponse,
) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });
}
