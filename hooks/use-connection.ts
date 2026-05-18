'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  subscribeSyncStatus,
  getSyncStatus,
  forceSync,
  checkBackendAvailability,
  type SyncStatus,
} from '@/lib/offline';

export interface ConnectionState {
  isOnline: boolean;
  isBackendAvailable: boolean;
  isSyncing: boolean;
  lastSyncAt: Date | null;
  pendingCount: number;
  failedCount: number;
  status: 'online' | 'offline' | 'syncing' | 'backend-down';
}

export function useConnection() {
  const [state, setState] = useState<ConnectionState>(() => {
    const syncStatus = getSyncStatus();
    return {
      isOnline: syncStatus.isOnline,
      isBackendAvailable: syncStatus.isBackendAvailable,
      isSyncing: syncStatus.isSyncing,
      lastSyncAt: syncStatus.lastSyncAt ? new Date(syncStatus.lastSyncAt) : null,
      pendingCount: syncStatus.pendingCount,
      failedCount: syncStatus.failedCount,
      status: getStatus(syncStatus),
    };
  });

  useEffect(() => {
    const unsubscribe = subscribeSyncStatus((syncStatus) => {
      setState({
        isOnline: syncStatus.isOnline,
        isBackendAvailable: syncStatus.isBackendAvailable,
        isSyncing: syncStatus.isSyncing,
        lastSyncAt: syncStatus.lastSyncAt ? new Date(syncStatus.lastSyncAt) : null,
        pendingCount: syncStatus.pendingCount,
        failedCount: syncStatus.failedCount,
        status: getStatus(syncStatus),
      });
    });

    return unsubscribe;
  }, []);

  const triggerSync = useCallback(async () => {
    await forceSync();
  }, []);

  const checkConnection = useCallback(async () => {
    await checkBackendAvailability();
  }, []);

  return {
    ...state,
    triggerSync,
    checkConnection,
  };
}

function getStatus(syncStatus: SyncStatus): ConnectionState['status'] {
  if (syncStatus.isSyncing) return 'syncing';
  if (!syncStatus.isOnline) return 'offline';
  if (!syncStatus.isBackendAvailable) return 'backend-down';
  return 'online';
}
