/**
 * billing.service.ts — Faturas por tenant (Supabase Admin)
 *
 * Operações:
 * - listInvoices — paginação com filtro de status
 * - getInvoice   — fatura individual (com isolamento store_id)
 *
 * Nota: Para o MVP as faturas são inseridas manualmente via SQL Editor ou
 * pelo snippet de seed no sprint2_billing.sql. Um billing engine real
 * (Stripe, Iugu, Asaas…) pode ser plugado substituindo apenas este módulo.
 */
import { getSupabaseAdmin } from '@/lib/clients/supabase';
import type {
  ListInvoicesInput,
  InvoiceRow,
  InvoicePage,
  LineItem,
} from '@/lib/contracts/billing';
import { LineItemSchema } from '@/lib/contracts/billing';

// ---------------------------------------------------------------------------
// Mapeador DB → InvoiceRow (snake_case → camelCase)
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: Record<string, any>): InvoiceRow {
  return {
    id:             row.id as string,
    storeId:        row.store_id as string,
    invoiceNumber:  row.invoice_number as string,
    referenceMonth: row.reference_month as string,
    amountCents:    row.amount_cents as number,
    currency:       row.currency as string,
    status:         row.status as InvoiceRow['status'],
    dueDate:        row.due_date as string,
    paidAt:         (row.paid_at as string | null) ?? null,
    lineItems:      parseLineItems(row.line_items),
    paymentUrl:     (row.payment_url as string | null) ?? null,
    notes:          (row.notes as string | null) ?? null,
    createdAt:      row.created_at as string,
  };
}

function parseLineItems(raw: unknown): LineItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      const parsed = LineItemSchema.safeParse(item);
      return parsed.success ? parsed.data : null;
    })
    .filter((i): i is LineItem => i !== null);
}

// ---------------------------------------------------------------------------
// Listagem paginada
// ---------------------------------------------------------------------------

export async function listInvoices(
  storeId: string,
  input: ListInvoicesInput,
): Promise<InvoicePage> {
  const supabase = getSupabaseAdmin();
  const { page, limit, status } = input;
  const from = (page - 1) * limit;
  const to   = from + limit - 1;

  let query = supabase
    .from('billing_invoices')
    .select(
      'id, store_id, invoice_number, reference_month, amount_cents, currency, status, due_date, paid_at, line_items, payment_url, notes, created_at',
      { count: 'exact' },
    )
    .eq('store_id', storeId)
    .order('due_date', { ascending: false })
    .range(from, to);

  if (status !== 'all') {
    query = query.eq('status', status);
  }

  const { data, error, count } = await query;

  if (error) throw new Error(`[Billing] Falha ao listar faturas: ${error.message}`);

  const total = count ?? 0;
  return {
    items:      (data ?? []).map(mapRow),
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

// ---------------------------------------------------------------------------
// Fatura individual
// ---------------------------------------------------------------------------

export async function getInvoice(
  storeId: string,
  invoiceId: string,
): Promise<InvoiceRow | null> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('billing_invoices')
    .select(
      'id, store_id, invoice_number, reference_month, amount_cents, currency, status, due_date, paid_at, line_items, payment_url, notes, created_at',
    )
    .eq('id', invoiceId)
    .eq('store_id', storeId)  // isolamento multi-tenant
    .single();

  if (error || !data) return null;
  return mapRow(data);
}
