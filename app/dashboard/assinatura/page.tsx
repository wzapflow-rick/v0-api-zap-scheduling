'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { 
  CreditCard, 
  Calendar, 
  Users, 
  Package, 
  Clock, 
  Loader2,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { subscriptionsApi } from '@/lib/api';
import { useSubscription } from '@/hooks/use-subscription';
import { useUsage } from '@/hooks/use-usage';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export default function AssinaturaPage() {
  const router = useRouter();
  const [isCancelling, setIsCancelling] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const { 
    isLoading: isLoadingSubscription,
    hasActiveSubscription, 
    plan, 
    subscription, 
    isTrialing, 
    trialEndsAt,
    trialDaysRemaining,
    refresh: refreshSubscription 
  } = useSubscription();
  const { usage, limits, percentUsed, isLoading: isLoadingUsage, refresh: refreshUsage } = useUsage();

  const handleCancelSubscription = async () => {
    setIsCancelling(true);
    try {
      const result = await subscriptionsApi.cancel();
      if (result.success) {
        toast.success('Assinatura cancelada com sucesso');
        refreshSubscription();
        refreshUsage();
      } else {
        toast.error(result.error || 'Erro ao cancelar assinatura');
      }
    } catch {
      toast.error('Erro ao conectar com o servidor');
    } finally {
      setIsCancelling(false);
    }
  };

  const handleConvertToPaid = async () => {
    setIsConverting(true);
    try {
      const result = await subscriptionsApi.convertTrialToPaid();
      if (result.success && result.data) {
        window.location.href = result.data.initPoint;
      } else {
        toast.error(result.error || 'Erro ao iniciar pagamento');
      }
    } catch {
      toast.error('Erro ao conectar com o servidor');
    } finally {
      setIsConverting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return format(new Date(dateStr), "d 'de' MMMM 'de' yyyy", { locale: ptBR });
  };

  const getStatusBadge = () => {
    if (!subscription?.status) return null;
    
    const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: typeof CheckCircle2 }> = {
      ACTIVE: { label: 'Ativa', variant: 'default', icon: CheckCircle2 },
      TRIALING: { label: 'Periodo de Teste', variant: 'secondary', icon: Clock },
      TRIAL_EXPIRED: { label: 'Teste Expirado', variant: 'destructive', icon: AlertTriangle },
      PAST_DUE: { label: 'Pagamento Atrasado', variant: 'destructive', icon: AlertTriangle },
      CANCELLED: { label: 'Cancelada', variant: 'outline', icon: AlertTriangle },
      INACTIVE: { label: 'Inativa', variant: 'outline', icon: AlertTriangle },
    };

    const config = statusConfig[subscription.status] || statusConfig.INACTIVE;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  // Loading state
  if (isLoadingSubscription || isLoadingUsage) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Safe access to plan price
  const planPrice = plan?.price ?? 0;
  const planName = plan?.name ?? 'Plano';

  if (!hasActiveSubscription) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Assinatura</h1>
          <p className="text-muted-foreground">Gerencie seu plano e assinatura</p>
        </div>

        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Sparkles className="mb-4 h-12 w-12 text-muted-foreground/50" />
            <h3 className="text-lg font-semibold">Você não possui uma assinatura ativa</h3>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
              Escolha um plano para começar a usar todas as funcionalidades do ZapAgenda.
            </p>
            <Button asChild className="mt-6">
              <Link href="/pricing">
                Ver Planos
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Assinatura</h1>
        <p className="text-muted-foreground">Gerencie seu plano e assinatura</p>
      </div>

      {/* Trial Alert */}
      {isTrialing && trialEndsAt && (
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center">
            <Clock className="h-5 w-5 text-primary" />
            <div className="flex-1">
              <p className="font-medium">Periodo de Teste - {trialDaysRemaining} dias restantes</p>
              <p className="text-sm text-muted-foreground">
                Seu teste gratuito termina em {formatDate(trialEndsAt)}
              </p>
            </div>
            <Button size="sm" onClick={handleConvertToPaid} disabled={isConverting}>
              {isConverting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processando...
                </>
              ) : (
                'Assinar Agora'
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Current Plan */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Plano Atual</CardTitle>
              <CardDescription>Detalhes do seu plano e período de cobrança</CardDescription>
            </div>
            {getStatusBadge()}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Package className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="font-semibold">{planName}</p>
                <p className="text-sm text-muted-foreground">
                  R$ {planPrice.toFixed(2).replace('.', ',')}/mes
                </p>
              </div>
            </div>
            <Button variant="outline" asChild>
              <Link href="/pricing">Alterar Plano</Link>
            </Button>
          </div>

          <Separator />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Início do período</p>
                <p className="font-medium">
                  {subscription?.startDate ? formatDate(subscription.startDate) : '-'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Próxima cobrança</p>
                <p className="font-medium">
                  {subscription?.endDate ? formatDate(subscription.endDate) : '-'}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Usage */}
      <Card>
        <CardHeader>
          <CardTitle>Uso do Plano</CardTitle>
          <CardDescription>Acompanhe o uso dos recursos do seu plano</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Professionals */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span>Profissionais</span>
              </div>
              <span className="text-muted-foreground">
                {usage.professionals} / {(limits.professionals ?? 0) >= 999 ? 'Ilimitado' : limits.professionals}
              </span>
            </div>
            {(limits.professionals ?? 0) < 999 && (
              <Progress value={percentUsed.professionals ?? 0} className="h-2" />
            )}
          </div>

          {/* Services */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                <span>Servicos</span>
              </div>
              <span className="text-muted-foreground">
                {usage.services} / {(limits.services ?? 0) >= 999 ? 'Ilimitado' : limits.services}
              </span>
            </div>
            {(limits.services ?? 0) < 999 && (
              <Progress value={percentUsed.services ?? 0} className="h-2" />
            )}
          </div>

          {/* Appointments */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>Agendamentos este mes</span>
              </div>
              <span className="text-muted-foreground">
                {usage.appointmentsThisMonth} / {(limits.appointments ?? 0) >= 999999 ? 'Ilimitado' : limits.appointments}
              </span>
            </div>
            {(limits.appointments ?? 0) < 999999 && (
              <Progress value={percentUsed.appointments ?? 0} className="h-2" />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Cancel Subscription */}
      <Card className="border-destructive/20">
        <CardHeader>
          <CardTitle className="text-destructive">Cancelar Assinatura</CardTitle>
          <CardDescription>
            Ao cancelar, você perderá acesso aos recursos premium ao final do período atual.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={isCancelling}>
                {isCancelling ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Cancelando...
                  </>
                ) : (
                  'Cancelar Assinatura'
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Tem certeza que deseja cancelar?</AlertDialogTitle>
                <AlertDialogDescription>
                  Sua assinatura permanecerá ativa até o final do período atual. Após isso, você perderá acesso aos recursos premium e seus dados serão mantidos por 30 dias.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Voltar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleCancelSubscription}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Confirmar Cancelamento
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}
