import { useEffect, useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { rotaInicial } from '../../routes/rbac';
import { Button } from '../../components/ui/Button';
import { Field } from '../../components/ui/Field';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

type Campo = 'email' | 'senha';
const validar = (email: string, senha: string): Record<Campo, string> => ({
  email: !email ? 'Informe o e-mail.' : !EMAIL_RE.test(email) ? 'Digite um e-mail válido, como nome@empresa.com.br.' : '',
  senha: !senha ? 'Informe a senha.' : senha.length < 6 ? 'A senha deve ter no mínimo 6 caracteres.' : ''
});

type Aviso = { tipo: 'credenciais' | 'bloqueio' | 'falha'; texto: string };

/** Tela 01 — Autenticação. */
export function LoginPage() {
  const { usuario, login } = useAuth();
  const nav = useNavigate();
  const local = useLocation();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [tocados, setTocados] = useState<Partial<Record<Campo, boolean>>>({});
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const [bloqueioSeg, setBloqueioSeg] = useState(0);

  const bloqueado = bloqueioSeg > 0;
  const erros = validar(email, senha);

  // Contagem regressiva do bloqueio por tentativas excessivas (HTTP 429).
  useEffect(() => {
    if (!bloqueado) return;
    const t = setTimeout(() => setBloqueioSeg((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [bloqueado, bloqueioSeg]);

  const de = (local.state as { de?: string } | null)?.de;
  if (usuario) return <Navigate to={de ?? rotaInicial(usuario.perfil) ?? '/'} replace />;

  const tempo = `${String(Math.floor(bloqueioSeg / 60)).padStart(2, '0')}:${String(bloqueioSeg % 60).padStart(2, '0')}`;
  const classe = (c: Campo) => `input ${tocados[c] && erros[c] ? 'input-error' : tocados[c] ? 'border-emerald-600' : ''}`;

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setTocados({ email: true, senha: true });
    if (erros.email || erros.senha || bloqueado) return;

    setEnviando(true);
    setAviso(null);
    const r = await login(email.trim(), senha);
    setEnviando(false);

    if (r.ok) { nav(de ?? rotaInicial(r.usuario.perfil) ?? '/', { replace: true }); return; }
    if (r.status === 401) {
      setAviso({ tipo: 'credenciais', texto: 'E-mail ou senha incorretos. Confira os dados e tente novamente.' });
    } else if (r.status === 429) {
      setBloqueioSeg(r.retryAfter ?? 60);
      setAviso({ tipo: 'bloqueio', texto: 'Muitas tentativas de acesso. Por segurança, o login foi bloqueado temporariamente.' });
    } else {
      setAviso({ tipo: 'falha', texto: r.mensagem });
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-sm overflow-hidden rounded-xl border border-slate-200 bg-white shadow-md">
        <header className="flex flex-col items-center border-b border-slate-100 bg-white px-6 pt-7 pb-5 text-center">
          <img src="/logo-ssa.jpg" alt="SSA Distribuidora" className="h-16 w-auto object-contain" />
          <h1 className="mt-3 text-base font-bold text-slate-800">Portal de Gestão</h1>
          <p className="mt-0.5 text-xs text-slate-500">Entre com suas credenciais corporativas</p>
        </header>

        <form onSubmit={enviar} noValidate className="space-y-4 p-6">
          {aviso && (
            <div
              role="alert"
              className={`rounded-md border-l-4 px-3 py-2 text-sm font-medium ${
                aviso.tipo === 'bloqueio' ? 'border-amber-600 bg-amber-50 text-amber-900' : 'border-red-600 bg-red-50 text-red-800'}`}
            >
              {aviso.texto}
              {aviso.tipo === 'bloqueio' && bloqueado && <p className="mt-1 font-bold">Tente novamente em {tempo}.</p>}
            </div>
          )}

          <Field label="E-mail" htmlFor="email" erro={tocados.email ? erros.email : ''}>
            <input
              id="email" type="email" autoComplete="username" autoFocus className={classe('email')}
              aria-invalid={!!(tocados.email && erros.email)} aria-describedby={tocados.email && erros.email ? 'email-erro' : undefined}
              value={email} disabled={enviando}
              onChange={(e) => { setEmail(e.target.value); setAviso(null); }}
              onBlur={() => setTocados((t) => ({ ...t, email: true }))}
            />
          </Field>
          <Field label="Senha" htmlFor="senha" erro={tocados.senha ? erros.senha : ''}>
            <input
              id="senha" type="password" autoComplete="current-password" className={classe('senha')}
              aria-invalid={!!(tocados.senha && erros.senha)} aria-describedby={tocados.senha && erros.senha ? 'senha-erro' : undefined}
              value={senha} disabled={enviando}
              onChange={(e) => { setSenha(e.target.value); setAviso(null); }}
              onBlur={() => setTocados((t) => ({ ...t, senha: true }))}
            />
          </Field>

          <Button type="submit" loading={enviando} disabled={bloqueado} className="w-full">
            {bloqueado ? `Bloqueado (${tempo})` : enviando ? 'Entrando…' : 'Entrar'}
          </Button>
        </form>
      </div>
    </main>
  );
}
