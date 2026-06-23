'use client';

import type { ComponentType } from 'react';
import { Calendar, DollarSign, Users, Briefcase } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { motion } from 'motion/react';
import { DashboardCardId } from '@/types';
import type { DashboardCardConfig } from '@/types';

/** Dados compartilhados que os cards do dashboard consomem. */
export interface DashboardMetrics {
  monthlyRevenue: number;
  revenueChange: number;
  totalAppointments: number;
  newClientsCount: number;
  professionalsCount: number;
}

export interface DashboardCardProps {
  metrics: DashboardMetrics;
  /** Labels adaptadas ao nicho (vindas de useBusiness). */
  labels: {
    appointmentPlural: string;
    clientPlural: string;
    professionalPlural: string;
  };
  index?: number;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconBg = 'bg-primary/10',
  iconColor = 'text-primary',
  trend,
  highlight = false,
  index = 0,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  iconBg?: string;
  iconColor?: string;
  trend?: { value: number; positive: boolean };
  highlight?: boolean;
  index?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
    >
      <Card
        className={cn(
          'relative overflow-hidden transition-all duration-300 hover:shadow-lg',
          highlight
            ? 'bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 border-primary/30'
            : 'bg-card/50 backdrop-blur-sm border-border/50 hover:border-primary/30'
        )}
      >
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <div className={cn('flex items-center justify-center w-12 h-12 rounded-xl', iconBg)}>
              <Icon className={cn('w-6 h-6', iconColor)} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
              <p className="text-2xl font-bold text-foreground tracking-tight">{value}</p>
              {(subtitle || trend) && (
                <div className="flex items-center gap-2 mt-1">
                  {trend && (
                    <span
                      className={cn(
                        'text-xs font-medium',
                        trend.positive ? 'text-emerald-500' : 'text-red-500'
                      )}
                    >
                      {trend.positive ? '+' : ''}
                      {trend.value.toFixed(1)}%
                    </span>
                  )}
                  {subtitle && <span className="text-xs text-muted-foreground">{subtitle}</span>}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function RevenueCard({ metrics, index }: DashboardCardProps) {
  return (
    <StatCard
      title="Faturamento Bruto"
      value={formatCurrency(metrics.monthlyRevenue)}
      icon={DollarSign}
      iconBg="bg-emerald-500/10"
      iconColor="text-emerald-500"
      trend={{ value: metrics.revenueChange, positive: metrics.revenueChange >= 0 }}
      index={index}
    />
  );
}

function AppointmentsCard({ metrics, labels, index }: DashboardCardProps) {
  return (
    <StatCard
      title={`Total de ${labels.appointmentPlural}`}
      value={metrics.totalAppointments}
      subtitle="este mes"
      icon={Calendar}
      iconBg="bg-blue-500/10"
      iconColor="text-blue-500"
      index={index}
    />
  );
}

function ClientsCard({ metrics, labels, index }: DashboardCardProps) {
  return (
    <StatCard
      title={`Novos ${labels.clientPlural}`}
      value={metrics.newClientsCount}
      subtitle="este mes"
      icon={Users}
      iconBg="bg-purple-500/10"
      iconColor="text-purple-500"
      index={index}
    />
  );
}

function ProfessionalsCard({ metrics, labels, index }: DashboardCardProps) {
  return (
    <StatCard
      title={labels.professionalPlural}
      value={metrics.professionalsCount}
      subtitle="ativos"
      icon={Briefcase}
      iconBg="bg-primary/20"
      iconColor="text-primary"
      index={index}
    />
  );
}

/** Registry tipado pelo enum — sem string literal solta. */
export const DashboardCardRegistry: Record<DashboardCardId, ComponentType<DashboardCardProps>> = {
  [DashboardCardId.REVENUE]: RevenueCard,
  [DashboardCardId.APPOINTMENTS]: AppointmentsCard,
  [DashboardCardId.CLIENTS]: ClientsCard,
  [DashboardCardId.PROFESSIONALS]: ProfessionalsCard,
};

/**
 * Seleciona os cards habilitados, ordenados por `order`, ignorando ids
 * desconhecidos (que não existem no registry). Função pura e testável.
 */
export function selectVisibleCards(
  cards: DashboardCardConfig[]
): DashboardCardConfig[] {
  return cards
    .filter((c) => c.enabled && c.id in DashboardCardRegistry)
    .sort((a, b) => a.order - b.order);
}
