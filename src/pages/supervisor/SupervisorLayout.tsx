import { Outlet } from 'react-router-dom';
import { TopHeader } from '../../components/layout/TopHeader';

/** Moldura da área do supervisor (Tela 03). */
export function SupervisorLayout() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <TopHeader
        titulo="Painel de monitoramento fabril"
        subtitulo="Visão do supervisor · OEE e parque de máquinas · SSA Distribuidora"
      />
      <main className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6"><Outlet /></main>
    </div>
  );
}
