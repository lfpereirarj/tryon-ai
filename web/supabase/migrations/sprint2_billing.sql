-- ===========================================================================
-- Migração Sprint 2 — Billing básico por loja — TryOn AI
-- Aplicar no Supabase SQL Editor após sprint2_catalog.sql
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1. Tabela billing_invoices — Faturas por tenant
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS billing_invoices (
  id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id         UUID          NOT NULL REFERENCES stores(id) ON DELETE CASCADE,

  -- Identificação da fatura
  invoice_number   TEXT          NOT NULL,
  reference_month  DATE          NOT NULL,  -- 1º dia do mês de referência

  -- Valores
  amount_cents     INTEGER       NOT NULL CHECK (amount_cents >= 0),
  currency         TEXT          NOT NULL DEFAULT 'BRL',

  -- Status do ciclo de vida
  status           TEXT          NOT NULL DEFAULT 'open'
                   CHECK (status IN ('open', 'paid', 'overdue', 'cancelled')),

  -- Datas
  due_date         DATE          NOT NULL,
  paid_at          TIMESTAMPTZ,

  -- Detalhamento (JSON livre para MVP; pode ser refinado em sprints futuros)
  line_items       JSONB         NOT NULL DEFAULT '[]',

  -- Link externo de pagamento (gerado pelo gateway / operação manual)
  payment_url      TEXT,

  -- Metadados
  notes            TEXT,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  UNIQUE (store_id, invoice_number)
);

COMMENT ON TABLE billing_invoices IS
  'Faturas mensais por loja. MVP: geradas manualmente ou por seed.';
COMMENT ON COLUMN billing_invoices.amount_cents IS
  'Valor em centavos da moeda corrente (ex: 19900 = R$ 199,00).';
COMMENT ON COLUMN billing_invoices.reference_month IS
  'Sempre o 1º dia do mês de referência da fatura.';
COMMENT ON COLUMN billing_invoices.line_items IS
  'Array JSON com itens de linha: [{description, quantity, unit_price_cents}]';

-- Índices
CREATE INDEX IF NOT EXISTS idx_billing_invoices_store_id
  ON billing_invoices (store_id);

CREATE INDEX IF NOT EXISTS idx_billing_invoices_store_status
  ON billing_invoices (store_id, status);

CREATE INDEX IF NOT EXISTS idx_billing_invoices_due_date
  ON billing_invoices (store_id, due_date DESC);

-- ---------------------------------------------------------------------------
-- 2. Trigger updated_at
-- ---------------------------------------------------------------------------

DROP TRIGGER IF EXISTS trg_billing_invoices_updated_at ON billing_invoices;
CREATE TRIGGER trg_billing_invoices_updated_at
  BEFORE UPDATE ON billing_invoices
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- 3. Seed de exemplo (comentado — descomente para popular ambiente de dev)
-- ---------------------------------------------------------------------------

-- INSERT INTO billing_invoices
--   (store_id, invoice_number, reference_month, amount_cents, due_date, status, payment_url, line_items)
-- SELECT
--   id,
--   'INV-2026-01',
--   '2026-01-01',
--   19900,
--   '2026-01-10',
--   'paid',
--   NULL,
--   '[{"description":"Plano Pro — Janeiro/2026","quantity":1,"unit_price_cents":19900}]'
-- FROM stores LIMIT 1;
