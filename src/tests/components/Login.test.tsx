import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Login from '@/views/Login';
import { supabase } from '@/utils/supabase';

const mockSignIn = vi.mocked(supabase.auth.signInWithPassword);

const defaultProps = {
  onLoginSuccess: vi.fn(),
  onGoToRegister: vi.fn(),
  onForgotPassword: vi.fn(),
  onEmailNotConfirmed: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Login – Render', () => {
  it('zeigt Formular korrekt', () => {
    render(<Login {...defaultProps} />);
    expect(screen.getByPlaceholderText('name@beispiel.de')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Anmelden/i })).toBeInTheDocument();
  });

  it('Passwort-Toggle schaltet zwischen text/password um', async () => {
    const user = userEvent.setup();
    render(<Login {...defaultProps} />);
    const pwInput = screen.getByPlaceholderText('••••••••');
    expect(pwInput).toHaveAttribute('type', 'password');
    const toggleBtn = screen.getByRole('button', { name: /Passwort anzeigen/i });
    await user.click(toggleBtn);
    expect(pwInput).toHaveAttribute('type', 'text');
    await user.click(screen.getByRole('button', { name: /Passwort verbergen/i }));
    expect(pwInput).toHaveAttribute('type', 'password');
  });
});

describe('Login – Erfolgreicher Login', () => {
  it('ruft onLoginSuccess auf bei erfolgreichem Login', async () => {
    const user = userEvent.setup();
    mockSignIn.mockResolvedValueOnce({ data: { user: {}, session: {} }, error: null } as any);
    const onLoginSuccess = vi.fn();
    render(<Login {...defaultProps} onLoginSuccess={onLoginSuccess} />);
    await user.type(screen.getByPlaceholderText('name@beispiel.de'), 'test@example.com');
    await user.type(screen.getByPlaceholderText('••••••••'), 'Passwort1');
    await user.click(screen.getByRole('button', { name: /Anmelden/i }));
    await waitFor(() => expect(onLoginSuccess).toHaveBeenCalledOnce());
  });
});

describe('Login – Fehlerfälle', () => {
  it('zeigt Fehlermeldung bei falschem Passwort', async () => {
    const user = userEvent.setup();
    mockSignIn.mockResolvedValueOnce({
      data: { user: null, session: null },
      error: { message: 'Invalid login credentials' },
    } as any);
    render(<Login {...defaultProps} />);
    await user.type(screen.getByPlaceholderText('name@beispiel.de'), 'test@example.com');
    await user.type(screen.getByPlaceholderText('••••••••'), 'wrongpassword');
    await user.click(screen.getByRole('button', { name: /Anmelden/i }));
    await waitFor(() => {
      expect(screen.getByText(/Invalid login credentials/i)).toBeInTheDocument();
    });
  });

  it('ruft onEmailNotConfirmed bei nicht bestätigter E-Mail auf', async () => {
    const user = userEvent.setup();
    mockSignIn.mockResolvedValueOnce({
      data: { user: null, session: null },
      error: { message: 'email not confirmed' },
    } as any);
    const onEmailNotConfirmed = vi.fn();
    render(<Login {...defaultProps} onEmailNotConfirmed={onEmailNotConfirmed} />);
    await user.type(screen.getByPlaceholderText('name@beispiel.de'), 'unconfirmed@test.de');
    await user.type(screen.getByPlaceholderText('••••••••'), 'Passwort1');
    await user.click(screen.getByRole('button', { name: /Anmelden/i }));
    await waitFor(() => {
      expect(onEmailNotConfirmed).toHaveBeenCalledWith('unconfirmed@test.de');
    });
  });
});

describe('Login – Navigation', () => {
  it('"Jetzt Partner werden" löst onGoToRegister aus', async () => {
    const user = userEvent.setup();
    const onGoToRegister = vi.fn();
    render(<Login {...defaultProps} onGoToRegister={onGoToRegister} />);
    await user.click(screen.getByRole('button', { name: /Jetzt Partner werden/i }));
    expect(onGoToRegister).toHaveBeenCalledOnce();
  });

  it('"Vergessen?" löst onForgotPassword aus', async () => {
    const user = userEvent.setup();
    const onForgotPassword = vi.fn();
    render(<Login {...defaultProps} onForgotPassword={onForgotPassword} />);
    await user.click(screen.getByRole('button', { name: /Vergessen/i }));
    expect(onForgotPassword).toHaveBeenCalledOnce();
  });
});
