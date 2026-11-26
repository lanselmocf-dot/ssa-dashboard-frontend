import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { RequireRole } from './RequireRole';
import { rotaInicial } from './rbac';
import { AppShell } from '../components/layout/AppShell';
import { LoginPage } from '../pages/login/LoginPage';
import { DashboardGerencial } from '../pages/dashboard/DashboardGerencial';
import { AdminLayout } from '../pages/admin/AdminLayout';
import { UsuariosTab } from '../pages/admin/UsuariosTab';
import { MaquinasTab } from '../pages/admin/MaquinasTab';
import { TurnosMetasTab } from '../pages/admin/TurnosMetasTab';
import { AuditoriaTab } from '../pages/admin/AuditoriaTab';
import { OperatorTerminal } from '../pages/operator/OperatorTerminal';
import { SupervisorLayout } from '../pages/supervisor/SupervisorLayout';
import { MonitoramentoFabril } from '../pages/supervisor/MonitoramentoFabril';
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

      {/* Tela 02 — Dashboard do Gestor */}
      <Route path="/gestor" element={<RequireRole roles={['GESTOR', 'ADMIN']}><AppShell /></RequireRole>}>
        <Route index element={<DashboardGerencial />} />
      </Route>

      {/* Tela 03 — Monitoramento fabril (visão supervisor e gestor) */}
      <Route path="/supervisor" element={<RequireRole roles={['SUPERVISOR', 'ADMIN', 'GESTOR']}><SupervisorLayout /></RequireRole>}>
        <Route index element={<MonitoramentoFabril />} />
      </Route>

      {/* Tela 04 — Terminal do operador */}
      <Route path="/operador" element={<RequireRole roles={['OPERADOR', 'ADMIN']}><OperatorTerminal /></RequireRole>} />

      {/* Tela 05 — Painel administrativo */}
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
