import { Project, ProjectStatus } from '@/types';

export const mockProjectActive: Project = {
  id: 'proj-1',
  name: 'Solarspeicher Müller GmbH',
  description: 'Zugang zum Technikraum nur mit Voranmeldung beim Facility-Team.',
  dealstage: 'Eingangsprüfung',
  location_street: 'Musterstraße 1',
  location_zip: '80331',
  location_city: 'München',
  location_state: 'Bayern',
  location_country: 'Deutschland',
  estimated_order_date: '2026-06-01',
  estimated_capacity: '500 - 1000 kWh',
  offered_capacity: 0,
  unternehmen_name: 'Müller GmbH',
  unternehmen_website: 'https://mueller-gmbh.de',
  unternehmen_street: 'Industrieweg 5',
  unternehmen_zip: '80333',
  unternehmen_city: 'München',
  unternehmen_state: 'Bayern',
  unternehmen_country: 'Deutschland',
  kontakt_salutation: 'Herr',
  kontakt_fname: 'Klaus',
  kontakt_lname: 'Müller',
  kontakt_email: 'k.mueller@mueller-gmbh.de',
  kontakt_phone: '+49 89 1234567',
  kontakt_rolle_im_unternehmen: 'Geschäftsführer',
  created_at: '2026-01-15T10:00:00Z',
  created_by_user_id: 'user-1',
  vf_contact_name: 'Roman Alberti',
  vf_contact_email: 'roman.alberti@voltfang.de',
  vf_contact_phone: '+49 123 4567890',
  creator: { fname: 'Max', lname: 'Mustermann' },
};

export const mockProjectOffered: Project = {
  ...mockProjectActive,
  id: 'proj-2',
  name: 'Energiespeicher Schmidt',
  dealstage: 'Technische Klärung',
  offered_capacity: 750,
  estimated_capacity: undefined,
  location_city: 'Berlin',
  location_state: 'Berlin',
  unternehmen_name: 'Schmidt AG',
  created_at: '2026-02-10T10:00:00Z',
  creator: { fname: 'Anna', lname: 'Schmidt' },
  created_by_user_id: 'user-2',
};

export const mockProjectGewonnen: Project = {
  ...mockProjectActive,
  id: 'proj-3',
  name: 'Gewonnenes Projekt',
  dealstage: 'Gewonnen',
  offered_capacity: 1500,
  estimated_capacity: undefined,
  location_city: 'Hamburg',
  unternehmen_name: 'Gewinner AG',
  created_at: '2025-12-01T10:00:00Z',
  creator: { fname: 'Max', lname: 'Mustermann' },
};

export const mockProjectVerloren: Project = {
  ...mockProjectActive,
  id: 'proj-4',
  name: 'Verlorenes Projekt',
  dealstage: 'Verloren',
  location_city: 'Frankfurt',
  unternehmen_name: 'Verlierer GmbH',
  created_at: '2025-11-01T10:00:00Z',
  creator: { fname: 'Max', lname: 'Mustermann' },
};

export function createMockProject(overrides: Partial<Project> = {}): Project {
  return {
    ...mockProjectActive,
    id: `proj-${Math.random().toString(36).slice(2, 9)}`,
    ...overrides,
  };
}

export function createProjectList(count: number, overrides: Partial<Project> = {}): Project[] {
  return Array.from({ length: count }, (_, i) =>
    createMockProject({
      id: `proj-list-${i}`,
      name: `Projekt ${i + 1}`,
      location_city: `Stadt ${i + 1}`,
      created_at: new Date(2026, 0, i + 1).toISOString(),
      ...overrides,
    })
  );
}
