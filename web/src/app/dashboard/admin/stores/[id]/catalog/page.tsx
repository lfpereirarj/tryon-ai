'use client';

/**
 * /dashboard/admin/stores/[id]/catalog — Catálogo elegível para try-on
 *
 * Seção 1 — "Buscar na VTEX": pesquisa ao vivo, adiciona produto por produto
 * Seção 2 — "Catálogo TryOn": lista local com toggle de elegibilidade + remover
 */
import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Search, Settings2, ShoppingBag, Puzzle, Receipt,
  ToggleLeft, ToggleRight, Plus, Trash2, Check, Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getSupabaseBrowser } from '@/lib/clients/supabase-browser';

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

interface ProductRow {
  id: string;
  skuId: string;
  name: string;
  imageUrl: string | null;
  price: number | null;
  department: string | null;
  enabled: boolean;
  syncedAt: string;
}

interface CatalogPage {
  items: ProductRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface VtexSearchResult {
  skuId: string;
  productId: string;
  name: string;
  imageUrl: string | null;
  price: number | null;
  department: string | null;
}

type EnabledFilter = 'all' | 'true' | 'false';

const LIMIT = 30;

// ---------------------------------------------------------------------------
// Utilitário
// ---------------------------------------------------------------------------

async function getBearerToken() {
  const { data: { session } } = await getSupabaseBrowser().auth.getSession();
  if (!session) throw new Error('Sessão expirada. Faça login novamente.');
  return session.access_token;
}

function fmtBRL(value: number | null) {
  if (value == null) return '—';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

export default function CatalogPage() {
  const { id: storeId } = useParams<{ id: string }>();

  // ── Catálogo local ──────────────────────────────────────────────
  const [catalog, setCatalog] = useState<CatalogPage | null>(null);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);

  const [q, setQ] = useState('');
  const [enabledFilter, setEnabledFilter] = useState<EnabledFilter>('all');
  const [page, setPage] = useState(1);

  // Conjunto de skuIds já no catálogo (para marcar resultados VTEX)
  const [catalogSkuIds, setCatalogSkuIds] = useState<Set<string>>(new Set());

  // ── Busca VTEX ──────────────────────────────────────────────────
  const [vtexQuery, setVtexQuery] = useState('');
  const [vtexResults, setVtexResults] = useState<VtexSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState<string | null>(null); // skuId sendo adicionado

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ---------------------------------------------------------------------------
  // Carregar catálogo local
  // ---------------------------------------------------------------------------

  const loadCatalog = useCallback(
    async (qVal: string, filter: EnabledFilter, pg: number) => {
      setLoadingCatalog(true);
      try {
        const token = await getBearerToken();
        const params = new URLSearchParams({
          page: String(pg),
          limit: String(LIMIT),
          enabled: filter,
        });
        if (qVal.trim()) params.set('q', qVal.trim());

        const res = await fetch(
          `/api/admin/stores/${storeId}/catalog?${params.toString()}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        const json = await res.json() as CatalogPage & { error?: string };
        if (!res.ok) { toast.error(json.error ?? `Erro ${res.status}`); return; }
        setCatalog(json);
        setCatalogSkuIds(new Set(json.items.map((p) => p.skuId)));
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Falha ao carregar catálogo.');
      } finally {
        setLoadingCatalog(false);
      }
    },
    [storeId],
  );

  useEffect(() => {
    void loadCatalog(q, enabledFilter, page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabledFilter, page]);

  function handleCatalogSearch(value: string) {
    setQ(value);
    setPage(1);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void loadCatalog(value, enabledFilter, 1);
    }, 400);
  }

  // ---------------------------------------------------------------------------
  // Busca VTEX ao vivo
  // ---------------------------------------------------------------------------

  async function handleVtexSearch(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = vtexQuery.trim();
    if (!trimmed) return;
    setSearching(true);
    setVtexResults([]);
    try {
      const token = await getBearerToken();
      const params = new URLSearchParams({ q: trimmed, limit: '20' });
      const res = await fetch(
        `/api/admin/stores/${storeId}/catalog/search?${params.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const json = await res.json() as { results?: VtexSearchResult[]; error?: string };
      if (!res.ok) { toast.error(json.error ?? `Erro ${res.status}`); return; }
      setVtexResults(json.results ?? []);
      if (!json.results?.length) toast.info('Nenhum produto encontrado na VTEX.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha na busca VTEX.');
    } finally {
      setSearching(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Adicionar produto ao catálogo TryOn
  // ---------------------------------------------------------------------------

  async function handleAdd(item: VtexSearchResult) {
    setAdding(item.skuId);
    try {
      const token = await getBearerToken();
      const res = await fetch(`/api/admin/stores/${storeId}/catalog`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          platform: 'vtex',
          skuId: item.skuId,
          productId: item.productId,
          name: item.name,
          imageUrl: item.imageUrl,
          price: item.price,
          department: item.department,
        }),
      });
      const json = await res.json() as { product?: ProductRow; error?: string };
      if (!res.ok) { toast.error(json.error ?? `Erro ${res.status}`); return; }
      toast.success(`"${item.name}" adicionado ao catálogo.`);
      // Marca o sku localmente e recarrega a tabela
      setCatalogSkuIds((prev) => new Set([...prev, item.skuId]));
      void loadCatalog(q, enabledFilter, 1);
      setPage(1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao adicionar produto.');
    } finally {
      setAdding(null);
    }
  }

  // ---------------------------------------------------------------------------
  // Toggle elegibilidade
  // ---------------------------------------------------------------------------

  async function handleToggle(product: ProductRow) {
    setToggling(product.id);
    try {
      const token = await getBearerToken();
      const newEnabled = !product.enabled;
      const res = await fetch(`/api/admin/stores/${storeId}/catalog/${product.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ enabled: newEnabled }),
      });
      const json = await res.json() as { product?: ProductRow; error?: string };
      if (!res.ok) { toast.error(json.error ?? `Erro ${res.status}`); return; }
      setCatalog((prev) =>
        prev
          ? { ...prev, items: prev.items.map((i) => i.id === product.id ? { ...i, enabled: newEnabled } : i) }
          : prev,
      );
      toast.success(newEnabled ? `SKU ${product.skuId} habilitado.` : `SKU ${product.skuId} desabilitado.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao atualizar SKU.');
    } finally {
      setToggling(null);
    }
  }

  // ---------------------------------------------------------------------------
  // Remover produto do catálogo
  // ---------------------------------------------------------------------------

  async function handleRemove(product: ProductRow) {
    if (!confirm(`Remover "${product.name}" do catálogo TryOn?`)) return;
    setRemoving(product.id);
    try {
      const token = await getBearerToken();
      const res = await fetch(`/api/admin/stores/${storeId}/catalog/${product.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const json = await res.json() as { error?: string };
        toast.error(json.error ?? `Erro ${res.status}`);
        return;
      }
      toast.success(`"${product.name}" removido do catálogo.`);
      setCatalogSkuIds((prev) => { const s = new Set(prev); s.delete(product.skuId); return s; });
      setCatalog((prev) =>
        prev ? { ...prev, items: prev.items.filter((i) => i.id !== product.id), total: prev.total - 1 } : prev,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao remover produto.');
    } finally {
      setRemoving(null);
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="max-w-4xl space-y-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
        <Link href="/dashboard/admin" className="hover:text-primary transition-colors">lojas</Link>
        <span>/</span>
        <Link href={`/dashboard/admin/stores/${storeId}`} className="hover:text-primary transition-colors">editar</Link>
        <span>/</span>
        <span className="text-foreground">catálogo</span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border pb-0">
        <Button asChild variant="ghost" size="sm" className="font-mono text-xs text-muted-foreground hover:text-primary gap-1.5">
          <Link href={`/dashboard/admin/stores/${storeId}`}>Dados</Link>
        </Button>
        <Button asChild variant="ghost" size="sm" className="font-mono text-xs text-muted-foreground hover:text-primary gap-1.5">
          <Link href={`/dashboard/admin/stores/${storeId}/integration`}>
            <Settings2 className="h-3.5 w-3.5" />Integração VTEX
          </Link>
        </Button>
        <span className="font-mono text-xs px-3 py-2 border-b-2 border-primary text-primary flex items-center gap-1.5">
          <ShoppingBag className="h-3.5 w-3.5" />Catálogo
        </span>
        <Button asChild variant="ghost" size="sm" className="font-mono text-xs text-muted-foreground hover:text-primary gap-1.5">
          <Link href={`/dashboard/admin/stores/${storeId}/installation`}>
            <Puzzle className="h-3.5 w-3.5" />Instalação
          </Link>
        </Button>
        <Button asChild variant="ghost" size="sm" className="font-mono text-xs text-muted-foreground hover:text-primary gap-1.5">
          <Link href={`/dashboard/admin/stores/${storeId}/billing`}>
            <Receipt className="h-3.5 w-3.5" />Faturamento
          </Link>
        </Button>
      </div>

      {/* ── Seção 1: Buscar na VTEX ─────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="font-mono text-sm font-semibold tracking-tight">Buscar na VTEX</h2>

        <form onSubmit={(e) => void handleVtexSearch(e)} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={vtexQuery}
              onChange={(e) => setVtexQuery(e.target.value)}
              placeholder="Nome do produto, SKU…"
              className="pl-9 font-mono text-sm bg-background border-border focus-visible:ring-primary h-9"
            />
          </div>
          <Button
            type="submit"
            variant="outline"
            size="sm"
            className="font-mono text-xs border-border gap-1.5 h-9"
            disabled={searching || !vtexQuery.trim()}
          >
            {searching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
            {searching ? 'Buscando…' : 'Buscar'}
          </Button>
        </form>

        {vtexResults.length > 0 && (
          <div className="border border-border rounded-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="font-mono text-xs text-muted-foreground tracking-widest w-16 text-center">IMG</TableHead>
                  <TableHead className="font-mono text-xs text-muted-foreground tracking-widest">PRODUTO / SKU</TableHead>
                  <TableHead className="font-mono text-xs text-muted-foreground tracking-widest hidden md:table-cell">CATEGORIA</TableHead>
                  <TableHead className="font-mono text-xs text-muted-foreground tracking-widest hidden sm:table-cell text-right">PREÇO</TableHead>
                  <TableHead className="w-28" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {vtexResults.map((item) => {
                  const already = catalogSkuIds.has(item.skuId);
                  const isAdding = adding === item.skuId;
                  return (
                    <TableRow key={item.skuId} className="border-border font-mono">
                      <TableCell className="text-center">
                        {item.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.imageUrl} alt={item.name} className="h-10 w-10 object-cover mx-auto rounded-sm border border-border" />
                        ) : (
                          <div className="h-10 w-10 mx-auto bg-muted/30 border border-border rounded-sm flex items-center justify-center">
                            <ShoppingBag className="h-4 w-4 text-muted-foreground/40" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <p className="text-xs font-semibold text-foreground line-clamp-2 leading-tight">{item.name}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">SKU {item.skuId}</p>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{item.department ?? '—'}</TableCell>
                      <TableCell className="hidden sm:table-cell text-xs text-right text-muted-foreground">{fmtBRL(item.price)}</TableCell>
                      <TableCell className="text-right pr-4">
                        {already ? (
                          <Badge variant="secondary" className="font-mono text-[10px] gap-1">
                            <Check className="h-3 w-3" />No catálogo
                          </Badge>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="font-mono text-xs border-border gap-1.5 h-7"
                            disabled={isAdding}
                            onClick={() => void handleAdd(item)}
                          >
                            {isAdding
                              ? <Loader2 className="h-3 w-3 animate-spin" />
                              : <Plus className="h-3 w-3" />}
                            {isAdding ? 'Adicionando…' : 'Adicionar'}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      {/* ── Seção 2: Catálogo TryOn ──────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="font-mono text-sm font-semibold tracking-tight">Catálogo TryOn</h2>

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => handleCatalogSearch(e.target.value)}
              placeholder="Filtrar por nome…"
              className="pl-9 font-mono text-sm bg-background border-border focus-visible:ring-primary h-9"
            />
          </div>
          <Select value={enabledFilter} onValueChange={(v) => { setEnabledFilter(v as EnabledFilter); setPage(1); }}>
            <SelectTrigger className="w-40 font-mono text-xs bg-background border-border h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="font-mono text-xs bg-popover border-border">
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="true">Habilitados</SelectItem>
              <SelectItem value="false">Desabilitados</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Tabela */}
        <div className="border border-border rounded-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="font-mono text-xs text-muted-foreground tracking-widest w-16 text-center">IMG</TableHead>
                <TableHead className="font-mono text-xs text-muted-foreground tracking-widest">PRODUTO / SKU</TableHead>
                <TableHead className="font-mono text-xs text-muted-foreground tracking-widest hidden md:table-cell">CATEGORIA</TableHead>
                <TableHead className="font-mono text-xs text-muted-foreground tracking-widest hidden sm:table-cell text-right">PREÇO</TableHead>
                <TableHead className="font-mono text-xs text-muted-foreground tracking-widest text-center w-28">STATUS</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingCatalog ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i} className="border-border">
                    <TableCell><Skeleton className="h-10 w-10 mx-auto" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                    <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20 mx-auto" /></TableCell>
                    <TableCell />
                  </TableRow>
                ))
              ) : catalog?.items.length === 0 ? (
                <TableRow className="border-border">
                  <TableCell colSpan={6} className="text-center py-12">
                    <p className="font-mono text-xs text-muted-foreground">
                      {q
                        ? `Nenhum produto encontrado para "${q}".`
                        : 'Catálogo vazio. Use a busca acima para adicionar produtos da VTEX.'}
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                catalog?.items.map((product) => (
                  <TableRow key={product.id} className="border-border font-mono">
                    <TableCell className="text-center">
                      {product.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={product.imageUrl} alt={product.name} className="h-10 w-10 object-cover mx-auto rounded-sm border border-border" />
                      ) : (
                        <div className="h-10 w-10 mx-auto bg-muted/30 border border-border rounded-sm flex items-center justify-center">
                          <ShoppingBag className="h-4 w-4 text-muted-foreground/40" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <p className="text-xs font-semibold text-foreground line-clamp-2 leading-tight">{product.name}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">SKU {product.skuId}</p>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{product.department ?? '—'}</TableCell>
                    <TableCell className="hidden sm:table-cell text-xs text-right text-muted-foreground">{fmtBRL(product.price)}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={product.enabled ? 'default' : 'secondary'} className="font-mono text-[10px]">
                        {product.enabled ? 'Habilitado' : 'Desabilitado'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        {/* Toggle */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className={`h-7 w-7 ${product.enabled ? 'text-primary hover:text-primary/70' : 'text-muted-foreground hover:text-foreground'}`}
                          disabled={toggling === product.id}
                          onClick={() => void handleToggle(product)}
                          title={product.enabled ? 'Desabilitar try-on' : 'Habilitar try-on'}
                        >
                          {toggling === product.id
                            ? <Loader2 className="h-4 w-4 animate-spin" />
                            : product.enabled
                              ? <ToggleRight className="h-5 w-5" />
                              : <ToggleLeft className="h-5 w-5" />}
                        </Button>
                        {/* Remover */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          disabled={removing === product.id}
                          onClick={() => void handleRemove(product)}
                          title="Remover do catálogo"
                        >
                          {removing === product.id
                            ? <Loader2 className="h-4 w-4 animate-spin" />
                            : <Trash2 className="h-4 w-4" />}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Paginação */}
        {catalog && catalog.total > 0 && (
          <div className="flex items-center justify-between">
            <p className="font-mono text-[10px] text-muted-foreground">
              {catalog.total} produto{catalog.total !== 1 ? 's' : ''}
              {' · '}página {catalog.page} de {catalog.totalPages}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="font-mono text-xs border-border h-8"
                disabled={page <= 1 || loadingCatalog} onClick={() => setPage((p) => p - 1)}>
                ← anterior
              </Button>
              <Button variant="outline" size="sm" className="font-mono text-xs border-border h-8"
                disabled={page >= catalog.totalPages || loadingCatalog} onClick={() => setPage((p) => p + 1)}>
                próxima →
              </Button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
