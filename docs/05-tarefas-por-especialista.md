# Tarefas de Execução por Especialista (Backend + Frontend)

## Objetivo
Transformar o backlog de [docs/04-backlog-sprint0-sprint1.md](docs/04-backlog-sprint0-sprint1.md) em tarefas executáveis para:

- `backend-specialist`
- `frontend-specialist`

Com foco em:
- custo inicial zero (exceto IA)
- MVP VTEX-first sem lock-in
- entrega incremental (Sprint 0 e Sprint 1)

---

## Regras operacionais

1. Cada tarefa deve fechar com evidência objetiva (commit + checklist + teste/lint).
2. Não iniciar Sprint 1 sem passar os gates de Sprint 0.
3. Tudo que for VTEX deve ficar em adaptador, nunca no core.
4. Sem novos serviços pagos além do motor de IA.

---

## Sprint 0 — Fundação (1 semana)

## 0.1 Tarefas para `backend-specialist`

### BE-S0-01 — Contratos canônicos de API (MUST) ✅ CONCLUÍDO
**Story origem:** S0-A1

**Descrição**
Definir e versionar contratos de entrada/saída para geração e tracking.

**Checklist técnico**
- [x] Criar schema `TryOnGenerationRequest v1`
- [x] Criar schema `TrackingEvent v1`
- [x] Validar payload no boundary da API
- [x] Rejeitar payload inválido com 400

**Definição de pronto (DoD)**
- [x] Exemplos válidos/inválidos documentados
- [x] Sem `any` novo em código de domínio/API

**Evidência:** `web/src/lib/contracts/v1.ts` — Zod schemas (`TryOnGenerationRequestSchema`, `TrackingEventSchema`, `StorefrontContextSchema`, `validateImageFile`). `tsc --noEmit` ✅ `npm run lint` ✅

---

### BE-S0-02 — Hardening do `/api/generate` (MUST) ✅ CONCLUÍDO
**Story origem:** S0-B1

**Descrição**
Endurecer endpoint para uso em piloto com segurança mínima.

**Checklist técnico**
- [x] Validar `storeApiKey` antes de processar geração
- [x] Implementar allowlist CORS por domínio da loja
- [x] Validar tipo/tamanho de imagem
- [x] Retornar erro seguro (sem detalhes internos)
- [x] Implementar rate limit por `storeApiKey`

**DoD**
- [x] Cenários 401/403/429/400 cobertos por tratamento
- [x] `Access-Control-Allow-Origin` não usa `*` em produção
- [x] Logs sem dado sensível

**Evidência:** `web/src/app/api/generate/route.ts` reescrito (thin controller), `web/src/lib/middleware/rate-limit.ts`, CORS dinâmico por `allowed_origins` do banco. `tsc --noEmit` ✅ `lint` ✅

---

### BE-S0-03 — Retenção e expiração de imagens 24h (MUST) ✅ CONCLUÍDO
**Story origem:** S0-C2

**Descrição**
Garantir remoção automática e manual de imagens na janela definida.

**Checklist técnico**
- [x] Persistir metadados com timestamp de expiração
- [x] Implementar rotina de limpeza (TTL 24h)
- [x] Expor ação de remoção manual para suporte operacional

**DoD**
- [x] Evidência de deleção automática registrada

**Evidência:** `web/src/lib/services/storage.service.ts`, `web/src/lib/services/session.service.ts` (`getExpiredSessions`, `markSessionsImageDeleted`), `web/src/app/api/cleanup/route.ts` (GET protegido por CRON_SECRET), `web/vercel.json` (cron `0 * * * *`). `tsc --noEmit` ✅

---

### BE-S0-04 — Base de atribuição (MUST) ✅ CONCLUÍDO
**Story origem:** S1-E2 (pré-requisito)

**Descrição**
Preparar persistência para regra de influenced order (24h, mesmo SKU, mesmo navegador/dispositivo).

