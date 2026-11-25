import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui/Button';

const abas = [
  { to: 'usuarios', rotulo: 'Colaboradores e acessos' },
  { to: 'maquinas', rotulo: 'Parque de máquinas' },
  { to: 'turnos-metas', rotulo: 'Turnos e metas' },
  { to: 'auditoria', rotulo: 'Trilha de auditoria' }
];

export function AdminLayout() {
  const { usuario, logout } = useAuth();
  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <div>
            <h1 className="text-base font-semibold text-slate-900">Governança administrativa</h1>
            <p className="text-xs text-slate-500">Cadastros, parametrização e auditoria · SSA Distribuidora</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-slate-800">{usuario?.nome}</p>
              <p className="text-xs text-slate-500">{usuario?.perfil}</p>
            </div>
            <Button variant="secondary" size="sm" onClick={logout}>Sair</Button>
          </div>
        </div>
        <nav aria-label="Seções administrativas" className="mx-auto max-w-7xl overflow-x-auto px-4">
          <ul className="flex gap-1">
            {abas.map((a) => (
              <li key={a.to}>
                <NavLink to={a.to}
                  className={({ isActive }) => `block whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium ${
                    isActive ? 'border-brand-700 text-brand-800' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
                  {a.rotulo}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6"><Outlet /></main>
    </div>
  );
}
