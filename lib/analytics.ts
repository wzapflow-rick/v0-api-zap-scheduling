/**
 * Camada de analytics desacoplada e multi-provedor.
 * Hoje só loga no console; somar PostHog/GA/Mixpanel depois é só
 * registrar um novo provider — as chamadas `analytics.track(...)` não mudam.
 */

export enum AnalyticsEvent {
  BUSINESS_TYPE_SELECTED = 'business_type_selected',
  BUSINESS_TYPE_CHANGED = 'business_type_changed',
  FEATURE_ACCESSED = 'feature_accessed',
  DASHBOARD_CARD_VIEWED = 'dashboard_card_viewed',
}

export type AnalyticsPayload = Record<string, unknown>;

export interface AnalyticsProvider {
  name: string;
  track(event: AnalyticsEvent, payload?: AnalyticsPayload): void;
}

const ConsoleProvider: AnalyticsProvider = {
  name: 'console',
  track(event, payload) {
    console.log('[v0] analytics', event, payload ?? {});
  },
};

const providers: AnalyticsProvider[] = [ConsoleProvider];

export const analytics = {
  /** Registra um provedor adicional (ex.: PostHog) em runtime. */
  addProvider(provider: AnalyticsProvider) {
    if (!providers.find((p) => p.name === provider.name)) {
      providers.push(provider);
    }
  },

  /** Dispara o evento em todos os provedores registrados. */
  track(event: AnalyticsEvent, payload?: AnalyticsPayload) {
    for (const provider of providers) {
      try {
        provider.track(event, payload);
      } catch {
        // um provider quebrado nunca deve interromper o fluxo
      }
    }
  },
};
