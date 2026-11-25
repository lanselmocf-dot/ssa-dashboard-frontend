import { useCallback, useEffect, useRef, useState } from 'react';
import type { ApiResponse } from '../services/api/apiClient';
import { mensagemErro } from '../utils/errors';

interface Estado<T> {
  data: T | null;
  pagination?: ApiResponse['pagination'];
  loading: boolean;
  error: string | null;
}

/**
 * Carrega dados da API sempre que `deps` mudar. Mantém os dados anteriores enquanto
 * recarrega (a tabela não "pisca") e ignora respostas de requisições obsoletas.
 */
export function useFetch<T>(fn: () => Promise<ApiResponse<T>>, deps: unknown[]) {
  const [estado, setEstado] = useState<Estado<T>>({ data: null, loading: true, error: null });
  const [tick, setTick] = useState(0);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    let ativo = true;
    setEstado((s) => ({ ...s, loading: true, error: null }));
    fnRef.current().then((res) => {
      if (!ativo) return;
      if (res.success) setEstado({ data: res.data as T, pagination: res.pagination, loading: false, error: null });
      else setEstado((s) => ({ ...s, loading: false, error: mensagemErro(res) }));
    });
    return () => { ativo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { ...estado, reload };
}
