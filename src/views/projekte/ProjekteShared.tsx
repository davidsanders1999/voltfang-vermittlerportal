import React from 'react';
import { ProjectStatus } from '../../types';
import { CheckCircle2, XCircle, Crown } from 'lucide-react';

/**
 * Liste aller möglichen Projekt-Status in der korrekten Reihenfolge
 */
export const ALL_PROJECT_STATUSES: ProjectStatus[] = [
  'Lead übergeben',
  'Technische Klärung',
  'Vertragliche Klärung',
  'Closing',
  'Gewonnen',
  'Verloren',
];

/**
 * Phasen, die im Standard-Pipeline-Visualizer (oben auf der Detailseite) angezeigt werden
 */
export const PIPELINE_PHASES = ALL_PROJECT_STATUSES.slice(0, 5);

/**
 * Tailwind-Klassen für die farbliche Gestaltung der Status-Badges
 */
export const STATUS_STYLES: Record<ProjectStatus, string> = {
  'Gewonnen': 'bg-green-100 text-green-700 border-green-200',
  'Verloren': 'bg-red-100 text-red-700 border-red-200',
  'Closing': 'bg-blue-100 text-blue-700 border-blue-200',
  'Technische Klärung': 'bg-amber-100 text-amber-700 border-amber-200',
  'Vertragliche Klärung': 'bg-purple-100 text-purple-700 border-purple-200',
  'Lead übergeben': 'bg-slate-100 text-slate-700 border-slate-200',
};

/**
 * Wiederverwendbare Badge-Komponente für den Projektstatus
 * @property status - Der aktuelle Status des Projekts
 * @property active - Falls false, wird die Badge ausgegraut (für Filter)
 * @property onClick - Optionaler Klick-Handler
 */
export const StatusBadge: React.FC<{ 
  status: ProjectStatus; 
  active?: boolean; 
  onClick?: () => void; 
}> = ({ status, active = true, onClick }) => {
  return (
    <button 
      disabled={!onClick}
      onClick={onClick}
      className={`
        px-2 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider border transition-all
        ${STATUS_STYLES[status]}
        ${!active ? 'opacity-30 grayscale' : 'opacity-100'}
        ${onClick ? 'hover:scale-105 active:scale-95 cursor-pointer' : 'cursor-default'}
      `}
    >
      {status}
    </button>
  );
};

/**
 * Visualisiert den Fortschritt eines Projekts als horizontale Stepper-Leiste
 * @property status - Der aktuelle Status des Projekts
 */
export const PipelineVisualizer = ({ status }: { status: ProjectStatus }) => {
  const isLost = status === 'Verloren';
  const isWon = status === 'Gewonnen';
  
  // Wenn verloren, zeigen wir 'Verloren' als letzten Schritt an, sonst die normalen Phasen
  const phases = isLost ? [...PIPELINE_PHASES.slice(0, 4), 'Verloren'] : PIPELINE_PHASES;
  const currentIndex = phases.indexOf(status);

  return (
    <div className="w-full py-4">
      <div className="flex items-center justify-between w-full relative">
        {/* Hintergrund-Linie */}
        <div className="absolute top-5 left-0 w-full h-0.5 bg-slate-100 -z-0"></div>
        
        {/* Einzelne Phasen-Icons */}
        {phases.map((phase, idx) => {
          const isCompleted = idx < currentIndex;
          const isActive = idx === currentIndex;
          const isPhaseWon = phase === 'Gewonnen' && isActive;

          return (
            <div key={phase} className="relative z-10 flex flex-col items-center flex-1">
              <div className={`
                w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-700
                ${isPhaseWon ? 'bg-yellow-400 border-yellow-500 text-white animate-gold shadow-lg shadow-yellow-200' : 
                  isActive ? (isLost ? 'bg-red-500 border-red-500 text-white shadow-lg shadow-red-200' : 'bg-[#82a8a4] border-[#82a8a4] text-white shadow-lg shadow-[#82a8a4]/30') : 
                  isCompleted ? 'bg-slate-800 border-slate-800 text-white' : 
                  'bg-white border-slate-200 text-slate-300'}
              `} style={{ transitionDelay: `${idx * 150}ms` }}>
                {/* Symbol-Logik: Krone für gewonnen, Haken für erledigt, X für verloren, sonst Nummer */}
                {isPhaseWon ? <Crown size={20} fill="currentColor" /> : 
                 isCompleted ? <CheckCircle2 size={18} /> : 
                 (phase === 'Verloren' ? <XCircle size={18} /> : <span className="text-xs font-bold">{idx + 1}</span>)}
              </div>
              
              {/* Phasen-Beschriftung */}
              <p className={`
                mt-3 text-[9px] font-bold uppercase tracking-tight text-center px-2 transition-colors duration-500
                ${isPhaseWon ? 'text-yellow-600' : 
                  isActive ? (isLost ? 'text-red-500' : 'text-[#82a8a4]') : 
                  isCompleted ? 'text-slate-800' : 'text-slate-400'}
              `} style={{ transitionDelay: `${idx * 150}ms` }}>
                {phase}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
