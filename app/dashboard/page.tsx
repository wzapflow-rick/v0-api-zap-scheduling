'use client';

import { useState, useMemo } from 'react';
import useSWR from 'swr';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, subMonths, eachDayOfInterval, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, 
  Users, 
  DollarSign, 
  TrendingUp, 
  Plus, 
  Clock, 
  Loader2, 
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  Star,
  BarChart3
} from 'lucide-react';
import Link from 'next/link';
import { establishmentApi, appointmentsApi, clientsApi } from '@/lib/api';
import type { Appointment, AppointmentStatus, Client } from '@/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';

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

// Fetchers
const establishmentFetcher = async () => {
  const res = await establishmentApi.get();
  if (!res.success) return null;
  return res.data;
};

const monthlyAppointmentsFetcher = async (key: [string, string, string]) => {
  const [, startDate, endDate] = key;
  const res = await appointmentsApi.list({ startDate, endDate, limit: 1000 });
  if (!res.success) return [];
  // Handle both array and object with appointments property
  const data = res.data;
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.appointments)) return data.appointments;
  return [];
};

const clientsFetcher = async () => {
  const res = await clientsApi.list({ limit: 1000 });
  if (!res.success) return [];
  // Handle both array and object with clients property
  const data = res.data;
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.clients)) return data.clients;
  return [];
};

