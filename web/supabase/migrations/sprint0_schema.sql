-- ===========================================================================
-- Migração Sprint 0 — TryOn AI
-- Aplicar no Supabase SQL Editor (Project Settings → SQL Editor)
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1. Novas colunas em tryon_sessions
--    Necessárias para: retenção 24h (BE-S0-03) e atribuição (BE-S0-04)
-- ---------------------------------------------------------------------------

ALTER TABLE tryon_sessions
  -- Key do objeto no R2 (para deleção controlada)
  ADD COLUMN IF NOT EXISTS original_image_key  TEXT,

  -- Timestamp de expiração da imagem (24h após upload)
  ADD COLUMN IF NOT EXISTS expires_at          TIMESTAMPTZ,

  -- Flags de ciclo de vida da imagem
  ADD COLUMN IF NOT EXISTS image_deleted       BOOLEAN      NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS deleted_at          TIMESTAMPTZ;

-- Índice para a query de limpeza (busca por expires_at + image_deleted)
CREATE INDEX IF NOT EXISTS idx_tryon_sessions_cleanup
  ON tryon_sessions (expires_at, image_deleted)
  WHERE image_deleted = FALSE;

-- Índice para a query de atribuição (busca por session_id + created_at)
CREATE INDEX IF NOT EXISTS idx_tryon_sessions_attribution
  ON tryon_sessions (session_id, created_at DESC)
  WHERE status = 'completed';

-- ---------------------------------------------------------------------------
-- 2. Nova coluna em stores
--    Lista de origens CORS permitidas por loja
-- ---------------------------------------------------------------------------

ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS allowed_origins TEXT[] NOT NULL DEFAULT '{}';

-- Comentário informativo
COMMENT ON COLUMN stores.allowed_origins IS
  'Domínios autorizados para requisições CORS. Ex: {https://loja.com.br}';

-- ---------------------------------------------------------------------------
-- 3. Tabela tracking_events (se ainda não existir)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS tracking_events (
  id  UUID  PRIMARY KEY DEFAULT gen_random_uuid()
);

-- Todas as colunas via ALTER — idempotente independente do schema atual
ALTER TABLE tracking_events
  ADD COLUMN IF NOT EXISTS event_name  TEXT        NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS store_id    UUID        REFERENCES stores(id),
  ADD COLUMN IF NOT EXISTS session_id  TEXT        NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS sku_id      TEXT        NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS timestamp   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS metadata    JSONB,
  ADD COLUMN IF NOT EXISTS created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Remove coluna legada event_type se existir (renomeada para event_name)
ALTER TABLE tracking_events
  DROP COLUMN IF EXISTS event_type;

CREATE INDEX IF NOT EXISTS idx_tracking_events_store_session
  ON tracking_events (store_id, session_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_tracking_events_event_name
  ON tracking_events (event_name, store_id, timestamp DESC);

-- ---------------------------------------------------------------------------
-- FIM DA MIGRAÇÃO
-- ---------------------------------------------------------------------------
