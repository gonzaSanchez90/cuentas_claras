import React, { useState, useEffect } from 'react';
import { LogIn, UserPlus, Mail, Lock, User, Loader2, ArrowRight, KeyRound, CheckCircle2 } from 'lucide-react';

interface Props {
  onAuth: (token: string, user: any) => void;
  initialName?: string;
}

type View = 'login' | 'register' | 'forgot' | 'reset';

const inputStyle = {
  backgroundColor: 'rgba(15, 23, 42, 0.6)',
  border: '1px solid rgba(148, 163, 184, 0.1)',
};

const AuthScreen: React.FC<Props> = ({ onAuth, initialName }) => {
  const [view, setView] = useState<View>(initialName ? 'register' : 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState(initialName || '');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resetToken, setResetToken] = useState('');

  const API_URL = import.meta.env.DEV ? 'http://localhost:3001' : '';

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('reset_token');
    if (token) {
      setResetToken(token);
      setView('reset');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const switchView = (v: View) => { setView(v); setError(''); setSuccessMsg(''); };

  const handleLoginRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const isLogin = view === 'login';
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const body = isLogin ? { email, password } : { email, password, name };
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Error en la autenticación');
      localStorage.setItem('auth_token', data.token);
      onAuth(data.token, data.user);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Error al enviar el email');
      setSuccessMsg(data.message);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: resetToken, newPassword }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Error al cambiar la contraseña');
      setSuccessMsg('¡Contraseña cambiada! Ya podés ingresar.');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const isLogin = view === 'login';

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)' }}>

      {/* Animated background circles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo / Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
            style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', boxShadow: '0 8px 32px rgba(59, 130, 246, 0.3)' }}>
            <span className="text-2xl font-black text-white">CC</span>
          </div>
          <h1 className="text-3xl font-black text-white mb-1">Cuentas Claras</h1>
          <p className="text-gray-400 text-sm">Controla tus gastos de forma eficiente</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl p-6 border"
          style={{ background: 'rgba(30, 41, 59, 0.8)', borderColor: 'rgba(148, 163, 184, 0.1)', backdropFilter: 'blur(20px)', boxShadow: '0 25px 50px rgba(0, 0, 0, 0.3)' }}>

          {/* ── FORGOT PASSWORD ── */}
          {view === 'forgot' && (
            <>
              <div className="flex items-center gap-3 mb-6">
                <button type="button" onClick={() => switchView('login')} className="text-gray-400 hover:text-white transition-colors text-sm">← Volver</button>
                <h2 className="text-white font-bold text-lg">Recuperar contraseña</h2>
              </div>
              {successMsg ? (
                <div className="text-center py-4">
                  <CheckCircle2 size={48} className="text-emerald-400 mx-auto mb-3" />
                  <p className="text-emerald-300 font-medium">{successMsg}</p>
                  <p className="text-gray-400 text-sm mt-2">Revisá tu bandeja de entrada (y el spam).</p>
                  <button type="button" onClick={() => switchView('login')} className="mt-4 text-blue-400 hover:text-blue-300 text-sm underline">Ir al login</button>
                </div>
              ) : (
                <form onSubmit={handleForgot} className="space-y-4">
                  <p className="text-gray-400 text-sm">Ingresá tu email y te mandamos un link para cambiar tu contraseña.</p>
                  <div className="relative">
                    <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                      placeholder="tu@email.com" required
                      className="w-full pl-10 pr-4 py-3 rounded-xl text-white placeholder-gray-500 text-sm outline-none"
                      style={inputStyle}
                      onFocus={e => e.target.style.borderColor = 'rgba(99, 102, 241, 0.5)'}
                      onBlur={e => e.target.style.borderColor = 'rgba(148, 163, 184, 0.1)'} />
                  </div>
                  {error && <div className="p-3 rounded-xl text-sm text-red-300 border border-red-500/20" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}>{error}</div>}
                  <button type="submit" disabled={isLoading}
                    className="w-full py-3.5 rounded-xl font-bold text-white text-sm flex items-center justify-center gap-2 transition-all duration-300 active:scale-[0.98] disabled:opacity-60"
                    style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)', boxShadow: '0 8px 25px rgba(59, 130, 246, 0.25)' }}>
                    {isLoading ? <Loader2 className="animate-spin" size={20} /> : <><KeyRound size={18} /> Enviar link</>}
                  </button>
                </form>
              )}
            </>
          )}

          {/* ── RESET PASSWORD ── */}
          {view === 'reset' && (
            <>
              <div className="mb-6">
                <h2 className="text-white font-bold text-lg">Nueva contraseña</h2>
                <p className="text-gray-400 text-sm mt-1">Elegí una contraseña nueva para tu cuenta.</p>
              </div>
              {successMsg ? (
                <div className="text-center py-4">
                  <CheckCircle2 size={48} className="text-emerald-400 mx-auto mb-3" />
                  <p className="text-emerald-300 font-medium">{successMsg}</p>
                  <button type="button" onClick={() => switchView('login')} className="mt-4 text-blue-400 hover:text-blue-300 text-sm underline">Ir al login</button>
                </div>
              ) : (
                <form onSubmit={handleReset} className="space-y-4">
                  <div className="relative">
                    <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                      placeholder="Nueva contraseña (mín. 6 caracteres)" required minLength={6}
                      className="w-full pl-10 pr-4 py-3 rounded-xl text-white placeholder-gray-500 text-sm outline-none"
                      style={inputStyle}
                      onFocus={e => e.target.style.borderColor = 'rgba(99, 102, 241, 0.5)'}
                      onBlur={e => e.target.style.borderColor = 'rgba(148, 163, 184, 0.1)'} />
                  </div>
                  <div className="relative">
                    <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="Repetir contraseña" required minLength={6}
                      className="w-full pl-10 pr-4 py-3 rounded-xl text-white placeholder-gray-500 text-sm outline-none"
                      style={inputStyle}
                      onFocus={e => e.target.style.borderColor = 'rgba(99, 102, 241, 0.5)'}
                      onBlur={e => e.target.style.borderColor = 'rgba(148, 163, 184, 0.1)'} />
                  </div>
                  {error && <div className="p-3 rounded-xl text-sm text-red-300 border border-red-500/20" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}>{error}</div>}
                  <button type="submit" disabled={isLoading}
                    className="w-full py-3.5 rounded-xl font-bold text-white text-sm flex items-center justify-center gap-2 transition-all duration-300 active:scale-[0.98] disabled:opacity-60"
                    style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)', boxShadow: '0 8px 25px rgba(59, 130, 246, 0.25)' }}>
                    {isLoading ? <Loader2 className="animate-spin" size={20} /> : <><CheckCircle2 size={18} /> Cambiar contraseña</>}
                  </button>
                </form>
              )}
            </>
          )}

          {/* ── LOGIN / REGISTER ── */}
          {(view === 'login' || view === 'register') && (
            <>
              {/* Tab Toggle */}
              <div className="flex mb-6 p-1 rounded-xl" style={{ backgroundColor: 'rgba(15, 23, 42, 0.5)' }}>
                <button type="button" onClick={() => switchView('login')}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${isLogin ? 'text-white shadow-lg' : 'text-gray-400 hover:text-gray-300'}`}
                  style={isLogin ? { background: 'linear-gradient(135deg, #3b82f6, #6366f1)', boxShadow: '0 4px 15px rgba(59, 130, 246, 0.3)' } : {}}>
                  <LogIn size={16} /> Ingresar
                </button>
                <button type="button" onClick={() => switchView('register')}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${!isLogin ? 'text-white shadow-lg' : 'text-gray-400 hover:text-gray-300'}`}
                  style={!isLogin ? { background: 'linear-gradient(135deg, #8b5cf6, #a855f7)', boxShadow: '0 4px 15px rgba(139, 92, 246, 0.3)' } : {}}>
                  <UserPlus size={16} /> Registrarse
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleLoginRegister} className="space-y-4">
                {!isLogin && (
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">Tu nombre</label>
                    <div className="relative">
                      <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                      <input type="text" value={name} onChange={e => !initialName && setName(e.target.value)}
                        placeholder="Ej: Gonzalo" required={!isLogin} disabled={!!initialName} readOnly={!!initialName}
                        className={`w-full pl-10 pr-4 py-3 rounded-xl text-white placeholder-gray-500 text-sm outline-none transition-all duration-200 ${initialName ? 'opacity-70 cursor-not-allowed' : ''}`}
                        style={{ ...inputStyle, backgroundColor: initialName ? 'rgba(15, 23, 42, 0.9)' : 'rgba(15, 23, 42, 0.6)' }}
                        onFocus={e => !initialName && (e.target.style.borderColor = 'rgba(99, 102, 241, 0.5)')}
                        onBlur={e => !initialName && (e.target.style.borderColor = 'rgba(148, 163, 184, 0.1)')} />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">Email</label>
                  <div className="relative">
                    <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                      placeholder="tu@email.com" required
                      className="w-full pl-10 pr-4 py-3 rounded-xl text-white placeholder-gray-500 text-sm outline-none transition-all duration-200"
                      style={inputStyle}
                      onFocus={e => e.target.style.borderColor = 'rgba(99, 102, 241, 0.5)'}
                      onBlur={e => e.target.style.borderColor = 'rgba(148, 163, 184, 0.1)'} />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">Contraseña</label>
                  <div className="relative">
                    <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                      placeholder={isLogin ? '••••••••' : 'Mínimo 6 caracteres'} required minLength={6}
                      className="w-full pl-10 pr-4 py-3 rounded-xl text-white placeholder-gray-500 text-sm outline-none transition-all duration-200"
                      style={inputStyle}
                      onFocus={e => e.target.style.borderColor = 'rgba(99, 102, 241, 0.5)'}
                      onBlur={e => e.target.style.borderColor = 'rgba(148, 163, 184, 0.1)'} />
                  </div>
                </div>

                {error && (
                  <div className="p-3 rounded-xl text-sm text-red-300 border border-red-500/20" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}>
                    {error}
                  </div>
                )}

                <button type="submit" disabled={isLoading}
                  className="w-full py-3.5 rounded-xl font-bold text-white text-sm flex items-center justify-center gap-2 transition-all duration-300 active:scale-[0.98] disabled:opacity-60"
                  style={{
                    background: isLogin ? 'linear-gradient(135deg, #3b82f6, #6366f1)' : 'linear-gradient(135deg, #8b5cf6, #a855f7)',
                    boxShadow: isLogin ? '0 8px 25px rgba(59, 130, 246, 0.25)' : '0 8px 25px rgba(139, 92, 246, 0.25)',
                  }}>
                  {isLoading ? <Loader2 className="animate-spin" size={20} /> : <>{isLogin ? 'Ingresar' : 'Crear Cuenta'}<ArrowRight size={18} /></>}
                </button>

                {isLogin && (
                  <p className="text-center">
                    <button type="button" onClick={() => switchView('forgot')} className="text-gray-500 hover:text-gray-300 text-xs transition-colors">
                      ¿Olvidaste tu contraseña?
                    </button>
                  </p>
                )}
              </form>
            </>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-gray-500 text-xs mt-6">
          Tus datos están seguros y encriptados 🔒
        </p>
      </div>
    </div>
  );
};

export default AuthScreen;
