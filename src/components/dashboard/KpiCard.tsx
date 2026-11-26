import { ESTILO_FAIXA, faixaDesempenho, formatarPercentual, larguraPercentual } from '../../utils/indicadores';

interface Props {
  titulo: string;
  valor: number | null | undefined;
  descricao: string;
  destaque?: boolean;
  semDados?: boolean;
  carregando?: boolean;
}

/** Cartão de indicador percentual (Disponibilidade, Performance, Qualidade, OEE). */
export function KpiCard({ titulo, valor, descricao, destaque, semDados, carregando }: Props) {
  const faixa = ESTILO_FAIXA[faixaDesempenho(valor, semDados)];
  return (
    <article className={`rounded-lg border bg-white p-4 shadow-sm ${destaque ? 'border-brand-200 ring-1 ring-brand-100' : 'border-slate-200'}`}
      aria-busy={carregando || undefined}>
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{titulo}</h3>
        <span className={`hidden text-[11px] font-medium sm:inline ${faixa.texto}`}>{faixa.rotulo}</span>
      </div>
      {carregando ? (
        <div className="mt-3 h-9 w-28 animate-pulse rounded bg-slate-100" aria-hidden />
      ) : (
        <p className={`mt-2 text-2xl font-semibold sm:text-3xl tabular-nums ${destaque ? 'text-brand-800' : 'text-slate-900'}`}>
          {formatarPercentual(valor)}
        </p>
      )}
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100" aria-hidden>
        <div className={`h-full rounded-full transition-all ${faixa.barra}`} style={{ width: carregando ? '0%' : larguraPercentual(valor) }} />
      </div>
      <p className="mt-2 text-xs text-slate-500">{descricao}</p>
    </article>
  );
}
