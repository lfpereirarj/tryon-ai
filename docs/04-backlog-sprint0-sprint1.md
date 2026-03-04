# Backlog de Produto — Sprint 0 e Sprint 1

## Contexto
Este backlog deriva do PRD e do plano de execução em [docs/03-mvp-execucao-zero-custo.md](docs/03-mvp-execucao-zero-custo.md), mantendo:

- MVP VTEX-first
- arquitetura agnóstica de plataforma
- custo fixo inicial zero (exceto IA)

---

## Objetivo dos Sprints

- **Sprint 0 (1 semana):** criar base técnica segura e extensível para evitar retrabalho.
- **Sprint 1 (2 semanas):** entregar fluxo completo de try-on + tracking essencial para medir valor.

---

## MoSCoW (resumo)

### MUST (obrigatório para MVP começar piloto)
- Contratos estáveis de integração
- Camada de adaptadores (VTEX)
- Endpoint de geração endurecido (validação, CORS allowlist, rate limit, erro seguro)
- Consentimento LGPD e retenção de 24h
- Fluxo de try-on funcional fim a fim
- Tracking dos eventos principais de funil

### SHOULD
- Dashboard inicial com métricas operacionais e de negócio
- Retry controlado para falhas transitórias da IA

### COULD
- Ferramenta interna de reprocessamento manual
- Export CSV de sessões/eventos

### WON’T (MVP)
- Multi-touch attribution
- Avatar 3D, vídeo try-on
- App VTEX IO
- Multi-plataforma ativa (além de VTEX)

---

## Sprint 0 — Fundação (1 semana)

## Epic A — Contratos e arquitetura agnóstica

### Story S0-A1 (MUST)
**Como** equipe de produto e engenharia, **quero** contratos de dados canônicos (widget, backend e tracking), **para** evitar acoplamento em VTEX e acelerar suporte a novas plataformas.

**Acceptance Criteria (Gherkin)**
- **Given** um payload de geração vindo do widget
  **When** o backend receber a requisição
  **Then** os campos obrigatórios do contrato `TryOnGenerationRequest` devem ser validados
- **Given** um contexto de PDP
  **When** o widget montar o `StorefrontContext`
  **Then** o formato deve seguir o contrato comum independente da plataforma
- **Given** um evento de analytics
  **When** ele for enviado
  **Then** deve seguir o contrato `TrackingEvent` com `eventName`, `storeId`, `sessionId`, `skuId` e `timestamp`

**Entregáveis**
- Documento de contrato versionado (`v1`) no repositório
- Exemplos de payload válidos e inválidos

---

### Story S0-A2 (MUST)
**Como** time de engenharia, **quero** uma camada `PlatformAdapter` com implementação `VtexAdapter`, **para** encapsular dependências da VTEX fora do domínio de negócio.

**Acceptance Criteria (Gherkin)**
- **Given** o runtime do widget em uma PDP VTEX
  **When** o adaptador for executado
  **Then** ele deve retornar `skuId`, `productId`, `productImageUrl` e metadados no formato do contrato comum
- **Given** a ausência de dados obrigatórios na PDP
  **When** o adaptador falhar
  **Then** o widget deve exibir estado de erro controlado sem quebrar a página
- **Given** o núcleo de negócio de try-on
  **When** dados de plataforma forem consumidos
  **Then** nenhum acesso direto a objeto/API VTEX deve existir fora do `VtexAdapter`

**Entregáveis**
- Interface `PlatformAdapter`
- `VtexAdapter` funcional
- Teste de contrato do adaptador

---

## Epic B — Segurança mínima de produção para MVP

### Story S0-B1 (MUST)
**Como** plataforma SaaS, **quero** proteger o endpoint de geração, **para** reduzir risco de abuso, vazamento e custos indevidos de IA.

**Acceptance Criteria (Gherkin)**
- **Given** uma requisição sem `storeApiKey` válida
  **When** chamar `/api/generate`
  **Then** a API deve retornar 401/403 sem executar geração
- **Given** uma origem não autorizada
  **When** chamar `/api/generate`
  **Then** a requisição deve ser bloqueada por política CORS de allowlist
- **Given** payload com arquivo inválido (tipo/tamanho)
  **When** chamar `/api/generate`
  **Then** a API deve responder 400 com mensagem genérica
- **Given** um erro interno
  **When** a API falhar
  **Then** a resposta não deve expor detalhes internos sensíveis
- **Given** excesso de chamadas por loja
  **When** o limite for atingido
  **Then** a API deve responder 429

**Entregáveis**
- Política CORS por domínio da loja
- Validação de payload
- Rate limit por `storeApiKey`
- Política de erro seguro

---

## Epic C — Privacidade e retenção

### Story S0-C1 (MUST)
**Como** usuário final, **quero** consentir explicitamente o uso da minha foto, **para** ter transparência e controle sobre meus dados.

