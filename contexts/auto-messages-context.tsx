'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { automaticMessagesApi } from '@/lib/api';

interface AutoMessagesConfig {
  whatsappConnected: boolean;
  whatsappPhone: string | null;
  whatsappInstanceName: string | null;
}

interface AutoMessagesContextValue {
  config: AutoMessagesConfig | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  canSendMessage: () => boolean;
  instanceName: string | null;
}

const defaultConfig: AutoMessagesConfig = {
  whatsappConnected: false,
  whatsappPhone: null,
  whatsappInstanceName: null,
};

const AutoMessagesContext = createContext<AutoMessagesContextValue | undefined>(undefined);

export function AutoMessagesProvider({ children, slug }: { children: ReactNode; slug?: string }) {
  const [config, setConfig] = useState<AutoMessagesConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await automaticMessagesApi.get();
      if (result.success && result.data) {
        setConfig({
          whatsappConnected: result.data.whatsappConnected || false,
          whatsappPhone: result.data.whatsappPhone || null,
          whatsappInstanceName: result.data.whatsappInstanceName || (slug ? `ZapFlow-Agenda_${slug}` : null),
        });
      } else {
        // Use slug-based instance name as fallback
        setConfig({
          ...defaultConfig,
          whatsappInstanceName: slug ? `ZapFlow-Agenda_${slug}` : null,
        });
      }
    } catch {
      setError('Erro ao carregar configurações de mensagens');
      // Use slug-based instance name as fallback
      setConfig({
        ...defaultConfig,
        whatsappInstanceName: slug ? `ZapFlow-Agenda_${slug}` : null,
      });
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  // Simplified: can send if WhatsApp is connected and instanceName exists
  const canSendMessage = useCallback((): boolean => {
    if (!config) return false;
    if (!config.whatsappConnected) return false;
    if (!config.whatsappInstanceName) return false;
    return true;
  }, [config]);

  const value: AutoMessagesContextValue = {
    config,
    loading,
    error,
    refresh: fetchConfig,
    canSendMessage,
    instanceName: config?.whatsappInstanceName || null,
  };

  return (
    <AutoMessagesContext.Provider value={value}>
      {children}
    </AutoMessagesContext.Provider>
  );
}

export function useAutoMessagesConfig() {
  const context = useContext(AutoMessagesContext);
  if (context === undefined) {
    // Return a safe default if used outside provider
    return {
      config: null,
      loading: false,
      error: null,
      refresh: async () => {},
      canSendMessage: () => false,
      instanceName: null,
    };
  }
  return context;
}
