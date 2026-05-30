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
  SubscriptionPermissions,
  SubscriptionUsage,
  TrialEligibility,
  TrialStartResponse,
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

    const text = await response.text();
    let data: any = {};
    
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        if (response.ok) {
          return { success: true, data: null as unknown as T };
        }
        return { success: false, error: 'Resposta inválida do servidor' };
      }
    }
    
    if (!response.ok) {
      const errorMessage = data.data?.error || data.error || 'Erro na requisição';
      return {
        success: false,
        error: errorMessage,
        retryAfter: data.retryAfter,
      };
    }

    // If response has success field, return as-is; otherwise wrap it
    if ('success' in data) {
      return data;
    }
    
    return { success: true, data };
  } catch {
    return {
      success: false,
      error: 'Erro de conexão',
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

  forgotPassword: (phone: string) =>
    apiFetch<{ message: string; sent: boolean }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    }),

  verifyResetToken: (phone: string, code: string) =>
    apiFetch<{ valid: boolean }>('/auth/verify-reset-token', {
      method: 'POST',
      body: JSON.stringify({ phone, code }),
    }),

  resetPassword: (phone: string, code: string, password: string) =>
    apiFetch<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ phone, code, password }),
    }),
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
  // GET /api/subscriptions - Get current subscription
  get: () => apiFetch<{ subscription: Subscription | null; plan: Plan | null; isActive: boolean }>('/subscriptions'),
  
  // GET /api/subscriptions/me - Get subscription with trial info
  me: () => apiFetch<Subscription>('/subscriptions/me'),
  
  // GET /api/plans - List available plans (public)
  getPlans: () => apiFetch<Plan[]>('/plans'),
  
  // POST /api/subscriptions - Create subscription / initiate payment
  create: (planId: string) =>
    apiFetch<{
      preferenceId: string;
      initPoint: string;
      sandboxInitPoint: string;
    }>('/subscriptions', {
      method: 'POST',
      body: JSON.stringify({ planId }),
    }),
  
  // GET /api/subscriptions/trial - Check trial eligibility
  checkTrialEligibility: () => apiFetch<TrialEligibility>('/subscriptions/trial'),
  
  // POST /api/subscriptions/trial - Start trial
  startTrial: (planId: string) =>
    apiFetch<TrialStartResponse>('/subscriptions/trial', {
      method: 'POST',
      body: JSON.stringify({ planId }),
    }),
  
  // POST /api/subscriptions/convert - Convert trial to paid
  convertTrialToPaid: () =>
    apiFetch<{
      preferenceId: string;
      initPoint: string;
    }>('/subscriptions/convert', {
      method: 'POST',
    }),
  
  // GET /api/subscriptions/permissions - Get permissions and features
  getPermissions: () => apiFetch<SubscriptionPermissions>('/subscriptions/permissions'),
  
  // GET /api/subscriptions/usage - Get usage vs limits
  getUsage: () => apiFetch<SubscriptionUsage>('/subscriptions/usage'),
  
  // DELETE /api/subscriptions - Cancel subscription
  cancel: () =>
    apiFetch<{ message: string }>('/subscriptions', {
      method: 'DELETE',
    }),
  
  // PATCH /api/subscriptions - Change plan
  changePlan: (planId: string) =>
    apiFetch<{
      requiresPayment: boolean;
      message?: string;
      preferenceId?: string;
      initPoint?: string;
      sandboxInitPoint?: string;
    }>('/subscriptions', {
      method: 'PATCH',
      body: JSON.stringify({ planId }),
    }),
};

// Automatic Messages API - Uses backend routes at /api/automatic-messages
export const automaticMessagesApi = {
  // GET /api/automatic-messages - Get config
  get: () =>
    apiFetch<{
      whatsappConnected: boolean;
      whatsappPhone: string | null;
      whatsappInstanceName: string | null;
    }>('/automatic-messages'),

  // GET /api/automatic-messages/whatsapp - Get WhatsApp status/QR code
  getWhatsAppStatus: () =>
    apiFetch<{
      connected: boolean;
      phone?: string;
      instanceName?: string;
      qrcode?: string;
      pairingCode?: string;
    }>('/automatic-messages/whatsapp'),

  // POST /api/automatic-messages/whatsapp - Update WhatsApp connection (webhook)
  updateWhatsAppConnection: (data: { 
    connected: boolean; 
    phone?: string | null;
  }) =>
    apiFetch<{ success: boolean }>('/automatic-messages/whatsapp', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // DELETE /api/automatic-messages/whatsapp - Disconnect WhatsApp
  disconnectWhatsApp: () =>
    apiFetch<{ success: boolean }>('/automatic-messages/whatsapp', {
      method: 'DELETE',
    }),

  // POST /api/automatic-messages/test - Test message
  testMessage: (data: { phone: string; message: string }) =>
    apiFetch<{ success: boolean }>('/automatic-messages/test', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // GET /api/automatic-messages/logs - Get message logs
  getLogs: (params?: { 
    page?: number; 
    limit?: number; 
    messageType?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.messageType) searchParams.set('messageType', params.messageType);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.startDate) searchParams.set('startDate', params.startDate);
    if (params?.endDate) searchParams.set('endDate', params.endDate);
    return apiFetch<{
      logs: Array<{
        id: string;
        messageType: string;
        recipientPhone: string;
        recipientName: string;
        content: string;
        status: 'SENT' | 'FAILED' | 'PENDING';
        sentAt: string;
      }>;
      stats: { total: number; sent: number; failed: number; pending: number };
      pagination: { page: number; limit: number; total: number };
    }>(`/automatic-messages/logs?${searchParams}`);
  },
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