**Acceptance Criteria (Gherkin)**
- **Given** o usuário acessando o widget pela primeira vez
  **When** iniciar upload
  **Then** deve ver e aceitar termo curto de consentimento antes de enviar imagem
- **Given** o usuário não aceitar o consentimento
  **When** tentar prosseguir
  **Then** o upload não deve iniciar

---

### Story S0-C2 (MUST)
**Como** operação do produto, **quero** retenção de imagens por no máximo 24h, **para** cumprir política de privacidade do MVP.

**Acceptance Criteria (Gherkin)**
- **Given** uma imagem enviada com sucesso
  **When** 24 horas se passarem
  **Then** a imagem original deve ser removida automaticamente
- **Given** uma solicitação manual de remoção
  **When** acionada
  **Then** a imagem deve ser deletada antes da expiração

---

## Sprint 1 — Fluxo de valor (2 semanas)

## Epic D — Jornada do usuário final

### Story S1-D1 (MUST)
**Como** comprador em uma PDP VTEX, **quero** abrir o provador virtual e enviar minha foto, **para** ver como a roupa ficaria no meu corpo.

**Acceptance Criteria (Gherkin)**
- **Given** uma PDP com SKU elegível
  **When** a página carregar
  **Then** o botão “Experimentar com IA” deve estar visível
- **Given** imagem válida e consentimento aceito
  **When** o usuário clicar em gerar
  **Then** o resultado deve ser exibido em até 6s (meta p50)
- **Given** falha na geração
  **When** a IA não retornar imagem
  **Then** o usuário deve ver mensagem amigável com opção de tentar novamente

---

### Story S1-D2 (MUST)
**Como** comprador, **quero** adicionar ao carrinho após o try-on, **para** continuar a compra imediatamente.

**Acceptance Criteria (Gherkin)**
- **Given** geração concluída
  **When** o usuário clicar em “Adicionar ao carrinho”
  **Then** o SKU experimentado deve ser adicionado ao carrinho da plataforma
- **Given** erro de integração no carrinho
  **When** a ação falhar
  **Then** o widget deve exibir fallback com instrução clara ao usuário

---

## Epic E — Tracking e atribuição

### Story S1-E1 (MUST)
**Como** time de produto, **quero** rastrear eventos do funil, **para** medir uso, qualidade e impacto em conversão.

**Acceptance Criteria (Gherkin)**
- **Given** a jornada no widget
  **When** ocorrer cada etapa
  **Then** eventos `tryon_view`, `tryon_upload`, `tryon_generated`, `tryon_add_to_cart` devem ser registrados
- **Given** conclusão de pedido
  **When** o evento `order_completed` chegar
  **Then** ele deve ser associado à sessão quando houver identificadores compatíveis

---

### Story S1-E2 (MUST)
**Como** área de negócio, **quero** identificar pedidos influenciados, **para** calcular receita influenciada e futura cobrança.

**Acceptance Criteria (Gherkin)**
- **Given** um usuário que usou try-on em um SKU
  **When** ele comprar o mesmo SKU em até 24h no mesmo navegador/dispositivo
  **Then** o pedido deve ser classificado como `influenced_order`
- **Given** múltiplos try-ons no período
  **When** houver compra
  **Then** deve valer a regra de último SKU experimentado

---

## Epic F — Visibilidade operacional (Dashboard básico)

### Story S1-F1 (SHOULD)
**Como** lojista, **quero** um painel simples com métricas-chave, **para** acompanhar o valor gerado pelo provador.

**Acceptance Criteria (Gherkin)**
- **Given** uma loja autenticada
  **When** acessar o dashboard
  **Then** deve visualizar número de gerações, taxa de sucesso, latência média e receita influenciada
- **Given** período selecionado
  **When** trocar janela temporal
  **Then** os KPIs devem ser recalculados corretamente

---

## Dependências e riscos por sprint

### Sprint 0
- Dependência: definição final de campos de contrato
- Risco: atrasar validações e iniciar Sprint 1 sem hardening

### Sprint 1
- Dependência: evento `order_completed` disponível no fluxo VTEX
- Risco: atribuição parcial se checkout não enviar identificadores mínimos

---

## Métricas de sucesso por sprint

### Sprint 0 (gate para seguir)
- 100% dos endpoints críticos com validação de payload
- CORS sem `*` em ambiente de produção
- Política de erro seguro ativa
- Contratos v1 aprovados por produto + engenharia

### Sprint 1 (gate para piloto)
- Taxa de geração concluída >= 85%
- p50 de geração <= 6s
- 100% das jornadas com trilha mínima de eventos
- Cálculo de influenced order reproduzível em auditoria de amostra

---

## Handover para engenharia (resumo)

1. Executar Sprint 0 antes de expandir funcionalidades visíveis.
2. Só iniciar piloto após gates de segurança e tracking mínimos.
3. Tratar VTEX como adaptador, não como núcleo do produto.
4. Proteger meta de custo: sem novos serviços pagos além de IA no MVP.
