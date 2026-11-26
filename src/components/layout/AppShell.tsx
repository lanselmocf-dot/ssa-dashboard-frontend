import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/Button';
import { ITENS_NAV, normalizarPerfil } from '../../routes/rbac';

function Sidebar({ aoNavegar }: { aoNavegar?: () => void }) {
  const { usuario } = useAuth();
  const perfil = normalizarPerfil(usuario?.perfil);
  const itens = ITENS_NAV.filter((i) => i.roles.includes(perfil));
  return (
    <nav aria-label="Principal" className="flex h-full flex-col bg-brand-900 p-4">
      <div className="mb-6 border-b border-white/20 pb-4">
        <p className="text-lg font-bold text-white">SSA Distribuidora</p>
        <p className="text-xs text-brand-100">Inteligência gerencial e operacional</p>
      </div>
      <ul className="space-y-1">
        {itens.map((i) => (
          <li key={i.to}>
            <NavLink
              to={i.to}
              onClick={aoNavegar}
              className={({ isActive }) =>
                `block rounded-md px-3 py-2.5 text-sm font-medium ${isActive ? 'bg-white text-slate-900' : 'text-brand-100 hover:bg-white/10'}`}
            >
              {i.rotulo}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Layout das telas 02, 03 e 04: sidebar fixa no desktop, gaveta no mobile e navbar institucional. */
export function AppShell() {
  const { usuario, logout } = useAuth();
  const [aberto, setAberto] = useState(false);

  return (
    <div className="min-h-screen lg:pl-64">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:block"><Sidebar /></aside>

      {aberto && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button aria-label="Fechar menu" className="absolute inset-0 bg-black/60" onClick={() => setAberto(false)} />
          <div className="relative h-full w-64">
            <Sidebar aoNavegar={() => setAberto(false)} />
            <button aria-label="Fechar menu" className="absolute right-2 top-3 text-white" onClick={() => setAberto(false)}>
              <X size={20} />
            </button>
          </div>
        </div>
      )}

      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3">
        <button
          aria-label="Abrir menu" aria-expanded={aberto} onClick={() => setAberto(true)}
          className="rounded-md border border-slate-300 p-1.5 text-slate-700 lg:hidden"
        >
          <Menu size={18} />
        </button>
        <p className="hidden text-sm font-semibold text-slate-700 sm:block">SSA Distribuidora · Plataforma de gestão</p>
        <div className="ml-auto flex items-center gap-3">
          <div className="text-right leading-tight">
            <p className="text-sm font-medium text-slate-900">{usuario?.nome}</p>
            <p className="text-xs text-slate-600">{usuario?.perfil}</p>
          </div>
          <Button variant="secondary" size="sm" onClick={logout}>Sair</Button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6"><Outlet /></main>
    </div>
  );
}
