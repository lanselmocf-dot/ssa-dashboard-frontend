import { ApiClient } from './apiClient';
import type {
  GargalosResposta, HistoricoMaquina, IndicadoresMaquina, Periodo, ResumoIndicadores
} from '../../types/monitoramento';

/** Endpoints da Tela 03 (Monitoramento Fabril). Somente parâmetros aceitos pelo backend. */
export const MonitoramentoApi = {
  /** Parâmetros aceitos: data_inicio, data_fim e setor (opcional). */
  resumo: (p: Periodo & { setor?: string }) =>
    ApiClient.get<ResumoIndicadores>(`/indicadores/resumo${qs(p)}`),

  /** Parâmetros aceitos: data_inicio e data_fim. */
  gargalos: (p: Periodo) => ApiClient.get<GargalosResposta>(`/indicadores/gargalos${qs(p)}`),

  historico: (maquinaId: string) =>
    ApiClient.get<HistoricoMaquina>(`/maquinas/${encodeURIComponent(maquinaId)}/historico`),

  /**
   * O back compara `ocorrido_em <= data_fim`; enviamos o fim do dia para incluir
   * a produção e as paradas do último dia do período.
   */
  indicadoresMaquina: (maquinaId: string, p: Periodo) =>
    ApiClient.get<IndicadoresMaquina>(
      `/maquinas/${encodeURIComponent(maquinaId)}/indicadores${qs({ data_inicio: p.data_inicio, data_fim: `${p.data_fim}T23:59:59` })}`
    )
};

/** Monta a query string ignorando valores vazios. */
function qs(obj: object): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(obj)) if (v !== undefined && v !== null && v !== '') p.set(k, String(v));
  const s = p.toString();
  return s ? `?${s}` : '';
}
