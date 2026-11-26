/** Contratos de dados consumidos pela Tela 05 (espelham as respostas do backend). */

export type NomePerfil = 'ADMIN' | 'GESTOR' | 'SUPERVISOR' | 'OPERADOR';

export interface UsuarioLogado {
  id: string;
  nome: string;
  email: string;
  perfil: NomePerfil | string;
  status?: string;
}

export interface Perfil {
  id: string;
  nome: string;
  descricao?: string | null;
}

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  esta_ativo: boolean;
  criado_em: string;
  /** Nome do perfil (a listagem não devolve o perfil_id). */
  perfil: string;
}

export const SITUACOES_MAQUINA = ['Operando', 'Parada', 'Em manutenção', 'Inativa'] as const;
export type SituacaoMaquina = (typeof SITUACOES_MAQUINA)[number];

export interface Maquina {
  id: string;
  codigo: string;
  nome: string;
  descricao?: string | null;
  setor: string;
  modelo?: string | null;
  fabricante?: string | null;
  capacidade_nominal_hora: number | null;
  situacao: string;
  observacoes?: string | null;
}

export interface Turno {
  id: string;
  nome: string;
  hora_inicio: string;
  hora_fim: string;
  duracao_minutos: number;
}

export interface MetaProducao {
  id: string;
  maquina_id: string;
  turno_id: string;
  data_referencia: string;
  quantidade_planejada: number;
  tempo_planejado_segundos: number;
  maquina_codigo: string;
  maquina_nome: string;
  turno_nome: string;
}

export interface RegistroAuditoria {
  id: string;
  nome_entidade: string;
  id_entidade: string;
  acao: string;
  dados_anteriores: Record<string, unknown> | null;
  dados_novos: Record<string, unknown> | null;
  ocorrido_em: string;
  autor: { id: string | null; nome: string | null; email: string | null; perfil: string | null };
}

export interface Paginacao {
  pagina: number;
  limite: number;
  total: number;
  total_paginas: number;
}

/* ──────────────────── Tipos do Terminal do Operador (Tela 04) ──────────────────── */

export type SeveridadeOcorrencia = 'Baixa' | 'Media' | 'Alta' | 'Critica';

export interface MotivoParada {
  id: string;
  descricao: string;
  categoria: string;
}

export interface TipoOcorrencia {
  id: string;
  nome: string;
  descricao?: string | null;
}

export interface ParadaMaquina {
  id: string;
  maquina_id: string;
  motivo_parada_id: string;
  iniciado_em: string;
  encerrado_em?: string | null;
  duracao_segundos?: number | null;
  observacao?: string | null;
  observacoes?: string | null;
  maquina_nome?: string;
  motivo_nome?: string;
  operador_nome?: string | null;
  maquina_situacao?: string;
  existe_outra_parada_aberta?: boolean;
}

export interface RegistroProducaoPayload {
  maquina_id: string;
  turno_id: string;
  referencia_produto: string;
  quantidade_produzida: number;
  quantidade_rejeitada: number;
  observacoes?: string;
}

export interface AbrirParadaPayload {
  maquina_id: string;
  motivo_parada_id: string;
  observacao?: string;
}

export interface CriarOcorrenciaPayload {
  maquina_id: string;
  tipo_ocorrencia_id: string;
  descricao: string;
  severidade: SeveridadeOcorrencia;
  observacao?: string;
}
