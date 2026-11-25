import type { ApiResponse } from '../services/api/apiClient';

/** Mensagem legível para toast, incluindo os problemas de validação campo a campo. */
export function mensagemErro(res: ApiResponse<any>): string {
  const err = res.error;
  if (!err) return 'Erro inesperado. Tente novamente.';
  if (err.code === 'VALIDATION_ERROR' && Array.isArray(err.details) && err.details.length) {
    return err.details.map((d: any) => (d.campo ? `${d.campo}: ${d.problema}` : d.problema)).join(' · ');
  }
  return err.message || 'Erro inesperado. Tente novamente.';
}

/** Erros de validação do back mapeados por nome de campo (para exibir junto ao input). */
export function errosPorCampo(res: ApiResponse<any>): Record<string, string> {
  const out: Record<string, string> = {};
  const det = res.error?.details;
  if (res.error?.code === 'VALIDATION_ERROR' && Array.isArray(det)) {
    for (const d of det) if (d?.campo && !out[d.campo]) out[d.campo] = d.problema;
  }
  return out;
}
