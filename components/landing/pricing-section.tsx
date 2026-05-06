import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const plans = [
  {
    name: 'Start',
    description: 'Para quem está começando',
    price: 'Grátis',
    priceDetail: 'para sempre',
    features: [
      'Até 50 agendamentos/mês',
      '1 profissional',
      'Página de agendamento online',
      'Notificações por e-mail',
      'Suporte por e-mail',
    ],
    cta: 'Começar Grátis',
    href: '/register?plan=start',
    highlighted: false,
  },
  {
    name: 'Pro',
    description: 'Para negócios em crescimento',
    price: 'R$ 79',
    priceDetail: '/mês',
    features: [
      'Agendamentos ilimitados',
      'Até 5 profissionais',
      'Página de agendamento personalizada',
      'Notificações via WhatsApp',
      'Relatórios avançados',
      'Suporte prioritário',
      'Sem marca ZapAgenda',
    ],
    cta: 'Começar Teste Grátis',
    href: '/register?plan=pro',
    highlighted: true,
  },
  {
    name: 'Elite',
    description: 'Para grandes estabelecimentos',
    price: 'R$ 149',
    priceDetail: '/mês',
    features: [
      'Tudo do plano Pro',
      'Profissionais ilimitados',
      'Múltiplas unidades',
      'API de integração',
      'Gerente de sucesso dedicado',
      'Treinamento personalizado',
      'SLA garantido',
    ],
    cta: 'Falar com Vendas',
    href: '/register?plan=elite',
    highlighted: false,
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
              {plan.highlighted && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1 text-sm font-medium text-primary-foreground">
                  Mais Popular
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
          Todos os planos incluem 14 dias de teste grátis. Cancele quando quiser.
        </p>
      </div>
    </section>
  );
}
