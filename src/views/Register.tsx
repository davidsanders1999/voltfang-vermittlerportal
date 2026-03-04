import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { 
  Mail, 
  Lock, 
  Loader2, 
  Building, 
  User, 
  Phone, 
  Globe, 
  MapPin,
  ArrowLeft, 
  ArrowRight, 
  CheckCircle2,
  Ticket,
  Users,
  AlertCircle,
  Briefcase,
  Eye,
  EyeOff
} from 'lucide-react';
import {
  isValidEmail,
  isValidPassword,
  isValidPhone,
  isValidUrl,
  isValidZip,
  isValidName,
  hasMinLength,
  ValidationErrors
} from '../utils/validation';
import { GERMAN_STATES, SALUTATIONS } from '../types';

/**
 * Daten für die Registrierungs-Erfolgsseite
 */
interface RegistrationSuccessData {
  email: string;
  fname: string;
  companyName?: string;
}

/**
 * Props für die Register-Komponente
 * @property onBackToLogin - Funktion, um zurück zum Login zu springen
 * @property onRegistrationStart - Callback wenn Registrierung startet (blockiert Auth-Events!)
 * @property onRegisterSuccess - Callback bei erfolgreicher Registrierung mit Daten
 * @property onRegistrationError - Callback bei Registrierungsfehler
 * @property inviteCode - Optionaler Einladungscode aus URL-Parameter
 */
interface RegisterProps {
  onBackToLogin: () => void;
  onRegistrationStart: () => void;
  onRegisterSuccess: (data: RegistrationSuccessData) => void;
  onRegistrationError: () => void;
  inviteCode?: string;
}

interface InvitationInfo {
  company_name: string;
  company_id: string;
}

/**
 * 2-Step-Registrierungsformular für neue Partner
 * Step 1: Persönliche Daten
 * Step 2: Unternehmensdaten ODER Einladungscode
 */
