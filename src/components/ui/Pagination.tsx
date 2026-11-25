import { Button } from './Button';

interface Props {
  pagina: number;
  totalPaginas: number;
  total: number;
  limite: number;
  onPagina: (p: number) => void;
  onLimite?: (l: number) => void;
  disabled?: boolean;
}

/** Janela de páginas com reticências: 1 … 4 5 [6] 7 8 … 20 */
function janela(atual: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const set = new Set([1, total, atual - 1, atual, atual + 1].filter((n) => n >= 1 && n <= total));
  const ordenadas = [...set].sort((a, b) => a - b);
  const out: (number | '…')[] = [];
  ordenadas.forEach((n, i) => {
    if (i && n - ordenadas[i - 1] > 1) out.push('…');
    out.push(n);
  });
  return out;
}

export function Pagination({ pagina, totalPaginas, total, limite, onPagina, onLimite, disabled }: Props) {
  const de = total === 0 ? 0 : (pagina - 1) * limite + 1;
  const ate = Math.min(pagina * limite, total);
  return (
    <nav aria-label="Paginação" className="flex flex-col items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 sm:flex-row">
      <p className="text-sm text-slate-600">
        {total === 0 ? 'Nenhum registro' : <>Mostrando <strong>{de}</strong>–<strong>{ate}</strong> de <strong>{total}</strong></>}
      </p>
      <div className="flex items-center gap-3">
        {onLimite && (
          <label className="flex items-center gap-1.5 text-sm text-slate-600">
            Por página
            <select className="input !w-auto !py-1" value={limite} disabled={disabled} onChange={(e) => onLimite(Number(e.target.value))}>
              {[10, 20, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
        )}
        <div className="flex items-center gap-1">
          <Button variant="secondary" size="sm" disabled={disabled || pagina <= 1} onClick={() => onPagina(pagina - 1)} aria-label="Página anterior">‹</Button>
          {janela(pagina, totalPaginas).map((n, i) =>
            n === '…'
              ? <span key={`e${i}`} className="px-1 text-slate-400">…</span>
              : <Button key={n} size="sm" variant={n === pagina ? 'primary' : 'secondary'} disabled={disabled}
                        aria-current={n === pagina ? 'page' : undefined} onClick={() => onPagina(n)}>{n}</Button>
          )}
          <Button variant="secondary" size="sm" disabled={disabled || pagina >= totalPaginas} onClick={() => onPagina(pagina + 1)} aria-label="Próxima página">›</Button>
        </div>
      </div>
    </nav>
  );
}
