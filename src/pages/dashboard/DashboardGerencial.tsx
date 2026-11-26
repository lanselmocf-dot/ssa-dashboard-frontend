import { useMemo, useState, type ReactNode } from 'react';
import { useErpResource } from '../../hooks/useErpResource';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import { ErpApi } from '../../services/api/erpApi';
import { Badge, EmptyState, ErrorState } from '../../components/ui/Feedback';
import { formatarDataHora, formatarDataISO, formatarMoeda, formatarNumero, hojeISO, somarDiasISO } from '../../utils/format';
import type { EstoqueCritico, Faturamento, Vendas } from '../../types/api';

/**
 * As rotas do ERP trabalham com UMA data de referência (?data=YYYY-MM-DD):
 * faturamento e pedidos devolvem o dia e o acumulado do mês até essa data.
 * Por isso o filtro é "data de referência", e não um intervalo livre.
 */
const REFERENCIAS = [
  { valor: 'hoje', rotulo: 'Hoje' },
  { valor: 'ontem', rotulo: 'Ontem' },
  { valor: 'data', rotulo: 'Escolher data…' }
] as const;
type Referencia = (typeof REFERENCIAS)[number]['valor'];

const FILIAIS = [
  { valor: '', rotulo: 'Todas as filiais' },
  { valor: '1', rotulo: 'Filial 01 — Matriz' },
  { valor: '2', rotulo: 'Filial 02 — Distribuição' }
];

/** Intervalo da atualização automática dos indicadores. */
const ATUALIZAR_A_CADA_MS = 60_000;
/** Máximo aceito pelo backend em ?limite= (estoque crítico). */
const LIMITE_ESTOQUE = 100;

function extrairFaturamentoDiario(fat: Faturamento | null | undefined): number {
  if (!fat?.diario) return 0;
  if (typeof fat.diario === 'object') return Number(fat.diario.total_faturado) || 0;
  return Number(fat.diario) || 0;
}

function extrairFaturamentoMensal(fat: Faturamento | null | undefined): number {
  if (!fat?.mensal) return 0;
  if (typeof fat.mensal === 'object') return Number(fat.mensal.total_faturado) || 0;
  return Number(fat.mensal) || 0;
}

function extrairNotasDiario(fat: Faturamento | null | undefined): number | null {
  if (fat?.diario && typeof fat.diario === 'object') return Number(fat.diario.quantidade_notas) || 0;
  return null;
}

function extrairNotasMensal(fat: Faturamento | null | undefined): number | null {
  if (fat?.mensal && typeof fat.mensal === 'object') return Number(fat.mensal.quantidade_notas) || 0;
  return null;
}

function extrairPedidosEmitidos(ven: Vendas | null | undefined): number {
  if (!ven) return 0;
  if (ven.pedidos_emitidos?.mensal) return Number(ven.pedidos_emitidos.mensal.quantidade) || 0;
  if (ven.pedidos_emitidos?.diario) return Number(ven.pedidos_emitidos.diario.quantidade) || 0;
  return Number(ven.emitidos) || 0;
}

function extrairPedidosEmitidosDia(ven: Vendas | null | undefined): number | null {
  if (ven?.pedidos_emitidos?.diario) return Number(ven.pedidos_emitidos.diario.quantidade) || 0;
  return null;
}

function extrairValorPedidosEmitidos(ven: Vendas | null | undefined): number | null {
  if (ven?.pedidos_emitidos?.mensal) return Number(ven.pedidos_emitidos.mensal.valor_total) || 0;
  return null;
}

function extrairPedidosPendentes(ven: Vendas | null | undefined): number {
  if (!ven) return 0;
  if (typeof ven.pedidos_pendentes === 'object' && ven.pedidos_pendentes !== null) {
    return Number(ven.pedidos_pendentes.quantidade) || 0;
  }
  return Number(ven.pedidos_pendentes ?? ven.pendentes) || 0;
}

function extrairSaldoEstoque(i: EstoqueCritico): number {
  return Number(i.saldo ?? i.estoque_atual ?? 0);
}