const Register: React.FC<RegisterProps> = ({ 
  onBackToLogin, 
  onRegistrationStart, 
  onRegisterSuccess, 
  onRegistrationError,
  inviteCode: initialInviteCode 
}) => {
  // Step 1: Persönliche Daten, Step 2: Unternehmen/Einladung
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Einladungscode State
  const [inviteCode, setInviteCode] = useState(initialInviteCode || '');
  const [invitationInfo, setInvitationInfo] = useState<InvitationInfo | null>(null);
  const [validatingCode, setValidatingCode] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);

  // Zentraler Form-State für alle Schritte
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    salutation: '' as typeof SALUTATIONS[number] | '',
    fname: '',
    lname: '',
    rolle_im_unternehmen: '',
    phone: '',
    companyName: '',
    website: '',
    street: '',
    zip: '',
    city: '',
    bundesland: '' as typeof GERMAN_STATES[number] | '',
    country: 'Deutschland',
    branche_partner: '',
  });

  const BRANCHE_OPTIONS = [
    'Agentur', 'Berater', 'Dienstleister', 'Elektriker', 'Energieberater',
    'EPC', 'EVU / Stadtwerke', 'Gewerblicher Endkunde', 'Großhandel',
    'Ladesäulenbetreiber', 'OEM', 'Planungsbüro', 'Privater Endkunde',
    'Solarinstallateur', 'Sonstiger Multiplikator', 'Voltfang Freelancer',
  ];

  // Validierungsfehler pro Feld
  const [fieldErrors, setFieldErrors] = useState<ValidationErrors>({});
  // Bereits "berührte" Felder (für onBlur-Validierung)
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());

  /**
   * Validiert Schritt 1 Felder
   */
  const validateStep1 = (): ValidationErrors => {
    const errors: ValidationErrors = {};

    if (!formData.salutation) errors.salutation = 'Bitte wählen Sie eine Anrede';
    if (!isValidName(formData.fname)) errors.fname = 'Bitte geben Sie einen gültigen Vornamen ein (min. 2 Zeichen)';
    if (!isValidName(formData.lname)) errors.lname = 'Bitte geben Sie einen gültigen Nachnamen ein (min. 2 Zeichen)';
    if (!hasMinLength(formData.rolle_im_unternehmen, 2)) errors.rolle_im_unternehmen = 'Bitte geben Sie Ihre Rolle an (min. 2 Zeichen)';
    if (!isValidEmail(formData.email)) errors.email = 'Bitte geben Sie eine gültige E-Mail-Adresse ein';
    if (!isValidPassword(formData.password)) errors.password = 'Mindestens 8 Zeichen und 1 Zahl erforderlich';
    if (formData.confirmPassword !== formData.password) errors.confirmPassword = 'Passwörter stimmen nicht überein';
    if (formData.phone && !isValidPhone(formData.phone)) errors.phone = 'Bitte geben Sie eine gültige Telefonnummer ein';

    return errors;
  };

  /**
   * Validiert Schritt 2 Felder (nur wenn kein Einladungscode)
   */
  const validateStep2 = (): ValidationErrors => {
    const errors: ValidationErrors = {};

    // Wenn Einladung vorhanden, keine Unternehmensdaten validieren
    if (invitationInfo) return errors;

    if (!hasMinLength(formData.companyName, 2)) errors.companyName = 'Bitte geben Sie einen Unternehmensnamen ein (min. 2 Zeichen)';
    if (!formData.branche_partner) errors.branche_partner = 'Bitte wählen Sie eine Branche';
    if (formData.website && !isValidUrl(formData.website)) errors.website = 'Bitte geben Sie eine gültige URL ein (z.B. https://beispiel.de)';
    if (!hasMinLength(formData.street, 3)) errors.street = 'Bitte geben Sie eine gültige Adresse ein';
    if (!isValidZip(formData.zip)) errors.zip = 'Bitte geben Sie eine gültige PLZ ein (4-5 Ziffern)';
    if (!hasMinLength(formData.city, 2)) errors.city = 'Bitte geben Sie eine Stadt ein';
    if (!formData.bundesland) errors.bundesland = 'Bitte wählen Sie ein Bundesland';

    return errors;
  };

  /**
   * Validiert ein einzelnes Feld (für onBlur)
   */
  const validateField = (name: string, value: string): string | undefined => {
    switch (name) {
      case 'salutation':
        return value ? undefined : 'Bitte Anrede auswählen';
      case 'fname':
      case 'lname':
        return isValidName(value) ? undefined : 'Mindestens 2 Zeichen erforderlich';
      case 'rolle_im_unternehmen':
        return hasMinLength(value, 2) ? undefined : 'Min. 2 Zeichen erforderlich';
      case 'email':
        return isValidEmail(value) ? undefined : 'Ungültige E-Mail-Adresse';
      case 'password':
        return isValidPassword(value) ? undefined : 'Min. 8 Zeichen und 1 Zahl';
      case 'confirmPassword':
        return value === formData.password ? undefined : 'Passwörter stimmen nicht überein';
      case 'phone':
        return !value || isValidPhone(value) ? undefined : 'Ungültige Telefonnummer';
      case 'companyName':
        return invitationInfo || hasMinLength(value, 2) ? undefined : 'Min. 2 Zeichen';
      case 'website':
        return !value || isValidUrl(value) ? undefined : 'Ungültige URL';
      case 'street':
        return invitationInfo || hasMinLength(value, 3) ? undefined : 'Min. 3 Zeichen';
      case 'zip':
        return invitationInfo || isValidZip(value) ? undefined : '4-5 Ziffern';
      case 'city':
        return invitationInfo || hasMinLength(value, 2) ? undefined : 'Min. 2 Zeichen';
      case 'bundesland':
        return invitationInfo || value ? undefined : 'Bundesland auswählen';
      case 'branche_partner':
        return invitationInfo || value ? undefined : 'Branche auswählen';
      default:
        return undefined;
    }
  };

  /**
   * Prüft ob der aktuelle Schritt valide ist
   */
  const isStepValid = (stepNumber: number): boolean => {
    if (stepNumber === 1) {
      return Object.keys(validateStep1()).length === 0;
    }
    return Object.keys(validateStep2()).length === 0;
  };

  // Prüft Einladungscode beim Laden wenn einer vorhanden ist
  useEffect(() => {
    if (initialInviteCode) {
      validateInviteCode(initialInviteCode);
    }
  }, [initialInviteCode]);

  /**
   * Validiert einen Einladungscode
   */
  const validateInviteCode = async (code: string) => {
    if (!code || code.length < 16) {
      setInvitationInfo(null);
      return;
    }

    setValidatingCode(true);
    setCodeError(null);

    try {
      const { data, error } = await supabase.rpc('validate_invitation_code', {
        p_code: code.toUpperCase()
      });

      if (error) throw error;

      if (data && data.length > 0 && data[0].is_valid) {
        setInvitationInfo({
          company_name: data[0].company_name,
          company_id: data[0].company_id
        });
        setInviteCode(code.toUpperCase());
      } else {
        setInvitationInfo(null);
        setCodeError('Ungültiger oder abgelaufener Einladungscode.');
      }
    } catch (err: any) {
      console.error('Fehler bei Code-Validierung:', err);
      setCodeError('Fehler bei der Überprüfung des Codes.');
      setInvitationInfo(null);
    } finally {
      setValidatingCode(false);
    }
  };

  /**
   * Entfernt die aktuelle Einladung
   */
  const clearInvitation = () => {
    setInviteCode('');
    setInvitationInfo(null);
    setCodeError(null);
  };

  /**
   * Generische Change-Handler für alle Input-Felder
   */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Fehler sofort entfernen wenn Feld korrigiert wird
    if (touchedFields.has(name)) {
      const error = validateField(name, value);
      setFieldErrors(prev => ({ ...prev, [name]: error }));
    }

    // Beim Ändern des Passworts auch die Wiederholung mitvalidieren.
    if (name === 'password' && touchedFields.has('confirmPassword')) {
      const confirmPasswordError = validateField('confirmPassword', formData.confirmPassword);
      setFieldErrors(prev => ({ ...prev, confirmPassword: confirmPasswordError }));
    }
  };

  /**
   * onBlur-Handler für Validierung beim Verlassen eines Feldes
   */
  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setTouchedFields(prev => new Set(prev).add(name));
    const error = validateField(name, value);
    setFieldErrors(prev => ({ ...prev, [name]: error }));
  };

  /**
   * Handler für Einladungscode-Eingabe
   */
  const handleInviteCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    setInviteCode(value);
    setCodeError(null);
    
    // Auto-Validierung bei 16 Zeichen
    if (value.length === 16) {
      validateInviteCode(value);
    } else {
      setInvitationInfo(null);
    }
  };

  /**
   * Führt die eigentliche Registrierung durch.
   */
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // WICHTIG: SOFORT den Registrierungs-Status setzen!
    // Das blockiert alle Auth-Events in App.tsx und verhindert das Dashboard-Flackern
    onRegistrationStart();

    try {
      // 1. Supabase Auth Registrierung (erstellt den Account)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Registrierung fehlgeschlagen.');

      if (invitationInfo && inviteCode) {
        // 2a. Bei Einladung: Bestehendem Unternehmen beitreten
        const { error: rpcError } = await supabase.rpc('join_company_with_invitation', {
          p_auth_id: authData.user.id,
          p_fname: formData.fname,
          p_lname: formData.lname,
          p_phone: formData.phone,
          p_email: formData.email,
          p_invitation_code: inviteCode,
          p_salutation: formData.salutation || null,
          p_rolle_im_unternehmen: formData.rolle_im_unternehmen || null,
        });

        if (rpcError) throw rpcError;
      } else {
        // 2b. Normale Registrierung: Neues Unternehmen erstellen
        // Hinweis: Die Supabase-RPC handle_new_partner_registration muss p_branche_partner, p_bundesland,
        // p_salutation und p_rolle_im_unternehmen akzeptieren.
        const { error: rpcError } = await supabase.rpc('handle_new_partner_registration', {
          p_auth_id: authData.user.id,
          p_fname: formData.fname,
          p_lname: formData.lname,
          p_phone: formData.phone,
          p_company_name: formData.companyName,
          p_website: formData.website,
          p_street: formData.street,
          p_zip: formData.zip,
          p_city: formData.city,
          p_country: formData.country,
          p_email: formData.email,
          p_branche_partner: formData.branche_partner || null,
          p_bundesland: formData.bundesland || null,
          p_salutation: formData.salutation || null,
          p_rolle_im_unternehmen: formData.rolle_im_unternehmen || null,
        });

        if (rpcError) throw rpcError;
      }

      // Wichtig: User ausloggen, damit die Erfolgsseite angezeigt wird
      // (Bei deaktivierter E-Mail-Bestätigung wird der User sonst automatisch eingeloggt
      // und die App würde direkt zum Dashboard/Freischaltungs-Screen wechseln)
      await supabase.auth.signOut();

      // Erfolgs-Callback mit Registrierungsdaten aufrufen
      onRegisterSuccess({
        email: formData.email,
        fname: formData.fname,
        companyName: invitationInfo?.company_name || formData.companyName || undefined,
      });
    } catch (err: any) {
      setError('Registrierung fehlgeschlagen. Bitte versuchen Sie es erneut.');
      console.error(err);
      // Bei Fehler: Status zurücksetzen, damit User es erneut versuchen kann
      onRegistrationError();
    } finally {
      setLoading(false);
    }
  };

  /**
   * Behandelt den Weiter-Button
   */
  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (step === 1) {
      // Validiere Schritt 1 vor dem Weiter
      const errors = validateStep1();
      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors);
        setTouchedFields(new Set(['salutation', 'fname', 'lname', 'rolle_im_unternehmen', 'email', 'password', 'confirmPassword', 'phone']));
        return;
      }
      setStep(2);
    } else {
      // Validiere Schritt 2 vor dem Absenden
      const errors = validateStep2();
      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors);
        setTouchedFields(new Set(['companyName', 'branche_partner', 'website', 'street', 'zip', 'city', 'bundesland']));
        return;
      }
      handleRegister(e);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafb] flex items-center justify-center p-4 py-12">
      <div className="max-w-2xl w-full">
        {/* Header-Infos */}
        <div className="text-center mb-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight mb-1">Partner werden</h1>
          <p className="text-slate-500 text-xs">Erstellen Sie Ihr Konto für das Vermittler Portal</p>
        </div>

        {/* Registrierungskarte mit Steps */}
        <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/60 border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150">
          <div className="p-6 md:p-8">
            {/* Progress-Balken oben - 2 Schritte */}
            <div className="flex gap-2 mb-8">
              {[1, 2].map(i => (
                <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-500 ${step >= i ? 'bg-[#82a8a4]' : 'bg-slate-100'}`} />
              ))}
            </div>

            <form onSubmit={handleNext} className="space-y-5">
              
              {/* SCHRITT 1: PERSÖNLICHE DATEN & LOGIN */}
              {step === 1 && (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
                  <div className="flex items-center gap-2.5 mb-1">
                    <div className="w-7 h-7 rounded-lg bg-[#82a8a4] text-white flex items-center justify-center">
                      <User size={14} />
                    </div>
                    <h2 className="font-bold text-xs text-slate-700">Persönliche Daten</h2>
                  </div>

                  {/* Anrede */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Anrede</label>
                    <select
                      name="salutation"
                      value={formData.salutation}
                      onChange={(e) => setFormData(prev => ({ ...prev, salutation: e.target.value as typeof SALUTATIONS[number] | '' }))}
                      onBlur={handleBlur}
                      className={`w-full px-4 py-2.5 bg-slate-50 border rounded-xl focus:ring-4 outline-none font-bold text-xs text-slate-700 appearance-none cursor-pointer ${fieldErrors.salutation ? 'border-red-300 focus:ring-red-100 focus:border-red-400' : 'border-slate-200 focus:ring-[#82a8a4]/10 focus:border-[#82a8a4]'}`}
                    >
                      <option value="">Anrede auswählen...</option>
                      {SALUTATIONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    {fieldErrors.salutation && <p className="text-[10px] text-red-500 font-medium ml-1 flex items-center gap-1"><AlertCircle size={10} />{fieldErrors.salutation}</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Vorname</label>
                      <div className="relative group">
                        <User className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${fieldErrors.fname ? 'text-red-400' : 'text-slate-400 group-focus-within:text-[#82a8a4]'}`} size={14} />
                        <input type="text" name="fname" value={formData.fname} onChange={handleChange} onBlur={handleBlur} placeholder="Max" className={`w-full pl-11 pr-4 py-2.5 bg-slate-50 border rounded-xl focus:ring-4 outline-none font-bold text-xs text-slate-700 ${fieldErrors.fname ? 'border-red-300 focus:ring-red-100 focus:border-red-400' : 'border-slate-200 focus:ring-[#82a8a4]/10 focus:border-[#82a8a4]'}`} />
                      </div>
                      {fieldErrors.fname && <p className="text-[10px] text-red-500 font-medium ml-1 flex items-center gap-1"><AlertCircle size={10} />{fieldErrors.fname}</p>}
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Nachname</label>
                      <div className="relative group">
                        <User className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${fieldErrors.lname ? 'text-red-400' : 'text-slate-400 group-focus-within:text-[#82a8a4]'}`} size={14} />
                        <input type="text" name="lname" value={formData.lname} onChange={handleChange} onBlur={handleBlur} placeholder="Mustermann" className={`w-full pl-11 pr-4 py-2.5 bg-slate-50 border rounded-xl focus:ring-4 outline-none font-bold text-xs text-slate-700 ${fieldErrors.lname ? 'border-red-300 focus:ring-red-100 focus:border-red-400' : 'border-slate-200 focus:ring-[#82a8a4]/10 focus:border-[#82a8a4]'}`} />
                      </div>
                      {fieldErrors.lname && <p className="text-[10px] text-red-500 font-medium ml-1 flex items-center gap-1"><AlertCircle size={10} />{fieldErrors.lname}</p>}
                    </div>
                  </div>

                  {/* Rolle im Unternehmen */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Rolle im Unternehmen</label>
                    <div className="relative group">
                      <Briefcase className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${fieldErrors.rolle_im_unternehmen ? 'text-red-400' : 'text-slate-400 group-focus-within:text-[#82a8a4]'}`} size={14} />
                      <input type="text" name="rolle_im_unternehmen" value={formData.rolle_im_unternehmen} onChange={handleChange} onBlur={handleBlur} placeholder="z.B. Geschäftsführer, Vertriebsleiter" className={`w-full pl-11 pr-4 py-2.5 bg-slate-50 border rounded-xl focus:ring-4 outline-none font-bold text-xs text-slate-700 ${fieldErrors.rolle_im_unternehmen ? 'border-red-300 focus:ring-red-100 focus:border-red-400' : 'border-slate-200 focus:ring-[#82a8a4]/10 focus:border-[#82a8a4]'}`} />
                    </div>
                    {fieldErrors.rolle_im_unternehmen && <p className="text-[10px] text-red-500 font-medium ml-1 flex items-center gap-1"><AlertCircle size={10} />{fieldErrors.rolle_im_unternehmen}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">E-Mail Adresse</label>
                    <div className="relative group">
                      <Mail className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${fieldErrors.email ? 'text-red-400' : 'text-slate-400 group-focus-within:text-[#82a8a4]'}`} size={14} />
                      <input type="email" name="email" value={formData.email} onChange={handleChange} onBlur={handleBlur} placeholder="name@beispiel.de" className={`w-full pl-11 pr-4 py-2.5 bg-slate-50 border rounded-xl focus:ring-4 outline-none font-bold text-xs text-slate-700 ${fieldErrors.email ? 'border-red-300 focus:ring-red-100 focus:border-red-400' : 'border-slate-200 focus:ring-[#82a8a4]/10 focus:border-[#82a8a4]'}`} />
                    </div>
                    {fieldErrors.email && <p className="text-[10px] text-red-500 font-medium ml-1 flex items-center gap-1"><AlertCircle size={10} />{fieldErrors.email}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Passwort</label>
                    <div className="relative group">
                      <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${fieldErrors.password ? 'text-red-400' : 'text-slate-400 group-focus-within:text-[#82a8a4]'}`} size={14} />
                      <input type={showPassword ? 'text' : 'password'} name="password" value={formData.password} onChange={handleChange} onBlur={handleBlur} placeholder="••••••••" className={`w-full pl-11 pr-11 py-2.5 bg-slate-50 border rounded-xl focus:ring-4 outline-none font-bold text-xs text-slate-700 ${fieldErrors.password ? 'border-red-300 focus:ring-red-100 focus:border-red-400' : 'border-slate-200 focus:ring-[#82a8a4]/10 focus:border-[#82a8a4]'}`} />
                      <button
                        type="button"
                        onClick={() => setShowPassword(prev => !prev)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                        aria-label={showPassword ? 'Passwort verbergen' : 'Passwort anzeigen'}
                      >
                        {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                    {fieldErrors.password && <p className="text-[10px] text-red-500 font-medium ml-1 flex items-center gap-1"><AlertCircle size={10} />{fieldErrors.password}</p>}
                    {!fieldErrors.password && <p className="text-[10px] text-slate-400 ml-1">Mindestens 8 Zeichen und 1 Zahl</p>}
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Passwort wiederholen</label>
                    <div className="relative group">
                      <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${fieldErrors.confirmPassword ? 'text-red-400' : 'text-slate-400 group-focus-within:text-[#82a8a4]'}`} size={14} />
                      <input type={showConfirmPassword ? 'text' : 'password'} name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} onBlur={handleBlur} placeholder="••••••••" className={`w-full pl-11 pr-11 py-2.5 bg-slate-50 border rounded-xl focus:ring-4 outline-none font-bold text-xs text-slate-700 ${fieldErrors.confirmPassword ? 'border-red-300 focus:ring-red-100 focus:border-red-400' : 'border-slate-200 focus:ring-[#82a8a4]/10 focus:border-[#82a8a4]'}`} />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(prev => !prev)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                        aria-label={showConfirmPassword ? 'Passwort verbergen' : 'Passwort anzeigen'}
                      >
                        {showConfirmPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                    {fieldErrors.confirmPassword && <p className="text-[10px] text-red-500 font-medium ml-1 flex items-center gap-1"><AlertCircle size={10} />{fieldErrors.confirmPassword}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Telefonnummer <span className="text-slate-300">(optional)</span></label>
                    <div className="relative group">
                      <Phone className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${fieldErrors.phone ? 'text-red-400' : 'text-slate-400 group-focus-within:text-[#82a8a4]'}`} size={14} />
                      <input type="tel" name="phone" value={formData.phone} onChange={handleChange} onBlur={handleBlur} placeholder="+49 123 456789" className={`w-full pl-11 pr-4 py-2.5 bg-slate-50 border rounded-xl focus:ring-4 outline-none font-bold text-xs text-slate-700 ${fieldErrors.phone ? 'border-red-300 focus:ring-red-100 focus:border-red-400' : 'border-slate-200 focus:ring-[#82a8a4]/10 focus:border-[#82a8a4]'}`} />
                    </div>
                    {fieldErrors.phone && <p className="text-[10px] text-red-500 font-medium ml-1 flex items-center gap-1"><AlertCircle size={10} />{fieldErrors.phone}</p>}
                  </div>
                </div>
              )}

              {/* SCHRITT 2: UNTERNEHMEN ODER EINLADUNGSCODE */}
              {step === 2 && (
                <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-500">
                  
                  {/* Einladungscode-Sektion */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2.5 mb-1">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${invitationInfo ? 'bg-green-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                        <Ticket size={14} />
                      </div>
                      <h2 className="font-bold text-xs text-slate-700">Einladungscode</h2>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">(optional)</span>
                    </div>

                    {invitationInfo ? (
                      // Gültige Einladung anzeigen
                      <div className="p-3 bg-green-50 border border-green-100 rounded-xl animate-in fade-in slide-in-from-top-4 duration-500">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                              <Users size={14} className="text-green-600" />
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-green-800">Einladung gültig</p>
                              <p className="text-xs font-bold text-green-600">{invitationInfo.company_name}</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={clearInvitation}
                            className="text-[10px] font-bold text-green-600 hover:text-green-800 transition-colors px-2.5 py-1 rounded-lg hover:bg-green-100"
                          >
                            Entfernen
                          </button>
                        </div>
                      </div>
                    ) : (
                      // Einladungscode-Eingabe
                      <div className="space-y-1.5">
                        <div className="relative group">
                          <Ticket className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#82a8a4] transition-colors" size={14} />
                          <input 
                            type="text" 
                            value={inviteCode} 
                            onChange={handleInviteCodeChange}
                            placeholder="z.B. ABCD1234EFGH5678" 
                            maxLength={16}
                            className={`w-full pl-11 pr-11 py-2.5 bg-slate-50 border rounded-xl focus:ring-4 focus:ring-[#82a8a4]/10 focus:border-[#82a8a4] outline-none font-mono text-xs tracking-wider uppercase ${
                              codeError ? 'border-red-300' : 'border-slate-200'
                            }`}
                          />
                          {validatingCode && (
                            <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 animate-spin" size={14} />
                          )}
                        </div>
                        {codeError && (
                          <p className="text-[10px] text-red-500 font-medium ml-1">{codeError}</p>
                        )}
                        <p className="text-[10px] text-slate-400 ml-1">
                          Haben Sie einen Einladungscode? Geben Sie ihn hier ein, um einem bestehenden Team beizutreten.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Trennlinie */}
                  {!invitationInfo && (
                    <div className="relative py-3">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-slate-200"></div>
                      </div>
                      <div className="relative flex justify-center">
                        <span className="bg-white px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">oder neues Unternehmen</span>
                      </div>
                    </div>
                  )}

                  {/* Unternehmensdaten (nur wenn keine Einladung) */}
                  {!invitationInfo && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2.5 mb-1">
                        <div className="w-7 h-7 rounded-lg bg-[#82a8a4] text-white flex items-center justify-center">
                          <Building size={14} />
                        </div>
                        <h2 className="font-bold text-xs text-slate-700">Unternehmensdaten</h2>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Unternehmensname</label>
                        <div className="relative group">
                          <Building className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${fieldErrors.companyName ? 'text-red-400' : 'text-slate-400 group-focus-within:text-[#82a8a4]'}`} size={14} />
                          <input type="text" name="companyName" value={formData.companyName} onChange={handleChange} onBlur={handleBlur} placeholder="Energie GmbH" className={`w-full pl-11 pr-4 py-2.5 bg-slate-50 border rounded-xl focus:ring-4 outline-none font-bold text-xs text-slate-700 ${fieldErrors.companyName ? 'border-red-300 focus:ring-red-100 focus:border-red-400' : 'border-slate-200 focus:ring-[#82a8a4]/10 focus:border-[#82a8a4]'}`} />
                        </div>
                        {fieldErrors.companyName && <p className="text-[10px] text-red-500 font-medium ml-1 flex items-center gap-1"><AlertCircle size={10} />{fieldErrors.companyName}</p>}
                      </div>

                      {/* Branche (Pflichtfeld) */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Branche</label>
                        <select
                          name="branche_partner"
                          value={formData.branche_partner}
                          onChange={(e) => setFormData(prev => ({ ...prev, branche_partner: e.target.value }))}
                          onBlur={handleBlur}
                          className={`w-full px-4 py-2.5 bg-slate-50 border rounded-xl focus:ring-4 outline-none font-bold text-xs text-slate-700 appearance-none cursor-pointer ${fieldErrors.branche_partner ? 'border-red-300 focus:ring-red-100 focus:border-red-400' : 'border-slate-200 focus:ring-[#82a8a4]/10 focus:border-[#82a8a4]'}`}
                        >
                          <option value="">Branche auswählen...</option>
                          {BRANCHE_OPTIONS.map(b => <option key={b} value={b}>{b}</option>)}
                        </select>
                        {fieldErrors.branche_partner && <p className="text-[10px] text-red-500 font-medium ml-1 flex items-center gap-1"><AlertCircle size={10} />{fieldErrors.branche_partner}</p>}
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Website <span className="text-slate-300">(optional)</span></label>
                        <div className="relative group">
                          <Globe className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${fieldErrors.website ? 'text-red-400' : 'text-slate-400 group-focus-within:text-[#82a8a4]'}`} size={14} />
                          <input type="text" name="website" value={formData.website} onChange={handleChange} onBlur={handleBlur} placeholder="https://www.beispiel.de" className={`w-full pl-11 pr-4 py-2.5 bg-slate-50 border rounded-xl focus:ring-4 outline-none font-bold text-xs text-slate-700 ${fieldErrors.website ? 'border-red-300 focus:ring-red-100 focus:border-red-400' : 'border-slate-200 focus:ring-[#82a8a4]/10 focus:border-[#82a8a4]'}`} />
                        </div>
                        {fieldErrors.website && <p className="text-[10px] text-red-500 font-medium ml-1 flex items-center gap-1"><AlertCircle size={10} />{fieldErrors.website}</p>}
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Straße & Hausnummer</label>
                        <div className="relative group">
                          <MapPin className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${fieldErrors.street ? 'text-red-400' : 'text-slate-400 group-focus-within:text-[#82a8a4]'}`} size={14} />
                          <input type="text" name="street" value={formData.street} onChange={handleChange} onBlur={handleBlur} placeholder="Musterstraße 1" className={`w-full pl-11 pr-4 py-2.5 bg-slate-50 border rounded-xl focus:ring-4 outline-none font-bold text-xs text-slate-700 ${fieldErrors.street ? 'border-red-300 focus:ring-red-100 focus:border-red-400' : 'border-slate-200 focus:ring-[#82a8a4]/10 focus:border-[#82a8a4]'}`} />
                        </div>
                        {fieldErrors.street && <p className="text-[10px] text-red-500 font-medium ml-1 flex items-center gap-1"><AlertCircle size={10} />{fieldErrors.street}</p>}
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">PLZ</label>
                          <input type="text" name="zip" value={formData.zip} onChange={handleChange} onBlur={handleBlur} placeholder="12345" maxLength={5} className={`w-full px-4 py-2.5 bg-slate-50 border rounded-xl focus:ring-4 outline-none font-bold text-xs text-slate-700 ${fieldErrors.zip ? 'border-red-300 focus:ring-red-100 focus:border-red-400' : 'border-slate-200 focus:ring-[#82a8a4]/10 focus:border-[#82a8a4]'}`} />
                          {fieldErrors.zip && <p className="text-[10px] text-red-500 font-medium flex items-center gap-1"><AlertCircle size={10} />{fieldErrors.zip}</p>}
                        </div>
                        <div className="space-y-1.5 col-span-2">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Stadt</label>
                          <input type="text" name="city" value={formData.city} onChange={handleChange} onBlur={handleBlur} placeholder="Berlin" className={`w-full px-4 py-2.5 bg-slate-50 border rounded-xl focus:ring-4 outline-none font-bold text-xs text-slate-700 ${fieldErrors.city ? 'border-red-300 focus:ring-red-100 focus:border-red-400' : 'border-slate-200 focus:ring-[#82a8a4]/10 focus:border-[#82a8a4]'}`} />
                          {fieldErrors.city && <p className="text-[10px] text-red-500 font-medium flex items-center gap-1"><AlertCircle size={10} />{fieldErrors.city}</p>}
                        </div>
                      </div>

                      {/* Bundesland */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Bundesland</label>
                        <select
                          name="bundesland"
                          value={formData.bundesland}
                          onChange={(e) => setFormData(prev => ({ ...prev, bundesland: e.target.value as typeof GERMAN_STATES[number] | '' }))}
                          onBlur={handleBlur}
                          className={`w-full px-4 py-2.5 bg-slate-50 border rounded-xl focus:ring-4 outline-none font-bold text-xs text-slate-700 appearance-none cursor-pointer ${fieldErrors.bundesland ? 'border-red-300 focus:ring-red-100 focus:border-red-400' : 'border-slate-200 focus:ring-[#82a8a4]/10 focus:border-[#82a8a4]'}`}
                        >
                          <option value="">Bundesland auswählen...</option>
                          {GERMAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        {fieldErrors.bundesland && <p className="text-[10px] text-red-500 font-medium ml-1 flex items-center gap-1"><AlertCircle size={10} />{fieldErrors.bundesland}</p>}
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Land</label>
                        <select 
                          name="country" 
                          value={formData.country} 
                          onChange={(e) => setFormData(prev => ({ ...prev, country: e.target.value }))}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-[#82a8a4]/10 focus:border-[#82a8a4] outline-none font-bold text-xs text-slate-700 appearance-none cursor-pointer"
                        >
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
                      </div>

                    </div>
                  )}
                </div>
              )}

              {/* Fehlermeldung bei Registrierung */}
              {error && (
                <div className="bg-red-50 text-red-600 text-xs font-bold p-3 rounded-xl border border-red-100">
                  {error}
                </div>
              )}

              {/* Navigation-Buttons am Ende der Form */}
              <div className="flex justify-between items-center pt-4">
                {step > 1 ? (
                  <button type="button" onClick={() => setStep(1)} className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-slate-800 transition-colors">
                    <ArrowLeft size={14} /> Zurück
                  </button>
                ) : (
                  <button type="button" onClick={onBackToLogin} className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-slate-800 transition-colors">
                    <ArrowLeft size={14} /> Zum Login
                  </button>
                )}

                {step === 1 ? (
                  <button type="submit" className="bg-[#82a8a4] hover:bg-[#72938f] text-white font-bold text-xs px-6 py-2.5 rounded-xl shadow-lg shadow-[#82a8a4]/20 flex items-center gap-1.5 transition-all active:scale-95">
                    Weiter <ArrowRight size={14} />
                  </button>
                ) : (
                  <button type="submit" disabled={loading} className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-6 py-2.5 rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-70 flex items-center gap-1.5">
                    {loading ? <Loader2 className="animate-spin" size={14} /> : <>{invitationInfo ? 'Team beitreten' : 'Registrieren'} <CheckCircle2 size={14} /></>}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
