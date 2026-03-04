# Sprint 2 — Admin Multi-tenant
> **Task:** PL-S2-01 — Plano de entrega e trilha de dependências  
> **Project type:** WEB (Next.js 16 App Router + Supabase + Tailwind v4)  
> **Docs de origem:** [PRD](docs/06-prd-admin-multitenant-sprint2.md) · [Backlog](docs/07-backlog-sprint2-admin-multitenant.md) · [Tarefas](docs/08-tarefas-sprint2-por-especialista.md)

---

## Success Criteria

| Critério | Verificável |
|---|---|
| Nenhum onboarding de loja via SQL | Fluxo de criação de loja via UI funcional |
| RBAC ativo por tenant | Teste cross-tenant retorna 403 |
| SKU inelegível bloqueado | `/api/generate` retorna 403 para SKU desabilitado |
| Snippet GTM disponível | Snippet correto para loja configurada |
| Billing básico visível | Faturas listadas com status e link |

---

## Tech Stack

| Camada | Tecnologia | Observação |
|---|---|---|
| Backend | Next.js 16 App Router | Já em uso — padrão atual |
| Auth | Supabase Auth | Free tier; adicionar sessão de dashboard |
| Banco | Supabase PostgreSQL | 4 novas tabelas via migration SQL |
| Criptografia | AES-256 / `node:crypto` | Sem dependência nova; segredos de integração |
| VTEX Client | Fetch nativo | Chamadas REST VTEX Management APIs |
| Frontend | React 19 + Tailwind v4 | Já em uso — padrão atual |
| ORM | Supabase JS SDK | Já em uso |

---

## File Structure (novo código Sprint 2)

```
web/
  supabase/
    migrations/
      sprint2_admin_schema.sql         ← tabelas store_users, store_integrations, store_products, billing_invoices

  src/
    lib/
      auth/
        session.ts                     ← leitura de sessão e user do Supabase Auth
        rbac.ts                        ← utilitários de role: requireRole(), getTenantId()
      clients/
        vtex.ts                        ← VtexManagementClient(account, appKey, appToken)
        crypto.ts                      ← encryptSecret() / decryptSecret()
      services/
        store.service.ts               ← createStore(), updateStore(), getStoreById()
        store-users.service.ts         ← linkUser(), getUserRole()
        integration.service.ts         ← saveIntegration(), testVtexConnection()
        catalog.service.ts             ← syncProducts(), toggleSku(), isSkuEligible()
        snippet.service.ts             ← generateSnippet(storeId)
        billing.service.ts             ← listInvoices(), getInvoice()
      contracts/
        v1.ts                          ← (existente — sem breaking change)
        admin.ts                       ← Zod schemas de admin: CreateStoreSchema, etc.

    app/
      api/
        admin/
          stores/
            route.ts                   ← GET/POST (super_admin)
            [id]/
              route.ts                 ← GET/PATCH/DELETE (super_admin)
              users/
                route.ts               ← GET/POST (super_admin)
        store/
          integration/
            route.ts                   ← GET/POST (store_owner)
            test-connection/
              route.ts                 ← POST (store_owner)
          products/
            route.ts                   ← GET/POST (store_owner)
            [skuId]/
              route.ts                 ← PATCH toggle enabled (store_owner)
            sync/
              route.ts                 ← POST sync de catálogo VTEX (store_owner)
          installation/
            route.ts                   ← GET snippet (store_owner)
          billing/
            route.ts                   ← GET faturas (store_owner)
            [invoiceId]/
              route.ts                 ← GET detalhe (store_owner)
        generate/
          route.ts                     ← (existente — adicionar guard isSkuEligible)

      dashboard/
        admin/
          page.tsx                     ← listagem de lojas (super_admin)
          stores/
            new/
              page.tsx                 ← criar loja
            [id]/
              page.tsx                 ← editar/suspender loja
        store/
          integration/
            page.tsx                   ← configurar VTEX
          products/
            page.tsx                   ← catálogo elegível
          installation/
            page.tsx                   ← snippet GTM
          billing/
            page.tsx                   ← faturas
```

---

## Dependency Graph

