import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './utils/supabase';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import Dashboard from './views/Dashboard';
import Projekte from './views/Projekte';
import Profile from './views/Profile';
import Login from './views/Login';
import Register from './views/Register';
import ForgotPassword from './views/ForgotPassword';
import ResetPassword from './views/ResetPassword';
import { ViewType, User, UserCompany } from './types';

/**
 * Auth-Status State Machine
 * Explizite Zustände verhindern Race Conditions zwischen Auth-Events
 */
type AuthStatus = 
  | 'initializing'         // App wird geladen
  | 'unauthenticated'      // Kein User, zeigt Login
  | 'registering'          // Registrierung läuft (blockiert Auth-Events!)
  | 'registration_done'    // Registrierung erfolgreich
  | 'email_not_confirmed'  // E-Mail noch nicht bestätigt
  | 'authenticated'        // User eingeloggt & freigeschaltet
  | 'pending_unlock';      // User eingeloggt, nicht freigeschaltet

type AuthView = 'login' | 'register' | 'forgot-password' | 'reset-password';

// Daten für die Registrierungs-Erfolgsseite
interface RegistrationSuccessData {
  email: string;
  fname: string;
  companyName?: string;
}

const App: React.FC = () => {
  // Auth State Machine
  const [authStatus, setAuthStatus] = useState<AuthStatus>('initializing');
  const authStatusRef = useRef<AuthStatus>('initializing');
  
  // User-Daten
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [userCompany, setUserCompany] = useState<UserCompany | null>(null);
  
  // UI-States
  const [authView, setAuthView] = useState<AuthView>('login');
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [inviteCode, setInviteCode] = useState<string | undefined>(undefined);
  const [registrationData, setRegistrationData] = useState<RegistrationSuccessData | null>(null);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null); // E-Mail für "nicht bestätigt" Screen
  const [pendingUserUnlocked, setPendingUserUnlocked] = useState<boolean>(false); // Freischaltungs-Status

  // Ref für den Auth-Status, damit wir in Callbacks den aktuellen Wert haben
  useEffect(() => {
    authStatusRef.current = authStatus;
  }, [authStatus]);

  useEffect(() => {
    // URL-Parameter für Einladungscode prüfen
    const urlParams = new URLSearchParams(window.location.search);
    const invite = urlParams.get('invite');
    if (invite) {
      setInviteCode(invite.toUpperCase());
      setAuthView('register');
      window.history.replaceState({}, '', window.location.pathname);
    }

    // Initialen Session-Check durchführen
    supabase.auth.getSession().then(({ data: { session } }) => {
      // Nur verarbeiten wenn wir noch im initialen Zustand sind
      if (authStatusRef.current !== 'initializing') return;
      
      if (session) {
        fetchUserData(session.user.id);
      } else {
        setAuthStatus('unauthenticated');
      }
    });

    // Auf Auth-Statusänderungen hören
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      // WICHTIG: Während der Registrierung ALLE Auth-Events ignorieren!
      // Das verhindert das Flackern zum Dashboard
      if (authStatusRef.current === 'registering' || authStatusRef.current === 'registration_done') {
        console.log('[Auth] Event ignoriert (Status:', authStatusRef.current, ')');
        return;
      }

      if (event === 'PASSWORD_RECOVERY') {
        setAuthView('reset-password');
        return;
      }

      if (session) {
        fetchUserData(session.user.id);
      } else {
        setUserProfile(null);
        setUserCompany(null);
        setAuthStatus('unauthenticated');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserData = async (authId: string) => {
    try {
      const { data: userData, error: userError } = await supabase
        .from('user')
        .select('*')
        .eq('auth_id', authId)
        .single();

      if (userError) throw userError;
      setUserProfile(userData);

      if (userData.company_id) {
        const { data: companyData, error: companyError } = await supabase
          .from('usercompany')
          .select('*')
          .eq('id', userData.company_id)
          .single();

        if (companyError) throw companyError;
        setUserCompany(companyData);
      }

      // Auth-Status basierend auf is_unlocked setzen
      if (userData.is_unlocked) {
        setAuthStatus('authenticated');
      } else {
        setAuthStatus('pending_unlock');
      }
    } catch (error) {
      console.error('Fehler beim Laden der Benutzerdaten:', error);
      setAuthStatus('unauthenticated');
    }
  };

  const handleNavigateToProject = (projectId: string) => {
    setActiveProjectId(projectId);
    setCurrentView('projekte');
  };

  const handleNavigate = (view: ViewType) => {
    if (view !== 'projekte') {
      setActiveProjectId(null);
    }
    setCurrentView(view);
  };

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard': 
        return (
          <Dashboard 
            onNavigate={handleNavigate} 
            onNavigateToProject={handleNavigateToProject} 
            userProfile={userProfile}
            userCompany={userCompany}
          />
        );
      case 'projekte': 
        return <Projekte initialProjectId={activeProjectId} userProfile={userProfile} />;
      case 'profile':
        return <Profile />;
      default: 
        return (
          <Dashboard 
            onNavigate={handleNavigate} 
            onNavigateToProject={handleNavigateToProject} 
            userProfile={userProfile}
            userCompany={userCompany}
          />
        );
    }
  };

  // ============================================================
  // RENDER: State Machine bestimmt, was angezeigt wird
  // ============================================================

  // 1. INITIALIZING: App wird geladen
  if (authStatus === 'initializing') {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#82a8a4]/20 border-t-[#82a8a4] rounded-full animate-spin"></div>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Portal wird geladen...</p>
        </div>
      </div>
    );
  }

  // 2. REGISTERING: Registrierung läuft - Ladebildschirm
  if (authStatus === 'registering') {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#82a8a4]/20 border-t-[#82a8a4] rounded-full animate-spin"></div>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Registrierung wird verarbeitet...</p>
        </div>
      </div>
    );
  }

  // 3. REGISTRATION_DONE: Erfolgsseite nach Registrierung
  if (authStatus === 'registration_done') {
    return (
      <div className="min-h-screen bg-[#f8fafb] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-100 p-8 animate-in fade-in zoom-in duration-500">
          {/* Erfolgs-Header */}
          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-1">Registrierung erfolgreich!</h2>
            <p className="text-slate-500 text-sm">
              Willkommen{registrationData?.fname ? `, ${registrationData.fname}` : ''}!
            </p>
            {registrationData?.companyName && (
              <p className="text-slate-400 text-xs mt-1">
                Team: {registrationData.companyName}
              </p>
            )}
          </div>

          {/* Nächste Schritte - schlicht als Liste */}
          <div className="border-t border-slate-100 pt-5 mb-6">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-4">Nächste Schritte</p>
            
            <div className="space-y-4">
              {/* Schritt 1 */}
              <div className="flex gap-3">
                <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-500 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
                <div>
                  <p className="text-sm font-medium text-slate-700">E-Mail bestätigen</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Bestätigungs-E-Mail an <span className="font-medium text-slate-500">{registrationData?.email}</span> gesendet.
                  </p>
                </div>
              </div>

              {/* Schritt 2 */}
              <div className="flex gap-3">
                <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-500 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
                <div>
                  <p className="text-sm font-medium text-slate-700">Freischaltung abwarten</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Ihr Konto wird geprüft und innerhalb von 1-2 Werktagen freigeschaltet.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Hinweis */}
          <p className="text-[11px] text-slate-400 text-center mb-5">
            Fragen? <a href="mailto:partner@voltfang.de" className="text-slate-500 hover:text-slate-700 underline">partner@voltfang.de</a>
          </p>

          <button
            onClick={() => { 
              setAuthStatus('unauthenticated'); 
              setAuthView('login'); 
              setRegistrationData(null); 
            }}
            className="w-full bg-slate-800 hover:bg-slate-700 text-white font-medium py-3 rounded-xl text-sm transition-all active:scale-[0.98]"
          >
            Zum Login
          </button>
        </div>
      </div>
    );
  }

  // 4. EMAIL_NOT_CONFIRMED: E-Mail noch nicht bestätigt
  if (authStatus === 'email_not_confirmed') {
    const handleResendEmail = async () => {
      if (!pendingEmail) return;
      try {
        await supabase.auth.resend({
          type: 'signup',
          email: pendingEmail,
        });
        alert('Bestätigungs-E-Mail wurde erneut gesendet!');
      } catch (error) {
        console.error('Fehler beim erneuten Senden:', error);
        alert('Fehler beim Senden. Bitte versuchen Sie es später erneut.');
      }
    };

    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="max-w-lg w-full bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/60 border border-slate-100 p-10 animate-in fade-in zoom-in duration-500">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">
              {pendingUserUnlocked ? 'E-Mail bestätigen' : 'Konto aktivieren'}
            </h2>
            <p className="text-slate-500 text-sm">
              {pendingUserUnlocked 
                ? 'Bitte bestätigen Sie nur noch Ihre E-Mail-Adresse.'
                : 'Bitte bestätigen Sie Ihre E-Mail und warten Sie auf die Freischaltung.'}
            </p>
          </div>

          {/* Status-Info */}
          <div className="space-y-4 mb-8">
            {/* E-Mail noch nicht bestätigt */}
            <div className="flex items-center gap-4 p-4 bg-amber-50 rounded-2xl border border-amber-100">
              <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <div className="w-5 h-5 border-2 border-amber-600/30 border-t-amber-600 rounded-full animate-spin"></div>
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-sm text-amber-800">E-Mail-Bestätigung ausstehend</h3>
                <p className="text-xs text-amber-600">
                  Wir haben eine Bestätigungs-E-Mail an <strong>{pendingEmail}</strong> gesendet.
                </p>
                <button
                  onClick={handleResendEmail}
                  className="text-[10px] text-amber-700 hover:text-amber-900 underline mt-1 transition-colors"
                >
                  E-Mail erneut senden
                </button>
              </div>
            </div>

            {/* Freischaltung - dynamisch: grün wenn freigeschaltet, amber mit Animation wenn nicht */}
            {pendingUserUnlocked ? (
              <div className="flex items-center gap-4 p-4 bg-green-50 rounded-2xl border border-green-100">
                <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-600"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                </div>
                <div>
                  <h3 className="font-bold text-sm text-green-800">Konto freigeschaltet</h3>
                  <p className="text-xs text-green-600">Ihr Konto wurde von Voltfang freigeschaltet.</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-4 p-4 bg-amber-50 rounded-2xl border border-amber-100">
                <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <div className="w-5 h-5 border-2 border-amber-600/30 border-t-amber-600 rounded-full animate-spin"></div>
                </div>
                <div>
                  <h3 className="font-bold text-sm text-amber-800">Freischaltung ausstehend</h3>
                  <p className="text-xs text-amber-600">
                    Ihr Konto wird von Voltfang geprüft (1-2 Werktage).
                  </p>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => {
              setPendingEmail(null);
              setAuthStatus('unauthenticated');
            }}
            className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-4 rounded-2xl transition-all active:scale-[0.98]"
          >
            Zurück zum Login
          </button>
        </div>
      </div>
    );
  }

  // 5. PENDING_UNLOCK: User eingeloggt, aber nicht freigeschaltet
  if (authStatus === 'pending_unlock') {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="max-w-lg w-full bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/60 border border-slate-100 p-10 animate-in fade-in zoom-in duration-500">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Freischaltung ausstehend</h2>
            <p className="text-slate-500 text-sm">
              Hallo <strong>{userProfile?.fname}</strong>, Ihr Konto wird gerade geprüft.
            </p>
          </div>

          {/* Status-Info */}
          <div className="space-y-4 mb-8">
            {/* E-Mail bestätigt */}
            <div className="flex items-center gap-4 p-4 bg-green-50 rounded-2xl border border-green-100">
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-600"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              </div>
              <div>
                <h3 className="font-bold text-sm text-green-800">E-Mail bestätigt</h3>
                <p className="text-xs text-green-600">Ihre E-Mail-Adresse wurde erfolgreich verifiziert.</p>
              </div>
            </div>

            {/* Freischaltung in Bearbeitung */}
            <div className="flex items-center gap-4 p-4 bg-amber-50 rounded-2xl border border-amber-100">
              <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <div className="w-5 h-5 border-2 border-amber-600/30 border-t-amber-600 rounded-full animate-spin"></div>
              </div>
              <div>
                <h3 className="font-bold text-sm text-amber-800">Freischaltung wird geprüft</h3>
                <p className="text-xs text-amber-600">
                  Unser Team prüft Ihre Daten. Dies dauert in der Regel 1-2 Werktage.
                </p>
              </div>
            </div>
          </div>

          {/* Hinweis */}
          <div className="text-center mb-6 p-4 bg-slate-50 rounded-xl">
            <p className="text-xs text-slate-500">
              Sie erhalten eine E-Mail an <strong>{userProfile?.email}</strong>, sobald Ihr Konto freigeschaltet wurde.
              Bei Fragen: <a href="mailto:partner@voltfang.de" className="text-[#82a8a4] font-medium hover:underline">partner@voltfang.de</a>
            </p>
          </div>

          <button
            onClick={() => supabase.auth.signOut()}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-2xl transition-all active:scale-[0.98]"
          >
            Abmelden
          </button>
        </div>
      </div>
    );
  }

  // 5. UNAUTHENTICATED: Login/Register/Passwort-Reset
  if (authStatus === 'unauthenticated') {
    // Sonderfall: Passwort-Reset
    if (authView === 'reset-password') {
      return <ResetPassword onSuccess={() => setAuthView('login')} />;
    }
    
    switch (authView) {
      case 'register':
        return (
          <Register 
            onBackToLogin={() => { setAuthView('login'); setInviteCode(undefined); }} 
            onRegistrationStart={() => {
              // SOFORT den Status setzen - das verhindert jedes Flackern!
              setAuthStatus('registering');
            }}
            onRegisterSuccess={(data) => { 
              setRegistrationData(data);
              setAuthStatus('registration_done'); 
              setInviteCode(undefined); 
            }}
            onRegistrationError={() => {
              // Bei Fehler zurück zum Register-Formular
              setAuthStatus('unauthenticated');
            }}
            inviteCode={inviteCode}
          />
        );
      case 'forgot-password':
        return <ForgotPassword onBackToLogin={() => setAuthView('login')} />;
      default:
        return (
          <Login 
            onLoginSuccess={() => handleNavigate('dashboard')} 
            onGoToRegister={() => setAuthView('register')}
            onForgotPassword={() => setAuthView('forgot-password')}
            onEmailNotConfirmed={async (email) => {
              setPendingEmail(email);
              // Freischaltungs-Status aus der DB holen
              try {
                const { data } = await supabase
                  .from('user')
                  .select('is_unlocked')
                  .eq('email', email)
                  .single();
                setPendingUserUnlocked(data?.is_unlocked ?? false);
              } catch {
                setPendingUserUnlocked(false);
              }
              setAuthStatus('email_not_confirmed');
            }}
          />
        );
    }
  }

  // 6. AUTHENTICATED: Dashboard anzeigen
  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar 
        currentView={currentView} 
        onNavigate={handleNavigate} 
        isOpen={isSidebarOpen}
        toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        userProfile={userProfile}
        userCompany={userCompany}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <Topbar 
          currentView={currentView}
          onSidebarToggle={() => setIsSidebarOpen(!isSidebarOpen)}
          onNavigate={handleNavigate}
          userProfile={userProfile}
          userCompany={userCompany}
        />
        
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
