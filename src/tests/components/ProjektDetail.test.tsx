import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import confetti from 'canvas-confetti';
import ProjektDetail from '@/views/projekte/ProjektDetail';
import { mockProjectActive, mockProjectGewonnen, mockProjectVerloren, createMockProject } from '../fixtures/projects';

const mockConfetti = vi.mocked(confetti);

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('ProjektDetail', () => {
  it('zeigt den Projektnamen an', () => {
    render(<ProjektDetail project={mockProjectActive} onBack={vi.fn()} />);
    expect(screen.getByText('Solarspeicher Müller GmbH')).toBeInTheDocument();
  });

  it('zeigt Standort und Land an', () => {
    render(<ProjektDetail project={mockProjectActive} onBack={vi.fn()} />);
    expect(screen.getByText(/München, Deutschland/i)).toBeInTheDocument();
  });

  it('zeigt Kontakt-E-Mail an', () => {
    render(<ProjektDetail project={mockProjectActive} onBack={vi.fn()} />);
    expect(screen.getByText('k.mueller@mueller-gmbh.de')).toBeInTheDocument();
  });

  it('zeigt Kontakt-Telefon an', () => {
    render(<ProjektDetail project={mockProjectActive} onBack={vi.fn()} />);
    expect(screen.getByText('+49 89 1234567')).toBeInTheDocument();
  });

  it('zeigt Voltfang-Ansprechpartner mit E-Mail und Telefon an', () => {
    render(<ProjektDetail project={mockProjectActive} onBack={vi.fn()} />);
    expect(screen.getByText('Roman Alberti')).toBeInTheDocument();
    expect(screen.getByText('roman.alberti@voltfang.de')).toBeInTheDocument();
    expect(screen.getByText('+49 123 4567890')).toBeInTheDocument();
  });

  it('zeigt sonstige Projektinformationen an', () => {
    render(<ProjektDetail project={mockProjectActive} onBack={vi.fn()} />);
    expect(
      screen.getByText('Zugang zum Technikraum nur mit Voranmeldung beim Facility-Team.')
    ).toBeInTheDocument();
  });

  it('onBack wird beim Zurück-Button ausgelöst', async () => {
    const user = userEvent.setup({ delay: null });
    const onBack = vi.fn();
    render(<ProjektDetail project={mockProjectActive} onBack={onBack} />);
    await user.click(screen.getByText(/Zurück zur Übersicht/i));
    expect(onBack).toHaveBeenCalledOnce();
  });

  it('canvas-confetti wird bei "Gewonnen" aufgerufen', () => {
    render(<ProjektDetail project={mockProjectGewonnen} onBack={vi.fn()} />);
    vi.advanceTimersByTime(300); // Ersten Intervall-Tick auslösen
    expect(mockConfetti).toHaveBeenCalled();
  });

  it('canvas-confetti wird bei anderen Status NICHT aufgerufen', () => {
    render(<ProjektDetail project={mockProjectActive} onBack={vi.fn()} />);
    vi.advanceTimersByTime(300);
    expect(mockConfetti).not.toHaveBeenCalled();
  });

  it('offered_capacity wird bevorzugt über estimated_capacity angezeigt', () => {
    const project = createMockProject({ offered_capacity: 750, estimated_capacity: '500 - 1000 kWh' });
    render(<ProjektDetail project={project} onBack={vi.fn()} />);
    expect(screen.getByText(/750/)).toBeInTheDocument();
    expect(screen.queryByText('500 - 1000 kWh')).not.toBeInTheDocument();
  });

  it('leeres Datum zeigt "noch offen"', () => {
    const project = createMockProject({ estimated_order_date: undefined });
    render(<ProjektDetail project={project} onBack={vi.fn()} />);
    expect(screen.getByText('noch offen')).toBeInTheDocument();
  });

  it('zeigt "Keine Angabe" wenn keine sonstigen Informationen hinterlegt sind', () => {
    const project = createMockProject({ description: undefined });
    render(<ProjektDetail project={project} onBack={vi.fn()} />);
    expect(screen.getByText('Keine Angabe')).toBeInTheDocument();
  });

  it('zeigt Fallback "Keine Angabe" wenn Voltfang-Kontaktdaten fehlen', () => {
    const project = createMockProject({ vf_contact_email: undefined, vf_contact_phone: undefined });
    render(<ProjektDetail project={project} onBack={vi.fn()} />);
    expect(screen.getAllByText('Keine Angabe').length).toBeGreaterThan(0);
  });

  it('Website wird als Link angezeigt wenn vorhanden', () => {
    render(<ProjektDetail project={mockProjectActive} onBack={vi.fn()} />);
    const link = screen.getByRole('link', { name: /Müller GmbH/i });
    expect(link).toHaveAttribute('href', 'https://mueller-gmbh.de');
  });

  it('Unternehmensname wird als Text angezeigt wenn keine Website', () => {
    const project = createMockProject({ unternehmen_website: undefined, unternehmen_name: 'Kein Link GmbH' });
    render(<ProjektDetail project={project} onBack={vi.fn()} />);
    expect(screen.getByText('Kein Link GmbH')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Kein Link GmbH/i })).not.toBeInTheDocument();
  });

  it('PipelineVisualizer wird gerendert', () => {
    const { container } = render(<ProjektDetail project={mockProjectActive} onBack={vi.fn()} />);
    expect(container.querySelector('.w-10.h-10.rounded-full')).toBeInTheDocument();
  });
});
