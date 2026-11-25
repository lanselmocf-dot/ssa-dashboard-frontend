import { useMemo, useState } from 'react';
import { useFetch } from '../../hooks/useFetch';
import { AuditoriaApi, UsuariosApi } from '../../services/api/adminApi';
import type { RegistroAuditoria } from '../../types/api';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Badge, EmptyState, ErrorState, Spinner } from '../../components/ui/Feedback';
import { Pagination } from '../../components/ui/Pagination';
import { formatarDataHora } from '../../utils/format';

/** Valores aceitos pelo filtro `acao` do back (auditoriaSchema). */
const ACOES: { valor: string; rotulo: string }[] = [
  { valor: 'CRIACAO', rotulo: 'Criação' },
  { valor: 'ATUALIZACAO', rotulo: 'Atualização' },
  { valor: 'DESATIVACAO', rotulo: 'Desativação' },
  { valor: 'ALT_STATUS', rotulo: 'Alteração de status' }
];
/** Entidades que hoje gravam trilha de auditoria no back. */
const ENTIDADES = ['usuarios', 'maquinas', 'metas_producao', 'motivos_parada', 'ocorrencias'];

// Defensivo: um registro de auditoria malformado (acao ausente) não pode derrubar a tela de compliance.
const rotuloAcao = (a?: string | null) =>
  !a ? 'Não informada' : ACOES.find((x) => x.valor === a)?.rotulo ?? a.replace(/_/g, ' ').toLowerCase();
const tomAcao = (a?: string | null) =>
  !a ? 'cinza' : a === 'CRIACAO' ? 'verde' : a.startsWith('DESATIV') ? 'vermelho' : a.startsWith('ATUALIZ') || a === 'ALT_STATUS' ? 'azul' : 'cinza';

interface Filtros { data_inicio: string; data_fim: string; usuario_id: string; nome_entidade: string; acao: string }
const VAZIO: Filtros = { data_inicio: '', data_fim: '', usuario_id: '', nome_entidade: '', acao: '' };

