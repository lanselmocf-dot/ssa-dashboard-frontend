import { hojeISO } from './format';
import type { Periodo } from '../types/monitoramento';

/** Número finito ou 0 (defensivo contra null, undefined, NaN e Infinity vindos da API). */
export function numeroSeguro(valor: unknown): number {
  const n = Number(valor ?? 0);
  return Number.isFinite(n) ? n : 0;
}

/** 87.5 -> "87.50%"; null/NaN/divisão por zero -> "0.00%". */
export function formatarPercentual(valor: unknown): string {
  return `${numeroSeguro(valor).toFixed(2)}%`;
}

/** Largura de barra limitada a 0–100%. */
export function larguraPercentual(valor: unknown): string {
  return `${Math.min(100, Math.max(0, numeroSeguro(valor)))}%`;
}

export type FaixaDesempenho = 'bom' | 'atencao' | 'critico' | 'neutro';

/** Faixas de leitura do OEE e seus componentes (referência industrial: 85% classe mundial). */
export function faixaDesempenho(valor: unknown, semDados = false): FaixaDesempenho {
  if (semDados) return 'neutro';
  const v = numeroSeguro(valor);
  if (v >= 85) return 'bom';
  if (v >= 60) return 'atencao';
  return 'critico';
}

export const ESTILO_FAIXA: Record<FaixaDesempenho, { barra: string; texto: string; rotulo: string }> = {
  bom: { barra: 'bg-emerald-500', texto: 'text-emerald-700', rotulo: 'Dentro da meta' },
  atencao: { barra: 'bg-amber-500', texto: 'text-amber-700', rotulo: 'Atenção' },
  critico: { barra: 'bg-red-500', texto: 'text-red-700', rotulo: 'Crítico' },
  neutro: { barra: 'bg-slate-300', texto: 'text-slate-500', rotulo: 'Sem dados' }
};

export type OpcaoPeriodo = 'hoje' | '7d' | '30d';

export const OPCOES_PERIODO: { valor: OpcaoPeriodo; rotulo: string }[] = [
  { valor: 'hoje', rotulo: 'Hoje' },
  { valor: '7d', rotulo: 'Últimos 7 dias' },
  { valor: '30d', rotulo: 'Últimos 30 dias' }
];

/** Datas YYYY-MM-DD no fuso da fábrica; `hoje` é injetável para testes. */
export function montarPeriodo(opcao: OpcaoPeriodo, hoje: string = hojeISO()): Periodo {
  const dias = opcao === '7d' ? 6 : opcao === '30d' ? 29 : 0;
  const d = new Date(`${hoje}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - dias);
  return { data_inicio: d.toISOString().slice(0, 10), data_fim: hoje };
}

/* ───────────── Situação operacional das máquinas ───────────── */

export type ChaveSituacao = 'operando' | 'parada' | 'manutencao' | 'inativa';

/** Normaliza variações ("Em manutenção", "Em Manutencao", "PARADA"…) para uma chave estável. */
export function chaveSituacao(situacao: string | null | undefined): ChaveSituacao {
  const s = String(situacao ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
  if (s === 'operando') return 'operando';
  if (s === 'parada') return 'parada';
  if (s.includes('manut')) return 'manutencao';
  return 'inativa';
}

export const ESTILO_SITUACAO: Record<ChaveSituacao, {
  rotulo: string; ponto: string; borda: string; fundo: string; texto: string; tomBadge: 'verde' | 'vermelho' | 'amarelo' | 'cinza';
}> = {
  operando: { rotulo: 'Operando', ponto: 'bg-emerald-500', borda: 'border-l-emerald-500', fundo: 'bg-emerald-50', texto: 'text-emerald-700', tomBadge: 'verde' },
  parada: { rotulo: 'Parada', ponto: 'bg-red-500', borda: 'border-l-red-500', fundo: 'bg-red-50', texto: 'text-red-700', tomBadge: 'vermelho' },
  manutencao: { rotulo: 'Em manutenção', ponto: 'bg-amber-400', borda: 'border-l-amber-400', fundo: 'bg-amber-50', texto: 'text-amber-800', tomBadge: 'amarelo' },
  inativa: { rotulo: 'Inativa', ponto: 'bg-slate-400', borda: 'border-l-slate-300', fundo: 'bg-slate-100', texto: 'text-slate-600', tomBadge: 'cinza' }
};

/** Ordem de exibição: o que exige ação do supervisor aparece primeiro. */
export const ORDEM_SITUACAO: ChaveSituacao[] = ['parada', 'manutencao', 'operando', 'inativa'];
