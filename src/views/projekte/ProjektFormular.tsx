import React, { useState } from 'react';
import { supabase } from '../../utils/supabase';
import { 
  ArrowLeft, 
  ArrowRight, 
  Building, 
  CalendarClock, 
  Zap, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  CheckCircle2,
  Globe,
  Loader2,
  AlertCircle,
  FileText
} from 'lucide-react';
import { EstimatedCapacity } from '../../types';
import {
  isValidEmail,
  isValidPhone,
  isValidUrl,
  isValidZip,
  hasMinLength,
  isDateInFuture,
  isValidName,
  ValidationErrors
} from '../../utils/validation';

/**
 * Props für das ProjektFormular
 */
interface ProjektFormularProps {
  onBack: () => void;
  onSubmit: () => void;
  userCompanyId: string | null;
}

/**
 * Multi-Step Formular zum Erstellen eines neuen Projekts (Leads)
 * Schritt 1: Projekt (Details & Standort)
 * Schritt 2: Kunde (Unternehmen & Ansprechpartner)
 */
const ProjektFormular: React.FC<ProjektFormularProps> = ({ onBack, onSubmit, userCompanyId }) => {
  const [formStep, setFormStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Zentraler State für alle Formularfelder
  const [formData, setFormData] = useState({
    // Projekt-Infos (Schritt 1)
    name: '',
    estimated_order_date: '',
    estimated_capacity: '' as EstimatedCapacity | '',
    location_street: '',
    location_zip: '',
    location_city: '',
    location_country: 'Deutschland',
    // Kunde-Infos (Schritt 2)
    company_name: '',
    website: '',
    contact_fname: '',
    contact_lname: '',
    contact_email: '',
    contact_phone: '',
  });

  // Validierungsfehler pro Feld
  const [fieldErrors, setFieldErrors] = useState<ValidationErrors>({});
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());

  /**
   * Validiert Schritt 1 (Projekt: Details & Standort)
   */
  const validateStep1 = (): ValidationErrors => {
    const errors: ValidationErrors = {};
    
    if (!hasMinLength(formData.name, 3)) {
      errors.name = 'Bitte geben Sie einen Projektnamen ein (min. 3 Zeichen)';
    }
    if (!formData.estimated_order_date) {
      errors.estimated_order_date = 'Bitte wählen Sie ein voraussichtliches Bestelldatum';
    } else if (!isDateInFuture(formData.estimated_order_date)) {
      errors.estimated_order_date = 'Das Datum muss in der Zukunft liegen';
    }
    if (!formData.estimated_capacity) {
      errors.estimated_capacity = 'Bitte wählen Sie eine voraussichtliche Kapazität';
    }
    if (!hasMinLength(formData.location_street, 3)) {
      errors.location_street = 'Bitte geben Sie eine Straße ein (min. 3 Zeichen)';
    }
    if (!isValidZip(formData.location_zip)) {
      errors.location_zip = 'Bitte geben Sie eine gültige PLZ ein (4-5 Ziffern)';
    }
    if (!hasMinLength(formData.location_city, 2)) {
      errors.location_city = 'Bitte geben Sie eine Stadt ein (min. 2 Zeichen)';
    }
    if (!formData.location_country) {
      errors.location_country = 'Bitte wählen Sie ein Land';
    }
    
    return errors;
  };

  /**
   * Validiert Schritt 2 (Kunde: Unternehmen & Ansprechpartner)
   */
  const validateStep2 = (): ValidationErrors => {
    const errors: ValidationErrors = {};
    
    if (!hasMinLength(formData.company_name, 2)) {
      errors.company_name = 'Bitte geben Sie einen Unternehmensnamen ein (min. 2 Zeichen)';
    }
    if (!isValidUrl(formData.website)) {
      errors.website = 'Bitte geben Sie eine gültige URL ein (z.B. https://beispiel.de)';
    }
    if (!isValidName(formData.contact_fname)) {
      errors.contact_fname = 'Bitte geben Sie einen gültigen Vornamen ein (min. 2 Zeichen)';
    }
    if (!isValidName(formData.contact_lname)) {
      errors.contact_lname = 'Bitte geben Sie einen gültigen Nachnamen ein (min. 2 Zeichen)';
    }
    if (!isValidEmail(formData.contact_email)) {
      errors.contact_email = 'Bitte geben Sie eine gültige E-Mail-Adresse ein';
    }
    if (!isValidPhone(formData.contact_phone)) {
      errors.contact_phone = 'Bitte geben Sie eine gültige Telefonnummer ein';
    }
    
    return errors;
  };

  /**
   * Validiert ein einzelnes Feld (für onBlur)
   */
  const validateField = (name: string, value: string): string | undefined => {
    switch (name) {
      case 'name':
        return hasMinLength(value, 3) ? undefined : 'Min. 3 Zeichen erforderlich';
      case 'estimated_order_date':
        if (!value) return 'Bitte Datum auswählen';
        return isDateInFuture(value) ? undefined : 'Datum muss in der Zukunft liegen';
      case 'estimated_capacity':
        return value ? undefined : 'Bitte Kapazität auswählen';
      case 'location_street':
        return hasMinLength(value, 3) ? undefined : 'Min. 3 Zeichen erforderlich';
      case 'location_zip':
        return isValidZip(value) ? undefined : 'PLZ: 4-5 Ziffern';
      case 'location_city':
        return hasMinLength(value, 2) ? undefined : 'Min. 2 Zeichen erforderlich';
      case 'location_country':
        return value ? undefined : 'Bitte Land auswählen';
      case 'company_name':
        return hasMinLength(value, 2) ? undefined : 'Min. 2 Zeichen erforderlich';
      case 'website':
        return isValidUrl(value) ? undefined : 'Ungültige URL (z.B. https://...)';
      case 'contact_fname':
        return isValidName(value) ? undefined : 'Ungültiger Vorname (min. 2 Zeichen)';
      case 'contact_lname':
        return isValidName(value) ? undefined : 'Ungültiger Nachname (min. 2 Zeichen)';
      case 'contact_email':
        return isValidEmail(value) ? undefined : 'Ungültige E-Mail-Adresse';
      case 'contact_phone':
        return isValidPhone(value) ? undefined : 'Ungültige Telefonnummer';
      default:
        return undefined;
    }
  };

  /**
   * Generische Change-Handler Funktion für Inputs und Selects
   */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Fehler sofort entfernen wenn Feld korrigiert wird
    if (touchedFields.has(name)) {
      const error = validateField(name, value);
      setFieldErrors(prev => ({ ...prev, [name]: error }));
    }
  };

  /**
   * onBlur-Handler für Validierung beim Verlassen eines Feldes
   */
  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setTouchedFields(prev => new Set(prev).add(name));
    const error = validateField(name, value);
    setFieldErrors(prev => ({ ...prev, [name]: error }));
  };

  /**
   * Behandelt den Weiter-Button mit Validierung
   */
  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formStep === 1) {
      const errors = validateStep1();
      const fieldsToTouch = ['name', 'estimated_order_date', 'estimated_capacity', 'location_street', 'location_zip', 'location_city', 'location_country'];
      
      if (Object.keys(errors).length > 0) {
        setFieldErrors(prev => ({ ...prev, ...errors }));
        setTouchedFields(prev => new Set([...prev, ...fieldsToTouch]));
        return;
      }
      setFormStep(2);
    } else {
      const errors = validateStep2();
      const fieldsToTouch = ['company_name', 'website', 'contact_fname', 'contact_lname', 'contact_email', 'contact_phone'];
      
      if (Object.keys(errors).length > 0) {
        setFieldErrors(prev => ({ ...prev, ...errors }));
        setTouchedFields(prev => new Set([...prev, ...fieldsToTouch]));
        return;
      }
      handleCreateProject();
    }
  };

  /**
   * Speichert das neue Projekt in der Supabase 'project' Tabelle
   */
  const handleCreateProject = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('project')
        .insert([{
          ...formData,
          status: 'Lead übergeben',
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
    <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button 
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft size={14} /> Zurück zur Liste
        </button>
      </div>

      {/* Formular-Karte */}
      <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/60 border border-slate-100 overflow-hidden">
        <div className="p-6 md:p-8">
          {/* Progress-Balken */}
          <div className="flex gap-2 mb-8">
            {[1, 2].map(i => (
              <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-500 ${formStep >= i ? 'bg-[#82a8a4]' : 'bg-slate-100'}`} />
            ))}
          </div>

          <form onSubmit={handleNext} className="space-y-5">
        
            {/* SCHRITT 1: PROJEKT (Details & Standort) */}
        {formStep === 1 && (
              <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-500">
                {/* Projektdetails */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2.5 mb-1">
                    <div className="w-7 h-7 rounded-lg bg-[#82a8a4] text-white flex items-center justify-center">
                      <FileText size={14} />
              </div>
                    <h2 className="font-bold text-xs text-slate-700">Projektdetails</h2>
            </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Projektname</label>
                <input 
                  type="text" 
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                      onBlur={handleBlur}
                  placeholder="z.B. Logistikzentrum Nord Erweiterung" 
                      className={`w-full px-4 py-2.5 bg-slate-50 border rounded-xl focus:ring-4 outline-none font-bold text-xs text-slate-700 ${fieldErrors.name ? 'border-red-300 focus:ring-red-100 focus:border-red-400' : 'border-slate-200 focus:ring-[#82a8a4]/10 focus:border-[#82a8a4]'}`}
                    />
                    {fieldErrors.name && <p className="text-[10px] text-red-500 font-medium ml-1 flex items-center gap-1"><AlertCircle size={10} />{fieldErrors.name}</p>}
          </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Vorauss. Bestelldatum</label>
                      <div className="relative group">
                        <CalendarClock className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${fieldErrors.estimated_order_date ? 'text-red-400' : 'text-slate-400 group-focus-within:text-[#82a8a4]'}`} size={14} />
                <input 
                  type="date" 
                  name="estimated_order_date"
                  value={formData.estimated_order_date}
                  onChange={handleChange}
                          onBlur={handleBlur}
                          min={new Date().toISOString().split('T')[0]}
                          className={`w-full pl-11 pr-4 py-2.5 bg-slate-50 border rounded-xl focus:ring-4 outline-none font-bold text-xs text-slate-700 ${fieldErrors.estimated_order_date ? 'border-red-300 focus:ring-red-100 focus:border-red-400' : 'border-slate-200 focus:ring-[#82a8a4]/10 focus:border-[#82a8a4]'}`}
                />
              </div>
                      {fieldErrors.estimated_order_date && <p className="text-[10px] text-red-500 font-medium ml-1 flex items-center gap-1"><AlertCircle size={10} />{fieldErrors.estimated_order_date}</p>}
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Vorauss. Kapazität</label>
                      <div className="relative group">
                        <Zap className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors pointer-events-none ${fieldErrors.estimated_capacity ? 'text-red-400' : 'text-slate-400 group-focus-within:text-[#82a8a4]'}`} size={14} />
                  <select 
                    name="estimated_capacity"
                    value={formData.estimated_capacity}
                    onChange={handleChange}
                          onBlur={handleBlur}
                          className={`w-full pl-11 pr-4 py-2.5 bg-slate-50 border rounded-xl focus:ring-4 outline-none font-bold text-xs text-slate-700 appearance-none cursor-pointer ${fieldErrors.estimated_capacity ? 'border-red-300 focus:ring-red-100 focus:border-red-400' : 'border-slate-200 focus:ring-[#82a8a4]/10 focus:border-[#82a8a4]'}`}
                  >
                    <option value="">Kapazität wählen...</option>
                    <option value="100 - 500 kWh">100 - 500 kWh</option>
                    <option value="500 - 1000 kWh">500 - 1000 kWh</option>
                    <option value="1000 - 5000 kWh">1000 - 5000 kWh</option>
                    <option value=">5000 kWh">{'>5000 kWh'}</option>
                  </select>
                      </div>
                      {fieldErrors.estimated_capacity && <p className="text-[10px] text-red-500 font-medium ml-1 flex items-center gap-1"><AlertCircle size={10} />{fieldErrors.estimated_capacity}</p>}
                    </div>
                  </div>
                </div>

                {/* Standort */}
                <div className="space-y-4 pt-5 border-t border-slate-100">
                  <div className="flex items-center gap-2.5 mb-1">
                    <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center">
                      <MapPin size={14} />
                    </div>
                    <h2 className="font-bold text-xs text-slate-700">Standort</h2>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Straße & Hausnummer</label>
                    <div className="relative group">
                      <MapPin className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${fieldErrors.location_street ? 'text-red-400' : 'text-slate-400 group-focus-within:text-[#82a8a4]'}`} size={14} />
                      <input 
                        type="text" 
                        name="location_street"
                        value={formData.location_street}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="z.B. Gewerbestraße 42" 
                        className={`w-full pl-11 pr-4 py-2.5 bg-slate-50 border rounded-xl focus:ring-4 outline-none font-bold text-xs text-slate-700 ${fieldErrors.location_street ? 'border-red-300 focus:ring-red-100 focus:border-red-400' : 'border-slate-200 focus:ring-[#82a8a4]/10 focus:border-[#82a8a4]'}`}
                      />
                    </div>
                    {fieldErrors.location_street && <p className="text-[10px] text-red-500 font-medium ml-1 flex items-center gap-1"><AlertCircle size={10} />{fieldErrors.location_street}</p>}
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">PLZ</label>
                      <input 
                        type="text" 
                        name="location_zip"
                        value={formData.location_zip}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="10115" 
                        maxLength={5}
                        className={`w-full px-4 py-2.5 bg-slate-50 border rounded-xl focus:ring-4 outline-none font-bold text-xs text-slate-700 ${fieldErrors.location_zip ? 'border-red-300 focus:ring-red-100 focus:border-red-400' : 'border-slate-200 focus:ring-[#82a8a4]/10 focus:border-[#82a8a4]'}`}
                      />
                      {fieldErrors.location_zip && <p className="text-[10px] text-red-500 font-medium flex items-center gap-1"><AlertCircle size={10} />{fieldErrors.location_zip}</p>}
                    </div>
                    <div className="space-y-1.5 col-span-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Stadt</label>
                      <input 
                        type="text" 
                        name="location_city"
                        value={formData.location_city}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="Berlin" 
                        className={`w-full px-4 py-2.5 bg-slate-50 border rounded-xl focus:ring-4 outline-none font-bold text-xs text-slate-700 ${fieldErrors.location_city ? 'border-red-300 focus:ring-red-100 focus:border-red-400' : 'border-slate-200 focus:ring-[#82a8a4]/10 focus:border-[#82a8a4]'}`}
                      />
                      {fieldErrors.location_city && <p className="text-[10px] text-red-500 font-medium flex items-center gap-1"><AlertCircle size={10} />{fieldErrors.location_city}</p>}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Land</label>
                    <select 
                      name="location_country"
                      value={formData.location_country}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      className={`w-full px-4 py-2.5 bg-slate-50 border rounded-xl focus:ring-4 outline-none font-bold text-xs text-slate-700 appearance-none cursor-pointer ${fieldErrors.location_country ? 'border-red-300 focus:ring-red-100 focus:border-red-400' : 'border-slate-200 focus:ring-[#82a8a4]/10 focus:border-[#82a8a4]'}`}
                    >
                      <option value="">Land auswählen...</option>
                      <option value="Deutschland">Deutschland</option>
                      <option value="Österreich">Österreich</option>
                      <option value="Schweiz">Schweiz</option>
                      <option disabled>──────────</option>
                      <option value="Albanien">Albanien</option>
                      <option value="Andorra">Andorra</option>
                      <option value="Belgien">Belgien</option>
                      <option value="Bosnien und Herzegowina">Bosnien und Herzegowina</option>
                      <option value="Bulgarien">Bulgarien</option>
                      <option value="Dänemark">Dänemark</option>
                      <option value="Estland">Estland</option>
                      <option value="Finnland">Finnland</option>
                      <option value="Frankreich">Frankreich</option>
                      <option value="Griechenland">Griechenland</option>
                      <option value="Irland">Irland</option>
                      <option value="Island">Island</option>
                      <option value="Italien">Italien</option>
                      <option value="Kosovo">Kosovo</option>
                      <option value="Kroatien">Kroatien</option>
                      <option value="Lettland">Lettland</option>
                      <option value="Liechtenstein">Liechtenstein</option>
                      <option value="Litauen">Litauen</option>
                      <option value="Luxemburg">Luxemburg</option>
                      <option value="Malta">Malta</option>
                      <option value="Moldawien">Moldawien</option>
                      <option value="Monaco">Monaco</option>
                      <option value="Montenegro">Montenegro</option>
                      <option value="Niederlande">Niederlande</option>
                      <option value="Nordmazedonien">Nordmazedonien</option>
                      <option value="Norwegen">Norwegen</option>
                      <option value="Polen">Polen</option>
                      <option value="Portugal">Portugal</option>
                      <option value="Rumänien">Rumänien</option>
                      <option value="San Marino">San Marino</option>
                      <option value="Schweden">Schweden</option>
                      <option value="Serbien">Serbien</option>
                      <option value="Slowakei">Slowakei</option>
                      <option value="Slowenien">Slowenien</option>
                      <option value="Spanien">Spanien</option>
                      <option value="Tschechien">Tschechien</option>
                      <option value="Ukraine">Ukraine</option>
                      <option value="Ungarn">Ungarn</option>
                      <option value="Vatikanstadt">Vatikanstadt</option>
                      <option value="Vereinigtes Königreich">Vereinigtes Königreich</option>
                      <option value="Weißrussland">Weißrussland</option>
                      <option value="Zypern">Zypern</option>
                    </select>
                    {fieldErrors.location_country && <p className="text-[10px] text-red-500 font-medium ml-1 flex items-center gap-1"><AlertCircle size={10} />{fieldErrors.location_country}</p>}
                  </div>
                </div>
              </div>
            )}

            {/* SCHRITT 2: KUNDE (Unternehmen & Ansprechpartner) */}
            {formStep === 2 && (
              <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-500">
                {/* Unternehmen */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2.5 mb-1">
                    <div className="w-7 h-7 rounded-lg bg-[#82a8a4] text-white flex items-center justify-center">
                      <Building size={14} />
                    </div>
                    <h2 className="font-bold text-xs text-slate-700">Unternehmen</h2>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Unternehmensname</label>
                    <div className="relative group">
                      <Building className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${fieldErrors.company_name ? 'text-red-400' : 'text-slate-400 group-focus-within:text-[#82a8a4]'}`} size={14} />
                      <input 
                        type="text" 
                        name="company_name"
                        value={formData.company_name}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="Muster GmbH" 
                        className={`w-full pl-11 pr-4 py-2.5 bg-slate-50 border rounded-xl focus:ring-4 outline-none font-bold text-xs text-slate-700 ${fieldErrors.company_name ? 'border-red-300 focus:ring-red-100 focus:border-red-400' : 'border-slate-200 focus:ring-[#82a8a4]/10 focus:border-[#82a8a4]'}`}
                      />
                    </div>
                    {fieldErrors.company_name && <p className="text-[10px] text-red-500 font-medium ml-1 flex items-center gap-1"><AlertCircle size={10} />{fieldErrors.company_name}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Website</label>
                    <div className="relative group">
                      <Globe className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${fieldErrors.website ? 'text-red-400' : 'text-slate-400 group-focus-within:text-[#82a8a4]'}`} size={14} />
                      <input 
                        type="text" 
                        name="website"
                        value={formData.website}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="https://www.unternehmen.de" 
                        className={`w-full pl-11 pr-4 py-2.5 bg-slate-50 border rounded-xl focus:ring-4 outline-none font-bold text-xs text-slate-700 ${fieldErrors.website ? 'border-red-300 focus:ring-red-100 focus:border-red-400' : 'border-slate-200 focus:ring-[#82a8a4]/10 focus:border-[#82a8a4]'}`}
                      />
                    </div>
                    {fieldErrors.website && <p className="text-[10px] text-red-500 font-medium ml-1 flex items-center gap-1"><AlertCircle size={10} />{fieldErrors.website}</p>}
                  </div>
                </div>

                {/* Ansprechpartner */}
                <div className="space-y-4 pt-5 border-t border-slate-100">
                  <div className="flex items-center gap-2.5 mb-1">
                    <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center">
                      <User size={14} />
                    </div>
                    <h2 className="font-bold text-xs text-slate-700">Ansprechpartner</h2>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Vorname</label>
                      <div className="relative group">
                        <User className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${fieldErrors.contact_fname ? 'text-red-400' : 'text-slate-400 group-focus-within:text-[#82a8a4]'}`} size={14} />
                  <input 
                    type="text" 
                    name="contact_fname"
                    value={formData.contact_fname}
                    onChange={handleChange}
                          onBlur={handleBlur}
                    placeholder="Max" 
                          className={`w-full pl-11 pr-4 py-2.5 bg-slate-50 border rounded-xl focus:ring-4 outline-none font-bold text-xs text-slate-700 ${fieldErrors.contact_fname ? 'border-red-300 focus:ring-red-100 focus:border-red-400' : 'border-slate-200 focus:ring-[#82a8a4]/10 focus:border-[#82a8a4]'}`}
                  />
                </div>
                      {fieldErrors.contact_fname && <p className="text-[10px] text-red-500 font-medium ml-1 flex items-center gap-1"><AlertCircle size={10} />{fieldErrors.contact_fname}</p>}
              </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Nachname</label>
                      <div className="relative group">
                        <User className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${fieldErrors.contact_lname ? 'text-red-400' : 'text-slate-400 group-focus-within:text-[#82a8a4]'}`} size={14} />
                  <input 
                    type="text" 
                    name="contact_lname"
                    value={formData.contact_lname}
                    onChange={handleChange}
                          onBlur={handleBlur}
                    placeholder="Mustermann" 
                          className={`w-full pl-11 pr-4 py-2.5 bg-slate-50 border rounded-xl focus:ring-4 outline-none font-bold text-xs text-slate-700 ${fieldErrors.contact_lname ? 'border-red-300 focus:ring-red-100 focus:border-red-400' : 'border-slate-200 focus:ring-[#82a8a4]/10 focus:border-[#82a8a4]'}`}
                  />
                      </div>
                      {fieldErrors.contact_lname && <p className="text-[10px] text-red-500 font-medium ml-1 flex items-center gap-1"><AlertCircle size={10} />{fieldErrors.contact_lname}</p>}
                </div>
              </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">E-Mail</label>
                    <div className="relative group">
                      <Mail className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${fieldErrors.contact_email ? 'text-red-400' : 'text-slate-400 group-focus-within:text-[#82a8a4]'}`} size={14} />
                  <input 
                    type="email" 
                    name="contact_email"
                    value={formData.contact_email}
                    onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="kontakt@unternehmen.de" 
                        className={`w-full pl-11 pr-4 py-2.5 bg-slate-50 border rounded-xl focus:ring-4 outline-none font-bold text-xs text-slate-700 ${fieldErrors.contact_email ? 'border-red-300 focus:ring-red-100 focus:border-red-400' : 'border-slate-200 focus:ring-[#82a8a4]/10 focus:border-[#82a8a4]'}`}
                  />
                </div>
                    {fieldErrors.contact_email && <p className="text-[10px] text-red-500 font-medium ml-1 flex items-center gap-1"><AlertCircle size={10} />{fieldErrors.contact_email}</p>}
              </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Telefon</label>
                    <div className="relative group">
                      <Phone className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${fieldErrors.contact_phone ? 'text-red-400' : 'text-slate-400 group-focus-within:text-[#82a8a4]'}`} size={14} />
                  <input 
                    type="tel" 
                    name="contact_phone"
                    value={formData.contact_phone}
                    onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="+49 123 4567890" 
                        className={`w-full pl-11 pr-4 py-2.5 bg-slate-50 border rounded-xl focus:ring-4 outline-none font-bold text-xs text-slate-700 ${fieldErrors.contact_phone ? 'border-red-300 focus:ring-red-100 focus:border-red-400' : 'border-slate-200 focus:ring-[#82a8a4]/10 focus:border-[#82a8a4]'}`}
                  />
                </div>
                    {fieldErrors.contact_phone && <p className="text-[10px] text-red-500 font-medium ml-1 flex items-center gap-1"><AlertCircle size={10} />{fieldErrors.contact_phone}</p>}
              </div>
            </div>
          </div>
        )}

            {/* Navigation-Buttons */}
            <div className="flex justify-between items-center pt-4">
              {formStep > 1 ? (
          <button 
                  type="button" 
                  onClick={() => setFormStep(1)} 
                  className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-slate-800 transition-colors"
                >
                  <ArrowLeft size={14} /> Zurück
          </button>
              ) : (
                <div></div>
              )}
          
              {formStep === 1 ? (
            <button 
                  type="submit" 
                  className="bg-[#82a8a4] hover:bg-[#72938f] text-white font-bold px-6 py-2.5 rounded-xl shadow-lg shadow-[#82a8a4]/20 flex items-center gap-1.5 text-xs transition-all active:scale-95"
            >
                  Weiter <ArrowRight size={14} />
            </button>
          ) : (
            <button 
                  type="submit" 
              disabled={loading}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-6 py-2.5 rounded-xl shadow-lg text-xs transition-all active:scale-95 disabled:opacity-70 flex items-center gap-1.5"
            >
              {loading ? (
                    <>Wird gespeichert... <Loader2 className="animate-spin" size={14} /></>
              ) : (
                    <>Projekt erstellen <CheckCircle2 size={14} /></>
              )}
            </button>
          )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ProjektFormular;
