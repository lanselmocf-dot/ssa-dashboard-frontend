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

function Home() {
  const { usuario, carregando } = useAuth();
  if (carregando) return null;
  if (!usuario) return <Navigate to="/login" replace />;
  if (String(usuario.perfil).toUpperCase() === 'OPERADOR') {
    return <Navigate to="/operador" replace />;
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
      <Route path="/operador" element={<RequireRole roles={['OPERADOR']}><OperatorTerminal /></RequireRole>} />
      <Route path="/" element={<Home />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
