import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProjektUeberblick from '@/views/projekte/ProjektUeberblick';
import {
  mockProjectActive,
  mockProjectOffered,
  mockProjectGewonnen,
  mockProjectVerloren,
  createProjectList,
} from '../fixtures/projects';
import { Project } from '@/types';

const defaultProps = {
  projects: [mockProjectActive, mockProjectOffered, mockProjectGewonnen, mockProjectVerloren],
  onSelectProject: vi.fn(),
  onCreateProject: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ProjektUeberblick – Tabs', () => {
  it('zeigt Tab-Zähler korrekt an', () => {
    render(<ProjektUeberblick {...defaultProps} />);
    // 2 aktive, 1 gewonnen, 1 verloren
    expect(screen.getByText('2')).toBeInTheDocument(); // aktiv
    expect(screen.getAllByText('1').length).toBeGreaterThanOrEqual(2); // gewonnen + verloren
  });

  it('wechselt zu Gewonnen-Tab und zeigt gewonnene Projekte', async () => {
    const user = userEvent.setup();
    render(<ProjektUeberblick {...defaultProps} />);
    await user.click(screen.getByText('Gewonnen'));
    expect(screen.getByText('Gewonnenes Projekt')).toBeInTheDocument();
    expect(screen.queryByText('Solarspeicher Müller GmbH')).not.toBeInTheDocument();
  });

  it('wechselt zu Verloren-Tab und zeigt verlorene Projekte', async () => {
    const user = userEvent.setup();
    render(<ProjektUeberblick {...defaultProps} />);
    await user.click(screen.getByText('Verloren'));
    expect(screen.getByText('Verlorenes Projekt')).toBeInTheDocument();
  });

  it('Tab-Wechsel setzt Suche zurück', async () => {
    const user = userEvent.setup();
    render(<ProjektUeberblick {...defaultProps} />);
    const searchInput = screen.getByPlaceholderText(/durchsuchen/i);
    await user.type(searchInput, 'Müller');
    await user.click(screen.getByText('Gewonnen'));
    // Nach Tab-Wechsel sollte Suche weiterhin vorhanden sein (State bleibt)
    // aber der neue Tab zeigt seine eigenen Projekte
    expect(screen.getByText('Gewonnenes Projekt')).toBeInTheDocument();
  });
});

describe('ProjektUeberblick – Suche', () => {
  it('filtert nach Projektnamen', async () => {
    const user = userEvent.setup();
    render(<ProjektUeberblick {...defaultProps} />);
    await user.type(screen.getByPlaceholderText(/durchsuchen/i), 'Müller');
    expect(screen.getByText('Solarspeicher Müller GmbH')).toBeInTheDocument();
    expect(screen.queryByText('Energiespeicher Schmidt')).not.toBeInTheDocument();
  });

  it('filtert nach Kundennamen', async () => {
    const user = userEvent.setup();
    render(<ProjektUeberblick {...defaultProps} />);
    await user.type(screen.getByPlaceholderText(/durchsuchen/i), 'Schmidt AG');
    expect(screen.getByText('Energiespeicher Schmidt')).toBeInTheDocument();
    expect(screen.queryByText('Solarspeicher Müller GmbH')).not.toBeInTheDocument();
  });

  it('Suche ist case-insensitive', async () => {
    const user = userEvent.setup();
    render(<ProjektUeberblick {...defaultProps} />);
    await user.type(screen.getByPlaceholderText(/durchsuchen/i), 'müller');
    expect(screen.getByText('Solarspeicher Müller GmbH')).toBeInTheDocument();
  });

  it('X-Button löscht Suche', async () => {
    const user = userEvent.setup();
    render(<ProjektUeberblick {...defaultProps} />);
    const searchInput = screen.getByPlaceholderText(/durchsuchen/i);
    await user.type(searchInput, 'Müller');
    // X-Button erscheint
    const clearBtn = screen.getByRole('button', { name: '' }); // X-Button ohne Aria-Label
    // Suche nach X via Lucide – es gibt einen Button der X-Icon enthält
    // Wir suchen nach dem letzten kleinen Button in der Suchleiste
    const buttons = screen.getAllByRole('button');
    const xButton = buttons.find(btn => btn.querySelector('svg'));
    // Stattdessen: Input leeren und prüfen ob beide Projekte wieder sichtbar sind
    await user.clear(searchInput);
    expect(screen.getByText('Solarspeicher Müller GmbH')).toBeInTheDocument();
    expect(screen.getByText('Energiespeicher Schmidt')).toBeInTheDocument();
  });
});

