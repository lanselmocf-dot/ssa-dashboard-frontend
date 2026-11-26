import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { RequireRole } from './RequireRole';
import { rotaInicial } from './rbac';
import { AppShell } from '../components/layout/AppShell';
import { LoginPage } from '../pages/login/LoginPage';
import { PlaceholderPage } from '../pages/PlaceholderPage';
import { DashboardGerencial } from '../pages/dashboard/DashboardGerencial';
import { AdminLayout } from '../pages/admin/AdminLayout';
import { UsuariosTab } from '../pages/admin/UsuariosTab';
import { MaquinasTab } from '../pages/admin/MaquinasTab';
import { TurnosMetasTab } from '../pages/admin/TurnosMetasTab';
import { AuditoriaTab } from '../pages/admin/AuditoriaTab';
import { Spinner } from '../components/ui/Feedback';

/** "/" envia o usuário autenticado para a tela do seu perfil. */
function Home() {
  const { usuario, carregando } = useAuth();
  if (carregando) return <Spinner label="Verificando sessão…" />;
  if (!usuario) return <Navigate to="/login" replace />;
  return <Navigate to={rotaInicial(usuario.perfil) ?? '/login'} replace />;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route path="/gestor" element={<RequireRole roles={['GESTOR']}><AppShell /></RequireRole>}>
        <Route index element={<DashboardGerencial />} />
      </Route>
      <Route path="/supervisor" element={<RequireRole roles={['SUPERVISOR']}><AppShell /></RequireRole>}>
        <Route index element={<PlaceholderPage tela="03" titulo="Supervisão" />} />
      </Route>
      <Route path="/operador" element={<RequireRole roles={['OPERADOR']}><AppShell /></RequireRole>}>
        <Route index element={<PlaceholderPage tela="04" titulo="Operação" />} />
      </Route>

      <Route path="/admin" element={<RequireRole roles={['ADMIN']}><AdminLayout /></RequireRole>}>
        <Route index element={<Navigate to="usuarios" replace />} />
        <Route path="usuarios" element={<UsuariosTab />} />
        <Route path="maquinas" element={<MaquinasTab />} />
        <Route path="turnos-metas" element={<TurnosMetasTab />} />
        <Route path="auditoria" element={<AuditoriaTab />} />
      </Route>

      <Route path="/" element={<Home />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
