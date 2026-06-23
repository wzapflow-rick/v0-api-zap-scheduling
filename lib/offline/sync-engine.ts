import {
  getSyncQueue,
  removeFromSyncQueue,
  updateSyncQueueItem,
  resetSyncQueueItem,
  discardSyncQueueItem,
  updateSyncStatus,
  saveEntity,
  deleteEntity,
  getMetadata,
  setMetadata,
  bulkSaveEntities,
  saveUser,
  saveEstablishment,
  type SyncQueueItem,
  type EntityType,
} from './db';
import {
  appointmentsApi,
  clientsApi,
  professionalsApi,
  servicesApi,
  authApi,
  establishmentApi,
} from '@/lib/api';
import type { Appointment, Client, Professional, Service } from '@/types';

// Sync configuration
const MAX_RETRY_ATTEMPTS = 5;
const BASE_RETRY_DELAY = 1000; // 1 second
const MAX_RETRY_DELAY = 60000; // 1 minute

// Sync status
export interface SyncStatus {
  isOnline: boolean;
  isBackendAvailable: boolean;
  isSyncing: boolean;
  lastSyncAt: number | null;
  pendingCount: number;
  failedCount: number;
}

// Event emitter for sync status updates
type SyncEventCallback = (status: SyncStatus) => void;
const syncListeners: Set<SyncEventCallback> = new Set();

let currentSyncStatus: SyncStatus = {
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  isBackendAvailable: true,
  isSyncing: false,
  lastSyncAt: null,
  pendingCount: 0,
  failedCount: 0,
};

// Subscribe to sync status updates
export function subscribeSyncStatus(callback: SyncEventCallback): () => void {
  syncListeners.add(callback);
  callback(currentSyncStatus);
  return () => syncListeners.delete(callback);
}

// Update and broadcast sync status
function updateSyncStatusState(updates: Partial<SyncStatus>): void {
  currentSyncStatus = { ...currentSyncStatus, ...updates };
  syncListeners.forEach((cb) => cb(currentSyncStatus));
}

// Get current sync status
export function getSyncStatus(): SyncStatus {
  return currentSyncStatus;
}

// Calculate exponential backoff delay
function getRetryDelay(attempts: number): number {
  const delay = Math.min(BASE_RETRY_DELAY * Math.pow(2, attempts), MAX_RETRY_DELAY);
  // Add jitter to prevent thundering herd
  return delay + Math.random() * 1000;
}

// Check if backend is available by testing a simple API call
export async function checkBackendAvailability(): Promise<boolean> {
  // If browser is offline, backend is definitely not available
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    updateSyncStatusState({ isBackendAvailable: false });
    return false;
  }

  try {
    // O endpoint /api/health agora faz um ping real ao backend e retorna
    // { status, backend, backendStatus }. Usamos o campo "backend" para
    // saber se o servidor/banco esta de fato respondendo.
    const localResponse = await fetch('/api/health', {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
      cache: 'no-store',
    });

    if (!localResponse.ok) {
      updateSyncStatusState({ isBackendAvailable: false });
      return false;
    }

    const health = await localResponse.json().catch(() => null);
    // Compatibilidade: se a resposta nao tiver o campo "backend"
    // (versao antiga), assumimos disponivel quando o app responde ok.
    const isAvailable =
      health && typeof health.backend === 'boolean' ? health.backend : true;

    updateSyncStatusState({ isBackendAvailable: isAvailable });
    return isAvailable;
  } catch {
    updateSyncStatusState({ isBackendAvailable: false });
    return false;
  }
}

// Resultado do processamento de um item da fila.
// - success: sincronizou com o servidor
// - permanent: falha que NAO deve ser retentada (ex.: conflito de horario,
//   validacao 4xx). O item vai direto para "failed".
// - error: mensagem para exibir ao usuario.
interface ProcessResult {
  success: boolean;
  permanent?: boolean;
  error?: string;
}

// Decide se um status HTTP representa erro permanente (nao retentavel).
// 4xx geralmente sao permanentes (ex.: 409 conflito de slot, 422 validacao),
// exceto 408 (timeout) e 429 (rate limit), que valem retry.
function isPermanentError(status?: number): boolean {
  if (!status) return false;
  if (status === 408 || status === 429) return false;
  return status >= 400 && status < 500;
}