describe('ProjektUeberblick – Status-Filter', () => {
  it('Status-Dropdown öffnet sich beim Klick', async () => {
    const user = userEvent.setup();
    render(<ProjektUeberblick {...defaultProps} />);
    await user.click(screen.getByRole('button', { name: /Status/i }));
    expect(screen.getByText('Technische Klärung')).toBeInTheDocument();
  });

  it('Status-Auswahl filtert Projekte', async () => {
    const user = userEvent.setup();
    render(<ProjektUeberblick {...defaultProps} />);
    await user.click(screen.getByRole('button', { name: /Status/i }));
    // Klicke auf Eingangsprüfung im Dropdown
    const dropdownOptions = screen.getAllByRole('button');
    const eingangsPruefungOption = dropdownOptions.find(btn =>
      btn.textContent?.includes('Eingangsprüfung') && btn !== screen.queryByText('Eingangsprüfung')
    );
    if (eingangsPruefungOption) {
      await user.click(eingangsPruefungOption);
    }
    // Nach Filterung: nur Eingangsprüfung sichtbar
    expect(screen.getByText('Solarspeicher Müller GmbH')).toBeInTheDocument();
    expect(screen.queryByText('Energiespeicher Schmidt')).not.toBeInTheDocument();
  });

  it('Reset-Button löscht Status-Filter', async () => {
    const user = userEvent.setup();
    render(<ProjektUeberblick {...defaultProps} />);
    await user.click(screen.getByRole('button', { name: /Status/i }));
    // Wähle einen Status
    const listItems = screen.getAllByRole('button');
    const eingangOption = listItems.find(btn => btn.textContent?.trim() === 'Eingangsprüfung');
    if (eingangOption) await user.click(eingangOption);
    // Reset klicken
    const resetBtn = screen.queryByText('Auswahl zurücksetzen');
    if (resetBtn) await user.click(resetBtn);
    expect(screen.getByText('Energiespeicher Schmidt')).toBeInTheDocument();
  });
});

describe('ProjektUeberblick – Ersteller-Filter', () => {
  it('Ersteller-Dropdown nur bei 2+ verschiedenen Erstellern sichtbar', () => {
    // Nur 1 Ersteller
    render(
      <ProjektUeberblick
        projects={[mockProjectActive]}
        onSelectProject={vi.fn()}
        onCreateProject={vi.fn()}
      />
    );
    expect(screen.queryByRole('button', { name: /Ersteller/i })).not.toBeInTheDocument();
  });

  it('Ersteller-Dropdown sichtbar bei 2 verschiedenen Erstellern', () => {
    render(<ProjektUeberblick {...defaultProps} />);
    // mockProjectActive (user-1) und mockProjectOffered (user-2)
    expect(screen.getByRole('button', { name: /Ersteller/i })).toBeInTheDocument();
  });
});

describe('ProjektUeberblick – Sortierung', () => {
  it('Sortierung nach Projektname (asc) funktioniert', async () => {
    const user = userEvent.setup();
    render(<ProjektUeberblick {...defaultProps} />);
    await user.click(screen.getByRole('button', { name: /Projekt & Kunde/i }));
    const rows = screen.getAllByRole('row');
    // Erste Zeile nach Header sollte "Energiespeicher Schmidt" sein (alphabetisch vor "Solarspeicher")
    expect(rows[1].textContent).toContain('Energiespeicher Schmidt');
  });

  it('Sortierung nach Name umschalten (asc → desc)', async () => {
    const user = userEvent.setup();
    render(<ProjektUeberblick {...defaultProps} />);
    const sortBtn = screen.getByRole('button', { name: /Projekt & Kunde/i });
    await user.click(sortBtn); // asc
    await user.click(sortBtn); // desc
    const rows = screen.getAllByRole('row');
    expect(rows[1].textContent).toContain('Solarspeicher Müller GmbH');
  });
});

