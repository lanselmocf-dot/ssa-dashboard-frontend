const TZ = 'America/Maceio';

export function formatarDataHora(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('pt-BR', { timeZone: TZ, dateStyle: 'short', timeStyle: 'medium' });
}

/** "2026-11-23" -> "23/11/2026" (sem converter fuso). */
export function formatarDataISO(data: string): string {
  const [a, m, d] = (data || '').slice(0, 10).split('-');
  return a && m && d ? `${d}/${m}/${a}` : '—';
}

/** "06:00:00" -> "06:00" */
export function formatarHora(h: string): string {
  return (h || '').slice(0, 5);
}

export function formatarMinutos(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h ${String(m).padStart(2, '0')}min` : `${h}h`;
}

export function formatarSegundos(seg: number): string {
  return formatarMinutos(Math.round(seg / 60));
}

export function hojeISO(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date());
}

export function formatarMoeda(v: number | string | null | undefined): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v) || 0);
}

export function formatarNumero(v: number | string | null | undefined): string {
  return new Intl.NumberFormat('pt-BR').format(Number(v) || 0);
}

/** Soma `n` dias a uma data "AAAA-MM-DD" (sem depender do fuso do navegador). */
export function somarDiasISO(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
