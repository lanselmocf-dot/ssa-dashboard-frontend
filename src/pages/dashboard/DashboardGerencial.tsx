import { useMemo, useState, type ReactNode } from 'react';
import { useErpResource } from '../../hooks/useErpResource';
import { ErpApi, type ErpFiltros } from '../../services/api/erpApi';
import { Badge, EmptyState, ErrorState } from '../../components/ui/Feedback';
import { formatarDataHora, formatarMoeda, formatarNumero, hojeISO, somarDiasISO } from '../../utils/format';
import type { EstoqueCritico } from '../../types/api';

const PERIODOS = [
  { valor: 'hoje', rotulo: 'Hoje' },
  { valor: '7d', rotulo: 'Últimos 7 dias' },
  { valor: '30d', rotulo: 'Últimos 30 dias' },
  { valor: 'mes', rotulo: 'Mês atual' }
] as const;
type Periodo = (typeof PERIODOS)[number]['valor'];

// Substitua pela listagem real de filiais quando o endpoint existir.
const FILIAIS = [{ valor: '', rotulo: 'Todas as filiais' }];

function intervalo(p: Periodo): { data_inicio: string; data_fim: string } {
  const hoje = hojeISO();
  const inicio = p === 'hoje' ? hoje : p === '7d' ? somarDiasISO(hoje, -6) : p === '30d' ? somarDiasISO(hoje, -29) : `${hoje.slice(0, 8)}01`;
  return { data_inicio: inicio, data_fim: hoje };
}

