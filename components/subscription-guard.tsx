'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useSubscription } from '@/hooks/use-subscription';
import { Loader2, Lock, Calendar, Sparkles, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  const router = useRouter();
  const pathname = usePathname();
  const { 
    isLoading, 
    hasActiveSubscription, 
    isTrialing, 
    trialEndsAt, 
    subscription,
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

  // Usuario tem assinatura ou esta em rota gratuita
  if (hasActiveSubscription || isFreRoute) {
    return (
      <>
        {/* Banner de trial se aplicavel */}
        {isTrialing && trialEndsAt && (
          <div className="mb-4 rounded-lg border border-primary/30 bg-primary/5 p-3">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-sm">
                  <strong>Periodo de teste:</strong> Seu teste gratuito do plano {plan?.name} termina em{' '}
                  {new Date(trialEndsAt).toLocaleDateString('pt-BR')}
                </span>
              </div>
              <Button size="sm" variant="outline" asChild>
                <Link href="/dashboard/assinatura">Ver detalhes</Link>
              </Button>
            </div>
          </div>
        )}
        {children}
      </>
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
              Escolha um plano para continuar
            </h1>
            <p className="mt-2 text-muted-foreground">
              Voce precisa de uma assinatura ativa para acessar esta funcionalidade.
              Comece com 7 dias gratis!
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
            <Button size="lg" asChild>
              <Link href="/pricing">
                Ver todos os planos
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <p className="text-sm text-muted-foreground">
              7 dias gratis para testar. Cancele quando quiser.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return children;
}
