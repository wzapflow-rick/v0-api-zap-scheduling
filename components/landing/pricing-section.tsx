import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const plans = [
  {
    name: 'Essencial',
    description: 'Ideal para profissionais independentes que estão começando a organizar sua agenda.',
    price: 'R$ 49',
    priceDetail: ',90/mês',
    features: [
      '1 Profissional',
      '100 Agendamentos/mês',
      '3 Automações de WhatsApp',
      'Página de agendamento exclusiva',
      'Link personalizado para Bio do Instagram',
      'Pagamentos apenas no local',
    ],
    cta: 'Começar Agora',
    href: '/pricing',
    highlighted: false,
    badge: null,
  },
  {
    name: 'Professional',
    description: 'O favorito de barbearias e salões que possuem equipe e querem reduzir as faltas.',
    price: 'R$ 119',
    priceDetail: ',90/mês',
    features: [
      'Até 5 Profissionais',
      'Agendamentos ilimitados',
      'Todas as automações de WhatsApp',
      'Checkout online (sinal ou integral)',
      'Painel financeiro por profissional',
      'Suporte prioritário via WhatsApp',
    ],
    cta: 'Começar Teste Grátis',
    href: '/pricing',
    highlighted: true,
    badge: 'Mais Popular',
  },
  {
    name: 'Elite',
    description: 'Ideal para estabelecimentos de grande porte ou redes com múltiplos profissionais.',
    price: 'R$ 249',
    priceDetail: ',90/mês',
    features: [
      'Profissionais ilimitados',
      'Agendamentos recorrentes',
      'Split de pagamento automático',
      'Lista de espera inteligente',
      'Dashboard avançado (BI)',
      'Relatórios de retenção e produtividade',
    ],
    cta: 'Falar com Vendas',
    href: '/pricing',
    highlighted: false,
    badge: null,
  },
];

export function PricingSection() {
  return (
    <section id="precos" className="bg-background py-20 lg:py-32">
      <div className="container mx-auto max-w-7xl px-4">
        {/* Section header */}
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Planos que cabem no seu bolso
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Comece grátis e escale conforme seu negócio cresce. Sem surpresas, sem taxas escondidas.
          </p>
        </div>

        {/* Pricing cards */}
        <div className="mt-16 grid gap-8 lg:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={cn(
                'relative flex flex-col rounded-2xl border p-8',
                plan.highlighted
                  ? 'border-primary bg-primary/5 shadow-xl shadow-primary/10'
                  : 'border-border bg-card'
              )}
            >
              {plan.badge && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1 text-sm font-medium text-primary-foreground">
                  {plan.badge}
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-xl font-bold text-foreground">{plan.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>
              </div>

              <div className="mb-6">
                <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                <span className="text-muted-foreground">{plan.priceDetail}</span>
              </div>

              <ul className="mb-8 flex-1 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <Check className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                    <span className="text-sm text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                asChild
                variant={plan.highlighted ? 'default' : 'outline'}
                className="w-full"
              >
                <Link href={plan.href}>{plan.cta}</Link>
              </Button>
            </div>
          ))}
        </div>

        {/* Additional info */}
        <p className="mt-12 text-center text-sm text-muted-foreground">
          Todos os planos incluem 7 dias de teste grátis. Cancele quando quiser, sem burocracia.
        </p>
      </div>
    </section>
  );
}
