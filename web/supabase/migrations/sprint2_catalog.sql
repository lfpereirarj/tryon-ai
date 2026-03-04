-- ===========================================================================
-- Migração Sprint 2 — Catálogo de produtos por loja — TryOn AI
-- Aplicar no Supabase SQL Editor após sprint2_vtex_integration.sql
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1. Tabela store_products — Catálogo elegível por tenant
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS store_products (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id         UUID         NOT NULL REFERENCES stores(id) ON DELETE CASCADE,

  -- Identificação do produto na plataforma de origem
  sku_id           TEXT         NOT NULL,  -- ID do SKU na VTEX/plataforma
  product_id       TEXT,                   -- ID do produto pai (opcional)
  platform         TEXT         NOT NULL DEFAULT 'vtex',

  -- Dados de exibição (sincronizados da plataforma)
  name             TEXT         NOT NULL,
  image_url        TEXT,
  price            NUMERIC(12,2),
  department       TEXT,

  -- Controle de elegibilidade para try-on
  enabled          BOOLEAN      NOT NULL DEFAULT true,
  enabled_at       TIMESTAMPTZ,
  disabled_at      TIMESTAMPTZ,
  disabled_reason  TEXT,

  -- Metadados de sincronização
  synced_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  -- Um SKU só existe uma vez por loja/plataforma
  UNIQUE (store_id, platform, sku_id)
);

-- Constraints de plataforma (extensível)
ALTER TABLE store_products
  DROP CONSTRAINT IF EXISTS store_products_platform_check;
ALTER TABLE store_products
  ADD CONSTRAINT store_products_platform_check
    CHECK (platform IN ('vtex', 'shopify', 'nuvemshop'));

-- Índices para queries frequentes
CREATE INDEX IF NOT EXISTS idx_store_products_store_id
  ON store_products (store_id);

CREATE INDEX IF NOT EXISTS idx_store_products_store_sku
  ON store_products (store_id, sku_id);

CREATE INDEX IF NOT EXISTS idx_store_products_enabled
  ON store_products (store_id, enabled);

-- Busca textual por nome de produto (GIN trigram para ILIKE eficiente)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_store_products_name_trgm
  ON store_products USING gin (name gin_trgm_ops);

COMMENT ON TABLE store_products IS
  'Catálogo de SKUs por loja com flag de elegibilidade para try-on.';
COMMENT ON COLUMN store_products.enabled IS
  'Quando false, /api/generate rejeita com 403 para este SKU.';

-- ---------------------------------------------------------------------------
-- 2. Trigger updated_at
-- ---------------------------------------------------------------------------

DROP TRIGGER IF EXISTS trg_store_products_updated_at ON store_products;
CREATE TRIGGER trg_store_products_updated_at
  BEFORE UPDATE ON store_products
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
