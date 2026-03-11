'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';

const PRODUCT = {
  name: 'Vestido Linho Oversized',
  brand: 'Studio Ela',
  sku: 'VLO-2024-ARN',
  price: 299,
  priceOld: 389,
  rating: 4.9,
  reviews: 47,
  description:
    'Vestido midi em linho premium com caimento oversized e fenda lateral. Perfeito para dias quentes — tecido respirável que mantém o frescor sem abrir mão do estilo.',
  colors: [
    { name: 'Areia', hex: '#c9b99a' },
    { name: 'Preto', hex: '#1a1a1a' },
    { name: 'Terracota', hex: '#c06b3a' },
  ],
  sizes: ['PP', 'P', 'M', 'G', 'GG'],
};

const RELATED = [
  { name: 'Blusa Oversized Linho', price: 189, color: '#141420' },
  { name: 'Calça Linho Wide Leg', price: 259, color: '#101010' },
  { name: 'Conjunto Alfaiataria', price: 459, color: '#141018' },
];

const REVIEWS = [
  {
    name: 'Camila R.',
    rating: 5,
    date: 'Fev 2026',
    text: 'Qualidade incrível. O caimento é perfeito e o tecido é muito mais premium do que esperava pelo preço. Comprei no M e ficou excelente.',
  },
  {
    name: 'Fernanda T.',
    rating: 5,
    date: 'Jan 2026',
    text: 'Usei o try-on antes de comprar e ficou exatamente igual ao resultado. Além disso, entrega rápida e embalagem impecável.',
  },
  {
    name: 'Beatriz M.',
    rating: 4,
    date: 'Jan 2026',
    text: 'Lindo! Só acho que o tom Areia na foto é um pouco mais claro do que na realidade, mas continua elegante.',
  },
];

type TryOnStep = 'idle' | 'open' | 'generating' | 'result';

