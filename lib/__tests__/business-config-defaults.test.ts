import { describe, it, expect } from 'vitest';
import {
  normalizeBusinessConfig,
  getStaticBusinessConfig,
  DEFAULT_BUSINESS_CONFIG,
  CURRENT_CONFIG_VERSION,
} from '@/lib/business-config-defaults';

describe('normalizeBusinessConfig', () => {
  it('usa a config estática do nicho quando a entrada é inválida', () => {
    const config = normalizeBusinessConfig(null, 'CLINIC');
    expect(config.id).toBe('CLINIC');
    // Clínica: prontuários ligado, produtos desligado, cliente vira "Paciente"
    expect(config.features.medicalRecords.enabled).toBe(true);
    expect(config.features.products.enabled).toBe(false);
    expect(config.labels.client.singular).toBe('Paciente');
  });

  it('converte feature booleana legada em FeatureConfig', () => {
    const config = normalizeBusinessConfig({
      features: { products: false, workouts: true },
    });
    expect(config.features.products).toEqual({ enabled: false, version: 1 });
    expect(config.features.workouts).toEqual({ enabled: true, version: 1 });
  });

  it('preserva version e metadata de uma feature em formato objeto', () => {
    const config = normalizeBusinessConfig({
      features: {
        workouts: { enabled: true, version: 2, metadata: { beta: true } },
      },
    });
    expect(config.features.workouts.version).toBe(2);
    expect(config.features.workouts.metadata).toEqual({ beta: true });
  });

  it('aceita label como string simples e expande para singular/plural', () => {
    const config = normalizeBusinessConfig({
      labels: { client: 'Aluno' },
    });
    expect(config.labels.client).toEqual({ singular: 'Aluno', plural: 'Aluno' });
  });

  it('aceita label como objeto com singular/plural', () => {
    const config = normalizeBusinessConfig({
      labels: { client: { singular: 'Paciente', plural: 'Pacientes' } },
    });
    expect(config.labels.client).toEqual({ singular: 'Paciente', plural: 'Pacientes' });
  });

  it('aplica defaults para version e capabilities ausentes', () => {
    const config = normalizeBusinessConfig({ id: 'SALON' });
    expect(config.version).toBe(1);
    expect(config.capabilities.inventory).toBe(false);
    expect(config.dashboardCards.length).toBeGreaterThan(0);
  });

  it('mantém capabilities informadas e completa o resto com default', () => {
    const config = normalizeBusinessConfig({
      capabilities: { inventory: true },
    });
    expect(config.capabilities.inventory).toBe(true);
    expect(config.capabilities.commissions).toBe(false);
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
