import { useCallback, useEffect, useRef, useState } from 'react';
import type { ApiResponse } from '../services/api/apiClient';
import { mensagemErro } from '../utils/errors';

const CACHE_PREFIX = '@ssa:cache:';

interface Estado<T> {
  dados: T | null;
  carregando: boolean;
  /** true quando o ERP respondeu 503 e a tela exibe o último dado salvo (RN-12). */
  emContingencia: boolean;
  salvoEm: number | null;
  erro: string | null;
}

function lerCache<T>(chave: string): { dados: T; salvoEm: number } | null {
  try { return JSON.parse(localStorage.getItem(CACHE_PREFIX + chave) ?? 'null'); } catch { return null; }
}

/**
 * Consome um endpoint do ERP com cache local.
 * - sucesso: atualiza o cache e exibe os dados novos;
 * - HTTP 503: exibe o último dado salvo e marca `emContingencia`;
 * - outros erros: `erro` preenchido (sem dados antigos).
 */
export function useErpResource<T>(chave: string, fn: () => Promise<ApiResponse<T>>) {
  const [estado, setEstado] = useState<Estado<T>>({ dados: null, carregando: true, emContingencia: false, salvoEm: null, erro: null });
  const [tick, setTick] = useState(0);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    let ativo = true;
    setEstado((s) => ({ ...s, carregando: true, erro: null }));
    fnRef.current().then((res) => {
      if (!ativo) return;
      if (res.success) {
        const salvoEm = Date.now();
        try { localStorage.setItem(CACHE_PREFIX + chave, JSON.stringify({ dados: res.data, salvoEm })); } catch { /* cota cheia */ }
        setEstado({ dados: res.data as T, carregando: false, emContingencia: false, salvoEm, erro: null });
        return;
      }
      const cache = res.status === 503 ? lerCache<T>(chave) : null;
      if (cache) setEstado({ dados: cache.dados, carregando: false, emContingencia: true, salvoEm: cache.salvoEm, erro: null });
      else setEstado({ dados: null, carregando: false, emContingencia: false, salvoEm: null, erro: mensagemErro(res) });
    });
    return () => { ativo = false; };
  }, [chave, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { ...estado, reload };
}
