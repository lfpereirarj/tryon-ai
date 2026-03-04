/**
 * Admin Layout — guard super_admin + sidebar exclusiva do dono
 *
 * Server Component: verifica sessão + role antes de renderizar.
 * Redireciona para /login ou /dashboard se a check falhar.
 */
import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { Separator } from '@/components/ui/separator';
import { LogoutButton } from '@/components/logout-button';
import { createSupabaseServerClient } from '@/lib/clients/supabase-server';
import { getSupabaseAdmin } from '@/lib/clients/supabase';

export const metadata: Metadata = {
  title: 'TryOn AI — Admin',
  description: 'Painel do dono — TryOn AI',
};

const ADMIN_NAV = [
  { href: '/dashboard/admin', label: 'Lojas', icon: '▣' },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  /* ── Auth check ─────────────────────────────────────────── */
  const cookieStore = await cookies();
  const supabase = createSupabaseServerClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data } = await getSupabaseAdmin()
    .from('store_users')
    .select('role')
    .eq('user_id', user.id)
    .eq('role', 'super_admin')
    .maybeSingle();

  // Não é super_admin → redireciona para o portal do lojista (dashboard raiz resolve)
  if (!data) redirect('/dashboard');

  /* ── Render ─────────────────────────────────────────────── */
  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Sidebar */}
      <aside className="flex shrink-0 flex-col w-60 border-r border-border bg-sidebar">
        {/* Logo */}
        <div className="flex items-center gap-2 px-6 h-14 border-b border-border">
          <span className="font-mono text-sm font-bold text-primary tracking-widest">
            TRYON
          </span>
          <span className="font-mono text-[10px] text-muted-foreground tracking-widest px-1.5 py-0.5 border border-border rounded-sm">
            OWNER
          </span>
        </div>

        {/* Nav */}
        <nav className="flex flex-col gap-0.5 px-3 pt-4 flex-1">
          {ADMIN_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2 font-mono text-sm text-muted-foreground transition-colors hover:text-primary hover:bg-sidebar-accent rounded-sm"
            >
              <span className="text-[10px] text-muted-foreground/50">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        <Separator className="bg-border" />

        <div className="px-6 py-3 font-mono text-xs text-muted-foreground/40">
          v0.3.0 · dono
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col min-w-0">
        <header className="flex items-center justify-between px-8 h-14 border-b border-border bg-sidebar">
          <span className="font-mono text-xs text-muted-foreground">
            TryOn AI — Painel do Dono
          </span>
          <LogoutButton />
        </header>

        <main className="flex-1 overflow-auto p-8">{children}</main>
      </div>
    </div>
  );
}
