import Link from 'next/link';
import FAQAccordion from '@/components/faq-accordion';

const STEPS = [
  {
    title: 'Instale via Google Tag Manager',
    desc: 'Copie um snippet de uma linha. Cole no GTM da sua loja. Nenhum desenvolvedor necessário — funciona em qualquer VTEX.',
  },
  {
    title: 'Widget aparece em cada produto',
    desc: 'Um botão "✨ Experimentar" surge automaticamente em todas as PDPs. Totalmente isolado do CSS da sua loja via Shadow DOM.',
  },
  {
    title: 'Cliente tira ou envia uma foto',
    desc: 'Interface nativa no próprio site, com consentimento LGPD integrado. A foto é processada em segundos pelo modelo Gemini.',
  },
  {
    title: 'IA veste a peça. Conversão sobe.',
    desc: 'Resultado chega em ~3 segundos. O cliente vê como a peça fica no próprio corpo — e clica em adicionar ao carrinho.',
  },
];

const PRICING = [
  {
    name: 'Starter',
    price: 'Grátis',
    sub: 'até 500 gerações / mês',
    features: [
      '500 try-ons por mês',
      'Widget para 1 loja VTEX',
      'Dashboard de analytics básico',
      'Suporte via e-mail',
      '1 integração de catálogo',
    ],
    cta: 'Começar grátis',
    highlight: false,
  },
  {
    name: 'Pro',
    price: 'R$ 297',
    sub: '/mês · cobrado mensalmente',
    features: [
      'Gerações ilimitadas',
      'Múltiplas lojas',
      'Analytics avançado + KPIs de receita atribuída',
      'Catálogo TryOn por SKU',
      'Instalação via GTM ou código',
      'Suporte prioritário · SLA garantido',
    ],
    cta: 'Iniciar 14 dias grátis',
    highlight: true,
  },
];

const TESTIMONIALS = [
  {
    name: 'Carla Mendes',
    role: 'Head de E-commerce · Studio Ela',
    text: 'A taxa de conversão na categoria feminino subiu 41% em 30 dias. Foi a mudança mais impactante que já fizemos na loja.',
  },
  {
    name: 'Rafael Torres',
    role: 'Diretor de Digital · ModeGroup',
    text: 'A integração levou menos de 10 minutos. Hoje qualquer peça do catálogo pode ser experimentada virtualmente.',
  },
  {
    name: 'Ana Souza',
    role: 'CEO · Veste Bem',
    text: 'Reduzimos 28% nas devoluções por tamanho. O cliente escolhe com muito mais confiança quando pode ver como fica.',
  },
];

