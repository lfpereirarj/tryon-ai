# 📄 Documentação Técnica: TryOn AI (MVP)

## 1. Visão Geral da Solução

O **TryOn AI** é um SaaS de provador virtual agnóstico de plataforma, projetado para aumentar a conversão de e-commerces de moda. A solução utiliza o modelo de inteligência artificial **Gemini 3.1 Flash Image (Nano Banana 2)** para vestir peças de roupa em fotos enviadas pelos usuários em tempo real.

## 2. Arquitetura do Sistema

A aplicação segue uma estrutura de **Monorepo** dividida em duas frentes principais:

### 2.1 Widget Frontend (`/widget`)

* **Tecnologia:** Svelte 5 + Vite + Tailwind CSS v4.
* **Isolamento:** Utiliza **Shadow DOM** para garantir que o CSS da loja hospedeira não interfira no widget e vice-versa.
* **Método de Entrega:** Script JS único via CDN, injetável por Google Tag Manager (GTM).
* **Funcionalidade:** Captura de imagem do usuário, leitura de SKU da página e interface de feedback.

### 2.2 Backend & Dashboard (`/web`)

* **Framework:** Next.js 15 (App Router).
* **API:** Endpoints Serverless para processamento de imagens e tracking.
* **Banco de Dados:** Supabase (PostgreSQL) para gestão de lojistas, sessões e eventos.
* **Storage:** Cloudflare R2 (S3 Compatible) para armazenamento de fotos com custo zero de tráfego de saída (egress).

---

## 3. Fluxo de Dados (Pipeline de Geração)

1. **Upload:** O widget envia um `FormData` com a imagem original, `skuId` e `storeApiKey` para a API `/api/generate`.
2. **Persistência:** O backend salva a imagem bruta no Cloudflare R2 e gera uma URL pública temporária.
3. **Processamento IA:** A API chama o modelo `gemini-3.1-flash-image-preview` via método `generateContent`.
* **Prompt:** Instruções de fotorrealismo e preservação de identidade.
* **Input:** Imagem do usuário em base64.


4. **Registro:** A sessão é gravada no Supabase vinculada ao ID da loja através da `service_role` key.
5. **Resposta:** O backend retorna o base64 da imagem processada para exibição imediata no widget.

---

## 4. Stack Tecnológica (Resumo)

| Camada | Tecnologia | Motivo |
| --- | --- | --- |
| **IA Engine** | Gemini 3.1 Flash Image | Fotorrealismo e preservação de pose/fundo. |
| **Database** | Supabase | Escalabilidade e autenticação pronta. |
| **Storage** | Cloudflare R2 | Custo zero de banda para imagens pesadas. |
| **Frontend** | Svelte + Shadow DOM | Leveza e isolamento total em lojas externas. |

---

## 5. Segurança e Compliance

* **CORS:** Configurado globalmente no Next.js para permitir requisições apenas de origens autorizadas.
* **Secrets:** Uso estrito de chaves de backend (`SUPABASE_SERVICE_ROLE_KEY`) isoladas do cliente final.
* **Privacidade:** Imagens armazenadas com política de expiração automática e sem persistência de dados sensíveis do usuário.

---
