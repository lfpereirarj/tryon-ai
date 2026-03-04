/**
 * E2E — Fluxo de autenticação: proteção de rotas + redirect
 *
 * Requer servidor local em http://localhost:3000 (configurado no playwright.config.ts).
 * NÃO fazemos login com credenciais reais — testamos apenas o comportamento
 * do middleware (redirect para /login) e a UI pública da página de login.
 *
 * Para testes de login com credenciais reais, use a variável
 * E2E_USER_EMAIL + E2E_USER_PASSWORD no CI (ver test "login completo").
 */
import { test, expect } from '@playwright/test';

// ---------------------------------------------------------------------------
// Proteção de rotas (middleware) — sem autenticação
// ---------------------------------------------------------------------------

test.describe('Middleware — proteção de rotas', () => {
  test('/dashboard redireciona para /login quando não autenticado', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });

  test('/dashboard/admin redireciona para /login', async ({ page }) => {
    await page.goto('/dashboard/admin');
    await expect(page).toHaveURL(/\/login/);
  });

  test('/dashboard/admin/stores redireciona para /login', async ({ page }) => {
    await page.goto('/dashboard/admin/stores');
    await expect(page).toHaveURL(/\/login/);
  });

  test('/dashboard/admin/stores/new redireciona para /login', async ({ page }) => {
    await page.goto('/dashboard/admin/stores/new');
    await expect(page).toHaveURL(/\/login/);
  });

  test('redirect preserva parâmetro ?next= na URL de login', async ({ page }) => {
    await page.goto('/dashboard/admin/stores');
    const url = new URL(page.url());
    // O middleware deve adicionar ?next=/dashboard/admin/stores
    expect(url.pathname).toBe('/login');
    const next = url.searchParams.get('next');
    expect(next).toContain('/dashboard');
  });
});

// ---------------------------------------------------------------------------
// Página de login — elementos da UI
// ---------------------------------------------------------------------------

test.describe('Página /login', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('renderiza campo E-mail', async ({ page }) => {
    await expect(page.locator('#email')).toBeVisible();
  });

  test('renderiza campo Senha', async ({ page }) => {
    await expect(page.locator('#password')).toBeVisible();
  });

  test('renderiza botão de submit', async ({ page }) => {
    await expect(page.getByRole('button', { name: /entrar/i })).toBeVisible();
  });

  test('exibe mensagem de erro com credenciais inválidas', async ({ page }) => {
    await page.locator('#email').fill('invalido@invalido.com');
    await page.locator('#password').fill('senha-errada');
    await page.getByRole('button', { name: /entrar/i }).click();

    // Aguarda mensagem de erro aparecer
    const errorMsg = page.getByText(/e-mail ou senha inválidos/i);
    await expect(errorMsg).toBeVisible({ timeout: 10_000 });
  });

  test('botão fica desabilitado/loading durante o envio', async ({ page }) => {
    await page.locator('#email').fill('teste@teste.com');
    await page.locator('#password').fill('qualquersenha');

    const button = page.getByRole('button', { name: /entrar/i });
    await button.click();

    // Após click, o botão deve ficar desabilitado enquanto carrega
    // (handleSubmit faz setLoading(true))
    await expect(button).toBeDisabled({ timeout: 2_000 });
  });
});

// ---------------------------------------------------------------------------
// Login completo (somente se credenciais E2E estiverem configuradas)
// ---------------------------------------------------------------------------

const E2E_EMAIL = process.env.E2E_USER_EMAIL;
const E2E_PASSWORD = process.env.E2E_USER_PASSWORD;

test.describe('Login completo com credenciais válidas', () => {
  test.skip(!E2E_EMAIL || !E2E_PASSWORD, 'Variáveis E2E_USER_EMAIL/PASSWORD não configuradas');

  test('login bem-sucedido redireciona para /dashboard', async ({ page }) => {
    await page.goto('/login');
    await page.locator('#email').fill(E2E_EMAIL!);
    await page.locator('#password').fill(E2E_PASSWORD!);
    await page.getByRole('button', { name: /entrar/i }).click();

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
  });

  test('usuário autenticado em /login é redirecionado para /dashboard', async ({ page }) => {
    // Primeiro faz login
    await page.goto('/login');
    await page.locator('#email').fill(E2E_EMAIL!);
    await page.locator('#password').fill(E2E_PASSWORD!);
    await page.getByRole('button', { name: /entrar/i }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });

    // Tenta acessar /login novamente → deve redirecionar ao dashboard
    await page.goto('/login');
    await expect(page).toHaveURL(/\/dashboard/);
  });
});