// Process a single sync queue item
async function processSyncItem(item: SyncQueueItem): Promise<ProcessResult> {
  const { entityType, operationType, entityId, data } = item;

  try {
    let result: { success: boolean; data?: unknown; status?: number; error?: string };

    switch (entityType) {
      case 'appointment':
        result = await processAppointmentSync(operationType, entityId, data as Partial<Appointment>);
        break;
      case 'client':
        result = await processClientSync(operationType, entityId, data as Partial<Client>);
        break;
      case 'professional':
        result = await processProfessionalSync(operationType, entityId, data as Partial<Professional>);
        break;
      case 'service':
        result = await processServiceSync(operationType, entityId, data as Partial<Service>);
        break;
      default:
        return { success: false, permanent: true, error: 'Tipo de entidade desconhecido' };
    }

    if (result.success) {
      // Update local entity with server response (may have new ID)
      if (result.data && operationType !== 'delete') {
        await saveEntity(
          `${entityType}s` as 'appointments' | 'clients' | 'professionals' | 'services',
          result.data as Appointment | Client | Professional | Service & { id: string },
          'synced'
        );
      }
      return { success: true };
    }

    return {
      success: false,
      permanent: isPermanentError(result.status),
      error: result.error,
    };
  } catch {
    // Excecao inesperada => trata como transitorio (vale retry).
    return { success: false, permanent: false, error: 'Falha inesperada na sincronizacao' };
  }
}

// Process appointment sync
async function processAppointmentSync(
  operationType: string,
  entityId: string,
  data: Partial<Appointment>
): Promise<{ success: boolean; data?: Appointment; status?: number; error?: string }> {
  switch (operationType) {
    case 'create':
      // Transform data for API
      const createData = {
        professionalId: data.professional?.id || '',
        serviceId: data.service?.id || '',
        clientId: data.client?.id || '',
        date: data.date || '',
        startTime: data.startTime || '',
        notes: data.notes,
      };
      const createResult = await appointmentsApi.create(createData);
      return {
        success: createResult.success,
        data: createResult.data,
        status: createResult.status,
        error: createResult.error,
      };

    case 'update':
      const updateResult = await appointmentsApi.update(entityId, data);
      return {
        success: updateResult.success,
        data: updateResult.data,
        status: updateResult.status,
        error: updateResult.error,
      };

    case 'delete':
      const deleteResult = await appointmentsApi.delete(entityId);
      if (deleteResult.success) {
        await deleteEntity('appointments', entityId);
      }
      return { success: deleteResult.success, status: deleteResult.status, error: deleteResult.error };

    default:
      return { success: false };
  }
}

// Process client sync
async function processClientSync(
  operationType: string,
  entityId: string,
  data: Partial<Client>
): Promise<{ success: boolean; data?: Client; status?: number; error?: string }> {
  switch (operationType) {
    case 'create':
      const createResult = await clientsApi.create(data);
      return { success: createResult.success, data: createResult.data, status: createResult.status, error: createResult.error };

    case 'update':
      const updateResult = await clientsApi.update(entityId, data);
      return { success: updateResult.success, data: updateResult.data, status: updateResult.status, error: updateResult.error };

    case 'delete':
      const deleteResult = await clientsApi.delete(entityId);
      if (deleteResult.success) {
        await deleteEntity('clients', entityId);
      }
      return { success: deleteResult.success, status: deleteResult.status, error: deleteResult.error };

    default:
      return { success: false };
  }
}

// Process professional sync
async function processProfessionalSync(
  operationType: string,
  entityId: string,
  data: Partial<Professional>
): Promise<{ success: boolean; data?: Professional; status?: number; error?: string }> {
  // Envia só o vínculo via serviceIds; remove arrays de exibição/ids locais
  const { services: _services, id: _id, ...payload } = data as Professional & { id?: string };

  switch (operationType) {
    case 'create':
      const createResult = await professionalsApi.create(payload);
      return { success: createResult.success, data: createResult.data, status: createResult.status, error: createResult.error };

    case 'update':
      const updateResult = await professionalsApi.update(entityId, payload);
      return { success: updateResult.success, data: updateResult.data, status: updateResult.status, error: updateResult.error };

    case 'delete':
      const deleteResult = await professionalsApi.delete(entityId);
      if (deleteResult.success) {
        await deleteEntity('professionals', entityId);
      }
      return { success: deleteResult.success, status: deleteResult.status, error: deleteResult.error };

    default:
      return { success: false };
  }
}

