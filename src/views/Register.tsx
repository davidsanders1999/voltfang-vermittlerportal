import React, { useState } from 'react';
import { supabase } from '../utils/supabase';
import { 
  Mail, 
  Lock, 
  Loader2, 
  UserPlus, 
  Building, 
  User, 
  Phone, 
  Globe, 
  MapPin,
  ArrowLeft, 
  ArrowRight, 
  CheckCircle2
} from 'lucide-react';

/**
 * Props für die Register-Komponente
 * @property onBackToLogin - Funktion, um zurück zum Login zu springen
 * @property onRegisterSuccess - Callback bei erfolgreicher Registrierung (wird hier intern durch Mail-Hinweis ersetzt)
 */
interface RegisterProps {
  onBackToLogin: () => void;
  onRegisterSuccess: () => void;
}

/**
 * Multi-Step-Registrierungsformular für neue Partner
 */
const Register: React.FC<RegisterProps> = ({ onBackToLogin, onRegisterSuccess }) => {
  // Step 1: Persönliche Daten, Step 2: Unternehmensname, Step 3: Anschrift
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  // Zentraler Form-State für alle Schritte
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fname: '',
    lname: '',
    phone: '',
    companyName: '',
    website: '',
    street: '',
    zip: '',
    city: '',
    country: 'Deutschland'
  });

  /**
   * Generische Change-Handler für alle Input-Felder
   */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  /**
   * Führt die eigentliche Registrierung durch.
   * Nutzt Supabase Auth für den User und eine Datenbank-Funktion (RPC) für Company + Profil.
   */
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // 1. Supabase Auth Registrierung (erstellt den Account)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Registrierung fehlgeschlagen.');

      // 2. Datenbank-Funktion 'handle_new_partner_registration' aufrufen.
      // Diese erstellt gleichzeitig das Unternehmen und verknüpft das User-Profil.
      const { error: rpcError } = await supabase.rpc('handle_new_partner_registration', {
        p_auth_id: authData.user.id,
        p_fname: formData.fname,
        p_lname: formData.lname,
        p_phone: formData.phone,
        p_company_name: formData.companyName,
        p_website: formData.website,
        p_street: formData.street,
        p_zip: formData.zip,
        p_city: formData.city,
        p_country: formData.country,
        p_email: formData.email,
      });

      if (rpcError) throw rpcError;

      // Erfolgsstatus setzen, um die Bestätigungsseite anzuzeigen
      setIsSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Registrierung fehlgeschlagen.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Render: Erfolgsseite (nach Klick auf Registrieren)
  if (isSuccess) {
    return (
      <div className="min-h-screen bg-[#f8fafb] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/60 border border-slate-100 p-10 text-center animate-in fade-in zoom-in duration-500">
          <div className="w-20 h-20 bg-green-100 text-green-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <Mail size={40} />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-4">Fast geschafft!</h2>
          <p className="text-slate-500 text-sm leading-relaxed mb-8">
            Wir haben Ihnen eine Bestätigungs-E-Mail an <strong>{formData.email}</strong> gesendet. 
            Bitte klicken Sie auf den Link in der Mail, um Ihr Konto zu aktivieren.
          </p>
          <button
            onClick={onBackToLogin}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-2xl transition-all active:scale-[0.98]"
          >
            Zurück zum Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafb] flex items-center justify-center p-4 py-12">
      <div className="max-w-2xl w-full">
        {/* Header-Infos */}
        <div className="text-center mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight mb-1">Partner werden</h1>
          <p className="text-slate-500 text-sm">Erstellen Sie Ihr Konto für das Vermittler Portal</p>
        </div>

        {/* Registrierungskarte mit Steps */}
        <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/60 border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150">
          <div className="p-8 md:p-10">
            {/* Progress-Balken oben */}
            <div className="flex gap-2 mb-10">
              {[1, 2, 3].map(i => (
                <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${step >= i ? 'bg-[#82a8a4]' : 'bg-slate-100'}`} />
              ))}
            </div>

            <form onSubmit={step === 3 ? handleRegister : (e) => { e.preventDefault(); setStep(s => s + 1); }} className="space-y-6">
              
              {/* SCHRITT 1: PERSÖNLICHE DATEN & LOGIN */}
              {step === 1 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Vorname</label>
                      <div className="relative group">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#82a8a4] transition-colors" size={18} />
                        <input type="text" name="fname" value={formData.fname} onChange={handleChange} required placeholder="Max" className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-[#82a8a4]/10 focus:border-[#82a8a4] outline-none font-medium text-sm" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Nachname</label>
                      <div className="relative group">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#82a8a4] transition-colors" size={18} />
                        <input type="text" name="lname" value={formData.lname} onChange={handleChange} required placeholder="Mustermann" className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-[#82a8a4]/10 focus:border-[#82a8a4] outline-none font-medium text-sm" />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">E-Mail Adresse</label>
                    <div className="relative group">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#82a8a4] transition-colors" size={18} />
                      <input type="email" name="email" value={formData.email} onChange={handleChange} required placeholder="name@beispiel.de" className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-[#82a8a4]/10 focus:border-[#82a8a4] outline-none font-medium text-sm" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Passwort</label>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#82a8a4] transition-colors" size={18} />
                      <input type="password" name="password" value={formData.password} onChange={handleChange} required placeholder="••••••••" minLength={6} className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-[#82a8a4]/10 focus:border-[#82a8a4] outline-none font-medium text-sm" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Telefonnummer</label>
                    <div className="relative group">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#82a8a4] transition-colors" size={18} />
                      <input type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="+49 123 456789" className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-[#82a8a4]/10 focus:border-[#82a8a4] outline-none font-medium text-sm" />
                    </div>
                  </div>
                </div>
              )}

              {/* SCHRITT 2: UNTERNEHMENS-INFORMATIONEN */}
              {step === 2 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Unternehmensname</label>
                    <div className="relative group">
                      <Building className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#82a8a4] transition-colors" size={18} />
                      <input type="text" name="companyName" value={formData.companyName} onChange={handleChange} required placeholder="Energie GmbH" className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-[#82a8a4]/10 focus:border-[#82a8a4] outline-none font-medium text-sm" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Website</label>
                    <div className="relative group">
                      <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#82a8a4] transition-colors" size={18} />
                      <input type="url" name="website" value={formData.website} onChange={handleChange} placeholder="https://www.beispiel.de" className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-[#82a8a4]/10 focus:border-[#82a8a4] outline-none font-medium text-sm" />
                    </div>
                  </div>
                </div>
              )}

              {/* SCHRITT 3: STANDORT / ANSCHRIFT */}
              {step === 3 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Straße & Hausnummer</label>
                    <div className="relative group">
                      <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#82a8a4] transition-colors" size={18} />
                      <input type="text" name="street" value={formData.street} onChange={handleChange} required placeholder="Musterstraße 1" className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-[#82a8a4]/10 focus:border-[#82a8a4] outline-none font-medium text-sm" />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">PLZ</label>
                      <input type="text" name="zip" value={formData.zip} onChange={handleChange} required placeholder="12345" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-[#82a8a4]/10 focus:border-[#82a8a4] outline-none font-medium text-sm" />
                    </div>
                    <div className="space-y-2 col-span-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Stadt</label>
                      <input type="text" name="city" value={formData.city} onChange={handleChange} required placeholder="Berlin" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-[#82a8a4]/10 focus:border-[#82a8a4] outline-none font-medium text-sm" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Land</label>
                    <input type="text" name="country" value={formData.country} onChange={handleChange} required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-[#82a8a4]/10 focus:border-[#82a8a4] outline-none font-medium text-sm" />
                  </div>
                </div>
              )}

              {/* Fehlermeldung bei Registrierung */}
              {error && (
                <div className="bg-red-50 text-red-600 text-xs font-bold p-4 rounded-xl border border-red-100">
                  {error}
                </div>
              )}

              {/* Navigation-Buttons am Ende der Form */}
              <div className="flex justify-between items-center pt-4">
                {step > 1 ? (
                  <button type="button" onClick={() => setStep(s => s - 1)} className="flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-slate-800 transition-colors">
                    <ArrowLeft size={18} /> Zurück
                  </button>
                ) : (
                  <button type="button" onClick={onBackToLogin} className="flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-slate-800 transition-colors">
                    <ArrowLeft size={18} /> Zum Login
                  </button>
                )}

                {step < 3 ? (
                  <button type="submit" className="bg-[#82a8a4] hover:bg-[#72938f] text-white font-bold px-8 py-3 rounded-xl shadow-lg shadow-[#82a8a4]/20 flex items-center gap-2 transition-all active:scale-95">
                    Weiter <ArrowRight size={18} />
                  </button>
                ) : (
                  <button type="submit" disabled={loading} className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-8 py-3 rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-70 flex items-center gap-2">
                    {loading ? <Loader2 className="animate-spin" size={18} /> : <>Registrieren <CheckCircle2 size={18} /></>}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
