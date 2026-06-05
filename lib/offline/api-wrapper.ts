/**
 * API Wrapper with Offline Fallback
 *
 * This module wraps the original API calls to provide:
 * 1. Offline support - saves data locally when offline
 * 2. Automatic sync - queues operations for later sync
 * 3. Fallback responses - returns cached data when backend is unavailable
 */

import {
  saveEntity,
  getEntity,
  getAllEntities,
  deleteEntity as deleteEntityFromDB,
  addToSyncQueue,
  generateLocalId,
  isLocalId,
  type OfflineEntity,
  type EntityType,
  type OperationType,
} from './db';
import { getSyncStatus, forceSync } from './sync-engine';
import {
  appointmentsApi,
  clientsApi,
  professionalsApi,
  servicesApi,
} from '@/lib/api';
import type {
  Appointment,
  Client,
  Professional,
  Service,
  ApiResponse,
} from '@/types';

// Helper to check if we should use offline mode
function shouldUseOffline(): boolean {
  const status = getSyncStatus();
  return !status.isOnline || !status.isBackendAvailable;
}

// Helper to extract data array from cached entities
function extractDataArray<T>(entities: OfflineEntity<T>[]): T[] {
  return entities.map((e) => e.data);
}

// O backend pode retornar tanto um array direto quanto um objeto paginado
// (ex.: { services: [...], pagination: {...} }). Esta funcao extrai o array
// com seguranca APENAS para fins de cache, sem alterar o formato original
// que e retornado para a pagina. Sem isso, um `for...of` sobre um objeto
// paginado lanca "not iterable" e quebra o carregamento.
function toEntityArray<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    for (const key of ['appointments', 'clients', 'professionals', 'services', 'items', 'data']) {
      if (Array.isArray(obj[key])) return obj[key] as T[];
    }
  }
  return [];
}

// ==================== Appointments API Wrapper ====================

