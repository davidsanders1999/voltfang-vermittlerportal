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
  Loader2
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

interface DashboardProps {
  onNavigate: (view: ViewType) => void;
  onNavigateToProject: (projectId: string) => void;
  userProfile: User | null;
  userCompany: UserCompany | null;
}

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
  
  const formatCurrency = (value: number) => {
    if (!value || value === 0) return '- €';
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)} Mio. €`;
    return `${value.toLocaleString('de-DE')} €`;
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!userProfile?.company_id) return;
      
      setLoading(true);
      try {
        // Hole Projekte des aktuellen Partners
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

  const revenueTrendData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
    const data = months.map(m => ({ month: m, rev: 0 }));
    
    const filteredForYear = projects.filter(p => 
      p.status === 'Gewonnen' && 
      p.estimated_order_date && 
      new Date(p.estimated_order_date).getFullYear() === parseInt(selectedYear)
    );

    filteredForYear.forEach(p => {
      if (p.estimated_order_date) {
        const monthIdx = new Date(p.estimated_order_date).getMonth();
        data[monthIdx].rev += (p.volume || 0);
      }
    });

    return data;
  }, [projects, selectedYear]);

  const funnelData = useMemo(() => {
    const statusCounts = projects.reduce((acc, p) => {
      acc[p.status] = (acc[p.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return [
      { status: 'Lead übergeben', count: statusCounts['Lead übergeben'] || 0 },
      { status: 'Technische Klärung', count: statusCounts['Technische Klärung'] || 0 },
      { status: 'Vertragliche Klärung', count: statusCounts['Vertragliche Klärung'] || 0 },
      { status: 'Closing', count: statusCounts['Closing'] || 0 },
      { status: 'Gewonnen', count: statusCounts['Gewonnen'] || 0 },
      { status: 'Verloren', count: statusCounts['Verloren'] || 0 },
    ];
  }, [projects]);

  const stats = useMemo(() => {
    const wonCount = projects.filter(p => p.status === 'Gewonnen').length;
    const lostCount = projects.filter(p => p.status === 'Verloren').length;
    const totalFinished = wonCount + lostCount;
    
    const closingRate = totalFinished > 0 
      ? ((wonCount / totalFinished) * 100).toFixed(1) + '%' 
      : '-%';

    const pipelineValue = projects
      .filter(p => p.status !== 'Gewonnen' && p.status !== 'Verloren')
      .reduce((sum, p) => sum + (p.volume || 0), 0);

    const volumeCurrentYear = projects
      .filter(p => new Date(p.created_at).getFullYear() === currentYear)
      .reduce((sum, p) => sum + (p.volume || 0), 0);

    const volumePrevYear = projects
      .filter(p => new Date(p.created_at).getFullYear() === currentYear - 1)
      .reduce((sum, p) => sum + (p.volume || 0), 0);

    const volumeChange = volumePrevYear > 0 
      ? ((volumeCurrentYear - volumePrevYear) / volumePrevYear * 100).toFixed(1) + '%' 
      : null;
    
    const isVolumePositive = volumeCurrentYear >= volumePrevYear;

    const projectsWithVolume = projects.filter(p => p.volume && p.status !== 'Verloren');
    const avgDealValue = projectsWithVolume.length > 0 
      ? projectsWithVolume.reduce((sum, p) => sum + (p.volume || 0), 0) / projectsWithVolume.length 
      : 0;

    return {
      activeCount: projects.filter(p => p.status !== 'Gewonnen' && p.status !== 'Verloren').length,
      closingRate,
      pipelineValue,
      volumeCurrentYear,
      volumeChange,
      isVolumePositive,
      avgDealValue
    };
  }, [projects, currentYear]);

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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Willkommen zurück, {userProfile?.fname}!</h2>
          <p className="text-sm text-slate-500">Performance-Übersicht für {userCompany?.name}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard 
          title="Aktive Projekte" 
          value={stats.activeCount} 
          icon={<Briefcase size={20} />} 
        />
        <KPICard 
          title="Pipeline-Wert" 
          value={formatCurrency(stats.pipelineValue)} 
          icon={<Target size={20} />} 
        />
        <KPICard 
          title={`Auftragsvolumen ${currentYear}`} 
          value={formatCurrency(stats.volumeCurrentYear)} 
          change={stats.volumeChange} 
          isPositive={stats.isVolumePositive} 
          icon={<TrendingUp size={20} />} 
        />
        <KPICard 
          title="Ø Deal-Wert" 
          value={formatCurrency(stats.avgDealValue)} 
          icon={<Zap size={20} />} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Umsatzverlauf Monatlich</h3>
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
          <div className="h-[400px] w-full mt-auto">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                  tickFormatter={(v) => v >= 1000000 ? `${(v/1000000).toFixed(1)}M` : v >= 1000 ? `${v/1000}k` : v} 
                />
                <Tooltip 
                  cursor={{fill: '#f8fafc', radius: 8}}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-white p-3 shadow-xl rounded-2xl border border-slate-50 animate-in fade-in zoom-in duration-200">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{payload[0].payload.month}</p>
                          <p className="text-sm font-bold text-slate-800">{formatCurrency(payload[0].value as number)}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar 
                  dataKey="rev" 
                  fill="url(#barGradient)" 
                  radius={[6, 6, 0, 0]} 
                  barSize={32}
                  name="Umsatz (€)" 
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">Pipeline Funnel</h3>
          <div className="flex-1 space-y-4">
            {funnelData.map((item: any, i: number) => {
              const percentage = projects.length > 0 ? (item.count / projects.length) * 100 : 0;
              const barColors: Record<string, string> = {
                'Lead übergeben': 'bg-[#82a8a4]/30',
                'Technische Klärung': 'bg-[#82a8a4]/50',
                'Vertragliche Klärung': 'bg-[#82a8a4]/70',
                'Closing': 'bg-[#82a8a4]/85',
                'Gewonnen': 'bg-[#82a8a4]',
                'Verloren': 'bg-red-400'
              };

              return (
                <div key={i} className="group cursor-default">
                  <div className="flex justify-between items-end mb-1.5 px-0.5">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight leading-none mb-1">
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
                  <div className="h-3 w-full bg-slate-50 rounded-lg overflow-hidden border border-slate-100/50 p-[1px]">
                    <div 
                      className={`h-full rounded-md transition-all duration-1000 ease-out shadow-sm ${barColors[item.status] || 'bg-[#82a8a4]'}`}
                      style={{ 
                        width: `${percentage}%`,
                        opacity: projects.length > 0 ? 0.8 + (percentage / 100) * 0.2 : 1
                      }}
                    >
                      <div className="w-full h-full bg-gradient-to-r from-white/10 to-transparent"></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-8 pt-6 border-t border-slate-50 text-center">
             <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Abschlussquote</p>
             <p className="text-xl font-bold text-slate-800">{stats.closingRate}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
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
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <th className="px-6 py-3">Projekt</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Kunde</th>
                <th className="px-6 py-3">Erstellt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {projects.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-400 text-xs">Noch keine Projekte vorhanden.</td>
                </tr>
              ) : (
                projects.slice(0, 4).map((p) => (
                  <tr 
                    key={p.id} 
                    onClick={() => onNavigateToProject(p.id)}
                    className="hover:bg-slate-50 transition-colors group cursor-pointer"
                  >
                    <td className="px-6 py-4">
                      <p className="text-xs font-bold text-slate-800 group-hover:text-[#82a8a4] transition-colors">{p.name}</p>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={p.status} />
                    </td>
                    <td className="px-6 py-4 text-xs font-medium text-slate-600">{p.company_name}</td>
                    <td className="px-6 py-4 text-xs font-medium text-slate-500">{new Date(p.created_at).toLocaleDateString()}</td>
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
