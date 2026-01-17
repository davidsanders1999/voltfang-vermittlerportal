import React, { useState, useMemo } from 'react';
import { Search, Filter, Plus, X } from 'lucide-react';
import { Project, ProjectStatus } from '../../types';
import { StatusBadge, ALL_PROJECT_STATUSES } from './ProjekteShared';

interface ProjektUeberblickProps {
  projects: Project[];
  onSelectProject: (project: Project) => void;
  onCreateProject: () => void;
}

const ProjektUeberblick: React.FC<ProjektUeberblickProps> = ({ 
  projects, 
  onSelectProject, 
  onCreateProject 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatuses, setSelectedStatuses] = useState<ProjectStatus[]>([]);

  const toggleStatus = (status: ProjectStatus) => {
    setSelectedStatuses(prev => 
      prev.includes(status) 
        ? prev.filter(s => s !== status) 
        : [...prev, status]
    );
  };

  const filteredProjects = useMemo(() => {
    return projects.filter(project => {
      const matchesSearch = 
        project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.location_city.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = 
        selectedStatuses.length === 0 || 
        selectedStatuses.includes(project.status);

      return matchesSearch && matchesStatus;
    });
  }, [projects, searchTerm, selectedStatuses]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
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

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 space-y-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input 
              type="text" 
              placeholder="Suchen nach Name, Kunde oder Stadt..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-medium focus:outline-none focus:border-[#82a8a4] transition-all"
            />
          </div>
          {selectedStatuses.length > 0 && (
            <button 
              onClick={() => setSelectedStatuses([])}
              className="flex items-center gap-1 px-3 py-2 text-[10px] font-bold text-red-400 hover:text-red-500 transition-colors uppercase tracking-widest"
            >
              <X size={12} /> Filter zurücksetzen
            </button>
          )}
        </div>
        
        <div className="flex flex-wrap gap-2 items-center pt-2 border-t border-slate-50">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mr-2 flex items-center gap-1">
            <Filter size={10} /> Status Filter:
          </span>
          <div className="flex flex-wrap gap-2">
            {ALL_PROJECT_STATUSES.map(status => (
              <StatusBadge 
                key={status} 
                status={status} 
                active={selectedStatuses.length === 0 || selectedStatuses.includes(status)}
                onClick={() => toggleStatus(status)}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <th className="px-6 py-4">Projekt & Kunde</th>
                <th className="px-6 py-4">Standort</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Erstellt am</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProjects.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-400 text-sm font-medium">
                    Keine Projekte gefunden.
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