// Process service sync
async function processServiceSync(
  operationType: string,
  entityId: string,
  data: Partial<Service>
): Promise<{ success: boolean; data?: Service; status?: number; error?: string }> {
  // Envia só o vínculo via professionalIds; remove arrays de exibição/ids locais
  const { professionals: _professionals, id: _id, ...payload } = data as Service & { id?: string };

  switch (operationType) {
    case 'create':
      const createResult = await servicesApi.create(payload);
      return { success: createResult.success, data: createResult.data, status: createResult.status, error: createResult.error };

    case 'update':
      const updateResult = await servicesApi.update(entityId, payload);
      return { success: updateResult.success, data: updateResult.data, status: updateResult.status, error: updateResult.error };

    case 'delete':
      const deleteResult = await servicesApi.delete(entityId);
      if (deleteResult.success) {
        await deleteEntity('services', entityId);
      }
      return { success: deleteResult.success, status: deleteResult.status, error: deleteResult.error };

    default:
      return { success: false };
  }
}

// Process the entire sync queue
export async function processQueue(): Promise<void> {
  if (currentSyncStatus.isSyncing) return;
  if (!currentSyncStatus.isOnline || !currentSyncStatus.isBackendAvailable) return;

  updateSyncStatusState({ isSyncing: true });

  try {
    const queue = await getSyncQueue();
    let pendingCount = 0;
    let failedCount = 0;

    for (const item of queue) {
      // Skip items that haven't waited long enough after failed attempts
      if (item.lastAttempt && item.attempts > 0) {
        const delay = getRetryDelay(item.attempts);
        if (Date.now() - item.lastAttempt < delay) {
          pendingCount++;
          continue;
        }
      }

      // Skip items that exceeded max retries
      if (item.attempts >= MAX_RETRY_ATTEMPTS) {
        failedCount++;
        // Mark entity as failed
        await updateSyncStatus(
          `${item.entityType}s` as 'appointments' | 'clients' | 'professionals' | 'services',
          item.entityId,
          'failed'
        );
        continue;
      }

      const result = await processSyncItem(item);

      if (result.success) {
        await removeFromSyncQueue(item.id);
      } else if (result.permanent) {
        // Erro permanente (conflito de horario, validacao): nao adianta
        // retentar. Marca a entidade como "failed" e mantem o item na fila
        // com tentativas no maximo, para o usuario resolver manualmente.
        await updateSyncQueueItem(item.id, {
          attempts: MAX_RETRY_ATTEMPTS,
          lastAttempt: Date.now(),
          error: result.error || 'Conflito ao sincronizar',
        });
        await updateSyncStatus(
          `${item.entityType}s` as 'appointments' | 'clients' | 'professionals' | 'services',
          item.entityId,
          'failed'
        );
        failedCount++;
      } else {
        // Erro transitorio: agenda novo retry com backoff.
        await updateSyncQueueItem(item.id, {
          attempts: item.attempts + 1,
          lastAttempt: Date.now(),
          error: result.error || 'Falha temporaria na sincronizacao',
        });
        pendingCount++;
      }
    }

    updateSyncStatusState({
      lastSyncAt: Date.now(),
      pendingCount,
      failedCount,
    });
  } finally {
    updateSyncStatusState({ isSyncing: false });
  }
}

