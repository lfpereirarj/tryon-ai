'use client';

/**
 * /dashboard/admin/stores/[id]/billing — Histórico de faturamento
 *
 * - Lista faturas por loja com status e vencimento
 * - Filtro por status (todas / abertas / pagas / em atraso / canceladas)
 * - Expandir fatura para ver itens de linha
 * - CTA "Pagar" redireciona para payment_url
 * - Destaque visual para faturas em atraso (overdue)
 * - Paginação
 */
import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Settings2,
  ShoppingBag,
  Puzzle,
  Receipt,
  ExternalLink,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getSupabaseBrowser } from '@/lib/clients/supabase-browser';
import type { InvoiceRow, InvoicePage, InvoiceStatus } from '@/lib/contracts/billing';
import { formatCents } from '@/lib/contracts/billing';

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

type StatusFilter = InvoiceStatus | 'all';

const STATUS_LABEL: Record<InvoiceStatus, string> = {
  open:      'Em aberto',
  paid:      'Paga',
  overdue:   'Em atraso',
  cancelled: 'Cancelada',
};

const STATUS_VARIANT: Record<InvoiceStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  open:      'secondary',
  paid:      'default',
  overdue:   'destructive',
  cancelled: 'outline',
};

const LIMIT = 12;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtDate(iso: string): string {
  // iso = 'YYYY-MM-DD'
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function fmtMonth(iso: string): string {
  const [year, month] = iso.split('-');
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

async function getBearerToken() {
  const { data: { session } } = await getSupabaseBrowser().auth.getSession();
  if (!session) throw new Error('Sessão expirada. Faça login novamente.');
  return session.access_token;
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

export default function BillingPage() {
  const { id: storeId } = useParams<{ id: string }>();

  const [invoicePage, setInvoicePage] = useState<InvoicePage | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Carregar faturas
  // ---------------------------------------------------------------------------

  const loadInvoices = useCallback(
    async (filter: StatusFilter, pg: number) => {
      setLoading(true);
      try {
        const token = await getBearerToken();
        const params = new URLSearchParams({
          page:   String(pg),
          limit:  String(LIMIT),
          status: filter,
        });
        const res = await fetch(
          `/api/admin/stores/${storeId}/billing?${params.toString()}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        const json = await res.json() as InvoicePage & { error?: string };
        if (!res.ok) { toast.error(json.error ?? `Erro ${res.status}`); return; }
        setInvoicePage(json);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Falha ao carregar faturas.');
      } finally {
        setLoading(false);
      }
    },
    [storeId],
  );

  useEffect(() => { void loadInvoices(statusFilter, page); }, [statusFilter, page, loadInvoices]);

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------

  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  function isOverdue(invoice: InvoiceRow): boolean {
    return invoice.status === 'overdue';
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="max-w-4xl">
      {/* Breadcrumb */}
      <div className="mb-4 flex items-center gap-2 font-mono text-xs text-muted-foreground">
        <Link href="/dashboard/admin" className="hover:text-primary transition-colors">lojas</Link>
        <span>/</span>
        <Link href={`/dashboard/admin/stores/${storeId}`} className="hover:text-primary transition-colors">
          editar
        </Link>
        <span>/</span>
        <span className="text-foreground">faturamento</span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-border pb-0 flex-wrap">
        <Button asChild variant="ghost" size="sm" className="font-mono text-xs text-muted-foreground hover:text-primary gap-1.5">
          <Link href={`/dashboard/admin/stores/${storeId}`}>Dados</Link>
        </Button>
        <Button asChild variant="ghost" size="sm" className="font-mono text-xs text-muted-foreground hover:text-primary gap-1.5">
          <Link href={`/dashboard/admin/stores/${storeId}/integration`}>
            <Settings2 className="h-3.5 w-3.5" />
            Integração VTEX
          </Link>
        </Button>
        <Button asChild variant="ghost" size="sm" className="font-mono text-xs text-muted-foreground hover:text-primary gap-1.5">
          <Link href={`/dashboard/admin/stores/${storeId}/catalog`}>
            <ShoppingBag className="h-3.5 w-3.5" />
            Catálogo
          </Link>
        </Button>
        <Button asChild variant="ghost" size="sm" className="font-mono text-xs text-muted-foreground hover:text-primary gap-1.5">
          <Link href={`/dashboard/admin/stores/${storeId}/installation`}>
            <Puzzle className="h-3.5 w-3.5" />
            Instalação
          </Link>
        </Button>
        <span className="font-mono text-xs px-3 py-2 border-b-2 border-primary text-primary flex items-center gap-1.5">
          <Receipt className="h-3.5 w-3.5" />
          Faturamento
        </span>
      </div>

      {/* Filtro de status */}
      <div className="flex items-center justify-between mb-4 gap-3">
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v as StatusFilter);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-44 font-mono text-xs bg-background border-border h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="font-mono text-xs bg-popover border-border">
            <SelectItem value="all">Todas as faturas</SelectItem>
            <SelectItem value="open">Em aberto</SelectItem>
            <SelectItem value="overdue">Em atraso</SelectItem>
            <SelectItem value="paid">Pagas</SelectItem>
            <SelectItem value="cancelled">Canceladas</SelectItem>
          </SelectContent>
        </Select>

        {invoicePage && invoicePage.total > 0 && (
          <p className="font-mono text-[10px] text-muted-foreground">
            {invoicePage.total} fatura{invoicePage.total !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* Tabela */}
      <div className="border border-border rounded-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="font-mono text-[10px] text-muted-foreground tracking-widest w-8" />
              <TableHead className="font-mono text-[10px] text-muted-foreground tracking-widest">FATURA</TableHead>
              <TableHead className="font-mono text-[10px] text-muted-foreground tracking-widest hidden sm:table-cell">REFERÊNCIA</TableHead>
              <TableHead className="font-mono text-[10px] text-muted-foreground tracking-widest hidden md:table-cell">VENCIMENTO</TableHead>
              <TableHead className="font-mono text-[10px] text-muted-foreground tracking-widest text-right">VALOR</TableHead>
              <TableHead className="font-mono text-[10px] text-muted-foreground tracking-widest text-center w-28">STATUS</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>

          <TableBody>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i} className="border-border">
                  <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20 mx-auto" /></TableCell>
                  <TableCell />
                </TableRow>
              ))
            ) : invoicePage?.items.length === 0 ? (
              <TableRow className="border-border">
                <TableCell colSpan={7} className="py-12 text-center">
                  <p className="font-mono text-xs text-muted-foreground">
                    Nenhuma fatura encontrada.
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              invoicePage?.items.flatMap((invoice) => {
                const overdue = isOverdue(invoice);
                const expanded = expandedId === invoice.id;
                return [
                  <TableRow
                    key={invoice.id}
                    className={`border-border font-mono cursor-pointer transition-colors ${overdue ? 'bg-destructive/5 hover:bg-destructive/10' : 'hover:bg-muted/20'}`}
                    onClick={() => toggleExpand(invoice.id)}
                  >
                    {/* Expand toggle */}
                    <TableCell className="text-muted-foreground">
                      {expanded
                        ? <ChevronDown className="h-3.5 w-3.5" />
                        : <ChevronRight className="h-3.5 w-3.5" />}
                    </TableCell>

                    {/* Número */}
                    <TableCell>
                      <p className="text-xs font-semibold text-foreground">{invoice.invoiceNumber}</p>
                    </TableCell>

                    {/* Mês */}
                    <TableCell className="hidden sm:table-cell text-xs text-muted-foreground capitalize">
                      {fmtMonth(invoice.referenceMonth)}
                    </TableCell>

                    {/* Vencimento */}
                    <TableCell className="hidden md:table-cell">
                      <span className={`text-xs ${overdue ? 'text-destructive font-semibold' : 'text-muted-foreground'}`}>
                        {fmtDate(invoice.dueDate)}
                      </span>
                    </TableCell>

                    {/* Valor */}
                    <TableCell className="text-xs text-right text-foreground font-semibold">
                      {formatCents(invoice.amountCents, invoice.currency)}
                    </TableCell>

                    {/* Status */}
                    <TableCell className="text-center">
                      <Badge
                        variant={STATUS_VARIANT[invoice.status]}
                        className="font-mono text-[10px]"
                      >
                        {STATUS_LABEL[invoice.status]}
                      </Badge>
                    </TableCell>

                    {/* Ação */}
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      {invoice.paymentUrl && invoice.status !== 'paid' && invoice.status !== 'cancelled' ? (
                        <a
                          href={invoice.paymentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-mono text-[10px] text-primary hover:text-primary/70 transition-colors"
                        >
                          Pagar <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : invoice.status === 'paid' ? (
                        <span className="font-mono text-[10px] text-muted-foreground/50">—</span>
                      ) : null}
                    </TableCell>
                  </TableRow>,

                  /* Linha expandida com itens de linha */
                  expanded && (
                    <TableRow key={`${invoice.id}-detail`} className="border-border bg-muted/10 hover:bg-muted/10">
                      <TableCell colSpan={7} className="py-3 px-6">
                        {invoice.lineItems.length === 0 ? (
                          <p className="font-mono text-[10px] text-muted-foreground">
                            Sem itens de linha.
                          </p>
                        ) : (
                          <table className="w-full">
                            <thead>
                              <tr className="text-left">
                                <th className="font-mono text-[9px] text-muted-foreground/60 tracking-widest pb-1.5">DESCRIÇÃO</th>
                                <th className="font-mono text-[9px] text-muted-foreground/60 tracking-widest pb-1.5 text-center w-16">QTD</th>
                                <th className="font-mono text-[9px] text-muted-foreground/60 tracking-widest pb-1.5 text-right w-28">UNIT.</th>
                                <th className="font-mono text-[9px] text-muted-foreground/60 tracking-widest pb-1.5 text-right w-28">TOTAL</th>
                              </tr>
                            </thead>
                            <tbody>
                              {invoice.lineItems.map((item, idx) => (
                                <tr key={idx} className="border-t border-border/30">
                                  <td className="font-mono text-xs text-foreground py-1.5 pr-4">{item.description}</td>
                                  <td className="font-mono text-xs text-muted-foreground text-center py-1.5">{item.quantity}</td>
                                  <td className="font-mono text-xs text-muted-foreground text-right py-1.5">
                                    {formatCents(item.unit_price_cents, invoice.currency)}
                                  </td>
                                  <td className="font-mono text-xs text-foreground font-semibold text-right py-1.5">
                                    {formatCents(item.unit_price_cents * item.quantity, invoice.currency)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                        {invoice.paidAt && (
                          <p className="font-mono text-[10px] text-muted-foreground mt-2">
                            Pago em {new Date(invoice.paidAt).toLocaleDateString('pt-BR')}
                          </p>
                        )}
                        {invoice.notes && (
                          <p className="font-mono text-[10px] text-muted-foreground/70 mt-1 italic">
                            {invoice.notes}
                          </p>
                        )}
                      </TableCell>
                    </TableRow>
                  ),
                ].filter(Boolean);
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Paginação */}
      {invoicePage && invoicePage.totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="font-mono text-[10px] text-muted-foreground">
            Página {invoicePage.page} de {invoicePage.totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="font-mono text-xs border-border h-8"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => p - 1)}
            >
              ← anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="font-mono text-xs border-border h-8"
              disabled={page >= invoicePage.totalPages || loading}
              onClick={() => setPage((p) => p + 1)}
            >
              próxima →
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
