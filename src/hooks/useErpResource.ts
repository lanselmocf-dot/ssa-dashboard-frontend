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

/** `meta` devolvido pelas rotas /api/erp/* (ErpMeta no backend). */
interface ErpMeta {
  fonte?: 'erp' | 'contingencia' | string;
  atualizado_em?: string;
  desatualizado?: boolean;
}

/**
 * Consome um endpoint do ERP com cache local.
 * - sucesso: atualiza o cache e exibe os dados novos;
 * - sucesso com `meta.fonte = 'contingencia'` (snapshot do próprio backend): exibe e marca `emContingencia`;
 * - HTTP 503: exibe o último dado salvo e marca `emContingencia`;
 * - outros erros: `erro` preenchido (sem dados antigos).
 * `salvoEm` é o momento em que o dado foi lido do ERP (usa `meta.atualizado_em` quando vier).
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
        const meta = res.meta as ErpMeta | undefined;
        // RN-12: o backend tem contingência própria. Ele responde 200 com o último snapshot
        // e marca meta.fonte = 'contingencia' / meta.desatualizado = true.
        const doSnapshot = meta?.fonte === 'contingencia' || meta?.desatualizado === true;
        const lidoEm = meta?.atualizado_em ? Date.parse(meta.atualizado_em) : NaN;
        const salvoEm = Number.isFinite(lidoEm) ? lidoEm : Date.now();
        try { localStorage.setItem(CACHE_PREFIX + chave, JSON.stringify({ dados: res.data, salvoEm })); } catch { /* cota cheia */ }
        setEstado({ dados: res.data as T, carregando: false, emContingencia: doSnapshot, salvoEm, erro: null });
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
