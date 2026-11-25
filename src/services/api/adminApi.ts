import { ApiClient } from './apiClient';
import type {
  Maquina, MetaProducao, Perfil, RegistroAuditoria, Turno, Usuario, UsuarioLogado
} from '../../types/api';

export const AuthApi = {
  login: (email: string, senha: string) =>
    ApiClient.post<{ token: string; usuario: UsuarioLogado }>('/auth/login', { email, senha }),
  me: () => ApiClient.get<{ usuario: UsuarioLogado }>('/auth/me')
};

export const PerfisApi = {
  listar: () => ApiClient.get<Perfil[]>('/perfis')
};

export interface UsuarioPayload { nome: string; email: string; perfil_id: string; senha?: string }

export const UsuariosApi = {
  listar: () => ApiClient.get<Usuario[]>('/usuarios'),
  criar: (p: Required<UsuarioPayload>) => ApiClient.post<Usuario>('/usuarios', p),
  editar: (id: string, p: Omit<UsuarioPayload, 'senha'>) => ApiClient.put<Usuario>(`/usuarios/${id}`, p),
  alterarStatus: (id: string, esta_ativo: boolean) =>
    ApiClient.patch<Usuario>(`/usuarios/${id}/status`, { esta_ativo })
};

export interface MaquinaCriarPayload {
  codigo: string; nome: string; setor: string; situacao: string;
  capacidade_nominal_hora?: number; modelo?: string; fabricante?: string; descricao?: string; observacoes?: string;
}
export interface MaquinaEditarPayload { nome: string; setor: string; capacidade_nominal_hora: number }

export const MaquinasApi = {
  listar: () => ApiClient.get<Maquina[]>('/maquinas'),
  criar: (p: MaquinaCriarPayload) => ApiClient.post<Maquina>('/maquinas', p),
  editar: (id: string, p: MaquinaEditarPayload) => ApiClient.put<Maquina>(`/maquinas/${id}`, p),
  /** Exclusão lógica: o back apenas marca a situação como "Inativa" (RN-03). */
  desativar: (id: string) => ApiClient.delete<Maquina>(`/maquinas/${id}`)
};

export const TurnosApi = {
  listar: () => ApiClient.get<Turno[]>('/turnos'),
  criar: (p: { nome: string; hora_inicio: string; hora_fim: string }) => ApiClient.post<Turno>('/turnos', p)
};

export interface MetaCriarPayload {
  maquina_id: string; turno_id: string; data_referencia: string;
  quantidade_planejada: number; tempo_planejado_segundos: number;
}

export const MetasApi = {
  listar: (f: { maquina_id?: string; turno_id?: string; data_inicio?: string; data_fim?: string } = {}) =>
    ApiClient.get<MetaProducao[]>(`/metas-producao${qs(f)}`),
  criar: (p: MetaCriarPayload) => ApiClient.post<MetaProducao>('/metas-producao', p),
  editar: (id: string, p: { quantidade_planejada?: number; tempo_planejado_segundos?: number }) =>
    ApiClient.put<MetaProducao>(`/metas-producao/${id}`, p)
};

export interface AuditoriaFiltros {
  usuario_id?: string; nome_entidade?: string; acao?: string; data_inicio?: string; data_fim?: string;
  pagina: number; limite: number;
}

export const AuditoriaApi = {
  listar: (f: AuditoriaFiltros) => ApiClient.get<RegistroAuditoria[]>(`/auditoria${qs(f)}`)
};

/** Monta a query string ignorando valores vazios. */
function qs(obj: object): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(obj)) if (v !== undefined && v !== "") p.set(k, String(v));
  const s = p.toString();
  return s ? `?${s}` : '';
}
