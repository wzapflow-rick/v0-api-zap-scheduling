'use client';

import { createContext, useCallback, useMemo, type ReactNode } from 'react';
import useSWR from 'swr';
import { useAuth } from '@/lib/auth-context';
import { businessTypesApi } from '@/lib/api';
import type { BusinessConfig, BusinessTypeId } from '@/types';
import {
  DEFAULT_BUSINESS_CONFIG,
  CURRENT_CONFIG_VERSION,
  normalizeBusinessConfig,
} from '@/lib/business-config-defaults';

interface BusinessConfigContextValue {
  config: BusinessConfig;
  isLoading: boolean;
  refreshBusinessConfig: () => Promise<void>;
}

export const BusinessConfigContext = createContext<BusinessConfigContextValue | null>(null);

const CACHE_PREFIX = 'business-config:';
const TTL_MS = 60 * 60 * 1000; // 1 hora

interface CachedEntry {
  data: BusinessConfig;
  savedAt: number;
  configVersion: number;
}

function readCache(type: BusinessTypeId): BusinessConfig | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(CACHE_PREFIX + type);
    if (!raw) return null;
    const entry = JSON.parse(raw) as CachedEntry;
    // Invalida se o formato da config mudou
    if (entry.configVersion !== CURRENT_CONFIG_VERSION) {
      window.localStorage.removeItem(CACHE_PREFIX + type);
      return null;
    }
    // Invalida se passou do TTL
    if (Date.now() - entry.savedAt > TTL_MS) {
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

function writeCache(type: BusinessTypeId, data: BusinessConfig) {
  if (typeof window === 'undefined') return;
  try {
    const entry: CachedEntry = {
      data,
      savedAt: Date.now(),
      configVersion: CURRENT_CONFIG_VERSION,
    };
    window.localStorage.setItem(CACHE_PREFIX + type, JSON.stringify(entry));
  } catch {
    // storage cheio / indisponível — ignora
  }
}

export function BusinessConfigProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const businessType: BusinessTypeId = user?.establishment?.businessType ?? 'OTHER';

  const fetcher = useCallback(async ([, type]: [string, BusinessTypeId]) => {
    const res = await businessTypesApi.getConfig(type);
    if (!res.success || !res.data) {
      // Fallback seguro mantendo o id do nicho
      return { ...DEFAULT_BUSINESS_CONFIG, id: type };
    }
    const normalized = normalizeBusinessConfig(res.data, type);
    writeCache(type, normalized);
    return normalized;
  }, []);

  const { data, isLoading, mutate } = useSWR<BusinessConfig>(
    ['business-config', businessType],
    fetcher,
    {
      revalidateOnFocus: false,
      // Hidrata instantaneamente com o cache persistente (abre rápido no refresh)
      fallbackData: readCache(businessType) ?? { ...DEFAULT_BUSINESS_CONFIG, id: businessType },
    }
  );

  const refreshBusinessConfig = useCallback(async () => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(CACHE_PREFIX + businessType);
    }
    await mutate();
  }, [businessType, mutate]);

  const value = useMemo<BusinessConfigContextValue>(
    () => ({
      config: data ?? { ...DEFAULT_BUSINESS_CONFIG, id: businessType },
      isLoading,
      refreshBusinessConfig,
    }),
    [data, isLoading, businessType, refreshBusinessConfig]
  );

  return (
    <BusinessConfigContext.Provider value={value}>
      {children}
    </BusinessConfigContext.Provider>
  );
}
