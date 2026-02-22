import React, { useState, useMemo } from 'react';
import { Search, Filter, Plus, X, Briefcase, Trophy, XCircle, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { Project, ProjectStatus } from '../../types';
import { StatusBadge, ALL_PROJECT_STATUSES } from './ProjekteShared';

// Typ-Definitionen für Sortierung
type SortColumn = 'name' | 'capacity' | 'location' | 'status' | 'created_at';
type SortDirection = 'asc' | 'desc';

// Konstante für Pagination
const ITEMS_PER_PAGE = 10;

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

  // State für Pagination
  const [currentPage, setCurrentPage] = useState(1);

  // State für Sortierung (Default: neueste zuerst)
  const [sortColumn, setSortColumn] = useState<SortColumn>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Zähler für die Tabs
  const counts = useMemo(() => ({
    active: projects.filter(p => p.status !== 'Gewonnen' && p.status !== 'Verloren').length,
    won: projects.filter(p => p.status === 'Gewonnen').length,
    lost: projects.filter(p => p.status === 'Verloren').length,
  }), [projects]);

  /**
   * Fügt einen Status zum Filter hinzu oder entfernt ihn (Toggle-Logik)
   */
  const toggleStatus = (status: ProjectStatus) => {
    setSelectedStatuses(prev => 
      prev.includes(status) 
        ? prev.filter(s => s !== status) 
        : [...prev, status]
    );
    setCurrentPage(1); // Seite bei Filteränderung zurücksetzen
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
   * Hilfsfunktion zur numerischen Kapazitätsermittlung für Sortierung
   */
  const getCapacityValue = (project: Project): number => {
    if (project.offered_capacity) return project.offered_capacity;
    // Schätzwerte für Ranges (Mittelwert)
    const estimatedValues: Record<string, number> = {
      '100 - 500 kWh': 300,
      '500 - 1000 kWh': 750,
      '1000 - 5000 kWh': 3000,
      '>5000 kWh': 7500,
    };
    return project.estimated_capacity ? estimatedValues[project.estimated_capacity] || 0 : 0;
  };

  /**
   * Status-Reihenfolge für Sortierung
   */
  const statusOrder: Record<ProjectStatus, number> = {
    'Lead übergeben': 1,
    'Technische Klärung': 2,
    'Vertragliche Klärung': 3,
    'Closing': 4,
    'Gewonnen': 5,
    'Verloren': 6,
  };

  /**
   * Sortierte Projekte basierend auf ausgewählter Spalte und Richtung
   */
  const sortedProjects = useMemo(() => {
    const sorted = [...filteredProjects].sort((a, b) => {
      let comparison = 0;

      switch (sortColumn) {
        case 'name':
          comparison = a.name.localeCompare(b.name, 'de');
          break;
        case 'capacity':
          comparison = getCapacityValue(a) - getCapacityValue(b);
          break;
        case 'location':
          comparison = a.location_city.localeCompare(b.location_city, 'de');
          break;
        case 'status':
          comparison = statusOrder[a.status] - statusOrder[b.status];
          break;
        case 'created_at':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }, [filteredProjects, sortColumn, sortDirection]);

  /**
   * Paginierte Projekte für die aktuelle Seite
   */
  const paginatedProjects = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return sortedProjects.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [sortedProjects, currentPage]);

  /**
   * Gesamtzahl der Seiten
   */
  const totalPages = Math.ceil(sortedProjects.length / ITEMS_PER_PAGE);

  /**
   * Berechnet den angezeigten Bereich (z.B. "1-10 von 25")
   */
  const displayRange = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE + 1;
    const end = Math.min(currentPage * ITEMS_PER_PAGE, sortedProjects.length);
    return { start, end, total: sortedProjects.length };
  }, [currentPage, sortedProjects.length]);

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
   * Hilfsfunktion zum Wechseln des Reiters (setzt Filter und Seite zurück)
   */
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setSelectedStatuses([]); // Filter beim Tab-Wechsel zurücksetzen
    setCurrentPage(1); // Seite zurücksetzen
  };

  /**
   * Handler für Sortierung beim Klick auf Spaltenüberschrift
   */
  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      // Gleiche Spalte: Richtung umkehren
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      // Neue Spalte: Standard-Richtung setzen
      setSortColumn(column);
      setSortDirection(column === 'created_at' ? 'desc' : 'asc');
    }
    setCurrentPage(1); // Seite bei Sortieränderung zurücksetzen
  };

  /**
   * Sortier-Icon Komponente
   */
  const SortIcon: React.FC<{ column: SortColumn }> = ({ column }) => {
    if (sortColumn !== column) {
      return <span className="text-slate-300 ml-1"><ChevronUp size={10} /></span>;
    }
    return sortDirection === 'asc' 
      ? <span className="text-[#82a8a4] ml-1"><ChevronUp size={10} /></span>
      : <span className="text-[#82a8a4] ml-1"><ChevronDown size={10} /></span>;
  };

  return (
    <div className="space-y-5">
      {/* Header Bereich */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Projekte</h2>
          <p className="text-xs text-slate-500">Verwalten Sie Ihre aktuellen Kundenanfragen und realisierten Projekte.</p>
        </div>
        <button 
          onClick={onCreateProject}
          className="flex items-center gap-2 px-5 py-2 bg-[#82a8a4] text-white rounded-xl font-bold text-xs shadow-lg shadow-[#82a8a4]/20 hover:bg-[#72938f] transition-all active:scale-95"
        >
          <Plus size={14} /> Projekt anlegen
        </button>
      </div>

      {/* Kombinierte Filter-Box mit Tabs, Suche und Status-Filter */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {/* Tabs als obere Leiste */}
        <div className="flex items-center border-b border-slate-100">
          <button
            onClick={() => handleTabChange('active')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-xs font-bold transition-all relative ${
              activeTab === 'active' 
                ? 'text-[#82a8a4]' 
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Briefcase size={14} />
            <span className="hidden sm:inline">Aktiv</span>
            <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${
              activeTab === 'active' ? 'bg-[#82a8a4]/10 text-[#82a8a4]' : 'bg-slate-100 text-slate-500'
            }`}>
              {counts.active}
            </span>
            {activeTab === 'active' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#82a8a4]" />
            )}
          </button>
          <button
            onClick={() => handleTabChange('won')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-xs font-bold transition-all relative ${
              activeTab === 'won' 
                ? 'text-[#82a8a4]' 
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Trophy size={14} />
            <span className="hidden sm:inline">Gewonnen</span>
            <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${
              activeTab === 'won' ? 'bg-[#82a8a4]/10 text-[#82a8a4]' : 'bg-slate-100 text-slate-500'
            }`}>
              {counts.won}
            </span>
            {activeTab === 'won' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#82a8a4]" />
            )}
          </button>
          <button
            onClick={() => handleTabChange('lost')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-xs font-bold transition-all relative ${
              activeTab === 'lost' 
                ? 'text-[#82a8a4]' 
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <XCircle size={14} />
            <span className="hidden sm:inline">Verloren</span>
            <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${
              activeTab === 'lost' ? 'bg-[#82a8a4]/10 text-[#82a8a4]' : 'bg-slate-100 text-slate-500'
            }`}>
              {counts.lost}
            </span>
            {activeTab === 'lost' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#82a8a4]" />
            )}
          </button>
        </div>

        {/* Suchleiste und Filter */}
        <div className="p-3 space-y-3">
          {/* Suchfeld */}
          <div className="flex gap-2 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input 
                type="text" 
                placeholder={`${activeTab === 'active' ? 'Aktive Projekte' : activeTab === 'won' ? 'Gewonnene Deals' : 'Verlorene Projekte'} durchsuchen...`} 
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#82a8a4]/20 focus:border-[#82a8a4] transition-all"
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>
          
          {/* Status-Filter (nur bei aktiven Projekten sichtbar) */}
          {activeTab === 'active' && (
            <div className="flex flex-wrap gap-1.5 items-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mr-1 flex items-center gap-1">
                <Filter size={10} />
              </span>
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
              {/* Filter zurücksetzen (nur wenn Filter aktiv) */}
              {selectedStatuses.length > 0 && (
                <button 
                  onClick={() => { setSelectedStatuses([]); setCurrentPage(1); }}
                  className="flex items-center justify-center w-5 h-5 text-red-400 hover:text-red-500 bg-red-50 rounded-md transition-colors ml-1"
                  title="Filter zurücksetzen"
                >
                  <X size={10} />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Haupt-Tabelle */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left table-fixed">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <th className="px-5 py-3 w-1/5">
                  <button 
                    onClick={() => handleSort('name')}
                    className="flex items-center hover:text-slate-600 transition-colors"
                  >
                    Projekt & Kunde <SortIcon column="name" />
                  </button>
                </th>
                <th className="px-5 py-3 w-1/5">
                  <button 
                    onClick={() => handleSort('capacity')}
                    className="flex items-center hover:text-slate-600 transition-colors"
                  >
                    Kapazität <SortIcon column="capacity" />
                  </button>
                </th>
                <th className="px-5 py-3 w-1/5">
                  <button 
                    onClick={() => handleSort('location')}
                    className="flex items-center hover:text-slate-600 transition-colors"
                  >
                    Standort <SortIcon column="location" />
                  </button>
                </th>
                <th className="px-5 py-3 w-1/5">
                  <button 
                    onClick={() => handleSort('status')}
                    className="flex items-center hover:text-slate-600 transition-colors"
                  >
                    Status <SortIcon column="status" />
                  </button>
                </th>
                <th className="px-5 py-3 w-1/5">
                  <button 
                    onClick={() => handleSort('created_at')}
                    className="flex items-center hover:text-slate-600 transition-colors"
                  >
                    Erstellt <SortIcon column="created_at" />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {sortedProjects.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-slate-400 text-xs font-medium italic">
                    Keine {activeTab === 'active' ? 'aktiven' : activeTab === 'won' ? 'gewonnenen' : 'verlorenen'} Projekte gefunden.
                  </td>
                </tr>
              ) : (
                paginatedProjects.map((project) => (
                  <tr 
                    key={project.id} 
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    onClick={() => onSelectProject(project)}
                  >
                    <td className="px-5 py-3">
                      <p className="text-xs font-bold text-slate-800 group-hover:text-[#82a8a4] transition-colors truncate">{project.name}</p>
                      <p className="text-[10px] text-slate-400 font-medium truncate">{project.company_name}</p>
                    </td>
                    <td className="px-5 py-3 text-xs font-bold text-slate-700">
                      {project.offered_capacity 
                        ? `${project.offered_capacity.toLocaleString('de-DE')} kWh` 
                        : project.estimated_capacity
                          ? <span className="text-slate-500 font-medium text-[11px]">{project.estimated_capacity} <span className="text-[9px] text-slate-400">(vorl.)</span></span>
                          : <span className="text-slate-300 font-normal italic text-[10px]">–</span>
                      }
                    </td>
                    <td className="px-5 py-3 text-xs font-medium text-slate-600 truncate">{project.location_city}</td>
                    <td className="px-5 py-3"><StatusBadge status={project.status} /></td>
                    <td className="px-5 py-3 text-xs font-medium text-slate-500">{formatDate(project.created_at)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {sortedProjects.length > 0 && (
          <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
            <span className="text-[10px] font-medium text-slate-500">
              {displayRange.start}–{displayRange.end} von {displayRange.total} Projekten
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-bold text-slate-500 hover:text-slate-700 bg-white border border-slate-200 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-slate-500"
              >
                <ChevronLeft size={12} /> Zurück
              </button>
              <span className="text-[10px] font-bold text-slate-600 px-2">
                Seite {currentPage} von {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-bold text-slate-500 hover:text-slate-700 bg-white border border-slate-200 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-slate-500"
              >
                Weiter <ChevronRight size={12} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjektUeberblick;
