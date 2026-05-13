// Enums
export type AppointmentStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW';
export type SubscriptionStatus = 'ACTIVE' | 'CANCELLED' | 'PAST_DUE' | 'TRIALING' | 'INACTIVE';

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
}
