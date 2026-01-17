
export type ProjectStatus = 
  | 'Lead übergeben' 
  | 'Technische Klärung' 
  | 'Vertragliche Klärung' 
  | 'Closing' 
  | 'Gewonnen' 
  | 'Verloren';

export type EstimatedCapacity = 
  | '100 - 500 kWh'
  | '500 - 1000 kWh'
  | '1000 - 5000 kWh'
  | '>5000 kWh';

export interface Project {
  id: string;
  name: string;
  company_name: string;
  website?: string;
  status: ProjectStatus;
  volume?: number;
  contact_fname: string;
  contact_lname: string;
  contact_email: string;
  contact_phone?: string;
  location_street: string;
  location_zip: string;
  location_city: string;
  location_country: string;
  estimated_order_date?: string;
  estimated_capacity?: EstimatedCapacity;
  created_at: string;
  company_id?: string;
}

export type ViewType = 'dashboard' | 'projekte' | 'academy' | 'profile';

export interface UserCompany {
  id: string;
  name: string;
  website?: string;
  street: string;
  zip: string;
  city: string;
  country: string;
  created_at: string;
}

export interface User {
  id: string;
  auth_id: string;
  company_id?: string;
  fname: string;
  lname: string;
  email?: string; // Not in DB table but usually available via auth
  phone?: string;
  created_at: string;
}
