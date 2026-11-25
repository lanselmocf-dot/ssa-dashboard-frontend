import { useMemo, useState, type FormEvent } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useFetch } from '../../hooks/useFetch';
import { useClientPage } from '../../hooks/useClientPage';
import { PerfisApi, UsuariosApi } from '../../services/api/adminApi';
import type { Perfil, Usuario } from '../../types/api';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Field } from '../../components/ui/Field';
import { Badge, EmptyState, ErrorState, Spinner } from '../../components/ui/Feedback';
import { Pagination } from '../../components/ui/Pagination';
import { useToast } from '../../components/ui/Toast';
import { errosPorCampo, mensagemErro } from '../../utils/errors';
import { formatarDataHora } from '../../utils/format';

const EMAIL_RE = /^\S+@\S+\.\S+$/;

export function UsuariosTab() {
  const { usuario: logado } = useAuth();
  const toast = useToast();
  const usuarios = useFetch(() => UsuariosApi.listar(), []);
  const perfis = useFetch(() => PerfisApi.listar(), []);

  const [busca, setBusca] = useState('');
  const [filtroPerfil, setFiltroPerfil] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [modal, setModal] = useState<{ modo: 'criar' } | { modo: 'editar'; usuario: Usuario } | null>(null);
  const [alvoStatus, setAlvoStatus] = useState<Usuario | null>(null);
  const [alterando, setAlterando] = useState(false);

  const lista = useMemo(() => {
    const t = busca.trim().toLowerCase();
    return (usuarios.data ?? []).filter((u) =>
      (!t || u.nome.toLowerCase().includes(t) || u.email.toLowerCase().includes(t)) &&
      (!filtroPerfil || u.perfil === filtroPerfil) &&
      (!filtroStatus || (filtroStatus === 'ativo') === u.esta_ativo));
  }, [usuarios.data, busca, filtroPerfil, filtroStatus]);

  const pg = useClientPage(lista);

  async function confirmarStatus() {
    if (!alvoStatus) return;
    setAlterando(true);
    const res = await UsuariosApi.alterarStatus(alvoStatus.id, !alvoStatus.esta_ativo);
    setAlterando(false);
    if (res.success) {
      toast.sucesso(`${alvoStatus.nome} foi ${alvoStatus.esta_ativo ? 'desativado(a)' : 'reativado(a)'}.`);
      setAlvoStatus(null);
      usuarios.reload();
    } else {
      toast.erro(mensagemErro(res));
      setAlvoStatus(null);
    }
  }

  return (
    <section aria-labelledby="t-usuarios" className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="t-usuarios" className="text-lg font-semibold text-slate-900">Colaboradores e acessos</h2>
          <p className="text-sm text-slate-500">Cadastre usuários, defina perfis (RBAC) e controle quem pode acessar o sistema.</p>
        </div>
        <Button onClick={() => setModal({ modo: 'criar' })} disabled={!perfis.data}>Novo usuário</Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <input aria-label="Buscar por nome ou e-mail" placeholder="Buscar por nome ou e-mail" className="input"
               value={busca} onChange={(e) => { setBusca(e.target.value); pg.voltarInicio(); }} />
        <select aria-label="Filtrar por perfil" className="input" value={filtroPerfil}
                onChange={(e) => { setFiltroPerfil(e.target.value); pg.voltarInicio(); }}>
          <option value="">Todos os perfis</option>
          {(perfis.data ?? []).map((p) => <option key={p.id} value={p.nome}>{p.nome}</option>)}
        </select>
        <select aria-label="Filtrar por status" className="input" value={filtroStatus}
                onChange={(e) => { setFiltroStatus(e.target.value); pg.voltarInicio(); }}>
          <option value="">Todos os status</option>
          <option value="ativo">Ativos</option>
          <option value="inativo">Inativos</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        {usuarios.loading && !usuarios.data ? <Spinner /> :
         usuarios.error && !usuarios.data ? <ErrorState mensagem={usuarios.error} onRetry={usuarios.reload} /> :
         lista.length === 0 ? <EmptyState titulo="Nenhum usuário encontrado" descricao="Ajuste os filtros ou cadastre um novo usuário." /> : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr><th className="th">Nome</th><th className="th">E-mail</th><th className="th">Perfil</th>
                    <th className="th">Status</th><th className="th">Criado em</th><th className="th text-right">Ações</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pg.visiveis.map((u) => {
                  const ehEu = u.id === logado?.id;
                  return (
                    <tr key={u.id} className={u.esta_ativo ? '' : 'bg-slate-50/60'}>
                      <td className="td font-medium text-slate-900">{u.nome}{ehEu && <span className="ml-2 text-xs text-slate-400">(você)</span>}</td>
                      <td className="td">{u.email}</td>
                      <td className="td"><Badge tom="azul">{u.perfil}</Badge></td>
                      <td className="td"><Badge tom={u.esta_ativo ? 'verde' : 'cinza'}>{u.esta_ativo ? 'Ativo' : 'Inativo'}</Badge></td>
                      <td className="td whitespace-nowrap">{formatarDataHora(u.criado_em)}</td>
                      <td className="td">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="secondary" onClick={() => setModal({ modo: 'editar', usuario: u })}>Editar</Button>
                          <Button size="sm" variant={u.esta_ativo ? 'danger' : 'secondary'} disabled={ehEu && u.esta_ativo}
                                  title={ehEu && u.esta_ativo ? 'Você não pode desativar a si mesmo' : undefined}
                                  onClick={() => setAlvoStatus(u)}>
                            {u.esta_ativo ? 'Desativar' : 'Reativar'}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {lista.length > 0 && <Pagination pagina={pg.pagina} totalPaginas={pg.totalPaginas} total={pg.total} limite={pg.limite}
                                         onPagina={pg.setPagina} onLimite={pg.setLimite} />}
      </div>

      {modal && perfis.data && (
        <UsuarioFormModal modo={modal.modo} usuario={modal.modo === 'editar' ? modal.usuario : undefined} perfis={perfis.data}
          onClose={() => setModal(null)} onSalvo={() => { setModal(null); usuarios.reload(); }} />
      )}

      <ConfirmDialog open={!!alvoStatus} danger={!!alvoStatus?.esta_ativo} loading={alterando}
        title={alvoStatus?.esta_ativo ? 'Desativar usuário' : 'Reativar usuário'}
        confirmLabel={alvoStatus?.esta_ativo ? 'Desativar' : 'Reativar'}
        onConfirm={confirmarStatus} onCancel={() => setAlvoStatus(null)}>
        {alvoStatus?.esta_ativo
          ? <><strong>{alvoStatus?.nome}</strong> perderá o acesso ao sistema imediatamente. O histórico e a trilha de auditoria são preservados.</>
          : <><strong>{alvoStatus?.nome}</strong> voltará a poder entrar no sistema com o perfil <strong>{alvoStatus?.perfil}</strong>.</>}
      </ConfirmDialog>
    </section>
  );
}

function UsuarioFormModal({ modo, usuario, perfis, onClose, onSalvo }: {
  modo: 'criar' | 'editar'; usuario?: Usuario; perfis: Perfil[]; onClose: () => void; onSalvo: () => void;
}) {
  const toast = useToast();
  const [nome, setNome] = useState(usuario?.nome ?? '');
  const [email, setEmail] = useState(usuario?.email ?? '');
  const [senha, setSenha] = useState('');
  const [perfilId, setPerfilId] = useState(perfis.find((p) => p.nome === usuario?.perfil)?.id ?? '');
  const [erros, setErros] = useState<Record<string, string>>({});
  const [salvando, setSalvando] = useState(false);

  function validar() {
    const e: Record<string, string> = {};
    if (nome.trim().length < 3) e.nome = 'Nome deve ter no mínimo 3 caracteres';
    if (!EMAIL_RE.test(email.trim())) e.email = 'Informe um e-mail válido';
    if (!perfilId) e.perfil_id = 'Selecione um perfil';
    if (modo === 'criar' && senha.length < 8) e.senha = 'A senha deve conter no mínimo 8 caracteres';
    return e;
  }

  async function enviar(ev: FormEvent) {
    ev.preventDefault();
    const e = validar();
    setErros(e);
    if (Object.keys(e).length) return;
    setSalvando(true);
    const base = { nome: nome.trim(), email: email.trim(), perfil_id: perfilId };
    const res = modo === 'criar'
      ? await UsuariosApi.criar({ ...base, senha })
      : await UsuariosApi.editar(usuario!.id, base);
    setSalvando(false);
    if (res.success) {
      toast.sucesso(modo === 'criar' ? 'Usuário cadastrado.' : 'Dados do usuário atualizados.');
      onSalvo();
      return;
    }
    if (res.error?.code === 'EMAIL_ALREADY_EXISTS') setErros({ email: 'Este e-mail já está cadastrado' });
    else if (Object.keys(errosPorCampo(res)).length) setErros(errosPorCampo(res));
    else toast.erro(mensagemErro(res));
  }

  const f = 'form-usuario';
  return (
    <Modal open title={modo === 'criar' ? 'Novo usuário' : 'Editar usuário'} onClose={salvando ? () => {} : onClose}
      footer={<>
        <Button variant="secondary" onClick={onClose} disabled={salvando}>Cancelar</Button>
        <Button type="submit" form={f} loading={salvando}>{modo === 'criar' ? 'Cadastrar' : 'Salvar alterações'}</Button>
      </>}>
      <form id={f} onSubmit={enviar} noValidate className="space-y-4">
        <Field label="Nome completo" htmlFor="u-nome" erro={erros.nome}>
          <input id="u-nome" className={`input ${erros.nome ? 'input-error' : ''}`} value={nome} onChange={(e) => setNome(e.target.value)} />
        </Field>
        <Field label="E-mail" htmlFor="u-email" erro={erros.email}>
          <input id="u-email" type="email" className={`input ${erros.email ? 'input-error' : ''}`} value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Perfil de acesso" htmlFor="u-perfil" erro={erros.perfil_id}
               dica={perfis.find((p) => p.id === perfilId)?.descricao ?? undefined}>
          <select id="u-perfil" className={`input ${erros.perfil_id ? 'input-error' : ''}`} value={perfilId} onChange={(e) => setPerfilId(e.target.value)}>
            <option value="">Selecione…</option>
            {perfis.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </select>
        </Field>
        {modo === 'criar' && (
          <Field label="Senha inicial" htmlFor="u-senha" erro={erros.senha} dica="Mínimo de 8 caracteres.">
            <input id="u-senha" type="password" autoComplete="new-password" className={`input ${erros.senha ? 'input-error' : ''}`}
                   value={senha} onChange={(e) => setSenha(e.target.value)} />
          </Field>
        )}
      </form>
    </Modal>
  );
}