/** Usa a severidade do back; se ausente, deriva do ponto de reposição. */
function severidade(i: EstoqueCritico): 'critico' | 'alerta' {
  const s = String(i.severidade ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (s === 'critico' || s === 'alerta') return s;
  return Number(i.estoque_atual) <= Number(i.ponto_reposicao) * 0.5 ? 'critico' : 'alerta';
}

function Painel({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white">
      <h2 className="border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-900">{titulo}</h2>
      <div className="p-4">{children}</div>
    </section>
  );
}

const Esqueleto = ({ alt = 'h-8' }: { alt?: string }) => <div className={`${alt} animate-pulse rounded bg-slate-100`} aria-hidden />;

function Kpi({ rotulo, valor, apoio, carregando, erro }: { rotulo: string; valor: string; apoio?: string; carregando: boolean; erro: string | null }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-sm font-medium text-slate-600">{rotulo}</p>
      {carregando ? <div className="mt-2"><Esqueleto alt="h-8" /></div>
        : erro ? <p className="mt-2 text-sm text-red-700">Indisponível</p>
        : <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">{valor}</p>}
      {apoio && !carregando && !erro && <p className="mt-1 text-xs text-slate-600">{apoio}</p>}
    </div>
  );
}

/** Tela 02 — Dashboard gerencial (visão Gestor / Diretoria). */
export function DashboardGerencial() {
  const [periodo, setPeriodo] = useState<Periodo>('mes');
  const [filial, setFilial] = useState('');

  const filtros = useMemo<ErpFiltros>(() => ({ ...intervalo(periodo), filial_id: filial || undefined }), [periodo, filial]);
  const chave = `${filtros.data_inicio}|${filtros.data_fim}|${filtros.filial_id ?? ''}`;

  const fat = useErpResource(`fat|${chave}`, () => ErpApi.faturamento(filtros));
  const ven = useErpResource(`ven|${chave}`, () => ErpApi.vendas(filtros));
  const est = useErpResource(`est|${chave}`, () => ErpApi.estoqueCritico(filtros));
  const top = useErpResource(`top|${chave}`, () => ErpApi.topProdutos(filtros));

  const contingencia = [fat, ven, est, top].filter((r) => r.emContingencia);
  const salvoEm = contingencia.length ? Math.min(...contingencia.map((r) => r.salvoEm ?? Date.now())) : null;

  const estoque = useMemo(
    () => [...(est.dados ?? [])].sort((a, b) => Number(severidade(b) === 'critico') - Number(severidade(a) === 'critico')),
    [est.dados]
  );

  // Curva ABC: classe pela participação acumulada (A ≤ 80%, B ≤ 95%, C restante).
  const abc = useMemo(() => {
    const valor = (i: { receita?: number; quantidade: number }) => Number(i.receita ?? i.quantidade);
    const itens = [...(top.dados ?? [])].sort((a, b) => valor(b) - valor(a));
    const total = itens.reduce((s, i) => s + valor(i), 0) || 1;
    let acc = 0;
    return itens.map((i) => {
      acc += valor(i);
      const pct = (acc / total) * 100;
      return { ...i, valor: valor(i), classe: i.classe ?? (pct <= 80 ? 'A' : pct <= 95 ? 'B' : 'C') };
    });
  }, [top.dados]);
  const maior = abc[0]?.valor || 1;

  const kpiErro = fat.erro ?? ven.erro;
  const selectCls = 'input mt-1 w-auto';

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-xl font-semibold text-slate-900">Visão executiva</h1>
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
        <Kpi rotulo="Faturamento do dia" valor={formatarMoeda(fat.dados?.diario)} carregando={fat.carregando && !fat.dados} erro={fat.erro} />
        <Kpi rotulo="Faturamento do mês" valor={formatarMoeda(fat.dados?.mensal)} carregando={fat.carregando && !fat.dados} erro={fat.erro} />
        <Kpi rotulo="Pedidos emitidos" valor={formatarNumero(ven.dados?.emitidos)} carregando={ven.carregando && !ven.dados} erro={ven.erro} />
        <Kpi
          rotulo="Pedidos pendentes" valor={formatarNumero(ven.dados?.pendentes)} carregando={ven.carregando && !ven.dados} erro={ven.erro}
          apoio={ven.dados?.emitidos ? `${Math.round((Number(ven.dados.pendentes) / Number(ven.dados.emitidos)) * 100)}% dos emitidos` : undefined}
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
                      {estoque.map((i) => (
                        <tr key={i.codigo ?? i.produto}>
                          <td className="td font-medium text-slate-900">{i.produto}</td>
                          <td className="td text-right tabular-nums">{formatarNumero(i.estoque_atual)}</td>
                          <td className="td text-right tabular-nums">{formatarNumero(i.ponto_reposicao)}</td>
                          <td className="td">
                            {severidade(i) === 'critico' ? <Badge tom="vermelho">Crítico</Badge> : <Badge tom="amarelo">Alerta</Badge>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
          </Painel>
        </div>

        <div className="xl:col-span-2">
          <Painel titulo="Curva ABC — produtos de maior giro">
            {top.carregando && !top.dados ? <Esqueleto alt="h-40" />
              : top.erro ? <ErrorState mensagem={top.erro} onRetry={top.reload} />
              : abc.length === 0 ? <EmptyState titulo="Sem vendas no período selecionado" />
              : (
                <ol className="space-y-3">
                  {abc.map((i, idx) => (
                    <li key={i.produto}>
                      <div className="flex items-baseline justify-between gap-2 text-sm">
                        <span className="font-medium text-slate-900">{idx + 1}. {i.produto}</span>
                        <span className="flex items-center gap-2">
                          <span className="tabular-nums text-slate-700">
                            {i.receita != null ? formatarMoeda(i.valor) : `${formatarNumero(i.valor)} un.`}
                          </span>
                          <Badge tom={i.classe === 'A' ? 'azul' : 'cinza'}>Classe {i.classe}</Badge>
                        </span>
                      </div>
                      <div className="mt-1 h-2 rounded bg-slate-100">
                        <div className="h-2 rounded bg-brand-700" style={{ width: `${(i.valor / maior) * 100}%` }} />
                      </div>
                    </li>
                  ))}
                </ol>
              )}
          </Painel>
        </div>
      </div>
    </div>
  );
}
