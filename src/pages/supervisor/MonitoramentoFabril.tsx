import { useEffect, useMemo, useState } from 'react';
import { useFetch } from '../../hooks/useFetch';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import { MaquinasApi, TurnosApi } from '../../services/api/adminApi';
import { MonitoramentoApi } from '../../services/api/monitoramentoApi';
import type { Maquina } from '../../types/api';
import { Button } from '../../components/ui/Button';
import { EmptyState, ErrorState, Spinner } from '../../components/ui/Feedback';
import { KpiCard } from '../../components/dashboard/KpiCard';
import { MachineCard } from '../../components/dashboard/MachineCard';
import { RankingGargalos } from '../../components/dashboard/RankingGargalos';
import { formatarHora, formatarSegundos } from '../../utils/format';
import {
  ESTILO_SITUACAO, OPCOES_PERIODO, ORDEM_SITUACAO, chaveSituacao, formatarPercentual, montarPeriodo, numeroSeguro,
  type ChaveSituacao, type OpcaoPeriodo
} from '../../utils/indicadores';
import { MaquinaDetalheModal } from './MaquinaDetalheModal';

const INTERVALO_ATUALIZACAO_MS = 30_000;

/**
 * O backend ainda não aceita filtro por turno em /indicadores/resumo nem em /indicadores/gargalos.
 * Quando aceitar, basta habilitar esta flag e repassar o turno nas chamadas da MonitoramentoApi.
 */
const API_SUPORTA_TURNO = false;

