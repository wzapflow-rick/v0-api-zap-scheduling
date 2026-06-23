'use client';

import { useEffect, useState } from 'react';

/**
 * Retorna o valor com atraso (debounce). Útil para campos de busca: o valor
 * só "estabiliza" após `delay` ms sem digitação, evitando disparar requisições
 * (e re-render/refetch do SWR) a cada tecla.
 */
export function useDebounce<T>(value: T, delay = 350): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
