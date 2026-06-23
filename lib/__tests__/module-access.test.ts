import { describe, it, expect } from 'vitest';
import { canAccessModule } from '@/lib/module-access';
import type { FeatureConfig } from '@/types';

const enabled: FeatureConfig = { enabled: true, version: 1 };
const disabled: FeatureConfig = { enabled: false, version: 1 };

describe('canAccessModule', () => {
  it('libera quando a feature está habilitada', () => {
    expect(canAccessModule(enabled)).toBe(true);
  });

  it('bloqueia quando a feature está desabilitada', () => {
    expect(canAccessModule(disabled)).toBe(false);
  });

  it('bloqueia quando a feature é indefinida', () => {
    expect(canAccessModule(undefined)).toBe(false);
  });

  it('ignora o usuário por enquanto (RBAC-ready, mas sem regra de role ainda)', () => {
    const user = { id: '1', name: 'X' } as never;
    expect(canAccessModule(enabled, user)).toBe(true);
    expect(canAccessModule(disabled, user)).toBe(false);
  });
});
