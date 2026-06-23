'use client';

import { useState, useMemo } from 'react';
import useSWR from 'swr';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Clock, User, Loader2, AlertCircle, Check, X, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { offlineAppointmentsApi as appointmentsApi, offlineProfessionalsApi as professionalsApi } from '@/lib/offline/api-wrapper';
import { sendMessageWithDebug, getMessageTypeForStatus, USE_BACKEND_MESSAGES } from '@/lib/message-service';
import type { Appointment, AppointmentStatus, Professional } from '@/types';
import { cn } from '@/lib/utils';
import { AppointmentForm } from '@/components/dashboard/appointment-form';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useAuth } from '@/lib/auth-context';
import { useAutoMessagesConfig } from '@/contexts/auto-messages-context';
import { AgendamentosSkeleton } from '@/components/skeletons/dashboard-skeleton';
import { useBusiness } from '@/hooks/use-business';

const statusColors: Record<AppointmentStatus, string> = {
  PENDING: 'bg-warning text-warning-foreground',
  CONFIRMED: 'bg-primary text-primary-foreground',
  COMPLETED: 'bg-success text-success-foreground',
  CANCELLED: 'bg-destructive/50 text-destructive-foreground',
  NO_SHOW: 'bg-muted text-muted-foreground',
};

const statusLabels: Record<AppointmentStatus, string> = {
  PENDING: 'Pendente',
  CONFIRMED: 'Confirmado',
  COMPLETED: 'Concluído',
  CANCELLED: 'Cancelado',
  NO_SHOW: 'Não compareceu',
};

// Safe fetchers that handle API errors gracefully
const appointmentsFetcher = async (key: [string, string, string, string, string]) => {
  const [, startDate, endDate, professionalFilter, statusFilter] = key;
  const res = await appointmentsApi.list({
    startDate,
    endDate,
    limit: 500,
    professionalId: professionalFilter !== 'all' ? professionalFilter : undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
  });
  if (!res.success) {
    return [];
  }
  // API returns { success: true, data: { appointments: [...] } }
  // Handle both formats: direct array or nested in appointments property
  const data = res.data as any;
  if (Array.isArray(data)) {
    return data;
  }
  if (data?.appointments && Array.isArray(data.appointments)) {
    return data.appointments;
  }
  return [];
};

const professionalsFetcher = async () => {
  const res = await professionalsApi.list({ limit: 100 });
  if (!res.success) {
    return [];
  }
  // Handle both formats: direct array or nested in professionals property
  const data = res.data as any;
  if (Array.isArray(data)) {
    return data;
  }
  if (data?.professionals && Array.isArray(data.professionals)) {
    return data.professionals;
  }
  return [];
};

