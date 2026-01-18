import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { 
  ChevronLeft, 
  Building, 
  Navigation, 
  Clock, 
  Pencil, 
  CalendarClock, 
  User, 
  Mail, 
  Phone, 
  Globe, 
  ExternalLink 
} from 'lucide-react';
import { Project } from '../../types';
import { StatusBadge, PipelineVisualizer } from './ProjekteShared';

/**
 * Props für die ProjektDetail-Komponente
 * @property project - Das anzuzeigende Projekt-Objekt
 * @property onBack - Callback-Funktion, um zur Übersicht zurückzukehren
 */
interface ProjektDetailProps {
  project: Project;
  onBack: () => void;
}

const ProjektDetail: React.FC<ProjektDetailProps> = ({ project, onBack }) => {
  
  // Effekt für die Konfetti-Animation bei gewonnenen Projekten
  useEffect(() => {
    // Nur auslösen, wenn das Projekt den Status 'Gewonnen' hat
    if (project.status === 'Gewonnen') {
      const duration = 3 * 1000; // 3 Sekunden Animationsdauer
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

      // Hilfsfunktion für zufällige Zahlen in einem Bereich
      const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

      // Intervall startet alle 250ms neue Konfetti-Explosionen
      const interval: any = setInterval(function() {
        const timeLeft = animationEnd - Date.now();

        // Wenn Zeit abgelaufen, Intervall stoppen
        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        // Partikelanzahl nimmt über die Zeit ab
        const particleCount = 50 * (timeLeft / duration);
        
        // Konfetti von der linken Seite
        confetti({ 
          ...defaults, 
          particleCount, 
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
          colors: ['#82a8a4', '#fbbf24', '#ffffff'] // Voltfang-Farben
        });
        
        // Konfetti von der rechten Seite
        confetti({ 
          ...defaults, 
          particleCount, 
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
          colors: ['#82a8a4', '#fbbf24', '#ffffff']
        });
      }, 250);

      // Cleanup: Intervall löschen, wenn Komponente unmountet
      return () => clearInterval(interval);
    }
  }, [project.id, project.status]); // Reagiert auf ID oder Status-Änderung

  /**
   * Hilfsfunktion zur Formatierung von Datums-Strings ins deutsche Format
   */
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'noch offen';
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-right-4 duration-300 pb-12">
      {/* Zurück-Button */}
      <button 
        onClick={onBack}
        className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
      >
        <ChevronLeft size={16} /> Zurück zur Übersicht
      </button>

      {/* --- HEADER KARTE --- */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-white to-slate-50/50">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            {/* Projekt-Name und Basis-Infos */}
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 bg-[#82a8a4]/10 rounded-2xl flex items-center justify-center text-[#82a8a4]">
                 <Building size={28} strokeWidth={1.5} />
              </div>
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h2 className="text-xl font-bold text-slate-800 tracking-tight">{project.name}</h2>
                  <StatusBadge status={project.status} />
                </div>
                <div className="flex items-center gap-5 text-slate-500 text-xs font-medium">
                   <div className="flex items-center gap-1.5">
                     <Navigation size={12} className="text-[#82a8a4]" />
                     {project.location_city}, {project.location_country}
                   </div>
                </div>
              </div>
            </div>
            {/* Bearbeiten-Button (Platzhalter) */}
            <div className="flex gap-2">
              <button 
                className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 text-slate-400 rounded-xl hover:text-[#82a8a4] hover:border-[#82a8a4] transition-all active:scale-90"
                title="Projekt bearbeiten"
              >
                <Pencil size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* --- PIPELINE ABSCHNITT (Visualisierung des Fortschritts) --- */}
        <div className="px-8 py-8 bg-slate-50/30 border-b border-slate-100">
           <div className="max-w-4xl mx-auto">
             <div className="flex justify-between items-center mb-6 px-4">
                <h3 className="font-bold text-[9px] text-slate-400 uppercase tracking-[0.2em]">Pipeline Progress</h3>
             </div>
             <PipelineVisualizer status={project.status} />
           </div>
        </div>

        {/* --- HAUPTINHALT (Zwei-Spalten-Layout) --- */}
        <div className="p-10 bg-white">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-20 gap-y-12">
            
            {/* --- LINKE SPALTE: UNTERNEHMEN & KONTAKT --- */}
            <div className="space-y-10">
              {/* Unternehmensinfo */}
              <section className="space-y-5">
                <div className="flex items-center gap-3 border-b border-slate-50 pb-3">
                  <div className="w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center text-[#82a8a4]">
                    <Building size={14} />
                  </div>
                  <h3 className="font-bold text-[10px] text-slate-400 uppercase tracking-widest">Unternehmensinformationen</h3>
                </div>
                <div className="pl-10">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-bold text-slate-400 uppercase mb-1">Unternehmensname</span>
                    <a href={project.website} target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-[#82a8a4] hover:underline flex items-center gap-1.5 group/link">
                       {project.company_name} 
                       <ExternalLink size={12} className="opacity-0 group-hover/link:opacity-100 transition-opacity" />
                    </a>
                  </div>
                </div>
              </section>

              {/* Externer Ansprechpartner (Kunde) */}
              <section className="space-y-5">
                <div className="flex items-center gap-3 border-b border-slate-50 pb-3">
                  <div className="w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center text-[#82a8a4]">
                    <User size={14} />
                  </div>
                  <h3 className="font-bold text-[10px] text-slate-400 uppercase tracking-widest">Ansprechpartner (Extern)</h3>
                </div>
                <div className="pl-10 space-y-4">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-bold text-slate-400 uppercase mb-1">Name</span>
                    <span className="text-xs font-bold text-slate-700">{project.contact_fname} {project.contact_lname}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] font-bold text-slate-400 uppercase mb-1">Kontakt</span>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
                        <Mail size={14} className="text-[#82a8a4]/50" /> {project.contact_email}
                      </div>
                      <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
                        <Phone size={14} className="text-[#82a8a4]/50" /> {project.contact_phone || 'Keine Angabe'}
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Voltfang interner Ansprechpartner */}
              <section className="space-y-5">
                <div className="flex items-center gap-3 border-b border-slate-50 pb-3">
                  <div className="w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center text-[#82a8a4]">
                    <User size={14} />
                  </div>
                  <h3 className="font-bold text-[10px] text-slate-400 uppercase tracking-widest">Ansprechpartner (Voltfang)</h3>
                </div>
                <div className="pl-10">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-bold text-slate-400 uppercase mb-1">Name</span>
                    <span className="text-xs font-bold text-slate-700">
                      {project.vf_contact_name || 'Wird intern vergeben...'}
                    </span>
                  </div>
                </div>
              </section>
            </div>

            {/* --- RECHTE SPALTE: PLANUNG & STANDORT --- */}
            <div className="space-y-10">
              {/* Projektplanung (Daten & Volumen) */}
              <section className="space-y-5">
                <div className="flex items-center gap-3 border-b border-slate-50 pb-3">
                  <div className="w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center text-[#82a8a4]">
                    <CalendarClock size={14} />
                  </div>
                  <h3 className="font-bold text-[10px] text-slate-400 uppercase tracking-widest">Projektplanung</h3>
                </div>
                <div className="pl-10 space-y-5">
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Erstellungsdatum</span>
                    <p className="text-xs font-bold text-slate-800">{formatDate(project.created_at)}</p>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Vorauss. Bestelldatum</span>
                    <p className="text-xs font-bold text-slate-800">{formatDate(project.estimated_order_date)}</p>
                  </div>
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Kapazität</span>
                      <p className="text-xs font-bold text-slate-800">{project.estimated_capacity || 'Keine Angabe'}</p>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Auftragsvolumen</span>
                      <p className="text-xs font-bold text-slate-800">
                        {project.volume ? `${project.volume.toLocaleString('de-DE')} €` : 'Kein Angebot gesendet'}
                      </p>
                    </div>
                </div>
              </section>

              {/* Standortdetails */}
              <section className="space-y-5">
                <div className="flex items-center gap-3 border-b border-slate-50 pb-3">
                  <div className="w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center text-[#82a8a4]">
                    <Navigation size={14} />
                  </div>
                  <h3 className="font-bold text-[10px] text-slate-400 uppercase tracking-widest">Standortdetails</h3>
                </div>
                <div className="pl-10">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-bold text-slate-400 uppercase mb-1">Anschrift</span>
                    <p className="text-xs font-bold text-slate-700 leading-relaxed">
                      {project.location_street}<br />
                      {project.location_zip} {project.location_city}<br />
                      {project.location_country}
                    </p>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>

      {/* --- KARTEN ABSCHNITT (Google Maps Integration) --- */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/20">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center text-[#82a8a4] shadow-sm border border-slate-100">
              <Globe size={18} />
            </div>
            <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider">Kartenansicht & Umgebung</h3>
          </div>
          {/* Externer Link zu Google Maps */}
          <button className="px-4 py-2 text-[9px] font-bold text-[#82a8a4] uppercase bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-all flex items-center gap-2">
            <ExternalLink size={10} /> Google Maps
          </button>
        </div>
        <div className="relative h-[400px] w-full group">
            {/* Einbettung der Karte via iFrame basierend auf den Adressdaten */}
            <iframe
              width="100%"
              height="100%"
              frameBorder="0"
              style={{ border: 0 }}
              src={`https://maps.google.com/maps?q=${encodeURIComponent(project.location_street + '+' + project.location_zip + '+' + project.location_city)}&t=h&z=17&ie=UTF8&iwloc=&output=embed`}
              allowFullScreen
              loading="lazy"
              className="grayscale-[0.3] group-hover:grayscale-0 transition-all duration-1000"
            ></iframe>
        </div>
      </div>
    </div>
  );
};

export default ProjektDetail;