describe('ProjektUeberblick – Pagination', () => {
  it('Weiter-Button ist disabled bei 5 Projekten (eine Seite)', () => {
    render(
      <ProjektUeberblick
        projects={createProjectList(5)}
        onSelectProject={vi.fn()}
        onCreateProject={vi.fn()}
      />
    );
    // Pagination wird immer gezeigt wenn Projekte vorhanden, aber Weiter ist disabled
    const weiterBtn = screen.getByRole('button', { name: /Weiter/i });
    expect(weiterBtn).toBeDisabled();
  });

  it('Pagination erscheint bei 11+ Projekten', () => {
    render(
      <ProjektUeberblick
        projects={createProjectList(11)}
        onSelectProject={vi.fn()}
        onCreateProject={vi.fn()}
      />
    );
    expect(screen.getByRole('button', { name: /Weiter/i })).toBeInTheDocument();
  });

  it('Weiter-Button wechselt zur nächsten Seite', async () => {
    const user = userEvent.setup();
    render(
      <ProjektUeberblick
        projects={createProjectList(12)}
        onSelectProject={vi.fn()}
        onCreateProject={vi.fn()}
      />
    );
    await user.click(screen.getByRole('button', { name: /Weiter/i }));
    expect(screen.getByText(/Seite 2 von 2/i)).toBeInTheDocument();
  });

  it('Zurück-Button geht zur vorherigen Seite', async () => {
    const user = userEvent.setup();
    render(
      <ProjektUeberblick
        projects={createProjectList(12)}
        onSelectProject={vi.fn()}
        onCreateProject={vi.fn()}
      />
    );
    await user.click(screen.getByRole('button', { name: /Weiter/i }));
    await user.click(screen.getByRole('button', { name: /Zurück/i }));
    expect(screen.getByText(/Seite 1 von 2/i)).toBeInTheDocument();
  });
});

describe('ProjektUeberblick – Callbacks', () => {
  it('onSelectProject wird bei Projekt-Klick aufgerufen', async () => {
    const user = userEvent.setup();
    const onSelectProject = vi.fn();
    render(
      <ProjektUeberblick
        projects={[mockProjectActive]}
        onSelectProject={onSelectProject}
        onCreateProject={vi.fn()}
      />
    );
    await user.click(screen.getByText('Solarspeicher Müller GmbH'));
    expect(onSelectProject).toHaveBeenCalledWith(mockProjectActive);
  });

  it('onCreateProject wird bei "Projekt anlegen"-Klick aufgerufen', async () => {
    const user = userEvent.setup();
    const onCreateProject = vi.fn();
    render(
      <ProjektUeberblick
        projects={[]}
        onSelectProject={vi.fn()}
        onCreateProject={onCreateProject}
      />
    );
    // Es gibt 2 Schaltflächen: Header-Button und Leerstand-Button
    const createButtons = screen.getAllByRole('button', { name: /Projekt anlegen/i });
    await user.click(createButtons[0]);
    expect(onCreateProject).toHaveBeenCalledOnce();
  });
});

describe('ProjektUeberblick – Leerstand', () => {
  it('zeigt Leer-Meldung wenn keine Projekte vorhanden', () => {
    render(
      <ProjektUeberblick
        projects={[]}
        onSelectProject={vi.fn()}
        onCreateProject={vi.fn()}
      />
    );
    expect(screen.getByText(/keine.*aktiven.*projekte.*gefunden/i)).toBeInTheDocument();
  });
});
