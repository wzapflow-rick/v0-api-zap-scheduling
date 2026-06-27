'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { automaticMessagesApi } from '@/lib/api';

// Mesmo formato de getInstanceName() em lib/evolution-api.ts.
// Inlinado aqui para não puxar o módulo server-side para o bundle do client.
const buildInstanceName = (establishmentId: string) => `ZapFlow-Agenda_${establishmentId}`;

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

export function AutoMessagesProvider({ children, establishmentId }: { children: ReactNode; establishmentId?: string }) {
  const [config, setConfig] = useState<AutoMessagesConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Nome canônico da instância derivado do ID único do estabelecimento
  const fallbackInstanceName = establishmentId ? buildInstanceName(establishmentId) : null;

  const fetchConfig = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await automaticMessagesApi.get();
      if (result.success && result.data) {
        setConfig({
          whatsappConnected: result.data.whatsappConnected || false,
          whatsappPhone: result.data.whatsappPhone || null,
          whatsappInstanceName: result.data.whatsappInstanceName || fallbackInstanceName,
        });
      } else {
        setConfig({
          ...defaultConfig,
          whatsappInstanceName: fallbackInstanceName,
        });
      }
    } catch {
      setError('Erro ao carregar configurações de mensagens');
      setConfig({
        ...defaultConfig,
        whatsappInstanceName: fallbackInstanceName,
      });
    } finally {
      setLoading(false);
    }
  }, [fallbackInstanceName]);

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
