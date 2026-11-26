import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { RequireRole } from './RequireRole';
import { LoginPage } from '../pages/login/LoginPage';
import { AdminLayout } from '../pages/admin/AdminLayout';
import { UsuariosTab } from '../pages/admin/UsuariosTab';
import { MaquinasTab } from '../pages/admin/MaquinasTab';
import { TurnosMetasTab } from '../pages/admin/TurnosMetasTab';
import { AuditoriaTab } from '../pages/admin/AuditoriaTab';
import { OperatorTerminal } from '../pages/operator/OperatorTerminal';
import { SupervisorLayout } from '../pages/supervisor/SupervisorLayout';
import { MonitoramentoFabril } from '../pages/supervisor/MonitoramentoFabril';

function Home() {
  const { usuario, carregando } = useAuth();
  if (carregando) return null;
  if (!usuario) return <Navigate to="/login" replace />;
  if (String(usuario.perfil).toUpperCase() === 'OPERADOR') {
    return <Navigate to="/operador" replace />;
  }
  if (String(usuario.perfil).toUpperCase() === 'SUPERVISOR') {
    return <Navigate to="/supervisor" replace />;
  }
  return <Navigate to="/admin" replace />;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/admin" element={<RequireRole roles={['ADMIN']}><AdminLayout /></RequireRole>}>
        <Route index element={<Navigate to="usuarios" replace />} />
        <Route path="usuarios" element={<UsuariosTab />} />
        <Route path="maquinas" element={<MaquinasTab />} />
        <Route path="turnos-metas" element={<TurnosMetasTab />} />
        <Route path="auditoria" element={<AuditoriaTab />} />
      </Route>
      {/* Tela 03 — Monitoramento fabril (visão supervisor) */}
      <Route path="/supervisor" element={<RequireRole roles={['SUPERVISOR', 'ADMIN']}><SupervisorLayout /></RequireRole>}>
        <Route index element={<MonitoramentoFabril />} />
      </Route>
      <Route path="/operador" element={<RequireRole roles={['OPERADOR', 'ADMIN']}><OperatorTerminal /></RequireRole>} />
      <Route path="/" element={<Home />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