// Initial data sync - fetch all data from backend
export async function performInitialSync(): Promise<boolean> {
  if (!currentSyncStatus.isOnline) return false;

  const isBackendUp = await checkBackendAvailability();
  if (!isBackendUp) return false;

  updateSyncStatusState({ isSyncing: true });

  try {
    // Fetch user and establishment
    const [userResult, establishmentResult] = await Promise.all([
      authApi.me(),
      establishmentApi.get(),
    ]);

    if (userResult.success && userResult.data) {
      await saveUser(userResult.data);
    }

    if (establishmentResult.success && establishmentResult.data) {
      await saveEstablishment(establishmentResult.data);
    }

    // Fetch all entities in parallel
    const [appointmentsResult, clientsResult, professionalsResult, servicesResult] = await Promise.all([
      appointmentsApi.list({ limit: 500 }),
      clientsApi.list({ limit: 500 }),
      professionalsApi.list({ limit: 500 }),
      servicesApi.list({ limit: 500 }),
    ]);

    // Save to IndexedDB
    if (appointmentsResult.success && appointmentsResult.data) {
      await bulkSaveEntities('appointments', appointmentsResult.data);
    }

    if (clientsResult.success && clientsResult.data) {
      await bulkSaveEntities('clients', clientsResult.data);
    }

    if (professionalsResult.success && professionalsResult.data) {
      await bulkSaveEntities('professionals', professionalsResult.data);
    }

    if (servicesResult.success && servicesResult.data) {
      await bulkSaveEntities('services', servicesResult.data);
    }

    await setMetadata('lastFullSync', Date.now());
    updateSyncStatusState({ lastSyncAt: Date.now() });

    return true;
  } catch {
    return false;
  } finally {
    updateSyncStatusState({ isSyncing: false });
  }
}

// Check if initial sync is needed
export async function needsInitialSync(): Promise<boolean> {
  const lastSync = await getMetadata<number>('lastFullSync');
  if (!lastSync) return true;

  // Resync if last sync was more than 24 hours ago
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
  return lastSync < oneDayAgo;
}

// Start sync engine (call once on app load)
let syncInterval: ReturnType<typeof setInterval> | null = null;
let healthCheckInterval: ReturnType<typeof setInterval> | null = null;

export function startSyncEngine(): void {
  if (typeof window === 'undefined') return;

  // Listen for online/offline events
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  // Initial state
  updateSyncStatusState({ isOnline: navigator.onLine });

  // Check backend availability periodically
  healthCheckInterval = setInterval(checkBackendAvailability, 30000);

  // Process sync queue periodically
  syncInterval = setInterval(processQueue, 10000);

  // Initial backend check
  checkBackendAvailability();
}

export function stopSyncEngine(): void {
  if (typeof window === 'undefined') return;

  window.removeEventListener('online', handleOnline);
  window.removeEventListener('offline', handleOffline);

  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }

  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
    healthCheckInterval = null;
  }
}

function handleOnline(): void {
  updateSyncStatusState({ isOnline: true });
  // Immediately try to process queue when back online
  checkBackendAvailability().then((isAvailable) => {
    if (isAvailable) {
      processQueue();
    }
  });
}

function handleOffline(): void {
  updateSyncStatusState({ isOnline: false, isBackendAvailable: false });
}

// Force sync (manual trigger)
export async function forceSync(): Promise<void> {
  if (!currentSyncStatus.isOnline) return;

  const isAvailable = await checkBackendAvailability();
  if (isAvailable) {
    await processQueue();
  }
}

// Reprocessa um item que falhou: zera as tentativas e tenta sincronizar.
export async function retryFailedItem(queueItemId: string): Promise<void> {
  await resetSyncQueueItem(queueItemId);
  await refreshPendingCounts();
  await forceSync();
}

// Descarta um item que falhou (reverte a alteracao pendente).
export async function discardFailedItem(queueItemId: string): Promise<void> {
  await discardSyncQueueItem(queueItemId);
  await refreshPendingCounts();
}

// Reprocessa todos os itens que excederam tentativas.
export async function retryAllFailed(): Promise<void> {
  const queue = await getSyncQueue();
  for (const item of queue) {
    if (item.attempts >= MAX_RETRY_ATTEMPTS) {
      await resetSyncQueueItem(item.id);
    }
  }
  await refreshPendingCounts();
  await forceSync();
}

// Recalcula contadores de pendentes/falhas e propaga para os listeners.
async function refreshPendingCounts(): Promise<void> {
  const queue = await getSyncQueue();
  const failedCount = queue.filter((i) => i.attempts >= MAX_RETRY_ATTEMPTS).length;
  const pendingCount = queue.length - failedCount;
  updateSyncStatusState({ pendingCount, failedCount });
}

// Conflict resolution: last-write-wins with timestamp
export interface ConflictResolution {
  localData: unknown;
  serverData: unknown;
  localTimestamp: number;
  serverTimestamp: number;
}

export function resolveConflict(conflict: ConflictResolution): 'local' | 'server' {
  // Last write wins
  return conflict.localTimestamp > conflict.serverTimestamp ? 'local' : 'server';
}
