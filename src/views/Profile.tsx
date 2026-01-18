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

/**
 * Profil-Ansicht zum Anzeigen und Bearbeiten der Nutzer- und Unternehmensdaten
 */
const Profile: React.FC = () => {
  // Lokaler State für Profil, Unternehmen und Status-Flags
  const [profile, setProfile] = useState<User | null>(null);
  const [company, setCompany] = useState<UserCompany | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // State für die bearbeitbaren Felder
  const [editedProfile, setEditedProfile] = useState<Partial<User>>({});
  const [editedCompany, setEditedCompany] = useState<Partial<UserCompany>>({});
  
  // Feedback-State (Error/Success)
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  /**
   * Lädt die aktuellen Profil- und Unternehmensdaten aus Supabase
   */
  const fetchProfileData = async () => {
    setLoading(true);
    try {
      // 1. Auth-Daten holen
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      if (!authUser) return;

      // 2. Nutzer-Profil aus der 'user' Tabelle laden
      const { data: userData, error: userError } = await supabase
        .from('user')
        .select('*')
        .eq('auth_id', authUser.id)
        .single();

      if (userError) throw userError;
      
      const extendedProfile = {
        ...userData,
        email: authUser.email // E-Mail kommt aus dem Auth-System
      };
      setProfile(extendedProfile);

      // 3. Zugehörige Unternehmensdaten laden
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
      setError('Profil konnte nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  };

  // Daten beim ersten Laden der Komponente abrufen
  useEffect(() => {
    fetchProfileData();
  }, []);

  /**
   * Aktiviert den Bearbeitungsmodus und befüllt die temporären Felder
   */
  const handleStartEditing = () => {
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

  /**
   * Speichert die Änderungen in beiden Tabellen (User & UserCompany)
   */
  const handleSave = async () => {
    if (!profile) return;
    
    setSaving(true);
    setError(null);
    try {
      // 1. Update des User-Profils
      const { error: userUpdateError } = await supabase
        .from('user')
        .update({
          fname: editedProfile.fname,
          lname: editedProfile.lname,
          phone: editedProfile.phone
        })
        .eq('id', profile.id);

      if (userUpdateError) throw userUpdateError;

      // 2. Update des Unternehmens (falls vorhanden)
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

      // Daten neu laden, um die Ansicht zu aktualisieren
      await fetchProfileData();
      setIsEditing(false);
      setSuccess(true);
      
      // Erfolgsmeldung nach 3 Sek ausblenden
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      console.error('Fehler beim Speichern:', err);
      setError(err.message || 'Fehler beim Speichern der Änderungen.');
    } finally {
      setSaving(false);
    }
  };

  // Ladeanzeige
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-10 h-10 text-[#82a8a4] animate-spin mb-4" />
        <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Profil wird geladen...</p>
      </div>
    );
  }

  // Fehlerfall
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

      {/* --- HEADER KARTE: Name & Profilbild-Platzhalter --- */}
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
                  <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[9px] font-bold uppercase rounded-md tracking-wider">Verifizierter Partner</span>
                </div>
              </div>
            </div>
            {/* Action Buttons im Header */}
            {isEditing ? (
              <div className="flex gap-3">
                <button
                  onClick={() => setIsEditing(false)}
                  disabled={saving}
                  className="px-4 py-2 text-slate-500 hover:text-slate-700 text-xs font-bold transition-all"
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2 bg-[#82a8a4] text-white rounded-xl text-xs font-bold transition-all shadow-sm hover:bg-[#6b8d8a] disabled:opacity-50 active:scale-95"
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : 'Speichern'}
                </button>
              </div>
            ) : (
              <button 
                onClick={handleStartEditing}
                className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-500 hover:text-[#82a8a4] hover:border-[#82a8a4] rounded-xl text-xs font-bold transition-all bg-white shadow-sm active:scale-95"
              >
                <Pencil size={14} /> Profil bearbeiten
              </button>
            )}
          </div>
        </div>
      </div>

      {/* --- DETAIL INFORMATIONEN (Zwei Spalten) --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* UNTERNEHMENSINFORMATIONEN */}
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
                {isEditing ? (
                  <input
                    type="text"
                    value={editedCompany.name || ''}
                    onChange={(e) => setEditedCompany({ ...editedCompany, name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#82a8a4]/20"
                  />
                ) : (
                  <p className="text-xs font-bold text-slate-800">{company.name}</p>
                )}
              </div>
              <div>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Unternehmensstandort</span>
                {isEditing ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="Straße"
                      value={editedCompany.street || ''}
                      onChange={(e) => setEditedCompany({ ...editedCompany, street: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#82a8a4]/20"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="PLZ"
                        value={editedCompany.zip || ''}
                        onChange={(e) => setEditedCompany({ ...editedCompany, zip: e.target.value })}
                        className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#82a8a4]/20"
                      />
                      <input
                        type="text"
                        placeholder="Stadt"
                        value={editedCompany.city || ''}
                        onChange={(e) => setEditedCompany({ ...editedCompany, city: e.target.value })}
                        className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#82a8a4]/20"
                      />
                    </div>
                    <input
                      type="text"
                      placeholder="Land"
                      value={editedCompany.country || ''}
                      onChange={(e) => setEditedCompany({ ...editedCompany, country: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#82a8a4]/20"
                    />
                  </div>
                ) : (
                  <div className="flex items-start gap-2">
                    <MapPin size={14} className="text-slate-300 mt-0.5" />
                    <p className="text-xs font-bold text-slate-800 leading-relaxed">
                      {company.street}<br />
                      {company.zip} {company.city}<br />
                      {company.country}
                    </p>
                  </div>
                )}
              </div>
              <div>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Website</span>
                {isEditing ? (
                  <input
                    type="url"
                    placeholder="https://..."
                    value={editedCompany.website || ''}
                    onChange={(e) => setEditedCompany({ ...editedCompany, website: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#82a8a4]/20"
                  />
                ) : (
                  company.website && (
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
                  )
                )}
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic text-center py-4">Keine Unternehmensdaten verfügbar.</p>
          )}
        </div>

        {/* PERSÖNLICHE INFORMATIONEN */}
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
              {isEditing ? (
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={editedProfile.fname || ''}
                    onChange={(e) => setEditedProfile({ ...editedProfile, fname: e.target.value })}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#82a8a4]/20"
                  />
                  <input
                    type="text"
                    value={editedProfile.lname || ''}
                    onChange={(e) => setEditedProfile({ ...editedProfile, lname: e.target.value })}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#82a8a4]/20"
                  />
                </div>
              ) : (
                <p className="text-xs font-bold text-slate-800">{profile.fname} {profile.lname}</p>
              )}
            </div>
            <div>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Mail</span>
              <div className="flex items-center gap-2">
                <Mail size={14} className="text-slate-300" />
                <p className="text-xs font-bold text-slate-400">{profile.email} <span className="text-[8px] font-normal">(Nicht änderbar)</span></p>
              </div>
            </div>
            <div>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Telefonnummer</span>
              {isEditing ? (
                <div className="flex items-center gap-2">
                  <Phone size={14} className="text-slate-300" />
                  <input
                    type="tel"
                    value={editedProfile.phone || ''}
                    onChange={(e) => setEditedProfile({ ...editedProfile, phone: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#82a8a4]/20"
                  />
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Phone size={14} className="text-slate-300" />
                  <p className="text-xs font-bold text-slate-800">{profile.phone}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Meta Infos am Seitenende */}
      <div className="bg-slate-50 rounded-2xl p-6 flex flex-wrap gap-8 justify-between items-center">
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
      </div>
    </div>
  );
};

export default Profile;
