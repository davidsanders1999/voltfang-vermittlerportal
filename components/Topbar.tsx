import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { 
  ChevronDown, 
  Menu,
  User as UserIcon,
  LogOut,
  Settings
} from 'lucide-react';
import { ViewType, User, UserCompany } from '../types';

interface TopbarProps {
  currentView: ViewType;
  onSidebarToggle: () => void;
  onNavigate: (view: ViewType) => void;
  userProfile: User | null;
  userCompany: UserCompany | null;
}

const Topbar: React.FC<TopbarProps> = ({ currentView, onSidebarToggle, onNavigate, userProfile, userCompany }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const viewLabels: Record<string, string> = {
    dashboard: 'Dashboard Übersicht',
    projekte: 'Projektverwaltung',
    academy: 'Partner Akademie',
    profile: 'Mein Profil',
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setIsMenuOpen(false);
    await supabase.auth.signOut();
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 bg-white border-b border-slate-200 shadow-sm">
      <div className="flex items-center gap-4">
        <button 
          onClick={onSidebarToggle}
          className="lg:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <Menu size={20} />
        </button>
        <h1 className="text-lg font-bold text-slate-800 hidden sm:block">
          {viewLabels[currentView]}
        </h1>
      </div>

      <div className="flex items-center gap-4 relative" ref={menuRef}>
        {/* Profile Action */}
        <button 
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="flex items-center gap-2 group p-1.5 hover:bg-slate-50 rounded-xl transition-all"
        >
          <div className="hidden text-right lg:block">
            <p className="text-sm font-semibold text-slate-800 leading-none">
              {userProfile ? `${userProfile.fname} ${userProfile.lname}` : 'Lädt...'}
            </p>
            <p className="text-[10px] text-slate-400 font-medium mt-1">Administrator</p>
          </div>
          <ChevronDown 
            size={14} 
            className={`text-slate-400 group-hover:text-slate-600 transition-transform duration-300 ${isMenuOpen ? 'rotate-180' : ''}`} 
          />
        </button>

        {/* Dropdown Menu */}
        {isMenuOpen && (
          <div className="absolute top-full right-0 mt-2 w-56 bg-white border border-slate-100 rounded-2xl shadow-xl shadow-slate-200/50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="p-2">
              <button 
                onClick={() => {
                  onNavigate('profile');
                  setIsMenuOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-[#82a8a4] rounded-xl transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-[#82a8a4]">
                  <UserIcon size={16} />
                </div>
                Zum Profil
              </button>
              
              <button 
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-xl transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
                  <Settings size={16} />
                </div>
                Einstellungen
              </button>

              <div className="my-1 border-t border-slate-50"></div>

              <button 
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-red-500 hover:bg-red-50 rounded-xl transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
                  <LogOut size={16} />
                </div>
                Logout
              </button>
            </div>
            
            <div className="bg-slate-50 px-4 py-2 text-[10px] text-slate-400 font-medium border-t border-slate-100">
              {userCompany?.name || 'Partner Portal'} v1.4.2
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Topbar;
