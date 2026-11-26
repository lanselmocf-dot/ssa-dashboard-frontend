import { ApiClient } from './apiClient';
import type { EstoqueCritico, Faturamento, TopProduto, Vendas } from '../../types/api';

export interface ErpFiltros {
  data_inicio?: string;
  data_fim?: string;
  data_referencia?: string;
  filial_id?: string;
  filial?: string;
  categoria?: string;
  limite?: number;
}

function qs(obj: object): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== '') {
      p.set(k, String(v));
    }
  }
  const s = p.toString();
  return s ? `?${s}` : '';
}

export const ErpApi = {
  /**
   * GET /api/erp/faturamento?data=YYYY-MM-DD
   * Total faturado no dia e acumulado do mês.
   */
  faturamento: (f: ErpFiltros) => {
    const data = f.data_referencia || f.data_fim || undefined;
    return ApiClient.get<Faturamento>(`/erp/faturamento${qs({ data })}`);
  },

  /**
   * GET /api/erp/vendas?data=YYYY-MM-DD
   * Pedidos emitidos (dia/mês) e pedidos pendentes.
   */
  vendas: (f: ErpFiltros) => {
    const data = f.data_referencia || f.data_fim || undefined;
    return ApiClient.get<Vendas>(`/erp/vendas${qs({ data })}`);
  },

  /**
   * GET /api/erp/estoque-critico?filial=...&categoria=...&limite=...
   * Validação Zod estrita (.strict()): não enviar datas.
   */
  estoqueCritico: (f: ErpFiltros) => {
    const filial = f.filial || f.filial_id || undefined;
    const query = {
      filial,
      categoria: f.categoria || undefined,
      limite: f.limite ? String(f.limite) : undefined
    };
    return ApiClient.get<EstoqueCritico[]>(`/erp/estoque-critico${qs(query)}`);
  },

  /**
   * GET /api/erp/top-produtos?data=YYYY-MM-DD&filial=...&categoria=...&limite=...
   * Validação Zod estrita (.strict()): ranking de produtos (Curva ABC).
   */
  topProdutos: (f: ErpFiltros) => {
    const filial = f.filial || f.filial_id || undefined;
    const query = {
      data: f.data_referencia || f.data_fim || undefined,
      filial,
      categoria: f.categoria || undefined,
      limite: f.limite ? String(f.limite) : undefined
    };
    return ApiClient.get<TopProduto[]>(`/erp/top-produtos${qs(query)}`);
  }
};