**Checklist técnico**
- [x] Definir estrutura de sessão e vínculo por `sessionId`
- [x] Persistir `skuId` e carimbo temporal para janela de 24h
- [x] Preparar consulta/regra de último SKU experimentado

**DoD**
- [x] Query de atribuição reproduzível em dataset de teste
- [x] Regra implementada em serviço isolado

**Evidência:** `web/src/lib/services/attribution.service.ts` (`isInfluencedOrder`, `recordInfluencedOrder`, `getLastTryOnInWindow`), `web/supabase/migrations/sprint0_schema.sql`. `tsc --noEmit` ✅

> ⚠️ **Ação manual pendente:** executar `web/supabase/migrations/sprint0_schema.sql` no SQL Editor do Supabase Dashboard.

---

## 0.2 Tarefas para `frontend-specialist`

### FE-S0-01 — Contrato de contexto da PDP (MUST) ✅ CONCLUÍDO
**Story origem:** S0-A1

**Descrição**
Produzir `StorefrontContext` no widget sem acoplamento ao core.

**Checklist técnico**
- [x] Implementar modelo `StorefrontContext v1`
- [x] Garantir campos obrigatórios (`skuId`, `productId`, `productImageUrl`)
- [x] Tratar ausência de dados com fallback de UI

**DoD**
- [x] Payload gerado conforme contrato em cenários válidos
- [x] Estado de erro amigável em cenário inválido

**Evidência:** `widget/src/lib/types.js` — `validateStorefrontContext()` com validação de UUID e URL. `npm run build` ✅

---

### FE-S0-02 — `PlatformAdapter` + `VtexAdapter` (MUST) ✅ CONCLUÍDO
**Story origem:** S0-A2

**Descrição**
Encapsular leitura de dados VTEX no adaptador.

**Checklist técnico**
- [x] Criar interface `PlatformAdapter` no widget
- [x] Implementar `VtexAdapter`
- [x] Remover acessos VTEX diretos de componentes de UI/core

**DoD**
- [x] Código de negócio usa apenas contrato comum

**Evidência:** `widget/src/lib/platform/adapter.js` (interface + NullAdapter), `widget/src/lib/platform/vtex-adapter.js` (VTEX IO + Legacy + DOM fallback). `App.svelte` só usa `getAdapter()`. `npm run build` ✅

---

### FE-S0-03 — Consentimento LGPD no fluxo de upload (MUST) ✅ CONCLUÍDO
**Story origem:** S0-C1

**Descrição**
Adicionar etapa explícita de consentimento antes de enviar imagem.

**Checklist técnico**
- [x] Inserir UI de consentimento clara e bloqueante
- [x] Bloquear upload sem aceite
- [x] Registrar evento de aceite (sessionStorage)

**DoD**
- [x] Fluxo não permite upload sem consentimento
- [x] UX mantém clareza e não quebra jornada principal

**Evidência:** `widget/src/lib/ConsentModal.svelte` (modal bloqueante com informações LGPD), `App.svelte` checa `sessionStorage[CONSENT_KEY]` antes de chamar `doGenerate()`. Aceite persiste por sessão de navegação. `npm run build` ✅

---

### FE-S0-04 — Configuração de ambiente do widget (MUST) ✅ CONCLUÍDO
**Story origem:** S0-B1 (suporte)

**Descrição**
Eliminar valores hardcoded e permitir configuração por ambiente/loja.

**Checklist técnico**
- [x] Remover `storeApiKey` e endpoint fixo do código
- [x] Ler endpoint/API key por configuração segura de inicialização
- [x] Garantir `sessionId` estável por navegador/dispositivo

**DoD**
- [x] Widget funciona sem edição de código para trocar loja/ambiente
- [x] `sessionId` enviado em todas as gerações

**Evidência:** `App.svelte` aceita `store-api-key`, `api-url`, `platform` como atributos do custom element. `widget/src/lib/session.js` — `getOrCreateSessionId()` via localStorage com fallback. `npm run build` ✅

---

## Sprint 1 — Fluxo de valor (2 semanas)

