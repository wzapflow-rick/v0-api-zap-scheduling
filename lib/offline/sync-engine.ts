import {
  getSyncQueue,
  removeFromSyncQueue,
  updateSyncQueueItem,
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
    // Just check local app health - if the app is running, we consider it available
    // The actual API calls will handle their own errors
    const localResponse = await fetch('/api/health', {
      method: 'GET',
      signal: AbortSignal.timeout(3000),
    });
    
    const isAvailable = localResponse.ok;
    updateSyncStatusState({ isBackendAvailable: isAvailable });
    return isAvailable;
  } catch {
    updateSyncStatusState({ isBackendAvailable: false });
    return false;
  }
}

// Process a single sync queue item
async function processSyncItem(item: SyncQueueItem): Promise<boolean> {
  const { entityType, operationType, entityId, data } = item;

  try {
    let result;

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
        return false;
    }

    if (result.success) {
      // Update local entity with server response (may have new ID)
      if (result.data && operationType !== 'delete') {
        await saveEntity(
          `${entityType}s` as 'appointments' | 'clients' | 'professionals' | 'services',
          result.data,
          'synced'
        );
      }
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

// Process appointment sync
async function processAppointmentSync(
  operationType: string,
  entityId: string,
  data: Partial<Appointment>
): Promise<{ success: boolean; data?: Appointment }> {
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
      return { success: createResult.success, data: createResult.data };

    case 'update':
      const updateResult = await appointmentsApi.update(entityId, data);
      return { success: updateResult.success, data: updateResult.data };

    case 'delete':
      const deleteResult = await appointmentsApi.delete(entityId);
      if (deleteResult.success) {
        await deleteEntity('appointments', entityId);
      }
      return { success: deleteResult.success };

    default:
      return { success: false };
  }
}

// Process client sync
async function processClientSync(
  operationType: string,
  entityId: string,
  data: Partial<Client>
): Promise<{ success: boolean; data?: Client }> {
  switch (operationType) {
    case 'create':
      const createResult = await clientsApi.create(data);
      return { success: createResult.success, data: createResult.data };

    case 'update':
      const updateResult = await clientsApi.update(entityId, data);
      return { success: updateResult.success, data: updateResult.data };

    case 'delete':
      const deleteResult = await clientsApi.delete(entityId);
      if (deleteResult.success) {
        await deleteEntity('clients', entityId);
      }
      return { success: deleteResult.success };

    default:
      return { success: false };
  }
}

// Process professional sync
async function processProfessionalSync(
  operationType: string,
  entityId: string,
  data: Partial<Professional>
): Promise<{ success: boolean; data?: Professional }> {
  switch (operationType) {
    case 'create':
      const createResult = await professionalsApi.create(data);
      return { success: createResult.success, data: createResult.data };

    case 'update':
      const updateResult = await professionalsApi.update(entityId, data);
      return { success: updateResult.success, data: updateResult.data };

    case 'delete':
      const deleteResult = await professionalsApi.delete(entityId);
      if (deleteResult.success) {
        await deleteEntity('professionals', entityId);
      }
      return { success: deleteResult.success };

    default:
      return { success: false };
  }
}

// Process service sync
async function processServiceSync(
  operationType: string,
  entityId: string,
  data: Partial<Service>
): Promise<{ success: boolean; data?: Service }> {
  switch (operationType) {
    case 'create':
      const createResult = await servicesApi.create(data);
      return { success: createResult.success, data: createResult.data };

    case 'update':
      const updateResult = await servicesApi.update(entityId, data);
      return { success: updateResult.success, data: updateResult.data };

    case 'delete':
      const deleteResult = await servicesApi.delete(entityId);
      if (deleteResult.success) {
        await deleteEntity('services', entityId);
      }
      return { success: deleteResult.success };

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

      const success = await processSyncItem(item);

      if (success) {
        await removeFromSyncQueue(item.id);
      } else {
        await updateSyncQueueItem(item.id, {
          attempts: item.attempts + 1,
          lastAttempt: Date.now(),
          error: 'Sync failed',
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
