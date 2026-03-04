# Plano de Execução do MVP — Zero Custo Inicial (exceto IA)

## 1) Objetivo deste documento
Traduzir o PRD do TryOn AI em um plano técnico de execução para desenvolvimento, mantendo:

- **Custo inicial zero** de infraestrutura (pagamento apenas do modelo de IA)
- **MVP com foco em VTEX**
- **Arquitetura agnóstica de plataforma** para escalar depois para Shopify, WooCommerce e outras

---

## 2) Princípios de produto e tecnologia

1. **Sem lock-in de plataforma de e-commerce**
   - VTEX é apenas o primeiro adaptador.
   - Domínio de negócio (try-on, tracking, billing) não depende de VTEX.

2. **Infra com free tier/hobby no MVP**
   - Sem custo fixo inicial em nuvem (dentro de limites gratuitos).
   - Custo variável principal: geração de imagem (IA).

3. **Monetização orientada a performance**
   - Mensalidade + revenue share sobre receita influenciada.
   - Métrica norte: receita influenciada.

4. **Privacidade e LGPD by design**
   - Consentimento explícito.
   - Expiração automática de imagem em 24h.
   - Sem uso para treinamento.

---

## 3) Arquitetura alvo (agnóstica)

## 3.1 Camadas

- **Widget Runtime (frontend embarcado)**
  - Script JS universal via CDN
  - Shadow DOM
  - Captura de contexto da PDP

- **Platform Adapter Layer**
  - Interface comum de e-commerce
  - Implementação inicial: `VtexAdapter`
  - Futuras: `ShopifyAdapter`, `WooAdapter`

- **API Core (SaaS backend)**
  - Endpoints REST para geração, tracking e admin
  - Autenticação por `store_api_key`
  - Rate limit por plano

- **TryOn Orchestrator**
  - Pipeline de geração
  - Validação, pré-processamento, auditoria de latência
  - Interface interna estável para provider de IA

- **AI Provider Abstraction**
  - Interface: `generateVirtualTryOn(userImage, productImage, options)`
  - Implementação inicial: Nano Banana 2 (Google)

- **Data & Storage**
  - Sessões, eventos, atribuição, billing
  - Storage temporário com TTL 24h

## 3.2 Contratos estáveis (para evitar lock-in)

### StorefrontContext (entrada do widget)

- `platform` (ex.: `vtex`)
- `storeId` (ID da loja no TryOn)
- `skuId`
- `productId`
- `productImageUrl`
- `currency`
- `price`

### TryOnGenerationRequest

- `storeApiKey`
- `sessionId`
- `skuId`
- `productImageUrl`
- `userImage`

### TrackingEvent

- `eventName` (`tryon_view`, `tryon_upload`, `tryon_generated`, `tryon_add_to_cart`, `order_completed`, `influenced_order`)
- `storeId`
- `sessionId`
- `skuId`
- `timestamp`
- `metadata`

---

## 4) Stack sugerida para custo inicial zero (MVP)

## 4.1 Desenvolvimento

- **Monorepo atual**: manter (`web` + `widget`)
- **Backend/API**: Next.js App Router (já existente)
- **Widget**: Svelte + Vite + Shadow DOM (já existente)

## 4.2 Produção (MVP)

- **Deploy API + dashboard**: Vercel Hobby (ou Cloudflare Pages/Workers free)
- **Banco**: Supabase Free
- **Storage temporário**: Supabase Storage Free *ou* Cloudflare R2 dentro do free tier
- **CDN do widget**: Cloudflare (free) ou jsDelivr/GitHub Releases
- **Fila assíncrona**: adiar para fase 2 (iniciar síncrono com timeout e retry controlado)

## 4.3 Custos

- **Obrigatório**: custo por chamada no modelo de IA
- **Meta de operação no MVP**: R$ 0 fixo/mês em infraestrutura (respeitando limites gratuitos)

---

## 5) Design técnico para VTEX-first sem acoplamento

## 5.1 MVP VTEX

