'use client';

import { useState, useMemo, useEffect } from 'react';
import useSWR from 'swr';
import { useSearchParams } from 'next/navigation';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, subMonths, eachDayOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Calendar, 
  Plus, 
  TrendingUp,
  Clock,
  ArrowUpRight,
  ChevronRight,
  Zap
} from 'lucide-react';
import Link from 'next/link';
import { establishmentApi } from '@/lib/api';
import { offlineAppointmentsApi as appointmentsApi, offlineClientsApi as clientsApi } from '@/lib/offline/api-wrapper';
import type { Appointment, AppointmentStatus, Client } from '@/types';
import { cn } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { toast } from 'sonner';
import { DashboardSkeleton } from '@/components/skeletons/dashboard-skeleton';
import { motion } from 'motion/react';
import { useBusiness } from '@/hooks/use-business';
import { CardRenderer } from '@/components/dashboard/card-renderer';
import { selectVisibleCards } from '@/components/dashboard/dashboard-card-registry';
import type { DashboardMetrics } from '@/components/dashboard/dashboard-card-registry';

// Status config
const statusConfig: Record<AppointmentStatus, { bg: string; text: string; dot: string }> = {
  PENDING: { bg: 'bg-amber-500/10', text: 'text-amber-500', dot: 'bg-amber-500' },
  CONFIRMED: { bg: 'bg-primary/10', text: 'text-primary', dot: 'bg-primary' },
  COMPLETED: { bg: 'bg-emerald-500/10', text: 'text-emerald-500', dot: 'bg-emerald-500' },
  CANCELLED: { bg: 'bg-red-500/10', text: 'text-red-500', dot: 'bg-red-500' },
  NO_SHOW: { bg: 'bg-slate-500/10', text: 'text-slate-500', dot: 'bg-slate-500' },
};

const statusLabels: Record<AppointmentStatus, string> = {
  PENDING: 'Pendente',
  CONFIRMED: 'Confirmado',
  COMPLETED: 'Concluido',
  CANCELLED: 'Cancelado',
  NO_SHOW: 'Nao compareceu',
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
  const data = res.data;
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.appointments)) return data.appointments;
  return [];
};

const clientsFetcher = async () => {
  const res = await clientsApi.list({ limit: 1000 });
  if (!res.success) return [];
  const data = res.data;
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.clients)) return data.clients;
  return [];
};

// Badge component
function RealTimeBadge() {
  return (
    <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-primary/10 border border-primary/20">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
      </span>
      <span className="text-[10px] font-semibold text-primary uppercase tracking-wider">Real-time</span>
    </div>
  );
}

