/**
 * installation.service.ts — Geração de snippet GTM por tenant
 *
 * Produz o payload de instalação (snippet HTML + metadados) para uma loja.
 * Sem chamadas externas — deriva tudo dos dados internos da loja.
 *
 * Plataformas (MVP): vtex
 * Ponto de extensão: adicionar novos templates em PLATFORM_TEMPLATES
 */
import { getStoreById } from '@/lib/services/store.service';

// ---------------------------------------------------------------------------
// Tipos públicos
// ---------------------------------------------------------------------------

export type InstallPlatform = 'vtex';

export interface SnippetStep {
  title: string;
  description: string;
  code: string;
  language: 'html' | 'javascript';
}

export interface InstallationPayload {
  storeId: string;
  storeName: string;
  platform: InstallPlatform;
  widgetScriptUrl: string;
  apiUrl: string;
  storeApiKey: string;
  steps: SnippetStep[];
  /** Snippet GTM completo (Custom HTML tag) para copiar com 1 clique */
  fullSnippet: string;
}

// ---------------------------------------------------------------------------
// URL do widget CDN (configurável via env)
// ---------------------------------------------------------------------------

const WIDGET_CDN =
  process.env.NEXT_PUBLIC_WIDGET_CDN_URL ??
  'https://cdn.tryon.ai/widget/tryon-widget.js';

// ---------------------------------------------------------------------------
// Templates por plataforma
// ---------------------------------------------------------------------------

function buildVtexSteps(
  apiKey: string,
  apiUrl: string,
  widgetCdn: string,
): SnippetStep[] {
  return [
    {
      title: '1. Carregar o script do widget (GTM → Custom HTML)',
      description:
        'Crie uma tag "Custom HTML" no GTM com disparo "All Pages" (ou DOM Ready). Cole o código abaixo.',
      language: 'html',
      code: `<!-- TryOn AI — Carregar widget (1 vez por página) -->
<script>
  (function() {
    if (document.querySelector('script[data-tryon-widget]')) return;
    var s = document.createElement('script');
    s.type = 'module';
    s.src = '${widgetCdn}';
    s.setAttribute('data-tryon-widget', '');
    document.head.appendChild(s);
  })();
</script>`,
    },
    {
      title: '2. Inserir o componente na PDP (GTM → Custom HTML)',
      description:
        'Crie uma segunda tag com disparo apenas nas páginas de produto (URL contains /p). O widget se auto-inicializa usando o contexto VTEX.',
      language: 'html',
      code: `<!-- TryOn AI — Componente try-on na PDP -->
<script>
  (function() {
    if (document.querySelector('tryon-widget')) return;
    var w = document.createElement('tryon-widget');
    w.setAttribute('store-api-key', '${apiKey}');
    w.setAttribute('api-url', '${apiUrl}');
    w.setAttribute('platform', 'vtex');
    // Insere após o botão "Adicionar ao carrinho"
    var btn = document.querySelector('.add-to-cart-button, [class*="add-to-cart"]');
    if (btn && btn.parentNode) {
      btn.parentNode.insertBefore(w, btn.nextSibling);
    } else {
      document.body.appendChild(w);
    }
  })();
</script>`,
    },
    {
      title: '3. (Opcional) Via template de loja — store-theme',
      description:
        'Se preferir sem GTM, cole o snippet diretamente no componente de PDP do seu store-theme VTEX IO.',
      language: 'html',
      code: `<!-- No arquivo .tsx/.jsx do seu componente de PDP -->
<tryon-widget
  store-api-key="${apiKey}"
  api-url="${apiUrl}"
  platform="vtex"
/>`,
    },
  ];
}

function buildFullSnippet(
  apiKey: string,
  apiUrl: string,
  widgetCdn: string,
): string {
  return `<!-- TryOn AI — Snippet completo para GTM Custom HTML -->
<script>
  (function() {
    // 1. Carrega o widget (uma vez por página)
    if (!document.querySelector('script[data-tryon-widget]')) {
      var s = document.createElement('script');
      s.type = 'module';
      s.src = '${widgetCdn}';
      s.setAttribute('data-tryon-widget', '');
      document.head.appendChild(s);
    }
    // 2. Injeta o componente na PDP
    if (!document.querySelector('tryon-widget')) {
      s = s || document.querySelector('script[data-tryon-widget]');
      function initWidget() {
        if (document.querySelector('tryon-widget')) return;
        var w = document.createElement('tryon-widget');
        w.setAttribute('store-api-key', '${apiKey}');
        w.setAttribute('api-url', '${apiUrl}');
        w.setAttribute('platform', 'vtex');
        var btn = document.querySelector('.add-to-cart-button, [class*="add-to-cart"]');
        if (btn && btn.parentNode) {
          btn.parentNode.insertBefore(w, btn.nextSibling);
        } else {
          document.body.appendChild(w);
        }
      }
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initWidget);
      } else {
        initWidget();
      }
    }
  })();
</script>`;
}

// ---------------------------------------------------------------------------
// Função principal
// ---------------------------------------------------------------------------

export async function getInstallationPayload(
  storeId: string,
  /** Origin da requisição, usado como fallback para api-url */
  requestOrigin: string,
): Promise<InstallationPayload> {
  const store = await getStoreById(storeId);
  if (!store) throw new Error(`Loja ${storeId} não encontrada.`);

  // api-url é a URL pública do Next.js (onde o /api/generate está)
  const apiUrl =
    (process.env.NEXT_PUBLIC_SITE_URL ?? requestOrigin).replace(/\/$/, '');

  const widgetCdn = WIDGET_CDN;

  const steps = buildVtexSteps(store.public_api_key, apiUrl, widgetCdn);
  const fullSnippet = buildFullSnippet(store.public_api_key, apiUrl, widgetCdn);

  return {
    storeId: store.id,
    storeName: store.name,
    platform: 'vtex',
    widgetScriptUrl: widgetCdn,
    apiUrl,
    storeApiKey: store.public_api_key,
    steps,
    fullSnippet,
  };
}
