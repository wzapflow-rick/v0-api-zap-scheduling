'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { CalendarClock, Loader2, AlertCircle, Clock, Scissors, User } from 'lucide-react';
import { clientsApi } from '@/lib/api';
import type { AppointmentStatus, Client } from '@/types';

const statusLabels: Record<AppointmentStatus, string> = {
  PENDING: 'Pendente',
  CONFIRMED: 'Confirmado',
  COMPLETED: 'Concluído',
  CANCELLED: 'Cancelado',
  NO_SHOW: 'Não compareceu',
};

const statusClasses: Record<AppointmentStatus, string> = {
  PENDING: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-transparent',
  CONFIRMED: 'bg-primary/10 text-primary border-transparent',
  COMPLETED: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-transparent',
  CANCELLED: 'bg-destructive/10 text-destructive border-transparent',
  NO_SHOW: 'bg-muted text-muted-foreground border-transparent',
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

interface ClientHistoryDialogProps {
  client: Client;
}

export function ClientHistoryDialog({ client }: ClientHistoryDialogProps) {
  const [open, setOpen] = useState(false);

  const { data, error, isLoading } = useSWR(
    open ? ['client-history', client.id] : null,
    async () => {
      const res = await clientsApi.history(client.id);
      if (!res.success) throw new Error(res.error || 'Erro');
      return res.data;
    },
    { revalidateOnFocus: false, shouldRetryOnError: false }
  );

  const appointments = data?.appointments ?? [];
  const stats = data?.stats;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <CalendarClock className="h-4 w-4" />
          <span className="sr-only">Ver agendamentos</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Agendamentos de {client.name}</DialogTitle>
          <DialogDescription>Histórico de agendamentos deste cliente</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <p className="text-sm text-muted-foreground">
              Não foi possível carregar o histórico. Tente novamente mais tarde.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {stats && (
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg border bg-card p-3 text-center">
                  <p className="text-lg font-semibold text-foreground">{stats.totalAppointments}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
                <div className="rounded-lg border bg-card p-3 text-center">
                  <p className="text-lg font-semibold text-foreground">{stats.completedAppointments}</p>
                  <p className="text-xs text-muted-foreground">Concluídos</p>
                </div>
                <div className="rounded-lg border bg-card p-3 text-center">
                  <p className="text-lg font-semibold text-foreground">{formatCurrency(stats.totalSpent)}</p>
                  <p className="text-xs text-muted-foreground">Gasto total</p>
                </div>
              </div>
            )}

            {appointments.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
                <CalendarClock className="h-8 w-8 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">Nenhum agendamento encontrado</p>
              </div>
            ) : (
              <div className="space-y-3">
                {appointments.map((appointment) => (
                  <div key={appointment.id} className="rounded-lg border bg-card p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                          <Scissors className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <span className="truncate">{appointment.service?.name || 'Serviço'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <User className="h-4 w-4 shrink-0" />
                          <span className="truncate">{appointment.professional?.name || '-'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4 shrink-0" />
                          <span>
                            {format(new Date(appointment.date), "dd/MM/yyyy", { locale: ptBR })} às{' '}
                            {appointment.startTime}
                          </span>
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-2">
                        <Badge className={statusClasses[appointment.status]}>
                          {statusLabels[appointment.status]}
                        </Badge>
                        <span className="text-sm font-medium text-foreground">
                          {formatCurrency(appointment.price)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
