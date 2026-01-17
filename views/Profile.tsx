import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { 
  Building, 
  User as UserIcon, 
  Mail, 
  Phone, 
  MapPin, 
  Pencil,
  ShieldCheck,
  Globe,
  Loader2
} from 'lucide-react';
import { User, UserCompany } from '../types';

const Profile: React.FC = () => {
  const [profile, setProfile] = useState<User | null>(null);
  const [company, setCompany] = useState<UserCompany | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfileData = async () => {
      setLoading(true);
      try {
        // 1. Hole den aktuell eingeloggten Auth-User
        const { data: { user: authUser } } = await supabase.auth.getUser();
        
        if (!authUser) return;

        // 2. Hole das Profil aus der 'user' Tabelle
        const { data: userData, error: userError } = await supabase
          .from('user')
          .select('*')
          .eq('auth_id', authUser.id)
          .single();

        if (userError) throw userError;
        
        // E-Mail aus Auth-User hinzufügen, da nicht in DB Tabelle
        const extendedProfile = {
          ...userData,
          email: authUser.email
        };
        setProfile(extendedProfile);

        // 3. Hole die Firmendaten falls eine company_id vorhanden ist
        if (userData.company_id) {
          const { data: companyData, error: companyError } = await supabase
            .from('usercompany')
            .select('*')
            .eq('id', userData.company_id)
            .single();

          if (companyError) throw companyError;
          setCompany(companyData);
        }
      } catch (error) {
        console.error('Fehler beim Laden des Profils:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-10 h-10 text-[#82a8a4] animate-spin mb-4" />
        <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Profil wird geladen...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-20 bg-white rounded-3xl border border-slate-100">
        <p className="text-slate-500 font-medium">Profil konnte nicht geladen werden.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500 pb-12">
      {/* Header Card */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-8 bg-gradient-to-r from-white to-slate-50/50">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="flex items-center gap-6">
              <div className="relative">
                <div className="w-20 h-20 rounded-2xl bg-slate-50 flex items-center justify-center text-[#82a8a4] ring-4 ring-white shadow-sm border border-slate-100">
                  <UserIcon size={40} strokeWidth={1.5} />
                </div>
                <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-[#82a8a4] border-4 border-white rounded-xl flex items-center justify-center text-white shadow-sm">
                  <ShieldCheck size={14} />
                </div>
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800">{profile.fname} {profile.lname}</h2>
                <p className="text-xs text-slate-500 font-medium">{company?.name || 'Kein Unternehmen zugeordnet'}</p>
                <div className="mt-3 flex gap-2">
                  <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[9px] font-bold uppercase rounded-md tracking-wider">Verifizierter Partner</span>
                </div>
              </div>
            </div>
            <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-500 hover:text-[#82a8a4] hover:border-[#82a8a4] rounded-xl text-xs font-bold transition-all bg-white shadow-sm active:scale-95">
              <Pencil size={14} /> Profil bearbeiten
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Unternehmensinformationen */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 space-y-8">
          <div className="flex items-center gap-3 border-b border-slate-50 pb-3">
            <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-[#82a8a4]">
              <Building size={16} />
            </div>
            <h3 className="font-bold text-[10px] text-slate-400 uppercase tracking-widest">Unternehmensinformationen</h3>
          </div>
          
          {company ? (
            <div className="space-y-6">
              <div>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Unternehmensname</span>
                <p className="text-xs font-bold text-slate-800">{company.name}</p>
              </div>
              <div>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Unternehmensstandort</span>
                <div className="flex items-start gap-2">
                  <MapPin size={14} className="text-slate-300 mt-0.5" />
                  <p className="text-xs font-bold text-slate-800 leading-relaxed">
                    {company.street}<br />
                    {company.zip} {company.city}<br />
                    {company.country}
                  </p>
                </div>
              </div>
              {company.website && (
                <div className="pt-2">
                  <a 
                    href={company.website} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-[10px] font-bold text-[#82a8a4] hover:underline flex items-center gap-1"
                  >
                    <Globe size={12} /> Website besuchen
                  </a>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic text-center py-4">Keine Unternehmensdaten verfügbar.</p>
          )}
        </div>

        {/* Persönliche Informationen */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 space-y-8">
          <div className="flex items-center gap-3 border-b border-slate-50 pb-3">
            <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-[#82a8a4]">
              <UserIcon size={16} />
            </div>
            <h3 className="font-bold text-[10px] text-slate-400 uppercase tracking-widest">Persönliche Informationen</h3>
          </div>

          <div className="space-y-6">
            <div>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Name</span>
              <p className="text-xs font-bold text-slate-800">{profile.fname} {profile.lname}</p>
            </div>
            <div>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Mail</span>
              <div className="flex items-center gap-2">
                <Mail size={14} className="text-slate-300" />
                <p className="text-xs font-bold text-slate-800">{profile.email}</p>
              </div>
            </div>
            <div>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Telefonnummer</span>
              <div className="flex items-center gap-2">
                <Phone size={14} className="text-slate-300" />
                <p className="text-xs font-bold text-slate-800">{profile.phone}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Account Status / Meta Info */}
      <div className="bg-slate-50 rounded-2xl p-6 flex flex-wrap gap-8 justify-between items-center border border-slate-100">
        <div className="flex items-center gap-4">
           <div className="text-right">
             <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Mitglied seit</p>
             <p className="text-xs font-bold text-slate-600">
               {new Date(profile.created_at).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}
             </p>
           </div>
           <div className="w-px h-8 bg-slate-200 hidden sm:block"></div>
           <div>
             <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Status</p>
             <p className="text-xs font-bold text-green-600">Aktiv</p>
           </div>
        </div>
        <button className="text-[10px] font-bold text-red-400 hover:text-red-500 transition-colors uppercase tracking-widest">
          Account löschen
        </button>
      </div>
    </div>
  );
};

export default Profile;
