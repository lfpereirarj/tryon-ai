# Tarefas de Execução por Especialista — Sprint 2 (Admin Multi-tenant)

## Objetivo
Transformar o backlog de [docs/07-backlog-sprint2-admin-multitenant.md](docs/07-backlog-sprint2-admin-multitenant.md) em tarefas executáveis para:

- `backend-specialist`
- `frontend-specialist`
- `test-engineer`
- `project-planner`

Com foco em:
- operação sem SQL manual
- isolamento multi-tenant por loja
- integração VTEX configurável por tenant
- catálogo elegível para try-on
- instalação GTM e billing básico

---

## Regras operacionais

1. Nenhuma tarefa fecha sem evidência objetiva (arquivo alterado + endpoint/tela + validação).
2. Bloqueio por dependência: não iniciar tarefas de catálogo antes da integração VTEX estar funcional.
3. Segurança primeiro: segredos nunca em texto puro em logs/respostas.
4. Toda feature de tenant deve validar escopo da loja no backend.

---

## Sprint 2 — Ordem recomendada de execução

1. `PL-S2-01` + `BE-S2-01`
2. `BE-S2-02` + `FE-S2-01`
3. `BE-S2-03` + `FE-S2-02`
4. `BE-S2-04` + `FE-S2-03`
5. `BE-S2-05` + `FE-S2-04`
6. `BE-S2-06` + `FE-S2-05`
7. `QA-S2-01` (regressão + gate)

---

## 2.1 Tarefas para `project-planner`

### PL-S2-01 — Plano de entrega e trilha de dependências (MUST)
**Story origem:** S2-A1, S2-B1, S2-C1, S2-D1, S2-E1

**Descrição**
Estruturar o sprint em lotes com dependências explícitas e critérios de handoff entre especialistas.

**Checklist técnico**
- [x] Definir milestones semanais (W1-W4)
- [x] Mapear dependências bloqueantes entre BE/FE/QA
- [x] Definir critérios de aceite por lote
- [x] Definir plano de rollback por lote crítico

**DoD**
- [x] Roadmap operacional publicado e acordado
- [x] Sem tarefas órfãs sem responsável

**Evidência esperada**
- [x] `admin-multitenant-sprint2.md` criado na raiz do projeto com milestones W1–W4, dependency graph, rollback, handoff e Phase X checklist
- Quadro de responsabilidades por especialista incluído no plano

**Status: CONCLUÍDO ✅**

---

## 2.2 Tarefas para `backend-specialist`

### BE-S2-01 — Base multi-tenant + RBAC (MUST)
**Story origem:** S2-A1, S2-A2

**Descrição**
Criar base de autorização e isolamento por tenant para APIs administrativas.

**Checklist técnico**
- [x] Criar/ajustar schema para `store_users` e roles (`super_admin`, `store_owner`, `store_manager`)
- [x] Implementar middleware utilitário de autorização por role
- [x] Implementar guard obrigatório de `store_id` para consultas por tenant
- [x] Bloquear acesso cross-tenant com 403

**DoD**
- [x] Endpoints administrativos protegidos por role
- [x] Nenhuma consulta retorna dados de outra loja

**Evidência esperada**
- [x] `web/supabase/migrations/sprint2_admin_schema.sql` — tabela `store_users`, constraints de role/status/plan, trigger `set_updated_at`
- [x] `web/src/lib/auth/session.ts` — `getUserFromRequest()` via JWT Bearer
- [x] `web/src/lib/auth/rbac.ts` — `requireRole()`, `forbidCrossTenant()`, `rbacError()`
- [x] `web/src/lib/contracts/admin.ts` — Zod schemas: `CreateStoreSchema`, `UpdateStoreSchema`, `AddStoreUserSchema`

**Status: CONCLUÍDO ✅**

---

### BE-S2-02 — CRUD de lojas (Super Admin) (MUST)
**Story origem:** S2-B1

**Descrição**
Permitir onboarding/gestão de lojas sem SQL manual.

**Checklist técnico**
- [x] Endpoint de criação de loja (`name`, `domain(s)`, `plan`, `status`)
- [x] Geração de `storeApiKey` única via `randomUUID()`
- [x] Endpoint de atualização de status/plano/domínios
- [x] Regra de bloqueio de geração quando loja estiver `suspended`

**DoD**
- [x] Loja criada e editada pelo painel
- [x] `/api/generate` bloqueia loja `suspended` ou `cancelled` com 403

**Evidência esperada**
- [x] `web/src/lib/services/store.service.ts` — `listStores()`, `getStoreById()`, `createStore()`, `updateStore()`, `listStoreUsers()`, `addStoreUser()`
- [x] `web/src/app/api/admin/stores/route.ts` — GET/POST super_admin
- [x] `web/src/app/api/admin/stores/[id]/route.ts` — GET/PATCH super_admin
- [x] `web/src/app/api/admin/stores/[id]/users/route.ts` — GET/POST super_admin
- [x] `web/src/app/api/generate/route.ts` — guard `store.status === 'suspended' || 'cancelled'` → 403

