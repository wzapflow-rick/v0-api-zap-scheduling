'use client';

import { useEffect, useState, useCallback } from 'react';
import useSWR, { mutate } from 'swr';
import {
  offlineAppointmentsApi,
  offlineClientsApi,
  offlineProfessionalsApi,
  offlineServicesApi,
  getSyncQueueCount,
  getPendingCounts,
  getSyncQueue,
  retryFailedItem,
  discardFailedItem,
  retryAllFailed,
  forceSync,
  type SyncQueueItem,
} from '@/lib/offline';
import type { Appointment, Client, Professional, Service } from '@/types';

const MAX_RETRY_ATTEMPTS = 5;

// Generic hook for offline data
function useOfflineData<T>(
  key: string,
  fetcher: () => Promise<{ success: boolean; data?: T }>,
  options?: { revalidateOnFocus?: boolean }
) {
  const { data, error, isLoading, mutate: revalidate } = useSWR(
    key,
    async () => {
      const result = await fetcher();
      if (result.success && result.data) {
        return result.data;
      }
      throw new Error('Failed to fetch data');
    },
    {
      revalidateOnFocus: options?.revalidateOnFocus ?? false,
      revalidateOnReconnect: true,
      dedupingInterval: 5000,
    }
  );

  return {
    data,
    error,
    isLoading,
    mutate: revalidate,
  };
}

// Appointments hook
export function useOfflineAppointments(params?: {
  status?: string;
  professionalId?: string;
  clientId?: string;
  startDate?: string;
  endDate?: string;
}) {
  const key = ['appointments', JSON.stringify(params)].join('-');
  
  return useOfflineData<Appointment[]>(
    key,
    () => offlineAppointmentsApi.list(params)
  );
}

// Single appointment hook
export function useOfflineAppointment(id: string | null) {
  return useOfflineData<Appointment>(
    id ? `appointment-${id}` : null!,
    () => offlineAppointmentsApi.get(id!)
  );
}

// Clients hook
export function useOfflineClients(params?: { search?: string }) {
  const key = ['clients', JSON.stringify(params)].join('-');
  
  return useOfflineData<Client[]>(
    key,
    () => offlineClientsApi.list(params)
  );
}

// Single client hook
export function useOfflineClient(id: string | null) {
  return useOfflineData<Client>(
    id ? `client-${id}` : null!,
    () => offlineClientsApi.get(id!)
  );
}

// Professionals hook
export function useOfflineProfessionals(params?: { search?: string; active?: boolean }) {
  const key = ['professionals', JSON.stringify(params)].join('-');
  
  return useOfflineData<Professional[]>(
    key,
    () => offlineProfessionalsApi.list(params)
  );
}

// Single professional hook
export function useOfflineProfessional(id: string | null) {
  return useOfflineData<Professional>(
    id ? `professional-${id}` : null!,
    () => offlineProfessionalsApi.get(id!)
  );
}

// Services hook
export function useOfflineServices(params?: { search?: string; active?: boolean; category?: string }) {
  const key = ['services', JSON.stringify(params)].join('-');
  
  return useOfflineData<Service[]>(
    key,
    () => offlineServicesApi.list(params)
  );
}

// Single service hook
export function useOfflineService(id: string | null) {
  return useOfflineData<Service>(
    id ? `service-${id}` : null!,
    () => offlineServicesApi.get(id!)
  );
}

// Sync status hook
export function useSyncStatus() {
  const [queueCount, setQueueCount] = useState(0);
  const [pendingCounts, setPendingCounts] = useState<Record<string, number>>({});

  const refresh = useCallback(async () => {
    const [count, pending] = await Promise.all([
      getSyncQueueCount(),
      getPendingCounts(),
    ]);
    setQueueCount(count);
    setPendingCounts(pending);
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 10000);
    return () => clearInterval(interval);
  }, [refresh]);

  return {
    queueCount,
    pendingCounts,
    refresh,
  };
}

export interface SyncQueueEntry extends SyncQueueItem {
  isFailed: boolean;
}

