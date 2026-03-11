'use client';

import { useState } from 'react';

const FAQS: Array<{ q: string; a: string }> = [
  {
    q: 'Como funciona o pagamento?',
    a: 'No plano Starter é gratuito até 500 gerações por mês. No Pro você paga R$ 297/mês com gerações ilimitadas. Cobramos via Stripe — cartão de crédito ou boleto bancário.',
  },
  {
    q: 'O widget interfere no CSS da minha loja?',
    a: 'Não. O widget usa Shadow DOM para isolamento total. Nenhum estilo do TryOn AI vaza para a sua loja e nenhum estilo da sua loja interfere no widget.',
  },
  {
    q: 'Quais plataformas são suportadas hoje?',
    a: 'VTEX IO, VTEX Legacy e VTEX Headless via Google Tag Manager. Shopify e WooCommerce estão no roadmap.',
  },
  {
    q: 'Qual a diferença entre os planos?',
    a: 'O Starter tem limite de 500 gerações por mês e suporta apenas 1 loja. O Pro é ilimitado, suporta múltiplas lojas, inclui analytics de receita atribuída, catálogo personalizado por SKU e suporte prioritário.',
  },
  {
    q: 'As fotos dos clientes são armazenadas?',
    a: 'As imagens são deletadas automaticamente em até 24 horas após o processamento. Seguimos a LGPD integralmente — o widget exibe um modal de consentimento antes de qualquer upload.',
  },
  {
    q: 'Posso adicionar minha própria marca?',
    a: 'No plano Pro você pode personalizar as cores e o texto do widget para combinar com a identidade visual da sua loja.',
  },
  {
    q: 'Como é feita a instalação via GTM?',
    a: 'No painel TryOn AI, acesse sua loja → "Instalar widget" → copie o snippet de uma linha. Cole como tag HTML personalizada no Google Tag Manager e publique. Feito.',
  },
  {
    q: 'É possível cancelar a qualquer momento?',
    a: 'Sim. Sem fidelidade, sem multa de cancelamento. Você cancela pelo painel e o acesso permanece ativo até o final do período pago.',
  },
];

export default function FAQAccordion() {
  const [open, setOpen] = useState<number | null>(null);

  const mid = Math.ceil(FAQS.length / 2);
  const left = FAQS.slice(0, mid);
  const right = FAQS.slice(mid);

  function renderItem(faq: (typeof FAQS)[0], index: number) {
    const isOpen = open === index;
    return (
      <div key={index} className="border-b border-border last:border-b-0">
        <button
          className="w-full flex items-center justify-between py-5 text-left gap-4 group"
          onClick={() => setOpen(isOpen ? null : index)}
          aria-expanded={isOpen}
        >
          <span className="font-mono text-sm font-semibold group-hover:text-primary transition-colors pr-4">
            {faq.q}
          </span>
          <span
            className={`shrink-0 w-7 h-7 border border-border flex items-center justify-center font-mono text-sm transition-all ${
              isOpen ? 'bg-primary text-primary-foreground border-primary rotate-45' : 'text-muted-foreground'
            }`}
          >
            +
          </span>
        </button>
        {isOpen && (
          <p className="font-mono text-xs text-muted-foreground leading-relaxed pb-5 pr-12">
            {faq.a}
          </p>
        )}
      </div>
    );
  }

  return (
    <section id="faq" className="max-w-6xl mx-auto px-6 py-24">
      <div className="text-center mb-16">
        <p className="font-mono text-[10px] tracking-[0.3em] text-primary mb-3 uppercase">FAQ</p>
        <h2 className="text-4xl font-black tracking-tight mb-3">Perguntas frequentes.</h2>
        <p className="text-muted-foreground font-mono text-sm">
          Não encontrou o que procura?{' '}
          <a href="mailto:suporte@tryon.ai" className="text-primary hover:underline">
            Fale com a gente
          </a>
          .
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12">
        <div className="divide-y divide-border border-t border-border">
          {left.map((faq, i) => renderItem(faq, i))}
        </div>
        <div className="divide-y divide-border border-t border-border mt-0">
          {right.map((faq, i) => renderItem(faq, mid + i))}
        </div>
      </div>
    </section>
  );
}
