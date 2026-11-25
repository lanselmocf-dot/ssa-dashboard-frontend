import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';

type Tipo = 'sucesso' | 'erro';
interface Item { id: number; tipo: Tipo; texto: string }
const ToastCtx = createContext<{ sucesso: (t: string) => void; erro: (t: string) => void } | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [itens, setItens] = useState<Item[]>([]);
  const seq = useRef(0);

  const push = useCallback((tipo: Tipo, texto: string) => {
    const id = ++seq.current;
    setItens((l) => [...l, { id, tipo, texto }]);
    setTimeout(() => setItens((l) => l.filter((i) => i.id !== id)), tipo === 'erro' ? 8000 : 4000);
  }, []);

  const api = useRef({ sucesso: (t: string) => push('sucesso', t), erro: (t: string) => push('erro', t) }).current;

  return (
    <ToastCtx.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2" aria-live="polite">
        {itens.map((i) => (
          <div key={i.id} role={i.tipo === 'erro' ? 'alert' : 'status'}
               className={`pointer-events-auto rounded-md border px-3 py-2.5 text-sm shadow-lg ${
                 i.tipo === 'erro' ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>
            {i.texto}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error('useToast deve ser usado dentro de <ToastProvider>');
  return ctx;
}
