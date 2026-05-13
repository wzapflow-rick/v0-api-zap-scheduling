'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Loader2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { subscriptionsApi } from '@/lib/api';
import { toast } from 'sonner';
import type { Plan } from '@/types';
import { useAuth } from '@/lib/auth-context';

const plansFetcher = async () => {
  const res = await subscriptionsApi.getPlans();
  if (!res.success) return [];
  return res.data || [];
};

export default function PricingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [subscribingPlanId, setSubscribingPlanId] = useState<string | null>(null);
  
  const { data: plans, isLoading } = useSWR<Plan[]>('plans', plansFetcher, {
    revalidateOnFocus: false,
  });

  const handleSubscribe = async (plan: Plan) => {
    if (!user) {
      router.push(`/register?plan=${plan.name.toLowerCase()}`);
      return;
    }

    setSubscribingPlanId(plan.id);
    try {
      const result = await subscriptionsApi.create(plan.id);
      
      if (result.success && result.data) {
        // Redirect to Mercado Pago checkout
        window.location.href = result.data.initPoint;
      } else {
        toast.error(result.error || 'Erro ao iniciar pagamento');
      }
    } catch {
      toast.error('Erro ao conectar com o servidor');
    } finally {
      setSubscribingPlanId(null);
    }
  };

  const formatPrice = (price: number) => {
    const [reais, centavos] = price.toFixed(2).split('.');
    return { reais, centavos };
  };

  const getPlanFeaturesList = (plan: Plan): string[] => {
    const features: string[] = [];
    
    // Profissionais
    if (plan.maxProfessionals >= 999) {
      features.push('Profissionais ilimitados');
    } else if (plan.maxProfessionals === 1) {
      features.push('1 Profissional');
    } else {
      features.push(`Até ${plan.maxProfessionals} Profissionais`);
    }
    
    // Agendamentos
    if (plan.maxAppointments >= 999999) {
      features.push('Agendamentos ilimitados');
    } else {
      features.push(`${plan.maxAppointments} Agendamentos/mês`);
    }
    
    // WhatsApp
    if (plan.features.whatsappAutomations >= 999) {
      features.push('Todas as automações de WhatsApp');
    } else {
      features.push(`${plan.features.whatsappAutomations} Automações de WhatsApp`);
    }
    
    // Features booleanas
    if (plan.features.bookingPage) features.push('Página de agendamento exclusiva');
    if (plan.features.instagramBioLink) features.push('Link personalizado para Bio do Instagram');
    if (plan.features.onlinePayment) features.push('Checkout online (sinal ou integral)');
    if (plan.features.financialDashboard) features.push('Painel financeiro por profissional');
    if (plan.features.prioritySupport) features.push('Suporte prioritário via WhatsApp');
    if (plan.features.recurringAppointments) features.push('Agendamentos recorrentes');
    if (plan.features.paymentSplit) features.push('Split de pagamento automático');
    if (plan.features.waitlist) features.push('Lista de espera inteligente');
    if (plan.features.advancedBI) features.push('Dashboard avançado (BI)');
    if (plan.features.retentionReports) features.push('Relatórios de retenção e produtividade');
    
    return features;
  };

  const getCta = (plan: Plan) => {
    if (plan.trialDays > 0) {
      return `Começar Teste Grátis de ${plan.trialDays} dias`;
    }
    if (plan.name === 'Elite') {
      return 'Falar com Vendas';
    }
    return 'Começar Agora';
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const sortedPlans = [...(plans || [])].sort((a, b) => a.price - b.price);
  const professionalPlan = sortedPlans.find(p => p.name === 'Professional');

  return (
    <div className="min-h-screen bg-background py-12 lg:py-20">
      <div className="container mx-auto max-w-7xl px-4">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            Escolha o plano ideal para seu negócio
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Comece a organizar sua agenda hoje mesmo. Sem taxas escondidas, cancele quando quiser.
          </p>
        </div>

        {/* Plans Grid */}
        <div className="mt-12 grid gap-8 lg:grid-cols-3">
          {sortedPlans.map((plan) => {
            const isProfessional = plan.name === 'Professional';
            const { reais, centavos } = formatPrice(plan.price);
            const features = getPlanFeaturesList(plan);
            const isSubscribing = subscribingPlanId === plan.id;

            return (
              <Card
                key={plan.id}
                className={cn(
                  'relative flex flex-col',
                  isProfessional && 'border-primary shadow-xl shadow-primary/10 scale-105 z-10'
                )}
              >
                {isProfessional && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary px-4 py-1 text-primary-foreground">
                      <Sparkles className="mr-1 h-3 w-3" />
                      Mais Popular
                    </Badge>
                  </div>
                )}

                <CardHeader className={cn(isProfessional && 'pt-8')}>
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <CardDescription className="min-h-[40px]">
                    {plan.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="flex flex-1 flex-col">
                  {/* Price */}
                  <div className="mb-6">
                    <span className="text-4xl font-bold text-foreground">R$ {reais}</span>
                    <span className="text-xl text-foreground">,{centavos}</span>
                    <span className="text-muted-foreground">/mês</span>
                    {plan.trialDays > 0 && (
                      <p className="mt-1 text-sm text-primary">
                        {plan.trialDays} dias grátis para testar
                      </p>
                    )}
                  </div>

                  {/* Features */}
                  <ul className="mb-8 flex-1 space-y-3">
                    {features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3">
                        <Check className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                        <span className="text-sm text-muted-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  <Button
                    className="w-full"
                    variant={isProfessional ? 'default' : 'outline'}
                    size="lg"
                    onClick={() => handleSubscribe(plan)}
                    disabled={isSubscribing}
                  >
                    {isSubscribing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processando...
                      </>
                    ) : (
                      getCta(plan)
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Footer info */}
        <div className="mt-12 text-center">
          <p className="text-sm text-muted-foreground">
            Pagamento seguro via Mercado Pago. Cancele quando quiser, sem burocracia.
          </p>
          {!user && (
            <p className="mt-2 text-sm text-muted-foreground">
              Já tem uma conta?{' '}
              <a href="/login" className="text-primary hover:underline">
                Faça login
              </a>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
