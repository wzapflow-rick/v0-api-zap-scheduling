'use client';

import { useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useBusiness } from '@/hooks/use-business';
import { canAccessModule } from '@/lib/module-access';
import type { BusinessFeatures } from '@/types';

/**
 * Acesso a módulos combinando feature flag (hoje) + RBAC/plano (futuro).
 * As telas usam `canAccess('products')` em vez de ler a config direto.
 */
export function useModuleAccess() {
  const { config } = useBusiness();
  const { user } = useAuth();

  const canAccess = useCallback(
    (feature: keyof BusinessFeatures): boolean =>
      canAccessModule(config.features[feature], user),
    [config, user]
  );

  return { canAccess };
}