```
BE-S2-01 (RBAC + schema)
  └── BE-S2-02 (CRUD lojas)
  │    └── FE-S2-01 (UI Super Admin) ← depende de BE-S2-02
  │
  └── BE-S2-03 (Integração VTEX)
       └── FE-S2-02 (UI Config VTEX) ← depende de BE-S2-03
       └── BE-S2-04 (Catálogo + SKU allowlist)
            └── FE-S2-03 (UI Catálogo) ← depende de BE-S2-04
            └── BE-S2-05 (Snippet GTM)
            │    └── FE-S2-04 (UI Instalação) ← depende de BE-S2-05
            └── BE-S2-06 (Billing)
                 └── FE-S2-05 (UI Billing) ← depende de BE-S2-06

QA-S2-01 ← depende de TODOS os itens acima
```

**Bloqueadores críticos:**
- `BE-S2-01` bloqueia **tudo** — sem RBAC nada pode ser entregue
- `BE-S2-03` bloqueia catálogo, snippet e qualquer validação de credencial
- `BE-S2-04` bloqueia o guardrail do `/api/generate`

---

## Milestones por Semana

### W1 — Fundação (dias 1–5)
**Objetivo:** Base de auth + RBAC + CRUD de lojas funcional end-to-end.

| ID | Tarefa | Responsável | Depende de |
|---|---|---|---|
| BE-S2-01 | RBAC + schema multi-tenant | backend-specialist | — |
| BE-S2-02 | CRUD lojas (Super Admin) | backend-specialist | BE-S2-01 |
| FE-S2-01 | UI Super Admin | frontend-specialist | BE-S2-02 |

**Gate W1:**
- [ ] Supabase Auth habilitado no dashboard
- [ ] `store_users` com roles funcionando
- [ ] Super Admin cria/edita/suspende loja via UI
- [ ] `/api/generate` bloqueia loja `suspended`
- [ ] `npx tsc --noEmit` ✅

---

### W2 — Integração VTEX (dias 6–10)
**Objetivo:** Loja configura credenciais VTEX e testa conexão.

| ID | Tarefa | Responsável | Depende de |
|---|---|---|---|
| BE-S2-03 | Integração VTEX por loja | backend-specialist | BE-S2-01 |
| FE-S2-02 | UI Config VTEX | frontend-specialist | BE-S2-03 |

**Gate W2:**
- [ ] Credencial válida: `test-connection` retorna sucesso
- [ ] Credencial inválida: erro amigável sem leak de token
- [ ] `appToken` visível apenas mascarado na UI
- [ ] Log sem vazamento de segredo

---

### W3 — Catálogo + Guardrail + GTM (dias 11–17)
**Objetivo:** Loja controla SKUs elegíveis e tem snippet pronto para GTM.

| ID | Tarefa | Responsável | Depende de |
|---|---|---|---|
| BE-S2-04 | Catálogo + allowlist SKU | backend-specialist | BE-S2-03 |
| FE-S2-03 | UI Catálogo | frontend-specialist | BE-S2-04 |
| BE-S2-05 | API Snippet GTM | backend-specialist | BE-S2-01 |
| FE-S2-04 | UI Instalação GTM | frontend-specialist | BE-S2-05 |

**Gate W3:**
- [ ] SKU habilitado: `/api/generate` aceita e processa
- [ ] SKU desabilitado: `/api/generate` retorna `403`
- [ ] Snippet gerado contém `store-api-key`, `api-url`, `platform` corretos
- [ ] Botão "copiar" funcional

---

### W4 — Billing + QA + Hardening (dias 18–22)
**Objetivo:** Billing básico visível, regressão completa, gates do sprint fechados.

| ID | Tarefa | Responsável | Depende de |
|---|---|---|---|
| BE-S2-06 | Billing básico | backend-specialist | BE-S2-01 |
| FE-S2-05 | UI Billing | frontend-specialist | BE-S2-06 |
| QA-S2-01 | Regressão + gate de release | test-engineer | todos acima |

**Gate W4 (Sprint 2 Go/No-Go):**
- [ ] Onboarding 100% via UI (sem SQL)
- [ ] RBAC e isolamento cross-tenant comprovados
- [ ] SKU guardrail funcional
- [ ] Snippet GTM correto por loja
- [ ] Faturas visíveis com link de pagamento
- [ ] 0 falhas críticas de segurança/isolamento no relatório QA
- [ ] `npx tsc --noEmit` ✅ `npm run lint` ✅ `npm run build` ✅

---

## Plano de Rollback por Lote Crítico

