import React, { useState, useMemo } from 'react';
import { Search, Filter, Plus, X, Briefcase, Trophy, XCircle } from 'lucide-react';
import { Project, ProjectStatus } from '../../types';
import { StatusBadge, ALL_PROJECT_STATUSES } from './ProjekteShared';

/**
 * Props für den ProjektUeberblick
 * @property projects - Liste aller anzuzeigenden Projekte
 * @property onSelectProject - Callback, wenn ein Projekt zur Detailansicht angeklickt wird
 * @property onCreateProject - Callback zum Öffnen des "Neu anlegen" Formulars
 */
interface ProjektUeberblickProps {
  projects: Project[];
  onSelectProject: (project: Project) => void;
  onCreateProject: () => void;
}

// Typ-Definition für die Reiter (Tabs)
type TabType = 'active' | 'won' | 'lost';

/**
 * Tabellarische Übersicht aller Projekte mit Such-, Filter- und Reiter-Navigation.
 */
const ProjektUeberblick: React.FC<ProjektUeberblickProps> = ({ 
  projects, 
  onSelectProject, 
  onCreateProject 
}) => {
  // State für die Reiter-Navigation
  const [activeTab, setActiveTab] = useState<TabType>('active');
  
  // State für die Textsuche
  const [searchTerm, setSearchTerm] = useState('');
  
  // State für die Multi-Status-Filterung innerhalb eines Reiters
  const [selectedStatuses, setSelectedStatuses] = useState<ProjectStatus[]>([]);

  /**
   * Fügt einen Status zum Filter hinzu oder entfernt ihn (Toggle-Logik)
   */
  const toggleStatus = (status: ProjectStatus) => {
    setSelectedStatuses(prev => 
      prev.includes(status) 
        ? prev.filter(s => s !== status) 
        : [...prev, status]
    );
  };

  /**
   * Filtert die Projekte nach dem aktuell ausgewählten Reiter (Tab)
   */
  const projectsInTab = useMemo(() => {
    return projects.filter(p => {
      if (activeTab === 'active') return p.status !== 'Gewonnen' && p.status !== 'Verloren';
      if (activeTab === 'won') return p.status === 'Gewonnen';
      if (activeTab === 'lost') return p.status === 'Verloren';
      return true;
    });
  }, [projects, activeTab]);

  /**
   * Berechnet die gefilterte Liste basierend auf Suche und Status-Auswahl innerhalb des Reiters.
   */
  const filteredProjects = useMemo(() => {
    return projectsInTab.filter(project => {
      // Suche über Name, Kunde und Stadt
      const matchesSearch = 
        project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.location_city.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Filtern nach Status (falls Filter aktiv sind)
      const matchesStatus = 
        selectedStatuses.length === 0 || 
        selectedStatuses.includes(project.status);

      return matchesSearch && matchesStatus;
    });
  }, [projectsInTab, searchTerm, selectedStatuses]);

  /**
   * Datum-Formatierung für die Tabellen-Anzeige
   */
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  /**
   * Hilfsfunktion zum Wechseln des Reiters (setzt Filter zurück)
   */
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setSelectedStatuses([]); // Filter beim Tab-Wechsel zurücksetzen
  };

  return (
    <div className="space-y-6">
      {/* Header Bereich */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Projekte</h2>
          <p className="text-sm text-slate-500">Verwalten Sie Ihre aktuellen Kundenanfragen und realisierten Projekte.</p>
        </div>
        <button 
          onClick={onCreateProject}
          className="flex items-center gap-2 px-6 py-2.5 bg-[#82a8a4] text-white rounded-xl font-bold text-xs shadow-lg shadow-[#82a8a4]/20 hover:scale-[1.02] transition-all active:scale-95"
        >
          <Plus size={16} /> Projekt anlegen
        </button>
      </div>

      {/* --- REITER NAVIGATION (TABS) --- */}
      <div className="flex items-center gap-1 bg-slate-100/50 p-1 rounded-2xl w-fit">
        <button
          onClick={() => handleTabChange('active')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'active' 
              ? 'bg-white text-[#82a8a4] shadow-sm' 
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Briefcase size={14} /> Aktive Projekte
          <span className={`ml-1 px-1.5 py-0.5 rounded-md text-[10px] ${activeTab === 'active' ? 'bg-[#82a8a4]/10' : 'bg-slate-200/50'}`}>
            {projects.filter(p => p.status !== 'Gewonnen' && p.status !== 'Verloren').length}
          </span>
        </button>
        <button
          onClick={() => handleTabChange('won')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'won' 
              ? 'bg-white text-green-600 shadow-sm' 
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Trophy size={14} /> Gewonnen
          <span className={`ml-1 px-1.5 py-0.5 rounded-md text-[10px] ${activeTab === 'won' ? 'bg-green-100' : 'bg-slate-200/50'}`}>
            {projects.filter(p => p.status === 'Gewonnen').length}
          </span>
        </button>
        <button
          onClick={() => handleTabChange('lost')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'lost' 
              ? 'bg-white text-red-600 shadow-sm' 
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <XCircle size={14} /> Verloren
          <span className={`ml-1 px-1.5 py-0.5 rounded-md text-[10px] ${activeTab === 'lost' ? 'bg-red-100' : 'bg-slate-200/50'}`}>
            {projects.filter(p => p.status === 'Verloren').length}
          </span>
        </button>
      </div>

      {/* Such- und Filter-Leiste */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 space-y-4">
        <div className="flex flex-wrap gap-3 items-center">
          {/* Suchfeld mit Icon */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input 
              type="text" 
              placeholder={`Suchen in ${activeTab === 'active' ? 'aktiven Projekten' : activeTab === 'won' ? 'gewonnenen Deals' : 'verlorenen Projekten'}...`} 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-medium focus:outline-none focus:border-[#82a8a4] transition-all"
            />
          </div>
          {/* Filter zurücksetzen Button (nur sichtbar wenn Filter aktiv) */}
          {selectedStatuses.length > 0 && (
            <button 
              onClick={() => setSelectedStatuses([])}
              className="flex items-center gap-1 px-3 py-2 text-[10px] font-bold text-red-400 hover:text-red-500 transition-colors uppercase tracking-widest"
            >
              <X size={12} /> Filter zurücksetzen
            </button>
          )}
        </div>
        
        {/* Status Filter Badges (nur relevante Status für den aktuellen Tab anzeigen) */}
        {activeTab === 'active' && (
          <div className="flex flex-wrap gap-2 items-center pt-2 border-t border-slate-50">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mr-2 flex items-center gap-1">
              <Filter size={10} /> Status Filter:
            </span>
            <div className="flex flex-wrap gap-2">
              {ALL_PROJECT_STATUSES
                .filter(s => s !== 'Gewonnen' && s !== 'Verloren')
                .map(status => (
                  <StatusBadge 
                    key={status} 
                    status={status} 
                    active={selectedStatuses.length === 0 || selectedStatuses.includes(status)}
                    onClick={() => toggleStatus(status)}
                  />
                ))}
            </div>
          </div>
        )}
      </div>

      {/* Haupt-Tabelle */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-shadow">
        <div className="overflow-x-auto">
          <table className="w-full text-left table-fixed">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <th className="px-6 py-4 w-1/5">Projekt & Kunde</th>
                <th className="px-6 py-4 w-1/5">Auftragsvolumen</th>
                <th className="px-6 py-4 w-1/5">Standort</th>
                <th className="px-6 py-4 w-1/5">Status</th>
                <th className="px-6 py-4 w-1/5">Erstellt am</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProjects.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400 text-sm font-medium italic">
                    Keine {activeTab === 'active' ? 'aktiven' : activeTab === 'won' ? 'gewonnenen' : 'verlorenen'} Projekte gefunden.
                  </td>
                </tr>
              ) : (
                filteredProjects.map((project) => (
                  <tr 
                    key={project.id} 
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    onClick={() => onSelectProject(project)}
                  >
                    <td className="px-6 py-4">
                      <p className="text-xs font-bold text-slate-800 group-hover:text-[#82a8a4] transition-colors">{project.name}</p>
                      <p className="text-[10px] text-slate-400 font-medium">{project.company_name}</p>
                    </td>
                    <td className="px-6 py-4 text-xs font-bold text-slate-700">
                      {project.volume 
                        ? `${project.volume.toLocaleString('de-DE')} €` 
                        : <span className="text-slate-300 font-normal italic text-[10px]">Kein Angebot</span>
                      }
                    </td>
                    <td className="px-6 py-4 text-xs font-medium text-slate-600">{project.location_city}</td>
                    <td className="px-6 py-4"><StatusBadge status={project.status} /></td>
                    <td className="px-6 py-4 text-xs font-medium text-slate-500">{formatDate(project.created_at)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ProjektUeberblick;
