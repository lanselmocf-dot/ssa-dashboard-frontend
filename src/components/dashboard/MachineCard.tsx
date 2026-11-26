import type { Maquina } from '../../types/api';
import { ESTILO_SITUACAO, chaveSituacao } from '../../utils/indicadores';

/** Cartão clicável do grid do parque fabril, com a situação sinalizada por cor. */
export function MachineCard({ maquina, onAbrir }: { maquina: Maquina; onAbrir: (m: Maquina) => void }) {
  const e = ESTILO_SITUACAO[chaveSituacao(maquina.situacao)];
  return (
    <button type="button" onClick={() => onAbrir(maquina)}
      aria-label={`${maquina.codigo} — ${maquina.nome}: ${maquina.situacao}. Ver detalhes`}
      className={`group flex h-full w-full flex-col rounded-lg border border-l-4 border-slate-200 ${e.borda} bg-white p-3.5 text-left shadow-sm
        transition hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-2 focus-visible:ring-brand-500`}>
      <div className="flex w-full items-start justify-between gap-2">
        <span className="font-mono text-xs font-medium text-slate-500">{maquina.codigo}</span>
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${e.fundo} ${e.texto}`}>
          <span className={`h-2 w-2 rounded-full ${e.ponto} ${chaveSituacao(maquina.situacao) === 'parada' ? 'animate-pulse' : ''}`} aria-hidden />
          {maquina.situacao || e.rotulo}
        </span>
      </div>
      <p className="mt-2 line-clamp-2 text-sm font-semibold text-slate-900">{maquina.nome}</p>
      <p className="mt-0.5 text-xs text-slate-500">{maquina.setor || 'Setor não informado'}</p>
      <div className="mt-auto flex w-full items-center justify-between pt-3 text-xs text-slate-500">
        <span>{maquina.capacidade_nominal_hora != null ? `${maquina.capacidade_nominal_hora} un/h` : 'Capacidade —'}</span>
        <span className="font-medium text-brand-700 opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">Detalhes →</span>
      </div>
    </button>
  );
}