export default function DemoPage() {
  const [activeImage, setActiveImage] = useState(0);
  const [activeColor, setActiveColor] = useState(0);
  const [activeSize, setActiveSize] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [tryonStep, setTryonStep] = useState<TryOnStep>('idle');
  const [photoName, setPhotoName] = useState<string | null>(null);
  const [addedToCart, setAddedToCart] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoName(file.name);
    }
  }

  function handleGenerate() {
    if (!photoName) return;
    setTryonStep('generating');
    // Simulate AI generation delay
    setTimeout(() => setTryonStep('result'), 3200);
  }

  function handleTryonClose() {
    setTryonStep('idle');
    setPhotoName(null);
    if (fileRef.current) fileRef.current.value = '';
  }

  const images = [
    { bg: '#14141e', label: 'Frente' },
    { bg: '#101820', label: 'Lateral' },
    { bg: '#181410', label: 'Costas' },
    { bg: '#101010', label: 'Detalhe' },
  ];

  const discount = Math.round(((PRODUCT.priceOld - PRODUCT.price) / PRODUCT.priceOld) * 100);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── NAV ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 h-14">
          <div className="flex items-center gap-6">
            <Link href="/" className="font-mono font-black text-base tracking-tight">
              TryOn<span className="text-primary">AI</span>
            </Link>
            <span className="font-mono text-[10px] text-muted-foreground border border-border px-2 py-0.5 hidden sm:block">
              DEMONSTRAÇÃO
            </span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-xs text-muted-foreground font-mono">
            <a href="#" className="hover:text-foreground transition-colors">Feminino</a>
            <a href="#" className="hover:text-foreground transition-colors">Masculino</a>
            <a href="#" className="hover:text-foreground transition-colors">Novidades</a>
            <a href="#" className="hover:text-foreground transition-colors">Sale</a>
          </nav>
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs text-muted-foreground hidden sm:block">🔍</span>
            <span className="font-mono text-xs text-muted-foreground hidden sm:block">♡</span>
            <span className="font-mono text-xs text-muted-foreground">🛒</span>
            <Link href="/login" className="bg-primary text-primary-foreground font-mono text-[10px] font-black px-3 py-1.5 hover:bg-primary/85 transition-colors ml-2 hidden sm:block">
              Dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* ── BREADCRUMB ──────────────────────────────────────── */}
        <nav className="font-mono text-[10px] text-muted-foreground mb-8 flex items-center gap-2">
          <a href="#" className="hover:text-foreground transition-colors">Início</a>
          <span>/</span>
          <a href="#" className="hover:text-foreground transition-colors">Feminino</a>
          <span>/</span>
          <a href="#" className="hover:text-foreground transition-colors">Vestidos</a>
          <span>/</span>
          <span className="text-foreground">{PRODUCT.name}</span>
        </nav>

        {/* ── PRODUCT LAYOUT ──────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 lg:gap-16 mb-20">
          {/* LEFT: Image gallery */}
          <div className="space-y-3">
            {/* Main image */}
            <div
              className="aspect-[3/4] border border-border relative overflow-hidden flex items-center justify-center"
              style={{ backgroundColor: images[activeImage].bg }}
            >
              <div className="absolute inset-0 flex items-center justify-center opacity-15">
                <span className="text-9xl">👗</span>
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <span className="font-mono text-[10px] text-muted-foreground bg-background/80 px-2 py-1">
                  {PRODUCT.name} · {PRODUCT.colors[activeColor].name}
                </span>
              </div>
              <span className="absolute top-3 left-3 bg-primary text-primary-foreground font-mono text-[10px] font-black px-2 py-0.5">
                −{discount}%
              </span>
            </div>
            {/* Thumbnails */}
            <div className="grid grid-cols-4 gap-2">
              {images.map((img, i) => (
                <button
                  key={i}
                  className={`aspect-square border transition-colors relative overflow-hidden ${
                    activeImage === i ? 'border-primary' : 'border-border hover:border-muted-foreground'
                  }`}
                  style={{ backgroundColor: img.bg }}
                  onClick={() => setActiveImage(i)}
                >
                  <div className="absolute inset-0 flex items-center justify-center opacity-15">
                    <span className="text-2xl">👗</span>
                  </div>
                  <span className="absolute bottom-1 left-1 font-mono text-[8px] text-muted-foreground">{img.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* RIGHT: Product info */}
          <div className="flex flex-col gap-5">
            <div>
              <p className="font-mono text-[10px] text-primary tracking-[0.2em] uppercase mb-1">{PRODUCT.brand}</p>
              <h1 className="text-3xl font-black tracking-tight mb-2">{PRODUCT.name}</h1>
              <div className="flex items-center gap-3">
                <div className="flex gap-px">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <span key={i} className={`text-sm ${i < Math.floor(PRODUCT.rating) ? 'text-primary' : 'text-muted'}`}>★</span>
                  ))}
                </div>
                <span className="font-mono text-xs text-muted-foreground">{PRODUCT.rating} ({PRODUCT.reviews} avaliações)</span>
              </div>
            </div>

            <div className="border-t border-border pt-5">
              <div className="flex items-end gap-3">
                <p className="text-3xl font-black">
                  R$ {PRODUCT.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-base text-muted-foreground line-through font-mono mb-0.5">
                  R$ {PRODUCT.priceOld.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <p className="font-mono text-[10px] text-muted-foreground mt-1">
                ou 3× de R$ {(PRODUCT.price / 3).toFixed(2).replace('.', ',')} sem juros
              </p>
            </div>

            {/* Color */}
            <div className="border-t border-border pt-5">
              <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-3">
                Cor: <span className="text-foreground">{PRODUCT.colors[activeColor].name}</span>
              </p>
              <div className="flex gap-2">
                {PRODUCT.colors.map((color, i) => (
                  <button
                    key={i}
                    className={`w-8 h-8 border-2 transition-all ${
                      activeColor === i ? 'border-primary scale-110' : 'border-transparent hover:border-muted-foreground'
                    }`}
                    style={{ backgroundColor: color.hex }}
                    title={color.name}
                    onClick={() => setActiveColor(i)}
                  />
                ))}
              </div>
            </div>

            {/* Size */}
            <div className="border-t border-border pt-5">
              <div className="flex items-center justify-between mb-3">
                <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
                  Tamanho: <span className="text-foreground">{activeSize ?? '—'}</span>
                </p>
                <a href="#" className="font-mono text-[10px] text-primary hover:underline">Guia de tamanhos</a>
              </div>
              <div className="flex gap-2 flex-wrap">
                {PRODUCT.sizes.map((size) => (
                  <button
                    key={size}
                    className={`w-12 h-10 font-mono text-xs font-semibold border transition-colors ${
                      activeSize === size
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border hover:border-foreground'
                    }`}
                    onClick={() => setActiveSize(size)}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {/* Quantity + Add to cart */}
            <div className="border-t border-border pt-5 space-y-3">
              <div className="flex items-center gap-3">
                <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">Qtd:</p>
                <div className="flex items-center border border-border">
                  <button
                    className="w-9 h-9 font-mono text-base hover:bg-card transition-colors"
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                  >−</button>
                  <span className="w-10 h-9 font-mono text-sm font-semibold flex items-center justify-center border-x border-border">{qty}</span>
                  <button
                    className="w-9 h-9 font-mono text-base hover:bg-card transition-colors"
                    onClick={() => setQty((q) => q + 1)}
                  >+</button>
                </div>
              </div>

              <button
                className="w-full bg-foreground text-background font-mono font-semibold text-sm py-4 hover:bg-foreground/85 transition-colors"
                onClick={() => setAddedToCart(true)}
              >
                {addedToCart ? '✓ Adicionado ao carrinho' : 'Adicionar ao carrinho'}
              </button>

              {/* TryOn CTA — hero button */}
              <button
                className="w-full bg-primary text-primary-foreground font-mono font-semibold text-sm py-4 hover:bg-primary/85 transition-colors flex items-center justify-center gap-2"
                onClick={() => setTryonStep('open')}
              >
                ✨ Experimentar TryOn
              </button>

              <p className="font-mono text-[10px] text-muted-foreground text-center">
                Veja como a peça fica em você antes de comprar · Resultado em ~3s · LGPD
              </p>
            </div>

            {/* SKU */}
            <p className="font-mono text-[10px] text-muted-foreground border-t border-border pt-4">
              SKU: {PRODUCT.sku} · Frete grátis acima de R$ 299
            </p>
          </div>
        </div>

        {/* ── DESCRIPTION ─────────────────────────────────────── */}
        <section className="border-t border-border py-12 max-w-2xl">
          <h2 className="font-mono font-black text-sm tracking-widest uppercase mb-4">Descrição</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">{PRODUCT.description}</p>
          <ul className="mt-4 space-y-1">
            {['100% Linho Premium', 'Caimento oversized', 'Fenda lateral', 'Lavagem à mão recomendada', 'Feito no Brasil'].map((item) => (
              <li key={item} className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                <span className="text-primary">·</span> {item}
              </li>
            ))}
          </ul>
        </section>

        {/* ── REVIEWS ─────────────────────────────────────────── */}
        <section className="border-t border-border py-12">
          <div className="flex items-center justify-between mb-8">
            <h2 className="font-mono font-black text-sm tracking-widest uppercase">
              Avaliações <span className="text-primary">({PRODUCT.reviews})</span>
            </h2>
            <div className="flex items-center gap-2">
              <div className="flex gap-px">
                {Array.from({ length: 5 }).map((_, i) => (
                  <span key={i} className="text-primary text-sm">★</span>
                ))}
              </div>
              <span className="font-mono text-sm font-black">{PRODUCT.rating}</span>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {REVIEWS.map((r) => (
              <div key={r.name} className="bg-card border border-border p-6">
                <div className="flex gap-px mb-3">
                  {Array.from({ length: r.rating }).map((_, i) => (
                    <span key={i} className="text-primary text-xs">★</span>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed mb-4">"{r.text}"</p>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] font-semibold">{r.name}</span>
                  <span className="font-mono text-[10px] text-muted-foreground">{r.date}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── RELATED PRODUCTS ────────────────────────────────── */}
        <section className="border-t border-border py-12">
          <h2 className="font-mono font-black text-sm tracking-widest uppercase mb-8">Você também pode gostar</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {RELATED.map((p) => (
              <div key={p.name} className="group cursor-pointer">
                <div
                  className="aspect-[3/4] border border-border mb-3 relative overflow-hidden flex items-center justify-center group-hover:border-muted-foreground transition-colors"
                  style={{ backgroundColor: p.color }}
                >
                  <span className="text-6xl opacity-15">👗</span>
                </div>
                <p className="font-mono text-xs font-semibold mb-1 group-hover:text-primary transition-colors">{p.name}</p>
                <p className="font-mono text-xs text-muted-foreground">
                  R$ {p.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* ── FOOTER ──────────────────────────────────────────── */}
      <footer className="border-t border-border bg-card">
        <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-center md:text-left">
            <p className="font-mono text-xs font-black">TryOn<span className="text-primary">AI</span> Demo Store</p>
            <p className="font-mono text-[10px] text-muted-foreground mt-1">Esta é uma loja de demonstração. Os produtos são fictícios.</p>
          </div>
          <Link href="/" className="font-mono text-xs text-primary hover:underline">
            ← Ver landing page do TryOn AI
          </Link>
        </div>
      </footer>

      {/* ── TRYON MODAL ─────────────────────────────────────── */}
      {tryonStep !== 'idle' && (
        <div className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center p-4">
          <div className="bg-background border border-border w-full max-w-sm relative">
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border">
              <div>
                <p className="font-mono text-xs font-black">
                  TryOn<span className="text-primary">AI</span> — Provador Virtual
                </p>
                {tryonStep === 'open' && (
                  <p className="font-mono text-[10px] text-muted-foreground mt-0.5">SKU {PRODUCT.sku}</p>
                )}
              </div>
              <button
                onClick={handleTryonClose}
                className="w-7 h-7 border border-border font-mono text-xs hover:bg-card transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-5">
              {/* STEP: UPLOAD */}
              {tryonStep === 'open' && (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Envie uma foto sua para ver como <strong className="text-foreground">{PRODUCT.name}</strong> fica em você.
                  </p>

                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    id="tryon-file"
                    onChange={handleFileChange}
                  />

                  <label
                    htmlFor="tryon-file"
                    className="flex flex-col items-center justify-center h-36 border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 transition-colors cursor-pointer"
                  >
                    {photoName ? (
                      <>
                        <span className="text-3xl mb-2">✓</span>
                        <span className="font-mono text-xs font-semibold text-foreground truncate px-4 w-full text-center">{photoName}</span>
                        <span className="font-mono text-[10px] text-muted-foreground mt-1">Clique para trocar</span>
                      </>
                    ) : (
                      <>
                        <span className="text-3xl mb-2">📸</span>
                        <span className="font-mono text-sm font-semibold">Clique para enviar foto</span>
                        <span className="font-mono text-[10px] text-muted-foreground mt-1">PNG, JPG ou WebP · até 5MB</span>
                      </>
                    )}
                  </label>

                  <button
                    className="w-full bg-primary text-primary-foreground font-mono font-semibold text-sm py-3 hover:bg-primary/85 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    disabled={!photoName}
                    onClick={handleGenerate}
                  >
                    Gerar visualização ✨
                  </button>

                  <p className="font-mono text-[10px] text-muted-foreground text-center leading-relaxed">
                    Imagem deletada em 24h · Consentimento LGPD incluído · Resultado em ~3s
                  </p>
                </div>
              )}

              {/* STEP: GENERATING */}
              {tryonStep === 'generating' && (
                <div className="flex flex-col items-center justify-center py-10 gap-4">
                  <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <p className="font-mono text-sm font-semibold">Processando com IA Gemini…</p>
                  <p className="font-mono text-[10px] text-muted-foreground text-center">
                    Vestindo {PRODUCT.name}<br />no seu corpo. Aguarde ~3s.
                  </p>
                  {/* Progress bar */}
                  <div className="w-full h-0.5 bg-border overflow-hidden">
                    <div className="h-full bg-primary animate-[loading_3.2s_ease-out_forwards]" style={{ width: '0%', animation: 'none', transition: 'width 3.2s ease-out', }} ref={(el) => { if (el) requestAnimationFrame(() => { el.style.width = '95%'; }); }} />
                  </div>
                </div>
              )}

              {/* STEP: RESULT */}
              {tryonStep === 'result' && (
                <div className="space-y-4">
                  <p className="font-mono text-[10px] text-primary font-semibold tracking-widest uppercase text-center">
                    ✓ Resultado gerado em 2.8s
                  </p>

                  {/* Before/After comparison */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="aspect-[3/4] bg-card border border-border flex flex-col items-center justify-center gap-2 relative overflow-hidden">
                      <span className="text-4xl opacity-30">🧍</span>
                      <div className="absolute bottom-0 left-0 right-0 bg-background/90 px-2 py-1.5 text-center">
                        <span className="font-mono text-[9px] text-muted-foreground uppercase tracking-widest">Sua Foto</span>
                      </div>
                    </div>
                    <div className="aspect-[3/4] border border-primary flex flex-col items-center justify-center gap-2 relative overflow-hidden" style={{ backgroundColor: '#10201a' }}>
                      <span className="text-4xl opacity-40">👗</span>
                      <div className="absolute inset-0 bg-primary/5" />
                      <div className="absolute top-2 right-2">
                        <span className="bg-primary text-primary-foreground font-mono text-[8px] font-black px-1.5 py-0.5">IA</span>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 bg-background/90 px-2 py-1.5 text-center">
                        <span className="font-mono text-[9px] text-primary uppercase tracking-widest font-bold">Resultado</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      className="py-2.5 border border-border font-mono text-xs hover:bg-card transition-colors"
                      onClick={() => { setTryonStep('open'); setPhotoName(null); if (fileRef.current) fileRef.current.value = ''; }}
                    >
                      Outra foto
                    </button>
                    <button
                      className="py-2.5 bg-foreground text-background font-mono text-xs font-semibold hover:bg-foreground/85 transition-colors"
                      onClick={() => { setAddedToCart(true); handleTryonClose(); }}
                    >
                      🛒 Comprar agora
                    </button>
                  </div>

                  <div className="bg-card border border-border p-3 text-center">
                    <p className="font-mono text-[10px] text-muted-foreground">
                      Esta é uma demonstração do{' '}
                      <Link href="/" className="text-primary hover:underline">TryOn AI</Link>
                      . Em produção, a IA usa a sua foto real.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
