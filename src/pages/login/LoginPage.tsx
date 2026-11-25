import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui/Button';
import { Field } from '../../components/ui/Field';

/** Login mínimo para destravar a Tela 05. A Tela 01 oficial pode substituir este arquivo. */
export function LoginPage() {
  const { usuario, login } = useAuth();
  const nav = useNavigate();
  const local = useLocation();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  if (usuario) return <Navigate to={(local.state as any)?.de ?? '/'} replace />;

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setErro('');
    if (!/^\S+@\S+\.\S+$/.test(email)) return setErro('Informe um e-mail válido.');
    if (senha.length < 6) return setErro('A senha deve ter no mínimo 6 caracteres.');
    setEnviando(true);
    const r = await login(email.trim(), senha);
    setEnviando(false);
    if (r.ok) nav((local.state as any)?.de ?? '/', { replace: true });
    else setErro(r.mensagem);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <form onSubmit={enviar} noValidate className="w-full max-w-sm space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">SSA Distribuidora</h1>
          <p className="text-sm text-slate-500">Entre com suas credenciais corporativas</p>
        </div>
        <Field label="E-mail" htmlFor="email">
          <input id="email" type="email" autoComplete="username" className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Senha" htmlFor="senha">
          <input id="senha" type="password" autoComplete="current-password" className="input" value={senha} onChange={(e) => setSenha(e.target.value)} />
        </Field>
        {erro && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}
        <Button type="submit" loading={enviando} className="w-full">Entrar</Button>
      </form>
    </main>
  );
}