export default function AgendamentosPage() {
  const { user } = useAuth();
  const { getBusinessLabel } = useBusiness();
  const appointmentPlural = getBusinessLabel('appointment', { plural: true });
  const { instanceName: configInstanceName } = useAutoMessagesConfig();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [professionalFilter, setProfessionalFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const updateAppointmentStatus = async (appointmentId: string, newStatus: AppointmentStatus) => {
    setUpdatingId(appointmentId);
    try {
      const result = await appointmentsApi.updateStatus(appointmentId, newStatus);
      if (result.success) {
        toast.success(`Status atualizado para ${statusLabels[newStatus]}`);
        
        // Send WhatsApp message if not using backend messages
        if (!USE_BACKEND_MESSAGES) {
          const messageType = getMessageTypeForStatus(newStatus);
          const appointment = appointments.find((a: Appointment) => a.id === appointmentId);
          
          if (messageType && appointment && appointment.client?.phone && configInstanceName) {
            await sendMessageWithDebug({
              messageType,
              instanceName: configInstanceName,
              appointmentData: {
                clientName: appointment.client.name,
                clientPhone: appointment.client.phone,
                date: format(new Date(appointment.date), 'dd/MM/yyyy'),
                time: appointment.startTime,
                serviceName: appointment.service?.name || 'Serviço',
                professionalName: appointment.professional?.name || 'Profissional',
              },
            });
          }
        }
        
        mutate();
      } else {
        toast.error(result.error || 'Erro ao atualizar status');
      }
    } catch {
      toast.error('Erro ao conectar com o servidor');
    } finally {
      setUpdatingId(null);
    }
  };

  const startDate = format(startOfMonth(currentDate), 'yyyy-MM-dd');
  const endDate = format(endOfMonth(currentDate), 'yyyy-MM-dd');

  const { data: appointmentsData, error: appointmentsError, isLoading: isLoadingAppointments, mutate } = useSWR(
    ['appointments', startDate, endDate, professionalFilter, statusFilter],
    appointmentsFetcher,
    {
      revalidateOnFocus: false,
      shouldRetryOnError: false,
    }
  );

  const { data: professionalsData, error: professionalsError, isLoading: isLoadingProfessionals } = useSWR(
    'professionals-list',
    professionalsFetcher,
    {
      revalidateOnFocus: false,
      shouldRetryOnError: false,
    }
  );

  const appointments = Array.isArray(appointmentsData) ? appointmentsData : [];
  const professionals = Array.isArray(professionalsData) ? professionalsData : [];

  const isLoading = isLoadingAppointments || isLoadingProfessionals;
  const hasError = appointmentsError || professionalsError;

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart, { locale: ptBR });
    const calendarEnd = endOfWeek(monthEnd, { locale: ptBR });
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentDate]);

  // Group appointments by date
  const appointmentsByDate = useMemo(() => {
    const grouped: Record<string, Appointment[]> = {};
    appointments.forEach((apt: Appointment) => {
      // Normalize date to yyyy-MM-dd format (API returns ISO timestamp like "2026-05-09T00:00:00.000Z")
      const dateKey = apt.date.split('T')[0];
      if (!grouped[dateKey]) grouped[dateKey] = [];
      grouped[dateKey].push(apt);
    });
    return grouped;
  }, [appointments]);

  const selectedDayAppointments = selectedDate
    ? appointmentsByDate[format(selectedDate, 'yyyy-MM-dd')] || []
    : [];

  // Show loading state
  if (isLoading) {
    return <AgendamentosSkeleton />;
  }

  // Show error state
  if (hasError) {
    return (
      <Alert variant="destructive" className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Erro ao carregar dados</AlertTitle>
        <AlertDescription>
          Não foi possível carregar os agendamentos. Por favor, tente novamente mais tarde.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{appointmentPlural}</h1>
          <p className="text-muted-foreground">Gerencie seus {appointmentPlural.toLowerCase()}</p>
        </div>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Novo Agendamento
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Novo Agendamento</DialogTitle>
              <DialogDescription>Preencha os dados para criar um novo agendamento</DialogDescription>
            </DialogHeader>
            <AppointmentForm
              onSuccess={() => {
                setIsFormOpen(false);
                mutate();
              }}
              initialDate={selectedDate || undefined}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:gap-4">
        <Select value={professionalFilter} onValueChange={setProfessionalFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Profissional" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os profissionais</SelectItem>
            {professionals.map((pro: Professional) => (
              <SelectItem key={pro.id} value={pro.id}>{pro.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="PENDING">Pendente</SelectItem>
            <SelectItem value="CONFIRMED">Confirmado</SelectItem>
            <SelectItem value="COMPLETED">Concluído</SelectItem>
            <SelectItem value="CANCELLED">Cancelado</SelectItem>
            <SelectItem value="NO_SHOW">Não compareceu</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Calendar */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-col gap-3 pb-2 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="capitalize">{format(currentDate, 'MMMM yyyy', { locale: ptBR })}</CardTitle>
            <div className="flex items-center justify-between gap-2 sm:justify-end">
              <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => setCurrentDate(subMonths(currentDate, 1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
                Hoje
              </Button>
              <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => setCurrentDate(addMonths(currentDate, 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Weekday headers */}
            <div className="mb-2 grid grid-cols-7 gap-1">
              {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, i) => (
                <div key={i} className="py-2 text-center text-xs sm:text-sm font-medium text-muted-foreground">
                  <span className="sm:hidden">{day}</span>
                  <span className="hidden sm:inline">{['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][i]}</span>
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day) => {
                const dateKey = format(day, 'yyyy-MM-dd');
                const dayAppointments = appointmentsByDate[dateKey] || [];
                const isCurrentMonth = isSameMonth(day, currentDate);
                const isSelected = selectedDate && isSameDay(day, selectedDate);
                const isTodayDate = isToday(day);

                return (
                  <button
                    key={dateKey}
                    onClick={() => setSelectedDate(day)}
                    className={cn(
                      'relative flex min-h-[60px] sm:min-h-[80px] flex-col items-start rounded-lg border p-1 sm:p-2 text-left transition-colors',
                      isCurrentMonth ? 'bg-card' : 'bg-muted/30',
                      isSelected && 'border-primary ring-1 ring-primary',
                      !isSelected && 'border-border hover:border-primary/50',
                      isTodayDate && 'bg-primary/5'
                    )}
                  >
                    <span
                      className={cn(
                        'text-sm font-medium',
                        !isCurrentMonth && 'text-muted-foreground',
                        isTodayDate && 'text-primary'
                      )}
                    >
                      {format(day, 'd')}
                    </span>
                    {dayAppointments.length > 0 && (
                      <div className="mt-auto flex w-full items-center justify-center">
                        <span className={cn(
                          'flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs font-medium',
                          'bg-primary text-primary-foreground'
                        )}>
                          {dayAppointments.length}
                        </span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Selected Day Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              {selectedDate
                ? format(selectedDate, "d 'de' MMMM", { locale: ptBR })
                : 'Selecione um dia'}
            </CardTitle>
            <CardDescription>
              {selectedDayAppointments.length} agendamento(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selectedDate ? (
              selectedDayAppointments.length > 0 ? (
                <div className="space-y-3">
                  {selectedDayAppointments
                    .sort((a: Appointment, b: Appointment) => a.startTime.localeCompare(b.startTime))
                    .map((apt: Appointment) => {
                      // Format time from ISO timestamp ("1970-01-01T12:00:00.000Z") to "HH:mm"
                      const formatTime = (time: string) => {
                        if (time.includes('T')) {
                          return time.split('T')[1].substring(0, 5);
                        }
                        return time;
                      };
                      const isUpdating = updatingId === apt.id;
                      
                      return (
                      <div
                        key={apt.id}
                        className="rounded-lg border border-border p-3 transition-colors hover:border-primary/50"
                      >
                        <Link href={`/dashboard/agendamentos/${apt.id}`}>
                          <div className="mb-2 flex items-center justify-between">
                            <span className="flex items-center gap-1 text-sm font-medium">
                              <Clock className="h-3 w-3" />
                              {formatTime(apt.startTime)} - {formatTime(apt.endTime)}
                            </span>
                            <Badge className={cn('text-xs', statusColors[apt.status])}>
                              {statusLabels[apt.status]}
                            </Badge>
                          </div>
                          <p className="font-medium text-foreground">{apt.client.name}</p>
                          <p className="text-sm text-muted-foreground">{apt.service.name}</p>
                          <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                            <User className="h-3 w-3" />
                            {apt.professional.name}
                          </p>
                        </Link>
                        
                        {/* Quick Action Buttons */}
                        {apt.status === 'PENDING' && (
                          <div className="mt-3 flex gap-2 border-t border-border pt-3">
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                              onClick={() => updateAppointmentStatus(apt.id, 'CANCELLED')}
                              disabled={isUpdating}
                            >
                              {isUpdating ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <X className="mr-1 h-3 w-3" />}
                              Cancelar
                            </Button>
                            <Button
                              size="sm"
                              className="flex-1"
                              onClick={() => updateAppointmentStatus(apt.id, 'CONFIRMED')}
                              disabled={isUpdating}
                            >
                              {isUpdating ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Check className="mr-1 h-3 w-3" />}
                              Confirmar
                            </Button>
                          </div>
                        )}
                        
                        {apt.status === 'CONFIRMED' && (
                          <div className="mt-3 border-t border-border pt-3">
                            <Button
                              size="sm"
                              className="w-full bg-success hover:bg-success/90"
                              onClick={() => updateAppointmentStatus(apt.id, 'COMPLETED')}
                              disabled={isUpdating}
                            >
                              {isUpdating ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <CheckCircle className="mr-1 h-3 w-3" />}
                              Marcar como Concluído
                            </Button>
                          </div>
                        )}
                      </div>
                    );})}
                </div>
              ) : (
                <div className="py-8 text-center">
                  <CalendarIcon className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">Nenhum agendamento</p>
                  <Button
                    variant="link"
                    size="sm"
                    className="mt-2"
                    onClick={() => setIsFormOpen(true)}
                  >
                    Criar agendamento
                  </Button>
                </div>
              )
            ) : (
              <div className="py-8 text-center">
                <CalendarIcon className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  Clique em um dia para ver os detalhes
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
