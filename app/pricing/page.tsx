'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Check, Loader2, Sparkles, AlertCircle, CheckCircle2, ExternalLink, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { subscriptionsApi } from '@/lib/api';
import { toast } from 'sonner';
import type { Plan } from '@/types';
import { useAuth } from '@/lib/auth-context';
import { useSubscription } from '@/hooks/use-subscription';
import Link from 'next/link';

// Planos estaticos como fallback quando a API nao esta disponivel
const FALLBACK_PLANS: Plan[] = [
  {
    id: 'essencial',
    name: 'Essencial',
    description: 'Ideal para profissionais independentes que estao comecando a organizar sua agenda.',
    price: 49.90,
    interval: 'MONTHLY',
    maxProfessionals: 1,
    maxServices: 10,
    maxAppointments: 100,
    trialDays: 7,
    active: true,
    features: {
      whatsappAutomations: 3,
      bookingPage: true,
      instagramBioLink: true,
      onlinePayment: false,
      financialDashboard: false,
      prioritySupport: false,
      recurringAppointments: false,
      paymentSplit: false,
      waitlist: false,
      advancedBI: false,
      retentionReports: false,
    },
  },
  {
    id: 'professional',
    name: 'Professional',
    description: 'O favorito de barbearias e saloes que possuem equipe e querem reduzir as faltas.',
    price: 119.90,
    interval: 'MONTHLY',
    maxProfessionals: 5,
    maxServices: 50,
    maxAppointments: 999999,
    trialDays: 7,
    active: true,
    features: {
      whatsappAutomations: 999,
      bookingPage: true,
      instagramBioLink: true,
      onlinePayment: true,
      financialDashboard: true,
      prioritySupport: true,
      recurringAppointments: false,
      paymentSplit: false,
      waitlist: false,
      advancedBI: false,
      retentionReports: false,
    },
  },
  {
    id: 'elite',
    name: 'Elite',
    description: 'Ideal para estabelecimentos de grande porte ou redes com multiplos profissionais.',
    price: 249.90,
    interval: 'MONTHLY',
    maxProfessionals: 999,
    maxServices: 999,
    maxAppointments: 999999,
    trialDays: 7,
    active: true,
    features: {
      whatsappAutomations: 999,
      bookingPage: true,
      instagramBioLink: true,
      onlinePayment: true,
      financialDashboard: true,
      prioritySupport: true,
      recurringAppointments: true,
      paymentSplit: true,
      waitlist: true,
      advancedBI: true,
      retentionReports: true,
    },
  },
];

const plansFetcher = async () => {
  const res = await subscriptionsApi.getPlans();
  console.log('[v0] Plans API response:', res);
  if (!res.success || !res.data || res.data.length === 0) {
    console.log('[v0] Using fallback plans');
    return FALLBACK_PLANS;
  }
  console.log('[v0] Using API plans:', res.data);
  return res.data;
};

