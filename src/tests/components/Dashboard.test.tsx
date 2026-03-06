import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Dashboard from '@/views/Dashboard';
import * as api from '@/utils/hubspotProjectsApi';
import { mockUser, mockUserCompany } from '../fixtures/users';
import {
  mockProjectActive,
  mockProjectOffered,
  mockProjectGewonnen,
  mockProjectVerloren,
} from '../fixtures/projects';

vi.mock('@/utils/hubspotProjectsApi', () => ({
  getHubSpotContext: vi.fn(),
}));

const mockGetHubSpotContext = vi.mocked(api.getHubSpotContext);

const defaultProps = {
  onNavigate: vi.fn(),
  onNavigateToProject: vi.fn(),
  userProfile: mockUser,
  userCompany: mockUserCompany,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Dashboard – Laden', () => {
  it('zeigt Ladeindikator während API-Call', async () => {
    mockGetHubSpotContext.mockImplementation(() => new Promise(() => {})); // Nie auflösen
    render(<Dashboard {...defaultProps} />);
    expect(screen.getByText(/Dashboard wird geladen/i)).toBeInTheDocument();
  });

  it('zeigt Willkommensnachricht mit Nutzernamen', async () => {
    mockGetHubSpotContext.mockResolvedValueOnce({ projects: [] });
    render(<Dashboard {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText(/Willkommen zurück, Max/i)).toBeInTheDocument();
    });
  });
});

describe('Dashboard – KPIs', () => {
  const projects = [mockProjectActive, mockProjectOffered, mockProjectGewonnen, mockProjectVerloren];

  it('zeigt korrekte Anzahl aktiver Projekte', async () => {
    mockGetHubSpotContext.mockResolvedValueOnce({ projects });
    render(<Dashboard {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText('Aktive Projekte')).toBeInTheDocument();
    });
    // 2 aktive Projekte (Eingangsprüfung + Technische Klärung)
    const kpiValue = screen.getByText('2');
    expect(kpiValue).toBeInTheDocument();
  });

  it('Angebotsvolumen summiert offered_capacity aktiver Projekte', async () => {
    // mockProjectOffered hat offered_capacity: 750
    mockGetHubSpotContext.mockResolvedValueOnce({ projects });
    render(<Dashboard {...defaultProps} />);
    await waitFor(() => {
      // 750 kWh aktive Projekte mit Angebot
      expect(screen.getByText('750 kWh')).toBeInTheDocument();
    });
  });

  it('Abschlussquote "-%" bei nur aktiven Projekten', async () => {
    mockGetHubSpotContext.mockResolvedValueOnce({ projects: [mockProjectActive] });
    render(<Dashboard {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText('-%')).toBeInTheDocument();
    });
  });

  it('Abschlussquote korrekt bei Gewonnen+Verloren', async () => {
    mockGetHubSpotContext.mockResolvedValueOnce({
      projects: [mockProjectGewonnen, mockProjectVerloren],
    });
    render(<Dashboard {...defaultProps} />);
    await waitFor(() => {
      // 1 gewonnen / 2 gesamt = 50%
      expect(screen.getByText('50.0%')).toBeInTheDocument();
    });
  });
});

describe('Dashboard – Neueste Projekte', () => {
  it('zeigt max. 4 aktive Projekte in der Tabelle', async () => {
    const manyActive = Array.from({ length: 6 }, (_, i) => ({
      ...mockProjectActive,
      id: `p-${i}`,
      name: `Projekt ${i + 1}`,
      dealstage: 'Eingangsprüfung' as const,
    }));
    mockGetHubSpotContext.mockResolvedValueOnce({ projects: manyActive });
    render(<Dashboard {...defaultProps} />);
    await waitFor(() => {
      // Max 4 Projekte anzeigen
      const rows = screen.getAllByText(/Projekt \d+/);
      expect(rows.length).toBeLessThanOrEqual(4);
    });
  });

  it('"Alle Projekte"-Klick löst onNavigate("projekte") aus', async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    mockGetHubSpotContext.mockResolvedValueOnce({ projects: [] });
    render(<Dashboard {...defaultProps} onNavigate={onNavigate} />);
    await waitFor(() => screen.getByText(/Alle Projekte/i));
    await user.click(screen.getByText(/Alle Projekte/i));
    expect(onNavigate).toHaveBeenCalledWith('projekte');
  });

  it('onNavigateToProject bei Projekt-Klick', async () => {
    const user = userEvent.setup();
    const onNavigateToProject = vi.fn();
    mockGetHubSpotContext.mockResolvedValueOnce({ projects: [mockProjectActive] });
    render(<Dashboard {...defaultProps} onNavigateToProject={onNavigateToProject} />);
    await waitFor(() => screen.getByText('Solarspeicher Müller GmbH'));
    await user.click(screen.getByText('Solarspeicher Müller GmbH'));
    expect(onNavigateToProject).toHaveBeenCalledWith(mockProjectActive.id);
  });
});

describe('Dashboard – Fehlerbehandlung', () => {
  it('kein Crash bei leerem API-Ergebnis', async () => {
    mockGetHubSpotContext.mockResolvedValueOnce({ projects: [] });
    render(<Dashboard {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText(/noch keine aktiven Projekte/i)).toBeInTheDocument();
    });
  });
});

describe('formatCapacity (via Dashboard)', () => {
  it('500 kWh wird als "500 kWh" angezeigt', async () => {
    const p = { ...mockProjectOffered, offered_capacity: 500 };
    mockGetHubSpotContext.mockResolvedValueOnce({ projects: [p] });
    render(<Dashboard {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText('500 kWh')).toBeInTheDocument();
    });
  });

  it('1500 kWh wird als "1,5 MWh" angezeigt', async () => {
    const p = { ...mockProjectOffered, offered_capacity: 1500 };
    mockGetHubSpotContext.mockResolvedValueOnce({ projects: [p] });
    render(<Dashboard {...defaultProps} />);
    await waitFor(() => {
      // Im Angebotsvolumen-KPI
      expect(screen.getByText('1,5 MWh')).toBeInTheDocument();
    });
  });
});
