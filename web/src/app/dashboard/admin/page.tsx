'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getSupabaseBrowser } from '@/lib/clients/supabase-browser';

interface StoreRow {
  id: string;
  name: string;
  domain: string | null;
  public_api_key: string;
  status: string;
  plan: string;
  created_at: string;
}

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  active: 'default',
  suspended: 'destructive',
  cancelled: 'secondary',
};

const PLAN_LABEL: Record<string, string> = {
  free: 'Free',
  starter: 'Starter',
  pro: 'Pro',
  enterprise: 'Enterprise',
};

export default function AdminStoresPage() {
  const [stores, setStores] = useState<StoreRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStores = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { session } } = await getSupabaseBrowser().auth.getSession();
      if (!session) { toast.error('Sessão expirada. Faça login novamente.'); return; }

      const res = await fetch('/api/admin/stores', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const json = await res.json() as { stores?: StoreRow[]; error?: string };

      if (!res.ok) { toast.error(json.error ?? `Erro ${res.status}`); return; }
      setStores(json.stores ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao carregar lojas.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchStores(); }, [fetchStores]);

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-mono text-xl font-bold tracking-tight">Lojas</h1>
          <p className="font-mono text-xs text-muted-foreground mt-1">
            {loading ? '…' : `${stores.length} registro${stores.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <Button asChild size="sm" className="font-mono font-bold tracking-wider">
          <Link href="/dashboard/admin/stores/new">+ Nova loja</Link>
        </Button>
      </div>

      {/* Table */}
      <div className="border border-border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-border">
              <TableHead className="font-mono text-xs text-muted-foreground tracking-widest">NOME</TableHead>
              <TableHead className="font-mono text-xs text-muted-foreground tracking-widest">DOMÍNIO</TableHead>
              <TableHead className="font-mono text-xs text-muted-foreground tracking-widest">PLANO</TableHead>
              <TableHead className="font-mono text-xs text-muted-foreground tracking-widest">STATUS</TableHead>
              <TableHead className="font-mono text-xs text-muted-foreground tracking-widest">CRIADA EM</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i} className="border-border">
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell />
                </TableRow>
              ))
            ) : stores.length === 0 ? (
              <TableRow className="border-border hover:bg-transparent">
                <TableCell colSpan={6} className="text-center py-10 font-mono text-sm text-muted-foreground">
                  Nenhuma loja cadastrada.{' '}
                  <Link href="/dashboard/admin/stores/new" className="text-primary underline-offset-4 hover:underline">
                    Criar primeira loja →
                  </Link>
                </TableCell>
              </TableRow>
            ) : (
              stores.map((store) => (
                <TableRow key={store.id} className="border-border">
                  <TableCell>
                    <span className="font-mono text-sm font-medium">{store.name}</span>
                    <div className="font-mono text-xs text-muted-foreground mt-0.5" title={store.public_api_key}>
                      {store.public_api_key.slice(0, 8)}…
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {store.domain ?? '—'}
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-xs font-semibold text-muted-foreground">
                      {PLAN_LABEL[store.plan] ?? store.plan}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[store.status] ?? 'secondary'} className="font-mono text-xs tracking-wider">
                      {store.status.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {new Date(store.created_at).toLocaleDateString('pt-BR')}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild variant="ghost" size="sm" className="font-mono text-xs text-muted-foreground hover:text-primary">
                      <Link href={`/dashboard/admin/stores/${store.id}`}>editar →</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
