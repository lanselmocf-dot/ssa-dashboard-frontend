import { useMemo, type ReactNode } from 'react';
import type { ApiResponse } from '../../services/api/apiClient';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Badge, ErrorState, Spinner } from '../../components/ui/Feedback';
import { useFetch } from '../../hooks/useFetch';
import { MonitoramentoApi } from '../../services/api/monitoramentoApi';
import type { Maquina } from '../../types/api';
import type { IndicadoresMaquina, Periodo } from '../../types/monitoramento';
import { formatarDataHora, formatarDataISO, formatarSegundos } from '../../utils/format';
import {
  ESTILO_FAIXA, ESTILO_SITUACAO, chaveSituacao, faixaDesempenho, formatarPercentual, larguraPercentual, numeroSeguro
} from '../../utils/indicadores';

interface Props {
  maquina: Maquina;
  periodo: Periodo;
  onClose: () => void;
}

/** Detalhes do equipamento: situação atual, indicadores individuais de OEE e linha do tempo de situações. */
export function MaquinaDetalheModal({ maquina, periodo, onClose }: Props) {
  const historico = useFetch(() => MonitoramentoApi.historico(maquina.id), [maquina.id]);
  // O back responde 422 NO_PRODUCTION_TARGET quando a máquina não tem meta no período:
  // não é falha, é ausência de base de cálculo — tratamos como estado vazio.
  const indicadores = useFetch(async (): Promise<ApiResponse<IndicadoresMaquina | null>> => {
    const res = await MonitoramentoApi.indicadoresMaquina(maquina.id, periodo);
    return res.error?.code === 'NO_PRODUCTION_TARGET' ? { success: true, data: null } : res;
  }, [maquina.id, periodo.data_inicio, periodo.data_fim]);

  const situacaoAtual = historico.data?.maquina?.situacao ?? maquina.situacao;
  const estilo = ESTILO_SITUACAO[chaveSituacao(situacaoAtual)];
  const linhaDoTempo = useMemo(() => [...(historico.data?.historico ?? [])].reverse(), [historico.data]);
  const ind = indicadores.data;

  return (
    <Modal open size="xl" title={`${maquina.codigo} — ${maquina.nome}`} onClose={onClose}
      footer={<Button variant="secondary" onClick={onClose}>Fechar</Button>}>
      <div className="space-y-5">
        {/* Identificação */}
        <dl className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm sm:grid-cols-4">
          <Item rotulo="Situação atual">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold ${estilo.fundo} ${estilo.texto}`}>
              <span className={`h-2 w-2 rounded-full ${estilo.ponto}`} aria-hidden />{situacaoAtual}
            </span>
          </Item>
          <Item rotulo="Setor">{maquina.setor || '—'}</Item>
          <Item rotulo="Modelo / fabricante">{[maquina.modelo, maquina.fabricante].filter(Boolean).join(' · ') || '—'}</Item>
          <Item rotulo="Capacidade nominal">{maquina.capacidade_nominal_hora != null ? `${maquina.capacidade_nominal_hora} un/h` : '—'}</Item>
        </dl>

        <div className="grid gap-5 lg:grid-cols-5">
          {/* Indicadores individuais */}
          <section className="lg:col-span-2" aria-labelledby="det-ind">
            <h3 id="det-ind" className="text-sm font-semibold text-slate-900">Indicadores de OEE</h3>
            <p className="text-xs text-slate-500">
              {formatarDataISO(periodo.data_inicio)}{periodo.data_inicio !== periodo.data_fim && ` a ${formatarDataISO(periodo.data_fim)}`}
            </p>
            <div className="mt-3">
              {indicadores.loading && !indicadores.data ? <Spinner label="Calculando indicadores…" /> :
                indicadores.error ? <ErrorState mensagem={indicadores.error} onRetry={indicadores.reload} /> :
                !ind ? (
                  <p className="rounded-md border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500">
                    Sem metas de produção cadastradas para esta máquina no período. Os indicadores dependem da meta planejada.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {([
                      ['OEE', ind.indicadores.oee],
                      ['Disponibilidade', ind.indicadores.disponibilidade],
                      ['Performance', ind.indicadores.performance],
                      ['Qualidade', ind.indicadores.qualidade]
                    ] as const).map(([rotulo, valor]) => {
                      const f = ESTILO_FAIXA[faixaDesempenho(valor)];
                      return (
                        <div key={rotulo}>
                          <div className="flex justify-between text-sm">
                            <span className={rotulo === 'OEE' ? 'font-semibold text-slate-900' : 'text-slate-700'}>{rotulo}</span>
                            <span className={`font-semibold tabular-nums ${f.texto}`}>{formatarPercentual(valor)}</span>
                          </div>
                          <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100" aria-hidden>
                            <div className={`h-full rounded-full ${f.barra}`} style={{ width: larguraPercentual(valor) }} />
                          </div>
                        </div>
                      );
                    })}
                    <dl className="grid grid-cols-2 gap-2 pt-2 text-xs">
                      <Mini rotulo="Produzido / meta" valor={`${numeroSeguro(ind.realizado.producao_total)} / ${numeroSeguro(ind.planejado.quantidade)}`} />
                      <Mini rotulo="Refugo" valor={`${numeroSeguro(ind.realizado.producao_rejeitada)} un`} />
                      <Mini rotulo="Tempo planejado" valor={formatarSegundos(numeroSeguro(ind.planejado.tempo_segundos))} />
                      <Mini rotulo="Tempo parado" valor={formatarSegundos(numeroSeguro(ind.realizado.tempo_paradas_segundos))} />
                    </dl>
                  </div>
                )}
            </div>
          </section>

          {/* Linha do tempo */}
          <section className="lg:col-span-3" aria-labelledby="det-hist">
            <h3 id="det-hist" className="text-sm font-semibold text-slate-900">Linha do tempo de situações</h3>
            <p className="text-xs text-slate-500">Mudanças registradas na trilha de auditoria, da mais recente para a mais antiga.</p>
            <div className="mt-3 max-h-80 overflow-y-auto pr-1">
              {historico.loading && !historico.data ? <Spinner label="Carregando histórico…" /> :
                historico.error ? <ErrorState mensagem={historico.error} onRetry={historico.reload} /> :
                linhaDoTempo.length === 0 ? (
                  <p className="rounded-md border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500">
                    Nenhuma mudança de situação registrada para este equipamento.
                  </p>
                ) : (
                  <ol className="relative ml-2 border-l border-slate-200">
                    {linhaDoTempo.map((t) => {
                      const nova = ESTILO_SITUACAO[chaveSituacao(t.situacao_nova)];
                      return (
                        <li key={t.id} className="mb-4 ml-4 last:mb-0">
                          <span className={`absolute -left-[5px] mt-1.5 h-2.5 w-2.5 rounded-full ring-2 ring-white ${nova.ponto}`} aria-hidden />
                          <time className="text-xs text-slate-500" dateTime={t.ocorrido_em}>{formatarDataHora(t.ocorrido_em)}</time>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-sm">
                            {t.situacao_anterior
                              ? <Badge tom={ESTILO_SITUACAO[chaveSituacao(t.situacao_anterior)].tomBadge}>{t.situacao_anterior}</Badge>
                              : <span className="text-xs text-slate-500">Cadastro</span>}
                            <span className="text-slate-400" aria-label="para">→</span>
                            <Badge tom={nova.tomBadge}>{t.situacao_nova ?? '—'}</Badge>
                          </div>
                          <p className="mt-1 text-xs text-slate-600">
                            por <span className="font-medium">{t.usuario_nome ?? 'Sistema'}</span>
                            {t.justificativa_tecnica && <> · “{t.justificativa_tecnica}”</>}
                          </p>
                        </li>
                      );
                    })}
                  </ol>
                )}
            </div>
          </section>
        </div>
      </div>
    </Modal>
  );
}

function Item({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{rotulo}</dt>
      <dd className="mt-0.5 font-medium text-slate-800">{children}</dd>
    </div>
  );
}

function Mini({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="rounded border border-slate-200 px-2 py-1.5">
      <dt className="text-slate-500">{rotulo}</dt>
      <dd className="font-semibold tabular-nums text-slate-800">{valor}</dd>
    </div>
  );
}