export const offlineAppointmentsApi = {
  list: async (params?: {
    page?: number;
    limit?: number;
    status?: string;
    professionalId?: string;
    clientId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<ApiResponse<Appointment[]>> => {
    // Try online first
    if (!shouldUseOffline()) {
      const result = await appointmentsApi.list(params);
      if (result.success && result.data) {
        // Cache results (extrai array com seguranca; resposta pode ser paginada)
        for (const appointment of toEntityArray<Appointment>(result.data)) {
          await saveEntity('appointments', appointment, 'synced');
        }
        return result;
      }
    }

    // Fallback to offline data
    const cached = await getAllEntities<Appointment>('appointments');
    let data = extractDataArray(cached);

    // Apply filters
    if (params?.status) {
      data = data.filter((a) => a.status === params.status);
    }
    if (params?.professionalId) {
      data = data.filter((a) => a.professional?.id === params.professionalId);
    }
    if (params?.clientId) {
      data = data.filter((a) => a.client?.id === params.clientId);
    }
    if (params?.startDate) {
      data = data.filter((a) => a.date >= params.startDate!);
    }
    if (params?.endDate) {
      data = data.filter((a) => a.date <= params.endDate!);
    }

    // Sort by date
    data.sort((a, b) => a.date.localeCompare(b.date));

    return { success: true, data };
  },

  get: async (id: string): Promise<ApiResponse<Appointment>> => {
    if (!shouldUseOffline() && !isLocalId(id)) {
      const result = await appointmentsApi.get(id);
      if (result.success && result.data) {
        await saveEntity('appointments', result.data, 'synced');
        return result;
      }
    }

    const cached = await getEntity<Appointment>('appointments', id);
    if (cached) {
      return { success: true, data: cached.data };
    }

    return { success: false, error: 'Agendamento não encontrado' };
  },

  create: async (data: {
    professionalId: string;
    serviceId: string;
    clientId: string;
    date: string;
    startTime: string;
    notes?: string;
  }): Promise<ApiResponse<Appointment>> => {
    // Try online first
    if (!shouldUseOffline()) {
      const result = await appointmentsApi.create(data);
      if (result.success && result.data) {
        await saveEntity('appointments', result.data, 'synced');
        return result;
      }
    }

    // Create locally with temporary ID
    const localId = generateLocalId();
    
    // Get related entities from cache
    const [professional, service, client] = await Promise.all([
      getEntity<Professional>('professionals', data.professionalId),
      getEntity<Service>('services', data.serviceId),
      getEntity<Client>('clients', data.clientId),
    ]);

    // Calculate end time based on service duration
    const serviceDuration = service?.data.duration || 30;
    const [hours, minutes] = data.startTime.split(':').map(Number);
    const endMinutes = hours * 60 + minutes + serviceDuration;
    const endTime = `${String(Math.floor(endMinutes / 60)).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}`;

    const appointment: Appointment = {
      id: localId,
      date: data.date,
      startTime: data.startTime,
      endTime,
      status: 'PENDING',
      price: service?.data.price || 0,
      notes: data.notes,
      professional: professional?.data as Professional,
      service: service?.data as Service,
      client: client?.data as Client,
      createdAt: new Date().toISOString(),
    };

    await saveEntity('appointments', appointment, 'pending');
    await addToSyncQueue('appointment', 'create', localId, appointment);

    // Try to sync immediately
    forceSync();

    return { success: true, data: appointment };
  },

  update: async (id: string, data: Partial<Appointment>): Promise<ApiResponse<Appointment>> => {
    if (!shouldUseOffline() && !isLocalId(id)) {
      const result = await appointmentsApi.update(id, data);
      if (result.success && result.data) {
        await saveEntity('appointments', result.data, 'synced');
        return result;
      }
    }

    // Update locally
    const cached = await getEntity<Appointment>('appointments', id);
    if (cached) {
      const updated = { ...cached.data, ...data };
      await saveEntity('appointments', updated, 'pending');
      await addToSyncQueue('appointment', 'update', id, updated);
      forceSync();
      return { success: true, data: updated };
    }

    return { success: false, error: 'Agendamento não encontrado' };
  },

  delete: async (id: string): Promise<ApiResponse<void>> => {
    if (!shouldUseOffline() && !isLocalId(id)) {
      const result = await appointmentsApi.delete(id);
      if (result.success) {
        await deleteEntityFromDB('appointments', id);
        return result;
      }
    }

    // If it's a local-only item, just delete it
    if (isLocalId(id)) {
      await deleteEntityFromDB('appointments', id);
      return { success: true, data: undefined };
    }

    // Queue for deletion
    const cached = await getEntity<Appointment>('appointments', id);
    if (cached) {
      // Mark as deleted locally but keep for sync
      const deleted = { ...cached.data, status: 'CANCELLED' as const };
      await saveEntity('appointments', deleted, 'pending');
      await addToSyncQueue('appointment', 'delete', id, { id });
      forceSync();
      return { success: true, data: undefined };
    }

    return { success: false, error: 'Agendamento não encontrado' };
  },

  updateStatus: async (id: string, status: string): Promise<ApiResponse<Appointment>> => {
    if (!shouldUseOffline() && !isLocalId(id)) {
      const result = await appointmentsApi.updateStatus(id, status);
      if (result.success && result.data) {
        await saveEntity('appointments', result.data, 'synced');
        return result;
      }
    }

    // Update locally
    const cached = await getEntity<Appointment>('appointments', id);
    if (cached) {
      const updated = { ...cached.data, status: status as Appointment['status'] };
      await saveEntity('appointments', updated, 'pending');
      await addToSyncQueue('appointment', 'update', id, { status });
      forceSync();
      return { success: true, data: updated };
    }

    return { success: false, error: 'Agendamento não encontrado' };
  },

  // Slots dependem de calculo do servidor - somente online.
  getSlots: (params: { professionalId: string; serviceId: string; date: string }) =>
    appointmentsApi.getSlots(params),
};

// ==================== Clients API Wrapper ====================

export const offlineClientsApi = {
  list: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<ApiResponse<Client[]>> => {
    if (!shouldUseOffline()) {
      const result = await clientsApi.list(params);
      if (result.success && result.data) {
        for (const client of toEntityArray<Client>(result.data)) {
          await saveEntity('clients', client, 'synced');
        }
        return result;
      }
    }

    const cached = await getAllEntities<Client>('clients');
    let data = extractDataArray(cached);

    if (params?.search) {
      const search = params.search.toLowerCase();
      data = data.filter(
        (c) =>
          c.name.toLowerCase().includes(search) ||
          c.email?.toLowerCase().includes(search) ||
          c.phone?.includes(search)
      );
    }

    return { success: true, data };
  },

  get: async (id: string): Promise<ApiResponse<Client>> => {
    if (!shouldUseOffline() && !isLocalId(id)) {
      const result = await clientsApi.get(id);
      if (result.success && result.data) {
        await saveEntity('clients', result.data, 'synced');
        return result;
      }
    }

    const cached = await getEntity<Client>('clients', id);
    if (cached) {
      return { success: true, data: cached.data };
    }

    return { success: false, error: 'Cliente não encontrado' };
  },

  create: async (data: Partial<Client>): Promise<ApiResponse<Client>> => {
    if (!shouldUseOffline()) {
      const result = await clientsApi.create(data);
      if (result.success && result.data) {
        await saveEntity('clients', result.data, 'synced');
        return result;
      }
    }

    const localId = generateLocalId();
    const client: Client = {
      id: localId,
      name: data.name || '',
      email: data.email,
      phone: data.phone,
      birthDate: data.birthDate,
      notes: data.notes,
      createdAt: new Date().toISOString(),
    };

    await saveEntity('clients', client, 'pending');
    await addToSyncQueue('client', 'create', localId, client);
    forceSync();

    return { success: true, data: client };
  },

  update: async (id: string, data: Partial<Client>): Promise<ApiResponse<Client>> => {
    if (!shouldUseOffline() && !isLocalId(id)) {
      const result = await clientsApi.update(id, data);
      if (result.success && result.data) {
        await saveEntity('clients', result.data, 'synced');
        return result;
      }
    }

    const cached = await getEntity<Client>('clients', id);
    if (cached) {
      const updated = { ...cached.data, ...data };
      await saveEntity('clients', updated, 'pending');
      await addToSyncQueue('client', 'update', id, updated);
      forceSync();
      return { success: true, data: updated };
    }

    return { success: false, error: 'Cliente não encontrado' };
  },

  delete: async (id: string): Promise<ApiResponse<void>> => {
    if (!shouldUseOffline() && !isLocalId(id)) {
      const result = await clientsApi.delete(id);
      if (result.success) {
        await deleteEntityFromDB('clients', id);
        return result;
      }
    }

    if (isLocalId(id)) {
      await deleteEntityFromDB('clients', id);
      return { success: true, data: undefined };
    }

    await addToSyncQueue('client', 'delete', id, { id });
    await deleteEntityFromDB('clients', id);
    forceSync();

    return { success: true, data: undefined };
  },

  // Historico agregado depende do servidor - somente online.
  history: (id: string) => clientsApi.history(id),
};

// ==================== Professionals API Wrapper ====================

export const offlineProfessionalsApi = {
  list: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    active?: boolean;
  }): Promise<ApiResponse<Professional[]>> => {
    if (!shouldUseOffline()) {
      const result = await professionalsApi.list(params);
      if (result.success && result.data) {
        for (const professional of toEntityArray<Professional>(result.data)) {
          await saveEntity('professionals', professional, 'synced');
        }
        return result;
      }
    }

    const cached = await getAllEntities<Professional>('professionals');
    let data = extractDataArray(cached);

    if (params?.search) {
      const search = params.search.toLowerCase();
      data = data.filter(
        (p) =>
          p.name.toLowerCase().includes(search) ||
          p.email?.toLowerCase().includes(search)
      );
    }

    if (params?.active !== undefined) {
      data = data.filter((p) => p.active === params.active);
    }

    return { success: true, data };
  },

  get: async (id: string): Promise<ApiResponse<Professional>> => {
    if (!shouldUseOffline() && !isLocalId(id)) {
      const result = await professionalsApi.get(id);
      if (result.success && result.data) {
        await saveEntity('professionals', result.data, 'synced');
        return result;
      }
    }

    const cached = await getEntity<Professional>('professionals', id);
    if (cached) {
      return { success: true, data: cached.data };
    }

    return { success: false, error: 'Profissional não encontrado' };
  },

  create: async (data: Partial<Professional>): Promise<ApiResponse<Professional>> => {
    if (!shouldUseOffline()) {
      const result = await professionalsApi.create(data);
      if (result.success && result.data) {
        await saveEntity('professionals', result.data, 'synced');
        return result;
      }
    }

    const localId = generateLocalId();
    const professional: Professional = {
      id: localId,
      name: data.name || '',
      email: data.email,
      phone: data.phone,
      avatar: data.avatar,
      bio: data.bio,
      active: data.active ?? true,
      workingHours: data.workingHours,
      createdAt: new Date().toISOString(),
    };

    await saveEntity('professionals', professional, 'pending');
    await addToSyncQueue('professional', 'create', localId, professional);
    forceSync();

    return { success: true, data: professional };
  },

  update: async (id: string, data: Partial<Professional>): Promise<ApiResponse<Professional>> => {
    if (!shouldUseOffline() && !isLocalId(id)) {
      const result = await professionalsApi.update(id, data);
      if (result.success && result.data) {
        await saveEntity('professionals', result.data, 'synced');
        return result;
      }
    }

    const cached = await getEntity<Professional>('professionals', id);
    if (cached) {
      const updated = { ...cached.data, ...data };
      await saveEntity('professionals', updated, 'pending');
      await addToSyncQueue('professional', 'update', id, updated);
      forceSync();
      return { success: true, data: updated };
    }

    return { success: false, error: 'Profissional não encontrado' };
  },

  delete: async (id: string): Promise<ApiResponse<void>> => {
    if (!shouldUseOffline() && !isLocalId(id)) {
      const result = await professionalsApi.delete(id);
      if (result.success) {
        await deleteEntityFromDB('professionals', id);
        return result;
      }
    }

    if (isLocalId(id)) {
      await deleteEntityFromDB('professionals', id);
      return { success: true, data: undefined };
    }

    await addToSyncQueue('professional', 'delete', id, { id });
    await deleteEntityFromDB('professionals', id);
    forceSync();

    return { success: true, data: undefined };
  },
};

