'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { automaticMessagesApi } from '@/lib/api';
import { USE_BACKEND_MESSAGES } from '@/lib/message-service';

interface AutoMessagesConfig {
  activeMessages: string[];
  whatsappConnected: boolean;
  whatsappPhone: string | null;
  whatsappInstanceName: string | null;
}

interface AutoMessagesContextValue {
  config: AutoMessagesConfig | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  canSendMessage: (messageType: string) => boolean;
  instanceName: string | null;
}

const defaultConfig: AutoMessagesConfig = {
  activeMessages: [],
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
          activeMessages: result.data.activeMessages || [],
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
    } catch (err) {
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

  const canSendMessage = useCallback((messageType: string): boolean => {
    if (USE_BACKEND_MESSAGES) return false; // Backend handles it
    if (!config) return false;
    // Note: We don't check whatsappConnected because the backend may not be saving it correctly.
    // Instead, we rely on instanceName being present (which indicates the user has configured WhatsApp)
    if (!config.activeMessages.includes(messageType)) return false;
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
