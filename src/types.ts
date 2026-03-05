
export type ProjectStatus =
  | 'Eingangsprüfung'
  | 'Technische Klärung'
  | 'Angebotsklärung'
  | 'Closing'
  | 'Gewonnen'
  | 'Verloren';

export type EstimatedCapacity =
  | '100 - 500 kWh'
  | '500 - 1000 kWh'
  | '1000 - 5000 kWh'
  | '>5000 kWh';

export const GERMAN_STATES = [
  'Baden-Württemberg',
  'Bayern',
  'Berlin',
  'Brandenburg',
  'Bremen',
  'Hamburg',
  'Hessen',
  'Mecklenburg-Vorpommern',
  'Niedersachsen',
  'Nordrhein-Westfalen',
  'Rheinland-Pfalz',
  'Saarland',
  'Sachsen',
  'Sachsen-Anhalt',
  'Schleswig-Holstein',
  'Thüringen',
] as const;

export const SALUTATIONS = ['Herr', 'Frau', 'divers', 'Herr Dr.', 'Frau Dr.'] as const;

export interface Project {
  id: string;
  name: string;
  dealstage: ProjectStatus;
  // Projektstandort
  location_street: string;
  location_zip: string;
  location_city: string;
  location_state: string;
  location_country: string;
  estimated_order_date?: string;
  estimated_capacity?: EstimatedCapacity;
  offered_capacity?: number;
  // Projektunternehmen (Pflichtfelder)
  unternehmen_name: string;
  unternehmen_website?: string;
  unternehmen_street: string;
  unternehmen_zip: string;
  unternehmen_city: string;
  unternehmen_state: string;
  unternehmen_country: string;
  // Projektkontakt (Pflichtfelder)
  kontakt_salutation: string;
  kontakt_fname: string;
  kontakt_lname: string;
  kontakt_email: string;
  kontakt_phone: string;
  kontakt_rolle_im_unternehmen: string;
  // Meta
  created_at: string;
  company_id?: string;
  hubspot_id?: number;
  hubspot_project_contact_id?: number;
  hubspot_project_company_id?: number;
  vf_contact_name?: string;
  created_by_user_id: string;
  company_name?: string;
  creator: { fname: string; lname: string };
}

export type ViewType = 'dashboard' | 'projekte' | 'academy' | 'profile';

export interface UserCompany {
  id: string;
  name?: string;
  website?: string;
  street?: string;
  zip?: string;
  city?: string;
  country?: string;
  bundesland?: string;
  branche_partner?: string;
  invite_code?: string;
  hubspot_id?: number;
  created_at: string;
}

export interface User {
  id: string;
  auth_id?: string;
  company_id?: string;
  hubspot_id?: number;
  fname: string;
  lname: string;
  salutation?: string;
  rolle_im_unternehmen?: string;
  email?: string;
  phone?: string;
  created_at: string;
  vermittlerportal_status?: 'Freischaltung ausstehend' | 'Aktiv';
  is_unlocked?: boolean;
}
