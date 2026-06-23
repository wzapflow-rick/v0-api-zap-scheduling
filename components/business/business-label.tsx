'use client';

import { useBusiness } from '@/hooks/use-business';
import type { BusinessLabelKey } from '@/types';

/** Hook utilitário focado em labels (derivado de useBusiness). */
export function useBusinessLabels() {
  const { getBusinessLabel } = useBusiness();
  return { getBusinessLabel };
}

interface BusinessLabelProps {
  label: BusinessLabelKey;
  plural?: boolean;
}

/**
 * Renderiza uma label de negócio adaptada ao nicho.
 * Forma recomendada de exibir termos como "Cliente"/"Clientes" nas telas.
 */
export function BusinessLabel({ label, plural }: BusinessLabelProps) {
  const { getBusinessLabel } = useBusiness();
  return <>{getBusinessLabel(label, { plural })}</>;
}
