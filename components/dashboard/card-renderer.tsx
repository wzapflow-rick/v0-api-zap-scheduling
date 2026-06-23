'use client';

import { useEffect } from 'react';
import type { DashboardCardConfig } from '@/types';
import { analytics, AnalyticsEvent } from '@/lib/analytics';
import {
  DashboardCardRegistry,
  type DashboardMetrics,
} from '@/components/dashboard/dashboard-card-registry';

interface CardRendererProps {
  card: DashboardCardConfig;
  metrics: DashboardMetrics;
  labels: {
    appointmentPlural: string;
    clientPlural: string;
    professionalPlural: string;
  };
  index: number;
}

/**
 * Renderiza um card do dashboard buscando o componente no registry pelo id.
 * Ids desconhecidos são ignorados (resiliente a config futura).
 */
export function CardRenderer({ card, metrics, labels, index }: CardRendererProps) {
  const Component = DashboardCardRegistry[card.id];

  useEffect(() => {
    if (Component) {
      analytics.track(AnalyticsEvent.DASHBOARD_CARD_VIEWED, { card: card.id });
    }
  }, [Component, card.id]);

  if (!Component) return null;
  return <Component metrics={metrics} labels={labels} index={index} />;
}
