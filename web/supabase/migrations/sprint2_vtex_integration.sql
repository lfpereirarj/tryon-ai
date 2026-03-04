-- ===========================================================================
-- Migração Sprint 2 — Integração VTEX por loja — TryOn AI
-- Aplicar no Supabase SQL Editor após sprint2_admin_schema.sql
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1. Tabela store_integrations — Credenciais VTEX por tenant
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS store_integrations (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id         UUID         NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  platform         TEXT         NOT NULL DEFAULT 'vtex',

  -- Identificação da conta VTEX (ex: "minhaloja")
  account          TEXT         NOT NULL,

  -- VTEX appKey (não é super-secreto, mas armazenado sem exposição desnecessária)
  app_key          TEXT         NOT NULL,

  -- VTEX appToken criptografado (AES-256-GCM): "iv_hex:cipher_hex:tag_hex"
  app_token_enc    TEXT         NOT NULL,

  -- Status da última validação
  status           TEXT         NOT NULL DEFAULT 'pending',
  error_message    TEXT,
  tested_at        TIMESTAMPTZ,

  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  -- Apenas uma integração por plataforma por loja
  UNIQUE (store_id, platform)
);

-- Constraint de status válidos
ALTER TABLE store_integrations
  DROP CONSTRAINT IF EXISTS store_integrations_status_check;
ALTER TABLE store_integrations
  ADD CONSTRAINT store_integrations_status_check
    CHECK (status IN ('pending', 'active', 'error'));

-- Constraint de plataformas válidas (extensível no futuro)
ALTER TABLE store_integrations
  DROP CONSTRAINT IF EXISTS store_integrations_platform_check;
ALTER TABLE store_integrations
  ADD CONSTRAINT store_integrations_platform_check
    CHECK (platform IN ('vtex', 'shopify', 'nuvemshop'));

CREATE INDEX IF NOT EXISTS idx_store_integrations_store_id
  ON store_integrations (store_id);

COMMENT ON TABLE store_integrations IS
  'Credenciais e status de integração com plataformas de e-commerce por loja.';
COMMENT ON COLUMN store_integrations.app_token_enc IS
  'AppToken VTEX criptografado com AES-256-GCM. Formato: iv_hex:cipher_hex:tag_hex';

-- ---------------------------------------------------------------------------
-- 2. Trigger updated_at para store_integrations
-- ---------------------------------------------------------------------------

-- A função set_updated_at() já existe (criada em sprint2_admin_schema.sql)

DROP TRIGGER IF EXISTS trg_store_integrations_updated_at ON store_integrations;
CREATE TRIGGER trg_store_integrations_updated_at
  BEFORE UPDATE ON store_integrations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
