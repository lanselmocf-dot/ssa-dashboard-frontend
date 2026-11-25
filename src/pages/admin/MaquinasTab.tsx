import { useMemo, useState, type FormEvent } from 'react';
import { useFetch } from '../../hooks/useFetch';
import { useClientPage } from '../../hooks/useClientPage';
import { MaquinasApi } from '../../services/api/adminApi';
import { SITUACOES_MAQUINA, type Maquina } from '../../types/api';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Field } from '../../components/ui/Field';
import { Badge, EmptyState, ErrorState, Spinner } from '../../components/ui/Feedback';
import { Pagination } from '../../components/ui/Pagination';
import { useToast } from '../../components/ui/Toast';
import { errosPorCampo, mensagemErro } from '../../utils/errors';

const tomSituacao = (s: string) =>
  s === 'Operando' ? 'verde' : s === 'Parada' ? 'vermelho' : s.toLowerCase().includes('manuten') ? 'amarelo' : 'cinza';

export function MaquinasTab() {
  const toast = useToast();
  const maquinas = useFetch(() => MaquinasApi.listar(), []);
  const [busca, setBusca] = useState('');
  const [setor, setSetor] = useState('');
  const [situacao, setSituacao] = useState('');
  const [modal, setModal] = useState<{ modo: 'criar' } | { modo: 'editar'; maquina: Maquina } | null>(null);
  const [alvoExclusao, setAlvoExclusao] = useState<Maquina | null>(null);
  const [excluindo, setExcluindo] = useState(false);

  const setores = useMemo(() => [...new Set((maquinas.data ?? []).map((m) => m.setor))].sort(), [maquinas.data]);
  const lista = useMemo(() => {
    const t = busca.trim().toLowerCase();
    return (maquinas.data ?? []).filter((m) =>
      (!t || m.codigo.toLowerCase().includes(t) || m.nome.toLowerCase().includes(t)) &&
      (!setor || m.setor === setor) && (!situacao || m.situacao === situacao));
  }, [maquinas.data, busca, setor, situacao]);
  const pg = useClientPage(lista);

  async function confirmarExclusao() {
    if (!alvoExclusao) return;
    setExcluindo(true);
    const res = await MaquinasApi.desativar(alvoExclusao.id);
    setExcluindo(false);
    if (res.success) {
      toast.sucesso(`${alvoExclusao.nome} foi inativada.`);
      maquinas.reload();
    } else toast.erro(mensagemErro(res));
    setAlvoExclusao(null);
  }

  return (
    <section aria-labelledby="t-maq" className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="t-maq" className="text-lg font-semibold text-slate-900">Parque de máquinas</h2>
          <p className="text-sm text-slate-500">Cadastre equipamentos, ajuste a capacidade nominal e inative máquinas desativadas da operação.</p>
        </div>
        <Button onClick={() => setModal({ modo: 'criar' })}>Nova máquina</Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <input aria-label="Buscar por código ou nome" placeholder="Buscar por código ou nome" className="input"
               value={busca} onChange={(e) => { setBusca(e.target.value); pg.voltarInicio(); }} />
        <select aria-label="Filtrar por setor" className="input" value={setor} onChange={(e) => { setSetor(e.target.value); pg.voltarInicio(); }}>
          <option value="">Todos os setores</option>
          {setores.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select aria-label="Filtrar por situação" className="input" value={situacao} onChange={(e) => { setSituacao(e.target.value); pg.voltarInicio(); }}>
          <option value="">Todas as situações</option>
          {SITUACOES_MAQUINA.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        {maquinas.loading && !maquinas.data ? <Spinner /> :
         maquinas.error && !maquinas.data ? <ErrorState mensagem={maquinas.error} onRetry={maquinas.reload} /> :
         lista.length === 0 ? <EmptyState titulo="Nenhuma máquina encontrada" descricao="Ajuste os filtros ou cadastre um novo equipamento." /> : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr><th className="th">Código</th><th className="th">Nome</th><th className="th">Setor</th>
                    <th className="th text-right">Capacidade (un/h)</th><th className="th">Situação</th><th className="th text-right">Ações</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pg.visiveis.map((m) => (
                  <tr key={m.id} className={m.situacao === 'Inativa' ? 'bg-slate-50/60 text-slate-400' : ''}>
                    <td className="td font-mono text-xs">{m.codigo}</td>
                    <td className="td font-medium text-slate-900">{m.nome}</td>
                    <td className="td">{m.setor}</td>
                    <td className="td text-right tabular-nums">{m.capacidade_nominal_hora ?? '—'}</td>
                    <td className="td"><Badge tom={tomSituacao(m.situacao)}>{m.situacao}</Badge></td>
                    <td className="td">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="secondary" onClick={() => setModal({ modo: 'editar', maquina: m })}>Editar</Button>
                        <Button size="sm" variant="danger" disabled={m.situacao === 'Inativa'}
                                title={m.situacao === 'Inativa' ? 'Máquina já inativa' : undefined}
                                onClick={() => setAlvoExclusao(m)}>Excluir</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {lista.length > 0 && <Pagination pagina={pg.pagina} totalPaginas={pg.totalPaginas} total={pg.total} limite={pg.limite}
                                         onPagina={pg.setPagina} onLimite={pg.setLimite} />}
      </div>

      {modal && <MaquinaFormModal maquina={modal.modo === 'editar' ? modal.maquina : undefined}
        onClose={() => setModal(null)} onSalvo={() => { setModal(null); maquinas.reload(); }} />}

      <ConfirmDialog open={!!alvoExclusao} danger loading={excluindo} title="Excluir máquina (exclusão lógica)"
        confirmLabel="Confirmar exclusão" onConfirm={confirmarExclusao} onCancel={() => setAlvoExclusao(null)}>
        <p><strong>{alvoExclusao?.codigo} — {alvoExclusao?.nome}</strong> será marcada como <strong>Inativa</strong> e deixará de aceitar novos apontamentos e metas.</p>
        <p className="mt-2">Nenhum dado é apagado: histórico de produção, paradas e auditoria continuam preservados.</p>
      </ConfirmDialog>
    </section>
  );
}

function MaquinaFormModal({ maquina, onClose, onSalvo }: { maquina?: Maquina; onClose: () => void; onSalvo: () => void }) {
  const toast = useToast();
  const editando = !!maquina;
  const [v, setV] = useState({
    codigo: maquina?.codigo ?? '', nome: maquina?.nome ?? '', setor: maquina?.setor ?? '',
    capacidade: maquina?.capacidade_nominal_hora != null ? String(maquina.capacidade_nominal_hora) : '',
    situacao: 'Operando', modelo: '', fabricante: '', descricao: '', observacoes: ''
  });
  const [erros, setErros] = useState<Record<string, string>>({});
  const [salvando, setSalvando] = useState(false);
  const set = (k: keyof typeof v) => (e: { target: { value: string } }) => setV((s) => ({ ...s, [k]: e.target.value }));
  const cap = v.capacidade.trim() === '' ? undefined : Number(v.capacidade);

  function validar() {
    const e: Record<string, string> = {};
    if (!editando && (v.codigo.trim().length < 2 || v.codigo.trim().length > 20)) e.codigo = 'Código deve ter de 2 a 20 caracteres';
    if (v.nome.trim().length < 3) e.nome = 'Nome deve ter no mínimo 3 caracteres';
    if (v.setor.trim().length < 2) e.setor = 'Setor deve ter no mínimo 2 caracteres';
    if (cap !== undefined && (!Number.isInteger(cap) || cap <= 0)) e.capacidade_nominal_hora = 'Informe um número inteiro maior que zero';
    if (editando && cap === undefined) e.capacidade_nominal_hora = 'Capacidade nominal por hora é obrigatória';
    return e;
  }

  async function enviar(ev: FormEvent) {
    ev.preventDefault();
    const e = validar();
    setErros(e);
    if (Object.keys(e).length) return;
    setSalvando(true);
    const res = editando
      ? await MaquinasApi.editar(maquina!.id, { nome: v.nome.trim(), setor: v.setor.trim(), capacidade_nominal_hora: cap as number })
      : await MaquinasApi.criar({
          codigo: v.codigo.trim(), nome: v.nome.trim(), setor: v.setor.trim(), situacao: v.situacao,
          ...(cap !== undefined && { capacidade_nominal_hora: cap }),
          ...(v.modelo.trim() && { modelo: v.modelo.trim() }),
          ...(v.fabricante.trim() && { fabricante: v.fabricante.trim() }),
          ...(v.descricao.trim() && { descricao: v.descricao.trim() }),
          ...(v.observacoes.trim() && { observacoes: v.observacoes.trim() })
        });
    setSalvando(false);
    if (res.success) {
      toast.sucesso(editando ? 'Máquina atualizada.' : 'Máquina cadastrada.');
      onSalvo();
      return;
    }
    const porCampo = errosPorCampo(res);
    if (Object.keys(porCampo).length) setErros(porCampo);
    else if (res.error?.code === 'RESOURCE_ALREADY_EXISTS') setErros({ codigo: 'Já existe uma máquina com este código' });
    else toast.erro(mensagemErro(res));
  }

  const cls = (k: string) => `input ${erros[k] ? 'input-error' : ''}`;
  return (
    <Modal open size="lg" title={editando ? `Editar ${maquina!.codigo}` : 'Nova máquina'} onClose={salvando ? () => {} : onClose}
      footer={<>
        <Button variant="secondary" onClick={onClose} disabled={salvando}>Cancelar</Button>
        <Button type="submit" form="form-maquina" loading={salvando}>{editando ? 'Salvar alterações' : 'Cadastrar'}</Button>
      </>}>
      <form id="form-maquina" onSubmit={enviar} noValidate className="grid gap-4 sm:grid-cols-2">
        <Field label="Código" htmlFor="m-codigo" erro={erros.codigo} dica={editando ? 'O código não pode ser alterado.' : undefined}>
          <input id="m-codigo" className={cls('codigo')} value={v.codigo} onChange={set('codigo')} disabled={editando} maxLength={20} />
        </Field>
        <Field label="Nome" htmlFor="m-nome" erro={erros.nome}>
          <input id="m-nome" className={cls('nome')} value={v.nome} onChange={set('nome')} maxLength={100} />
        </Field>
        <Field label="Setor" htmlFor="m-setor" erro={erros.setor}>
          <input id="m-setor" className={cls('setor')} value={v.setor} onChange={set('setor')} />
        </Field>
        <Field label="Capacidade nominal (un/h)" htmlFor="m-cap" erro={erros.capacidade_nominal_hora}>
          <input id="m-cap" type="number" min={1} step={1} inputMode="numeric" className={cls('capacidade_nominal_hora')} value={v.capacidade} onChange={set('capacidade')} />
        </Field>
        {!editando && <>
          <Field label="Situação inicial" htmlFor="m-sit" erro={erros.situacao}>
            <select id="m-sit" className={cls('situacao')} value={v.situacao} onChange={set('situacao')}>
              {SITUACOES_MAQUINA.map((s) => <option key={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Modelo (opcional)" htmlFor="m-modelo"><input id="m-modelo" className="input" value={v.modelo} onChange={set('modelo')} /></Field>
          <Field label="Fabricante (opcional)" htmlFor="m-fab"><input id="m-fab" className="input" value={v.fabricante} onChange={set('fabricante')} /></Field>
          <Field label="Descrição (opcional)" htmlFor="m-desc"><input id="m-desc" className="input" value={v.descricao} onChange={set('descricao')} /></Field>
          <div className="sm:col-span-2">
            <Field label="Observações (opcional)" htmlFor="m-obs">
              <textarea id="m-obs" rows={2} className="input" value={v.observacoes} onChange={set('observacoes')} />
            </Field>
          </div>
        </>}
      </form>
    </Modal>
  );
}
