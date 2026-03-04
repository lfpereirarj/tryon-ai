#!/usr/bin/env node
/**
 * Seed: cria um usuário super_admin na plataforma TryOn AI.
 *
 * Uso:
 *   node scripts/seed-super-admin.mjs
 *
 * Variáveis lidas do .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Parâmetros (customize abaixo ou via ENV):
 *   SEED_EMAIL    — padrão: admin@tryon.ai
 *   SEED_PASSWORD — padrão: Admin@123!  (altere antes de produção)
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

// ---------------------------------------------------------------------------
// Lê .env.local manualmente (sem depender de dotenv)
// ---------------------------------------------------------------------------

const __dir = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dir, '..', '.env.local');

function loadEnv(path) {
  try {
    const raw = readFileSync(path, 'utf-8');
    for (const line of raw.split('\n')) {
      const m = line.match(/^([^#=\s]+)\s*=\s*(.*)$/);
      if (m) process.env[m[1]] ??= m[2].trim();
    }
  } catch {
    console.warn(`[seed] Aviso: .env.local não encontrado em ${path}`);
  }
}

loadEnv(envPath);

// ---------------------------------------------------------------------------
// Configuração
// ---------------------------------------------------------------------------

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('[seed] ❌  NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não definidos.');
  process.exit(1);
}

const EMAIL    = process.env.SEED_EMAIL    ?? 'admin@tryon.ai';
const PASSWORD = process.env.SEED_PASSWORD ?? 'Admin@123!';

// UUID fixo para a "loja sistema" — só existe para satisfazer a FK de store_users
const SYSTEM_STORE_ID = '00000000-0000-0000-0000-000000000001';

// ---------------------------------------------------------------------------
// Cliente Supabase com service_role (sem RLS)
// ---------------------------------------------------------------------------

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ---------------------------------------------------------------------------
// 1. Criar (ou reutilizar) a loja-sistema
// ---------------------------------------------------------------------------

async function ensureSystemStore() {
  const { data: existing } = await supabase
    .from('stores')
    .select('id')
    .eq('id', SYSTEM_STORE_ID)
    .maybeSingle();

  if (existing) {
    console.log('[seed] ℹ️   Loja-sistema já existe.');
    return;
  }

  const { error } = await supabase.from('stores').insert({
    id: SYSTEM_STORE_ID,
    name: 'TryOn AI — Sistema',
    domain: 'admin.tryon.ai',
    plan: 'pro',
    status: 'active',
    public_api_key: randomUUID(),
    allowed_origins: [],
  });

  if (error) throw new Error(`Falha ao criar loja-sistema: ${error.message}`);
  console.log('[seed] ✅  Loja-sistema criada.');
}

// ---------------------------------------------------------------------------
// 2. Criar (ou reutilizar) o usuário no Supabase Auth
// ---------------------------------------------------------------------------

async function ensureUser() {
  // Verifica se já existe
  const { data: list } = await supabase.auth.admin.listUsers();
  const existing = list?.users?.find((u) => u.email === EMAIL);

  if (existing) {
    console.log(`[seed] ℹ️   Usuário ${EMAIL} já existe (id: ${existing.id}).`);
    return existing.id;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,   // confirma automaticamente sem precisar de e-mail
  });

  if (error) throw new Error(`Falha ao criar usuário: ${error.message}`);
  console.log(`[seed] ✅  Usuário ${EMAIL} criado (id: ${data.user.id}).`);
  return data.user.id;
}

// ---------------------------------------------------------------------------
// 3. Vincular usuário como super_admin em store_users
// ---------------------------------------------------------------------------

async function ensureSuperAdmin(userId) {
  // Verifica se já tem vínculo super_admin
  const { data: existing } = await supabase
    .from('store_users')
    .select('id, role')
    .eq('user_id', userId)
    .eq('role', 'super_admin')
    .maybeSingle();

  if (existing) {
    console.log('[seed] ℹ️   Usuário já é super_admin.');
    return;
  }

  const { error } = await supabase.from('store_users').insert({
    store_id: SYSTEM_STORE_ID,
    user_id: userId,
    role: 'super_admin',
  });

  if (error) throw new Error(`Falha ao inserir super_admin: ${error.message}`);
  console.log('[seed] ✅  Role super_admin atribuído.');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('\n🚀  TryOn AI — Seed Super Admin\n');
  console.log(`   URL:   ${SUPABASE_URL}`);
  console.log(`   Email: ${EMAIL}`);
  console.log(`   Senha: ${PASSWORD}\n`);

  await ensureSystemStore();
  const userId = await ensureUser();
  await ensureSuperAdmin(userId);

  console.log('\n🎉  Super admin pronto! Acesse /login e entre com as credenciais acima.\n');
}

main().catch((err) => {
  console.error('\n[seed] ❌  Erro:', err.message);
  process.exit(1);
});