// Hook que expoe a fila de sincronizacao detalhada com acoes de
// reprocessar/descartar para dar visibilidade ao usuario.
export function useSyncQueue() {
  const [items, setItems] = useState<SyncQueueEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  const refresh = useCallback(async () => {
    const queue = await getSyncQueue();
    setItems(
      queue
        .map((item) => ({ ...item, isFailed: item.attempts >= MAX_RETRY_ATTEMPTS }))
        .sort((a, b) => b.timestamp - a.timestamp)
    );
    setIsLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, [refresh]);

  const retry = useCallback(async (id: string) => {
    setIsProcessing(true);
    try {
      await retryFailedItem(id);
      await refresh();
    } finally {
      setIsProcessing(false);
    }
  }, [refresh]);

  const discard = useCallback(async (id: string) => {
    setIsProcessing(true);
    try {
      await discardFailedItem(id);
      await refresh();
    } finally {
      setIsProcessing(false);
    }
  }, [refresh]);

  const retryAll = useCallback(async () => {
    setIsProcessing(true);
    try {
      await retryAllFailed();
      await refresh();
    } finally {
      setIsProcessing(false);
    }
  }, [refresh]);

  const syncNow = useCallback(async () => {
    setIsProcessing(true);
    try {
      await forceSync();
      await refresh();
    } finally {
      setIsProcessing(false);
    }
  }, [refresh]);

  const failedCount = items.filter((i) => i.isFailed).length;
  const pendingCount = items.length - failedCount;

  return {
    items,
    isLoading,
    isProcessing,
    failedCount,
    pendingCount,
    retry,
    discard,
    retryAll,
    syncNow,
    refresh,
  };
}

// Mutation hooks
export function useAppointmentMutations() {
  const create = useCallback(async (data: Parameters<typeof offlineAppointmentsApi.create>[0]) => {
    const result = await offlineAppointmentsApi.create(data);
    if (result.success) {
      // Invalidate appointments list
      mutate((key) => typeof key === 'string' && key.startsWith('appointments'), undefined, { revalidate: true });
    }
    return result;
  }, []);

  const update = useCallback(async (id: string, data: Partial<Appointment>) => {
    const result = await offlineAppointmentsApi.update(id, data);
    if (result.success) {
      mutate(`appointment-${id}`);
      mutate((key) => typeof key === 'string' && key.startsWith('appointments'), undefined, { revalidate: true });
    }
    return result;
  }, []);

  const remove = useCallback(async (id: string) => {
    const result = await offlineAppointmentsApi.delete(id);
    if (result.success) {
      mutate((key) => typeof key === 'string' && key.startsWith('appointments'), undefined, { revalidate: true });
    }
    return result;
  }, []);

  const updateStatus = useCallback(async (id: string, status: string) => {
    const result = await offlineAppointmentsApi.updateStatus(id, status);
    if (result.success) {
      mutate(`appointment-${id}`);
      mutate((key) => typeof key === 'string' && key.startsWith('appointments'), undefined, { revalidate: true });
    }
    return result;
  }, []);

  return { create, update, remove, updateStatus };
}

export function useClientMutations() {
  const create = useCallback(async (data: Partial<Client>) => {
    const result = await offlineClientsApi.create(data);
    if (result.success) {
      mutate((key) => typeof key === 'string' && key.startsWith('clients'), undefined, { revalidate: true });
    }
    return result;
  }, []);

  const update = useCallback(async (id: string, data: Partial<Client>) => {
    const result = await offlineClientsApi.update(id, data);
    if (result.success) {
      mutate(`client-${id}`);
      mutate((key) => typeof key === 'string' && key.startsWith('clients'), undefined, { revalidate: true });
    }
    return result;
  }, []);

  const remove = useCallback(async (id: string) => {
    const result = await offlineClientsApi.delete(id);
    if (result.success) {
      mutate((key) => typeof key === 'string' && key.startsWith('clients'), undefined, { revalidate: true });
    }
    return result;
  }, []);

  return { create, update, remove };
}

export function useProfessionalMutations() {
  const create = useCallback(async (data: Partial<Professional>) => {
    const result = await offlineProfessionalsApi.create(data);
    if (result.success) {
      mutate((key) => typeof key === 'string' && key.startsWith('professionals'), undefined, { revalidate: true });
    }
    return result;
  }, []);

  const update = useCallback(async (id: string, data: Partial<Professional>) => {
    const result = await offlineProfessionalsApi.update(id, data);
    if (result.success) {
      mutate(`professional-${id}`);
      mutate((key) => typeof key === 'string' && key.startsWith('professionals'), undefined, { revalidate: true });
    }
    return result;
  }, []);

  const remove = useCallback(async (id: string) => {
    const result = await offlineProfessionalsApi.delete(id);
    if (result.success) {
      mutate((key) => typeof key === 'string' && key.startsWith('professionals'), undefined, { revalidate: true });
    }
    return result;
  }, []);

  return { create, update, remove };
}

export function useServiceMutations() {
  const create = useCallback(async (data: Partial<Service>) => {
    const result = await offlineServicesApi.create(data);
    if (result.success) {
      mutate((key) => typeof key === 'string' && key.startsWith('services'), undefined, { revalidate: true });
    }
    return result;
  }, []);

  const update = useCallback(async (id: string, data: Partial<Service>) => {
    const result = await offlineServicesApi.update(id, data);
    if (result.success) {
      mutate(`service-${id}`);
      mutate((key) => typeof key === 'string' && key.startsWith('services'), undefined, { revalidate: true });
    }
    return result;
  }, []);

  const remove = useCallback(async (id: string) => {
    const result = await offlineServicesApi.delete(id);
    if (result.success) {
      mutate((key) => typeof key === 'string' && key.startsWith('services'), undefined, { revalidate: true });
    }
    return result;
  }, []);

  return { create, update, remove };
}