/** Tela 03 — Painel de Monitoramento Fabril & OEE Global em tempo real (visão supervisor). */
export function MonitoramentoFabril() {
  const [opcaoPeriodo, setOpcaoPeriodo] = useState<OpcaoPeriodo>('hoje');
  const [setor, setSetor] = useState('');
  const [turnoId, setTurnoId] = useState('');
  const [filtroSituacao, setFiltroSituacao] = useState<ChaveSituacao | ''>('');
  const [busca, setBusca] = useState('');
  const [selecionada, setSelecionada] = useState<Maquina | null>(null);
  const [atualizadoEm, setAtualizadoEm] = useState<Date | null>(null);

  const periodo = useMemo(() => montarPeriodo(opcaoPeriodo), [opcaoPeriodo]);

  const resumo = useFetch(
    () => MonitoramentoApi.resumo({ ...periodo, setor: setor || undefined }),
    [periodo.data_inicio, periodo.data_fim, setor]
  );
  const maquinas = useFetch(() => MaquinasApi.listar(), []);
  const gargalos = useFetch(() => MonitoramentoApi.gargalos(periodo), [periodo.data_inicio, periodo.data_fim]);
  const turnos = useFetch(() => TurnosApi.listar(), []);

  const atualizarTudo = () => { resumo.reload(); maquinas.reload(); gargalos.reload(); };
  useAutoRefresh(atualizarTudo, INTERVALO_ATUALIZACAO_MS, !selecionada);

  useEffect(() => {
    if (resumo.data || maquinas.data || gargalos.data) setAtualizadoEm(new Date());
  }, [resumo.data, maquinas.data, gargalos.data]);

  const carregandoAlgo = resumo.loading || maquinas.loading || gargalos.loading;
  const semConexao = !!(resumo.error && maquinas.error && gargalos.error);

  const setores = useMemo(
    () => [...new Set((maquinas.data ?? []).map((m) => m.setor).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [maquinas.data]
  );

  const maquinasDoSetor = useMemo(
    () => (maquinas.data ?? []).filter((m) => !setor || m.setor === setor),
    [maquinas.data, setor]
  );

  const contagem = useMemo(() => {
    const c: Record<ChaveSituacao, number> = { operando: 0, parada: 0, manutencao: 0, inativa: 0 };
    for (const m of maquinasDoSetor) c[chaveSituacao(m.situacao)]++;
    return c;
  }, [maquinasDoSetor]);

  const visiveis = useMemo(() => {
    const t = busca.trim().toLowerCase();
    return maquinasDoSetor
      .filter((m) => (!filtroSituacao || chaveSituacao(m.situacao) === filtroSituacao) &&
        (!t || m.codigo.toLowerCase().includes(t) || m.nome.toLowerCase().includes(t)))
      .sort((a, b) =>
        ORDEM_SITUACAO.indexOf(chaveSituacao(a.situacao)) - ORDEM_SITUACAO.indexOf(chaveSituacao(b.situacao)) ||
        a.codigo.localeCompare(b.codigo));
  }, [maquinasDoSetor, filtroSituacao, busca]);

  const r = resumo.data;
  const semMetas = !!r && !r.possui_metas;

  return (
    <div className="space-y-6">
      {/* Cabeçalho e filtros */}
      <section aria-labelledby="t-mon" className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="t-mon" className="text-lg font-semibold text-slate-900">Monitoramento fabril em tempo real</h2>
            <p className="text-sm text-slate-500">OEE global, estado do parque de máquinas e principais gargalos da produção.</p>
          </div>
          <div className="flex items-center gap-3">
            <p className="text-xs text-slate-500" aria-live="polite">
              <span className={`mr-1.5 inline-block h-2 w-2 rounded-full ${semConexao ? 'bg-red-500' : carregandoAlgo ? 'animate-pulse bg-brand-500' : 'bg-emerald-500'}`} aria-hidden />
              {semConexao ? 'Sem conexão com o servidor' : atualizadoEm ? `Atualizado às ${atualizadoEm.toLocaleTimeString('pt-BR')}` : 'Carregando…'} · auto a cada 30s
            </p>
            <Button variant="secondary" size="sm" onClick={atualizarTudo} loading={carregandoAlgo}>Atualizar</Button>
          </div>
        </div>

        <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm sm:grid-cols-3">
          <label className="text-xs font-medium text-slate-600">
            Período
            <select className="input mt-1" value={opcaoPeriodo} onChange={(e) => setOpcaoPeriodo(e.target.value as OpcaoPeriodo)}>
              {OPCOES_PERIODO.map((o) => <option key={o.valor} value={o.valor}>{o.rotulo}</option>)}
            </select>
          </label>
          <label className="text-xs font-medium text-slate-600">
            Setor
            <select className="input mt-1" value={setor} onChange={(e) => setSetor(e.target.value)}>
              <option value="">Todos os setores</option>
              {setores.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <label className="text-xs font-medium text-slate-600">
            Turno
            <select className="input mt-1" value={turnoId} onChange={(e) => setTurnoId(e.target.value)}
              disabled={!API_SUPORTA_TURNO} aria-describedby="dica-turno">
              <option value="">Todos os turnos</option>
              {(turnos.data ?? []).map((t) => (
                <option key={t.id} value={t.id}>{t.nome} ({formatarHora(t.hora_inicio)}–{formatarHora(t.hora_fim)})</option>
              ))}
            </select>
            {!API_SUPORTA_TURNO && (
              <span id="dica-turno" className="mt-1 block font-normal text-slate-500">
                Indicadores consolidados por dia: a API ainda não filtra por turno.
              </span>
            )}
          </label>
        </div>
      </section>

      {/* 1. KPIs macro */}
      <section aria-labelledby="t-kpi" className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 id="t-kpi" className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Indicadores da fábrica {setor && <span className="normal-case text-slate-700">· {setor}</span>}
          </h3>
          {r && (
            <p className="text-xs text-slate-500">
              {numeroSeguro(r.maquinas_consideradas)} máquina(s) com meta · produzido {numeroSeguro(r.realizado.producao_total)} un ·
              refugo {numeroSeguro(r.realizado.producao_rejeitada)} un · parado {formatarSegundos(numeroSeguro(r.realizado.tempo_paradas_segundos))}
            </p>
          )}
        </div>
        {resumo.error && !r ? (
          <div className="rounded-lg border border-slate-200 bg-white"><ErrorState mensagem={resumo.error} onRetry={resumo.reload} /></div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
              <KpiCard titulo="OEE geral" destaque valor={r?.indicadores.oee} semDados={semMetas} carregando={!r && resumo.loading}
                descricao="Disponibilidade × Performance × Qualidade" />
              <KpiCard titulo="Disponibilidade" valor={r?.indicadores.disponibilidade} semDados={semMetas} carregando={!r && resumo.loading}
                descricao="Tempo operando ÷ tempo planejado" />
              <KpiCard titulo="Performance" valor={r?.indicadores.performance} semDados={semMetas} carregando={!r && resumo.loading}
                descricao="Produção total ÷ meta planejada" />
              <KpiCard titulo="Qualidade" valor={r?.indicadores.qualidade} semDados={semMetas} carregando={!r && resumo.loading}
                descricao="Peças aprovadas ÷ produção total" />
            </div>
            {semMetas && (
              <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                Nenhuma meta de produção cadastrada para o período{setor ? ' e setor selecionados' : ''}: os índices são exibidos como {formatarPercentual(0)}.
              </p>
            )}
            {resumo.error && r && <AvisoDesatualizado />}
          </>
        )}
      </section>

      {/* 2. Grid de status do parque */}
      <section aria-labelledby="t-parque" className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 id="t-parque" className="text-sm font-semibold uppercase tracking-wide text-slate-500">Parque de máquinas</h3>
            <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Filtrar por situação">
              <FiltroChip ativo={filtroSituacao === ''} onClick={() => setFiltroSituacao('')} ponto="bg-brand-600"
                rotulo="Todas" total={maquinasDoSetor.length} />
              {ORDEM_SITUACAO.map((k) => (
                <FiltroChip key={k} ativo={filtroSituacao === k} onClick={() => setFiltroSituacao(filtroSituacao === k ? '' : k)}
                  ponto={ESTILO_SITUACAO[k].ponto} rotulo={ESTILO_SITUACAO[k].rotulo} total={contagem[k]} />
              ))}
            </div>
          </div>
          <input aria-label="Buscar máquina por código ou nome" placeholder="Buscar por código ou nome" className="input sm:w-64"
            value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>

        {maquinas.loading && !maquinas.data ? <div className="rounded-lg border border-slate-200 bg-white"><Spinner label="Carregando máquinas…" /></div> :
          maquinas.error && !maquinas.data ? (
            <div className="rounded-lg border border-slate-200 bg-white"><ErrorState mensagem={maquinas.error} onRetry={maquinas.reload} /></div>
          ) : visiveis.length === 0 ? (
            <div className="rounded-lg border border-slate-200 bg-white">
              <EmptyState titulo="Nenhuma máquina encontrada" descricao="Ajuste os filtros de setor, situação ou busca." />
            </div>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
              {visiveis.map((m) => <li key={m.id}><MachineCard maquina={m} onAbrir={setSelecionada} /></li>)}
            </ul>
          )}
        {maquinas.error && maquinas.data && <AvisoDesatualizado />}
      </section>

      {/* 3. Gargalos */}
      <section aria-labelledby="t-garg" className="space-y-3">
        <div>
          <h3 id="t-garg" className="text-sm font-semibold uppercase tracking-wide text-slate-500">Gargalos fabris · Top 5</h3>
          <p className="text-xs text-slate-500">
            Ranking calculado sobre todo o parque{setor ? `; máquinas fora de ${setor} aparecem esmaecidas` : ''}.
          </p>
        </div>
        {gargalos.loading && !gargalos.data ? <div className="rounded-lg border border-slate-200 bg-white"><Spinner label="Calculando gargalos…" /></div> :
          gargalos.error && !gargalos.data ? (
            <div className="rounded-lg border border-slate-200 bg-white"><ErrorState mensagem={gargalos.error} onRetry={gargalos.reload} /></div>
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              <RankingGargalos titulo="Maior tempo de máquina parada" subtitulo="Downtime acumulado no período (inclui paradas em aberto)"
                itens={gargalos.data?.top_downtime ?? []} cor="red" setorDestacado={setor || undefined}
                valor={(m) => numeroSeguro(m.downtime_segundos)} formatar={(m) => formatarSegundos(numeroSeguro(m.downtime_segundos))}
                detalhe={(m) => `${numeroSeguro(m.total_produzido)} un produzidas`}
                vazio="Nenhuma parada registrada no período." />
              <RankingGargalos titulo="Maior taxa de refugo" subtitulo="Peças rejeitadas ÷ produção total no período"
                itens={gargalos.data?.top_refugo ?? []} cor="amber" setorDestacado={setor || undefined}
                valor={(m) => numeroSeguro(m.percentual_refugo)} formatar={(m) => formatarPercentual(m.percentual_refugo)}
                detalhe={(m) => `${numeroSeguro(m.total_refugado)} de ${numeroSeguro(m.total_produzido)} un refugadas`}
                vazio="Nenhuma produção registrada no período." />
            </div>
          )}
        {gargalos.error && gargalos.data && <AvisoDesatualizado />}
      </section>

      {selecionada && <MaquinaDetalheModal maquina={selecionada} periodo={periodo} onClose={() => setSelecionada(null)} />}
    </div>
  );
}

function FiltroChip({ ativo, onClick, ponto, rotulo, total }: {
  ativo: boolean; onClick: () => void; ponto: string; rotulo: string; total: number;
}) {
  return (
    <button type="button" onClick={onClick} aria-pressed={ativo}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition
        ${ativo ? 'border-brand-600 bg-brand-50 text-brand-800' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>
      <span className={`h-2 w-2 rounded-full ${ponto}`} aria-hidden />
      {rotulo}
      <span className="tabular-nums text-slate-500">{total}</span>
    </button>
  );
}

function AvisoDesatualizado() {
  return (
    <p className="text-xs text-amber-700" role="status">
      Não foi possível atualizar agora; exibindo os últimos dados recebidos. Nova tentativa automática em instantes.
    </p>
  );
}
