// Enums
export type AppointmentStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW';
export type SubscriptionStatus = 'ACTIVE' | 'CANCELLED' | 'PAST_DUE' | 'TRIALING' | 'TRIAL_EXPIRED' | 'INACTIVE';

// Trial eligibility response
export interface TrialEligibility {
  canTrial: boolean;
  reason: 'already_has_active_subscription' | 'already_used_trial' | 'trial_disabled_globally' | 'no_plans_with_trial' | null;
  availablePlans: Array<{
    id: string;
    name: string;
    trialDays: number;
    price: number;
  }>;
  previousTrials: Array<{
    planId: string;
    planName: string;
    startedAt: string;
  }>;
  currentSubscription: Subscription | null;
}

// Trial start response
export interface TrialStartResponse {
  subscription: {
    id: string;
    status: SubscriptionStatus;
    isTrial: boolean;
    trialEndsAt: string;
    plan: {
      id: string;
      name: string;
      price: number;
    };
  };
  trialDays: number;
  trialEndsAt: string;
}

// Interfaces principais
export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  establishmentId?: string;
  establishment?: Establishment;
  subscription?: Subscription;
  createdAt: string;
  updatedAt: string;
}

export interface Establishment {
  id: string;
  name: string;
  slug: string;
  description?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  logoUrl?: string;
  coverUrl?: string;
  timezone: string;
  slotDuration: number;
  workingHours: WorkingHours;
  businessType?: BusinessTypeId;
  _count?: {
    professionals: number;
    services: number;
    clients: number;
    appointments: number;
  };
}

export interface WorkingHours {
  [day: string]: {
    isOpen: boolean;
    openTime: string;
    closeTime: string;
  };
}

export interface Professional {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  avatar?: string;
  bio?: string;
  active: boolean;
  workingHours?: WorkingHours;
  services?: { service: Service }[];
  createdAt: string;
  /** Write-only: lista completa de serviços vinculados (enviada no create/update). */
  serviceIds?: string[];
}

export interface Service {
  id: string;
  name: string;
  description?: string;
  price: number;
  duration: number;
  category?: string;
  active: boolean;
  professionals?: { professional: Professional }[];
  /** Write-only: lista completa de profissionais vinculados (enviada no create/update). */
  professionalIds?: string[];
}

export interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  birthDate?: string;
  notes?: string;
  createdAt: string;
  _count?: {
    appointments: number;
  };
}

export interface Appointment {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  price: number;
  notes?: string;
  professional: Professional;
  service: Service;
  client: Client;
  createdAt: string;
}

export type NotificationType =
  | 'appointment_created'
  | 'appointment_cancelled'
  | 'client_created'
  | 'whatsapp_disconnected'
  | 'appointment_reminder'
  | 'appointment_no_show';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  read: boolean;
  createdAt: string;
}

// Confirmação de Agendamento via WhatsApp
export type ConfirmationFlowMessageType =
  | 'reservation_created'
  | 'confirmation_request'
  | 'confirmation_reminder'
  | 'confirmation_cancelled'
  | 'final_reminder';

export interface ConfirmationSettings {
  /** Habilita o fluxo de confirmação automática. */
  enabled: boolean;
  /** Quantas horas antes do atendimento o link é enviado (configurável). */
  leadTimeHours: number;
  /** Modelo escolhido para cada etapa (id do modelo em message-templates). */
  templates: Record<ConfirmationFlowMessageType, string>;
}

export type PublicConfirmationStatus =
  | 'pending'
  | 'confirmed'
  | 'declined'
  | 'cancelled'
  | 'expired'
  | 'not_found';

export interface PublicConfirmation {
  status: PublicConfirmationStatus;
  clientName: string;
  serviceName: string;
  professionalName: string;
  establishmentName: string;
  date: string;
  startTime: string;
}

// ============================================================
// Business Types (Nichos) — camada de UI adaptativa
// ============================================================

export type BusinessTypeId =
  | 'BARBERSHOP'
  | 'BEAUTY_SALON'
  | 'PERSONAL_TRAINER'
  | 'CLINIC'
  | 'OTHER';

/** Item retornado por GET /business-types (lista para onboarding). */
export interface BusinessTypeSummary {
  id: BusinessTypeId;
  label: string;
  description?: string;
  icon?: string;
}

export type BusinessLabelKey = 'client' | 'professional' | 'appointment' | 'service';

/** Cada label tem singular e plural explícitos (i18n-ready, sem pluralização manual). */
export type BusinessLabels = Record<BusinessLabelKey, { singular: string; plural: string }> & {
  dashboardTitle: string;
};

