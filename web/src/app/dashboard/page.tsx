/**
 * /dashboard — Redirect inteligente por role
 *
 * Server Component: lê sessão via Supabase SSR + consulta role no banco.
 *
 * super_admin        → /dashboard/admin
 * store_owner /
 * store_manager      → /dashboard/store/[storeId]
 * sem role / sem auth → /login
 */
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { createSupabaseServerClient } from '@/lib/clients/supabase-server';
import { getSupabaseAdmin } from '@/lib/clients/supabase';

export default async function DashboardIndexPage() {
  const cookieStore = await cookies();
  const supabase = createSupabaseServerClient(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data } = await getSupabaseAdmin()
    .from('store_users')
    .select('role, store_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!data) redirect('/login');

  if (data.role === 'super_admin') {
    redirect('/dashboard/admin');
  }

  redirect(`/dashboard/store/${data.store_id as string}`);
}
