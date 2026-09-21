import React, { useState } from 'react';
import { ShieldCheck, UserCheck, Lock, Mail, AlertCircle, Wrench } from 'lucide-react';
import { api } from '../lib/api';
import { User } from '../types';

interface LoginViewProps {
  onLoginSuccess: (user: User) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Introduce email y contraseña');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await api.login(email, password);
      onLoginSuccess(res.user);
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError(null);
    // Auto submit
    setLoading(true);
    api.login(demoEmail, demoPass)
      .then((res) => onLoginSuccess(res.user))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Brand Header */}
        <div className="text-center mb-8 flex flex-col items-center justify-center">
          <div className="inline-flex flex-col sm:flex-row items-center justify-center gap-3.5 py-2 px-3 hover:scale-102 transition-transform">
            <img
              src="/suiteak-icon.png"
              alt="Suiteak Icon"
              referrerPolicy="no-referrer"
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-contain shadow-2xl ring-1 ring-white/10 shrink-0"
            />
            <img
              src="/suiteak-logo-white.png"
              alt="Suiteak"
              referrerPolicy="no-referrer"
              className="h-12 sm:h-14 md:h-16 w-auto max-w-[280px] sm:max-w-[340px] object-contain block drop-shadow-xl"
            />
          </div>
        </div>

        {/* Login Card */}
        <div className="bg-neutral-900/90 border border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xs">
          <h2 className="text-lg font-bold text-white mb-1.5">Iniciar sesión</h2>
          <p className="text-xs text-neutral-400 mb-6">
            Accede al sistema con tu cuenta para gestionar materiales y movimientos.
          </p>

          {error && (
            <div
              id="login-error-banner"
              className="mb-5 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5" htmlFor="login-email">
                Usuario o Correo electrónico
              </label>
              <div className="relative">
                <input
                  id="login-email"
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Adminsuiteak o correo electrónico"
                  required
                  className="w-full px-3.5 py-2.5 pl-10 bg-neutral-950 border border-neutral-700 rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-hidden focus:border-[#EA1D24] focus:ring-1 focus:ring-[#EA1D24]"
                />
                <Mail className="w-4 h-4 text-neutral-500 absolute left-3.5 top-3" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5" htmlFor="login-password">
                Contraseña
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-3.5 py-2.5 pl-10 bg-neutral-950 border border-neutral-700 rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-hidden focus:border-[#EA1D24] focus:ring-1 focus:ring-[#EA1D24]"
                />
                <Lock className="w-4 h-4 text-neutral-500 absolute left-3.5 top-3" />
              </div>
            </div>

            <button
              id="btn-login-submit"
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-[#EA1D24] hover:bg-[#d61920] active:bg-[#bf161c] disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-all shadow-md shadow-red-600/30 mt-2"
            >
              {loading ? 'Iniciando sesión...' : 'Entrar al Almacén'}
            </button>
          </form>

          {/* Quick Demo Access Bar */}
          <div className="mt-8 pt-6 border-t border-neutral-800">
            <span className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-3 text-center">
              Acceso rápido para demostración
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                id="btn-demo-admin"
                type="button"
                onClick={() => handleQuickLogin('Adminsuiteak', '12345')}
                className="flex items-center gap-2.5 p-2.5 bg-neutral-950/60 hover:bg-neutral-800/60 border border-neutral-800 rounded-2xl text-left transition-colors group"
              >
                <div className="p-2 rounded-xl bg-red-500/20 text-red-400 group-hover:bg-[#EA1D24] group-hover:text-white transition-colors">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Adminsuiteak</div>
                  <div className="text-[10px] text-neutral-400">Contraseña: 12345</div>
                </div>
              </button>

              <button
                id="btn-demo-operario"
                type="button"
                onClick={() => handleQuickLogin('carlos@reformas.com', 'operario123')}
                className="flex items-center gap-2.5 p-2.5 bg-neutral-950/60 hover:bg-neutral-800/60 border border-neutral-800 rounded-2xl text-left transition-colors group"
              >
                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Carlos Operario</div>
                  <div className="text-[10px] text-neutral-400">operario123</div>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* System info */}
        <div className="text-center mt-6 text-xs text-neutral-500 flex items-center justify-center gap-2">
          <Wrench className="w-3.5 h-3.5 text-red-500" />
          <span>Gestión de Stock, Herramientas y Obras • MVP v1.0</span>
        </div>
      </div>
    </div>
  );
};