/** Configuração de um módulo principal, com versão e metadata opcional. */
export interface FeatureConfig {
  enabled: boolean;
  version: number;
  metadata?: {
    beta?: boolean;
    experimental?: boolean;
  };
}

/** Módulos principais (telas/áreas). */
export interface BusinessFeatures {
  memberships: FeatureConfig;
  workouts: FeatureConfig;
  medicalRecords: FeatureConfig;
  products: FeatureConfig;
}

/** Sub-recursos granulares — escala sem multiplicar flags de módulo. */
export interface BusinessCapabilities {
  inventory: boolean;
  memberships: boolean;
  workouts: boolean;
  medicalRecords: boolean;
  commissions: boolean;
  onlineCatalog: boolean;
}

export enum DashboardCardId {
  APPOINTMENTS = 'appointments',
  REVENUE = 'revenue',
  CLIENTS = 'clients',
  PROFESSIONALS = 'professionals',
}

export interface DashboardCardConfig {
  id: DashboardCardId;
  enabled: boolean;
  order: number;
}

/** Tema visual por nicho — apenas estrutura nesta fase (não aplicado ainda). */
export interface BusinessTheme {
  primaryColor?: string;
  secondaryColor?: string;
  icon?: string;
  illustration?: string;
}

export interface BusinessConfig {
  version: number;
  id: BusinessTypeId;
  label: string;
  labels: BusinessLabels;
  features: BusinessFeatures;
  capabilities: BusinessCapabilities;
  dashboardCards: DashboardCardConfig[];
  theme?: BusinessTheme;
}

/**
 * Shape CRU retornado por GET /business-types/:type (dentro de `data.config`).
 * O backend usa labels como strings simples, `business.features` como array de
 * strings e cards com ids próprios. A função normalizeBusinessConfig converte
 * isto para o BusinessConfig garantido do frontend.
 */
export interface RawBusinessConfig {
  id: BusinessTypeId;
  label: string;
  ui?: {
    labels?: Partial<Record<BusinessLabelKey | 'dashboardTitle', string>>;
    dashboardCards?: { id: string; enabled: boolean; order: number }[];
  };
  business?: {
    defaultServices?: { name: string; duration: number }[];
    features?: string[];
  };
  whatsappTemplates?: Record<string, string>;
}

export interface Subscription {
  id: string;
  status: SubscriptionStatus;
  startDate: string;
  endDate: string;
  gatewaySubscriptionId?: string;
  isTrialing?: boolean;
  trialEndsAt?: string | null;
  plan: Plan;
}

export interface Plan {
  id: string;
  name: string;
  description?: string;
  price: number;
  interval: 'MONTHLY' | 'YEARLY';
  maxProfessionals: number;
  maxServices: number;
  maxAppointments: number;
  trialDays: number;
  active: boolean;
  features: PlanFeatures;
}

export interface PlanFeatures {
  whatsappAutomations: number;
  bookingPage: boolean;
  instagramBioLink: boolean;
  onlinePayment: boolean;
  financialDashboard: boolean;
  prioritySupport: boolean;
  recurringAppointments: boolean;
  paymentSplit: boolean;
  waitlist: boolean;
  advancedBI: boolean;
  retentionReports: boolean;
}

export interface SubscriptionPermissions {
  hasActiveSubscription: boolean;
  plan: {
    id: string;
    name: string;
    price: number;
  } | null;
  subscription: {
    id: string;
    status: SubscriptionStatus;
    startDate: string;
    endDate: string;
    isTrialing: boolean;
    trialEndsAt: string | null;
  } | null;
  limits: {
    maxProfessionals: number;
    maxServices: number;
    maxAppointments: number;
  };
  features: PlanFeatures;
}

export interface SubscriptionUsage {
  usage: {
    professionals: number;
    services: number;
    appointmentsThisMonth: number;
  };
  limits: {
    professionals: number;
    services: number;
    appointments: number;
  };
  canAdd: {
    professional: boolean;
    service: boolean;
    appointment: boolean;
  };
  percentUsed: {
    professionals: number;
    services: number;
    appointments: number;
  };
}

// Response padrão
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  status?: number; // HTTP status code, usado para distinguir erros permanentes de transitorios
  retryAfter?: number; // Rate limiting - seconds to wait before retrying
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Slots
export interface TimeSlot {
  time: string;
  available: boolean;
}

export interface SlotsResponse {
  date: string;
  slots: TimeSlot[];
}

// Auth
export interface AuthResponse {
  user: User;
  token: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  phone: string;
  establishmentName: string;
  businessType?: BusinessTypeId;
}
