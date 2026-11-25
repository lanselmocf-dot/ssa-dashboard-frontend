import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Spinner } from '../components/ui/Feedback';

interface Props { roles: string[]; children: ReactNode }

/** Guard de RBAC no cliente. A autorização real continua sendo imposta pelo back (checkRole). */
export function RequireRole({ roles, children }: Props) {
  const { usuario, carregando, logout } = useAuth();
  const local = useLocation();

  if (carregando) return <Spinner label="Verificando sessão…" />;
  if (!usuario) return <Navigate to="/login" replace state={{ de: local.pathname }} />;

  if (!roles.map((r) => r.toUpperCase()).includes(String(usuario.perfil).toUpperCase())) {
    return (
      <main className="mx-auto mt-24 max-w-md rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-lg font-semibold text-slate-900">Acesso restrito</h1>
        <p className="mt-2 text-sm text-slate-600">
          Esta área é exclusiva para administradores. Seu perfil atual é <strong>{usuario.perfil}</strong>.
        </p>
        <button onClick={logout} className="mt-5 text-sm font-medium text-brand-700 underline">Sair e entrar com outra conta</button>
      </main>
    );
  }
  return <>{children}</>;
}
