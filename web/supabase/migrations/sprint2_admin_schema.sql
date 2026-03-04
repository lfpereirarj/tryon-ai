-- ===========================================================================
-- Migração Sprint 2 — Admin Multi-tenant — TryOn AI
-- Aplicar no Supabase SQL Editor (Project Settings → SQL Editor)
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1. Ajustar tabela stores com colunas de gestão multi-tenant
-- ---------------------------------------------------------------------------

ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS name        TEXT         NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS domain      TEXT,
  ADD COLUMN IF NOT EXISTS status      TEXT         NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS plan        TEXT         NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW();

-- Constraint de status válidos
ALTER TABLE stores
  DROP CONSTRAINT IF EXISTS stores_status_check;
ALTER TABLE stores
  ADD CONSTRAINT stores_status_check
    CHECK (status IN ('active', 'suspended', 'cancelled'));

-- Constraint de planos válidos
ALTER TABLE stores
  DROP CONSTRAINT IF EXISTS stores_plan_check;
ALTER TABLE stores
  ADD CONSTRAINT stores_plan_check
    CHECK (plan IN ('free', 'starter', 'pro', 'enterprise'));

-- Índice para busca por status
CREATE INDEX IF NOT EXISTS idx_stores_status
  ON stores (status);

-- ---------------------------------------------------------------------------
-- 2. Tabela store_users — RBAC por tenant
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS store_users (
  id          UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id    UUID  NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  user_id     UUID  NOT NULL,  -- Supabase Auth user ID (auth.users)
  role        TEXT  NOT NULL DEFAULT 'store_owner',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (store_id, user_id)
);

ALTER TABLE store_users
  DROP CONSTRAINT IF EXISTS store_users_role_check;
ALTER TABLE store_users
  ADD CONSTRAINT store_users_role_check
    CHECK (role IN ('super_admin', 'store_owner', 'store_manager'));

-- Índice para busca de role por user_id (auth middleware)
CREATE INDEX IF NOT EXISTS idx_store_users_user_id
  ON store_users (user_id);

-- Índice para listar usuários de uma loja
CREATE INDEX IF NOT EXISTS idx_store_users_store_id
  ON store_users (store_id);

COMMENT ON TABLE store_users IS
  'Relaciona usuários Supabase Auth a lojas com um role específico.';

-- ---------------------------------------------------------------------------
-- 3. Trigger para atualizar updated_at automaticamente
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_stores_updated_at ON stores;
CREATE TRIGGER trg_stores_updated_at
  BEFORE UPDATE ON stores
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_store_users_updated_at ON store_users;
CREATE TRIGGER trg_store_users_updated_at
  BEFORE UPDATE ON store_users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- FIM DA MIGRAÇÃO
-- ---------------------------------------------------------------------------
