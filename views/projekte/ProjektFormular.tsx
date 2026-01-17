import React, { useState } from 'react';
import { supabase } from '../../utils/supabase';
import { 
  ArrowLeft, 
  ArrowRight, 
  ClipboardList, 
  Building, 
  CalendarClock, 
  Zap, 
  User, 
  Mail, 
  Phone, 
  Navigation, 
  MapPin, 
  CheckCircle2,
  Globe,
  Loader2
} from 'lucide-react';
import { EstimatedCapacity } from '../../types';

interface ProjektFormularProps {
  onBack: () => void;
  onSubmit: () => void;
  userCompanyId: string | null;
}

const ProjektFormular: React.FC<ProjektFormularProps> = ({ onBack, onSubmit, userCompanyId }) => {
  const [formStep, setFormStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({
    name: '',
    company_name: '',
    website: '',
    estimated_order_date: '',
    estimated_capacity: '' as EstimatedCapacity | '',
    contact_fname: '',
    contact_lname: '',
    contact_email: '',
    contact_phone: '',
    location_street: '',
    location_zip: '',
    location_city: '',
    location_country: 'Deutschland'
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCreateProject = async () => {
    setLoading(true);
    try {
      
      const { error } = await supabase
        .from('project')
        .insert([{
          ...formData,
          status: 'Lead übergeben', // Standardstatus für neue Projekte
          company_id: userCompanyId,
        }]);

      if (error) throw error;
      onSubmit();
    } catch (error) {
      console.error('Fehler beim Erstellen des Projekts:', error);
      alert('Fehler beim Speichern. Bitte versuchen Sie es erneut.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft size={18} /> Zurück zur Liste
        </button>
        <div className="flex gap-2">
          {[1, 2, 3].map(i => (
            <div key={i} className={`h-1.5 w-12 rounded-full transition-colors ${formStep >= i ? 'bg-[#82a8a4]' : 'bg-slate-200'}`} />
          ))}
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-8 md:p-12 overflow-hidden">
        {formStep === 1 && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="text-center">
              <div className="w-16 h-16 bg-[#82a8a4]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <ClipboardList className="text-[#82a8a4]" size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-800">1. Basis-Informationen</h3>
              <p className="text-sm text-slate-500">Geben Sie die grundlegenden Informationen zum neuen Projekt ein.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
              <div className="space-y-2 col-span-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Name des Projekts</label>
                <input 
                  type="text" 
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="z.B. Logistikzentrum Nord Erweiterung" 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#82a8a4]/20 outline-none font-bold text-xs text-slate-700" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Unternehmensname</label>
                <div className="relative">
                  <Building className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input 
                    type="text" 
                    name="company_name"
                    value={formData.company_name}
                    onChange={handleChange}
                    placeholder="Unternehmen GmbH" 
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#82a8a4]/20 outline-none font-bold text-xs text-slate-700" 
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Website</label>
                <div className="relative">
                  <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input 
                    type="url" 
                    name="website"
                    value={formData.website}
                    onChange={handleChange}
                    placeholder="https://www.unternehmen.de" 
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#82a8a4]/20 outline-none font-bold text-xs text-slate-700" 
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {formStep === 2 && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="text-center">
              <div className="w-16 h-16 bg-[#82a8a4]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <CalendarClock className="text-[#82a8a4]" size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-800">2. Planung & Kontakt</h3>
              <p className="text-sm text-slate-500">Zeitliche Planung und Ansprechpartner für das Projekt.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Vorauss. Bestelldatum</label>
                <input 
                  type="date" 
                  name="estimated_order_date"
                  value={formData.estimated_order_date}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#82a8a4]/20 outline-none font-bold text-xs text-slate-700" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Vorauss. Kapazität</label>
                <div className="relative">
                  <Zap className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <select 
                    name="estimated_capacity"
                    value={formData.estimated_capacity}
                    onChange={handleChange}
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#82a8a4]/20 outline-none font-bold text-xs text-slate-700 appearance-none"
                  >
                    <option value="">Kapazität wählen...</option>
                    <option value="100 - 500 kWh">100 - 500 kWh</option>
                    <option value="500 - 1000 kWh">500 - 1000 kWh</option>
                    <option value="1000 - 5000 kWh">1000 - 5000 kWh</option>
                    <option value=">5000 kWh">{'>5000 kWh'}</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2 mt-4 pt-4 border-t border-slate-50">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Vorname</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input 
                    type="text" 
                    name="contact_fname"
                    value={formData.contact_fname}
                    onChange={handleChange}
                    placeholder="Max" 
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#82a8a4]/20 outline-none font-bold text-xs text-slate-700" 
                  />
                </div>
              </div>
              <div className="space-y-2 mt-4 pt-4 border-t border-slate-50">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nachname</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input 
                    type="text" 
                    name="contact_lname"
                    value={formData.contact_lname}
                    onChange={handleChange}
                    placeholder="Mustermann" 
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#82a8a4]/20 outline-none font-bold text-xs text-slate-700" 
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">E-Mail Adresse</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input 
                    type="email" 
                    name="contact_email"
                    value={formData.contact_email}
                    onChange={handleChange}
                    placeholder="beispiel@domain.com" 
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#82a8a4]/20 outline-none font-bold text-xs text-slate-700" 
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Telefonnummer</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input 
                    type="tel" 
                    name="contact_phone"
                    value={formData.contact_phone}
                    onChange={handleChange}
                    placeholder="+49 000 0000000" 
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#82a8a4]/20 outline-none font-bold text-xs text-slate-700" 
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {formStep === 3 && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="text-center">
              <div className="w-16 h-16 bg-[#82a8a4]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Navigation className="text-[#82a8a4]" size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-800">3. Standort-Details</h3>
              <p className="text-sm text-slate-500">Geben Sie die Adresse für die Kartendarstellung an.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
              <div className="space-y-2 col-span-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Straße & Hausnummer</label>
                <input 
                  type="text" 
                  name="location_street"
                  value={formData.location_street}
                  onChange={handleChange}
                  placeholder="z.B. Gewerbestraße 42" 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#82a8a4]/20 outline-none font-bold text-xs text-slate-700" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">PLZ</label>
                <input 
                  type="text" 
                  name="location_zip"
                  value={formData.location_zip}
                  onChange={handleChange}
                  placeholder="10115" 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#82a8a4]/20 outline-none font-bold text-xs text-slate-700" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ort / Stadt</label>
                <input 
                  type="text" 
                  name="location_city"
                  value={formData.location_city}
                  onChange={handleChange}
                  placeholder="Berlin Mitte" 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#82a8a4]/20 outline-none font-bold text-xs text-slate-700" 
                />
              </div>
              <div className="space-y-2 col-span-2 mt-4">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Land</label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input 
                    type="text" 
                    name="location_country"
                    value={formData.location_country}
                    onChange={handleChange}
                    placeholder="z.B. Deutschland" 
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#82a8a4]/20 outline-none font-bold text-xs text-slate-700" 
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-between mt-12 pt-8 border-t border-slate-50">
          <button 
            onClick={() => setFormStep(s => Math.max(1, s - 1))}
            disabled={formStep === 1 || loading}
            className={`px-6 py-3 text-xs font-bold text-slate-400 hover:text-slate-800 transition-all ${formStep === 1 ? 'opacity-0 cursor-default' : 'opacity-100'}`}
          >
            Zurück
          </button>
          {formStep < 3 ? (
            <button 
              onClick={() => setFormStep(s => s + 1)}
              className="flex items-center gap-2 px-8 py-3 bg-[#82a8a4] text-white font-bold text-xs rounded-xl hover:bg-[#72938f] transition-all shadow-lg shadow-[#82a8a4]/20"
            >
              Weiter <ArrowRight size={16} />
            </button>
          ) : (
            <button 
              onClick={handleCreateProject}
              disabled={loading}
              className="flex items-center gap-2 px-8 py-3 bg-slate-900 text-white font-bold text-xs rounded-xl hover:bg-slate-800 transition-all shadow-lg shadow-black/20 disabled:opacity-70"
            >
              {loading ? (
                <>Wird gespeichert... <Loader2 size={16} className="animate-spin" /></>
              ) : (
                <>Projekt erstellen <CheckCircle2 size={16} /></>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjektFormular;
