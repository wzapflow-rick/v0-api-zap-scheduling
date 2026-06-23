'use client';

import { useContext, useMemo } from 'react';
import { BusinessConfigContext } from '@/contexts/business-config-context';
import { DEFAULT_BUSINESS_CONFIG } from '@/lib/business-config-defaults';
import type { BusinessConfig, BusinessLabelKey, BusinessTheme } from '@/types';

interface GetLabelOptions {
  plural?: boolean;
}

export interface UseBusinessResult {
  config: BusinessConfig;
  isLoading: boolean;
  refreshBusinessConfig: () => Promise<void>;

  // Acessos a módulos principais
  canUseProducts: boolean;
  canUseWorkouts: boolean;
  canUseMedicalRecords: boolean;
  canUseMemberships: boolean;

  // Capabilities (sub-recursos)
  hasInventory: boolean;
  hasCommissions: boolean;
  hasOnlineCatalog: boolean;

  // Labels já resolvidas (singular)
  clientLabel: string;
  professionalLabel: string;
  appointmentLabel: string;
  serviceLabel: string;
  dashboardTitle: string;

  // Label genérica com singular/plural explícito (i18n-ready)
  getBusinessLabel: (key: BusinessLabelKey, options?: GetLabelOptions) => string;

  theme?: BusinessTheme;
}

/**
 * ÚNICA forma de a UI consumir a BusinessConfig.
 * Nunca leia `config.features.x` / `config.labels.x` direto nas telas —
 * se o shape mudar, só este hook precisa mudar.
 */
export function useBusiness(): UseBusinessResult {
  const ctx = useContext(BusinessConfigContext);
  const config = ctx?.config ?? DEFAULT_BUSINESS_CONFIG;
  const isLoading = ctx?.isLoading ?? false;
  const refreshBusinessConfig = ctx?.refreshBusinessConfig ?? (async () => {});

  return useMemo<UseBusinessResult>(() => {
    const getBusinessLabel = (key: BusinessLabelKey, options?: GetLabelOptions) => {
      const entry = config.labels[key];
      if (!entry) return key;
      return options?.plural ? entry.plural : entry.singular;
    };

    return {
      config,
      isLoading,
      refreshBusinessConfig,

      canUseProducts: config.features.products.enabled,
      canUseWorkouts: config.features.workouts.enabled,
      canUseMedicalRecords: config.features.medicalRecords.enabled,
      canUseMemberships: config.features.memberships.enabled,

      hasInventory: config.capabilities.inventory,
      hasCommissions: config.capabilities.commissions,
      hasOnlineCatalog: config.capabilities.onlineCatalog,

      clientLabel: getBusinessLabel('client'),
      professionalLabel: getBusinessLabel('professional'),
      appointmentLabel: getBusinessLabel('appointment'),
      serviceLabel: getBusinessLabel('service'),
      dashboardTitle: config.labels.dashboardTitle,

      getBusinessLabel,
      theme: config.theme,
    };
  }, [config, isLoading, refreshBusinessConfig]);
}
