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
    // h-full em toda a cadeia (motion > Card > CardContent) faz todos os cards
    // da grid terem exatamente a mesma altura, independente de ter subtítulo,
    // trend ou títulos que quebram em duas linhas.
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      className="h-full"
    >
      <Card
        className={cn(
          'relative h-full overflow-hidden transition-all duration-300 hover:shadow-lg',
          highlight
            ? 'bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 border-primary/30'
            : 'bg-card/50 backdrop-blur-sm border-border/50 hover:border-primary/30'
        )}
      >
        <CardContent className="flex h-full flex-col p-5">
          <div className="flex items-start gap-4">
            <div
              className={cn(
                'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl',
                iconBg
              )}
            >
              <Icon className={cn('h-6 w-6', iconColor)} />
            </div>
            <div className="min-w-0 flex-1">
              {/* min-h fixo reserva espaço para títulos de 1 ou 2 linhas,
                  mantendo os valores alinhados entre os cards */}
              <p className="mb-1 min-h-10 text-sm font-medium leading-5 text-muted-foreground">
                {title}
              </p>
              <p className="text-2xl font-bold tracking-tight text-foreground">{value}</p>
              {/* Linha de rodapé sempre presente: sem ela, cards sem subtítulo
                  ficavam mais baixos que os demais */}
              <div className="mt-1 flex min-h-4 items-center gap-2">
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
