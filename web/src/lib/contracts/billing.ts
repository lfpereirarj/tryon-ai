/**
 * billing.ts — Contratos Zod para faturamento por tenant
 */
import { z } from 'zod';

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const INVOICE_STATUSES = ['open', 'paid', 'overdue', 'cancelled'] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

// ---------------------------------------------------------------------------
// Schemas de listagem
// ---------------------------------------------------------------------------

export const ListInvoicesSchema = z.object({
  status: z.enum([...INVOICE_STATUSES, 'all']).optional().default('all'),
  page:   z.coerce.number().int().min(1).optional().default(1),
  limit:  z.coerce.number().int().min(1).max(50).optional().default(12),
});

export type ListInvoicesInput = z.infer<typeof ListInvoicesSchema>;

// ---------------------------------------------------------------------------
// Schema de item de linha (dentro de line_items JSONB)
// ---------------------------------------------------------------------------

export const LineItemSchema = z.object({
  description:      z.string(),
  quantity:         z.number().int().min(1),
  unit_price_cents: z.number().int().min(0),
});

export type LineItem = z.infer<typeof LineItemSchema>;

// ---------------------------------------------------------------------------
// Interfaces públicas (retorno da API)
// ---------------------------------------------------------------------------

export interface InvoiceRow {
  id: string;
  storeId: string;
  invoiceNumber: string;
  referenceMonth: string;   // 'YYYY-MM-DD'
  amountCents: number;
  currency: string;
  status: InvoiceStatus;
  dueDate: string;          // 'YYYY-MM-DD'
  paidAt: string | null;
  lineItems: LineItem[];
  paymentUrl: string | null;
  notes: string | null;
  createdAt: string;
}

export interface InvoicePage {
  items: InvoiceRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Formata centavos para String de moeda */
export function formatCents(cents: number, currency = 'BRL'): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
  }).format(cents / 100);
}