export default function PricingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { hasActiveSubscription, plan: currentPlan, subscription, isTrialing, trialEndsAt } = useSubscription();
  const [subscribingPlanId, setSubscribingPlanId] = useState<string | null>(null);
  
  const { data: plans, isLoading } = useSWR<Plan[]>('plans', plansFetcher, {
    revalidateOnFocus: false,
    fallbackData: FALLBACK_PLANS,
  });

  const handleSubscribe = async (plan: Plan) => {
    // Se nao esta logado, redireciona para registro
    if (!user) {
      router.push(`/register?plan=${plan.name.toLowerCase()}`);
      return;
    }

    // Se ja tem assinatura ativa do mesmo plano
    if (hasActiveSubscription && currentPlan?.id === plan.id) {
      toast.info('Voce ja possui este plano ativo');
      router.push('/dashboard/assinatura');
      return;
    }

    // Se ja tem assinatura ativa de outro plano
    if (hasActiveSubscription && currentPlan?.id !== plan.id) {
      toast.info('Para trocar de plano, acesse a pagina de assinatura');
      router.push('/dashboard/assinatura');
      return;
    }

    // Se e o plano Elite, abre WhatsApp para vendas
    if (plan.name === 'Elite') {
      const message = encodeURIComponent(
        `Ola! Tenho interesse no plano Elite do ZapAgenda. Gostaria de mais informacoes.`
      );
      window.open(`https://wa.me/5511999999999?text=${message}`, '_blank');
      return;
    }

    setSubscribingPlanId(plan.id);
    try {
      console.log('[v0] Creating subscription for plan:', { planId: plan.id, planName: plan.name });
      
      const result = await subscriptionsApi.create(plan.id);
      
      console.log('[v0] Subscription API response:', result);
      
      if (result.success && result.data) {
        // Redireciona para checkout do Mercado Pago
        console.log('[v0] Redirecting to Mercado Pago:', result.data.initPoint);
        window.location.href = result.data.initPoint;
      } else {
        // Trata erros especificos
        const errorMessage = result.error || 'Erro ao iniciar pagamento';
        console.log('[v0] Subscription error:', errorMessage);
        
        if (errorMessage.toLowerCase().includes('ja possui') || 
            errorMessage.toLowerCase().includes('already') ||
            errorMessage.toLowerCase().includes('existing')) {
          toast.error('Voce ja possui uma assinatura. Acesse sua conta para gerenciar.');
          router.push('/dashboard/assinatura');
        } else if (errorMessage.toLowerCase().includes('plano nao encontrado') ||
                   errorMessage.toLowerCase().includes('plan not found')) {
          toast.error('Plano nao disponivel. Por favor, recarregue a pagina.');
        } else if (errorMessage.toLowerCase().includes('invalid') || 
                   errorMessage.toLowerCase().includes('invalido') ||
                   errorMessage.toLowerCase().includes('dados')) {
          toast.error('Dados invalidos. Verifique se voce completou seu cadastro.');
        } else {
          toast.error(errorMessage);
        }
      }
    } catch (error) {
      console.error('[v0] Error subscribing:', error);
      toast.error('Erro ao conectar com o servidor. Tente novamente.');
    } finally {
      setSubscribingPlanId(null);
    }
  };

  const formatPrice = (price: number | string) => {
    const numericPrice = typeof price === 'string' ? parseFloat(price) : price;
    const [reais, centavos] = numericPrice.toFixed(2).split('.');
    return { reais, centavos };
  };

  const getPlanFeaturesList = (plan: Plan): string[] => {
    const features: string[] = [];
    
    if (plan.maxProfessionals >= 999) {
      features.push('Profissionais ilimitados');
    } else if (plan.maxProfessionals === 1) {
      features.push('1 Profissional');
    } else {
      features.push(`Ate ${plan.maxProfessionals} Profissionais`);
    }
    
    if (plan.maxAppointments >= 999999) {
      features.push('Agendamentos ilimitados');
    } else {
      features.push(`${plan.maxAppointments} Agendamentos/mes`);
    }
    
    if (plan.features.whatsappAutomations >= 999) {
      features.push('Todas as automacoes de WhatsApp');
    } else {
      features.push(`${plan.features.whatsappAutomations} Automacoes de WhatsApp`);
    }
    
    if (plan.features.bookingPage) features.push('Pagina de agendamento exclusiva');
    if (plan.features.instagramBioLink) features.push('Link personalizado para Bio do Instagram');
    if (plan.features.onlinePayment) features.push('Checkout online (sinal ou integral)');
    if (plan.features.financialDashboard) features.push('Painel financeiro por profissional');
    if (plan.features.prioritySupport) features.push('Suporte prioritario via WhatsApp');
    if (plan.features.recurringAppointments) features.push('Agendamentos recorrentes');
    if (plan.features.paymentSplit) features.push('Split de pagamento automatico');
    if (plan.features.waitlist) features.push('Lista de espera inteligente');
    if (plan.features.advancedBI) features.push('Dashboard avancado (BI)');
    if (plan.features.retentionReports) features.push('Relatorios de retencao e produtividade');
    
    return features;
  };

  const getCta = (plan: Plan) => {
    // Se usuario ja tem este plano
    if (hasActiveSubscription && currentPlan?.id === plan.id) {
      return 'Plano Atual';
    }
    
    if (plan.name === 'Elite') {
      return 'Falar com Vendas';
    }
    if (plan.trialDays > 0 && !hasActiveSubscription) {
      return 'Comecar Teste Gratis';
    }
    if (hasActiveSubscription) {
      return 'Alterar Plano';
    }
    return 'Comecar Agora';
  };

  const isCurrentPlan = (plan: Plan) => {
    return hasActiveSubscription && currentPlan?.id === plan.id;
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const sortedPlans = [...(plans || [])].sort((a, b) => {
    const priceA = typeof a.price === 'string' ? parseFloat(a.price) : a.price;
    const priceB = typeof b.price === 'string' ? parseFloat(b.price) : b.price;
    return priceA - priceB;
  });

  return (
    <div className="min-h-screen bg-background py-12 lg:py-20">
      <div className="container mx-auto max-w-7xl px-4">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            Escolha o plano ideal para seu negocio
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Comece a organizar sua agenda hoje mesmo. Sem taxas escondidas, cancele quando quiser.
          </p>
        </div>

        {/* Current subscription alert */}
        {user && hasActiveSubscription && (
          <Alert className="mx-auto mt-8 max-w-2xl border-primary/30 bg-primary/5">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            <AlertTitle>Voce ja possui uma assinatura ativa</AlertTitle>
            <AlertDescription className="mt-2">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <span>
                  Plano atual: <strong>{currentPlan?.name}</strong>
                  {isTrialing && trialEndsAt && (
                    <span className="ml-2 text-sm">
                      (Teste gratis ate {new Date(trialEndsAt).toLocaleDateString('pt-BR')})
                    </span>
                  )}
                </span>
                <Button size="sm" variant="outline" asChild>
                  <Link href="/dashboard/assinatura">
                    Gerenciar Assinatura
                    <ExternalLink className="ml-2 h-3 w-3" />
                  </Link>
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Plans Grid */}
        <div className="mt-12 grid gap-8 lg:grid-cols-3">
          {sortedPlans.map((plan) => {
            const isProfessional = plan.name === 'Professional';
            const isCurrent = isCurrentPlan(plan);
            const { reais, centavos } = formatPrice(plan.price);
            const features = getPlanFeaturesList(plan);
            const isSubscribing = subscribingPlanId === plan.id;

            return (
              <Card
                key={plan.id}
                className={cn(
                  'relative flex flex-col transition-all',
                  isProfessional && 'border-primary shadow-xl shadow-primary/10 scale-105 z-10',
                  isCurrent && 'ring-2 ring-primary'
                )}
              >
                {isProfessional && !isCurrent && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary px-4 py-1 text-primary-foreground">
                      <Sparkles className="mr-1 h-3 w-3" />
                      Mais Popular
                    </Badge>
                  </div>
                )}

                {isCurrent && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <Badge className="bg-green-600 px-4 py-1 text-white">
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                      Seu Plano Atual
                    </Badge>
                  </div>
                )}

                <CardHeader className={cn((isProfessional || isCurrent) && 'pt-8')}>
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
                    <span className="text-muted-foreground">/mes</span>
                    {plan.trialDays > 0 && !hasActiveSubscription && (
                      <p className="mt-1 text-sm text-primary">
                        {plan.trialDays} dias gratis para testar
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
                    variant={isCurrent ? 'secondary' : (isProfessional ? 'default' : 'outline')}
                    size="lg"
                    onClick={() => handleSubscribe(plan)}
                    disabled={isSubscribing || isCurrent}
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
              Ja tem uma conta?{' '}
              <a href="/login" className="text-primary hover:underline">
                Faca login
              </a>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
