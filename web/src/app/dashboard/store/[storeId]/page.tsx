'use client';

/**
 * /dashboard/store/[storeId] — Dashboard de KPIs do lojista
 *
 * Carrega automaticamente usando o JWT da sessão.
 * Não precisa inserir API Key manualmente.
 */
import { useState, useTransition, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import { RefreshCw } from 'lucide-react';
import { getSupabaseBrowser } from '@/lib/clients/supabase-browser';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

interface KpiResult {
  totalGenerations: number;
  successCount: number;
  successRate: number;
  avgLatencyMs: number | null;
  influencedCount: number;
  influencedRevenue: number;
}

const PERIODS = [
  { label: 'Últimos 7 dias', days: 7 },
  { label: 'Últimos 30 dias', days: 30 },
  { label: 'Últimos 90 dias', days: 90 },
] as const;

function isoFrom(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

// ---------------------------------------------------------------------------
// KPI Card
// ---------------------------------------------------------------------------

function KpiCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="border border-border bg-background rounded-sm p-5 flex flex-col gap-1">
      <span className="font-mono text-[10px] text-muted-foreground tracking-widest uppercase">
        {label}
      </span>
      <span className="font-mono text-2xl font-bold text-foreground tracking-tight">{value}</span>
      {sub && <span className="font-mono text-[10px] text-muted-foreground">{sub}</span>}
    </div>
  );
}

function KpiCardSkeleton() {
  return (
    <div className="border border-border bg-background rounded-sm p-5 flex flex-col gap-2">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-7 w-20" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Utilitários de formatação
// ---------------------------------------------------------------------------

const fmt = (n: number) => n.toLocaleString('pt-BR');
const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
const ms  = (n: number | null) => n == null ? '—' : `${Math.round(n).toLocaleString('pt-BR')} ms`;
const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

export default function StoreDashboardPage() {
  const { storeId } = useParams<{ storeId: string }>();

  const [kpis, setKpis] = useState<KpiResult | null>(null);
  const [periodIdx, setPeriodIdx] = useState(0);
  const [, startTransition] = useTransition();
  const [loading, setLoading] = useState(true);

  const period = PERIODS[periodIdx];

  const loadKpis = useCallback(async (idx: number) => {
    setLoading(true);
    startTransition(async () => {
      try {
        const { data: { session } } = await getSupabaseBrowser().auth.getSession();
        if (!session) { toast.error('Sessão expirada.'); return; }

        const p = PERIODS[idx];
        const params = new URLSearchParams({
          from: isoFrom(p.days),
          to: new Date().toISOString(),
        });

        const res = await fetch(
          `/api/store/${storeId}/analytics/kpis?${params.toString()}`,
          { headers: { Authorization: `Bearer ${session.access_token}` } },
        );

        const json = await res.json() as KpiResult & { error?: string };
        if (!res.ok) { toast.error(json.error ?? `Erro ${res.status}`); return; }
        setKpis(json);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Falha ao carregar KPIs.');
      } finally {
        setLoading(false);
      }
    });
  }, [storeId]);

  useEffect(() => { void loadKpis(periodIdx); }, [loadKpis, periodIdx]);

  return (
    <div className="max-w-3xl space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-mono text-xl font-bold tracking-tight">Dashboard</h1>
          <p className="font-mono text-xs text-muted-foreground mt-0.5">
            Métricas de uso e atribuição
          </p>
        </div>
        <Button
          variant="outline" size="sm"
          className="font-mono text-xs border-border gap-2 h-8"
          disabled={loading}
          onClick={() => void loadKpis(periodIdx)}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Seletor de período */}
      <div className="flex gap-2">
        {PERIODS.map((p, i) => (
          <button
            key={i}
            onClick={() => {
              setPeriodIdx(i);
              void loadKpis(i);
            }}
            className={`font-mono text-xs px-3 py-1.5 border rounded-sm transition-colors ${
              periodIdx === i
                ? 'border-primary text-primary bg-primary/5'
                : 'border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Seção — Geração */}
      <section className="space-y-3">
        <h2 className="font-mono text-[10px] text-muted-foreground tracking-widest uppercase">
          Geração de imagens
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => <KpiCardSkeleton key={i} />)
          ) : !kpis ? null : (
            <>
              <KpiCard label="Total de gerações" value={fmt(kpis.totalGenerations)} />
              <KpiCard
                label="Geradas com sucesso"
                value={fmt(kpis.successCount)}
                sub={pct(kpis.successRate)}
              />
              <KpiCard
                label="Latência média"
                value={ms(kpis.avgLatencyMs)}
                sub="p50 estimado"
              />
            </>
          )}
        </div>
      </section>

      {/* Seção — Atribuição */}
      <section className="space-y-3">
        <h2 className="font-mono text-[10px] text-muted-foreground tracking-widest uppercase">
          Atribuição de receita
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {loading ? (
            Array.from({ length: 2 }).map((_, i) => <KpiCardSkeleton key={i} />)
          ) : !kpis ? null : (
            <>
              <KpiCard
                label="Pedidos influenciados"
                value={fmt(kpis.influencedCount)}
                sub="último SKU experimentado, 24h"
              />
              <KpiCard
                label="Receita influenciada"
                value={brl(kpis.influencedRevenue)}
              />
            </>
          )}
        </div>
      </section>

      {!loading && !kpis && (
        <p className="font-mono text-xs text-muted-foreground text-center py-12">
          Nenhum dado disponível para este período.
        </p>
      )}

      <p className="font-mono text-[10px] text-muted-foreground/50">
        {period.label} · Atualizado em{' '}
        {new Date().toLocaleDateString('pt-BR', {
          day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
        })}
      </p>
    </div>
  );
}
