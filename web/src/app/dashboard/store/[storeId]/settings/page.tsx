'use client';

/**
 * /dashboard/store/[storeId]/settings — Dados da Loja (portal lojista)
 *
 * Sprint 3 placeholder — configurações de loja, plano e pagamentos (Sprint 4)
 */
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { LayoutDashboard, Settings2, ShoppingBag, Database, Construction } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function StoreSettingsPage() {
  const { storeId } = useParams<{ storeId: string }>();

  return (
    <div className="max-w-4xl space-y-8">
      {/* Tabs do portal lojista */}
      <div className="flex gap-1 border-b border-border pb-0">
        <Button asChild variant="ghost" size="sm" className="font-mono text-xs text-muted-foreground hover:text-primary gap-1.5">
          <Link href={`/dashboard/store/${storeId}`}>
            <LayoutDashboard className="h-3.5 w-3.5" />Dashboard
          </Link>
        </Button>
        <Button asChild variant="ghost" size="sm" className="font-mono text-xs text-muted-foreground hover:text-primary gap-1.5">
          <Link href={`/dashboard/store/${storeId}/integration`}>
            <Settings2 className="h-3.5 w-3.5" />Integração VTEX
          </Link>
        </Button>
        <Button asChild variant="ghost" size="sm" className="font-mono text-xs text-muted-foreground hover:text-primary gap-1.5">
          <Link href={`/dashboard/store/${storeId}/catalog`}>
            <ShoppingBag className="h-3.5 w-3.5" />Catálogo
          </Link>
        </Button>
        <span className="font-mono text-xs px-3 py-2 border-b-2 border-primary text-primary flex items-center gap-1.5">
          <Database className="h-3.5 w-3.5" />Dados da Loja
        </span>
      </div>

      {/* Placeholder */}
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
        <Construction className="h-10 w-10 text-muted-foreground/40" />
        <p className="font-mono text-sm font-semibold text-foreground">Em desenvolvimento</p>
        <p className="font-mono text-xs text-muted-foreground max-w-xs">
          Configurações de conta, plano de assinatura e pagamentos estarão disponíveis em breve.
        </p>
      </div>
    </div>
  );
}