**Status: CONCLUÍDO ✅**

---

### BE-S2-03 — Integração VTEX por loja (MUST)
**Story origem:** S2-C1

**Descrição**
Persistir e validar integração VTEX por tenant com segurança.

**Checklist técnico**
- [ ] Criar schema `store_integrations`
- [ ] Salvar `account`, `appKey`, `appToken` (token criptografado)
- [ ] Endpoint `test-connection` para validação de credenciais
- [ ] Mascarar segredo em logs e respostas

**DoD**
- [x] Credenciais válidas aprovam teste
- [x] Credenciais inválidas retornam erro amigável sem leak de segredo

**Evidência esperada**
- [x] `web/supabase/migrations/sprint2_vtex_integration.sql` — tabela `store_integrations`, AES-256-GCM, trigger updated_at
- [x] `web/src/lib/utils/crypto.ts` — `encrypt()`, `decrypt()`, `maskSecret()` via AES-256-GCM
- [x] `web/src/lib/contracts/integration.ts` — `SaveIntegrationSchema`, `IntegrationPublicRow`
- [x] `web/src/lib/services/vtex-integration.service.ts` — `getIntegration()`, `saveIntegration()`, `testVtexConnection()`, `getDecryptedToken()`
- [x] `web/src/app/api/admin/stores/[id]/integration/route.ts` — GET/PUT (super_admin + store_owner)
- [x] `web/src/app/api/admin/stores/[id]/integration/test/route.ts` — POST test conexão

**Status: CONCLUÍDO ✅**

---

### BE-S2-04 — Catálogo e allowlist de SKU (MUST)
**Story origem:** S2-D1

**Descrição**
Buscar produtos VTEX e controlar elegibilidade por loja.

**Checklist técnico**
- [ ] Criar schema `store_products`
- [ ] Endpoint de busca/sync de produtos VTEX
- [ ] Endpoint de toggle `enabled` por SKU
- [ ] Guard no `/api/generate` para rejeitar SKU desabilitado (403)

**DoD**
- [ ] SKU habilitado gera imagem
- [ ] SKU desabilitado é bloqueado corretamente

**Evidência esperada**
- Serviços de catálogo
- Alteração no `web/src/app/api/generate/route.ts`
- Testes de cenário enabled/disabled

---

### BE-S2-05 — API de snippet de instalação GTM (MUST)
**Story origem:** S2-D1

**Descrição**
Gerar payload/snippet por loja e plataforma para consumo no painel.

**Checklist técnico**
- [ ] Endpoint para retornar snippet por tenant
- [ ] Template VTEX com `store-api-key`, `api-url`, `platform`
- [ ] Validação de domínios permitidos (consistência com allowlist)

**DoD**
- [ ] Snippet consistente com configuração da loja
- [ ] Sem dados sensíveis no snippet

**Evidência esperada**
- Endpoint dedicado de instalação
- Template versionado de snippet

---

### BE-S2-06 — Billing básico (MUST)
**Story origem:** S2-E1

**Descrição**
Expor dados de cobrança por loja para o painel.

**Checklist técnico**
- [ ] Criar schema `billing_invoices`
- [ ] Endpoint de listagem de faturas por tenant
- [ ] Endpoint de detalhe de fatura
- [ ] Campo de `payment_url` para redirecionamento externo

**DoD**
- [ ] Loja visualiza histórico de faturas
- [ ] Loja consegue acessar link de pagamento

**Evidência esperada**
- Rotas de billing
- Estrutura de seed/mock para faturamento MVP

---

## 2.3 Tarefas para `frontend-specialist`

### FE-S2-01 — Área Super Admin (lojas) (MUST)
**Story origem:** S2-B1

**Descrição**
Construir interface para gestão de lojas no dashboard.

**Checklist técnico**
- [x] Tela de listagem de lojas
- [x] Formulário criar loja (name, domain, plan)
- [x] Formulário editar loja (name, domain, plan, status, allowed_origins)
- [x] Alteração de status/plano/domínios
- [x] Estados de loading/erro/sucesso

**DoD**
- [x] Fluxo criar/editar/suspender funcional via UI
- [x] UX clara para ação crítica (suspensão com aviso de impacto no /api/generate)

**Evidência esperada**
- [x] `web/src/app/dashboard/layout.tsx` — Sidebar brutalist, accent acid-green #00e87b
- [x] `web/src/app/dashboard/admin/page.tsx` — Tabela de lojas com status badge + link editar
- [x] `web/src/app/dashboard/admin/stores/new/page.tsx` — Formulário de criação
- [x] `web/src/app/dashboard/admin/stores/[id]/page.tsx` — Formulário de edição + toggle de status
- [x] `web/src/lib/clients/supabase-browser.ts` — client Supabase para Client Components

