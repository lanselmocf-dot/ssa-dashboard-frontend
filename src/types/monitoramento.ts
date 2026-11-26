/** Contratos consumidos pela Tela 03 — Monitoramento Fabril (espelham as respostas do backend). */

export interface IndicadoresOEE {
  disponibilidade: number;
  performance: number;
  qualidade: number;
  oee: number;
}

/** GET /api/indicadores/resumo */
export interface ResumoIndicadores {
  periodo: { data_inicio: string; data_fim: string };
  setor: string | null;
  possui_metas: boolean;
  maquinas_consideradas: number;
  planejado: { quantidade: number; tempo_segundos: number };
  realizado: {
    producao_total: number;
    producao_aprovada: number;
    producao_rejeitada: number;
    tempo_paradas_segundos: number;
  };
  indicadores: IndicadoresOEE;
  indicadores_formatados?: Record<keyof IndicadoresOEE, string>;
}

/** Item dos rankings de GET /api/indicadores/gargalos */
export interface MaquinaGargalo {
  maquina_id: string;
  codigo: string;
  nome: string;
  setor: string;
  downtime_segundos: number;
  total_produzido: number;
  total_refugado: number;
  percentual_refugo: number;
}

export interface GargalosResposta {
  periodo: { data_inicio: string; data_fim: string };
  top_downtime: MaquinaGargalo[];
  top_refugo: MaquinaGargalo[];
}

/** Item de GET /api/maquinas/:id/historico (transições reconstruídas da auditoria). */
export interface TransicaoSituacao {
  id: string;
  usuario_id: string | null;
  usuario_nome: string | null;
  acao: string;
  situacao_anterior: string | null;
  situacao_nova: string | null;
  justificativa_tecnica: string | null;
  ocorrido_em: string;
}

export interface HistoricoMaquina {
  maquina?: { id: string; codigo: string; nome: string; situacao: string };
  historico: TransicaoSituacao[];
}

/** GET /api/maquinas/:id/indicadores */
export interface IndicadoresMaquina {
  maquina_id: string;
  periodo: { data_inicio: string; data_fim: string };
  planejado: { quantidade: number; tempo_segundos: number };
  realizado: {
    producao_total: number;
    producao_aprovada: number;
    producao_rejeitada: number;
    tempo_paradas_segundos: number;
  };
  indicadores: IndicadoresOEE;
}

export interface Periodo {
  data_inicio: string;
  data_fim: string;
}
