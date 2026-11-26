import { Outlet } from 'react-router-dom';
import { TopHeader } from './TopHeader';

/** Layout unificado da área executiva e de gestão (Tela 02). */
export function AppShell() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <TopHeader
        titulo="Painel de gestão executiva"
        subtitulo="Indicadores de faturamento, vendas e estoque · SSA Distribuidora"
      />
      <main className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6">
        <Outlet />
      </main>
    </div>
  );
}
