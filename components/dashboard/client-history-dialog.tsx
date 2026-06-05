'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarClock, Loader2, AlertCircle, Clock, Scissors, User } from 'lucide-react';
import { clientsApi } from '@/lib/api';
import { offlineAppointmentsApi as appointmentsApi } from '@/lib/offline/api-wrapper';
import { cn } from '@/lib/utils';
import type { AppointmentStatus, Client } from '@/types';

const statusLabels: Record<AppointmentStatus, string> = {
  PENDING: 'Pendente',
  CONFIRMED: 'Confirmado',
  COMPLETED: 'Concluído',
  CANCELLED: 'Cancelado',
  NO_SHOW: 'Não compareceu',
};

const statusDotClasses: Record<AppointmentStatus, string> = {
  PENDING: 'bg-amber-500',
  CONFIRMED: 'bg-primary',
  COMPLETED: 'bg-emerald-500',
  CANCELLED: 'bg-destructive',
  NO_SHOW: 'bg-muted-foreground',
};

const statusOrder: AppointmentStatus[] = ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'];

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

// Converte timestamp ISO ("1970-01-01T14:30:00.000Z") ou "HH:mm" para "HH:mm"
function formatTime(time: string) {
  if (!time) return '';
  if (time.includes('T')) {
    return time.split('T')[1].substring(0, 5);
  }
  return time;
}

interface ClientHistoryDialogProps {
  client: Client;
}

export function ClientHistoryDialog({ client }: ClientHistoryDialogProps) {
  const [open, setOpen] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const { data, error, isLoading, mutate } = useSWR(
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

  const handleStatusChange = async (appointmentId: string, newStatus: string) => {
    setUpdatingId(appointmentId);
    try {
      const result = await appointmentsApi.updateStatus(appointmentId, newStatus);
      if (result.success) {
        toast.success('Status atualizado!');
        await mutate();
      } else {
        toast.error(result.error || 'Erro ao atualizar status');
      }
    } catch {
      toast.error('Erro ao atualizar status');
    } finally {
      setUpdatingId(null);
    }
  };

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
                      <div className="min-w-0 space-y-1.5">
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
                            {format(new Date(appointment.date), 'dd/MM/yyyy', { locale: ptBR })} às{' '}
                            {formatTime(appointment.startTime)}
                          </span>
                        </div>
                      </div>
                      <span className="shrink-0 text-sm font-semibold text-foreground">
                        {formatCurrency(appointment.price)}
                      </span>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-2 border-t pt-3">
                      <span className="text-xs text-muted-foreground">Status</span>
                      <Select
                        value={appointment.status}
                        onValueChange={(value) => handleStatusChange(appointment.id, value)}
                        disabled={updatingId === appointment.id}
                      >
                        <SelectTrigger className="h-8 w-[170px]">
                          {updatingId === appointment.id ? (
                            <span className="flex items-center gap-2 text-sm">
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              Atualizando...
                            </span>
                          ) : (
                            <SelectValue />
                          )}
                        </SelectTrigger>
                        <SelectContent>
                          {statusOrder.map((status) => (
                            <SelectItem key={status} value={status}>
                              <span className="flex items-center gap-2">
                                <span className={cn('h-2 w-2 rounded-full', statusDotClasses[status])} />
                                {statusLabels[status]}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
