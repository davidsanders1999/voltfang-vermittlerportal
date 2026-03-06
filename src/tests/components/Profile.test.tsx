import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Profile from '@/views/Profile';
import * as api from '@/utils/hubspotProjectsApi';
import { mockUser, mockUserCompany, mockTeamMembers } from '../fixtures/users';

vi.mock('@/utils/hubspotProjectsApi', () => ({
  getHubSpotUserContext: vi.fn(),
}));

const mockGetHubSpotUserContext = vi.mocked(api.getHubSpotUserContext);

const mockContext = {
  user: mockUser,
  company: mockUserCompany,
  team_members: mockTeamMembers,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(navigator.clipboard.writeText).mockResolvedValue(undefined);
});

describe('Profile – Laden', () => {
  it('zeigt Ladeindikator während API-Call', () => {
    mockGetHubSpotUserContext.mockImplementation(() => new Promise(() => {}));
    render(<Profile />);
    expect(screen.getByText(/Profil wird geladen/i)).toBeInTheDocument();
  });

  it('zeigt Namen nach Laden', async () => {
    mockGetHubSpotUserContext.mockResolvedValueOnce(mockContext);
    render(<Profile />);
    await waitFor(() => {
      expect(screen.getByText('Max Mustermann')).toBeInTheDocument();
    });
  });

  it('zeigt Unternehmensname', async () => {
    mockGetHubSpotUserContext.mockResolvedValueOnce(mockContext);
    render(<Profile />);
    await waitFor(() => {
      expect(screen.getByText('Muster GmbH')).toBeInTheDocument();
    });
  });
});

describe('Profile – Unternehmensdaten', () => {
  it('zeigt Adresse korrekt an', async () => {
    mockGetHubSpotUserContext.mockResolvedValueOnce(mockContext);
    render(<Profile />);
    await waitFor(() => {
      expect(screen.getByText('Hauptstraße 1')).toBeInTheDocument();
      expect(screen.getByText(/80331.*München/i)).toBeInTheDocument();
    });
  });

  it('zeigt Website-Link wenn vorhanden', async () => {
    mockGetHubSpotUserContext.mockResolvedValueOnce(mockContext);
    render(<Profile />);
    await waitFor(() => {
      const link = screen.getByRole('link', { name: /Website besuchen/i });
      expect(link).toHaveAttribute('href', 'https://muster-gmbh.de');
    });
  });
});

describe('Profile – Team', () => {
  it('zeigt alle Team-Mitglieder', async () => {
    mockGetHubSpotUserContext.mockResolvedValueOnce(mockContext);
    render(<Profile />);
    await waitFor(() => {
      expect(screen.getByText('Max Mustermann')).toBeInTheDocument();
      expect(screen.getByText('Anna Schmidt')).toBeInTheDocument();
      expect(screen.getByText('Peter Meier')).toBeInTheDocument();
    });
  });

  it('"Du"-Badge für den aktuellen User sichtbar', async () => {
    mockGetHubSpotUserContext.mockResolvedValueOnce(mockContext);
    render(<Profile />);
    await waitFor(() => {
      expect(screen.getByText('Du')).toBeInTheDocument();
    });
  });

  it('"Freischaltung ausstehend"-Badge für gesperrte Mitglieder', async () => {
    mockGetHubSpotUserContext.mockResolvedValueOnce(mockContext);
    render(<Profile />);
    await waitFor(() => {
      expect(screen.getByText('Freischaltung ausstehend')).toBeInTheDocument();
    });
  });
});

describe('Profile – Invite-Code', () => {
  it('zeigt formatierten Invite-Code', async () => {
    mockGetHubSpotUserContext.mockResolvedValueOnce(mockContext);
    render(<Profile />);
    await waitFor(() => {
      // ABCD1234EFGH5678 → ABCD-1234-EFGH-5678
      expect(screen.getByText(/ABCD-1234-EFGH-5678/i)).toBeInTheDocument();
    });
  });

  it('"Code kopieren" schreibt Invite-Code ins Clipboard', async () => {
    const user = userEvent.setup();
    mockGetHubSpotUserContext.mockResolvedValueOnce(mockContext);
    render(<Profile />);
    await waitFor(() => screen.getByText(/ABCD-1234/i));
    await user.click(screen.getByRole('button', { name: /Code/i }));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('ABCD1234EFGH5678');
  });

  it('"Link kopieren" schreibt URL mit Invite-Code ins Clipboard', async () => {
    const user = userEvent.setup();
    mockGetHubSpotUserContext.mockResolvedValueOnce(mockContext);
    render(<Profile />);
    await waitFor(() => screen.getByText(/ABCD-1234/i));
    await user.click(screen.getByRole('button', { name: /Link/i }));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      expect.stringContaining('?invite=ABCD1234EFGH5678')
    );
  });
});

describe('Profile – Fehlerbehandlung', () => {
  it('zeigt Fehlermeldung bei API-Fehler', async () => {
    mockGetHubSpotUserContext.mockRejectedValueOnce(new Error('Netzwerkfehler'));
    render(<Profile />);
    await waitFor(() => {
      expect(screen.getByText(/Profil konnte nicht geladen werden/i)).toBeInTheDocument();
    });
  });
});

describe('Profile – Bearbeiten-Button', () => {
  it('Bearbeiten-Button zeigt Info-Meldung (EDITING_ENABLED=false)', async () => {
    const user = userEvent.setup();
    mockGetHubSpotUserContext.mockResolvedValueOnce(mockContext);
    render(<Profile />);
    await waitFor(() => screen.getByText('Max Mustermann'));
    await user.click(screen.getByRole('button', { name: /Profil bearbeiten/i }));
    expect(screen.getByText(/Profilbearbeitung ist aktuell deaktiviert/i)).toBeInTheDocument();
  });
});