export function AuditoriaTab() {
  const [filtros, setFiltros] = useState<Filtros>(VAZIO);
  const [pagina, setPagina] = useState(1);
  const [limite, setLimite] = useState(20);
  const [detalhe, setDetalhe] = useState<RegistroAuditoria | null>(null);
  const autores = useFetch(() => UsuariosApi.listar(), []);

  const periodoInvalido = !!filtros.data_inicio && !!filtros.data_fim && filtros.data_inicio > filtros.data_fim;
  const lista = useFetch(
    () => periodoInvalido
      ? Promise.resolve({ success: true, data: [] as RegistroAuditoria[], pagination: { pagina: 1, limite, total: 0, total_paginas: 1 } })
      : AuditoriaApi.listar({ ...filtros, pagina, limite }),
    [filtros, pagina, limite]
  );

  function alterar<K extends keyof Filtros>(k: K, v: string) {
    setFiltros((f) => ({ ...f, [k]: v }));
    setPagina(1);
  }
  const temFiltro = Object.values(filtros).some(Boolean);
  const pg = lista.pagination;

  return (
    <section aria-labelledby="t-aud" className="space-y-4">
      <div>
        <h2 id="t-aud" className="text-lg font-semibold text-slate-900">Trilha de auditoria</h2>
        <p className="text-sm text-slate-500">Registro imutável de quem alterou o quê e quando. Abra um registro para comparar o estado anterior com o novo.</p>
      </div>

      <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-6">
        <label className="text-xs font-medium text-slate-600">De
          <input type="date" className="input mt-1" value={filtros.data_inicio} onChange={(e) => alterar('data_inicio', e.target.value)} />
        </label>
        <label className="text-xs font-medium text-slate-600">Até
          <input type="date" className="input mt-1" value={filtros.data_fim} onChange={(e) => alterar('data_fim', e.target.value)} />
        </label>
        <label className="text-xs font-medium text-slate-600">Autor
          <select className="input mt-1" value={filtros.usuario_id} onChange={(e) => alterar('usuario_id', e.target.value)}>
            <option value="">Todos</option>
            {(autores.data ?? []).map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
          </select>
        </label>
        <label className="text-xs font-medium text-slate-600">Entidade
          <select className="input mt-1" value={filtros.nome_entidade} onChange={(e) => alterar('nome_entidade', e.target.value)}>
            <option value="">Todas</option>
            {ENTIDADES.map((e) => <option key={e} value={e}>{e}</option>)}
          </select>
        </label>
        <label className="text-xs font-medium text-slate-600">Tipo de ação
          <select className="input mt-1" value={filtros.acao} onChange={(e) => alterar('acao', e.target.value)}>
            <option value="">Todas</option>
            {ACOES.map((a) => <option key={a.valor} value={a.valor}>{a.rotulo}</option>)}
          </select>
        </label>
        <div className="flex items-end">
          <Button variant="secondary" className="w-full" disabled={!temFiltro} onClick={() => { setFiltros(VAZIO); setPagina(1); }}>Limpar filtros</Button>
        </div>
        {periodoInvalido && <p role="alert" className="text-sm text-red-600 sm:col-span-2 lg:col-span-6">A data final não pode ser anterior à data inicial.</p>}
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        {lista.loading && !lista.data ? <Spinner /> :
         lista.error && !lista.data ? <ErrorState mensagem={lista.error} onRetry={lista.reload} /> :
         !lista.data?.length ? <EmptyState titulo="Nenhum registro de auditoria" descricao={temFiltro ? 'Nenhum evento corresponde aos filtros.' : 'Ainda não há eventos registrados.'} /> : (
          <div className={`overflow-x-auto transition-opacity ${lista.loading ? 'opacity-60' : ''}`}>
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr><th className="th">Data/hora</th><th className="th">Autor</th><th className="th">Entidade</th>
                    <th className="th">Ação</th><th className="th">ID do registro</th><th className="th text-right">Detalhes</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lista.data.map((r) => (
                  <tr key={r.id}>
                    <td className="td whitespace-nowrap tabular-nums">{formatarDataHora(r.ocorrido_em)}</td>
                    <td className="td">
                      <div className="font-medium text-slate-900">{r.autor.nome ?? 'Usuário removido'}</div>
                      <div className="text-xs text-slate-500">{r.autor.perfil ?? '—'}{r.autor.email ? ` · ${r.autor.email}` : ''}</div>
                    </td>
                    <td className="td font-mono text-xs">{r.nome_entidade}</td>
                    <td className="td"><Badge tom={tomAcao(r.acao)}>{rotuloAcao(r.acao)}</Badge></td>
                    <td className="td font-mono text-xs text-slate-500" title={r.id_entidade}>{r.id_entidade ? `${String(r.id_entidade).slice(0, 8)}…` : '—'}</td>
                    <td className="td"><div className="flex justify-end"><Button size="sm" variant="secondary" onClick={() => setDetalhe(r)}>Ver alterações</Button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {pg && <Pagination pagina={pg.pagina} totalPaginas={pg.total_paginas} total={pg.total} limite={pg.limite}
                           disabled={lista.loading} onPagina={setPagina} onLimite={(l) => { setLimite(l); setPagina(1); }} />}
      </div>

      {detalhe && <DiffModal registro={detalhe} onClose={() => setDetalhe(null)} />}
    </section>
  );
}

/* ─────────────────── Comparação antes × depois (JSONB) ─────────────────── */

const MISSING = Symbol('ausente');
type Valor = unknown | typeof MISSING;

function texto(v: Valor): string {
  if (v === MISSING) return '—';
  if (v === null) return 'null';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}
const igual = (a: Valor, b: Valor) => a !== MISSING && b !== MISSING && JSON.stringify(a) === JSON.stringify(b);

function DiffModal({ registro, onClose }: { registro: RegistroAuditoria; onClose: () => void }) {
  const [soAlterados, setSoAlterados] = useState(true);
  const [bruto, setBruto] = useState(false);
  const antes = registro.dados_anteriores, depois = registro.dados_novos;

  const linhas = useMemo(() => {
    const chaves = [...new Set([...Object.keys(antes ?? {}), ...Object.keys(depois ?? {})])].sort();
    return chaves.map((campo) => {
      const a: Valor = antes && campo in antes ? antes[campo] : MISSING;
      const d: Valor = depois && campo in depois ? depois[campo] : MISSING;
      return { campo, a, d, mudou: !igual(a, d) };
    });
  }, [antes, depois]);

  const visiveis = soAlterados ? linhas.filter((l) => l.mudou) : linhas;
  const nMudou = linhas.filter((l) => l.mudou).length;

  return (
    <Modal open size="xl" title="Comparação de dados" onClose={onClose} footer={<Button variant="secondary" onClick={onClose}>Fechar</Button>}>
      <dl className="mb-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <div><dt className="text-xs text-slate-500">Quando</dt><dd className="font-medium">{formatarDataHora(registro.ocorrido_em)}</dd></div>
        <div><dt className="text-xs text-slate-500">Autor</dt><dd className="font-medium">{registro.autor.nome ?? '—'} <span className="font-normal text-slate-500">({registro.autor.perfil ?? '—'})</span></dd></div>
        <div><dt className="text-xs text-slate-500">Entidade</dt><dd className="font-mono text-xs">{registro.nome_entidade}</dd></div>
        <div><dt className="text-xs text-slate-500">Ação</dt><dd><Badge tom={tomAcao(registro.acao)}>{rotuloAcao(registro.acao)}</Badge></dd></div>
        <div className="sm:col-span-2 lg:col-span-4"><dt className="text-xs text-slate-500">ID do registro afetado</dt><dd className="font-mono text-xs">{registro.id_entidade}</dd></div>
      </dl>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-600">{nMudou} de {linhas.length} campo(s) alterado(s)</p>
        <div className="flex items-center gap-4 text-sm">
          {!bruto && <label className="flex items-center gap-2"><input type="checkbox" checked={soAlterados} onChange={(e) => setSoAlterados(e.target.checked)} /> Mostrar só alterados</label>}
          <label className="flex items-center gap-2"><input type="checkbox" checked={bruto} onChange={(e) => setBruto(e.target.checked)} /> Ver JSON bruto</label>
        </div>
      </div>

      {bruto ? (
        <div className="grid gap-3 md:grid-cols-2">
          {[['Dados anteriores', antes], ['Dados novos', depois]].map(([t, d]) => (
            <div key={t as string}>
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{t as string}</h3>
              <pre className="max-h-96 overflow-auto rounded-md bg-slate-900 p-3 text-xs text-slate-100">{d ? JSON.stringify(d, null, 2) : 'null'}</pre>
            </div>
          ))}
        </div>
      ) : visiveis.length === 0 ? (
        <EmptyState titulo="Sem dados para comparar" descricao="Este evento não guardou os dados anteriores/novos." />
      ) : (
        <div className="overflow-x-auto rounded-md border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50"><tr><th className="th w-1/4">Campo</th><th className="th">Antes</th><th className="th">Depois</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {visiveis.map((l) => (
                <tr key={l.campo}>
                  <td className="td font-mono text-xs">{l.campo}</td>
                  <td className={`td break-all font-mono text-xs ${l.mudou && l.a !== MISSING ? 'bg-red-50 text-red-800' : 'text-slate-500'}`}>{texto(l.a)}</td>
                  <td className={`td break-all font-mono text-xs ${l.mudou && l.d !== MISSING ? 'bg-emerald-50 text-emerald-800' : 'text-slate-500'}`}>{texto(l.d)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
}
