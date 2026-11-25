import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AuthApi } from '../services/api/adminApi';
import type { UsuarioLogado } from '../types/api';

const TOKEN_KEY = '@ssa:token';

interface AuthState {
  usuario: UsuarioLogado | null;
  carregando: boolean;
  login: (email: string, senha: string) => Promise<{ ok: true } | { ok: false; mensagem: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<UsuarioLogado | null>(null);
  const [carregando, setCarregando] = useState<boolean>(() => !!localStorage.getItem(TOKEN_KEY));

  // Restaura a sessão validando o token no back (não confia só no que está no localStorage).
  useEffect(() => {
    if (!localStorage.getItem(TOKEN_KEY)) return;
    let ativo = true;
    AuthApi.me().then((res) => {
      if (!ativo) return;
      if (res.success && res.data?.usuario) setUsuario(res.data.usuario);
      else localStorage.removeItem(TOKEN_KEY);
      setCarregando(false);
    });
    return () => { ativo = false; };
  }, []);

  const login = useCallback<AuthState['login']>(async (email, senha) => {
    const res = await AuthApi.login(email, senha);
    if (res.success && res.data) {
      localStorage.setItem(TOKEN_KEY, res.data.token);
      setUsuario(res.data.usuario);
      return { ok: true };
    }
    return { ok: false, mensagem: res.error?.message ?? 'Não foi possível entrar.' };
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setUsuario(null);
  }, []);

  const value = useMemo(() => ({ usuario, carregando, login, logout }), [usuario, carregando, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>');
  return ctx;
}