/** Usa a severidade do back; se ausente, deriva da relação saldo x ponto de reposição. */
function severidade(i: EstoqueCritico): 'critico' | 'alerta' {
  const s = String(i.severidade ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (s.includes('critico')) return 'critico';
  if (s.includes('alerta')) return 'alerta';
  const saldo = extrairSaldoEstoque(i);
  return saldo <= Number(i.ponto_reposicao) * 0.5 ? 'critico' : 'alerta';
}

/** Número finito ou null (não inventa valor quando o campo não vem do ERP). */
function numeroOuNull(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

const horaCurta = (ms: number) =>
  new Date(ms).toLocaleTimeString('pt-BR', { timeZone: 'America/Maceio', hour: '2-digit', minute: '2-digit', second: '2-digit' });

function Painel({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white">
      <h2 className="border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-900">{titulo}</h2>
      <div className="p-4">{children}</div>
    </section>
  );
}

const Esqueleto = ({ alt = 'h-8' }: { alt?: string }) => (
  <div className={`${alt} animate-pulse rounded bg-slate-100`} aria-hidden />
);

function Kpi({
  rotulo,
  valor,
  apoio,
  carregando,
  erro
}: {
  rotulo: string;
  valor: string;
  apoio?: string;
  carregando: boolean;
  erro: string | null;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-sm font-medium text-slate-600">{rotulo}</p>
      {carregando ? (
        <div className="mt-2"><Esqueleto alt="h-8" /></div>
      ) : erro ? (
        <p className="mt-2 text-sm text-red-700">Indisponível</p>
      ) : (
        <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">{valor}</p>
      )}
      {apoio && !carregando && !erro && <p className="mt-1 text-xs text-slate-600">{apoio}</p>}
    </div>
  );
}

/** Tela 02 — Dashboard gerencial (visão Gestor / Diretoria). */
export function DashboardGerencial() {
  const hoje = hojeISO();
  const [referencia, setReferencia] = useState<Referencia>('hoje');
  const [dataEscolhida, setDataEscolhida] = useState(hoje);
  const [filial, setFilial] = useState('');

  const dataRef =
    referencia === 'hoje' ? hoje
      : referencia === 'ontem' ? somarDiasISO(hoje, -1)
      : dataEscolhida && dataEscolhida <= hoje ? dataEscolhida : hoje;
  const inicioMes = `${dataRef.slice(0, 8)}01`;

  // Faturamento e pedidos só aceitam ?data= no backend (sem filial): a chave não inclui a filial.
  const fat = useErpResource(`fat|${dataRef}`, () => ErpApi.faturamento({ data_referencia: dataRef }));
  const ven = useErpResource(`ven|${dataRef}`, () => ErpApi.vendas({ data_referencia: dataRef }));
  // Estoque é a posição atual (não usa data); pede o máximo aceito para não esconder itens críticos.
  const est = useErpResource(`est|${filial}|${LIMITE_ESTOQUE}`, () =>
    ErpApi.estoqueCritico({ filial: filial || undefined, limite: LIMITE_ESTOQUE })
  );
  const top = useErpResource(`top|${dataRef}|${filial}`, () =>
    ErpApi.topProdutos({ data_referencia: dataRef, filial: filial || undefined })
  );

  const recursos = [fat, ven, est, top];

  // "Dados atualizados": recarrega sozinho a cada minuto (pausa com a aba em segundo plano).
  // Datas passadas não mudam; o estoque é posição atual e sempre atualiza.
  const atualizarTudo = () => { fat.reload(); ven.reload(); est.reload(); top.reload(); };
  useAutoRefresh(() => {
    est.reload();
    if (dataRef === hoje) { fat.reload(); ven.reload(); top.reload(); }
  }, ATUALIZAR_A_CADA_MS);

  const contingencia = recursos.filter((r) => r.emContingencia);
  const salvoEm = contingencia.length
    ? Math.min(...contingencia.map((r) => r.salvoEm ?? Date.now()))
    : null;
  const atualizadoEm = recursos.some((r) => r.salvoEm !== null && !r.emContingencia)
    ? Math.max(...recursos.filter((r) => !r.emContingencia).map((r) => r.salvoEm ?? 0))
    : null;
  const atualizando = recursos.some((r) => r.carregando && r.dados);

  const estoque = useMemo(
    () => [...(est.dados ?? [])].sort((a, b) => Number(severidade(b) === 'critico') - Number(severidade(a) === 'critico')),
    [est.dados]
  );
  const totalCriticos = estoque.filter((i) => severidade(i) === 'critico').length;

  // Curva ABC: ordena pelo faturamento real do ERP; sem faturamento, ordena por volume e não exibe R$.
  const abc = useMemo(() => {
    const itens = [...(top.dados ?? [])].map((i) => ({
      ...i,
      valor: numeroOuNull(i.total_faturado ?? i.receita),
      qtd: Number(i.quantidade_expedida ?? i.quantidade ?? 0) || 0
    }));
    const porValor = itens.some((i) => i.valor !== null);
    const medida = (i: (typeof itens)[number]) => (porValor ? i.valor ?? 0 : i.qtd);
    itens.sort((a, b) => medida(b) - medida(a));

    const total = itens.reduce((s, i) => s + medida(i), 0) || 1;
    let acc = 0;
    return itens.map((i) => {
      // Mesmo corte do backend: o item que cruza a faixa fecha a classe anterior.
      const pctAntes = (acc / total) * 100;
      acc += medida(i);
      const classe = (i.classe_abc || i.classe || (pctAntes < 80 ? 'A' : pctAntes < 95 ? 'B' : 'C')) as 'A' | 'B' | 'C';
      return { ...i, classe, medida: medida(i) };
    });
  }, [top.dados]);
  const maior = abc[0]?.medida || 1;
  const abcPorVolume = abc.length > 0 && abc.every((i) => i.valor === null);

  const kpiErro = fat.erro ?? ven.erro;
  const selectCls = 'input mt-1 w-auto';

  const faturamentoDiario = extrairFaturamentoDiario(fat.dados);
  const faturamentoMensal = extrairFaturamentoMensal(fat.dados);
  const notasDia = extrairNotasDiario(fat.dados);
  const notasMes = extrairNotasMensal(fat.dados);

  const pedidosEmitidos = extrairPedidosEmitidos(ven.dados);
  const pedidosDia = extrairPedidosEmitidosDia(ven.dados);
  const valorEmitidos = extrairValorPedidosEmitidos(ven.dados);
  const pedidosPendentes = extrairPedidosPendentes(ven.dados);

  const diaTxt = formatarDataISO(dataRef).slice(0, 5);
  const mesTxt = `${formatarDataISO(inicioMes).slice(0, 5)} a ${diaTxt}`;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Visão executiva</h1>
          <p className="text-xs text-slate-500">Inteligência de negócios integrada ao ERP Winthor</p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm font-medium text-slate-700">Data de referência
            <select className={selectCls} value={referencia} onChange={(e) => setReferencia(e.target.value as Referencia)}>
              {REFERENCIAS.map((r) => <option key={r.valor} value={r.valor}>{r.rotulo}</option>)}
            </select>
          </label>
          {referencia === 'data' && (
            <label className="text-sm font-medium text-slate-700">Dia
              <input
                type="date"
                className={selectCls}
                value={dataEscolhida}
                max={hoje}
                onChange={(e) => setDataEscolhida(e.target.value)}
              />
            </label>
          )}
          <label className="text-sm font-medium text-slate-700">Filial
            <select className={selectCls} value={filial} onChange={(e) => setFilial(e.target.value)}>
              {FILIAIS.map((f) => <option key={f.valor} value={f.valor}>{f.rotulo}</option>)}
            </select>
          </label>
        </div>
      </div>

      {/* Dados atualizados: hora da última leitura do ERP + atualização automática */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500" aria-live="polite">
        <span>
          {atualizando
            ? 'Atualizando indicadores…'
            : atualizadoEm
            ? `Atualizado às ${horaCurta(atualizadoEm)} · atualiza sozinho a cada minuto`
            : ''}
        </span>
        <button className="font-semibold text-slate-700 underline disabled:opacity-50" disabled={atualizando} onClick={atualizarTudo}>
          Atualizar agora
        </button>
      </div>

      {/* RN-12: alerta discreto de contingência (HTTP 503 do ERP ou snapshot do backend) */}
      {salvoEm !== null && (
        <div role="status" className="flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <span aria-hidden className="h-2 w-2 rounded-full bg-amber-500" />
          ERP indisponível no momento. Exibindo dados salvos em {formatarDataHora(new Date(salvoEm).toISOString())}.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          rotulo={`Faturamento do dia (${diaTxt})`}
          valor={formatarMoeda(faturamentoDiario)}
          apoio={notasDia !== null ? `${formatarNumero(notasDia)} notas fiscais` : undefined}
          carregando={fat.carregando && !fat.dados}
          erro={fat.erro}
        />
        <Kpi
          rotulo="Faturamento do mês"
          valor={formatarMoeda(faturamentoMensal)}
          apoio={`Acumulado de ${mesTxt}${notasMes !== null ? ` · ${formatarNumero(notasMes)} notas` : ''}`}
          carregando={fat.carregando && !fat.dados}
          erro={fat.erro}
        />
        <Kpi
          rotulo="Pedidos emitidos no mês"
          valor={formatarNumero(pedidosEmitidos)}
          apoio={[
            pedidosDia !== null ? `${formatarNumero(pedidosDia)} no dia` : null,
            valorEmitidos !== null ? `Total: ${formatarMoeda(valorEmitidos)}` : null
          ].filter(Boolean).join(' · ') || undefined}
          carregando={ven.carregando && !ven.dados}
          erro={ven.erro}
        />
        <Kpi
          rotulo="Pedidos pendentes"
          valor={formatarNumero(pedidosPendentes)}
          carregando={ven.carregando && !ven.dados}
          erro={ven.erro}
          apoio={`Posição atual${pedidosEmitidos ? ` · ${Math.round((pedidosPendentes / pedidosEmitidos) * 100)}% dos emitidos no mês` : ''}`}
        />
      </div>
      {filial && (
        <p className="text-xs text-slate-500">
          Faturamento e pedidos mostram o total de todas as filiais: o ERP ainda não separa esses números por filial.
          Estoque crítico e Curva ABC já estão filtrados pela filial escolhida.
        </p>
      )}
      {kpiErro && (
        <div role="alert" className="flex items-center justify-between gap-3 rounded-md border-l-4 border-red-600 bg-red-50 px-3 py-2 text-sm text-red-800">
          <span>{kpiErro}</span>
          <button className="font-semibold underline" onClick={() => { fat.reload(); ven.reload(); }}>Tentar novamente</button>
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-5">
        <div className="xl:col-span-3">
          <Painel titulo="Estoque crítico de suprimentos">
            {est.carregando && !est.dados ? <Esqueleto alt="h-40" />
              : est.erro ? <ErrorState mensagem={est.erro} onRetry={est.reload} />
              : estoque.length === 0 ? <EmptyState titulo="Nenhum produto abaixo do ponto de reposição" />
              : (
                <div className="overflow-x-auto">
                  <p className="mb-2 text-xs text-slate-600">
                    {formatarNumero(estoque.length)} {estoque.length === 1 ? 'produto' : 'produtos'} abaixo do ponto de reposição
                    {totalCriticos ? ` · ${formatarNumero(totalCriticos)} sem estoque` : ''}
                    {estoque.length >= LIMITE_ESTOQUE ? ` · mostrando os ${LIMITE_ESTOQUE} mais urgentes` : ''}
                  </p>
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="th">Produto</th>
                        <th className="th text-right">Estoque</th>
                        <th className="th text-right">Reposição</th>
                        <th className="th">Situação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {estoque.map((i, idx) => {
                        const sev = severidade(i);
                        const cod = i.codigo_produto || i.codigo;
                        return (
                          <tr key={`${cod || i.produto}-${i.filial ?? ''}-${idx}`}>
                            <td className="td font-medium text-slate-900">
                              <div>{i.produto}</div>
                              {(cod || (!filial && i.filial)) && (
                                <div className="text-xs text-slate-400 font-mono">
                                  {cod}{!filial && i.filial ? `${cod ? ' · ' : ''}Filial ${String(i.filial).padStart(2, '0')}` : ''}
                                </div>
                              )}
                            </td>
                            <td className="td text-right tabular-nums">{formatarNumero(extrairSaldoEstoque(i))}</td>
                            <td className="td text-right tabular-nums">{formatarNumero(i.ponto_reposicao)}</td>
                            <td className="td">
                              <Badge tom={sev === 'critico' ? 'vermelho' : 'amarelo'}>
                                {sev === 'critico' ? 'Crítico' : 'Alerta'}
                              </Badge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
          </Painel>
        </div>

        <div className="xl:col-span-2">
          <Painel titulo="Curva ABC — Top produtos">
            {top.carregando && !top.dados ? <Esqueleto alt="h-40" />
              : top.erro ? <ErrorState mensagem={top.erro} onRetry={top.reload} />
              : abc.length === 0 ? <EmptyState titulo="Sem dados de vendas para o período" />
              : (
                <>
                  {abcPorVolume && (
                    <p className="mb-3 text-xs text-slate-500">Ranking por volume expedido: o ERP não informou o faturamento destes itens.</p>
                  )}
                  <ol className="space-y-3">
                    {abc.map((i, idx) => {
                      const largura = Math.max(8, Math.round((i.medida / maior) * 100));
                      const tom = i.classe === 'A' ? 'bg-emerald-600' : i.classe === 'B' ? 'bg-blue-600' : 'bg-slate-400';
                      const badgeTom = i.classe === 'A' ? 'verde' : i.classe === 'B' ? 'azul' : 'cinza';
                      return (
                        <li key={i.codigo_produto || `${i.produto}-${idx}`} className="space-y-1">
                          <div className="flex items-center justify-between text-xs font-medium text-slate-700">
                            <span className="truncate max-w-[200px]" title={i.produto}>{i.produto}</span>
                            <span className="flex items-center gap-1.5 tabular-nums">
                              {i.valor !== null && <span className="text-slate-900 font-semibold">{formatarMoeda(i.valor)}</span>}
                              {i.qtd > 0 && <span className="text-slate-500">({formatarNumero(i.qtd)} un)</span>}
                              <Badge tom={badgeTom}>{i.classe}</Badge>
                            </span>
                          </div>
                          <div className="h-2 overflow-hidden rounded bg-slate-100" aria-hidden>
                            <div className={`h-full ${tom}`} style={{ width: `${largura}%` }} />
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                </>
              )}
          </Painel>
        </div>
      </div>
    </div>
  );
}
