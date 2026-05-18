'use client';

import { useEffect, useRef } from 'react';
import {
  startSyncEngine,
  stopSyncEngine,
  performInitialSync,
  needsInitialSync,
} from '@/lib/offline';
import { useAuth } from '@/lib/auth-context';

export function OfflineProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const initialized = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('Service Worker registered:', registration.scope);
        })
        .catch((error) => {
          console.error('Service Worker registration failed:', error);
        });
    }

    // Start sync engine
    startSyncEngine();

    // Listen for sync messages from service worker
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'SYNC_REQUESTED') {
        // Trigger sync from main thread
        import('@/lib/offline').then(({ forceSync }) => forceSync());
      }
    };

    navigator.serviceWorker?.addEventListener('message', handleMessage);

    return () => {
      stopSyncEngine();
      navigator.serviceWorker?.removeEventListener('message', handleMessage);
    };
  }, []);

  // Perform initial sync when user logs in
  useEffect(() => {
    if (!user || initialized.current) return;

    const doInitialSync = async () => {
      const needsSync = await needsInitialSync();
      if (needsSync) {
        await performInitialSync();
      }
      initialized.current = true;
    };

    doInitialSync();
  }, [user]);

  return <>{children}</>;
}
