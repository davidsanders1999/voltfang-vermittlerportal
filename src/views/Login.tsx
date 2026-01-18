import React, { useState } from 'react';
import { supabase } from '../utils/supabase';
import { Mail, Lock, Loader2, LogIn, ShieldCheck, UserPlus } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: () => void;
  onGoToRegister: () => void;
  onForgotPassword: () => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess, onGoToRegister, onForgotPassword }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      onLoginSuccess();
    } catch (err: any) {
      setError(err.message || 'Login fehlgeschlagen. Bitte prüfen Sie Ihre Daten.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafb] flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo/Header */}
        <div className="text-center mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight mb-2">Willkommen zurück</h1>
          <p className="text-slate-500 text-sm">Voltfang Vermittler Portal</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/60 border border-slate-100 p-8 md:p-10 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150">
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">E-Mail Adresse</label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#82a8a4] transition-colors">
                  <Mail size={18} />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@beispiel.de"
                  required
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-[#82a8a4]/10 focus:border-[#82a8a4] outline-none font-medium text-sm text-slate-700 transition-all placeholder:text-slate-300"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center px-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Passwort</label>
                <button 
                  type="button"
                  onClick={onForgotPassword}
                  className="text-[10px] font-bold text-[#82a8a4] hover:underline uppercase tracking-widest"
                >
                  Vergessen?
                </button>
              </div>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#82a8a4] transition-colors">
                  <Lock size={18} />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-[#82a8a4]/10 focus:border-[#82a8a4] outline-none font-medium text-sm text-slate-700 transition-all placeholder:text-slate-300"
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 text-xs font-bold p-4 rounded-xl border border-red-100 flex items-center gap-3 animate-in shake duration-500">
                <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                  !
                </div>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-2xl shadow-lg shadow-slate-200 transition-all active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100 flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <>
                  Anmelden <LogIn size={18} />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 flex flex-col gap-4">
            <button 
              onClick={onGoToRegister}
              className="w-full py-4 rounded-2xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
            >
              <UserPlus size={18} /> Jetzt Partner werden
            </button>
          </div>

          <div className="mt-10 pt-8 border-t border-slate-50 flex flex-col items-center gap-4">
            <div className="flex items-center gap-2 text-slate-400">
              <ShieldCheck size={16} />
              <span className="text-[10px] font-bold uppercase tracking-wider">Sicherer Zugang</span>
            </div>
          </div>
        </div>
        
        <p className="text-center mt-8 text-slate-400 text-xs">
          &copy; 2026 Voltfang GmbH • Alle Rechte vorbehalten
        </p>
      </div>
    </div>
  );
};

export default Login;
