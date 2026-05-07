import Cookies from 'js-cookie';
import type {
  ApiResponse,
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  User,
  Establishment,
  Professional,
  Service,
  Client,
  Appointment,
  Plan,
  Subscription,
  SlotsResponse,
} from '@/types';

// Use proxy to avoid CORS issues
const API_BASE_URL = '/api/proxy';

// Token management
export const getToken = () => Cookies.get('auth_token');
export const setToken = (token: string) => Cookies.set('auth_token', token, { expires: 7 });
export const removeToken = () => Cookies.remove('auth_token');

// API Fetch wrapper
async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = getToken();
  
  // Debug: log token status for authenticated endpoints
  if (!endpoint.startsWith('/auth/') && !endpoint.startsWith('/public/')) {
    console.log('[v0] apiFetch token exists:', !!token, 'endpoint:', endpoint);
  }
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    // Handle empty responses gracefully
    const text = await response.text();
    let data: any = {};
    
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        // If response is not JSON but request was successful, treat as success
        if (response.ok) {
          return { success: true, data: null as unknown as T };
        }
        return { success: false, error: 'Resposta inválida do servidor' };
      }
    }
    
    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Erro na requisição',
      };
    }

    // If response has success field, return as-is; otherwise wrap it
    if ('success' in data) {
      return data;
    }
    
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro de conexão',
    };
  }
}

// Auth API
export const authApi = {
  register: (data: RegisterRequest) =>
    apiFetch<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  login: (data: LoginRequest) =>
    apiFetch<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  me: () => apiFetch<User>('/auth/me'),
};

// Establishment API
export const establishmentApi = {
  get: () => apiFetch<Establishment>('/establishments'),
  
  update: (data: Partial<Establishment>) =>
    apiFetch<Establishment>('/establishments', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};

// Professionals API
export const professionalsApi = {
  list: (params?: { page?: number; limit?: number; search?: string; active?: boolean }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.search) searchParams.set('search', params.search);
    if (params?.active !== undefined) searchParams.set('active', String(params.active));
    return apiFetch<Professional[]>(`/professionals?${searchParams}`);
  },

  get: (id: string) => apiFetch<Professional>(`/professionals/${id}`),

  create: (data: Partial<Professional>) =>
    apiFetch<Professional>('/professionals', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<Professional>) =>
    apiFetch<Professional>(`/professionals/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    apiFetch<void>(`/professionals/${id}`, { method: 'DELETE' }),
};

// Services API
export const servicesApi = {
  list: (params?: { page?: number; limit?: number; search?: string; active?: boolean; category?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.search) searchParams.set('search', params.search);
    if (params?.active !== undefined) searchParams.set('active', String(params.active));
    if (params?.category) searchParams.set('category', params.category);
    return apiFetch<Service[]>(`/services?${searchParams}`);
  },

  get: (id: string) => apiFetch<Service>(`/services/${id}`),

  create: (data: Partial<Service>) =>
    apiFetch<Service>('/services', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<Service>) =>
    apiFetch<Service>(`/services/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    apiFetch<void>(`/services/${id}`, { method: 'DELETE' }),

  assignProfessionals: (id: string, professionalIds: string[]) =>
    apiFetch<void>(`/services/${id}/professionals`, {
      method: 'POST',
      body: JSON.stringify({ professionalIds }),
    }),
};

// Clients API
export const clientsApi = {
  list: (params?: { page?: number; limit?: number; search?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.search) searchParams.set('search', params.search);
    return apiFetch<Client[]>(`/clients?${searchParams}`);
  },

  get: (id: string) => apiFetch<Client>(`/clients/${id}`),

  create: (data: Partial<Client>) =>
    apiFetch<Client>('/clients', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<Client>) =>
    apiFetch<Client>(`/clients/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    apiFetch<void>(`/clients/${id}`, { method: 'DELETE' }),

  history: (id: string) =>
    apiFetch<{ appointments: Appointment[]; stats: { totalAppointments: number; completedAppointments: number; totalSpent: number } }>(`/clients/${id}/history`),
};

// Appointments API
export const appointmentsApi = {
  list: (params?: {
    page?: number;
    limit?: number;
    status?: string;
    professionalId?: string;
    clientId?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.status) searchParams.set('status', params.status);
    if (params?.professionalId) searchParams.set('professionalId', params.professionalId);
    if (params?.clientId) searchParams.set('clientId', params.clientId);
    if (params?.startDate) searchParams.set('startDate', params.startDate);
    if (params?.endDate) searchParams.set('endDate', params.endDate);
    return apiFetch<Appointment[]>(`/appointments?${searchParams}`);
  },

  get: (id: string) => apiFetch<Appointment>(`/appointments/${id}`),

  create: (data: {
    professionalId: string;
    serviceId: string;
    clientId: string;
    date: string;
    startTime: string;
    notes?: string;
  }) =>
    apiFetch<Appointment>('/appointments', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<Appointment>) =>
    apiFetch<Appointment>(`/appointments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    apiFetch<void>(`/appointments/${id}`, { method: 'DELETE' }),

  updateStatus: (id: string, status: string) =>
    apiFetch<Appointment>(`/appointments/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    }),

  getSlots: (params: { professionalId: string; serviceId: string; date: string }) => {
    const searchParams = new URLSearchParams(params);
    return apiFetch<SlotsResponse>(`/appointments/slots?${searchParams}`);
  },
};

// Subscriptions API
export const subscriptionsApi = {
  get: () => apiFetch<Subscription>('/subscriptions'),
  getPlans: () => apiFetch<Plan[]>('/plans'),
};

// Automatic Messages API
export const automaticMessagesApi = {
  get: (establishmentId: string) =>
    apiFetch<{
      activeMessages: string[];
      whatsappConnected: boolean;
      whatsappPhone: string | null;
    }>(`/establishments/${establishmentId}/automatic-messages`),

  update: (establishmentId: string, data: { activeMessages: string[] }) =>
    apiFetch<{
      activeMessages: string[];
      whatsappConnected: boolean;
      whatsappPhone: string | null;
    }>(`/establishments/${establishmentId}/automatic-messages`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};

// Public API (sem autenticação)
export const publicApi = {
  getEstablishment: (slug: string) =>
    apiFetch<Establishment & { professionals: Professional[]; services: Service[] }>(
      `/public/establishments/${slug}`
    ),

  getSlots: (slug: string, params: { professionalId: string; serviceId: string; date: string }) => {
    const searchParams = new URLSearchParams(params);
    return apiFetch<SlotsResponse>(`/public/establishments/${slug}/slots?${searchParams}`);
  },

  book: (
    slug: string,
    data: {
      professionalId: string;
      serviceId: string;
      date: string;
      startTime: string;
      clientName: string;
      clientEmail: string;
      clientPhone: string;
      notes?: string;
    }
  ) =>
    apiFetch<Appointment>(`/public/establishments/${slug}/book`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};
