'use client';

import { useState, useEffect, Suspense } from 'react';
import useSWR from 'swr';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Check, Loader2, Sparkles, AlertCircle, CheckCircle2, ExternalLink, Gift } from 'lucide-react';
import { cn } from '@/lib/utils';
import { subscriptionsApi } from '@/lib/api';
import { toast } from 'sonner';
import type { Plan } from '@/types';
import { useAuth } from '@/lib/auth-context';
import { useSubscription, useTrialEligibility } from '@/hooks/use-subscription';
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

const FALLBACK_PLAN_IDS = ['essencial', 'professional', 'elite'];

const plansFetcher = async (): Promise<{ plans: Plan[]; isFromApi: boolean }> => {
  const res = await subscriptionsApi.getPlans();
  
  if (res.success && res.data && Array.isArray(res.data) && res.data.length > 0) {
    const validPlans = res.data.filter(plan => 
      plan && plan.id && plan.name && typeof plan.price !== 'undefined'
    );
    
    if (validPlans.length > 0) {
      return { plans: validPlans, isFromApi: true };
    }
  }
  
  if (res.success && res.data && !Array.isArray(res.data)) {
    const possiblePlans = (res.data as any).plans || (res.data as any).items || Object.values(res.data);
    if (Array.isArray(possiblePlans) && possiblePlans.length > 0) {
      return { plans: possiblePlans, isFromApi: true };
    }
  }
  
  return { plans: FALLBACK_PLANS, isFromApi: false };
};

// Component to handle search params (must be wrapped in Suspense)
function TrialStartedHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  useEffect(() => {
    if (searchParams.get('trial') === 'started') {
      toast.success('Seu periodo de teste foi iniciado com sucesso!');
      router.replace('/pricing');
    }
  }, [searchParams, router]);
  
  return null;
}

