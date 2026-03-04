/**
 * Store Layout — guard store_owner / store_manager + sidebar do lojista
 *
 * Server Component: verifica sessão + role + cross-tenant antes de renderizar.
 * - super_admin pode acessar qualquer loja
 * - store_owner / store_manager só acessam a própria loja
 */
import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { Separator } from '@/components/ui/separator';
import { LogoutButton } from '@/components/logout-button';
import { createSupabaseServerClient } from '@/lib/clients/supabase-server';
import { getSupabaseAdmin } from '@/lib/clients/supabase';
import { InstallWidgetButton } from '@/components/install-widget-button';

export const metadata: Metadata = {
  title: 'TryOn AI — Minha Loja',
  description: 'Painel do lojista — TryOn AI',
};

type Props = {
  children: React.ReactNode;
  params: Promise<{ storeId: string }>;
};

export default async function StoreLayout({ children, params }: Props) {
  const { storeId } = await params;

  /* ── Auth check ─────────────────────────────────────────── */
  const cookieStore = await cookies();
  const supabase = createSupabaseServerClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  // Verifica que o usuário pertence a esta loja (ou é super_admin)
  const { data } = await getSupabaseAdmin()
    .from('store_users')
    .select('role, store_id')
    .eq('user_id', user.id)
    .or(`store_id.eq.${storeId},role.eq.super_admin`)
    .maybeSingle();

  if (!data) redirect('/dashboard');

  // Lojista tentando acessar loja de outro → redireciona
  if (data.role !== 'super_admin' && data.store_id !== storeId) {
    redirect('/dashboard');
  }

  /* ── Nav items ──────────────────────────────────────────── */
  const STORE_NAV = [
    { href: `/dashboard/store/${storeId}`, label: 'Dashboard', icon: '◎' },
    { href: `/dashboard/store/${storeId}/integration`, label: 'Integração VTEX', icon: '⬡' },
    { href: `/dashboard/store/${storeId}/catalog`, label: 'Catálogo', icon: '◈' },
    { href: `/dashboard/store/${storeId}/settings`, label: 'Dados da Loja', icon: '▤' },
  ];

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
            LOJA
          </span>
        </div>

        {/* Nav */}
        <nav className="flex flex-col gap-0.5 px-3 pt-4 flex-1">
          {STORE_NAV.map((item) => (
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
          v0.3.0 · lojista
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col min-w-0">
        <header className="flex items-center justify-between px-8 h-14 border-b border-border bg-sidebar">
          <span className="font-mono text-xs text-muted-foreground">
            TryOn AI — Minha Loja
          </span>
          <div className="flex items-center gap-4">
            {/* Instalação: botão no header, não no menu lateral */}
            <InstallWidgetButton storeId={storeId} />
            <LogoutButton />
          </div>
        </header>

        <main className="flex-1 overflow-auto p-8">{children}</main>
      </div>
    </div>
  );
}
