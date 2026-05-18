/**
 * Offline Module - Main Export
 * 
 * This module provides offline-first capabilities for the application.
 * After user login, all data operations can work without backend connectivity.
 */

// Database operations
export {
  getDB,
  saveEntity,
  getEntity,
  getAllEntities,
  deleteEntity,
  getEntitiesBySyncStatus,
  updateSyncStatus,
  addToSyncQueue,
  getSyncQueue,
  getSyncQueueCount,
  removeFromSyncQueue,
  saveUser,
  getUser,
  saveEstablishment,
  getEstablishment,
  setMetadata,
  getMetadata,
  cleanupOldData,
  clearAllOfflineData,
  bulkSaveEntities,
  getPendingCounts,
  generateLocalId,
  isLocalId,
  type SyncStatus as DbSyncStatus,
  type OperationType,
  type EntityType,
  type OfflineEntity,
  type SyncQueueItem,
} from './db';

// Sync engine
export {
  startSyncEngine,
  stopSyncEngine,
  processQueue,
  performInitialSync,
  needsInitialSync,
  forceSync,
  checkBackendAvailability,
  subscribeSyncStatus,
  getSyncStatus,
  resolveConflict,
  type SyncStatus,
  type ConflictResolution,
} from './sync-engine';

// Offline API wrappers
export {
  offlineAppointmentsApi,
  offlineClientsApi,
  offlineProfessionalsApi,
  offlineServicesApi,
} from './api-wrapper';
