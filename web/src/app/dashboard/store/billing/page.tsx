'use client';

/**
 * /dashboard/store/billing — Faturamento (visão do lojista)
 * Sprint 2 MVP: redireciona para o painel admin enquanto o portal do lojista não está disponível.
 */
import Link from 'next/link';
import { Construction } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function StoreBillingPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center px-4">
      <Construction className="w-10 h-10 text-muted-foreground/40" />
      <div className="space-y-2">
        <h1 className="font-mono text-lg font-semibold tracking-tight text-foreground">
          Portal do Lojista — Em construção
        </h1>
        <p className="font-mono text-xs text-muted-foreground max-w-sm">
          Esta área está prevista para o Sprint 3.<br />
          Por enquanto, use o painel administrativo para consultar as faturas.
        </p>
      </div>
      <Button asChild variant="outline" className="font-mono text-xs">
        <Link href="/dashboard/admin">← Ir para o Admin</Link>
      </Button>
    </div>
  );
}
