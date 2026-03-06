import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '@/utils/supabase';
import {
  getHubSpotContext,
  createHubSpotProject,
  registerHubSpotPartner,
  joinHubSpotPartnerWithInvite,
  getHubSpotUserContext,
  type EdgeProjectPayload,
  type RegisterPartnerPayload,
  type JoinPartnerPayload,
} from '@/utils/hubspotProjectsApi';

const mockInvoke = vi.mocked(supabase.functions.invoke);

const mockProjectPayload: EdgeProjectPayload = {
  name: 'Test Projekt',
  description: 'Freitext fuer HubSpot Deal-Beschreibung',
  location_street: 'Musterstr. 1',
  location_zip: '80331',
  location_city: 'München',
  location_state: 'Bayern',
  location_country: 'Deutschland',
  unternehmen_name: 'Test GmbH',
  unternehmen_street: 'Industrieweg 1',
  unternehmen_zip: '80332',
  unternehmen_city: 'München',
  unternehmen_state: 'Bayern',
  unternehmen_country: 'Deutschland',
  kontakt_salutation: 'Herr',
  kontakt_fname: 'Klaus',
  kontakt_lname: 'Meier',
  kontakt_email: 'k.meier@test.de',
  kontakt_phone: '+49 89 123456',
  kontakt_rolle_im_unternehmen: 'Geschäftsführer',
};

const mockRegisterPayload: RegisterPartnerPayload = {
  auth_id: 'auth-123',
  email: 'partner@test.de',
  salutation: 'Herr',
  fname: 'Max',
  lname: 'Mustermann',
  rolle_im_unternehmen: 'Inhaber',
  company_name: 'Mustermann GmbH',
  street: 'Teststraße 1',
  zip: '10115',
  city: 'Berlin',
  bundesland: 'Berlin',
  country: 'Deutschland',
  branche_partner: 'Energieberatung',
};

const mockJoinPayload: JoinPartnerPayload = {
  auth_id: 'auth-456',
  email: 'neu@test.de',
  salutation: 'Frau',
  fname: 'Anna',
  lname: 'Schmidt',
  rolle_im_unternehmen: 'Mitarbeiterin',
  invitation_code: 'ABCD1234EFGH5678',
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getHubSpotContext', () => {
  it('ruft die korrekte Action auf', async () => {
    mockInvoke.mockResolvedValueOnce({ data: { projects: [] }, error: null });
    await getHubSpotContext();
    expect(mockInvoke).toHaveBeenCalledWith('hubspot-projects', {
      body: { action: 'get_context' },
    });
  });

  it('gibt die Daten bei Erfolg zurück', async () => {
    const mockData = { projects: [{ id: '1' }] };
    mockInvoke.mockResolvedValueOnce({ data: mockData, error: null });
    const result = await getHubSpotContext();
    expect(result).toEqual(mockData);
  });

  it('wirft einen Fehler bei API-Fehler', async () => {
    const mockError = new Error('API-Fehler');
    mockInvoke.mockResolvedValueOnce({ data: null, error: mockError });
    await expect(getHubSpotContext()).rejects.toThrow('API-Fehler');
  });
});

describe('createHubSpotProject', () => {
  it('ruft die korrekte Action mit Payload auf', async () => {
    mockInvoke.mockResolvedValueOnce({ data: { id: 'deal-1' }, error: null });
    await createHubSpotProject(mockProjectPayload);
    expect(mockInvoke).toHaveBeenCalledWith('hubspot-projects', {
      body: { action: 'create_project', payload: mockProjectPayload },
    });
  });

  it('gibt die erstellten Daten zurück', async () => {
    const mockData = { hubspot_id: 12345 };
    mockInvoke.mockResolvedValueOnce({ data: mockData, error: null });
    const result = await createHubSpotProject(mockProjectPayload);
    expect(result).toEqual(mockData);
  });

  it('wirft bei Fehler', async () => {
    mockInvoke.mockResolvedValueOnce({ data: null, error: new Error('Projekt-Fehler') });
    await expect(createHubSpotProject(mockProjectPayload)).rejects.toThrow('Projekt-Fehler');
  });
});

describe('registerHubSpotPartner', () => {
  it('ruft register_partner Action auf', async () => {
    mockInvoke.mockResolvedValueOnce({ data: { success: true }, error: null });
    await registerHubSpotPartner(mockRegisterPayload);
    expect(mockInvoke).toHaveBeenCalledWith('hubspot-projects', {
      body: { action: 'register_partner', payload: mockRegisterPayload },
    });
  });

  it('gibt Registrierungsergebnis zurück', async () => {
    const mockData = { hubspot_contact_id: 99, invite_code: 'CODE1234' };
    mockInvoke.mockResolvedValueOnce({ data: mockData, error: null });
    const result = await registerHubSpotPartner(mockRegisterPayload);
    expect(result).toEqual(mockData);
  });

  it('wirft bei Registrierungsfehler', async () => {
    mockInvoke.mockResolvedValueOnce({ data: null, error: new Error('Bereits registriert') });
    await expect(registerHubSpotPartner(mockRegisterPayload)).rejects.toThrow('Bereits registriert');
  });
});

describe('joinHubSpotPartnerWithInvite', () => {
  it('ruft join_partner_with_invite Action auf', async () => {
    mockInvoke.mockResolvedValueOnce({ data: { success: true }, error: null });
    await joinHubSpotPartnerWithInvite(mockJoinPayload);
    expect(mockInvoke).toHaveBeenCalledWith('hubspot-projects', {
      body: { action: 'join_partner_with_invite', payload: mockJoinPayload },
    });
  });

  it('gibt Join-Ergebnis zurück', async () => {
    const mockData = { company_name: 'Bestehende GmbH' };
    mockInvoke.mockResolvedValueOnce({ data: mockData, error: null });
    const result = await joinHubSpotPartnerWithInvite(mockJoinPayload);
    expect(result).toEqual(mockData);
  });

  it('wirft bei ungültigem Invite-Code', async () => {
    mockInvoke.mockResolvedValueOnce({ data: null, error: new Error('Ungültiger Einladungscode') });
    await expect(joinHubSpotPartnerWithInvite(mockJoinPayload)).rejects.toThrow('Ungültiger Einladungscode');
  });
});

describe('getHubSpotUserContext', () => {
  it('ruft get_user_context Action auf', async () => {
    mockInvoke.mockResolvedValueOnce({ data: { user: {}, company: {} }, error: null });
    await getHubSpotUserContext();
    expect(mockInvoke).toHaveBeenCalledWith('hubspot-projects', {
      body: { action: 'get_user_context' },
    });
  });

  it('gibt Nutzerkontext zurück', async () => {
    const mockData = { user: { fname: 'Max' }, company: { name: 'Test GmbH' }, team_members: [] };
    mockInvoke.mockResolvedValueOnce({ data: mockData, error: null });
    const result = await getHubSpotUserContext();
    expect(result).toEqual(mockData);
  });

  it('wirft bei API-Fehler', async () => {
    mockInvoke.mockResolvedValueOnce({ data: null, error: new Error('Auth-Fehler') });
    await expect(getHubSpotUserContext()).rejects.toThrow('Auth-Fehler');
  });
});
