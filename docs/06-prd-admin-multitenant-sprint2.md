# PRD — Admin Multi-tenant (Sprint 2)

## 1. Objetivo
Habilitar operação SaaS sem dependência de SQL manual, com gestão multi-tenant de lojas, catálogo elegível para try-on, configuração de integração VTEX, snippet de instalação via GTM e gestão básica de cobrança.

## 2. Problema
Hoje o produto depende de operação técnica (SQL Editor) para:
- cadastrar lojas
- configurar integrações
- controlar SKUs elegíveis
- distribuir código de instalação
- controlar cobrança

Isso reduz escalabilidade comercial e aumenta risco operacional.

## 3. Escopo fechado do MVP Sprint 2

### Incluído (IN)
1. Área **Super Admin** para cadastro e gestão de lojas.
2. Área **Admin da Loja** para:
   - definir plataforma (MVP: `vtex`)
   - configurar credenciais VTEX (`appKey`, `appToken`, `account`)
   - buscar/sincronizar produtos da VTEX
   - ativar/desativar SKUs elegíveis para try-on
3. Tela de **Instalação** com snippet GTM por plataforma da loja.
4. Guardrail no backend: `/api/generate` só processa `skuId` habilitado para a loja.
5. Billing básico no painel da loja:
   - visão de plano
   - visão de faturas (aberta/paga/atrasada)
   - link de pagamento externo

### Excluído (OUT)
- Multi-plataforma ativa além de VTEX (Shopify/Woo só depois)
- Conciliação fiscal/nota fiscal
- Cobrança automática complexa (pró-rata, múltiplos meios, split)
- Marketplace de apps

## 4. Personas
1. **Product Owner / Operação (Super Admin)**
   - precisa cadastrar e governar clientes (lojas) sem SQL.
2. **Lojista (Admin da Loja)**
   - precisa configurar integração e controlar catálogo permitido para try-on.
3. **Financeiro da Loja**
   - precisa visualizar faturas e status de pagamento.

## 5. User Stories + Acceptance Criteria

## Epic A — Governança de clientes (Super Admin)

### S2-A1 (MUST)
**Como** Super Admin, **quero** cadastrar e editar lojas, **para** ativar clientes sem usar SQL.

**AC (Gherkin)**
- **Given** usuário com role `super_admin`
  **When** cadastrar uma nova loja com nome, domínio(s), plano e owner
  **Then** o sistema deve criar a loja com `storeApiKey` única e status `active`.
- **Given** uma loja existente
  **When** alterar status para `suspended`
  **Then** chamadas de geração dessa loja devem ser bloqueadas.

### S2-A2 (MUST)
**Como** Super Admin, **quero** gerenciar usuários por loja, **para** controlar acesso.

**AC (Gherkin)**
- **Given** uma loja existente
  **When** vincular usuário com role `store_owner` ou `store_manager`
  **Then** o usuário deve acessar apenas dados da sua loja.

## Epic B — Configuração de plataforma e integração

### S2-B1 (MUST)
**Como** Admin da Loja, **quero** definir minha plataforma e credenciais VTEX, **para** habilitar integração.

**AC (Gherkin)**
- **Given** loja autenticada
  **When** selecionar plataforma `vtex` e salvar `account`, `appKey`, `appToken`
  **Then** o sistema deve validar conexão e persistir credenciais de forma segura.
- **Given** credencial inválida
  **When** testar conexão
  **Then** o sistema deve exibir erro amigável sem expor segredo completo.

## Epic C — Catálogo elegível para try-on

### S2-C1 (MUST)
**Como** Admin da Loja, **quero** buscar produtos VTEX e marcar SKUs elegíveis, **para** controlar custo e catálogo.

**AC (Gherkin)**
- **Given** integração VTEX válida
  **When** buscar por SKU/nome
  **Then** o sistema deve listar produtos com status de elegibilidade.
- **Given** um SKU
  **When** marcar como habilitado
  **Then** ele deve ficar elegível para `/api/generate`.
- **Given** um SKU desabilitado
  **When** o widget chamar `/api/generate`
  **Then** a API deve retornar `403` com mensagem clara de SKU não permitido.

## Epic D — Instalação via GTM

### S2-D1 (MUST)
**Como** Admin da Loja, **quero** copiar snippet de instalação GTM, **para** publicar o widget na minha loja.

**AC (Gherkin)**
- **Given** loja configurada
  **When** abrir tela de instalação
  **Then** deve ver snippet com `store-api-key`, `api-url` e `platform` corretos.
- **Given** plataforma `vtex`
  **When** copiar snippet
  **Then** deve haver instrução de uso via GTM/Custom HTML.

## Epic E — Billing básico

### S2-E1 (MUST)
**Como** Admin da Loja, **quero** visualizar minhas faturas e status, **para** gerenciar pagamentos.

**AC (Gherkin)**
- **Given** loja autenticada
  **When** acessar Billing
  **Then** deve ver plano atual, período, valor, vencimento e status da fatura.
- **Given** fatura em aberto
  **When** clicar em pagar
  **Then** deve abrir link externo de pagamento do provider.

## 6. Requisitos não funcionais
- Isolamento multi-tenant obrigatório em todas as queries.
- Segredos de integração criptografados em repouso.
- Logs sem vazamento de `appToken`.
- Tempo de resposta p95 painel < 1.5s para listagens principais.
- Auditoria mínima de alterações críticas (store status, credenciais, enable/disable SKU).

## 7. Dependências

### Dependências técnicas
1. Autenticação no dashboard com RBAC (`super_admin`, `store_owner`, `store_manager`).
2. Migração de schema para `store_users`, `store_integrations`, `store_products`, `billing_invoices`.
3. Cliente VTEX para busca de catálogo e validação de credenciais.
4. Encriptação de credenciais (ex.: AES com chave de ambiente).
5. Endpoint/serviço de billing provider (mock no MVP permitido).

### Dependências de negócio
1. Definição de planos e preço (mensalidade + regra de uso).
2. Política de inadimplência (bloqueio suave/duro).
3. Definição operacional do processo de onboarding de loja.

## 8. Riscos e mitigação
1. **Credenciais inválidas da VTEX** → teste de conexão obrigatório + feedback claro.
2. **Custo elevado por SKU habilitado sem controle** → allowlist obrigatória + UI de status.
3. **Vazamento de segredo** → mascaramento e criptografia.
4. **Inconsistência de catálogo** → sync manual + sync agendada (SHOULD).

## 9. Métricas de sucesso (Sprint 2)
- 100% das lojas novas cadastradas sem SQL.
- 100% das gerações validadas contra SKU elegível.
- >= 90% das integrações VTEX configuradas com sucesso no primeiro onboarding.
- 100% das lojas com snippet GTM gerado no painel.
- 100% das lojas com visualização de fatura ativa no painel.

## 10. Go/No-Go Sprint 2
- Go se: Super Admin + Config VTEX + Allowlist SKU + Snippet + Billing básico estiverem em produção.
- No-Go se: ainda houver dependência operacional de SQL para onboarding e catálogo.

## 11. Recomendação de execução
- **Best Agent:** `backend-specialist` (dados, RBAC, APIs) + `frontend-specialist` (painéis de gestão).
- **Best Skill:** `plan-writing` para decompor em épicos/stories executáveis com dependências explícitas.
