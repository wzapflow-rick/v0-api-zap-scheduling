import { describe, it, expect } from 'vitest';
import { DashboardCardRegistry, selectVisibleCards } from '@/components/dashboard/dashboard-card-registry';
import { DashboardCardId } from '@/types';
import type { DashboardCardConfig } from '@/types';

describe('DashboardCardRegistry', () => {
  it('possui um componente para cada DashboardCardId', () => {
    for (const id of Object.values(DashboardCardId)) {
      expect(DashboardCardRegistry[id]).toBeTypeOf('function');
    }
  });
});

describe('selectVisibleCards', () => {
  it('filtra desabilitados e ordena por `order`', () => {
    const cards: DashboardCardConfig[] = [
      { id: DashboardCardId.PROFESSIONALS, enabled: true, order: 3 },
      { id: DashboardCardId.REVENUE, enabled: true, order: 0 },
      { id: DashboardCardId.CLIENTS, enabled: false, order: 1 },
      { id: DashboardCardId.APPOINTMENTS, enabled: true, order: 1 },
    ];
    const result = selectVisibleCards(cards).map((c) => c.id);
    expect(result).toEqual([
      DashboardCardId.REVENUE,
      DashboardCardId.APPOINTMENTS,
      DashboardCardId.PROFESSIONALS,
    ]);
  });

  it('ignora ids desconhecidos que não estão no registry', () => {
    const cards = [
      { id: 'unknown_card' as DashboardCardId, enabled: true, order: 0 },
      { id: DashboardCardId.REVENUE, enabled: true, order: 1 },
    ];
    const result = selectVisibleCards(cards).map((c) => c.id);
    expect(result).toEqual([DashboardCardId.REVENUE]);
  });
});
