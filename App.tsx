import React, { useState, useEffect } from 'react';
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
import { Session } from '@supabase/supabase-js';

type AuthView = 'login' | 'register' | 'forgot-password' | 'reset-password';

const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [userCompany, setUserCompany] = useState<UserCompany | null>(null);
  const [loading, setLoading] = useState(true);
  const [authView, setAuthView] = useState<AuthView>('login');
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);

  useEffect(() => {
    // Initialen Session-Check durchführen
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchUserData(session.user.id);
      else setLoading(false);
    });

    // Auf Auth-Statusänderungen hören
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      
      if (event === 'PASSWORD_RECOVERY') {
        setAuthView('reset-password');
      }

      if (session) {
        fetchUserData(session.user.id);
      } else {
        setUserProfile(null);
        setUserCompany(null);
        setLoading(false);
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
    } catch (error) {
      console.error('Fehler beim Laden der Benutzerdaten:', error);
    } finally {
      setLoading(false);
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

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#82a8a4]/20 border-t-[#82a8a4] rounded-full animate-spin"></div>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Portal wird geladen...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    switch (authView) {
      case 'register':
        return (
          <Register 
            onBackToLogin={() => setAuthView('login')} 
            onRegisterSuccess={() => setAuthView('login')} 
          />
        );
      case 'forgot-password':
        return <ForgotPassword onBackToLogin={() => setAuthView('login')} />;
      case 'reset-password':
        return <ResetPassword onSuccess={() => { setAuthView('login'); handleNavigate('dashboard'); }} />;
      default:
        return (
          <Login 
            onLoginSuccess={() => handleNavigate('dashboard')} 
            onGoToRegister={() => setAuthView('register')}
            onForgotPassword={() => setAuthView('forgot-password')}
          />
        );
    }
  }

  // Sonderfall: Passwort-Reset während man eingeloggt ist (via Recovery Link)
  if (authView === 'reset-password') {
    return <ResetPassword onSuccess={() => setAuthView('login')} />;
  }

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