export default function DashboardPage() {
  const [chartPeriod, setChartPeriod] = useState<'weekly' | 'monthly'>('weekly');
  
  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');
  
  // Current month range
  const monthStart = format(startOfMonth(today), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(today), 'yyyy-MM-dd');
  
  // Previous month range (for comparison)
  const prevMonthStart = format(startOfMonth(subMonths(today, 1)), 'yyyy-MM-dd');
  const prevMonthEnd = format(endOfMonth(subMonths(today, 1)), 'yyyy-MM-dd');
  
  // Week range for chart
  const weekStart = format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const weekEnd = format(endOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd');

  // Fetch establishment data
  const { data: establishment, isLoading: isLoadingEstablishment } = useSWR(
    'establishment',
    establishmentFetcher,
    { revalidateOnFocus: false }
  );

  // Fetch current month appointments
  const { data: monthlyAppointments, isLoading: isLoadingMonthly } = useSWR(
    ['appointments-monthly', monthStart, monthEnd],
    monthlyAppointmentsFetcher,
    { revalidateOnFocus: false }
  );

  // Fetch previous month appointments (for comparison)
  const { data: prevMonthAppointments } = useSWR(
    ['appointments-prev-month', prevMonthStart, prevMonthEnd],
    monthlyAppointmentsFetcher,
    { revalidateOnFocus: false }
  );

  // Fetch clients
  const { data: clients, isLoading: isLoadingClients } = useSWR(
    'clients-all',
    clientsFetcher,
    { revalidateOnFocus: false }
  );

  const isLoading = isLoadingEstablishment || isLoadingMonthly || isLoadingClients;

  // Calculate metrics
  const metrics = useMemo(() => {
    const allAppointments = monthlyAppointments || [];
    const prevAppointments = prevMonthAppointments || [];
    const allClients = clients || [];
    
    // Today's appointments
    const todayAppointments = allAppointments.filter((a: Appointment) => 
      a.date === todayStr || (a.date && a.date.startsWith(todayStr))
    );
    
    // Monthly revenue (completed appointments)
    const monthlyRevenue = allAppointments
      .filter((a: Appointment) => a.status === 'COMPLETED')
      .reduce((sum: number, a: Appointment) => sum + (parseFloat(String(a.price)) || 0), 0);
    
    // Previous month revenue
    const prevMonthRevenue = prevAppointments
      .filter((a: Appointment) => a.status === 'COMPLETED')
      .reduce((sum: number, a: Appointment) => sum + (parseFloat(String(a.price)) || 0), 0);
    
    // Revenue change percentage
    const revenueChange = prevMonthRevenue > 0 
      ? ((monthlyRevenue - prevMonthRevenue) / prevMonthRevenue) * 100 
      : 0;
    
    // New clients this month
    const thisMonthClients = allClients.filter((c: Client) => {
      if (!c.createdAt) return false;
      const createdDate = new Date(c.createdAt);
      return createdDate >= new Date(monthStart) && createdDate <= new Date(monthEnd);
    });
    
    // New clients last week
    const lastWeekClients = allClients.filter((c: Client) => {
      if (!c.createdAt) return false;
      const createdDate = new Date(c.createdAt);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return createdDate >= weekAgo;
    });
    
    // Average ticket
    const completedAppointments = allAppointments.filter((a: Appointment) => a.status === 'COMPLETED');
    const avgTicket = completedAppointments.length > 0 
      ? monthlyRevenue / completedAppointments.length 
      : 0;
    
    // Slots available today
    const confirmedToday = todayAppointments.filter((a: Appointment) => 
      a.status === 'CONFIRMED' || a.status === 'PENDING'
    ).length;
    
    return {
      monthlyRevenue,
      revenueChange,
      todayAppointmentsCount: todayAppointments.length,
      confirmedToday,
      newClientsCount: thisMonthClients.length,
      newClientsWeek: lastWeekClients.length,
      avgTicket,
      completedCount: completedAppointments.length,
      todayAppointments,
    };
  }, [monthlyAppointments, prevMonthAppointments, clients, todayStr, monthStart, monthEnd]);

  // Chart data
  const chartData = useMemo(() => {
    const appointments = monthlyAppointments || [];
    
    if (chartPeriod === 'weekly') {
      const weekDays = eachDayOfInterval({
        start: startOfWeek(today, { weekStartsOn: 1 }),
        end: endOfWeek(today, { weekStartsOn: 1 }),
      });
      
      return weekDays.map(day => {
        const dayStr = format(day, 'yyyy-MM-dd');
        const dayAppointments = appointments.filter((a: Appointment) => 
          a.date === dayStr || (a.date && a.date.startsWith(dayStr))
        );
        const revenue = dayAppointments
          .filter((a: Appointment) => a.status === 'COMPLETED')
          .reduce((sum: number, a: Appointment) => sum + (parseFloat(String(a.price)) || 0), 0);
        
        return {
          name: format(day, 'EEE', { locale: ptBR }).charAt(0).toUpperCase() + format(day, 'EEE', { locale: ptBR }).slice(1),
          value: revenue,
          appointments: dayAppointments.length,
        };
      });
    } else {
      // Monthly - group by week
      const weeks = [];
      let currentDate = startOfMonth(today);
      const monthEndDate = endOfMonth(today);
      let weekNum = 1;
      
      while (currentDate <= monthEndDate) {
        const weekEndDate = endOfWeek(currentDate, { weekStartsOn: 1 });
        const actualEnd = weekEndDate > monthEndDate ? monthEndDate : weekEndDate;
        
        const weekAppointments = appointments.filter((a: Appointment) => {
          const appointmentDate = new Date(a.date);
          return appointmentDate >= currentDate && appointmentDate <= actualEnd;
        });
        
        const revenue = weekAppointments
          .filter((a: Appointment) => a.status === 'COMPLETED')
          .reduce((sum: number, a: Appointment) => sum + (parseFloat(String(a.price)) || 0), 0);
        
        weeks.push({
          name: `Sem ${weekNum}`,
          value: revenue,
          appointments: weekAppointments.length,
        });
        
        currentDate = new Date(weekEndDate);
        currentDate.setDate(currentDate.getDate() + 1);
        weekNum++;
      }
      
      return weeks;
    }
  }, [monthlyAppointments, chartPeriod, today]);

  // Recent appointments (upcoming or recent)
  const recentAppointments = useMemo(() => {
    const all = monthlyAppointments || [];
    return all
      .filter((a: Appointment) => {
        const appointmentDate = new Date(a.date);
        return appointmentDate >= new Date(todayStr);
      })
      .sort((a: Appointment, b: Appointment) => {
        const dateCompare = a.date.localeCompare(b.date);
        if (dateCompare !== 0) return dateCompare;
        return a.startTime.localeCompare(b.startTime);
      })
      .slice(0, 5);
  }, [monthlyAppointments, todayStr]);

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const formatTime = (time: string) => {
    if (time.includes('T')) {
      return time.split('T')[1].substring(0, 5);
    }
    return time;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard Geral</h1>
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
        {/* Faturamento Mensal */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Faturamento Mensal
            </CardTitle>
            <div className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full",
              metrics.revenueChange >= 0 ? "bg-success/10" : "bg-destructive/10"
            )}>
              {metrics.revenueChange >= 0 ? (
                <ArrowUpRight className="h-4 w-4 text-success" />
              ) : (
                <ArrowDownRight className="h-4 w-4 text-destructive" />
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.monthlyRevenue)}</div>
            <p className={cn(
              "text-xs",
              metrics.revenueChange >= 0 ? "text-success" : "text-destructive"
            )}>
              {metrics.revenueChange >= 0 ? '+' : ''}{metrics.revenueChange.toFixed(1)}% em relação ao mês passado
            </p>
          </CardContent>
        </Card>

        {/* Agendamentos Hoje */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Agendamentos Hoje
            </CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
              <Calendar className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.todayAppointmentsCount}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.confirmedToday} confirmados
            </p>
          </CardContent>
        </Card>

        {/* Novos Clientes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Novos Clientes
            </CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-warning/10">
              <Star className="h-4 w-4 text-warning" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.newClientsCount}</div>
            <p className="text-xs text-success">
              +{metrics.newClientsWeek} esta semana
            </p>
          </CardContent>
        </Card>

        {/* Ticket Médio */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ticket Médio
            </CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.avgTicket)}</div>
            <p className="text-xs text-muted-foreground">
              Baseado em {metrics.completedCount} serviços
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Chart and Recent Appointments */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Fluxo de Agendamentos ({chartPeriod === 'weekly' ? 'Semana' : 'Mês'})</CardTitle>
              <CardDescription>Receita por período</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant={chartPeriod === 'weekly' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setChartPeriod('weekly')}
              >
                Semanal
              </Button>
              <Button
                variant={chartPeriod === 'monthly' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setChartPeriod('monthly')}
              >
                Mensal
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <XAxis 
                    dataKey="name" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                    tickFormatter={(value) => `R$${value}`}
                  />
                  <Tooltip 
                    formatter={(value: number) => [formatCurrency(value), 'Receita']}
                    labelFormatter={(label) => label}
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
                      padding: '8px 12px',
                    }}
                    labelStyle={{
                      color: '#111827',
                      fontWeight: 600,
                      marginBottom: '4px',
                    }}
                    itemStyle={{
                      color: '#374151',
                    }}
                    cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }}
                  />
                  <Bar 
                    dataKey="value" 
                    fill="hsl(var(--primary))" 
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Recent Appointments */}
        <Card>
          <CardHeader>
            <CardTitle>Agendamentos Recentes</CardTitle>
            <CardDescription>Próximos agendamentos</CardDescription>
          </CardHeader>
          <CardContent>
            {recentAppointments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Calendar className="mb-4 h-8 w-8 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">Nenhum agendamento</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentAppointments.map((appointment: Appointment) => (
                  <Link
                    key={appointment.id}
                    href={`/dashboard/agendamentos/${appointment.id}`}
                    className="flex items-center justify-between rounded-lg p-2 transition-colors hover:bg-muted/50"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">
                        {appointment.client?.name || 'Cliente'}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {appointment.service?.name || 'Serviço'} - {formatTime(appointment.startTime)}
                      </p>
                    </div>
                    <div className={cn(
                      "ml-2 h-2 w-2 rounded-full shrink-0",
                      appointment.status === 'CONFIRMED' && "bg-success",
                      appointment.status === 'PENDING' && "bg-warning",
                      appointment.status === 'COMPLETED' && "bg-primary",
                      appointment.status === 'CANCELLED' && "bg-destructive",
                    )} />
                  </Link>
                ))}
              </div>
            )}
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
          {metrics.todayAppointments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Calendar className="mb-4 h-12 w-12 text-muted-foreground/50" />
              <p className="text-muted-foreground">Nenhum agendamento para hoje</p>
              <Button asChild variant="link" className="mt-2">
                <Link href="/dashboard/agendamentos/novo">Criar agendamento</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {metrics.todayAppointments.map((appointment: Appointment) => (
                <Link
                  key={appointment.id}
                  href={`/dashboard/agendamentos/${appointment.id}`}
                  className="flex items-center justify-between rounded-lg border border-border p-4 transition-colors hover:border-primary/50"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Clock className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{appointment.client?.name || 'Cliente'}</p>
                      <p className="text-sm text-muted-foreground">
                        {appointment.service?.name || 'Serviço'} com {appointment.professional?.name || 'Profissional'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-medium">
                        {formatTime(appointment.startTime)} - {formatTime(appointment.endTime)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatCurrency(appointment.price || 0)}
                      </p>
                    </div>
                    <Badge variant="outline" className={statusColors[appointment.status]}>
                      {statusLabels[appointment.status]}
                    </Badge>
                  </div>
                </Link>
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
