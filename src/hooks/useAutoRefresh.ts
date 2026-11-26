import { useEffect, useRef } from 'react';

/**
 * Executa `callback` a cada `intervaloMs` enquanto `ativo` for true.
 * Pausa com a aba em segundo plano e atualiza imediatamente ao voltar para ela.
 */
export function useAutoRefresh(callback: () => void, intervaloMs: number, ativo = true) {
  const ref = useRef(callback);
  ref.current = callback;

  useEffect(() => {
    if (!ativo) return;
    const tick = () => { if (document.visibilityState === 'visible') ref.current(); };
    const id = window.setInterval(tick, intervaloMs);
    const aoVoltar = () => { if (document.visibilityState === 'visible') ref.current(); };
    document.addEventListener('visibilitychange', aoVoltar);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', aoVoltar);
    };
  }, [intervaloMs, ativo]);
}
