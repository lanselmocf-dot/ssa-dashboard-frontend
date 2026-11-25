import type { ReactNode } from 'react';
import { Button } from './Button';

export function Spinner({ label = 'Carregando…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500" role="status">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-brand-600" aria-hidden />
      {label}
    </div>
  );
}

export function EmptyState({ titulo, descricao }: { titulo: string; descricao?: string }) {
  return (
    <div className="py-14 text-center">
      <p className="text-sm font-medium text-slate-700">{titulo}</p>
      {descricao && <p className="mt-1 text-sm text-slate-500">{descricao}</p>}
    </div>
  );
}

export function ErrorState({ mensagem, onRetry }: { mensagem: string; onRetry?: () => void }) {
  return (
    <div className="py-14 text-center" role="alert">
      <p className="text-sm font-medium text-red-700">{mensagem}</p>
      {onRetry && <Button variant="secondary" size="sm" className="mt-3" onClick={onRetry}>Tentar novamente</Button>}
    </div>
  );
}

const tons = {
  verde: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  cinza: 'bg-slate-100 text-slate-600 ring-slate-200',
  vermelho: 'bg-red-50 text-red-700 ring-red-200',
  amarelo: 'bg-amber-50 text-amber-800 ring-amber-200',
  azul: 'bg-brand-50 text-brand-800 ring-brand-200'
};

export function Badge({ tom, children }: { tom: keyof typeof tons; children: ReactNode }) {
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${tons[tom]}`}>{children}</span>;
}