const HERO_CARDS = [
  { label: 'Vestido', sub: 'Linho Midi', badge: '+R$340', color: '#141420' },
  { label: 'Blusa', sub: 'Oversized', badge: null, color: '#141414' },
  { label: 'Jaqueta', sub: 'Couro', badge: '+14 fotos', color: '#101820' },
  { label: 'Calça', sub: 'Wide Leg', badge: null, color: '#101010' },
  { label: 'Saia', sub: 'Plissada', badge: null, color: '#181410' },
  { label: 'Conjunto', sub: 'Alfaiataria', badge: '+R$480', color: '#141018' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── NAV ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 h-16">
          <span className="font-mono font-black text-lg tracking-tight select-none">
            TryOn<span className="text-primary">AI</span>
          </span>
          <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground font-mono">
            <a href="#como-funciona" className="hover:text-foreground transition-colors">Como funciona</a>
            <a href="#precos" className="hover:text-foreground transition-colors">Preços</a>
            <Link href="/demo" className="hover:text-foreground transition-colors">Demo</Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login" className="font-mono text-sm text-muted-foreground hover:text-foreground transition-colors hidden sm:block">
              Entrar
            </Link>
            <Link href="/login" className="bg-primary text-primary-foreground font-mono text-xs font-semibold px-4 py-2 hover:bg-primary/85 transition-colors">
              Começar grátis
            </Link>
          </div>
        </div>
      </header>

      {/* ── HERO ────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-28">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-12 md:gap-16 items-start">
          {/* Left 3/5 */}
          <div className="md:col-span-3">
            <p className="font-mono text-[10px] tracking-[0.3em] text-primary mb-7 uppercase">
              Provador Virtual com IA · VTEX
            </p>
            <h1 className="text-5xl md:text-[3.75rem] font-black leading-[1.02] mb-8 tracking-tight">
              O cliente<br />experimenta.<br />
              <span className="text-primary">Você converte.</span>
            </h1>
            <p className="text-lg text-muted-foreground mb-10 max-w-lg leading-relaxed">
              Integre um botão de try-on em cada produto da sua loja VTEX.
              Em menos de 3 segundos, a IA Gemini veste a peça no cliente —
              sem cabine de provador.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/login"
                className="bg-primary text-primary-foreground font-mono font-semibold text-sm px-8 py-4 text-center hover:bg-primary/85 transition-colors"
              >
                Criar conta grátis
              </Link>
              <Link
                href="/demo"
                className="border border-border font-mono text-sm px-8 py-4 text-center hover:border-primary hover:text-primary transition-colors"
              >
                Ver demonstração →
              </Link>
            </div>
            <p className="font-mono text-xs text-muted-foreground mt-4 tracking-wide">
              Sem cartão de crédito · 500 gerações grátis por mês
            </p>
          </div>

          {/* Right 2/5: product cards grid */}
          <div className="md:col-span-2 grid grid-cols-3 gap-1.5">
            {HERO_CARDS.map((card, i) => (
              <div
                key={i}
                className="aspect-square border border-border relative overflow-hidden flex flex-col justify-end p-2"
                style={{ backgroundColor: card.color }}
              >
                {card.badge && (
                  <span className="absolute top-1.5 right-1.5 bg-primary text-primary-foreground font-mono text-[8px] font-bold px-1.5 py-0.5 leading-tight">
                    {card.badge}
                  </span>
                )}
                <div className="absolute inset-0 flex items-center justify-center opacity-20">
                  <span className="text-4xl">
                    {['👗', '👕', '🧥', '👖', '👗', '🥻'][i]}
                  </span>
                </div>
                <p className="font-mono text-[9px] font-bold relative z-10 leading-tight">{card.label}</p>
                <p className="font-mono text-[8px] text-muted-foreground relative z-10">{card.sub}</p>
              </div>
            ))}
            {/* Bottom user card */}
            <div className="col-span-2 bg-card border border-border px-3 py-2.5 flex items-center gap-2.5">
              <div className="w-7 h-7 shrink-0 bg-primary/20 flex items-center justify-center font-mono text-xs text-primary font-black">
                C
              </div>
              <div className="min-w-0">
                <p className="font-mono text-[10px] font-semibold truncate">Clara Mendes</p>
                <p className="font-mono text-[9px] text-muted-foreground truncate">Comprou via try-on</p>
              </div>
              <span className="ml-auto text-primary font-mono text-xs font-black shrink-0">+R$340</span>
            </div>
            {/* Corner decoration */}
            <div className="bg-card border border-border flex items-center justify-center">
              <span className="font-mono text-[9px] text-primary font-black tracking-widest text-center leading-tight px-1">TRY<br />ON</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS ───────────────────────────────────────────── */}
      <section className="border-y border-border">
        <div className="max-w-6xl mx-auto px-6 py-10 grid grid-cols-3 divide-x divide-border">
          {[
            { value: '+38%', label: 'taxa de conversão média' },
            { value: '< 3s', label: 'tempo de geração IA' },
            { value: '−28%', label: 'taxa de devolução' },
          ].map((stat) => (
            <div key={stat.value} className="text-center px-4 md:px-8">
              <p className="text-3xl md:text-4xl font-black text-primary font-mono">{stat.value}</p>
              <p className="font-mono text-[10px] md:text-xs text-muted-foreground mt-2 tracking-wide">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ────────────────────────────────────── */}
      <section id="como-funciona" className="max-w-6xl mx-auto px-6 py-24">
        <div className="mb-16">
          <p className="font-mono text-[10px] tracking-[0.3em] text-primary mb-3 uppercase">Como funciona</p>
          <h2 className="text-4xl font-black tracking-tight">Do GTM ao try-on em 4 passos.</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-border">
          {STEPS.map((step, i) => (
            <div key={i} className="bg-background p-10 relative overflow-hidden">
              <span className="absolute -top-2 right-3 text-[110px] font-black leading-none text-foreground/[0.04] select-none pointer-events-none font-mono">
                {i + 1}
              </span>
              <p className="font-mono text-[10px] text-primary tracking-[0.25em] mb-5 uppercase">Passo {i + 1}</p>
              <h3 className="text-xl font-bold mb-3 pr-16">{step.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── PLATFORM COMPAT ─────────────────────────────────── */}
      <section className="border-y border-border bg-card">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <p className="font-mono text-xs text-muted-foreground tracking-widest uppercase">Compatível com</p>
          <div className="flex flex-wrap items-center gap-3">
            {['VTEX IO', 'VTEX Legacy', 'VTEX Headless', 'Google Tag Manager'].map((p) => (
              <span key={p} className="font-mono text-xs font-semibold border border-border px-4 py-2 text-foreground">
                {p}
              </span>
            ))}
          </div>
          <p className="font-mono text-[10px] text-muted-foreground">Shopify · WooCommerce em breve</p>
        </div>
      </section>

      {/* ── PRICING ─────────────────────────────────────────── */}
      <section id="precos" className="max-w-6xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <p className="font-mono text-[10px] tracking-[0.3em] text-primary mb-3 uppercase">Preços</p>
          <h2 className="text-4xl font-black tracking-tight mb-3">Simples. Sem surpresas.</h2>
          <p className="text-muted-foreground text-sm font-mono">Mesmas funcionalidades. Duas formas de usar.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {PRICING.map((plan) => (
            <div
              key={plan.name}
              className={`border p-8 relative ${plan.highlight ? 'border-primary' : 'border-border bg-card'}`}
            >
              {plan.highlight && (
                <span className="absolute -top-px right-6 bg-primary text-primary-foreground font-mono text-[10px] font-black px-3 py-1">
                  Mais popular
                </span>
              )}
              <h3 className="font-mono font-black text-lg mb-1">{plan.name}</h3>
              <p className="font-mono text-[11px] text-muted-foreground mb-6">{plan.sub}</p>
              <p className="text-4xl font-black mb-8 tracking-tight">{plan.price}
                {plan.name === 'Pro' && <span className="text-base font-mono font-normal text-muted-foreground">/mês</span>}
              </p>
              <ul className="space-y-3 mb-8">
                {plan.features.map((feat) => (
                  <li key={feat} className="flex items-start gap-2 text-sm">
                    <span className="text-primary mt-0.5 font-mono shrink-0">✓</span>
                    <span className="text-muted-foreground">{feat}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/login"
                className={`block w-full text-center font-mono text-sm font-semibold py-3 transition-colors ${
                  plan.highlight
                    ? 'bg-primary text-primary-foreground hover:bg-primary/85'
                    : 'border border-border hover:border-foreground hover:text-foreground'
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* ── TESTIMONIALS ────────────────────────────────────── */}
      <section className="bg-card border-y border-border">
        <div className="max-w-6xl mx-auto px-6 py-24">
          <div className="text-center mb-16">
            <p className="font-mono text-[10px] tracking-[0.3em] text-primary mb-3 uppercase">Depoimentos</p>
            <h2 className="text-4xl font-black tracking-tight">O que nossos clientes dizem.</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="bg-background border border-border p-8">
                <div className="flex gap-0.5 mb-6">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <span key={i} className="text-primary text-base">★</span>
                  ))}
                </div>
                <p className="text-sm leading-relaxed text-foreground mb-6">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 shrink-0 bg-primary/20 flex items-center justify-center font-mono text-xs text-primary font-black">
                    {t.name[0]}
                  </div>
                  <div>
                    <p className="font-mono text-xs font-semibold">{t.name}</p>
                    <p className="font-mono text-[10px] text-muted-foreground">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────── */}
      <FAQAccordion />

      {/* ── FINAL CTA ───────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 py-32 text-center">
        <p className="font-mono text-[10px] tracking-[0.3em] text-primary mb-6 uppercase">Comece hoje</p>
        <h2 className="text-5xl font-black tracking-tight mb-6">
          Pronto para aumentar<br />sua conversão?
        </h2>
        <p className="text-muted-foreground mb-10 max-w-md mx-auto font-mono text-sm leading-relaxed">
          500 gerações grátis por mês. Sem cartão de crédito.
          Instale em menos de 10 minutos.
        </p>
        <Link
          href="/login"
          className="inline-block bg-primary text-primary-foreground font-mono font-semibold text-sm px-10 py-4 hover:bg-primary/85 transition-colors"
        >
          Criar conta grátis →
        </Link>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────── */}
      <footer className="border-t border-border">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="flex flex-col md:flex-row justify-between gap-10 mb-12">
            <div className="max-w-xs">
              <p className="font-mono font-black text-lg mb-2">TryOn<span className="text-primary">AI</span></p>
              <p className="font-mono text-xs text-muted-foreground leading-relaxed">
                O provador virtual com IA que converte visitantes em compradores
                para lojas de moda online.
              </p>
            </div>
            <div className="flex gap-12 md:gap-16">
              <div>
                <p className="font-mono text-[10px] font-black mb-4 tracking-[0.2em] uppercase text-muted-foreground">Produto</p>
                <div className="space-y-3">
                  {['Como funciona', 'Preços', 'Demonstração', 'Documentação'].map((l) => (
                    <p key={l}>
                      <a href="#" className="font-mono text-xs text-muted-foreground hover:text-foreground transition-colors">{l}</a>
                    </p>
                  ))}
                </div>
              </div>
              <div>
                <p className="font-mono text-[10px] font-black mb-4 tracking-[0.2em] uppercase text-muted-foreground">Legal</p>
                <div className="space-y-3">
                  {['Termos de Uso', 'Privacidade', 'LGPD'].map((l) => (
                    <p key={l}>
                      <a href="#" className="font-mono text-xs text-muted-foreground hover:text-foreground transition-colors">{l}</a>
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="border-t border-border pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="font-mono text-[10px] text-muted-foreground">© 2026 TryOn AI. Todos os direitos reservados.</p>
            <p className="font-mono text-[10px] text-muted-foreground">Construído com Gemini · LGPD compliant</p>
          </div>
        </div>
        <p className="font-mono font-black text-[clamp(52px,11vw,112px)] text-foreground/[0.04] text-center pb-4 overflow-hidden leading-none select-none tracking-tight">
          TryOn AI
        </p>
      </footer>
    </div>
  );
}
