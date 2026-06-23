'use client';

import { useEffect, type ReactNode } from 'react';
import { useModuleAccess } from '@/hooks/use-module-access';
import { AccessDenied } from '@/components/business/access-denied';
import { analytics, AnalyticsEvent } from '@/lib/analytics';
import type { BusinessFeatures } from '@/types';

interface BusinessGuardProps {
  feature: keyof BusinessFeatures;
  children: ReactNode;
  /** Conteúdo alternativo quando sem acesso. Se omitido, usa <AccessDenied />. */
  fallback?: ReactNode;
}

/**
 * API pública das telas para proteger módulos.
 * Substitui o antigo FeatureGate — a assinatura não muda quando
 * entrarem role/plano (a regra fica em `canAccessModule`).
 */
export function BusinessGuard({ feature, children, fallback }: BusinessGuardProps) {
  const { canAccess } = useModuleAccess();
  const allowed = canAccess(feature);

  useEffect(() => {
    if (allowed) {
      analytics.track(AnalyticsEvent.FEATURE_ACCESSED, { feature });
    }
  }, [allowed, feature]);

  if (!allowed) {
    return <>{fallback ?? <AccessDenied />}</>;
  }

  return <>{children}</>;
}
