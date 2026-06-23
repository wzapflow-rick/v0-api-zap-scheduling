import type {
  BusinessConfig,
  BusinessTypeId,
  BusinessLabels,
  BusinessFeatures,
  BusinessCapabilities,
  DashboardCardConfig,
  FeatureConfig,
} from '@/types';
import { DashboardCardId } from '@/types';

/**
 * Versão do FORMATO da config no frontend. Se o shape do BusinessConfig mudar,
 * incremente isto: o cache persistente com versão diferente é descartado.
 */
export const CURRENT_CONFIG_VERSION = 1;

/** Labels genéricas usadas no fallback (nicho OTHER / sem tipo / erro). */
const GENERIC_LABELS: BusinessLabels = {
  client: { singular: 'Cliente', plural: 'Clientes' },
  professional: { singular: 'Profissional', plural: 'Profissionais' },
  appointment: { singular: 'Agendamento', plural: 'Agendamentos' },
  service: { singular: 'Serviço', plural: 'Serviços' },
  dashboardTitle: 'Dashboard',
};

const feature = (enabled: boolean, version = 1): FeatureConfig => ({ enabled, version });

/** Capabilities padrão (tudo desligado). */
const DEFAULT_CAPABILITIES: BusinessCapabilities = {
  inventory: false,
  memberships: false,
  workouts: false,
  medicalRecords: false,
  commissions: false,
  onlineCatalog: false,
};

const DEFAULT_DASHBOARD_CARDS: DashboardCardConfig[] = [
  { id: DashboardCardId.REVENUE, enabled: true, order: 0 },
  { id: DashboardCardId.APPOINTMENTS, enabled: true, order: 1 },
  { id: DashboardCardId.CLIENTS, enabled: true, order: 2 },
  { id: DashboardCardId.PROFESSIONALS, enabled: true, order: 3 },
];

/** Helper para montar labels a partir de overrides parciais. */
function makeLabels(over: Partial<BusinessLabels>): BusinessLabels {
  return { ...GENERIC_LABELS, ...over };
}

/**
 * Mapa ESTÁTICO de configuração por nicho — fonte de verdade no código
 * (sem dependência de banco). Define labels, módulos e capabilities de cada
 * segmento. Só os módulos relevantes ao nicho ficam ativos.
 */
export const BUSINESS_CONFIGS: Record<BusinessTypeId, BusinessConfig> = {
  BARBERSHOP: {
    version: CURRENT_CONFIG_VERSION,
    id: 'BARBERSHOP',
    label: 'Barbearia',
    labels: makeLabels({
      professional: { singular: 'Barbeiro', plural: 'Barbeiros' },
    }),
    features: {
      products: feature(true),
      workouts: feature(false),
      medicalRecords: feature(false),
      memberships: feature(false),
    },
    capabilities: { ...DEFAULT_CAPABILITIES, inventory: true, commissions: true },
    dashboardCards: DEFAULT_DASHBOARD_CARDS,
  },
  SALON: {
    version: CURRENT_CONFIG_VERSION,
    id: 'SALON',
    label: 'Salão de Beleza',
    labels: makeLabels({}),
    features: {
      products: feature(true),
      workouts: feature(false),
      medicalRecords: feature(false),
      memberships: feature(false),
    },
    capabilities: { ...DEFAULT_CAPABILITIES, inventory: true, commissions: true },
    dashboardCards: DEFAULT_DASHBOARD_CARDS,
  },
  PERSONAL_TRAINER: {
    version: CURRENT_CONFIG_VERSION,
    id: 'PERSONAL_TRAINER',
    label: 'Personal Trainer',
    labels: makeLabels({
      client: { singular: 'Aluno', plural: 'Alunos' },
      professional: { singular: 'Personal', plural: 'Personais' },
      appointment: { singular: 'Sessão', plural: 'Sessões' },
    }),
    features: {
      products: feature(false),
      workouts: feature(true),
      medicalRecords: feature(false),
      memberships: feature(true),
    },
    capabilities: { ...DEFAULT_CAPABILITIES, workouts: true, memberships: true },
    dashboardCards: DEFAULT_DASHBOARD_CARDS,
  },
  CLINIC: {
    version: CURRENT_CONFIG_VERSION,
    id: 'CLINIC',
    label: 'Clínica',
    labels: makeLabels({
      client: { singular: 'Paciente', plural: 'Pacientes' },
      appointment: { singular: 'Consulta', plural: 'Consultas' },
    }),
    features: {
      products: feature(false),
      workouts: feature(false),
      medicalRecords: feature(true),
      memberships: feature(false),
    },
    capabilities: { ...DEFAULT_CAPABILITIES, medicalRecords: true },
    dashboardCards: DEFAULT_DASHBOARD_CARDS,
  },
  OTHER: {
    version: CURRENT_CONFIG_VERSION,
    id: 'OTHER',
    label: 'Negócio',
    labels: GENERIC_LABELS,
    features: {
      products: feature(false),
      workouts: feature(false),
      medicalRecords: feature(false),
      memberships: feature(false),
    },
    capabilities: { ...DEFAULT_CAPABILITIES },
    dashboardCards: DEFAULT_DASHBOARD_CARDS,
  },
};

