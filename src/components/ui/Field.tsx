import type { ReactNode } from 'react';

interface Props { label: string; htmlFor: string; erro?: string; dica?: string; children: ReactNode }

export function Field({ label, htmlFor, erro, dica, children }: Props) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
      {children}
      {dica && !erro && <p className="mt-1 text-xs text-slate-500">{dica}</p>}
      {erro && <p id={`${htmlFor}-erro`} role="alert" className="mt-1 text-xs text-red-600">{erro}</p>}
    </div>
  );
}
