import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { Project, User } from '../types';
import ProjektUeberblick from './projekte/ProjektUeberblick';
import ProjektFormular from './projekte/ProjektFormular';
import ProjektDetail from './projekte/ProjektDetail';

interface ProjekteProps {
  initialProjectId?: string | null;
  userProfile: User | null;
}

const Projekte: React.FC<ProjekteProps> = ({ initialProjectId, userProfile }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchProjects = async () => {
    if (!userProfile?.company_id) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('project')
        .select('*')
        .eq('company_id', userProfile.company_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProjects(data || []);
      
      // Falls eine initialProjectId übergeben wurde, das entsprechende Projekt selektieren
      if (initialProjectId && data) {
        const project = data.find(p => p.id === initialProjectId);
      if (project) {
        setSelectedProject(project);
      }
    }
    } catch (error) {
      console.error('Fehler beim Laden der Projekte:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [initialProjectId]);

  if (loading && projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-[#82a8a4]/20 border-t-[#82a8a4] rounded-full animate-spin mb-4"></div>
        <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Projekte werden geladen...</p>
      </div>
    );
  }

  if (showForm) {
    return (
      <ProjektFormular 
        userCompanyId={userProfile?.company_id || null}
        onBack={() => setShowForm(false)} 
        onSubmit={() => {
          setShowForm(false);
          fetchProjects();
        }} 
      />
    );
  }

  if (selectedProject) {
    return (
      <ProjektDetail 
        project={selectedProject} 
        onBack={() => setSelectedProject(null)} 
      />
    );
  }

  return (
    <ProjektUeberblick 
      projects={projects}
      onSelectProject={setSelectedProject}
      onCreateProject={() => setShowForm(true)}
    />
  );
};

export default Projekte;