/**
 * Config padrão/baseline = nicho OTHER (genérico, só módulos essenciais).
 * Usado quando não há tipo definido.
 */
export const DEFAULT_BUSINESS_CONFIG: BusinessConfig = BUSINESS_CONFIGS.OTHER;

/** Retorna a config estática do nicho (cai em OTHER se desconhecido). */
export function getStaticBusinessConfig(type?: BusinessTypeId): BusinessConfig {
  return (type && BUSINESS_CONFIGS[type]) || BUSINESS_CONFIGS.OTHER;
}

/** Aceita feature legada como boolean OU objeto e normaliza para FeatureConfig. */
function normalizeFeature(value: unknown, fallback: FeatureConfig): FeatureConfig {
  if (typeof value === 'boolean') {
    return { enabled: value, version: 1 };
  }
  if (value && typeof value === 'object') {
    const v = value as Partial<FeatureConfig>;
    return {
      enabled: Boolean(v.enabled),
      version: typeof v.version === 'number' ? v.version : 1,
      ...(v.metadata ? { metadata: v.metadata } : {}),
    };
  }
  return fallback;
}

function normalizeLabels(value: unknown): BusinessLabels {
  if (!value || typeof value !== 'object') return GENERIC_LABELS;
  const raw = value as Record<string, unknown>;
  const keys: (keyof Omit<BusinessLabels, 'dashboardTitle'>)[] = [
    'client',
    'professional',
    'appointment',
    'service',
  ];
  const out = { ...GENERIC_LABELS };
  for (const key of keys) {
    const entry = raw[key];
    if (typeof entry === 'string') {
      // backend antigo pode mandar só a string singular
      out[key] = { singular: entry, plural: entry };
    } else if (entry && typeof entry === 'object') {
      const e = entry as { singular?: string; plural?: string };
      out[key] = {
        singular: e.singular ?? GENERIC_LABELS[key].singular,
        plural: e.plural ?? e.singular ?? GENERIC_LABELS[key].plural,
      };
    }
  }
  if (typeof raw.dashboardTitle === 'string') out.dashboardTitle = raw.dashboardTitle;
  return out;
}

/**
 * Normaliza a config crua do backend para o shape garantido do frontend.
 * - version ausente -> 1
 * - feature boolean -> { enabled, version: 1 }
 * - capabilities ausente -> default
 * - dashboardCards ausente/ inválido -> default
 */
export function normalizeBusinessConfig(
  raw: unknown,
  typeId?: BusinessTypeId
): BusinessConfig {
  const base = getStaticBusinessConfig(typeId);
  if (!raw || typeof raw !== 'object') {
    return { ...base, id: typeId ?? base.id };
  }
  const r = raw as Record<string, any>;
  const fallbackFeatures = base.features;
  const rawFeatures = (r.features ?? {}) as Record<string, unknown>;

  const features: BusinessFeatures = {
    products: normalizeFeature(rawFeatures.products, fallbackFeatures.products),
    workouts: normalizeFeature(rawFeatures.workouts, fallbackFeatures.workouts),
    medicalRecords: normalizeFeature(rawFeatures.medicalRecords, fallbackFeatures.medicalRecords),
    memberships: normalizeFeature(rawFeatures.memberships, fallbackFeatures.memberships),
  };

  const capabilities: BusinessCapabilities = {
    ...base.capabilities,
    ...(r.capabilities && typeof r.capabilities === 'object' ? r.capabilities : {}),
  };

  const dashboardCards: DashboardCardConfig[] = Array.isArray(r.dashboardCards)
    ? (r.dashboardCards as DashboardCardConfig[])
    : base.dashboardCards;

  return {
    version: typeof r.version === 'number' ? r.version : 1,
    id: (r.id as BusinessTypeId) ?? typeId ?? base.id,
    label: typeof r.label === 'string' ? r.label : base.label,
    labels: r.labels ? normalizeLabels(r.labels) : base.labels,
    features,
    capabilities,
    dashboardCards,
    theme: r.theme && typeof r.theme === 'object' ? r.theme : base.theme,
  };
}

/** Lista estática de nichos (fallback do onboarding se a API falhar). */
export const STATIC_BUSINESS_TYPES: { id: BusinessTypeId; label: string; description: string }[] = [
  { id: 'BARBERSHOP', label: 'Barbearia', description: 'Cortes, barba e produtos' },
  { id: 'SALON', label: 'Salão de Beleza', description: 'Cabelo, unhas e estética' },
  { id: 'PERSONAL_TRAINER', label: 'Personal Trainer', description: 'Treinos e avaliações físicas' },
  { id: 'CLINIC', label: 'Clínica', description: 'Consultas e prontuários' },
  { id: 'OTHER', label: 'Outro', description: 'Configuração genérica' },
];