**Status: CONCLUÍDO ✅**

---

### FE-S2-02 — Configuração VTEX da loja (MUST)
**Story origem:** S2-C1

**Descrição**
Permitir ao lojista configurar credenciais VTEX e testar conexão.

**Checklist técnico**
- [ ] Tela de integração com `account`, `appKey`, `appToken`
- [ ] Ação “Testar conexão”
- [ ] Feedback de sucesso/erro amigável
- [ ] Máscara visual de segredo após salvar

**DoD**
- [x] Fluxo de configuração completo sem SQL
- [x] Erros de credencial com UX orientada

**Evidência esperada**
- [x] `web/src/app/dashboard/admin/stores/[id]/integration/page.tsx` — form account/appKey/appToken, máscara visual, badge de status, botão "Testar conexão" com spinner
- [x] `web/src/app/dashboard/admin/stores/[id]/page.tsx` — reescrito com shadcn + tab "Integração VTEX" linkando para a página

**Status: CONCLUÍDO ✅**

---

### FE-S2-03 — Catálogo elegível (MUST)
**Story origem:** S2-D1

**Descrição**
Permitir buscar produtos e habilitar/desabilitar SKUs para try-on.

**Checklist técnico**
- [ ] Tela de busca/filtro por SKU/nome
- [ ] Lista de produtos com status `enabled`
- [ ] Toggle de elegibilidade por SKU
- [ ] Paginação/estado vazio/erro

**DoD**
- [ ] Lojista controla catálogo elegível no painel
- [ ] Mudança reflete no comportamento real do `/api/generate`

**Evidência esperada**
- Página de catálogo conectada ao BE-S2-04

---

### FE-S2-04 — Tela de instalação GTM (MUST)
**Story origem:** S2-D1

**Descrição**
Exibir snippet pronto e instruções de instalação para a plataforma da loja.

**Checklist técnico**
- [ ] Bloco de snippet com botão copiar
- [ ] Passo-a-passo curto para GTM (Custom HTML)
- [ ] Variação por plataforma (MVP: VTEX)

**DoD**
- [ ] Lojista copia snippet válido com 1 clique
- [ ] Conteúdo condizente com dados da loja

**Evidência esperada**
- Página de instalação conectada ao BE-S2-05

---

### FE-S2-05 — Billing no painel da loja (MUST)
**Story origem:** S2-E1

**Descrição**
Criar visão de plano/faturas para gestão de pagamentos.

**Checklist técnico**
- [ ] Lista de faturas com status e vencimento
- [ ] Detalhe da fatura
- [ ] CTA “Pagar” para `payment_url`
- [ ] Destaque visual para atraso

**DoD**
- [ ] Lojista visualiza e navega no histórico financeiro
- [ ] Fluxo de saída para pagamento funcionando

**Evidência esperada**
- Página billing conectada ao BE-S2-06

---

## 2.4 Tarefas para `test-engineer`

### QA-S2-01 — Plano de testes e gate de release Sprint 2 (MUST)
**Story origem:** todas as S2-*

**Descrição**
Validar fluxo ponta a ponta multi-tenant com foco em isolamento, segurança e operação sem SQL.

**Checklist técnico**
- [ ] Matriz de cenários por role (`super_admin`, `store_owner`, `store_manager`)
- [ ] Testes de isolamento cross-tenant
- [ ] Testes de credencial VTEX válida/inválida
- [ ] Testes de SKU enabled/disabled no `/api/generate`
- [ ] Testes de snippet GTM e billing

**DoD**
- [ ] 0 falhas críticas de segurança e isolamento
- [ ] Gates de Sprint 2 validados

**Evidência esperada**
- Relatório de testes com casos aprovados/reprovados
- Lista de bloqueadores e severidade

---

## Gates não-negociáveis do Sprint 2

### Gate de operação
- [ ] Onboarding de loja 100% via UI (sem SQL)
- [ ] Configuração VTEX por loja funcional
- [ ] Catálogo elegível com toggle por SKU funcional

### Gate técnico
- [ ] `/api/generate` bloqueia SKU não elegível
- [ ] RBAC e isolamento multi-tenant comprovados
- [ ] Segredos sem exposição em logs e respostas

### Gate de negócio
- [ ] Snippet GTM disponível por loja
- [ ] Billing básico disponível com status e link de pagamento

---

## Recomendação de execução por agente

- **Best Agent (coordenação):** `project-planner`
- **Best Agent (núcleo técnico):** `backend-specialist`
- **Best Agent (experiência administrativa):** `frontend-specialist`
- **Best Agent (gate de release):** `test-engineer`
- **Best Skill transversal:** `plan-writing`
