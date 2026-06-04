import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type {
  Appointment,
  Client,
  Professional,
  Service,
  Establishment,
  User,
} from '@/types';

// Sync status for offline tracking
export type SyncStatus = 'synced' | 'pending' | 'failed';

// Operation types for the sync queue
export type OperationType = 'create' | 'update' | 'delete';

// Entity types that can be synced
export type EntityType = 'appointment' | 'client' | 'professional' | 'service';

// Wrapper for offline entities with sync metadata
export interface OfflineEntity<T> {
  id: string;
  data: T;
  syncStatus: SyncStatus;
  localId?: string; // For items created offline
  updatedAt: number; // Timestamp for conflict resolution
  createdAt: number;
}

// Sync queue item
export interface SyncQueueItem {
  id: string;
  entityType: EntityType;
  operationType: OperationType;
  entityId: string;
  data: unknown;
  timestamp: number;
  attempts: number;
  lastAttempt?: number;
  error?: string;
}

// Metadata store for sync status
export interface SyncMetadata {
  key: string;
  value: unknown;
}

// Database schema
interface OfflineDBSchema extends DBSchema {
  appointments: {
    key: string;
    value: OfflineEntity<Appointment>;
    indexes: {
      'by-sync-status': SyncStatus;
      'by-date': string;
      'by-updated-at': number;
    };
  };
  clients: {
    key: string;
    value: OfflineEntity<Client>;
    indexes: {
      'by-sync-status': SyncStatus;
      'by-updated-at': number;
    };
  };
  professionals: {
    key: string;
    value: OfflineEntity<Professional>;
    indexes: {
      'by-sync-status': SyncStatus;
      'by-updated-at': number;
    };
  };
  services: {
    key: string;
    value: OfflineEntity<Service>;
    indexes: {
      'by-sync-status': SyncStatus;
      'by-updated-at': number;
    };
  };
  establishment: {
    key: string;
    value: OfflineEntity<Establishment>;
  };
  user: {
    key: string;
    value: OfflineEntity<User>;
  };
  syncQueue: {
    key: string;
    value: SyncQueueItem;
    indexes: {
      'by-timestamp': number;
      'by-entity-type': EntityType;
      'by-attempts': number;
    };
  };
  metadata: {
    key: string;
    value: SyncMetadata;
  };
}

const DB_NAME = 'zapflow-offline';
const DB_VERSION = 1;
const RETENTION_DAYS = 30;

let dbInstance: IDBPDatabase<OfflineDBSchema> | null = null;

// Initialize database
export async function getDB(): Promise<IDBPDatabase<OfflineDBSchema>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<OfflineDBSchema>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Appointments store
      if (!db.objectStoreNames.contains('appointments')) {
        const appointmentsStore = db.createObjectStore('appointments', { keyPath: 'id' });
        appointmentsStore.createIndex('by-sync-status', 'syncStatus');
        appointmentsStore.createIndex('by-date', 'data.date');
        appointmentsStore.createIndex('by-updated-at', 'updatedAt');
      }

      // Clients store
      if (!db.objectStoreNames.contains('clients')) {
        const clientsStore = db.createObjectStore('clients', { keyPath: 'id' });
        clientsStore.createIndex('by-sync-status', 'syncStatus');
        clientsStore.createIndex('by-updated-at', 'updatedAt');
      }

      // Professionals store
      if (!db.objectStoreNames.contains('professionals')) {
        const professionalsStore = db.createObjectStore('professionals', { keyPath: 'id' });
        professionalsStore.createIndex('by-sync-status', 'syncStatus');
        professionalsStore.createIndex('by-updated-at', 'updatedAt');
      }

      // Services store
      if (!db.objectStoreNames.contains('services')) {
        const servicesStore = db.createObjectStore('services', { keyPath: 'id' });
        servicesStore.createIndex('by-sync-status', 'syncStatus');
        servicesStore.createIndex('by-updated-at', 'updatedAt');
      }

      // Establishment store (single record)
      if (!db.objectStoreNames.contains('establishment')) {
        db.createObjectStore('establishment', { keyPath: 'id' });
      }

      // User store (single record)
      if (!db.objectStoreNames.contains('user')) {
        db.createObjectStore('user', { keyPath: 'id' });
      }

      // Sync queue store
      if (!db.objectStoreNames.contains('syncQueue')) {
        const syncQueueStore = db.createObjectStore('syncQueue', { keyPath: 'id' });
        syncQueueStore.createIndex('by-timestamp', 'timestamp');
        syncQueueStore.createIndex('by-entity-type', 'entityType');
        syncQueueStore.createIndex('by-attempts', 'attempts');
      }

      // Metadata store
      if (!db.objectStoreNames.contains('metadata')) {
        db.createObjectStore('metadata', { keyPath: 'key' });
      }
    },
  });

  return dbInstance;
}

