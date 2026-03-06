import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StatusBadge, PipelineVisualizer, ALL_PROJECT_STATUSES } from '@/views/projekte/ProjekteShared';
import { ProjectStatus } from '@/types';

describe('StatusBadge', () => {
  it('rendert alle 6 Status korrekt', () => {
    const { unmount } = render(
      <>{ALL_PROJECT_STATUSES.map(s => <StatusBadge key={s} status={s} />)}</>
    );
    ALL_PROJECT_STATUSES.forEach(status => {
      expect(screen.getByText(status)).toBeInTheDocument();
    });
    unmount();
  });

  it('ruft onClick auf wenn vorhanden', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<StatusBadge status="Eingangsprüfung" onClick={onClick} />);
    await user.click(screen.getByText('Eingangsprüfung'));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('Button ist disabled ohne onClick', () => {
    render(<StatusBadge status="Closing" />);
    expect(screen.getByText('Closing')).toBeDisabled();
  });

  it('active={false} setzt opacity-Klasse', () => {
    render(<StatusBadge status="Technische Klärung" active={false} />);
    const btn = screen.getByText('Technische Klärung');
    expect(btn.className).toContain('opacity-30');
  });

  it('active={true} (Standard) hat keine opacity-30 Klasse', () => {
    render(<StatusBadge status="Angebotsklärung" active={true} />);
    const btn = screen.getByText('Angebotsklärung');
    expect(btn.className).not.toContain('opacity-30');
  });
});

describe('PipelineVisualizer', () => {
  it('rendert alle Phasen-Namen', () => {
    render(<PipelineVisualizer status="Eingangsprüfung" />);
    ['Eingangsprüfung', 'Technische Klärung', 'Angebotsklärung', 'Closing', 'Gewonnen'].forEach(phase => {
      expect(screen.getByText(phase)).toBeInTheDocument();
    });
  });

  it('zeigt Krone bei Status "Gewonnen"', () => {
    const { container } = render(<PipelineVisualizer status="Gewonnen" />);
    // Crown SVG wird via lucide-react gerendert
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('zeigt XCircle bei Status "Verloren"', () => {
    const { container } = render(<PipelineVisualizer status="Verloren" />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('rendert 5 Phasen-Elemente bei aktivem Status', () => {
    const { container } = render(<PipelineVisualizer status="Technische Klärung" />);
    // 5 Phase-Divs mit flex-col
    const phaseDivs = container.querySelectorAll('.flex-col.items-center.flex-1');
    expect(phaseDivs.length).toBe(5);
  });

  it('"Verloren"-Phasenname wird angezeigt (ersetzt Gewonnen)', () => {
    render(<PipelineVisualizer status="Verloren" />);
    expect(screen.getByText('Verloren')).toBeInTheDocument();
  });
});
