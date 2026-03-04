/**
 * vtex-integration.service.ts — Persistência e teste de integração VTEX por loja
 *
 * Usa AES-256-GCM para cifrar o appToken antes de salvar no banco.
 * Nunca retorna o token em texto puro — apenas mascarado.
 */
import { getSupabaseAdmin } from '@/lib/clients/supabase';
import { encrypt, decrypt, maskSecret } from '@/lib/utils/crypto';
import type {
  SaveIntegrationInput,
  IntegrationPublicRow,
  VtexPlatform,
  IntegrationStatus,
} from '@/lib/contracts/integration';

// ---------------------------------------------------------------------------
// Tipos internos (mapeado do banco)
// ---------------------------------------------------------------------------

interface IntegrationRow {
  id: string;
  store_id: string;
  platform: VtexPlatform;
  account: string;
  app_key: string;
  app_token_enc: string;
  status: IntegrationStatus;
  error_message: string | null;
  tested_at: string | null;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Mapeador
// ---------------------------------------------------------------------------

function toPublic(row: IntegrationRow): IntegrationPublicRow {
  return {
    id: row.id,
    storeId: row.store_id,
    platform: row.platform,
    account: row.account,
    appKey: row.app_key,
    appTokenMasked: maskSecret(decryptedPreview(row.app_token_enc)),
    status: row.status,
    errorMessage: row.error_message,
    testedAt: row.tested_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Decifra só para gerar o preview mascarado (não expõe o token real) */
function decryptedPreview(enc: string): string {
  try {
    return decrypt(enc);
  } catch {
    return '????';
  }
}

// ---------------------------------------------------------------------------
// Consultas
// ---------------------------------------------------------------------------

/**
 * Busca a integração VTEX de uma loja (somente VTEX por ora).
 * Retorna `null` se ainda não configurada.
 */
export async function getIntegration(
  storeId: string,
  platform: VtexPlatform = 'vtex',
): Promise<IntegrationPublicRow | null> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('store_integrations')
    .select('*')
    .eq('store_id', storeId)
    .eq('platform', platform)
    .maybeSingle();

  if (error) throw new Error(`[vtex-integration] getIntegration: ${error.message}`);
  if (!data) return null;

  return toPublic(data as IntegrationRow);
}

/**
 * Cria ou atualiza a integração de uma loja.
 * Se `appToken` for omitido na atualização, mantém o valor criptografado existente.
 */
export async function saveIntegration(
  storeId: string,
  input: SaveIntegrationInput,
): Promise<IntegrationPublicRow> {
  const supabase = getSupabaseAdmin();

  // Busca registro existente para decidir entre INSERT e UPDATE
  const { data: existing } = await supabase
    .from('store_integrations')
    .select('id, app_token_enc')
    .eq('store_id', storeId)
    .eq('platform', input.platform ?? 'vtex')
    .maybeSingle();

  // Cifra o novo token ou mantém o existente
  let appTokenEnc: string;
  if (input.appToken) {
    appTokenEnc = encrypt(input.appToken);
  } else if (existing?.app_token_enc) {
    appTokenEnc = existing.app_token_enc as string;
  } else {
    throw new Error('appToken é obrigatório na criação da integração.');
  }

  const payload = {
    store_id: storeId,
    platform: input.platform ?? 'vtex',
    account: input.account.toLowerCase().trim(),
    app_key: input.appKey.trim(),
    app_token_enc: appTokenEnc,
    // Ao salvar, volta para pending — precisa re-testar
    status: 'pending' as IntegrationStatus,
    error_message: null,
  };

  let row: IntegrationRow;

  if (existing?.id) {
    const { data, error } = await supabase
      .from('store_integrations')
      .update(payload)
      .eq('id', existing.id)
      .select('*')
      .single();

    if (error) throw new Error(`[vtex-integration] saveIntegration update: ${error.message}`);
    row = data as IntegrationRow;
  } else {
    const { data, error } = await supabase
      .from('store_integrations')
      .insert(payload)
      .select('*')
      .single();

    if (error) throw new Error(`[vtex-integration] saveIntegration insert: ${error.message}`);
    row = data as IntegrationRow;
  }

  return toPublic(row);
}

// ---------------------------------------------------------------------------
// Testar conexão VTEX
// ---------------------------------------------------------------------------

export interface TestConnectionResult {
  ok: boolean;
  message: string;
  httpStatus?: number;
}

/**
 * Valida as credenciais VTEX fazendo uma requisição real para a API da conta.
 * Usa o endpoint de listagem de categorias (nível 1) — leve e sem side-effects.
 *
 * Após o teste, persiste o status (`active` ou `error`) e o timestamp.
 */
export async function testVtexConnection(storeId: string): Promise<TestConnectionResult> {
  const supabase = getSupabaseAdmin();

  // Busca integração existente
  const { data: row, error: fetchErr } = await supabase
    .from('store_integrations')
    .select('*')
    .eq('store_id', storeId)
    .eq('platform', 'vtex')
    .maybeSingle();

  if (fetchErr) throw new Error(`[vtex-integration] testConnection fetch: ${fetchErr.message}`);
  if (!row) return { ok: false, message: 'Integração VTEX não configurada.' };

  const integration = row as IntegrationRow;

  // Decifra o token para uso na request
  let appToken: string;
  try {
    appToken = decrypt(integration.app_token_enc);
  } catch {
    return { ok: false, message: 'Erro ao decifrar token. Reconfigure a integração.' };
  }

  const account = integration.account;
  const appKey = integration.app_key;

  // Endpoint de teste: catalog categoria tree (nível 1)
  const url = `https://${account}.vtexcommercestable.com.br/api/catalog/pvt/category/1`;

  let httpStatus: number | undefined;
  let testOk = false;
  let message = '';

  try {
    const resp = await fetch(url, {
      method: 'GET',
      headers: {
        'X-VTEX-API-AppKey': appKey,
        'X-VTEX-API-AppToken': appToken,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(10_000),
    });

    httpStatus = resp.status;

    if (resp.ok) {
      testOk = true;
      message = 'Conexão estabelecida com sucesso.';
    } else if (resp.status === 401 || resp.status === 403) {
      message = 'Credenciais inválidas ou sem permissão (401/403).';
    } else if (resp.status === 404) {
      message = `Conta VTEX "${account}" não encontrada (404). Verifique o campo "account".`;
    } else {
      message = `Resposta inesperada da VTEX: HTTP ${resp.status}.`;
    }
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    if (errMsg.includes('TimeoutError') || errMsg.includes('timeout')) {
      message = 'Timeout ao conectar na VTEX (>10s). Verifique a conta e a rede.';
    } else {
      message = `Falha de rede ao conectar na VTEX: ${errMsg}`;
    }
  }

  // Persiste resultado no banco
  await supabase
    .from('store_integrations')
    .update({
      status: testOk ? 'active' : 'error',
      error_message: testOk ? null : message,
      tested_at: new Date().toISOString(),
    })
    .eq('id', integration.id);

  return { ok: testOk, message, httpStatus };
}

/**
 * Retorna o appToken decifrado de uma integração específica.
 * USO INTERNO APENAS — nunca expor em respostas HTTP.
 */
export async function getDecryptedToken(storeId: string): Promise<string | null> {
  const supabase = getSupabaseAdmin();

  const { data } = await supabase
    .from('store_integrations')
    .select('app_token_enc')
    .eq('store_id', storeId)
    .eq('platform', 'vtex')
    .maybeSingle();

  if (!data?.app_token_enc) return null;

  try {
    return decrypt(data.app_token_enc as string);
  } catch {
    return null;
  }
}
