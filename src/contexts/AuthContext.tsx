import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AuthApi } from '../services/api/adminApi';
import { normalizarPerfil } from '../routes/rbac';
import type { UsuarioLogado } from '../types/api';

const TOKEN_KEY = '@ssa:token';
const CACHE_PREFIX = '@ssa:cache:';

export type ResultadoLogin =
  | { ok: true; usuario: UsuarioLogado }
  | { ok: false; mensagem: string; status?: number; retryAfter?: number };

interface AuthState {
  usuario: UsuarioLogado | null;
  carregando: boolean;
  login: (email: string, senha: string) => Promise<ResultadoLogin>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);
const comPerfilNormalizado = (u: UsuarioLogado): UsuarioLogado => ({ ...u, perfil: normalizarPerfil(u.perfil) });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<UsuarioLogado | null>(null);
  const [carregando, setCarregando] = useState<boolean>(() => !!localStorage.getItem(TOKEN_KEY));

  const encerrar = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    // Evita que o cache do ERP (RN-12) de um usuário apareça para outro no mesmo navegador.
    Object.keys(localStorage).filter((k) => k.startsWith(CACHE_PREFIX)).forEach((k) => localStorage.removeItem(k));
    setUsuario(null);
  }, []);

  // Restaura a sessão validando o token no back (GET /api/auth/me).
  useEffect(() => {
    if (!localStorage.getItem(TOKEN_KEY)) return;
    let ativo = true;
    AuthApi.me().then((res) => {
      if (!ativo) return;
      if (res.success && res.data?.usuario) setUsuario(comPerfilNormalizado(res.data.usuario));
      else localStorage.removeItem(TOKEN_KEY);
      setCarregando(false);
    });
    return () => { ativo = false; };
  }, []);

  // Logout em outra aba derruba a sessão desta também.
  useEffect(() => {
    const aoMudar = (e: StorageEvent) => { if (e.key === TOKEN_KEY && !e.newValue) setUsuario(null); };
    window.addEventListener('storage', aoMudar);
    return () => window.removeEventListener('storage', aoMudar);
  }, []);

  const login = useCallback<AuthState['login']>(async (email, senha) => {
    const res = await AuthApi.login(email, senha);
    if (!res.success || !res.data) {
      return { ok: false, mensagem: res.error?.message ?? 'Não foi possível entrar.', status: res.status, retryAfter: res.retryAfter };
    }
    localStorage.setItem(TOKEN_KEY, res.data.token);
    // Dados oficiais do usuário vêm de GET /api/auth/me; a resposta do login é o fallback.
    const me = await AuthApi.me();
    const bruto = me.success && me.data?.usuario ? me.data.usuario : res.data.usuario;
    const u = comPerfilNormalizado(bruto);
    setUsuario(u);
    return { ok: true, usuario: u };
  }, []);

  const value = useMemo(() => ({ usuario, carregando, login, logout: encerrar }), [usuario, carregando, login, encerrar]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>');
  return ctx;
}
