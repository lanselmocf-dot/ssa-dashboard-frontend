import { Link, useLocation } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { normalizarPerfil } from '../../routes/rbac';

const MODULOS = [
  { to: '/gestor', rotulo: 'Gestão', roles: ['GESTOR', 'ADMIN'] },
  { to: '/supervisor', rotulo: 'Supervisão', roles: ['SUPERVISOR', 'ADMIN', 'GESTOR'] },
  { to: '/operador', rotulo: 'Operação', roles: ['OPERADOR', 'ADMIN'] },
  { to: '/admin', rotulo: 'Admin', roles: ['ADMIN'] }
];

interface TopHeaderProps {
  titulo: string;
  subtitulo?: string;
}

export function TopHeader({ titulo, subtitulo }: TopHeaderProps) {
  const { usuario, logout } = useAuth();
  const location = useLocation();
  const perfil = normalizarPerfil(usuario?.perfil);
  const itens = MODULOS.filter((item) => item.roles.includes(perfil));

  return (
    <header className="border-b border-brand-800 bg-brand-900 text-white shadow-md">
      <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
        {/* Marca Oficial e Título da Tela */}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center rounded-xl bg-white p-2 shadow-sm shrink-0">
            <img src="/logo-ssa.jpg" alt="SSA Distribuidora" className="h-10 w-auto object-contain" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white sm:text-2xl leading-tight">{titulo}</h1>
            {subtitulo && <p className="hidden text-xs text-brand-100 sm:block">{subtitulo}</p>}
          </div>
        </div>

        {/* Módulos / Navegação e Perfil */}
        <div className="flex items-center gap-3">
          {itens.length > 1 && (
            <nav aria-label="Módulos corporativos" className="hidden items-center gap-2 md:flex">
              {itens.map((item) => {
                const ativo = location.pathname.startsWith(item.to);
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                      ativo
                        ? 'bg-white text-brand-900 shadow-sm font-bold'
                        : 'border border-white/20 bg-white/10 text-brand-100 hover:bg-white/20 hover:text-white'
                    }`}
                  >
                    {item.rotulo}
                  </Link>
                );
              })}
            </nav>
          )}

          {/* Nome e perfil do usuário */}
          <div className="hidden text-right sm:block leading-tight">
            <p className="text-sm font-semibold text-white">{usuario?.nome}</p>
            <p className="text-xs uppercase tracking-wide text-brand-200">{usuario?.perfil}</p>
          </div>

          {/* Botão Sair com alta legibilidade */}
          <button
            type="button"
            onClick={logout}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/10 px-3.5 py-2 text-xs font-medium text-white hover:bg-white/20 transition-colors"
            aria-label="Sair da conta"
          >
            <LogOut size={16} aria-hidden />
            <span className="hidden sm:inline">Sair</span>
          </button>
        </div>
      </div>

      {/* Navegação móvel para múltiplos módulos */}
      {itens.length > 1 && (
        <div className="border-t border-brand-800 bg-brand-950 px-4 py-2 md:hidden">
          <nav aria-label="Módulos corporativos móvel" className="flex gap-2 overflow-x-auto">
            {itens.map((item) => {
              const ativo = location.pathname.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`whitespace-nowrap rounded-lg px-3 py-1 text-xs font-semibold transition-colors ${
                    ativo ? 'bg-white text-brand-900' : 'bg-white/10 text-brand-100 hover:bg-white/20'
                  }`}
                >
                  {item.rotulo}
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </header>
  );
}
