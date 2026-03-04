/**
 * QA-S2-01 — Testes unitários: Contratos Zod do Billing
 *
 * Cobre:
 * - ListInvoicesSchema: defaults, status válidos/inválidos, coerção
 * - LineItemSchema: validação de campos obrigatórios e tipos
 * - formatCents: formatação em BRL e outras moedas
 */
import { describe, it, expect } from 'vitest';
import {
  ListInvoicesSchema,
  LineItemSchema,
  formatCents,
} from '@/lib/contracts/billing';

// ---------------------------------------------------------------------------
// ListInvoicesSchema
// ---------------------------------------------------------------------------

describe('ListInvoicesSchema', () => {
  it('defaults: status=all, page=1, limit=12', () => {
    const result = ListInvoicesSchema.parse({});
    expect(result.status).toBe('all');
    expect(result.page).toBe(1);
    expect(result.limit).toBe(12);
  });

  it('aceita todos os status válidos', () => {
    for (const s of ['all', 'open', 'paid', 'overdue', 'cancelled'] as const) {
      expect(ListInvoicesSchema.parse({ status: s }).status).toBe(s);
    }
  });

  it('rejeita status inválido', () => {
    expect(() => ListInvoicesSchema.parse({ status: 'pending' })).toThrow();
  });

  it('coerce page de string para number', () => {
    expect(ListInvoicesSchema.parse({ page: '2' }).page).toBe(2);
  });

  it('rejeita page < 1', () => {
    expect(() => ListInvoicesSchema.parse({ page: 0 })).toThrow();
  });

  it('rejeita limit > 50', () => {
    expect(() => ListInvoicesSchema.parse({ limit: 51 })).toThrow();
  });
});

// ---------------------------------------------------------------------------
// LineItemSchema
// ---------------------------------------------------------------------------

describe('LineItemSchema', () => {
  it('valida um item correto', () => {
    const item = {
      description: 'Plano Pro — Fevereiro/2026',
      quantity: 1,
      unit_price_cents: 19900,
    };
    const result = LineItemSchema.parse(item);
    expect(result.unit_price_cents).toBe(19900);
  });

  it('rejeita quantity < 1', () => {
    expect(() =>
      LineItemSchema.parse({ description: 'X', quantity: 0, unit_price_cents: 100 }),
    ).toThrow();
  });

  it('rejeita unit_price_cents negativo', () => {
    expect(() =>
      LineItemSchema.parse({ description: 'X', quantity: 1, unit_price_cents: -1 }),
    ).toThrow();
  });

  it('aceita unit_price_cents = 0 (item gratuito)', () => {
    const result = LineItemSchema.parse({
      description: 'Crédito cortesia',
      quantity: 1,
      unit_price_cents: 0,
    });
    expect(result.unit_price_cents).toBe(0);
  });

  it('rejeita se description ausente', () => {
    expect(() =>
      LineItemSchema.parse({ quantity: 1, unit_price_cents: 100 }),
    ).toThrow();
  });
});

// ---------------------------------------------------------------------------
// formatCents
// ---------------------------------------------------------------------------

describe('formatCents()', () => {
  it('formata 19900 centavos como R$ 199,00 (BRL)', () => {
    const result = formatCents(19900, 'BRL');
    expect(result).toMatch(/199/);
    expect(result).toMatch(/R\$/);
  });

  it('formata 0 centavos como R$ 0,00', () => {
    const result = formatCents(0, 'BRL');
    expect(result).toMatch(/0/);
  });

  it('formata 100 centavos como R$ 1,00', () => {
    const result = formatCents(100, 'BRL');
    expect(result).toMatch(/1/);
  });

  it('usa BRL como padrão se currency não informado', () => {
    const result = formatCents(500);
    expect(result).toMatch(/R\$/);
  });

  it('formata 299990 centavos como R$ 2.999,90', () => {
    const result = formatCents(299990, 'BRL');
    expect(result).toMatch(/2[.,]999/);
  });
});