// Generate unique local ID for offline-created items
export function generateLocalId(): string {
  return `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Check if ID is a local ID (created offline)
export function isLocalId(id: string): boolean {
  return id.startsWith('local_');
}

// ==================== Generic CRUD operations ====================

// Save entity to store
export async function saveEntity<T>(
  storeName: 'appointments' | 'clients' | 'professionals' | 'services',
  entity: T & { id: string },
  syncStatus: SyncStatus = 'synced'
): Promise<void> {
  const db = await getDB();
  const now = Date.now();

  const offlineEntity: OfflineEntity<T> = {
    id: entity.id,
    data: entity,
    syncStatus,
    updatedAt: now,
    createdAt: now,
    ...(isLocalId(entity.id) && { localId: entity.id }),
  };

  await db.put(storeName, offlineEntity as OfflineEntity<Appointment | Client | Professional | Service>);
}

// Get entity from store
export async function getEntity<T>(
  storeName: 'appointments' | 'clients' | 'professionals' | 'services',
  id: string
): Promise<OfflineEntity<T> | undefined> {
  const db = await getDB();
  return db.get(storeName, id) as Promise<OfflineEntity<T> | undefined>;
}

// Get all entities from store
export async function getAllEntities<T>(
  storeName: 'appointments' | 'clients' | 'professionals' | 'services'
): Promise<OfflineEntity<T>[]> {
  const db = await getDB();
  return db.getAll(storeName) as Promise<OfflineEntity<T>[]>;
}

// Delete entity from store
export async function deleteEntity(
  storeName: 'appointments' | 'clients' | 'professionals' | 'services',
  id: string
): Promise<void> {
  const db = await getDB();
  await db.delete(storeName, id);
}

// Get entities by sync status
export async function getEntitiesBySyncStatus<T>(
  storeName: 'appointments' | 'clients' | 'professionals' | 'services',
  syncStatus: SyncStatus
): Promise<OfflineEntity<T>[]> {
  const db = await getDB();
  return db.getAllFromIndex(storeName, 'by-sync-status', syncStatus) as Promise<OfflineEntity<T>[]>;
}

// Update entity sync status
export async function updateSyncStatus(
  storeName: 'appointments' | 'clients' | 'professionals' | 'services',
  id: string,
  syncStatus: SyncStatus
): Promise<void> {
  const db = await getDB();
  const entity = await db.get(storeName, id);
  if (entity) {
    entity.syncStatus = syncStatus;
    entity.updatedAt = Date.now();
    await db.put(storeName, entity);
  }
}

// ==================== Sync Queue Operations ====================

// Add item to sync queue
export async function addToSyncQueue(
  entityType: EntityType,
  operationType: OperationType,
  entityId: string,
  data: unknown
): Promise<void> {
  const db = await getDB();
  
  // Check queue limit (50 items max)
  const queueCount = await db.count('syncQueue');
  if (queueCount >= 50) {
    // Remove oldest item if at limit
    const oldest = await db.getFromIndex('syncQueue', 'by-timestamp', IDBKeyRange.lowerBound(0));
    if (oldest) {
      await db.delete('syncQueue', oldest.id);
    }
  }

  const item: SyncQueueItem = {
    id: `${entityType}_${operationType}_${entityId}_${Date.now()}`,
    entityType,
    operationType,
    entityId,
    data,
    timestamp: Date.now(),
    attempts: 0,
  };

  await db.add('syncQueue', item);
}

// Get all items from sync queue
export async function getSyncQueue(): Promise<SyncQueueItem[]> {
  const db = await getDB();
  return db.getAllFromIndex('syncQueue', 'by-timestamp');
}

// Get queue count
export async function getSyncQueueCount(): Promise<number> {
  const db = await getDB();
  return db.count('syncQueue');
}

// Remove item from sync queue
export async function removeFromSyncQueue(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('syncQueue', id);
}

// Update sync queue item (for retry tracking)
export async function updateSyncQueueItem(
  id: string,
  updates: Partial<SyncQueueItem>
): Promise<void> {
  const db = await getDB();
  const item = await db.get('syncQueue', id);
  if (item) {
    await db.put('syncQueue', { ...item, ...updates });
  }
}

// Reseta as tentativas de um item para reprocessamento manual imediato.
export async function resetSyncQueueItem(id: string): Promise<void> {
  const db = await getDB();
  const item = await db.get('syncQueue', id);
  if (item) {
    await db.put('syncQueue', {
      ...item,
      attempts: 0,
      lastAttempt: undefined,
      error: undefined,
    });
    // Volta a entidade local para "pending" para refletir na UI.
    const storeName = `${item.entityType}s` as 'appointments' | 'clients' | 'professionals' | 'services';
    const entity = await db.get(storeName, item.entityId);
    if (entity) {
      entity.syncStatus = 'pending';
      await db.put(storeName, entity);
    }
  }
}

// Remove um item da fila e marca a entidade local de volta como "synced"
// (descarta a alteracao pendente que estava falhando).
export async function discardSyncQueueItem(id: string): Promise<void> {
  const db = await getDB();
  const item = await db.get('syncQueue', id);
  if (!item) return;

  await db.delete('syncQueue', id);

  const storeName = `${item.entityType}s` as 'appointments' | 'clients' | 'professionals' | 'services';
  // Itens criados offline (local_) que nunca chegaram ao servidor sao
  // removidos por completo ao descartar. Os demais voltam a "synced".
  if (isLocalId(item.entityId) && item.operationType === 'create') {
    await db.delete(storeName, item.entityId);
  } else {
    const entity = await db.get(storeName, item.entityId);
    if (entity) {
      entity.syncStatus = 'synced';
      await db.put(storeName, entity);
    }
  }
}

// ==================== User & Establishment ====================

export async function saveUser(user: User): Promise<void> {
  const db = await getDB();
  const offlineEntity: OfflineEntity<User> = {
    id: user.id,
    data: user,
    syncStatus: 'synced',
    updatedAt: Date.now(),
    createdAt: Date.now(),
  };
  await db.put('user', offlineEntity);
}

export async function getUser(): Promise<User | null> {
  const db = await getDB();
  const users = await db.getAll('user');
  return users[0]?.data ?? null;
}

export async function saveEstablishment(establishment: Establishment): Promise<void> {
  const db = await getDB();
  const offlineEntity: OfflineEntity<Establishment> = {
    id: establishment.id,
    data: establishment,
    syncStatus: 'synced',
    updatedAt: Date.now(),
    createdAt: Date.now(),
  };
  await db.put('establishment', offlineEntity);
}

export async function getEstablishment(): Promise<Establishment | null> {
  const db = await getDB();
  const establishments = await db.getAll('establishment');
  return establishments[0]?.data ?? null;
}

// ==================== Metadata ====================

export async function setMetadata(key: string, value: unknown): Promise<void> {
  const db = await getDB();
  await db.put('metadata', { key, value });
}

export async function getMetadata<T>(key: string): Promise<T | null> {
  const db = await getDB();
  const item = await db.get('metadata', key);
  return (item?.value as T) ?? null;
}

// ==================== Cleanup ====================

// Clean up old data beyond retention period
export async function cleanupOldData(): Promise<void> {
  const db = await getDB();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);
  const cutoffTimestamp = cutoffDate.getTime();

  // Clean old appointments
  const appointments = await db.getAllFromIndex('appointments', 'by-updated-at');
  for (const apt of appointments) {
    if (apt.updatedAt < cutoffTimestamp && apt.syncStatus === 'synced') {
      await db.delete('appointments', apt.id);
    }
  }
}

// Clear all offline data (for logout)
export async function clearAllOfflineData(): Promise<void> {
  const db = await getDB();
  await db.clear('appointments');
  await db.clear('clients');
  await db.clear('professionals');
  await db.clear('services');
  await db.clear('establishment');
  await db.clear('user');
  await db.clear('syncQueue');
  await db.clear('metadata');
}

// ==================== Bulk Operations ====================

// Bulk save entities (for initial sync)
export async function bulkSaveEntities<T extends { id: string }>(
  storeName: 'appointments' | 'clients' | 'professionals' | 'services',
  entities: T[]
): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(storeName, 'readwrite');
  const now = Date.now();

  for (const entity of entities) {
    const offlineEntity: OfflineEntity<T> = {
      id: entity.id,
      data: entity,
      syncStatus: 'synced',
      updatedAt: now,
      createdAt: now,
    };
    await tx.store.put(offlineEntity as OfflineEntity<Appointment | Client | Professional | Service>);
  }

  await tx.done;
}

// Get pending count for each entity type
export async function getPendingCounts(): Promise<Record<EntityType, number>> {
  const db = await getDB();
  
  const [appointments, clients, professionals, services] = await Promise.all([
    db.countFromIndex('appointments', 'by-sync-status', 'pending'),
    db.countFromIndex('clients', 'by-sync-status', 'pending'),
    db.countFromIndex('professionals', 'by-sync-status', 'pending'),
    db.countFromIndex('services', 'by-sync-status', 'pending'),
  ]);

  return {
    appointment: appointments,
    client: clients,
    professional: professionals,
    service: services,
  };
}
