import { ApiClient } from './apiClient';
import type { EstoqueCritico, Faturamento, TopProduto, Vendas } from '../../types/api';

export interface ErpFiltros { data_inicio: string; data_fim: string; filial_id?: string }

function qs(obj: object): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(obj)) if (v !== undefined && v !== '') p.set(k, String(v));
  const s = p.toString();
  return s ? `?${s}` : '';
}

export const ErpApi = {
  faturamento: (f: ErpFiltros) => ApiClient.get<Faturamento>(`/erp/faturamento${qs(f)}`),
  vendas: (f: ErpFiltros) => ApiClient.get<Vendas>(`/erp/vendas${qs(f)}`),
  estoqueCritico: (f: ErpFiltros) => ApiClient.get<EstoqueCritico[]>(`/erp/estoque-critico${qs(f)}`),
  topProdutos: (f: ErpFiltros) => ApiClient.get<TopProduto[]>(`/erp/top-produtos${qs(f)}`)
};
