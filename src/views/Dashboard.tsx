import React, { useState, useMemo, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { 
  TrendingUp, 
  Zap, 
  CheckCircle2, 
  Clock, 
  ArrowUpRight, 
  ArrowDownRight, 
  ChevronRight, 
  Briefcase, 
  Users, 
  Target, 
  Calendar, 
  Filter, 
  ArrowRight, 
  Loader2,
  Battery,
  FileText
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid 
} from 'recharts';
import { ViewType, Project, User, UserCompany } from '../types';
import { StatusBadge } from './projekte/ProjekteShared';

/**
 * Schnittstelle für die Dashboard-Props
 * @property onNavigate - Callback zum Wechseln der Hauptansicht
 * @property onNavigateToProject - Callback zum Springen in ein spezifisches Projekt
 * @property userProfile - Das Profil des aktuell eingeloggten Nutzers
 * @property userCompany - Die Unternehmensdaten des Nutzers
 */
interface DashboardProps {
  onNavigate: (view: ViewType) => void;
  onNavigateToProject: (projectId: string) => void;
  userProfile: User | null;
  userCompany: UserCompany | null;
}

/**
 * Kleine wiederverwendbare Karte für KPI-Kennzahlen
 */
const KPICard = ({ title, value, change, isPositive, icon }: any) => (
  <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
    <div className="flex justify-between items-start mb-3">
      <div className="p-2.5 rounded-xl bg-[#82a8a4]/10 text-[#82a8a4]">
        {icon}
      </div>
      {change && (
        <div className={`flex items-center text-[10px] font-bold ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
          {isPositive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
          {change}
        </div>
      )}
    </div>
    <h3 className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">{title}</h3>
    <p className="text-xl font-bold text-slate-800 mt-1">{value}</p>
  </div>
);

const Dashboard: React.FC<DashboardProps> = ({ 
  onNavigate, 
  onNavigateToProject, 
  userProfile, 
  userCompany 
}) => {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear.toString());
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  
  /**
   * Formatiert Kapazitätswerte in kWh-Strings (z.B. 1.500 kWh oder 2,5 MWh)
   */
  const formatCapacity = (value: number) => {
    if (!value || value === 0) return '- kWh';
    if (value >= 1000) return `${(value / 1000).toFixed(1).replace('.', ',')} MWh`;
    return `${value.toLocaleString('de-DE')} kWh`;
  };

  // Lädt alle Projekte des Unternehmens aus Supabase
  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!userProfile?.company_id) return;
      
      setLoading(true);
      try {
        const { data: projectsData, error: projectsError } = await supabase
          .from('project')
          .select('*')
          .eq('company_id', userProfile.company_id)
          .order('created_at', { ascending: false });

        if (projectsError) throw projectsError;
        setProjects(projectsData || []);

      } catch (error) {
        console.error('Fehler beim Laden der Dashboard-Daten:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [userProfile]);

  /**
   * Berechnet die Daten für den monatlichen Kapazitätsverlauf (BarChart)
   * Berücksichtigt nur gewonnene Projekte im ausgewählten Jahr.
   */
  const capacityTrendData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
    const data = months.map(m => ({ month: m, capacity: 0 }));
    
    const filteredForYear = projects.filter(p => 
      p.dealstage === 'Gewonnen' && 
      p.estimated_order_date && 
      new Date(p.estimated_order_date).getFullYear() === parseInt(selectedYear)
    );

    filteredForYear.forEach(p => {
      if (p.estimated_order_date) {
        const monthIdx = new Date(p.estimated_order_date).getMonth();
        data[monthIdx].capacity += (p.offered_capacity || 0);
      }
    });

    return data;
  }, [projects, selectedYear]);

  /**
   * Berechnet die Verteilung der Projekte über die Pipeline-Phasen (Funnel)
   * Trennt aktive Phasen (mit Balken) von abgeschlossenen (nur Zähler)
   */
  const funnelData = useMemo(() => {
    const statusCounts = projects.reduce((acc, p) => {
      acc[p.dealstage] = (acc[p.dealstage] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Nur aktive Phasen für den Funnel mit Balken
    const activePipeline = [
      { status: 'Eingangsprüfung', count: statusCounts['Eingangsprüfung'] || 0 },
      { status: 'Technische Klärung', count: statusCounts['Technische Klärung'] || 0 },
      { status: 'Angebotsklärung', count: statusCounts['Angebotsklärung'] || 0 },
      { status: 'Closing', count: statusCounts['Closing'] || 0 },
    ];

    // Abgeschlossene Projekte separat (nur Anzahl)
    const completed = {
      won: statusCounts['Gewonnen'] || 0,
      lost: statusCounts['Verloren'] || 0,
    };

    // Gesamtzahl aktiver Projekte für Prozentberechnung
    const totalActive = activePipeline.reduce((sum, p) => sum + p.count, 0);

    return { activePipeline, completed, totalActive };
  }, [projects]);

  /**
   * Berechnet globale Statistiken (KPIs) basierend auf dem Projektstand
   */
  const stats = useMemo(() => {
    const wonCount = projects.filter(p => p.dealstage === 'Gewonnen').length;
    const lostCount = projects.filter(p => p.dealstage === 'Verloren').length;
    const totalFinished = wonCount + lostCount;
    
    // Abschlussquote (Gewonnen vs. Verloren)
    const closingRate = totalFinished > 0 
      ? ((wonCount / totalFinished) * 100).toFixed(1) + '%' 
      : '-%';

    // Aktive Projekte (nicht gewonnen/verloren)
    const activeProjects = projects.filter(p => p.dealstage !== 'Gewonnen' && p.dealstage !== 'Verloren');
    const activeCount = activeProjects.length;

    // Laufende Angebote: Aktive Projekte mit eingetragener Kapazität
    const activeWithOffer = activeProjects.filter(p => p.offered_capacity && p.offered_capacity > 0);
    const runningOffersCount = activeWithOffer.length;

    // Angebotsvolumen: Summe der angebotenen Kapazität aktiver Projekte
    const offerVolume = activeWithOffer.reduce((sum, p) => sum + (p.offered_capacity || 0), 0);

    // Ø Projektkapazität: Nur aktive Projekte mit Angebot
    const avgActiveCapacity = runningOffersCount > 0 
      ? offerVolume / runningOffersCount 
      : 0;

    return {
      activeCount,
      runningOffersCount,
      offerVolume,
      avgActiveCapacity,
      closingRate
    };
  }, [projects]);

  /**
   * Berechnet die Jahreskapazität für das ausgewählte Jahr (gewonnene Deals)
   */
  const yearCapacity = useMemo(() => {
    return projects
      .filter(p => 
        p.dealstage === 'Gewonnen' && 
        p.estimated_order_date && 
        new Date(p.estimated_order_date).getFullYear() === parseInt(selectedYear)
      )
      .reduce((sum, p) => sum + (p.offered_capacity || 0), 0);
  }, [projects, selectedYear]);

  // Ladezustand anzeigen, wenn noch keine Daten da sind
  if (loading && projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-10 h-10 text-[#82a8a4] animate-spin mb-4" />
        <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Dashboard wird geladen...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Willkommens-Bereich */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Willkommen zurück, {userProfile?.fname}!</h2>
          <p className="text-sm text-slate-500">Performance-Übersicht für {userCompany?.name}</p>
        </div>
      </div>

      {/* KPI-Grid (4 Spalten) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard 
          title="Aktive Projekte" 
          value={stats.activeCount} 
          icon={<Briefcase size={20} />} 
        />
        <KPICard 
          title="Laufende Angebote" 
          value={stats.runningOffersCount} 
          icon={<FileText size={20} />} 
        />
        <KPICard 
          title="Angebotsvolumen" 
          value={formatCapacity(stats.offerVolume)} 
          icon={<Target size={20} />} 
        />
        <KPICard 
          title="Ø Projektkapazität" 
          value={formatCapacity(stats.avgActiveCapacity)} 
          icon={<Zap size={20} />} 
        />
      </div>

      {/* Hauptgrafiken */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Linke Seite: Monatlicher Kapazitätsverlauf */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col hover:shadow-md transition-shadow">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Monatsverlauf abgeschlossener Aufträge</h3>
            <div className="flex items-center gap-3">
              {/* Jahressumme */}
              <div className="flex items-center gap-2 px-3 py-1.5 bg-[#82a8a4]/10 rounded-lg">
                <span className="text-[10px] font-bold text-slate-500">Summe:</span>
                <span className="text-[10px] font-bold text-[#82a8a4]">{formatCapacity(yearCapacity)}</span>
              </div>
              {/* Jahresfilter */}
              <div className="relative">
                <select 
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="pl-3 pr-8 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600 outline-none focus:ring-2 focus:ring-[#82a8a4]/20 appearance-none cursor-pointer"
                >
                  <option value={(currentYear - 2).toString()}>{(currentYear - 2)}</option>
                  <option value={(currentYear - 1).toString()}>{(currentYear - 1)}</option>
                  <option value={currentYear.toString()}>{currentYear}</option>
                </select>
                <Calendar className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={12} />
              </div>
            </div>
          </div>
          {/* Chart-Container */}
          <div className="h-[400px] w-full mt-auto">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={capacityTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#82a8a4" stopOpacity={1} />
                    <stop offset="100%" stopColor="#82a8a4" stopOpacity={0.6} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="month" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fontSize: 10, fill: '#94a3b8', fontWeight: 600}} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fontSize: 10, fill: '#94a3b8', fontWeight: 600}} 
                  tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(1)}M` : v} 
                  unit=" kWh"
                />
                <Tooltip 
                  cursor={{fill: '#f8fafc', radius: 8}}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-white p-3 shadow-xl rounded-2xl border border-slate-50 animate-in fade-in zoom-in duration-200">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{payload[0].payload.month}</p>
                          <p className="text-sm font-bold text-slate-800">{formatCapacity(payload[0].value as number)}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar 
                  dataKey="capacity" 
                  fill="url(#barGradient)" 
                  radius={[6, 6, 0, 0]} 
                  barSize={32}
                  name="Kapazität (kWh)" 
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Rechte Seite: Pipeline Funnel & Abschlussquote */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col hover:shadow-md transition-shadow">
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-5">Pipeline Funnel</h3>
          
          {/* Aktive Pipeline-Phasen mit Balken */}
          <div className="flex-1 space-y-3">
            {funnelData.activePipeline.map((item: any, i: number) => {
              const percentage = funnelData.totalActive > 0 ? (item.count / funnelData.totalActive) * 100 : 0;
              const barColors: Record<string, string> = {
                'Eingangsprüfung': 'bg-[#82a8a4]/40',
                'Technische Klärung': 'bg-[#82a8a4]/60',
                'Angebotsklärung': 'bg-[#82a8a4]/80',
                'Closing': 'bg-[#82a8a4]',
              };

              return (
                <div key={i} className="group cursor-default">
                  <div className="flex justify-between items-end mb-1 px-0.5">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight leading-none mb-0.5">
                        {item.status}
                      </span>
                      <span className="text-[9px] font-medium text-slate-400">
                        {item.count} {item.count === 1 ? 'Projekt' : 'Projekte'}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-slate-800 tabular-nums">
                      {percentage.toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-2.5 w-full bg-slate-50 rounded-lg overflow-hidden border border-slate-100/50 p-[1px]">
                    <div 
                      className={`h-full rounded-md transition-all duration-1000 ease-out shadow-sm ${barColors[item.status] || 'bg-[#82a8a4]'}`}
                      style={{ 
                        width: `${percentage}%`,
                        opacity: funnelData.totalActive > 0 ? 0.8 + (percentage / 100) * 0.2 : 1
                      }}
                    >
                      <div className="w-full h-full bg-gradient-to-r from-white/10 to-transparent"></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Abgeschlossene Projekte - nur Zähler */}
          <div className="mt-5 pt-5 border-t border-slate-100 grid grid-cols-2 gap-3">
            <div className="bg-slate-50 rounded-xl p-3 text-center">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Gewonnen</p>
              <p className="text-lg font-bold text-[#82a8a4]">{funnelData.completed.won}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3 text-center">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Verloren</p>
              <p className="text-lg font-bold text-slate-500">{funnelData.completed.lost}</p>
            </div>
          </div>

          {/* Abschlussquote */}
          <div className="mt-4 pt-4 border-t border-slate-50 text-center">
             <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Abschlussquote</p>
             <p className="text-xl font-bold text-slate-800">{stats.closingRate}</p>
          </div>
        </div>
      </div>

      {/* Sektion: Neueste Projekte (Kurzübersicht) */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-shadow">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center">
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ihre neuesten Projekte</h3>
          <button 
            onClick={() => onNavigate('projekte')}
            className="text-[10px] font-bold text-[#82a8a4] hover:underline flex items-center gap-1 uppercase tracking-widest"
          >
            Alle Projekte <ArrowRight size={14} />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left table-fixed">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <th className="px-6 py-4 w-1/5">Projekt & Kunde</th>
                <th className="px-6 py-4 w-1/5">Angebotene Kapazität</th>
                <th className="px-6 py-4 w-1/5">Standort</th>
                <th className="px-6 py-4 w-1/5">Status</th>
                <th className="px-6 py-4 w-1/5">Erstellt am</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {projects.filter(p => p.dealstage !== 'Gewonnen' && p.dealstage !== 'Verloren').length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-400 text-xs">Noch keine aktiven Projekte vorhanden.</td>
                </tr>
              ) : (
                projects
                  .filter(p => p.dealstage !== 'Gewonnen' && p.dealstage !== 'Verloren')
                  .slice(0, 4)
                  .map((p) => (
                    <tr 
                      key={p.id} 
                      onClick={() => onNavigateToProject(p.id)}
                      className="hover:bg-slate-50 transition-colors group cursor-pointer"
                    >
                      <td className="px-6 py-4">
                        <p className="text-xs font-bold text-slate-800 group-hover:text-[#82a8a4] transition-colors">{p.name}</p>
                        <p className="text-[10px] text-slate-400 font-medium">{p.unternehmen_name}</p>
                      </td>
                      <td className="px-6 py-4 text-xs font-bold text-slate-700">
                        {p.offered_capacity 
                          ? `${p.offered_capacity.toLocaleString('de-DE')} kWh` 
                          : p.estimated_capacity
                            ? <span className="text-slate-500 font-medium">{p.estimated_capacity} <span className="text-[10px] text-slate-400">(vorl.)</span></span>
                            : <span className="text-slate-300 font-normal italic text-[10px]">Keine Angabe</span>
                        }
                      </td>
                      <td className="px-6 py-4 text-xs font-medium text-slate-600">{p.location_city}</td>
                      <td className="px-6 py-4">
                        <StatusBadge status={p.dealstage} />
                      </td>
                      <td className="px-6 py-4 text-xs font-medium text-slate-500">{new Date(p.created_at).toLocaleDateString('de-DE')}</td>
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

export default Dashboard;
