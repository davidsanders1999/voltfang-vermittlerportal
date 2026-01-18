import React from 'react';
import { 
  LayoutDashboard, 
  FolderKanban, 
  Zap,
  User as UserIcon
} from 'lucide-react';
import { ViewType, User, UserCompany } from '../types';

interface SidebarProps {
  currentView: ViewType;
  onNavigate: (view: ViewType) => void;
  isOpen: boolean;
  toggleSidebar: () => void;
  userProfile: User | null;
  userCompany: UserCompany | null;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  currentView, 
  onNavigate, 
  isOpen, 
  toggleSidebar,
  userProfile,
  userCompany 
}) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { id: 'projekte', label: 'Projekte', icon: <FolderKanban size={20} /> },
  ];

  const sidebarClasses = `
    fixed inset-y-0 left-0 z-50 w-64 text-slate-300 transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0
    ${isOpen ? 'translate-x-0' : '-translate-x-full'}
  `;

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 lg:hidden z-40" 
          onClick={toggleSidebar}
        />
      )}

      <aside className={sidebarClasses} style={{ backgroundColor: '#2d2d3a' }}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-white/5">
            <img 
              src="/Logo_gruen.svg" 
              alt="Voltfang Logo" 
              className="h-10 w-auto"
            />
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-2 space-y-1 overflow-y-auto">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.id as ViewType);
                }}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group
                  ${currentView === item.id 
                    ? 'bg-white/10 text-white shadow-sm shadow-black/20' 
                    : 'hover:bg-white/5 hover:text-white'}
                `}
              >
                <span className={`${currentView === item.id ? 'text-[#82a8a4]' : 'text-slate-400 group-hover:text-slate-300'}`}>
                  {item.icon}
                </span>
                <span className="flex-1 text-left font-medium text-sm">{item.label}</span>
              </button>
            ))}
          </nav>

          {/* Bottom Profile */}
          <div className="p-4 border-t border-white/5">
            <button 
              onClick={() => onNavigate('profile')}
              className="w-full flex items-center gap-3 p-2 rounded-lg transition-colors group text-left hover:bg-white/5"
            >
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-slate-400 ring-2 ring-white/5 group-hover:ring-white/10 transition-all">
                <UserIcon size={18} />
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-semibold text-white truncate">
                  {userCompany?.name || 'Kein Unternehmen'}
                </p>
                <p className="text-xs text-slate-500 truncate">
                  {userProfile ? `${userProfile.fname} ${userProfile.lname}` : 'Lädt...'}
                </p>
              </div>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
