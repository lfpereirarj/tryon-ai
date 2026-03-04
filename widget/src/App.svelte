<svelte:options customElement={{
  tag: 'tryon-widget',
  props: {
    storeApiKey: { attribute: 'store-api-key', type: 'String' },
    apiUrl:      { attribute: 'api-url',       type: 'String' },
    platform:    { attribute: 'platform',      type: 'String' },
  },
}} />

<script>
  import { onMount } from 'svelte';
  import tailwindStyles from './tailwind.css?inline';
  import ConsentModal from './lib/ConsentModal.svelte';
  import { createVtexAdapter } from './lib/platform/vtex-adapter.js';
  import { createNullAdapter } from './lib/platform/adapter.js';
  import { getOrCreateSessionId } from './lib/session.js';
  import { validateStorefrontContext } from './lib/types.js';
  import { sendEvent } from './lib/track.js';

  const CONSENT_KEY = 'tryon_consent_given';

  let {
    storeApiKey = '',
    apiUrl = '',
    platform = 'vtex',
  } = $props();

  let step = $state('closed');
  let sessionId = $state('');
  /** @type {File|null} */
  let selectedFile = $state(null);
  /** @type {string|null} */
  let generatedImage = $state(null);
  /** @type {string|null} */
  let error = $state(null);
  /** @type {string|null} */
  let contextError = $state(null);
  /** @type {import('./lib/types.js').StorefrontContext|null} */
  let storefrontContext = $state(null);
  let showOriginal = $state(false);
  /** @type {string|null} */
  let cartError = $state(null);
  let cartLoading = $state(false);

  const resolvedApiUrl = $derived(apiUrl || (typeof window !== 'undefined' ? window.location.origin : ''));

  onMount(() => {
    sessionId = getOrCreateSessionId();
  });

  function getAdapter() {
    if (platform === 'vtex') return createVtexAdapter(storeApiKey);
    return createNullAdapter(platform);
  }

  async function openWidget() {
    if (!storeApiKey) {
      contextError = 'storeApiKey não configurado no widget.';
      step = 'upload';
      return;
    }

    step = 'upload';
    contextError = null;

    const adapter = getAdapter();
    const result = await adapter.getContext();

    if (result.error || !result.context) {
      contextError = result.error ?? 'Não foi possível ler o contexto do produto.';
      storefrontContext = null;
    } else {
      const validation = validateStorefrontContext({ ...result.context, storeApiKey });
      if (validation.error) {
        contextError = validation.error;
        storefrontContext = null;
      } else {
        storefrontContext = validation.context;

        // Verifica elegibilidade do SKU antes de liberar o upload
        try {
          const checkUrl = `${resolvedApiUrl}/api/public/sku-check?storeApiKey=${encodeURIComponent(storeApiKey)}&skuId=${encodeURIComponent(validation.context.skuId)}`;
          const checkRes = await fetch(checkUrl);
          if (checkRes.ok) {
            /** @type {{ eligible: boolean }} */
            const { eligible } = await checkRes.json();
            if (!eligible) {
              contextError = 'Este produto não está disponível para try-on.';
              storefrontContext = null;
            }
          }
        } catch {
          // fail-open: se o check falhar, deixa o usuário prosseguir
        }
      }
    }
  }

  function closeWidget() {
    step = 'closed';
    selectedFile = null;
    generatedImage = null;
    error = null;
    contextError = null;
    storefrontContext = null;
    showOriginal = false;
    cartError = null;
    cartLoading = false;
  }

  /** @param {Event} event */
  function handleFileChange(event) {
    const input = /** @type {HTMLInputElement} */ (event.target);
    const file = input.files?.[0] ?? null;
    if (file) {
      selectedFile = file;
      error = null;
      if (storefrontContext) {
        sendEvent({ apiUrl: resolvedApiUrl, storeApiKey, sessionId, skuId: storefrontContext.skuId, eventName: 'tryon_upload' });
      }
    }
  }

  function handleGenerateClick() {
    if (!selectedFile) return;

    const alreadyConsented = sessionStorage.getItem(CONSENT_KEY) === '1';
    if (alreadyConsented) {
      doGenerate();
    } else {
      step = 'consent';
    }
  }

  function handleConsentAccept() {
    sessionStorage.setItem(CONSENT_KEY, '1');
    doGenerate();
  }

  function handleConsentDecline() {
    step = 'upload';
  }

  async function doGenerate() {
    if (!selectedFile || !storefrontContext) return;

    step = 'generating';
    error = null;

    const formData = new FormData();
    formData.append('image', selectedFile);
    formData.append('storeApiKey', storefrontContext.storeApiKey);
    formData.append('sessionId', sessionId);
    formData.append('skuId', storefrontContext.skuId);
    if (storefrontContext.productImageUrl) {
      formData.append('productImageUrl', storefrontContext.productImageUrl);
    }

    try {
      const res = await fetch(`${resolvedApiUrl}/api/generate`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (res.ok && data.generatedImageBase64) {
        generatedImage = data.generatedImageBase64;
        step = 'result';
        showOriginal = false;
        sendEvent({ apiUrl: resolvedApiUrl, storeApiKey, sessionId, skuId: storefrontContext.skuId, eventName: 'tryon_generated' });
      } else {
        error = data.error ?? 'Erro ao processar a imagem.';
        step = 'upload';
      }
    } catch {
      error = 'Erro de conexão. Verifique sua internet e tente novamente.';
      step = 'upload';
    }
  }

  function handleTryAgain() {
    selectedFile = null;
    generatedImage = null;
    error = null;
    showOriginal = false;
    cartError = null;
    cartLoading = false;
    step = 'upload';
  }

  async function handleAddToCart() {
    if (!storefrontContext) return;
    cartError = null;
    cartLoading = true;
    const adapter = getAdapter();
    const result = await adapter.addToCart(storefrontContext.skuId);
    cartLoading = false;
    if (result.success) {
      sendEvent({ apiUrl: resolvedApiUrl, storeApiKey, sessionId, skuId: storefrontContext.skuId, eventName: 'tryon_add_to_cart' });
      cartError = null;
    } else {
      cartError = result.error ?? 'Não foi possível adicionar ao carrinho.';
    }
  }
</script>

{@html `<style>${tailwindStyles}</style>`}

{#if step === 'consent'}
  <ConsentModal onAccept={handleConsentAccept} onDecline={handleConsentDecline} />
{/if}

<button
  onclick={() => step === 'closed' ? openWidget() : closeWidget()}
  class="fixed bottom-5 right-5 px-4 py-3 bg-gray-900 text-white rounded-xl cursor-pointer z-[9999] border-none shadow-lg hover:bg-gray-700 transition-colors font-medium text-sm flex items-center gap-2"
  aria-label={step === 'closed' ? 'Abrir provador virtual' : 'Fechar provador virtual'}
>
  ✨ Experimentar
</button>

{#if step !== 'closed'}
  <div
    class="fixed bottom-20 right-5 w-[340px] bg-white border border-gray-100 rounded-2xl shadow-2xl z-[9999] flex flex-col overflow-hidden"
    role="region"
    aria-label="Provador virtual"
  >
    <div class="flex justify-between items-center px-5 pt-5 pb-3 border-b border-gray-100">
      <div>
        <h3 class="m-0 text-base font-bold text-gray-900">Provador Virtual</h3>
        {#if storefrontContext}
          <p class="text-xs text-gray-400 mt-0.5">SKU {storefrontContext.skuId}</p>
        {/if}
      </div>
      <button
        onclick={closeWidget}
        class="text-gray-400 hover:text-gray-700 bg-transparent border-none cursor-pointer text-lg leading-none p-1"
        aria-label="Fechar"
      >✕</button>
    </div>

    <div class="p-5 flex flex-col gap-4">
      {#if contextError}
        <div class="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
          <strong>Contexto indisponível:</strong> {contextError}
        </div>
      {/if}

      {#if step === 'result' && generatedImage}
        <div class="flex flex-col gap-3">
          <div class="relative">
            <img
              src={showOriginal ? (storefrontContext?.productImageUrl ?? generatedImage) : generatedImage}
              alt={showOriginal ? 'Imagem original do produto' : 'Resultado do provador virtual'}
              class="w-full rounded-xl border border-gray-100 shadow-sm object-cover transition-opacity duration-200"
            />
            <span class="absolute top-2 left-2 bg-black/60 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
              {showOriginal ? 'Produto' : 'Você'}
            </span>
          </div>

          <div class="grid grid-cols-2 gap-2">
            <button
              onclick={() => showOriginal = !showOriginal}
              class="py-2 bg-gray-100 text-gray-700 text-xs font-medium rounded-xl hover:bg-gray-200 transition-colors"
            >
              {showOriginal ? '← Ver resultado' : 'Comparar produto'}
            </button>
            <button
              onclick={handleTryAgain}
              class="py-2 bg-gray-100 text-gray-700 text-xs font-medium rounded-xl hover:bg-gray-200 transition-colors"
            >
              Outra foto
            </button>
          </div>

          {#if cartError}
            <p class="text-xs text-red-600 text-center m-0">{cartError}</p>
          {/if}

          <button
            onclick={handleAddToCart}
            disabled={cartLoading}
            class="w-full py-3 bg-gray-900 text-white font-semibold text-sm rounded-xl shadow-sm hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            {#if cartLoading}
              <span class="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              Adicionando...
            {:else}
              🛒 Adicionar ao carrinho
            {/if}
          </button>
        </div>

      {:else}
        <p class="text-sm text-gray-500 m-0">
          Envie uma foto sua para ver como o produto fica.
        </p>

        <input
          type="file"
          id="fileInput"
          accept="image/png, image/jpeg, image/webp"
          class="hidden"
          onchange={handleFileChange}
          disabled={step === 'generating'}
        />

        <label
          for="fileInput"
          class="h-36 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer {step === 'generating' ? 'opacity-50 pointer-events-none' : ''}"
        >
          {#if selectedFile}
            <div class="text-green-500 text-3xl mb-1">✓</div>
            <span class="text-sm font-semibold text-gray-800 truncate px-4 w-full text-center">{selectedFile.name}</span>
            <span class="text-xs text-gray-400 mt-0.5">Clique para trocar</span>
          {:else}
            <div class="text-3xl mb-1">📸</div>
            <span class="text-sm text-gray-600 font-medium">Clique para enviar foto</span>
            <span class="text-xs text-gray-400 mt-0.5">PNG, JPG ou WebP · até 5MB</span>
          {/if}
        </label>

        {#if error}
          <p class="text-xs text-red-600 text-center m-0">{error}</p>
        {/if}

        <button
          onclick={handleGenerateClick}
          disabled={!selectedFile || step === 'generating' || !!contextError}
          class="w-full py-3 bg-gray-900 text-white font-semibold text-sm rounded-xl shadow-sm hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          {#if step === 'generating'}
            <span class="flex items-center justify-center gap-2">
              <span class="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              Processando...
            </span>
          {:else}
            Gerar visualização
          {/if}
        </button>

        <p class="text-[10px] text-gray-400 text-center m-0 leading-relaxed">
          Imagem deletada em 24h · LGPD
        </p>
      {/if}
    </div>
  </div>
{/if}