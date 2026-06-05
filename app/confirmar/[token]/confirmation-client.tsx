'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { publicApi } from '@/lib/api';
import type { PublicConfirmation, PublicConfirmationStatus } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  CalendarCheck,
  CalendarClock,
  CalendarX,
  CheckCircle2,
  Clock,
  Loader2,
  Scissors,
  User,
  XCircle,
} from 'lucide-react';

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  // Aceita "YYYY-MM-DD" ou ISO completo
  const datePart = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
  const [year, month, day] = datePart.split('-');
  if (!year || !month || !day) return dateStr;
  return `${day}/${month}/${year}`;
}

function formatTime(timeStr: string): string {
  if (!timeStr) return '';
  // Aceita ISO completo, "HH:mm:ss" ou "HH:mm"
  if (timeStr.includes('T')) {
    const match = timeStr.match(/T(\d{2}:\d{2})/);
    if (match) return match[1];
  }
  return timeStr.slice(0, 5);
}

const STATUS_VIEW: Record<
  Exclude<PublicConfirmationStatus, 'pending'>,
  { icon: typeof CheckCircle2; title: string; description: string; tone: string }
> = {
  confirmed: {
    icon: CheckCircle2,
    title: 'Presença confirmada!',
    description: 'Obrigado por confirmar. Te esperamos no horário marcado.',
    tone: 'text-primary',
  },
  declined: {
    icon: XCircle,
    title: 'Agendamento recusado',
    description: 'Avisamos o estabelecimento que você não poderá comparecer. Obrigado por avisar!',
    tone: 'text-muted-foreground',
  },
  cancelled: {
    icon: CalendarX,
    title: 'Agendamento cancelado',
    description: 'Este agendamento foi cancelado por falta de confirmação. Caso queira, agende novamente.',
    tone: 'text-destructive',
  },
  expired: {
    icon: CalendarClock,
    title: 'Link expirado',
    description: 'O prazo para confirmar este agendamento terminou.',
    tone: 'text-muted-foreground',
  },
  not_found: {
    icon: CalendarX,
    title: 'Link inválido',
    description: 'Não encontramos este agendamento. Verifique o link recebido.',
    tone: 'text-muted-foreground',
  },
};

export function ConfirmationClient({ token }: { token: string }) {
  const { data, error, isLoading, mutate } = useSWR(
    ['confirmation', token],
    async () => {
      const res = await publicApi.getConfirmation(token);
      if (!res.success || !res.data) {
        // Trata 404 como not_found em vez de erro genérico
        if (res.status === 404) {
          return { status: 'not_found' } as PublicConfirmation;
        }
        throw new Error(res.error || 'Erro ao carregar');
      }
      return res.data;
    },
    { revalidateOnFocus: false }
  );

  const [action, setAction] = useState<null | 'confirm' | 'decline'>(null);

  async function handleConfirm() {
    setAction('confirm');
    const res = await publicApi.confirmAppointment(token);
    setAction(null);
    if (res.success) {
      mutate({ ...(data as PublicConfirmation), status: 'confirmed' }, { revalidate: false });
    }
  }

  async function handleDecline() {
    setAction('decline');
    const res = await publicApi.declineAppointment(token);
    setAction(null);
    if (res.success) {
      mutate({ ...(data as PublicConfirmation), status: 'declined' }, { revalidate: false });
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-background px-4 py-10">
      <Card className="w-full max-w-md">
        {isLoading ? (
          <CardContent className="flex flex-col items-center gap-3 py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Carregando agendamento...</p>
          </CardContent>
        ) : error ? (
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <CalendarX className="h-10 w-10 text-destructive" />
            <p className="text-base font-medium text-foreground">Não foi possível carregar</p>
            <p className="text-sm text-muted-foreground">
              Tente novamente em instantes ou confira o link recebido.
            </p>
            <Button variant="outline" onClick={() => mutate()}>
              Tentar novamente
            </Button>
          </CardContent>
        ) : data && data.status === 'pending' ? (
          <>
            <CardHeader className="items-center text-center">
              <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <CalendarCheck className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-balance text-xl">Confirme o seu agendamento</CardTitle>
              <p className="text-pretty text-sm text-muted-foreground">
                {data.establishmentName
                  ? `Olá, ${data.clientName}! Você confirma a sua presença no ${data.establishmentName}?`
                  : `Olá, ${data.clientName}! Você confirma a sua presença?`}
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3 rounded-lg border border-border bg-muted/40 p-4">
                <div className="flex items-center gap-3 text-sm">
                  <Scissors className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="font-medium text-foreground">{data.serviceName}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <User className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="text-foreground">{data.professionalName}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="text-foreground">
                    {formatDate(data.date)} às {formatTime(data.startTime)}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <Button size="lg" onClick={handleConfirm} disabled={action !== null}>
                  {action === 'confirm' ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                  )}
                  Sim, vou comparecer
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={handleDecline}
                  disabled={action !== null}
                >
                  {action === 'decline' ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <XCircle className="mr-2 h-4 w-4" />
                  )}
                  Não poderei ir
                </Button>
              </div>
            </CardContent>
          </>
        ) : (
          (() => {
            const view = STATUS_VIEW[(data?.status as Exclude<PublicConfirmationStatus, 'pending'>) || 'not_found'];
            const Icon = view.icon;
            return (
              <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
                <div className="mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                  <Icon className={`h-7 w-7 ${view.tone}`} />
                </div>
                <p className="text-balance text-lg font-semibold text-foreground">{view.title}</p>
                <p className="text-pretty text-sm text-muted-foreground">{view.description}</p>
                {data && data.status !== 'not_found' && data.serviceName && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    {data.serviceName} — {formatDate(data.date)} às {formatTime(data.startTime)}
                  </p>
                )}
              </CardContent>
            );
          })()
        )}
      </Card>
    </div>
  );
}
