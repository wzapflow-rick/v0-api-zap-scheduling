'use client';

import useSWR from 'swr';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Users, DollarSign, TrendingUp, Plus, Clock, Loader2, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { establishmentApi, appointmentsApi } from '@/lib/api';
import type { Appointment, AppointmentStatus } from '@/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const statusColors: Record<AppointmentStatus, string> = {
  PENDING: 'bg-warning/10 text-warning border-warning/20',
  CONFIRMED: 'bg-primary/10 text-primary border-primary/20',
  COMPLETED: 'bg-success/10 text-success border-success/20',
  CANCELLED: 'bg-destructive/10 text-destructive border-destructive/20',
  NO_SHOW: 'bg-muted text-muted-foreground border-muted',
};

const statusLabels: Record<AppointmentStatus, string> = {
  PENDING: 'Pendente',
  CONFIRMED: 'Confirmado',
  COMPLETED: 'Concluído',
  CANCELLED: 'Cancelado',
  NO_SHOW: 'Não compareceu',
};

// Safe fetcher that handles API errors gracefully
const establishmentFetcher = async () => {
  const res = await establishmentApi.get();
  if (!res.success) {
    console.log('[v0] Establishment API error:', res.error);
    return null;
  }
  return res.data;
};

const appointmentsFetcher = async (key: [string, string]) => {
  const [, date] = key;
  const res = await appointmentsApi.list({ startDate: date, endDate: date, limit: 100 });
  if (!res.success) {
    console.log('[v0] Appointments API error:', res.error);
    return [];
  }
  return res.data || [];
};

export default function DashboardPage() {
  const { data: establishmentData, error: establishmentError, isLoading: isLoadingEstablishment } = useSWR(
    'establishment',
    establishmentFetcher,
    { 
      revalidateOnFocus: false,
      shouldRetryOnError: false,
    }
  );

  const today = format(new Date(), 'yyyy-MM-dd');
  const { data: appointmentsData, error: appointmentsError, isLoading: isLoadingAppointments } = useSWR(
    ['appointments', today],
    appointmentsFetcher,
    { 
      revalidateOnFocus: false,
      shouldRetryOnError: false,
    }
  );

  const isLoading = isLoadingEstablishment || isLoadingAppointments;
  const hasError = establishmentError || appointmentsError;

  const todayAppointments = Array.isArray(appointmentsData) ? appointmentsData : [];
  const stats = establishmentData?._count;

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show error state if API fails
  if (hasError) {
    return (
      <Alert variant="destructive" className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Erro ao carregar dados</AlertTitle>
        <AlertDescription>
          Não foi possível carregar os dados do dashboard. Por favor, tente novamente mais tarde.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">
            {format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/agendamentos/novo">
            <Plus className="mr-2 h-4 w-4" />
            Novo Agendamento
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Agendamentos Hoje
            </CardTitle>
            <Calendar className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayAppointments.length}</div>
            <p className="text-xs text-muted-foreground">
              {todayAppointments.filter((a: Appointment) => a.status === 'CONFIRMED').length} confirmados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Clientes
            </CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.clients || 0}</div>
            <p className="text-xs text-muted-foreground">cadastrados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Faturamento Hoje
            </CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                todayAppointments
                  .filter((a: Appointment) => a.status === 'COMPLETED')
                  .reduce((sum: number, a: Appointment) => sum + a.price, 0)
              )}
            </div>
            <p className="text-xs text-muted-foreground">em serviços concluídos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Agendamentos
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.appointments || 0}</div>
            <p className="text-xs text-muted-foreground">no total</p>
          </CardContent>
        </Card>
      </div>

      {/* Today's Appointments */}
      <Card>
        <CardHeader>
          <CardTitle>Agendamentos de Hoje</CardTitle>
          <CardDescription>
            Acompanhe os agendamentos do dia
          </CardDescription>
        </CardHeader>
        <CardContent>
          {todayAppointments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Calendar className="mb-4 h-12 w-12 text-muted-foreground/50" />
              <p className="text-muted-foreground">Nenhum agendamento para hoje</p>
              <Button asChild variant="link" className="mt-2">
                <Link href="/dashboard/agendamentos/novo">Criar agendamento</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {todayAppointments.map((appointment: Appointment) => (
                <div
                  key={appointment.id}
                  className="flex items-center justify-between rounded-lg border border-border p-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Clock className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{appointment.client.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {appointment.service.name} com {appointment.professional.name}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-medium">
                        {appointment.startTime} - {appointment.endTime}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(appointment.price)}
                      </p>
                    </div>
                    <Badge variant="outline" className={statusColors[appointment.status]}>
                      {statusLabels[appointment.status]}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="cursor-pointer transition-all hover:border-primary/50 hover:shadow-md">
          <Link href="/dashboard/agendamentos">
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Calendar className="h-6 w-6" />
              </div>
              <div>
                <p className="font-medium">Ver Agenda</p>
                <p className="text-sm text-muted-foreground">Calendário completo</p>
              </div>
            </CardContent>
          </Link>
        </Card>

        <Card className="cursor-pointer transition-all hover:border-primary/50 hover:shadow-md">
          <Link href="/dashboard/clientes/novo">
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <p className="font-medium">Novo Cliente</p>
                <p className="text-sm text-muted-foreground">Cadastrar cliente</p>
              </div>
            </CardContent>
          </Link>
        </Card>

        <Card className="cursor-pointer transition-all hover:border-primary/50 hover:shadow-md">
          <Link href="/dashboard/servicos">
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <DollarSign className="h-6 w-6" />
              </div>
              <div>
                <p className="font-medium">Serviços</p>
                <p className="text-sm text-muted-foreground">Gerenciar preços</p>
              </div>
            </CardContent>
          </Link>
        </Card>

        <Card className="cursor-pointer transition-all hover:border-primary/50 hover:shadow-md">
          <Link href="/dashboard/configuracoes">
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <TrendingUp className="h-6 w-6" />
              </div>
              <div>
                <p className="font-medium">Configurações</p>
                <p className="text-sm text-muted-foreground">Horários e mais</p>
              </div>
            </CardContent>
          </Link>
        </Card>
      </div>
    </div>
  );
}
