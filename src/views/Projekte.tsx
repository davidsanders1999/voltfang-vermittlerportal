import React, { useState, useEffect } from 'react';
import { Project, User } from '../types';
import ProjektUeberblick from './projekte/ProjektUeberblick';
import ProjektFormular from './projekte/ProjektFormular';
import ProjektDetail from './projekte/ProjektDetail';
import { getHubSpotContext } from '../utils/hubspotProjectsApi';

/**
 * Schnittstelle für die Projekte-Komponente
 * @property initialProjectId - Optionale ID eines Projekts, das direkt beim Laden angezeigt werden soll
 * @property userProfile - Das Profil des aktuell eingeloggten Nutzers
 */
interface ProjekteProps {
  initialProjectId?: string | null;
  userProfile: User | null;
}

/**
 * Haupt-Container für die Projekt-Verwaltung. 
 * Steuert die Navigation zwischen Liste, Detail-Ansicht und Formular.
 */
const Projekte: React.FC<ProjekteProps> = ({ initialProjectId, userProfile }) => {
  // Zentraler State für die Projekte-Liste
  const [projects, setProjects] = useState<Project[]>([]);
  
  // Navigation State: Welches Projekt wird gerade im Detail angesehen?
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  
  // Navigation State: Wird das Formular zum Erstellen gerade angezeigt?
  const [showForm, setShowForm] = useState(false);
  
  const [loading, setLoading] = useState(true);

  const getProjectsCacheKey = () =>
    userProfile?.company_id ? `hubspot_context_projects_${userProfile.company_id}` : null;

  /**
   * Lädt alle Projekte des Unternehmens aus der Supabase 'project' Tabelle
   */
  const fetchProjects = async (showLoading = true) => {
    if (!userProfile?.company_id) return;

    if (showLoading) setLoading(true);
    try {
      const context = await getHubSpotContext();
      const data = context?.projects || [];
      setProjects(data);
      const cacheKey = getProjectsCacheKey();
      if (cacheKey) {
        sessionStorage.setItem(cacheKey, JSON.stringify(data));
      }
      
      // Logik für Deep-Linking (falls initialProjectId vorhanden)
      if (initialProjectId) {
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

  // Projekte laden, sobald die Komponente gemountet wird
  useEffect(() => {
    const cacheKey = getProjectsCacheKey();
    let hasCachedProjects = false;
    if (cacheKey) {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        try {
          const parsed = JSON.parse(cached) as Project[];
          setProjects(parsed);
          setLoading(false);
          hasCachedProjects = parsed.length > 0;
          if (initialProjectId) {
            const project = parsed.find((p) => p.id === initialProjectId);
            if (project) setSelectedProject(project);
          }
        } catch {
          // Ignorieren und normal frisch laden.
        }
      }
    }

    // Hintergrund-Refresh: wenn Cache da ist ohne harten Loader.
    fetchProjects(!hasCachedProjects);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialProjectId, userProfile?.company_id]);

  // Ladeanzeige
  if (loading && projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-[#82a8a4]/20 border-t-[#82a8a4] rounded-full animate-spin mb-4"></div>
        <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Projekte werden geladen...</p>
      </div>
    );
  }

  // Bedingtes Rendering: Formular anzeigen
  if (showForm) {
    return (
      <ProjektFormular 
        userCompanyId={userProfile?.company_id || null}
        userId={userProfile?.id || null}
        onBack={() => setShowForm(false)} 
        onSubmit={() => {
          setShowForm(false);
          fetchProjects(false); // Nach erfolgreichem Erstellen Liste neu laden
        }} 
      />
    );
  }

  // Bedingtes Rendering: Detailansicht anzeigen
  if (selectedProject) {
    return (
      <ProjektDetail 
        project={selectedProject} 
        onBack={() => setSelectedProject(null)} 
      />
    );
  }

  // Standard: Projekt-Überblick (Liste) anzeigen
  return (
    <ProjektUeberblick 
      projects={projects}
      onSelectProject={setSelectedProject}
      onCreateProject={() => setShowForm(true)}
    />
  );
};

export default Projekte;
