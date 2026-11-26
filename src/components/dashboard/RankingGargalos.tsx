import type { MaquinaGargalo } from '../../types/monitoramento';

interface Props {
  titulo: string;
  subtitulo: string;
  itens: MaquinaGargalo[];
  valor: (m: MaquinaGargalo) => number;
  formatar: (m: MaquinaGargalo) => string;
  detalhe: (m: MaquinaGargalo) => string;
  cor: 'red' | 'amber';
  setorDestacado?: string;
  vazio: string;
}

const CORES = {
  red: { barra: 'bg-red-500', barraFraca: 'bg-red-200', numero: 'bg-red-600 text-white' },
  amber: { barra: 'bg-amber-500', barraFraca: 'bg-amber-200', numero: 'bg-amber-500 text-white' }
};

/** Ranking Top 5 em barras horizontais; o 1º lugar recebe destaque. */
export function RankingGargalos({ titulo, subtitulo, itens, valor, formatar, detalhe, cor, setorDestacado, vazio }: Props) {
  const max = Math.max(0, ...itens.map(valor));
  const c = CORES[cor];
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm" aria-label={titulo}>
      <h3 className="text-sm font-semibold text-slate-900">{titulo}</h3>
      <p className="text-xs text-slate-500">{subtitulo}</p>
      {itens.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-500">{vazio}</p>
      ) : (
        <ol className="mt-4 space-y-3">
          {itens.map((m, i) => {
            const v = valor(m);
            const largura = max > 0 ? `${Math.max(2, (v / max) * 100)}%` : '0%';
            const foraDoSetor = !!setorDestacado && m.setor !== setorDestacado;
            return (
              <li key={m.maquina_id} className={foraDoSetor ? 'opacity-40' : ''}>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded text-[11px] font-bold
                      ${i === 0 ? c.numero : 'bg-slate-100 text-slate-600'}`}>{i + 1}</span>
                    <span className="truncate font-medium text-slate-800" title={`${m.codigo} — ${m.nome}`}>
                      <span className="font-mono text-xs text-slate-500">{m.codigo}</span> {m.nome}
                    </span>
                  </span>
                  <span className="shrink-0 font-semibold tabular-nums text-slate-900">{formatar(m)}</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100" aria-hidden>
                  <div className={`h-full rounded-full ${i === 0 ? c.barra : c.barraFraca}`} style={{ width: largura }} />
                </div>
                <p className="mt-0.5 text-[11px] text-slate-500">{m.setor} · {detalhe(m)}</p>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