| Lote | Risco | Rollback |
|---|---|---|
| W1 — BE-S2-01 | RBAC quebra acesso existente | Feature flag; reverter migration se necessário; todas as rotas existentes continuam funcionando sem guard até opt-in |
| W1 — BE-S2-02 | Bug em geração de `storeApiKey` | Validar unicidade antes de persistir; nunca reusar; rollback = delete + recriar manualmente |
| W2 — BE-S2-03 | Criptografia de segredo com bug | Não migrar segredos existentes; novo campo `encrypted_token`; plain token removido só após validação |
| W3 — BE-S2-04 | Guard no `/api/generate` bloqueia produção | Guard ativo apenas para lojas com `product_allowlist_enabled = true`; lojas existentes sem allowlist continuam funcionando |
| W4 — QA-S2-01 | Gate não passa | Bloquear release e abrir issues prioritários antes de colocar em produção |

---

## Quadro de Responsabilidades

| Especialista | Tarefas | Semanas |
|---|---|---|
| `backend-specialist` | BE-S2-01, BE-S2-02, BE-S2-03, BE-S2-04, BE-S2-05, BE-S2-06 | W1, W2, W3, W4 |
| `frontend-specialist` | FE-S2-01, FE-S2-02, FE-S2-03, FE-S2-04, FE-S2-05 | W1, W2, W3, W4 |
| `test-engineer` | QA-S2-01 | W4 |
| `project-planner` | PL-S2-01 ✅ | W1 |

---

## Critérios de Handoff entre Especialistas

| De → Para | Condição de handoff |
|---|---|
| BE-S2-01 → FE-S2-01 | Endpoint `POST /api/admin/stores` retorna 201 com `storeApiKey` |
| BE-S2-02 → FE-S2-02 | Endpoint `POST /api/store/integration` retorna 200/400 conforme credencial |
| BE-S2-03 → FE-S2-03 | Endpoint `GET /api/store/products` retorna lista paginada |
| BE-S2-04 → FE-S2-04 | Endpoint `GET /api/store/installation` retorna snippet string |
| BE-S2-05 → FE-S2-05 | Endpoint `GET /api/store/billing` retorna array de faturas |
| BE+FE todo → QA-S2-01 | Todos os endpoints ativos, deploy de staging disponível |

---

## Decisões de Implementação Fechadas

| Decisão | Escolha | Motivo |
|---|---|---|
| Auth do dashboard | Supabase Auth (email/password) | Já na stack, free tier, sem nova dependência |
| Criptografia de segredos | `node:crypto` AES-256-GCM | Sem biblioteca externa; chave como env var |
| VTEX API usada para catálogo | `/api/catalog_system/pvt/products/search` | API pública VTEX Legacy, sem app store necessária |
| Guard no `/api/generate` | `isSkuEligible(storeId, skuId)` | Flag `product_allowlist_enabled` na loja; default `false` para não quebrar lojas existentes |
| Billing provider | Mock MVP (link externo manual) | Sem Stripe/Pagar.me no Sprint 2; `payment_url` como campo livre |

---

## Dependências Externas (Confirmar Antes de W2)

- [ ] Credenciais VTEX de sandbox para testes de `test-connection`
- [ ] Definição de planos e preços (para seed de `billing_invoices`)
- [ ] Definição de `payment_url` de cada fatura (qual provider ou link manual)
- [ ] Confirmar URL de produção da API para snippet GTM

---

## Phase X — Verification Checklist

> Executar ao final de cada semana e obrigatoriamente antes do Go/No-Go de Sprint 2.

```bash
cd /home/lfper/developer/study/tryon-ai/web

# P0 — Tipos
npx tsc --noEmit

# P0 — Lint
npm run lint

# P0 — Build
npm run build

# P1 — Segurança (manual)
# - Confirmar que nenhum log imprime appToken
# - Confirmar que respostas de API não retornam appToken em plain text
# - Confirmar que `store_id` é sempre filtrado em queries multi-tenant
```

| Check | Status |
|---|---|
| `tsc --noEmit` | ⏳ |
| `npm run lint` | ⏳ |
| `npm run build` | ⏳ |
| RBAC cross-tenant validado | ⏳ |
| Nenhum segredo em log/resposta | ⏳ |
| SKU guard funcional | ⏳ |
| Snippet GTM correto | ⏳ |
| Billing visível | ⏳ |
| Gate QA aprovado | ⏳ |

---

_PL-S2-01 ✅ — Plano criado em 03/03/2026._
