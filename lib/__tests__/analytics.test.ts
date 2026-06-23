import { describe, it, expect, vi } from 'vitest';
import { analytics, AnalyticsEvent, type AnalyticsProvider } from '@/lib/analytics';

describe('analytics', () => {
  it('dispara o evento em um provider registrado', () => {
    const track = vi.fn();
    const provider: AnalyticsProvider = { name: 'test-provider', track };
    analytics.addProvider(provider);

    analytics.track(AnalyticsEvent.FEATURE_ACCESSED, { feature: 'products' });

    expect(track).toHaveBeenCalledWith(AnalyticsEvent.FEATURE_ACCESSED, { feature: 'products' });
  });

  it('não interrompe o fluxo se um provider lançar erro', () => {
    const ok = vi.fn();
    analytics.addProvider({ name: 'broken', track: () => { throw new Error('boom'); } });
    analytics.addProvider({ name: 'ok-provider', track: ok });

    expect(() => analytics.track(AnalyticsEvent.DASHBOARD_CARD_VIEWED)).not.toThrow();
    expect(ok).toHaveBeenCalled();
  });

  it('não registra o mesmo provider duas vezes', () => {
    const track = vi.fn();
    const provider: AnalyticsProvider = { name: 'dedupe', track };
    analytics.addProvider(provider);
    analytics.addProvider(provider);

    analytics.track(AnalyticsEvent.BUSINESS_TYPE_CHANGED);
    expect(track).toHaveBeenCalledTimes(1);
  });
});