- Captura SKU e contexto da PDP via adaptador VTEX
- Inserção por GTM/CMS
- Fluxo de try-on completo

## 5.2 Regra de ouro de arquitetura

Toda lógica de negócio usa dados do **contrato comum**.
Nunca acessar APIs/objetos VTEX fora do adaptador.

## 5.3 Padrão de extensibilidade

- `PlatformAdapter` (interface)
- `VtexAdapter` (implementação)
- `AdapterRegistry` seleciona adaptador por `platform`

---

## 6) Backlog de implementação (90 dias)

## Mês 1 — Núcleo funcional

### MUST

1. Widget universal com Shadow DOM
2. Integração VTEX (adapter)
3. Endpoint `/api/generate` com validação forte
4. Persistência de `tryon_sessions`
5. Exibição antes/depois no widget
6. Consentimento LGPD antes do upload

### Critérios de aceite

- Geração concluída em até 6s em p50 (meta inicial)
- Taxa de sucesso de geração >= 85% no piloto
- Imagem removida automaticamente em até 24h

## Mês 2 — Tracking e atribuição

### MUST

1. Instrumentação dos 6 eventos do PRD
2. Janela de atribuição de 24h (mesmo navegador + mesmo SKU)
3. Cálculo de `influenced_order`
4. Dashboard básico (gerações, conversão, receita influenciada)

### Critérios de aceite

- 100% das gerações com trilha mínima de eventos
- Reconciliação de pedidos influenciados com regra definida no PRD

## Mês 3 — Billing e operação

### MUST

1. Cálculo de cobrança: fixo + % influenciada
2. Limite por plano e bloqueio suave
3. Painel com valor estimado a pagar
4. Piloto com 2–3 lojas VTEX

### Critérios de aceite

- Fechamento mensal reproduzível por loja
- Divergência de cálculo < 2% em auditoria manual do piloto

---

## 7) Segurança e LGPD (MVP)

## Requisitos obrigatórios

1. Consentimento explícito antes do upload
2. Remoção automática em 24h
3. Não persistir imagem além da janela
4. Não retornar detalhes internos de erro para o cliente
5. Rate limit por `storeApiKey`
6. CORS por allowlist de domínios da loja (evitar `*` em produção)

---

## 8) Riscos e mitigação

1. **Latência da IA acima do alvo**
   - Mitigar com compressão de imagem, limites de upload, fila na fase 2

2. **Custo por geração alto**
   - Controle por plano, limite de tentativas e monitor de custo por loja

3. **Tracking incompleto no checkout**
   - Definir contrato mínimo de evento `order_completed` já no onboarding VTEX

4. **Discussão de atribuição**
   - Congelar regra simples no MVP (24h, último SKU, mesmo navegador)

---

## 9) KPIs para decisão de continuidade

## Produto

- Try-On Rate
- Geração concluída
- Latência média
- Add-to-cart pós try-on
- Uplift de conversão

## Negócio

- Receita influenciada
- % pedidos influenciados
- Ticket médio influenciado
- ROI estimado

## North Star

- **Receita influenciada pelo provador**

---

## 10) Definição de pronto (MVP Go/No-Go)

O MVP é considerado pronto quando:

1. 3 lojas VTEX ativas
2. >= 10% de uso do provador entre visitantes elegíveis
3. >= 10% de uplift de conversão em produtos com provador
4. Receita influenciada cobre custo de IA e gera margem positiva

---

## 11) Próximo passo recomendado (imediato)

Criar e executar um **Sprint 0 (1 semana)** com foco em base técnica:

1. Consolidar contratos (`StorefrontContext`, `TryOnGenerationRequest`, `TrackingEvent`)
2. Implementar camada `PlatformAdapter` + `VtexAdapter`
3. Endurecer segurança do `/api/generate` (validação, CORS allowlist, erro seguro, rate limit)
4. Definir tabela de atribuição e rotina de expiração 24h
5. Publicar versão `widget@0.1.0` via CDN para teste em loja VTEX sandbox
