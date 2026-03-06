import { User, UserCompany } from '@/types';

export const mockUser: User = {
  id: 'user-1',
  auth_id: 'auth-uuid-1',
  company_id: 'company-1',
  hubspot_id: 123456,
  fname: 'Max',
  lname: 'Mustermann',
  salutation: 'Herr',
  rolle_im_unternehmen: 'Geschäftsführer',
  email: 'max.mustermann@example.com',
  phone: '+49 89 1234567',
  created_at: '2025-06-01T10:00:00Z',
  vermittlerportal_status: 'Aktiv',
  is_unlocked: true,
};

export const mockUserCompany: UserCompany = {
  id: 'company-1',
  name: 'Muster GmbH',
  website: 'https://muster-gmbh.de',
  street: 'Hauptstraße 1',
  zip: '80331',
  city: 'München',
  country: 'Deutschland',
  bundesland: 'Bayern',
  branche_partner: 'Energieberatung',
  invite_code: 'ABCD1234EFGH5678',
  hubspot_id: 789012,
  created_at: '2025-06-01T09:00:00Z',
};

export const mockTeamMembers = [
  {
    id: 'user-1',
    fname: 'Max',
    lname: 'Mustermann',
    email: 'max.mustermann@example.com',
    created_at: '2025-06-01T10:00:00Z',
    is_unlocked: true,
    vermittlerportal_status: 'Aktiv',
  },
  {
    id: 'user-2',
    fname: 'Anna',
    lname: 'Schmidt',
    email: 'anna.schmidt@example.com',
    created_at: '2025-07-01T10:00:00Z',
    is_unlocked: false,
    vermittlerportal_status: 'Freischaltung ausstehend',
  },
  {
    id: 'user-3',
    fname: 'Peter',
    lname: 'Meier',
    email: 'peter.meier@example.com',
    created_at: '2025-08-01T10:00:00Z',
    is_unlocked: true,
    vermittlerportal_status: 'Aktiv',
  },
];