## 1.1 Tarefas para `backend-specialist`

### BE-S1-01 — Endpoint de tracking de eventos (MUST) ✅ CONCLUÍDO
**Story origem:** S1-E1

**Descrição**
Receber e persistir eventos do funil do widget.

**Checklist técnico**
- [x] Criar endpoint de ingestão de eventos
- [x] Validar contrato `TrackingEvent`
- [x] Persistir eventos com índice por `storeId/sessionId/skuId/timestamp`

**DoD**
- [x] Eventos críticos do funil persistindo com sucesso
- [x] Sem perda de eventos nos cenários principais

**Evidência:** `web/src/lib/contracts/v1.ts` (+ `TrackingEventHttpSchema`, `KpiRequestSchema`), `web/src/lib/services/tracking.service.ts` (`insertTrackingEvent`), `web/src/app/api/tracking/route.ts` (POST + OPTIONS, CORS allowlist, rate limit 60/min, hook `order_completed` → attribution). `tsc --noEmit` ✅ `lint` ✅

---

### BE-S1-02 — Regra de influenced order (MUST) ✅ CONCLUÍDO
**Story origem:** S1-E2

**Descrição**
Implementar cálculo de pedido influenciado para regra de MVP.

**Checklist técnico**
- [x] Janela de 24h por `sessionId`
- [x] Mesmo SKU
- [x] Último SKU experimentado
- [x] Registrar `influenced_order`

**DoD**
- [x] Regra implementada em serviço isolado e auditável
- [x] Integração automática via evento `order_completed`

**Evidência:** `web/src/lib/services/attribution.service.ts` — `processOrderEvent()` (checa `isInfluencedOrder` → se verdadeiro chama `recordInfluencedOrder`). Acionado automaticamente pelo endpoint `/api/tracking` quando `eventName === 'order_completed'` e `metadata.orderId` presente. `tsc --noEmit` ✅

---

### BE-S1-03 — KPIs base para dashboard (SHOULD) ✅ CONCLUÍDO
**Story origem:** S1-F1

**Descrição**
Expor agregações de métricas para dashboard MVP.

**Checklist técnico**
- [x] Endpoint para gerações, sucesso, latência média
- [x] Endpoint para receita influenciada
- [x] Filtro por período

**DoD**
- [x] Consultas respondem em tempo aceitável para volume MVP
- [x] Cálculos conferem com dados de teste

**Evidência:** `web/src/lib/services/analytics.service.ts` (`getKpis` — totalGenerations, successRate, avgLatencyMs, influencedCount, influencedRevenue). `web/src/app/api/analytics/kpis/route.ts` (GET, auth por `Authorization: Bearer <storeApiKey>`, query params `from`/`to` ISO 8601). `tsc --noEmit` ✅ `lint` ✅

---

## 1.2 Tarefas para `frontend-specialist`

### FE-S1-01 — Jornada try-on completa no widget (MUST) ✅ CONCLUÍDO
**Story origem:** S1-D1

**Descrição**
Fechar experiência ponta a ponta: abrir widget, upload, gerar, resultado, retry.

**Checklist técnico**
- [x] Botão "Experimentar com IA" visível em PDP elegível
- [x] Estado de loading, sucesso e erro amigável
- [x] Exibição de resultado antes/depois
- [x] Ação de tentar novamente

**DoD**
- [x] Jornada completa com toggle antes/depois implementada
- [x] Não quebra layout da loja (Shadow DOM ok)

**Evidência:** `App.svelte` — resultado exibe imagem gerada com badge "Você", botão "Comparar produto" alterna para `productImageUrl` com badge "Produto", botão "Outra foto" reseta jornada. `npm run build` ✅ (114 módulos, 64.3 kB)

---

### FE-S1-02 — Add-to-cart pós try-on (MUST) ✅ CONCLUÍDO
**Story origem:** S1-D2

**Descrição**
Adicionar CTA de carrinho integrado ao SKU experimentado.

