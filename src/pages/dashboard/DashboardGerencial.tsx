import { useMemo, useState, type ReactNode } from 'react';
import { useErpResource } from '../../hooks/useErpResource';
import { ErpApi, type ErpFiltros } from '../../services/api/erpApi';
import { Badge, EmptyState, ErrorState } from '../../components/ui/Feedback';
import { formatarDataHora, formatarMoeda, formatarNumero, hojeISO, somarDiasISO } from '../../utils/format';
import type { EstoqueCritico, Faturamento, Vendas } from '../../types/api';

const PERIODOS = [
  { valor: 'hoje', rotulo: 'Hoje' },
  { valor: '7d', rotulo: 'Últimos 7 dias' },
  { valor: '30d', rotulo: 'Últimos 30 dias' },
  { valor: 'mes', rotulo: 'Mês atual' }
] as const;
type Periodo = (typeof PERIODOS)[number]['valor'];

const FILIAIS = [
  { valor: '', rotulo: 'Todas as filiais' },
  { valor: '1', rotulo: 'Filial 01 — Matriz' },
  { valor: '2', rotulo: 'Filial 02 — Distribuição' }
];

function intervalo(p: Periodo): { data_inicio: string; data_fim: string } {
  const hoje = hojeISO();
  const inicio =
    p === 'hoje'
      ? hoje
      : p === '7d'
      ? somarDiasISO(hoje, -6)
      : p === '30d'
      ? somarDiasISO(hoje, -29)
      : `${hoje.slice(0, 8)}01`;
  return { data_inicio: inicio, data_fim: hoje };
}

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
  const [periodo, setPeriodo] = useState<Periodo>('mes');
  const [filial, setFilial] = useState('');

  const filtros = useMemo<ErpFiltros>(
    () => ({ ...intervalo(periodo), filial: filial || undefined, data_referencia: intervalo(periodo).data_fim }),
    [periodo, filial]
  );
  const chave = `${filtros.data_inicio}|${filtros.data_fim}|${filtros.filial ?? ''}`;

  const fat = useErpResource(`fat|${chave}`, () => ErpApi.faturamento(filtros));
  const ven = useErpResource(`ven|${chave}`, () => ErpApi.vendas(filtros));
  const est = useErpResource(`est|${chave}`, () => ErpApi.estoqueCritico(filtros));
  const top = useErpResource(`top|${chave}`, () => ErpApi.topProdutos(filtros));

  const contingencia = [fat, ven, est, top].filter((r) => r.emContingencia);
  const salvoEm = contingencia.length
    ? Math.min(...contingencia.map((r) => r.salvoEm ?? Date.now()))
    : null;

  const estoque = useMemo(
    () => [...(est.dados ?? [])].sort((a, b) => Number(severidade(b) === 'critico') - Number(severidade(a) === 'critico')),
    [est.dados]
  );

  // Curva ABC: itens mais vendidos ordenados por faturamento ou volume
  const abc = useMemo(() => {
    const itens = [...(top.dados ?? [])].map((i) => {
      const valor = Number(i.total_faturado ?? i.receita ?? (Number(i.quantidade_expedida ?? i.quantidade ?? 0) * 100));
      const qtd = Number(i.quantidade_expedida ?? i.quantidade ?? 0);
      return { ...i, valor, qtd };
    }).sort((a, b) => b.valor - a.valor);

    const total = itens.reduce((s, i) => s + i.valor, 0) || 1;
    let acc = 0;
    return itens.map((i) => {
      acc += i.valor;
      const pct = (acc / total) * 100;
      const classe = (i.classe_abc || i.classe || (pct <= 80 ? 'A' : pct <= 95 ? 'B' : 'C')) as 'A' | 'B' | 'C';
      return { ...i, classe };
    });
  }, [top.dados]);
  const maior = abc[0]?.valor || 1;

  const kpiErro = fat.erro ?? ven.erro;
  const selectCls = 'input mt-1 w-auto';

  const faturamentoDiario = extrairFaturamentoDiario(fat.dados);
  const faturamentoMensal = extrairFaturamentoMensal(fat.dados);
  const notasDia = extrairNotasDiario(fat.dados);
  const notasMes = extrairNotasMensal(fat.dados);

  const pedidosEmitidos = extrairPedidosEmitidos(ven.dados);
  const valorEmitidos = extrairValorPedidosEmitidos(ven.dados);
  const pedidosPendentes = extrairPedidosPendentes(ven.dados);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Visão executiva</h1>
          <p className="text-xs text-slate-500">Inteligência de negócios integrada ao ERP Winthor</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <label className="text-sm font-medium text-slate-700">Período
            <select className={selectCls} value={periodo} onChange={(e) => setPeriodo(e.target.value as Periodo)}>
              {PERIODOS.map((p) => <option key={p.valor} value={p.valor}>{p.rotulo}</option>)}
            </select>
          </label>
          <label className="text-sm font-medium text-slate-700">Filial
            <select className={selectCls} value={filial} onChange={(e) => setFilial(e.target.value)}>
              {FILIAIS.map((f) => <option key={f.valor} value={f.valor}>{f.rotulo}</option>)}
            </select>
          </label>
        </div>
      </div>

      {/* RN-12: alerta discreto de contingência (HTTP 503 do ERP) */}
      {salvoEm !== null && (
        <div role="status" className="flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <span aria-hidden className="h-2 w-2 rounded-full bg-amber-500" />
          ERP indisponível no momento. Exibindo dados salvos em {formatarDataHora(new Date(salvoEm).toISOString())}.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          rotulo="Faturamento do dia"
          valor={formatarMoeda(faturamentoDiario)}
          apoio={notasDia !== null ? `${formatarNumero(notasDia)} notas fiscais` : undefined}
          carregando={fat.carregando && !fat.dados}
          erro={fat.erro}
        />
        <Kpi
          rotulo="Faturamento do mês"
          valor={formatarMoeda(faturamentoMensal)}
          apoio={notasMes !== null ? `${formatarNumero(notasMes)} notas fiscais` : undefined}
          carregando={fat.carregando && !fat.dados}
          erro={fat.erro}
        />
        <Kpi
          rotulo="Pedidos emitidos"
          valor={formatarNumero(pedidosEmitidos)}
          apoio={valorEmitidos !== null ? `Total: ${formatarMoeda(valorEmitidos)}` : undefined}
          carregando={ven.carregando && !ven.dados}
          erro={ven.erro}
        />
        <Kpi
          rotulo="Pedidos pendentes"
          valor={formatarNumero(pedidosPendentes)}
          carregando={ven.carregando && !ven.dados}
          erro={ven.erro}
          apoio={pedidosEmitidos ? `${Math.round((pedidosPendentes / pedidosEmitidos) * 100)}% dos emitidos` : undefined}
        />
      </div>
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
                          <tr key={cod || `${i.produto}-${idx}`}>
                            <td className="td font-medium text-slate-900">
                              <div>{i.produto}</div>
                              {cod && <div className="text-xs text-slate-400 font-mono">{cod}</div>}
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
                <ol className="space-y-3">
                  {abc.map((i, idx) => {
                    const largura = Math.max(8, Math.round((i.valor / maior) * 100));
                    const tom = i.classe === 'A' ? 'bg-emerald-600' : i.classe === 'B' ? 'bg-blue-600' : 'bg-slate-400';
                    const badgeTom = i.classe === 'A' ? 'verde' : i.classe === 'B' ? 'azul' : 'cinza';
                    return (
                      <li key={i.codigo_produto || `${i.produto}-${idx}`} className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-medium text-slate-700">
                          <span className="truncate max-w-[200px]" title={i.produto}>{i.produto}</span>
                          <span className="flex items-center gap-1.5 tabular-nums">
                            {i.valor > 0 && <span className="text-slate-900 font-semibold">{formatarMoeda(i.valor)}</span>}
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
              )}
          </Painel>
        </div>
      </div>
    </div>
  );
}
