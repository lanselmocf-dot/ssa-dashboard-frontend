import { NavLink, Outlet } from 'react-router-dom';
import { TopHeader } from '../../components/layout/TopHeader';

const abas = [
  { to: 'usuarios', rotulo: 'Colaboradores e acessos' },
  { to: 'maquinas', rotulo: 'Parque de máquinas' },
  { to: 'turnos-metas', rotulo: 'Turnos e metas' },
  { to: 'auditoria', rotulo: 'Trilha de auditoria' }
];

export function AdminLayout() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <TopHeader
        titulo="Governança administrativa"
        subtitulo="Cadastros, parametrização e auditoria · SSA Distribuidora"
      />
      <div className="border-b border-slate-200 bg-white shadow-sm">
        <nav aria-label="Seções administrativas" className="mx-auto max-w-[1500px] overflow-x-auto px-4 sm:px-6">
          <ul className="flex gap-2 py-2">
            {abas.map((a) => (
              <li key={a.to}>
                <NavLink
                  to={a.to}
                  className={({ isActive }) =>
                    `block rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors ${
                      isActive
                        ? 'bg-brand-900 text-white shadow-sm'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`
                  }
                >
                  {a.rotulo}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <main className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6"><Outlet /></main>
    </div>
  );
}
