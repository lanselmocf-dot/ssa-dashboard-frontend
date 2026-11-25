import { useEffect, useMemo, useState } from 'react';

/** Paginação em memória para listas que o back devolve inteiras (usuários, máquinas). */
export function useClientPage<T>(itens: T[], limiteInicial = 10) {
  const [pagina, setPagina] = useState(1);
  const [limite, setLimite] = useState(limiteInicial);
  const totalPaginas = Math.max(1, Math.ceil(itens.length / limite));

  // Se o filtro encolher a lista, volta para uma página válida.
  useEffect(() => { if (pagina > totalPaginas) setPagina(totalPaginas); }, [pagina, totalPaginas]);

  const visiveis = useMemo(() => itens.slice((pagina - 1) * limite, pagina * limite), [itens, pagina, limite]);
  return {
    visiveis, pagina, limite, totalPaginas, total: itens.length,
    setPagina, setLimite: (l: number) => { setLimite(l); setPagina(1); },
    voltarInicio: () => setPagina(1)
  };
}
