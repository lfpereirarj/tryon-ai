'use client';

import { useRouter } from 'next/navigation';
import { getSupabaseBrowser } from '@/lib/clients/supabase-browser';

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    const supabase = getSupabaseBrowser();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      className="font-mono text-xs text-muted-foreground transition-colors hover:text-primary"
    >
      sair
    </button>
  );
}
