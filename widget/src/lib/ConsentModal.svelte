<script>
  let { onAccept, onDecline } = $props();
</script>

<div class="fixed inset-0 bg-black/60 z-[10000] flex items-end sm:items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="consent-title">
  <div class="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6 flex flex-col gap-4">
    <div class="flex items-start gap-3">
      <span class="text-2xl" aria-hidden="true">🔒</span>
      <div>
        <h2 id="consent-title" class="text-base font-bold text-gray-900 leading-tight">
          Uso da sua foto
        </h2>
        <p class="text-xs text-gray-500 mt-0.5">Provador Virtual — TryOn AI</p>
      </div>
    </div>

    <p class="text-sm text-gray-700 leading-relaxed">
      Para gerar a visualização do produto, sua foto será enviada para processamento por inteligência artificial.
    </p>

    <ul class="text-xs text-gray-500 space-y-1 list-none p-0 m-0">
      <li class="flex items-center gap-2"><span class="text-green-500 font-bold">✓</span> Usada exclusivamente para gerar o resultado visual</li>
      <li class="flex items-center gap-2"><span class="text-green-500 font-bold">✓</span> Deletada automaticamente após 24 horas</li>
      <li class="flex items-center gap-2"><span class="text-green-500 font-bold">✓</span> Não compartilhada com terceiros</li>
    </ul>

    <p class="text-xs text-gray-400 leading-relaxed">
      Ao continuar, você consente com o tratamento da imagem conforme a <strong>LGPD (Lei 13.709/2018)</strong>.
    </p>

    <div class="flex flex-col gap-2 pt-1">
      <button
        onclick={onAccept}
        class="w-full py-3 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-700 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900"
      >
        Entendi e aceito
      </button>
      <button
        onclick={onDecline}
        class="w-full py-2 text-gray-500 text-xs hover:text-gray-700 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400 rounded"
      >
        Cancelar
      </button>
    </div>
  </div>
</div>
