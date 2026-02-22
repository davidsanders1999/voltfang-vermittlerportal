import React, { useState } from 'react';
import { supabase } from '../utils/supabase';
import { Mail, Lock, Loader2, LogIn, ShieldCheck, UserPlus } from 'lucide-react';

/**
 * Props für die Login-Komponente
 * @property onLoginSuccess - Callback bei erfolgreichem Login
 * @property onGoToRegister - Callback zum Wechseln zur Registrierung
 * @property onForgotPassword - Callback zum Wechseln zur "Passwort vergessen" Ansicht
 * @property onEmailNotConfirmed - Callback wenn E-Mail noch nicht bestätigt wurde
 */
interface LoginProps {
  onLoginSuccess: () => void;
  onGoToRegister: () => void;
  onForgotPassword: () => void;
  onEmailNotConfirmed: (email: string) => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess, onGoToRegister, onForgotPassword, onEmailNotConfirmed }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Führt den Login-Versuch über Supabase Auth aus
   */
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
      
      // Bei Erfolg die App-Zustandsänderung auslösen
      onLoginSuccess();
    } catch (err: any) {
      // Prüfe ob E-Mail nicht bestätigt wurde
      if (err.message?.toLowerCase().includes('email not confirmed')) {
        onEmailNotConfirmed(email);
        return;
      }
      // Fehlermeldung für den User aufbereiten
      setError(err.message || 'Login fehlgeschlagen. Bitte prüfen Sie Ihre Daten.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafb] flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Titel & Subtitel */}
        <div className="text-center mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight mb-1">Willkommen zurück</h1>
          <p className="text-slate-500 text-xs">Voltfang Vermittler Portal</p>
        </div>

        {/* Login Karte */}
        <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/60 border border-slate-100 p-6 md:p-8 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150">
          <form onSubmit={handleLogin} className="space-y-5">
            {/* E-Mail Eingabe */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">E-Mail Adresse</label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#82a8a4] transition-colors">
                  <Mail size={14} />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@beispiel.de"
                  required
                  className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-[#82a8a4]/10 focus:border-[#82a8a4] outline-none font-bold text-xs text-slate-700 transition-all placeholder:text-slate-300"
                />
              </div>
            </div>

            {/* Passwort Eingabe */}
            <div className="space-y-1.5">
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
                  <Lock size={14} />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-[#82a8a4]/10 focus:border-[#82a8a4] outline-none font-bold text-xs text-slate-700 transition-all placeholder:text-slate-300"
                />
              </div>
            </div>

            {/* Fehlermeldung bei falschem Login */}
            {error && (
              <div className="bg-red-50 text-red-600 text-xs font-bold p-3 rounded-xl border border-red-100 flex items-center gap-2.5 animate-in shake duration-500">
                <div className="w-4 h-4 rounded-full bg-red-100 flex items-center justify-center shrink-0 text-[10px]">
                  !
                </div>
                {error}
              </div>
            )}

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2.5 rounded-xl shadow-lg shadow-slate-200 transition-all active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100 flex items-center justify-center gap-1.5 mt-2"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={14} />
              ) : (
                <>
                  Anmelden <LogIn size={14} />
                </>
              )}
            </button>
          </form>

          {/* Partner werden Bereich */}
          <div className="mt-6 flex flex-col gap-3">
            <button 
              onClick={onGoToRegister}
              className="w-full py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 transition-all flex items-center justify-center gap-1.5"
            >
              <UserPlus size={14} /> Jetzt Partner werden
            </button>
          </div>

          {/* Footer Infos */}
          <div className="mt-8 pt-6 border-t border-slate-50 flex flex-col items-center gap-3">
            <div className="flex items-center gap-1.5 text-slate-400">
              <ShieldCheck size={12} />
              <span className="text-[10px] font-bold uppercase tracking-wider">Sicherer Zugang</span>
            </div>
          </div>
        </div>
        
        <p className="text-center mt-6 text-slate-400 text-[10px]">
          &copy; 2026 Voltfang GmbH • Alle Rechte vorbehalten
        </p>
      </div>
    </div>
  );
};

export default Login;