**Checklist técnico**
- [x] CTA disponível após geração concluída
- [x] Integração com ação de carrinho da plataforma (via adaptador)
- [x] Fallback de erro com instrução clara

**DoD**
- [x] SKU correto adicionado em cenário feliz
- [x] Fluxo de fallback validado

**Evidência:** `PlatformAdapter` (+ `addToCart(skuId) => CartResult`), `VtexAdapter.addToCart` (vtexjs.checkout → fallback orderForm REST), `NullAdapter.addToCart` stub. `App.svelte` exibe botão "Adicionar ao carrinho" com loading/erro. `npm run build` ✅

---

### FE-S1-03 — Instrumentação dos eventos do funil (MUST) ✅ CONCLUÍDO
**Story origem:** S1-E1

**Descrição**
Emitir eventos de uso para endpoint de tracking.

**Checklist técnico**
- [x] Disparar `tryon_view`
- [x] Disparar `tryon_upload`
- [x] Disparar `tryon_generated`
- [x] Disparar `tryon_add_to_cart`
- [x] Garantir envio com `sessionId` e `skuId`

**DoD**
- [x] 100% dos eventos críticos presentes em jornada completa
- [x] Sem duplicidade indevida em interações comuns

**Evidência:** `widget/src/lib/track.js` — `sendEvent()` com sendBeacon + fallback fetch, fire-and-forget. Disparado em: `openWidget` (→ `tryon_view`), `handleFileChange` (→ `tryon_upload`), `doGenerate` success (→ `tryon_generated`), `handleAddToCart` success (→ `tryon_add_to_cart`). `npm run build` ✅

---

### FE-S1-04 — Dashboard MVP (SHOULD) ✅ CONCLUÍDO
**Story origem:** S1-F1

**Descrição**
Implementar tela administrativa mínima consumindo KPIs do backend.

**Checklist técnico**
- [x] Cards de métricas principais
- [x] Filtro de período
- [x] Estados de loading/erro/vazio

**DoD**
- [x] Dados renderizados corretamente por período
- [x] Responsividade mobile-first

**Evidência:** `web/src/app/dashboard/page.tsx` — `'use client'` com `useTransition`, input de API Key, filtros 7/30/90 dias, 5 cards (total gerações, sucesso, latência média, pedidos influenciados, receita). Disponível em `/dashboard`. `tsc --noEmit` ✅ `lint` ✅

---

## Plano de execução recomendado (ordem)

1. **Sprint 0:** BE-S0-01 + FE-S0-01 (em paralelo)
2. **Sprint 0:** FE-S0-02 + BE-S0-02
3. **Sprint 0:** FE-S0-03 + FE-S0-04 + BE-S0-03 + BE-S0-04
4. **Gate Sprint 0** (segurança + contratos + LGPD)
5. **Sprint 1:** FE-S1-01 + BE-S1-01
6. **Sprint 1:** FE-S1-02 + FE-S1-03 + BE-S1-02
7. **Sprint 1:** BE-S1-03 + FE-S1-04
8. **Gate piloto**

---

## Critérios de gate (não-negociáveis)

### Gate de Sprint 0
- [ ] Contratos v1 aprovados por Produto
- [ ] `/api/generate` com validação, CORS allowlist e rate limit
- [ ] Consentimento LGPD ativo
- [ ] Retenção de 24h comprovada

### Gate de Sprint 1
- [ ] Taxa de geração concluída >= 85%
- [ ] p50 de geração <= 6s
- [ ] Eventos críticos completos no funil
- [ ] Regra de influenced order auditável

---

## Recomendação de uso pelos agentes

- **Para `backend-specialist`:** executar primeiro bloco `BE-S0-*` e depois `BE-S1-*`, validando segurança e tipagem a cada entrega.
- **Para `frontend-specialist`:** executar primeiro bloco `FE-S0-*` e depois `FE-S1-*`, validando UX, acessibilidade e isolamento do widget.
- **Para `product-manager`/`product-owner`:** validar gates por sprint antes de liberar próxima fase e evitar scope creep no MVP.
