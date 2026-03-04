/**
 * QA-S2-01 — Testes unitários: Installation Service — Snippet GTM
 *
 * Cobre:
 * - Snippet contém store-api-key correto
 * - Snippet contém api-url correto
 * - Snippet contém platform='vtex'
 * - fullSnippet é um Custom HTML GTM válido (contém <script>)
 * - Steps têm títulos e código não vazio
 * - Erro se loja não encontrada
 * - Sem dados sensíveis no payload (sem appToken, sem chaves de crypto)
 * - NEXT_PUBLIC_SITE_URL sobrepõe requestOrigin
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getInstallationPayload } from '@/lib/services/installation.service';

// ---------------------------------------------------------------------------
// Mock store.service
// ---------------------------------------------------------------------------

const mockStore = {
  id: 'store-123',
  name: 'Loja Teste',
  public_api_key: 'test-api-key-abc123',
  domain: 'lojateste.com.br',
  status: 'active' as const,
  plan: 'pro' as const,
  allowed_origins: [],
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

vi.mock('@/lib/services/store.service', () => ({
  getStoreById: vi.fn(),
}));

import { getStoreById } from '@/lib/services/store.service';
const mockGetStoreById = vi.mocked(getStoreById);

// ---------------------------------------------------------------------------
// Testes
// ---------------------------------------------------------------------------

describe('getInstallationPayload()', () => {
  const originalSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  beforeEach(() => {
    mockGetStoreById.mockResolvedValue(mockStore);
    delete process.env.NEXT_PUBLIC_SITE_URL;
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_SITE_URL = originalSiteUrl;
  });

  it('retorna payload com storeId, storeName e platform corretos', async () => {
    const payload = await getInstallationPayload('store-123', 'https://app.tryon.ai');
    expect(payload.storeId).toBe('store-123');
    expect(payload.storeName).toBe('Loja Teste');
    expect(payload.platform).toBe('vtex');
  });

  it('storeApiKey no payload é a public_api_key da loja', async () => {
    const payload = await getInstallationPayload('store-123', 'https://app.tryon.ai');
    expect(payload.storeApiKey).toBe('test-api-key-abc123');
  });

  it('apiUrl usa requestOrigin como fallback quando NEXT_PUBLIC_SITE_URL ausente', async () => {
    const payload = await getInstallationPayload('store-123', 'https://minha-loja.vercel.app');
    expect(payload.apiUrl).toBe('https://minha-loja.vercel.app');
  });

  it('apiUrl usa NEXT_PUBLIC_SITE_URL quando configurado', async () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://producao.tryon.ai';
    const payload = await getInstallationPayload('store-123', 'https://qualquer.com');
    expect(payload.apiUrl).toBe('https://producao.tryon.ai');
  });

  it('apiUrl remove trailing slash', async () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://producao.tryon.ai/';
    const payload = await getInstallationPayload('store-123', 'https://qualquer.com');
    expect(payload.apiUrl).not.toMatch(/\/$/);
  });

  it('fullSnippet contém a store-api-key correta', async () => {
    const payload = await getInstallationPayload('store-123', 'https://app.tryon.ai');
    expect(payload.fullSnippet).toContain('test-api-key-abc123');
  });

  it('fullSnippet contém a api-url correta', async () => {
    const payload = await getInstallationPayload('store-123', 'https://app.tryon.ai');
    expect(payload.fullSnippet).toContain('https://app.tryon.ai');
  });

  it('fullSnippet contém platform=vtex', async () => {
    const payload = await getInstallationPayload('store-123', 'https://app.tryon.ai');
    expect(payload.fullSnippet).toContain("'vtex'");
  });

  it('fullSnippet é um bloco <script>...</script>', async () => {
    const payload = await getInstallationPayload('store-123', 'https://app.tryon.ai');
    expect(payload.fullSnippet.trim()).toMatch(/^<!-- TryOn AI/);
    expect(payload.fullSnippet).toContain('<script>');
    expect(payload.fullSnippet).toContain('</script>');
  });

  it('steps têm pelo menos 3 entradas (GTM tag 1, GTM tag 2, store-theme)', async () => {
    const payload = await getInstallationPayload('store-123', 'https://app.tryon.ai');
    expect(payload.steps.length).toBeGreaterThanOrEqual(3);
  });

  it('cada step tem title, description e code não vazios', async () => {
    const payload = await getInstallationPayload('store-123', 'https://app.tryon.ai');
    for (const step of payload.steps) {
      expect(step.title.length).toBeGreaterThan(0);
      expect(step.description.length).toBeGreaterThan(0);
      expect(step.code.length).toBeGreaterThan(0);
    }
  });

  it('[segurança] payload NÃO contém tokens de criptografia ou segredos sensíveis', async () => {
    const payload = await getInstallationPayload('store-123', 'https://app.tryon.ai');
    const json = JSON.stringify(payload);
    // Garante que ENCRYPTION_KEY, appToken, etc. não vazam no snippet
    expect(json).not.toContain('ENCRYPTION_KEY');
    expect(json).not.toContain('appToken');
    expect(json).not.toContain('app_token');
  });

  it('lança erro se loja não for encontrada', async () => {
    mockGetStoreById.mockResolvedValue(null);
    await expect(
      getInstallationPayload('loja-inexistente', 'https://app.tryon.ai'),
    ).rejects.toThrow(/não encontrada/);
  });
});
