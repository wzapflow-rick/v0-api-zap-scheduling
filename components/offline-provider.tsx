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

          // Quando um novo SW for encontrado, pede para ele assumir
          // imediatamente (evita ficar preso em "waiting" servindo a
          // versao antiga com a lista de assets quebrada).
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (!newWorker) return;
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                newWorker.postMessage({ type: 'SKIP_WAITING' });
              }
            });
          });

          // Procura por atualizacoes do SW periodicamente.
          registration.update().catch(() => {});
        })
        .catch((error) => {
          console.error('Service Worker registration failed:', error);
        });

      // Recarrega a pagina uma unica vez quando o novo SW assumir o controle.
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) return;
        refreshing = true;
        window.location.reload();
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
