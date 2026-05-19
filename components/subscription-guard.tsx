'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useSubscription } from '@/hooks/use-subscription';
import { Loader2, Lock, Sparkles, ArrowRight, CheckCircle2, AlertTriangle, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface SubscriptionGuardProps {
  children: React.ReactNode;
}

// Rotas que NAO precisam de assinatura ativa
const FREE_ROUTES = [
  '/dashboard/assinatura',
  '/dashboard/configuracoes',
];

// Features disponiveis em cada plano (para mostrar no paywall)
const PLAN_HIGHLIGHTS = [
  {
    name: 'Essencial',
    price: 49.90,
    features: ['1 Profissional', '100 Agendamentos/mes', '3 Automacoes WhatsApp'],
  },
  {
    name: 'Professional',
    price: 119.90,
    features: ['5 Profissionais', 'Agendamentos ilimitados', 'Checkout online'],
    popular: true,
  },
  {
    name: 'Elite',
    price: 249.90,
    features: ['Profissionais ilimitados', 'Dashboard BI', 'Split de pagamento'],
  },
];

export function SubscriptionGuard({ children }: SubscriptionGuardProps) {
  const pathname = usePathname();
  const { 
    isLoading, 
    hasActiveSubscription, 
    isTrialing, 
    trialEndsAt, 
    isTrialExpired,
    trialDaysRemaining,
    plan 
  } = useSubscription();
  const [showPaywall, setShowPaywall] = useState(false);

  // Verifica se a rota atual e gratuita
  const isFreRoute = FREE_ROUTES.some(route => pathname.startsWith(route));

  useEffect(() => {
    if (!isLoading && !hasActiveSubscription && !isFreRoute) {
      setShowPaywall(true);
    } else {
      setShowPaywall(false);
    }
  }, [isLoading, hasActiveSubscription, isFreRoute]);

  // Ainda carregando
  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Usuario tem assinatura ativa (incluindo trial) ou esta em rota gratuita
  if (hasActiveSubscription || isFreRoute) {
    return (
      <>
        {/* Banner de trial */}
        {isTrialing && trialEndsAt && trialDaysRemaining !== null && (
          <TrialBanner 
            planName={plan?.name || 'Premium'} 
            trialEndsAt={trialEndsAt} 
            daysRemaining={trialDaysRemaining} 
          />
        )}
        {children}
      </>
    );
  }

  // Trial expirado - mostrar paywall especial
  if (isTrialExpired) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center p-4">
        <div className="w-full max-w-2xl">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">
              Seu periodo de teste acabou
            </h1>
            <p className="mt-2 text-muted-foreground">
              Seus dados estao salvos! Assine agora para continuar usando todas as funcionalidades do ZapAgenda.
            </p>
          </div>

          <Card className="mb-6 border-primary/30 bg-primary/5">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
                <div>
                  <p className="font-medium">Plano testado: {plan?.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Continue de onde parou, sem perder nenhum dado!
                  </p>
                </div>
                <Button size="lg" asChild>
                  <Link href="/pricing">
                    Assinar Agora
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Precisa de ajuda?{' '}
              <a 
                href="https://wa.me/5511999999999" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Fale conosco pelo WhatsApp
              </a>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Paywall - usuario sem assinatura tentando acessar area restrita
  if (showPaywall) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center p-4">
        <div className="w-full max-w-4xl">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Lock className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">
              Comece seu teste gratis de 7 dias
            </h1>
            <p className="mt-2 text-muted-foreground">
              Experimente todas as funcionalidades sem compromisso. Sem necessidade de cartao de credito!
            </p>
          </div>

          {/* Mini pricing cards */}
          <div className="mb-8 grid gap-4 md:grid-cols-3">
            {PLAN_HIGHLIGHTS.map((p) => (
              <Card 
                key={p.name}
                className={cn(
                  'relative transition-all hover:shadow-lg',
                  p.popular && 'border-primary shadow-md'
                )}
              >
                {p.popular && (
                  <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-primary">
                    Mais Popular
                  </Badge>
                )}
                <CardHeader className={cn('pb-2', p.popular && 'pt-6')}>
                  <CardTitle className="text-lg">{p.name}</CardTitle>
                  <div>
                    <span className="text-2xl font-bold">R$ {p.price.toFixed(2).replace('.', ',')}</span>
                    <span className="text-sm text-muted-foreground">/mes</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex flex-col items-center gap-4">
            <Button size="lg" className="bg-gradient-to-r from-primary to-emerald-500" asChild>
              <Link href="/pricing">
                <Sparkles className="mr-2 h-4 w-4" />
                Comecar Teste Gratis
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <p className="text-sm text-muted-foreground">
              7 dias gratis para testar. Sem cartao de credito.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return children;
}

// Componente de banner de trial
interface TrialBannerProps {
  planName: string;
  trialEndsAt: string;
  daysRemaining: number;
}

function TrialBanner({ planName, trialEndsAt, daysRemaining }: TrialBannerProps) {
  const isUrgent = daysRemaining <= 3;
  const isCritical = daysRemaining <= 1;
  
  const progressValue = Math.max(0, Math.min(100, ((7 - daysRemaining) / 7) * 100));

  return (
    <div 
      className={cn(
        "mb-4 rounded-lg border p-4",
        isCritical ? "border-red-500/30 bg-red-500/5" :
        isUrgent ? "border-amber-500/30 bg-amber-500/5" :
        "border-primary/30 bg-primary/5"
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
            isCritical ? "bg-red-500/10" :
            isUrgent ? "bg-amber-500/10" :
            "bg-primary/10"
          )}>
            <Calendar className={cn(
              "h-5 w-5",
              isCritical ? "text-red-500" :
              isUrgent ? "text-amber-500" :
              "text-primary"
            )} />
          </div>
          <div>
            <p className={cn(
              "font-medium",
              isCritical ? "text-red-500" :
              isUrgent ? "text-amber-500" :
              "text-foreground"
            )}>
              {isCritical 
                ? 'Ultimo dia do seu teste!' 
                : isUrgent 
                  ? `${daysRemaining} dias restantes no seu teste`
                  : `Periodo de teste: ${daysRemaining} dias restantes`
              }
            </p>
            <p className="text-sm text-muted-foreground">
              Plano {planName} - Teste gratis ate {new Date(trialEndsAt).toLocaleDateString('pt-BR')}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="hidden w-32 sm:block">
            <Progress 
              value={progressValue} 
              className={cn(
                "h-2",
                isCritical && "[&>div]:bg-red-500",
                isUrgent && !isCritical && "[&>div]:bg-amber-500"
              )}
            />
          </div>
          <Button 
            size="sm" 
            variant={isCritical ? "destructive" : isUrgent ? "default" : "outline"}
            asChild
          >
            <Link href="/pricing">
              {isCritical ? 'Assinar Agora' : 'Ver planos'}
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