// Stat Card component
function StatCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  iconBg = 'bg-primary/10',
  iconColor = 'text-primary',
  trend,
  showRealTime = false,
  highlight = false,
  delay = 0
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  iconBg?: string;
  iconColor?: string;
  trend?: { value: number; positive: boolean };
  showRealTime?: boolean;
  highlight?: boolean;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
    >
      <Card className={cn(
        "relative overflow-hidden transition-all duration-300 hover:shadow-lg",
        highlight 
          ? "bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 border-primary/30" 
          : "bg-card/50 backdrop-blur-sm border-border/50 hover:border-primary/30"
      )}>
        {showRealTime && (
          <div className="absolute top-3 right-3">
            <RealTimeBadge />
          </div>
        )}
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <div className={cn(
              "flex items-center justify-center w-12 h-12 rounded-xl",
              iconBg
            )}>
              <Icon className={cn("w-6 h-6", iconColor)} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
              <p className="text-2xl font-bold text-foreground tracking-tight">{value}</p>
              {(subtitle || trend) && (
                <div className="flex items-center gap-2 mt-1">
                  {trend && (
                    <span className={cn(
                      "text-xs font-medium",
                      trend.positive ? "text-emerald-500" : "text-red-500"
                    )}>
                      {trend.positive ? '+' : ''}{trend.value.toFixed(1)}%
                    </span>
                  )}
                  {subtitle && (
                    <span className="text-xs text-muted-foreground">{subtitle}</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function DashboardPage() {
  const [chartPeriod, setChartPeriod] = useState<'weekly' | 'monthly'>('weekly');
  const searchParams = useSearchParams();
  const paymentStatus = searchParams.get('payment');
  const { config, getBusinessLabel } = useBusiness();
  
  useEffect(() => {
    if (paymentStatus === 'success') {
      toast.success('Pagamento realizado com sucesso!', {
        description: 'Sua assinatura esta ativa.',
      });
    } else if (paymentStatus === 'failure') {
      toast.error('Falha no pagamento', {
        description: 'Tente novamente ou escolha outra forma de pagamento.',
      });
    } else if (paymentStatus === 'pending') {
      toast.info('Pagamento pendente', {
        description: 'Aguarde a confirmacao do pagamento.',
      });
    }
  }, [paymentStatus]);
  
  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');
  
  const monthStart = format(startOfMonth(today), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(today), 'yyyy-MM-dd');
  const prevMonthStart = format(startOfMonth(subMonths(today, 1)), 'yyyy-MM-dd');
  const prevMonthEnd = format(endOfMonth(subMonths(today, 1)), 'yyyy-MM-dd');

  const { data: establishment, isLoading: isLoadingEstablishment } = useSWR(
    'establishment',
    establishmentFetcher,
    { revalidateOnFocus: false }
  );

  const { data: monthlyAppointments, isLoading: isLoadingMonthly } = useSWR(
    ['appointments-monthly', monthStart, monthEnd],
    monthlyAppointmentsFetcher,
    { revalidateOnFocus: false }
  );

  const { data: prevMonthAppointments } = useSWR(
    ['appointments-prev-month', prevMonthStart, prevMonthEnd],
    monthlyAppointmentsFetcher,
    { revalidateOnFocus: false }
  );

  const { data: clients, isLoading: isLoadingClients } = useSWR(
    'clients-all',
    clientsFetcher,
    { revalidateOnFocus: false }
  );

  const isLoading = isLoadingEstablishment || isLoadingMonthly || isLoadingClients;

  const metrics = useMemo(() => {
    const allAppointments = monthlyAppointments || [];
    const prevAppointments = prevMonthAppointments || [];
    const allClients = clients || [];
    
    const todayAppointments = allAppointments.filter((a: Appointment) => 
      a.date === todayStr || (a.date && a.date.startsWith(todayStr))
    );
    
    const monthlyRevenue = allAppointments
      .filter((a: Appointment) => a.status === 'COMPLETED')
      .reduce((sum: number, a: Appointment) => sum + (parseFloat(String(a.price)) || 0), 0);
    
    const prevMonthRevenue = prevAppointments
      .filter((a: Appointment) => a.status === 'COMPLETED')
      .reduce((sum: number, a: Appointment) => sum + (parseFloat(String(a.price)) || 0), 0);
    
    const revenueChange = prevMonthRevenue > 0 
      ? ((monthlyRevenue - prevMonthRevenue) / prevMonthRevenue) * 100 
      : 0;
    
    const thisMonthClients = allClients.filter((c: Client) => {
      if (!c.createdAt) return false;
      const createdDate = new Date(c.createdAt);
      return createdDate >= new Date(monthStart) && createdDate <= new Date(monthEnd);
    });
    
    const completedAppointments = allAppointments.filter((a: Appointment) => a.status === 'COMPLETED');
    const avgTicket = completedAppointments.length > 0 
      ? monthlyRevenue / completedAppointments.length 
      : 0;
    
    const pendingToday = todayAppointments.filter((a: Appointment) => 
      a.status === 'PENDING' || a.status === 'CONFIRMED'
    ).length;
    
    return {
      monthlyRevenue,
      revenueChange,
      todayAppointmentsCount: todayAppointments.length,
      pendingToday,
      newClientsCount: thisMonthClients.length,
      avgTicket,
      completedCount: completedAppointments.length,
      totalAppointments: allAppointments.length,
      todayAppointments,
    };
  }, [monthlyAppointments, prevMonthAppointments, clients, todayStr, monthStart, monthEnd]);

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
          name: format(day, 'EEE', { locale: ptBR }).substring(0, 3),
          value: revenue,
          appointments: dayAppointments.length,
        };
      });
    } else {
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
          name: `S${weekNum}`,
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
    return <DashboardSkeleton />;
  }

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const formatTime = (time: string) => {
    if (time.includes('T')) {
      return time.split('T')[1].substring(0, 5);
    }
    return time;
  };

  // Métricas e labels para os cards dinâmicos (registry)
  const dashboardMetrics: DashboardMetrics = {
    monthlyRevenue: metrics.monthlyRevenue,
    revenueChange: metrics.revenueChange,
    totalAppointments: metrics.totalAppointments,
    newClientsCount: metrics.newClientsCount,
    professionalsCount: establishment?._count?.professionals ?? 0,
  };
  const cardLabels = {
    appointmentPlural: getBusinessLabel('appointment', { plural: true }),
    clientPlural: getBusinessLabel('client', { plural: true }),
    professionalPlural: getBusinessLabel('professional', { plural: true }),
  };
  // Filtra habilitados e ordena por `order` (sem ids hardcoded)
  const visibleCards = selectVisibleCards(config.dashboardCards);

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-1"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Ola, {establishment?.name || 'Estabelecimento'}
            </h1>
            <p className="text-muted-foreground">
              Aqui esta o que esta acontecendo com seu negocio hoje.
            </p>
          </div>
          <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <Link href="/dashboard/agendamentos/novo" className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Novo Agendamento
            </Link>
          </Button>
        </div>
      </motion.div>

      {/* Stats Grid — cards principais dirigidos pela config do nicho (registry) */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {visibleCards.map((card, i) => (
          <CardRenderer
            key={card.id}
            card={card}
            metrics={dashboardMetrics}
            labels={cardLabels}
            index={i}
          />
        ))}
        {/* Cards complementares fixos */}
        <StatCard
          title="Ticket Medio"
          value={formatCurrency(metrics.avgTicket)}
          subtitle={`${metrics.completedCount} ${cardLabels.appointmentPlural.toLowerCase()}`}
          icon={TrendingUp}
          iconBg="bg-purple-500/10"
          iconColor="text-purple-500"
          delay={0.4}
        />
        <StatCard
          title={`${cardLabels.appointmentPlural} Pendentes`}
          value={metrics.pendingToday}
          subtitle="hoje"
          icon={Zap}
          iconBg="bg-primary/20"
          iconColor="text-primary"
          highlight
          delay={0.5}
        />
      </div>

      {/* Chart and Appointments Grid */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Chart */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="lg:col-span-3"
        >
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10">
                  <TrendingUp className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">Faturamento</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {chartPeriod === 'weekly' ? 'Ultimos 7 dias' : 'Este mes'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 px-1 py-0.5 rounded-lg bg-muted/50">
                  <button
                    onClick={() => setChartPeriod('weekly')}
                    className={cn(
                      "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                      chartPeriod === 'weekly' 
                        ? "bg-primary text-primary-foreground" 
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Semana
                  </button>
                  <button
                    onClick={() => setChartPeriod('monthly')}
                    className={cn(
                      "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                      chartPeriod === 'monthly' 
                        ? "bg-primary text-primary-foreground" 
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Mes
                  </button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} barCategoryGap="20%">
                    <XAxis 
                      dataKey="name" 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: '#A1A7B3' }}
                    />
                    <YAxis 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: '#A1A7B3' }}
                      tickFormatter={(value) => `R$${value}`}
                      width={60}
                    />
                    <Tooltip 
                      formatter={(value: number) => [formatCurrency(value), 'Receita']}
                      contentStyle={{
                        backgroundColor: '#0B1010',
                        border: '1px solid #1F2428',
                        borderRadius: '12px',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
                        padding: '12px 16px',
                      }}
                      labelStyle={{ color: '#F5F7FA', fontWeight: 600, marginBottom: '4px' }}
                      itemStyle={{ color: '#22D15A' }}
                      cursor={{ fill: 'rgba(34, 209, 90, 0.05)' }}
                    />
                    <Bar 
                      dataKey="value" 
                      fill="#22D15A"
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent/Top Products style list */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="lg:col-span-2"
        >
          <Card className="bg-card/50 backdrop-blur-sm border-border/50 h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-amber-500/10">
                  <Clock className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <CardTitle className="text-base">Proximos Agendamentos</CardTitle>
                  <p className="text-xs text-muted-foreground">Hoje e proximos dias</p>
                </div>
              </div>
              <Link 
                href="/dashboard/agendamentos" 
                className="text-xs text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
              >
                Ver todos
                <ChevronRight className="w-3 h-3" />
              </Link>
            </CardHeader>
            <CardContent className="pt-2">
              {recentAppointments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
                    <Calendar className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">Nenhum agendamento</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">Crie um novo agendamento para comecar</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentAppointments.map((appointment: Appointment, index: number) => (
                    <motion.div
                      key={appointment.id}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.6 + index * 0.05 }}
                    >
                      <Link
                        href={`/dashboard/agendamentos/${appointment.id}`}
                        className="group flex items-center gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-all"
                      >
                        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 text-primary font-bold text-sm">
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {appointment.client?.name || 'Cliente'}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {appointment.service?.name || 'Servico'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-foreground">
                            {formatTime(appointment.startTime)}
                          </p>
                          <div className="flex items-center gap-1.5 justify-end">
                            <span className={cn(
                              "w-1.5 h-1.5 rounded-full",
                              statusConfig[appointment.status]?.dot || 'bg-slate-500'
                            )} />
                            <span className={cn(
                              "text-[10px] font-medium",
                              statusConfig[appointment.status]?.text || 'text-slate-500'
                            )}>
                              {statusLabels[appointment.status]}
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Link>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Today's Timeline */}
      {metrics.todayAppointments.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10">
                  <Calendar className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">Agenda de Hoje</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {format(today, "EEEE, d 'de' MMMM", { locale: ptBR })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                </span>
                <span className="text-xs font-medium text-primary">TEMPO REAL</span>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {metrics.todayAppointments
                  .sort((a: Appointment, b: Appointment) => a.startTime.localeCompare(b.startTime))
                  .map((appointment: Appointment, index: number) => (
                    <motion.div
                      key={appointment.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.8 + index * 0.03 }}
                    >
                      <Link
                        href={`/dashboard/agendamentos/${appointment.id}`}
                        className={cn(
                          "group block p-4 rounded-xl border transition-all hover:shadow-md",
                          statusConfig[appointment.status]?.bg || 'bg-muted/30',
                          "border-border/50 hover:border-primary/30"
                        )}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <span className="text-lg font-bold text-foreground">
                            {formatTime(appointment.startTime)}
                          </span>
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase",
                            statusConfig[appointment.status]?.bg,
                            statusConfig[appointment.status]?.text
                          )}>
                            {statusLabels[appointment.status]}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-foreground truncate">
                          {appointment.client?.name || 'Cliente'}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {appointment.service?.name || 'Servico'}
                        </p>
                        {appointment.professional && (
                          <p className="text-xs text-muted-foreground mt-1 truncate">
                            com {appointment.professional.name}
                          </p>
                        )}
                      </Link>
                    </motion.div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
