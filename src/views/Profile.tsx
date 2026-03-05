import React, { useState, useEffect } from 'react';
import { 
  Building, 
  User as UserIcon, 
  Mail, 
  Phone, 
  MapPin, 
  Pencil,
  ShieldCheck,
  Globe,
  Loader2,
  Check,
  Users,
  Link as LinkIcon,
  Copy,
  CheckCircle2,
  UserPlus
} from 'lucide-react';
import { User, UserCompany } from '../types';
import { getHubSpotUserContext } from '../utils/hubspotProjectsApi';

interface TeamMember {
  id: string;
  fname: string;
  lname: string;
  email?: string;
  created_at: string;
  is_unlocked: boolean;
  vermittlerportal_status?: string;
}

/**
 * Hilfskomponente für modern gestaltete Eingabefelder im Profil
 */
const ProfileInput = ({ label, icon: Icon, ...props }: any) => (
  <div className="space-y-1.5 group">
    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 transition-colors group-focus-within:text-[#82a8a4]">
      {label}
    </label>
    <div className="relative">
      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#82a8a4] transition-colors">
        <Icon size={14} />
      </div>
      <input
        {...props}
        className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none transition-all focus:ring-4 focus:ring-[#82a8a4]/10 focus:border-[#82a8a4] focus:bg-white"
      />
    </div>
  </div>
);

/**
 * Avatar-Komponente mit Initialen
 */
const Avatar = ({ fname, lname, isCurrentUser = false }: { fname: string; lname: string; isCurrentUser?: boolean }) => {
  const initials = `${fname?.[0] || ''}${lname?.[0] || ''}`.toUpperCase();
  
  return (
    <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold ${
      isCurrentUser 
        ? 'bg-[#82a8a4] text-white' 
        : 'bg-slate-100 text-slate-600'
    }`}>
      {initials}
    </div>
  );
};

/**
 * Profil-Ansicht zum Anzeigen und Bearbeiten der Nutzer- und Unternehmensdaten
 */
const Profile: React.FC = () => {
  const EDITING_ENABLED = false;
  const [profile, setProfile] = useState<User | null>(null);
  const [company, setCompany] = useState<(UserCompany & { invite_code?: string }) | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [editedProfile, setEditedProfile] = useState<Partial<User>>({});
  const [editedCompany, setEditedCompany] = useState<Partial<UserCompany>>({});
  
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Kopier-State
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const fetchProfileData = async () => {
    setLoading(true);
    try {
      const context = await getHubSpotUserContext();
      setProfile((context?.user ?? null) as User | null);
      setCompany((context?.company ?? null) as (UserCompany & { invite_code?: string }) | null);
      setTeamMembers((context?.team_members ?? []) as TeamMember[]);
    } catch (error) {
      console.error('Fehler beim Laden des Profils:', error);
      setError('Profil konnte nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileData();
  }, []);

  const copyCode = async () => {
    if (!company?.invite_code) return;
    await navigator.clipboard.writeText(company.invite_code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const copyLink = async () => {
    if (!company?.invite_code) return;
    const link = `${window.location.origin}?invite=${company.invite_code}`;
    await navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleStartEditing = () => {
    if (!EDITING_ENABLED) {
      setError('Profilbearbeitung ist aktuell deaktiviert. Daten werden aus HubSpot gelesen.');
      return;
    }
    if (profile) {
      setEditedProfile({
        fname: profile.fname,
        lname: profile.lname,
        phone: profile.phone
      });
    }
    if (company) {
      setEditedCompany({
        name: company.name,
        website: company.website,
        street: company.street,
        zip: company.zip,
        city: company.city,
        country: company.country
      });
    }
    setIsEditing(true);
    setError(null);
    setSuccess(false);
  };

  const handleSave = async () => {
    if (!EDITING_ENABLED) {
      setError('Profilbearbeitung ist aktuell deaktiviert. Daten werden aus HubSpot gelesen.');
      return;
    }
    if (!profile) return;
    
    setSaving(true);
    setError(null);
    try {
      const { error: userUpdateError } = await supabase
        .from('user')
        .update({
          fname: editedProfile.fname,
          lname: editedProfile.lname,
          phone: editedProfile.phone
        })
        .eq('id', profile.id);

      if (userUpdateError) throw userUpdateError;

      if (company && company.id) {
        const { error: companyUpdateError } = await supabase
          .from('usercompany')
          .update({
            name: editedCompany.name,
            website: editedCompany.website,
            street: editedCompany.street,
            zip: editedCompany.zip,
            city: editedCompany.city,
            country: editedCompany.country
          })
          .eq('id', company.id);

        if (companyUpdateError) throw companyUpdateError;
      }

      await fetchProfileData();
      setIsEditing(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      console.error('Fehler beim Speichern:', err);
      setError(err.message || 'Fehler beim Speichern der Änderungen.');
    } finally {
      setSaving(false);
    }
  };

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
      {/* Status-Meldungen */}
      {success && (
        <div className="bg-green-50 border border-green-100 text-green-600 px-6 py-4 rounded-2xl text-xs font-bold flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
          <ShieldCheck size={18} /> Profil erfolgreich aktualisiert!
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-100 text-red-600 px-6 py-4 rounded-2xl text-xs font-bold animate-in fade-in slide-in-from-top-2">
          {error}
        </div>
      )}

      {/* --- HEADER KARTE --- */}
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
                <h2 className="text-xl font-bold text-slate-800">
                  {profile.fname} {profile.lname}
                </h2>
                <p className="text-xs text-slate-500 font-medium">{company?.name || 'Kein Unternehmen zugeordnet'}</p>
                <div className="mt-3 flex gap-2">
                  <span className="px-2 py-0.5 bg-[#82a8a4]/10 text-[#5a7a76] border border-[#82a8a4]/30 text-[9px] font-bold uppercase rounded-md tracking-wider">Verifizierter Vermittlungspartner</span>
                </div>
              </div>
            </div>
            {isEditing && EDITING_ENABLED ? (
              <div className="flex gap-3 animate-in fade-in zoom-in duration-300">
                <button
                  onClick={() => setIsEditing(false)}
                  disabled={saving}
                  className="px-4 py-2 text-slate-500 hover:text-slate-700 text-xs font-bold transition-all disabled:opacity-50"
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2 bg-[#82a8a4] text-white rounded-xl text-xs font-bold transition-all shadow-sm hover:bg-[#6b8d8a] disabled:opacity-50 active:scale-95 shadow-[#82a8a4]/20"
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <><Check size={14} /> Speichern</>}
                </button>
              </div>
            ) : (
              <button 
                onClick={handleStartEditing}
                className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-500 hover:text-[#82a8a4] hover:border-[#82a8a4] rounded-xl text-xs font-bold transition-all bg-white shadow-sm active:scale-95 group"
              >
                <Pencil size={14} className="group-hover:rotate-12 transition-transform" /> Profil bearbeiten
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* PERSÖNLICHE INFORMATIONEN */}
        <div className={`bg-white rounded-3xl shadow-sm border transition-all duration-500 p-8 space-y-8 ${isEditing ? 'border-[#82a8a4] ring-4 ring-[#82a8a4]/5' : 'border-slate-100'}`}>
          <div className="flex items-center justify-between border-b border-slate-50 pb-3">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${isEditing ? 'bg-[#82a8a4] text-white' : 'bg-slate-50 text-[#82a8a4]'}`}>
                <UserIcon size={16} />
              </div>
              <h3 className={`font-bold text-[10px] uppercase tracking-widest ${isEditing ? 'text-[#82a8a4]' : 'text-slate-400'}`}>Persönliche Informationen</h3>
            </div>
          </div>

          <div className="space-y-6">
            {isEditing ? (
              <div className="space-y-5 animate-in fade-in duration-500">
                <div className="grid grid-cols-2 gap-4">
                  <ProfileInput 
                    label="Vorname" 
                    icon={UserIcon} 
                    value={editedProfile.fname || ''} 
                    onChange={(e: any) => setEditedProfile({ ...editedProfile, fname: e.target.value })}
                  />
                  <ProfileInput 
                    label="Nachname" 
                    icon={UserIcon} 
                    value={editedProfile.lname || ''} 
                    onChange={(e: any) => setEditedProfile({ ...editedProfile, lname: e.target.value })}
                  />
                </div>
                <ProfileInput 
                  label="Telefonnummer" 
                  icon={Phone} 
                  type="tel"
                  value={editedProfile.phone || ''} 
                  onChange={(e: any) => setEditedProfile({ ...editedProfile, phone: e.target.value })}
                />
                <div className="pt-2 opacity-60">
                  <ProfileInput 
                    label="E-Mail Adresse (Nicht änderbar)" 
                    icon={Mail} 
                    value={profile.email} 
                    disabled
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Name</span>
                  <p className="text-xs font-bold text-slate-800">{profile.fname} {profile.lname}</p>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Mail</span>
                  <div className="flex items-center gap-2 text-slate-400">
                    <Mail size={14} className="text-slate-300" />
                    <p className="text-xs font-bold">{profile.email}</p>
                  </div>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Telefonnummer</span>
                  <div className="flex items-center gap-2 text-slate-800">
                    <Phone size={14} className="text-slate-300" />
                    <p className="text-xs font-bold">{profile.phone || '–'}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* UNTERNEHMENSINFORMATIONEN */}
        <div className={`bg-white rounded-3xl shadow-sm border transition-all duration-500 p-8 space-y-8 ${isEditing ? 'border-[#82a8a4] ring-4 ring-[#82a8a4]/5' : 'border-slate-100'}`}>
          <div className="flex items-center justify-between border-b border-slate-50 pb-3">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${isEditing ? 'bg-[#82a8a4] text-white' : 'bg-slate-50 text-[#82a8a4]'}`}>
                <Building size={16} />
              </div>
              <h3 className={`font-bold text-[10px] uppercase tracking-widest ${isEditing ? 'text-[#82a8a4]' : 'text-slate-400'}`}>Unternehmen</h3>
            </div>
          </div>
          
          <div className="space-y-6">
            {isEditing ? (
              <div className="space-y-5 animate-in fade-in duration-500">
                <ProfileInput 
                  label="Unternehmensname" 
                  icon={Building} 
                  value={editedCompany.name || ''} 
                  onChange={(e: any) => setEditedCompany({ ...editedCompany, name: e.target.value })}
                />
                <ProfileInput 
                  label="Straße & Hausnummer" 
                  icon={MapPin} 
                  value={editedCompany.street || ''} 
                  onChange={(e: any) => setEditedCompany({ ...editedCompany, street: e.target.value })}
                />
                <div className="grid grid-cols-2 gap-4">
                  <ProfileInput 
                    label="PLZ" 
                    icon={MapPin} 
                    value={editedCompany.zip || ''} 
                    onChange={(e: any) => setEditedCompany({ ...editedCompany, zip: e.target.value })}
                  />
                  <ProfileInput 
                    label="Stadt" 
                    icon={MapPin} 
                    value={editedCompany.city || ''} 
                    onChange={(e: any) => setEditedCompany({ ...editedCompany, city: e.target.value })}
                  />
                </div>
                <ProfileInput 
                  label="Land" 
                  icon={Globe} 
                  value={editedCompany.country || ''} 
                  onChange={(e: any) => setEditedCompany({ ...editedCompany, country: e.target.value })}
                />
                <ProfileInput 
                  label="Website" 
                  icon={Globe} 
                  type="url"
                  value={editedCompany.website || ''} 
                  onChange={(e: any) => setEditedCompany({ ...editedCompany, website: e.target.value })}
                />
              </div>
            ) : (
              company ? (
                <div className="space-y-6">
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Unternehmensname</span>
                    <p className="text-xs font-bold text-slate-800">{company.name}</p>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Standort</span>
                    <div className="flex items-start gap-2 text-slate-800">
                      <MapPin size={14} className="text-slate-300 mt-0.5" />
                      <p className="text-xs font-bold leading-relaxed">
                        {company.street}<br />
                        {company.zip} {company.city}<br />
                        {company.country}
                      </p>
                    </div>
                  </div>
                  {company.website && (
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Website</span>
                      <a href={company.website} target="_blank" rel="noopener noreferrer" className="text-[10px] font-bold text-[#82a8a4] hover:underline flex items-center gap-1">
                        <Globe size={12} /> Website besuchen
                      </a>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic text-center py-4">Keine Unternehmensdaten verfügbar.</p>
              )
            )}
          </div>
        </div>
      </div>

      {/* TEAM-SEKTION */}
      {company && !isEditing && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150">
          <div className="flex items-center justify-between border-b border-slate-50 pb-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-slate-50 text-[#82a8a4] flex items-center justify-center">
                <Users size={16} />
              </div>
              <h3 className="font-bold text-[10px] uppercase tracking-widest text-slate-400">Team</h3>
              <span className="text-[10px] font-bold text-slate-300 bg-slate-100 px-2 py-0.5 rounded-md">
                {teamMembers.length} {teamMembers.length === 1 ? 'Mitglied' : 'Mitglieder'}
              </span>
            </div>
          </div>

          {/* Teammitglieder Liste */}
          <div className="space-y-2">
            {teamMembers.map((member) => (
              <div 
                key={member.id}
                className={`flex items-center gap-4 p-3 rounded-xl transition-colors ${
                  member.id === profile.id ? 'bg-[#82a8a4]/5' : 'hover:bg-slate-50'
                }`}
              >
                <Avatar 
                  fname={member.fname} 
                  lname={member.lname} 
                  isCurrentUser={member.id === profile.id}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-slate-800 truncate">
                      {member.fname} {member.lname}
                    </p>
                    {member.id === profile.id && (
                      <span className="text-[9px] font-bold text-[#82a8a4] bg-[#82a8a4]/10 px-1.5 py-0.5 rounded">Du</span>
                    )}
                  {!member.is_unlocked && (
                      <span className="text-[9px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">Freischaltung ausstehend</span>
                    )}
                  </div>
                  {member.email && (
                    <p className="text-[10px] text-slate-400 truncate">{member.email}</p>
                  )}
                </div>
                <p className="text-[10px] text-slate-300 hidden sm:block">
                  seit {new Date(member.created_at).toLocaleDateString('de-DE', { month: 'short', year: 'numeric' })}
                </p>
              </div>
            ))}
          </div>

          {/* Dezenter Einladungscode-Bereich */}
          {company.invite_code && (
            <div className="pt-4 border-t border-slate-100">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <UserPlus size={14} className="text-slate-300" />
                  <p className="text-[11px] text-slate-400">
                    Teammitglied einladen mit Code: <span className="font-mono font-bold text-slate-500">{company.invite_code.match(/.{1,4}/g)?.join('-')}</span>
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={copyCode}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                      copiedCode 
                        ? 'bg-green-100 text-green-600' 
                        : 'text-slate-400 hover:text-[#82a8a4] hover:bg-slate-50'
                    }`}
                  >
                    {copiedCode ? <><CheckCircle2 size={12} /> Kopiert</> : <><Copy size={12} /> Code</>}
                  </button>
                  <button
                    onClick={copyLink}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                      copiedLink 
                        ? 'bg-green-100 text-green-600' 
                        : 'text-slate-400 hover:text-[#82a8a4] hover:bg-slate-50'
                    }`}
                  >
                    {copiedLink ? <><CheckCircle2 size={12} /> Kopiert</> : <><LinkIcon size={12} /> Link</>}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Meta Infos */}
      {!isEditing && (
        <div className="bg-slate-50 rounded-2xl p-6 flex flex-wrap gap-8 justify-between items-center transition-opacity duration-500">
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
               <p className={`text-xs font-bold ${profile.vermittlerportal_status === 'Aktiv' ? 'text-green-600' : 'text-amber-600'}`}>
                 {profile.vermittlerportal_status || 'Freischaltung ausstehend'}
               </p>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