// ==================== Services API Wrapper ====================

export const offlineServicesApi = {
  list: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    active?: boolean;
    category?: string;
  }): Promise<ApiResponse<Service[]>> => {
    if (!shouldUseOffline()) {
      const result = await servicesApi.list(params);
      if (result.success && result.data) {
        for (const service of toEntityArray<Service>(result.data)) {
          await saveEntity('services', service, 'synced');
        }
        return result;
      }
    }

    const cached = await getAllEntities<Service>('services');
    let data = extractDataArray(cached);

    if (params?.search) {
      const search = params.search.toLowerCase();
      data = data.filter(
        (s) =>
          s.name.toLowerCase().includes(search) ||
          s.description?.toLowerCase().includes(search)
      );
    }

    if (params?.active !== undefined) {
      data = data.filter((s) => s.active === params.active);
    }

    if (params?.category) {
      data = data.filter((s) => s.category === params.category);
    }

    return { success: true, data };
  },

  get: async (id: string): Promise<ApiResponse<Service>> => {
    if (!shouldUseOffline() && !isLocalId(id)) {
      const result = await servicesApi.get(id);
      if (result.success && result.data) {
        await saveEntity('services', result.data, 'synced');
        return result;
      }
    }

    const cached = await getEntity<Service>('services', id);
    if (cached) {
      return { success: true, data: cached.data };
    }

    return { success: false, error: 'Serviço não encontrado' };
  },

  create: async (data: Partial<Service>): Promise<ApiResponse<Service>> => {
    if (!shouldUseOffline()) {
      const result = await servicesApi.create(data);
      if (result.success && result.data) {
        await saveEntity('services', result.data, 'synced');
        return result;
      }
    }

    const localId = generateLocalId();
    const service: Service = {
      id: localId,
      name: data.name || '',
      description: data.description,
      price: data.price || 0,
      duration: data.duration || 30,
      category: data.category,
      active: data.active ?? true,
    };

    await saveEntity('services', service, 'pending');
    await addToSyncQueue('service', 'create', localId, service);
    forceSync();

    return { success: true, data: service };
  },

  update: async (id: string, data: Partial<Service>): Promise<ApiResponse<Service>> => {
    if (!shouldUseOffline() && !isLocalId(id)) {
      const result = await servicesApi.update(id, data);
      if (result.success && result.data) {
        await saveEntity('services', result.data, 'synced');
        return result;
      }
    }

    const cached = await getEntity<Service>('services', id);
    if (cached) {
      const updated = { ...cached.data, ...data };
      await saveEntity('services', updated, 'pending');
      await addToSyncQueue('service', 'update', id, updated);
      forceSync();
      return { success: true, data: updated };
    }

    return { success: false, error: 'Serviço não encontrado' };
  },

  delete: async (id: string): Promise<ApiResponse<void>> => {
    if (!shouldUseOffline() && !isLocalId(id)) {
      const result = await servicesApi.delete(id);
      if (result.success) {
        await deleteEntityFromDB('services', id);
        return result;
      }
    }

    if (isLocalId(id)) {
      await deleteEntityFromDB('services', id);
      return { success: true, data: undefined };
    }

    await addToSyncQueue('service', 'delete', id, { id });
    await deleteEntityFromDB('services', id);
    forceSync();

    return { success: true, data: undefined };
  },

  // Vinculo de profissionais depende do servidor - somente online.
  assignProfessionals: (id: string, professionalIds: string[]) =>
    servicesApi.assignProfessionals(id, professionalIds),
};
