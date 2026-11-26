import { Link, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui/Button';

/** Moldura da área do supervisor (Tela 03), no mesmo padrão visual do AdminLayout. */
export function SupervisorLayout() {
  const { usuario, logout } = useAuth();
  const perfil = String(usuario?.perfil).toUpperCase();

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <div>
            <h1 className="text-base font-semibold text-slate-900">Painel de monitoramento fabril</h1>
            <p className="text-xs text-slate-500">Visão do supervisor · OEE e parque de máquinas · SSA Distribuidora</p>
          </div>
          <div className="flex items-center gap-4">
            <nav className="hidden items-center gap-3 sm:flex">
              {['ADMIN', 'GESTOR'].includes(perfil) && (
                <Link to="/gestor" className="text-xs font-medium text-slate-600 hover:text-brand-700 hover:underline">
                  Visão executiva
                </Link>
              )}
              {perfil === 'ADMIN' && (
                <>
                  <span className="text-slate-300">·</span>
                  <Link to="/admin" className="text-xs font-medium text-brand-700 hover:underline">
                    Painel Admin
                  </Link>
                  <span className="text-slate-300">·</span>
                  <Link to="/operador" className="text-xs font-medium text-slate-600 hover:text-brand-700 hover:underline">
                    Terminal Operador
                  </Link>
                </>
              )}
            </nav>
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-slate-800">{usuario?.nome}</p>
              <p className="text-xs text-slate-500">{usuario?.perfil}</p>
            </div>
            <Button variant="secondary" size="sm" onClick={logout}>Sair</Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6"><Outlet /></main>
    </div>
  );
}