function PricingContent() {
  const router = useRouter();
  const { user } = useAuth();
  const { 
    hasActiveSubscription, 
    plan: currentPlan, 
    isTrialing, 
    trialEndsAt,
    isTrialExpired,
    refresh: refreshSubscription 
  } = useSubscription();
  const { 
    canTrial, 
    availablePlans: trialAvailablePlans, 
    reason: trialReason,
    refresh: refreshTrialEligibility 
  } = useTrialEligibility();
  
  const [subscribingPlanId, setSubscribingPlanId] = useState<string | null>(null);
  const [isStartingTrial, setIsStartingTrial] = useState(false);
  
  const { data, isLoading } = useSWR<{ plans: Plan[]; isFromApi: boolean }>('plans', plansFetcher, {
    revalidateOnFocus: false,
    fallbackData: { plans: FALLBACK_PLANS, isFromApi: false },
  });

  const plans = data?.plans || FALLBACK_PLANS;
  const isFromApi = data?.isFromApi || false;
  const isFallback = !isFromApi || FALLBACK_PLAN_IDS.includes(plans[0]?.id);

  const handleStartTrial = async (plan: Plan) => {
    if (!user) {
      router.push(`/register?plan=${plan.name.toLowerCase()}`);
      return;
    }

    setIsStartingTrial(true);
    setSubscribingPlanId(plan.id);
    
    try {
      const result = await subscriptionsApi.startTrial(plan.id);
      
      // Se a resposta veio com success: true (mesmo sem data), considere sucesso
      if (result.success) {
        const trialDays = result.data?.trialDays || plan.trialDays || 7;
        toast.success(`Seu teste gratis de ${trialDays} dias foi iniciado!`);
        await refreshSubscription();
        await refreshTrialEligibility();
        router.push('/dashboard?trial=started');
      } else {
        const errorMessage = result.error || 'Erro ao iniciar teste gratis';
        
        if (errorMessage.toLowerCase().includes('ja utilizou') || 
            errorMessage.toLowerCase().includes('already used')) {
          toast.error('Voce ja utilizou seu periodo de teste gratuito.');
        } else if (errorMessage.toLowerCase().includes('ja possui') || 
                   errorMessage.toLowerCase().includes('already has') ||
                   errorMessage.toLowerCase().includes('existing')) {
          toast.info('Voce ja possui uma assinatura ativa!');
          router.push('/dashboard/assinatura');
        } else {
          toast.error(errorMessage);
        }
      }
    } catch {
      toast.error('Erro ao conectar com o servidor. Tente novamente.');
    } finally {
      setIsStartingTrial(false);
      setSubscribingPlanId(null);
    }
  };

  const handleSubscribe = async (plan: Plan) => {
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

    // Se ja tem assinatura ativa de outro plano - usar endpoint de troca de plano
    if (hasActiveSubscription && !isTrialExpired && currentPlan?.id !== plan.id) {
      setSubscribingPlanId(plan.id);
      try {
        const result = await subscriptionsApi.changePlan(plan.id);
        
        if (result.success && result.data) {
          if (result.data.requiresPayment && result.data.initPoint) {
            // Redireciona para Mercado Pago
            window.location.href = result.data.initPoint;
          } else {
            // Plano alterado com sucesso (trial)
            toast.success(result.data.message || 'Plano alterado com sucesso!');
            router.push('/dashboard/assinatura');
            router.refresh();
          }
        } else {
          toast.error(result.error || 'Erro ao alterar plano');
        }
      } catch {
        toast.error('Erro ao conectar com o servidor. Tente novamente.');
      } finally {
        setSubscribingPlanId(null);
      }
      return;
    }

    // Se plano tem trial E usuario pode fazer trial, usar endpoint de trial
    const shouldStartTrial = plan.trialDays > 0 && (canTrial || (!hasActiveSubscription && !isTrialExpired));
    
    if (shouldStartTrial) {
      await handleStartTrial(plan);
      return;
    }

    // Se nao pode fazer trial, vai direto para pagamento
    setSubscribingPlanId(plan.id);
    try {
      const result = await subscriptionsApi.create(plan.id);
      
      if (result.success && result.data) {
        window.location.href = result.data.initPoint;
      } else {
        const errorMessage = result.error || 'Erro ao iniciar pagamento';
        
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
          toast.error('Plano temporariamente indisponivel. Entre em contato pelo WhatsApp.');
        } else {
          toast.error(errorMessage);
        }
      }
    } catch {
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
    if (hasActiveSubscription && currentPlan?.id === plan.id && !isTrialExpired) {
      return 'Plano Atual';
    }

    // Se pode fazer trial deste plano
    if (canTrial && plan.trialDays > 0) {
      return `Testar Gratis por ${plan.trialDays} dias`;
    }

    // Se ja usou trial ou trial expirado, vai direto para pagamento
    if (trialReason === 'already_used_trial' || isTrialExpired) {
      return 'Assinar Agora';
    }

    if (hasActiveSubscription) {
      return 'Alterar Plano';
    }

    // Default - verificar se plano tem trial
    if (plan.trialDays > 0) {
      return 'Comecar Teste Gratis';
    }

    return 'Assinar Agora';
  };

  const isCurrentPlan = (plan: Plan) => {
    return hasActiveSubscription && currentPlan?.id === plan.id && !isTrialExpired;
  };

  const getTrialReasonMessage = () => {
    switch (trialReason) {
      case 'already_has_active_subscription':
        return 'Voce ja possui uma assinatura ativa.';
      case 'already_used_trial':
        return 'Voce ja utilizou seu periodo de teste gratuito.';
      case 'trial_disabled_globally':
        return 'O periodo de teste nao esta disponivel no momento.';
      case 'no_plans_with_trial':
        return 'Nenhum plano com periodo de teste disponivel.';
      default:
        return null;
    }
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

        {/* Trial expired alert */}
        {user && isTrialExpired && (
          <Alert className="mx-auto mt-8 max-w-2xl border-red-500/30 bg-red-500/5">
            <AlertCircle className="h-4 w-4 text-red-500" />
            <AlertTitle className="text-red-500">Seu periodo de teste expirou</AlertTitle>
            <AlertDescription className="mt-2 text-red-500/80">
              Para continuar usando o ZapAgenda, escolha um plano abaixo e assine agora.
              Seus dados estao salvos e voce pode continuar de onde parou!
            </AlertDescription>
          </Alert>
        )}

        {/* Trial reason alert (if can't trial) */}
        {user && !canTrial && trialReason && trialReason !== 'already_has_active_subscription' && !isTrialExpired && (
          <Alert className="mx-auto mt-8 max-w-2xl border-amber-500/30 bg-amber-500/5">
            <AlertCircle className="h-4 w-4 text-amber-500" />
            <AlertDescription className="text-amber-500/80">
              {getTrialReasonMessage()}
            </AlertDescription>
          </Alert>
        )}

        {/* Current subscription alert */}
        {user && hasActiveSubscription && !isTrialExpired && (
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
            const canTrialThisPlan = canTrial && plan.trialDays > 0;

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
                    {plan.trialDays > 0 && canTrialThisPlan && (
                      <div className="mt-2 flex items-center gap-1.5">
                        <Gift className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium text-primary">
                          {plan.trialDays} dias gratis para testar
                        </span>
                      </div>
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
                    className={cn(
                      "w-full",
                      canTrialThisPlan && !isCurrent && "bg-gradient-to-r from-primary to-emerald-500 hover:from-primary/90 hover:to-emerald-500/90"
                    )}
                    variant={isCurrent ? 'secondary' : (isProfessional || canTrialThisPlan ? 'default' : 'outline')}
                    size="lg"
                    onClick={() => handleSubscribe(plan)}
                    disabled={isSubscribing || isCurrent || isFallback}
                  >
                    {isSubscribing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {isStartingTrial ? 'Iniciando teste...' : 'Processando...'}
                      </>
                    ) : isFallback ? (
                      'Indisponivel'
                    ) : (
                      <>
                        {canTrialThisPlan && !isCurrent && <Gift className="mr-2 h-4 w-4" />}
                        {getCta(plan)}
                      </>
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
            {canTrial ? (
              <>Teste gratis por 7 dias, sem precisar de cartao de credito.</>
            ) : (
              <>Pagamento seguro via Mercado Pago. Cancele quando quiser, sem burocracia.</>
            )}
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

export default function PricingPage() {
  return (
    <>
      <Suspense fallback={null}>
        <TrialStartedHandler />
      </Suspense>
      <PricingContent />
    </>
  );
}
