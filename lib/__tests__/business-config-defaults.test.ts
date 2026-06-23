import { describe, it, expect } from 'vitest';
import {
  normalizeBusinessConfig,
  getStaticBusinessConfig,
  DEFAULT_BUSINESS_CONFIG,
  CURRENT_CONFIG_VERSION,
} from '@/lib/business-config-defaults';

describe('normalizeBusinessConfig (shape real do backend)', () => {
  it('usa a config estática do nicho quando a entrada é inválida', () => {
    const config = normalizeBusinessConfig(null, 'CLINIC');
    expect(config.id).toBe('CLINIC');
    // Clínica: prontuários ligado, produtos desligado, cliente vira "Paciente"
    expect(config.features.medicalRecords.enabled).toBe(true);
    expect(config.features.products.enabled).toBe(false);
    expect(config.labels.client.singular).toBe('Paciente');
  });

  it('liga features a partir do array business.features[] do backend', () => {
    const config = normalizeBusinessConfig(
      { id: 'PERSONAL_TRAINER', business: { features: ['memberships', 'workouts'] } },
      'PERSONAL_TRAINER'
    );
    expect(config.features.workouts.enabled).toBe(true);
    expect(config.features.memberships.enabled).toBe(true);
    expect(config.features.products.enabled).toBe(false);
  });

  it('aceita token medical-records (com hífen) do backend', () => {
    const config = normalizeBusinessConfig(
      { id: 'CLINIC', business: { features: ['medical-records'] } },
      'CLINIC'
    );
    expect(config.features.medicalRecords.enabled).toBe(true);
  });

  it('array de features vazio desliga todos os módulos especiais', () => {
    const config = normalizeBusinessConfig(
      { id: 'OTHER', business: { features: [] } },
      'OTHER'
    );
    expect(config.features.products.enabled).toBe(false);
    expect(config.features.workouts.enabled).toBe(false);
    expect(config.features.medicalRecords.enabled).toBe(false);
    expect(config.features.memberships.enabled).toBe(false);
  });

  it('converte ui.labels (strings) em singular/plural, mantendo plural do nicho', () => {
    const config = normalizeBusinessConfig(
      {
        id: 'PERSONAL_TRAINER',
        ui: {
          labels: { client: 'Aluno', appointment: 'Sessão', dashboardTitle: 'Painel do Personal' },
        },
      },
      'PERSONAL_TRAINER'
    );
    // Singular do backend + plural preservado da config estática (Alunos / Sessões)
    expect(config.labels.client).toEqual({ singular: 'Aluno', plural: 'Alunos' });
    expect(config.labels.appointment).toEqual({ singular: 'Sessão', plural: 'Sessões' });
    expect(config.labels.dashboardTitle).toBe('Painel do Personal');
  });

  it('deriva plural com "s" para uma label nova vinda do backend', () => {
    const config = normalizeBusinessConfig(
      { id: 'OTHER', ui: { labels: { service: 'Procedimento' } } },
      'OTHER'
    );
    expect(config.labels.service).toEqual({ singular: 'Procedimento', plural: 'Procedimentos' });
  });

  it('mantém capabilities e dashboardCards do nicho estático (não vêm do backend)', () => {
    const config = normalizeBusinessConfig(
      { id: 'BARBERSHOP', business: { features: ['products'] } },
      'BARBERSHOP'
    );
    expect(config.capabilities.inventory).toBe(true);
    expect(config.capabilities.commissions).toBe(true);
    expect(config.dashboardCards.length).toBeGreaterThan(0);
  });
});

describe('DEFAULT_BUSINESS_CONFIG', () => {
  it('é o nicho genérico (OTHER) com módulos especiais desligados', () => {
    expect(DEFAULT_BUSINESS_CONFIG.version).toBe(CURRENT_CONFIG_VERSION);
    expect(DEFAULT_BUSINESS_CONFIG.id).toBe('OTHER');
    expect(DEFAULT_BUSINESS_CONFIG.features.medicalRecords.enabled).toBe(false);
    expect(DEFAULT_BUSINESS_CONFIG.features.products.enabled).toBe(false);
  });
});

describe('getStaticBusinessConfig', () => {
  it('barbearia: produtos ligado, treinos/prontuários desligados, label de barbeiro', () => {
    const config = getStaticBusinessConfig('BARBERSHOP');
    expect(config.features.products.enabled).toBe(true);
    expect(config.features.workouts.enabled).toBe(false);
    expect(config.features.medicalRecords.enabled).toBe(false);
    expect(config.labels.professional.singular).toBe('Barbeiro');
  });

  it('personal trainer: treinos e planos ligados, aluno/sessão nas labels', () => {
    const config = getStaticBusinessConfig('PERSONAL_TRAINER');
    expect(config.features.workouts.enabled).toBe(true);
    expect(config.features.memberships.enabled).toBe(true);
    expect(config.labels.client.singular).toBe('Aluno');
    expect(config.labels.appointment.singular).toBe('Sessão');
  });

  it('tipo desconhecido cai em OTHER', () => {
    expect(getStaticBusinessConfig(undefined).id).toBe('OTHER');
  });
});
