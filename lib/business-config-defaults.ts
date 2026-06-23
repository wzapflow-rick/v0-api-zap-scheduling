import type {
  BusinessConfig,
  BusinessTypeId,
  BusinessLabels,
  BusinessLabelKey,
  BusinessFeatures,
  BusinessCapabilities,
  DashboardCardConfig,
  FeatureConfig,
  RawBusinessConfig,
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
  BEAUTY_SALON: {
    version: CURRENT_CONFIG_VERSION,
    id: 'BEAUTY_SALON',
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

/**
 * Mapa de tokens de feature do backend (`business.features[]`) para as chaves
 * do BusinessFeatures do frontend. Aceita variações de grafia (hífen/underscore).
 */
const FEATURE_TOKENS: Record<keyof BusinessFeatures, string[]> = {
  products: ['products'],
  workouts: ['workouts'],
  memberships: ['memberships'],
  medicalRecords: ['medical-records', 'medical_records', 'medicalRecords'],
};

function featuresFromTokens(
  tokens: string[] | undefined,
  base: BusinessFeatures
): BusinessFeatures {
  // Sem array de features no backend -> mantém os defaults estáticos do nicho.
  if (!Array.isArray(tokens)) return base;
  const set = new Set(tokens.map((t) => t.toLowerCase()));
  const has = (key: keyof BusinessFeatures) =>
    FEATURE_TOKENS[key].some((token) => set.has(token.toLowerCase()));
  const make = (key: keyof BusinessFeatures): FeatureConfig => ({
    enabled: has(key),
    version: base[key].version,
    ...(base[key].metadata ? { metadata: base[key].metadata } : {}),
  });
  return {
    products: make('products'),
    workouts: make('workouts'),
    memberships: make('memberships'),
    medicalRecords: make('medicalRecords'),
  };
}

/**
 * Constrói labels a partir das strings simples do backend (`ui.labels`),
 * preservando os plurais do nicho estático quando o singular bate. Para labels
 * novas do backend, deriva o plural adicionando "s" (regra comum em PT-BR).
 */
function labelsFromBackend(
  raw: NonNullable<RawBusinessConfig['ui']>['labels'],
  base: BusinessLabels
): BusinessLabels {
  const out: BusinessLabels = { ...base };
  if (!raw) return out;
  const keys: BusinessLabelKey[] = ['client', 'professional', 'appointment', 'service'];
  for (const key of keys) {
    const singular = raw[key];
    if (typeof singular === 'string' && singular.trim()) {
      const plural =
        base[key].singular === singular ? base[key].plural : `${singular}s`;
      out[key] = { singular, plural };
    }
  }
  if (typeof raw.dashboardTitle === 'string' && raw.dashboardTitle.trim()) {
    out.dashboardTitle = raw.dashboardTitle;
  }
  return out;
}

/**
 * Normaliza a config CRUA do backend (RawBusinessConfig, vinda de `data.config`)
 * para o BusinessConfig garantido do frontend. Mantém como base estrutural a
 * config estática do nicho (plurais corretos, capabilities e dashboardCards
 * compatíveis com o registry) e sobrepõe o que o backend controla: label,
 * labels (singular + dashboardTitle) e quais módulos estão ativos (features).
 */
export function normalizeBusinessConfig(
  raw: unknown,
  typeId?: BusinessTypeId
): BusinessConfig {
  const rawType = (raw as RawBusinessConfig | null)?.id;
  const base = getStaticBusinessConfig(typeId ?? rawType);

  if (!raw || typeof raw !== 'object') {
    return { ...base, id: typeId ?? base.id };
  }
  const r = raw as RawBusinessConfig;

  return {
    version: CURRENT_CONFIG_VERSION,
    id: r.id ?? typeId ?? base.id,
    label: typeof r.label === 'string' && r.label.trim() ? r.label : base.label,
    labels: labelsFromBackend(r.ui?.labels, base.labels),
    features: featuresFromTokens(r.business?.features, base.features),
    // Backend não envia capabilities/cards compatíveis: mantém os do nicho estático.
    capabilities: base.capabilities,
    dashboardCards: base.dashboardCards,
    theme: base.theme,
  };
}

/** Lista estática de nichos (fallback do onboarding se a API falhar). */
export const STATIC_BUSINESS_TYPES: { id: BusinessTypeId; label: string; description: string }[] = [
  { id: 'BARBERSHOP', label: 'Barbearia', description: 'Cortes, barba e produtos' },
  { id: 'BEAUTY_SALON', label: 'Salão de Beleza', description: 'Cabelo, unhas e estética' },
  { id: 'PERSONAL_TRAINER', label: 'Personal Trainer', description: 'Treinos e avaliações físicas' },
  { id: 'CLINIC', label: 'Clínica', description: 'Consultas e prontuários' },
  { id: 'OTHER', label: 'Outro', description: 'Configuração genérica' },
];
