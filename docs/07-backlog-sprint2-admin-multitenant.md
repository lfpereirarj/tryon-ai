# Backlog de Produto — Sprint 2 (Admin Multi-tenant)

## Contexto
Este backlog implementa o PRD de [docs/06-prd-admin-multitenant-sprint2.md](docs/06-prd-admin-multitenant-sprint2.md), removendo dependência de SQL manual e habilitando operação SaaS com governança por loja.

---

## Objetivo do Sprint 2
Entregar operação administrativa completa para:
- onboarding de lojas
- configuração de integração VTEX
- seleção de SKUs elegíveis para try-on
- distribuição de snippet GTM
- gestão básica de cobrança

---

## MoSCoW (resumo)

### MUST
- RBAC multi-tenant (`super_admin`, `store_owner`, `store_manager`)
- CRUD de lojas (Super Admin)
- Configuração VTEX por loja (`account`, `appKey`, `appToken`)
- Catálogo de produtos + allowlist de SKUs
- Bloqueio de `/api/generate` para SKU não habilitado
- Tela de snippet GTM por plataforma
- Billing básico (faturas + status + link de pagamento)

### SHOULD
- Sync automática diária de catálogo
- Rotação segura de credenciais VTEX
- Alertas de fatura vencida

### COULD
- Importação CSV de SKUs
- Convite por e-mail para usuários da loja
- Export CSV de faturas

### WON’T (Sprint 2)
- Multi-plataforma ativa (Shopify/Woo)
- Cobrança avançada (pró-rata/split)
- Conciliação fiscal completa

---

## Sequenciamento e dependências

1. **Base de segurança e dados** (pré-requisito de tudo)
2. **Super Admin de lojas**
3. **Configuração VTEX por loja**
4. **Catálogo + allowlist SKU**
5. **Guardrail no `/api/generate`**
6. **Snippet GTM**
7. **Billing básico**

Dependência crítica: não iniciar Catálogo/Generate guardrail antes da integração VTEX persistida por loja.

---

## Sprint 2 — Épicos e Stories

## Epic A — RBAC e base multi-tenant

### Story S2-A1 (MUST)
**Como** plataforma SaaS, **quero** RBAC por tenant, **para** isolar dados e permissões por loja.

**Acceptance Criteria (Gherkin)**
- **Given** usuário `store_owner`
  **When** acessar APIs/telas
  **Then** deve visualizar apenas dados da própria loja.
- **Given** usuário sem permissão
  **When** acessar rota administrativa restrita
  **Then** deve receber `403`.

**Entregáveis**
- Tabela `store_users`
- Middleware de autorização por role
- Guard de tenant em consultas

---

## Epic B — Super Admin (onboarding de lojas)

### Story S2-B1 (MUST)
**Como** Super Admin, **quero** cadastrar lojas e definir status/plano, **para** operar clientes sem SQL.

**Acceptance Criteria (Gherkin)**
- **Given** formulário válido
  **When** cadastrar loja
  **Then** deve gerar `storeApiKey` única e persistir `allowed_origins`.
- **Given** loja suspensa
  **When** widget chamar `/api/generate`
  **Then** a API deve bloquear processamento.

**Entregáveis**
- Tela de listagem/criação/edição de lojas
- API de management de lojas

---

## Epic C — Integração VTEX por loja

### Story S2-C1 (MUST)
**Como** Admin da Loja, **quero** configurar credenciais VTEX, **para** habilitar catálogo e carrinho.

**Acceptance Criteria (Gherkin)**
- **Given** credenciais VTEX válidas
  **When** clicar em "Testar conexão"
  **Then** o sistema deve confirmar sucesso e salvar integração.
- **Given** credenciais inválidas
  **When** testar
  **Then** exibir erro amigável e não salvar estado válido.

**Entregáveis**
- Tabela `store_integrations`
- API de teste/salvamento de credenciais
- UI de configuração VTEX

---

## Epic D — Catálogo e SKU elegível

### Story S2-D1 (MUST)
**Como** Admin da Loja, **quero** buscar produtos e habilitar SKUs, **para** controlar o que entra no provador.

**Acceptance Criteria (Gherkin)**
- **Given** integração válida
  **When** buscar produto
  **Then** deve listar SKU, nome, imagem e status `enabled`.
- **Given** SKU desabilitado
  **When** chamar `/api/generate`
  **Then** resposta deve ser `403` e mensagem de SKU não elegível.

**Entregáveis**
- Tabela `store_products`
- APIs de busca/sync e toggle de elegibilidade
- Alteração no `/api/generate` para validar allowlist

---

## Epic E — Snippet GTM

### Story S2-E1 (MUST)
**Como** Admin da Loja, **quero** copiar snippet GTM pronto, **para** instalar rapidamente.

**Acceptance Criteria (Gherkin)**
- **Given** loja configurada
  **When** abrir tela de instalação
  **Then** snippet deve conter `store-api-key`, `platform` e `api-url` corretos.
- **Given** plataforma `vtex`
  **When** copiar instrução
  **Then** deve existir passo-a-passo mínimo de publicação no GTM.

**Entregáveis**
- Tela de instalação
- Geração dinâmica de snippet por loja

---

## Epic F — Billing básico

### Story S2-F1 (MUST)
**Como** Admin da Loja, **quero** ver minhas faturas e pagar, **para** manter conta ativa.

**Acceptance Criteria (Gherkin)**
- **Given** período vigente
  **When** acessar billing
  **Then** deve ver plano, valor, vencimento e status.
- **Given** fatura em aberto
  **When** clicar em pagar
  **Then** abrir link externo do provider de pagamento.

**Entregáveis**
- Tabela `billing_invoices`
- API de listagem de faturas por loja
- UI de billing (lista + detalhe)

---

## Checklist de dependências técnicas
- [ ] Definir estratégia de auth do dashboard (Supabase Auth / NextAuth)
- [ ] Definir padrão de criptografia de segredos de integração
- [ ] Definir serviço VTEX para catálogo/pesquisa
- [ ] Definir provider de pagamento (ou mock operacional do MVP)
- [ ] Definir política de suspensão por inadimplência

---

## Critérios de aceite do Sprint 2 (gate)
- [ ] Nenhum onboarding de loja depende de SQL manual
- [ ] `/api/generate` bloqueia SKU não habilitado por loja
- [ ] Loja configura VTEX e busca catálogo pelo painel
- [ ] Loja copia snippet GTM pronto com parâmetros corretos
- [ ] Loja visualiza faturas e status no painel

---

## Plano de execução sugerido (4 semanas)
- **Semana 1:** Epic A + Epic B
- **Semana 2:** Epic C
- **Semana 3:** Epic D + Epic E
- **Semana 4:** Epic F + hardening

---

## Recomendação de implementação
- **Best Agent:** `project-planner` para decomposição em tarefas de sprint + `backend-specialist` para camadas de dados/segurança.
- **Best Skill:** `plan-writing` para manter rastreabilidade PRD → Story → Entregável → Aceite.
