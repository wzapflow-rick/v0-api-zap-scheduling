import type { FeatureConfig, User } from '@/types';

/**
 * Decide se um módulo pode ser acessado.
 *
 * Hoje a regra é só `feature.enabled`, mas a assinatura já recebe o `user`
 * para que, no futuro, possamos adicionar verificação de RBAC
 * (Dono / Funcionário / Recepcionista / Secretária) e de plano
 * SEM alterar as telas que consomem `canAccessModule` / `<BusinessGuard>`.
 */
export function canAccessModule(
  feature: FeatureConfig | undefined,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _user?: User | null
): boolean {
  if (!feature) return false;
  if (!feature.enabled) return false;

  // Ponto de extensão futuro:
  // if (feature.requiredRoles && !feature.requiredRoles.includes(_user?.role)) return false;
  // if (feature.requiredPlan && !planAllows(_user, feature.requiredPlan)) return false;

  return true;
}
