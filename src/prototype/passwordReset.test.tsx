import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

/**
 * Finishing a password reset.
 *
 * The screen and the button used to disagree. `renderVals` overrode the view to
 * "Choose a new password" whenever a reset link had granted a session, but
 * `submitAuth` read `state.authView` — still "forgot", because that is the
 * screen everybody comes from. So the athlete typed a password, pressed Save,
 * and the app asked Supabase to send a reset email to an empty address:
 *
 *     Choose a new password.
 *     ••••••••
 *     That doesn't look like an email address.
 *
 * Nobody could get past it. Two testers reached this screen over two days and
 * neither ended up with a password, which is why both kept needing email links
 * to get in at all. These tests pin the two halves to one source of truth.
 */

vi.mock('../lib/env', () => ({
  isBackendConfigured: true,
  isAppleEnabled: false,
  env: { supabaseUrl: 'https://example.supabase.co', supabaseAnonKey: 'test-anon-key' },
}));

const updatePassword = vi.fn(async () => ({ error: null }));
const sendPasswordReset = vi.fn(async () => ({ error: null }));

vi.mock('../auth/authActions', () => ({
  signInWithProvider: vi.fn(async () => ({ error: null })),
  signUpWithEmail: vi.fn(async () => ({ error: null })),
  signInWithEmail: vi.fn(async () => ({ error: null })),
  sendPasswordReset: (...a: unknown[]) => sendPasswordReset(...(a as [])),
  resendConfirmation: vi.fn(async () => ({ error: null })),
  updatePassword: (...a: unknown[]) => updatePassword(...(a as [])),
  signOut: vi.fn(async () => ({ error: null })),
  deleteAccount: vi.fn(async () => ({ error: null })),
}));

vi.mock('../data/profileRepo', () => ({
  saveAccount: vi.fn(async () => undefined),
  loadAccount: vi.fn(async () => null),
}));

vi.mock('../data/consentRepo', async (orig) => ({
  ...(await orig<Record<string, unknown>>()),
  loadConsents: vi.fn(async () => ({ privacy: true, ai: true })),
  recordAllConsents: vi.fn(async () => undefined),
}));

const { AthlyApp } = await import('./AthlyApp');

beforeEach(() => {
  updatePassword.mockClear();
  sendPasswordReset.mockClear();
});

describe('the password-reset screen', () => {
  it('saves the password rather than re-sending the email', async () => {
    const u = userEvent.setup();
    render(<AthlyApp userId="athlete-1" userEmail="eva@example.com" recovering />);

    await u.type(await screen.findByLabelText('Password'), 'Wolverines7!');
    await u.click(screen.getByRole('button', { name: /save it/i }));

    expect(updatePassword).toHaveBeenCalledWith('Wolverines7!');
    // The old failure. Asking for another link is not what this button says.
    expect(sendPasswordReset).not.toHaveBeenCalled();
  });

  it('still saves it when the athlete came here from "Forgot password"', async () => {
    // The route everybody actually takes, and the one that broke: the stored
    // view is "forgot" and only the link makes it "setPassword".
    const u = userEvent.setup();
    const { rerender } = render(<AthlyApp />);

    // Intro → the sign-in form → "I forgot my password". That last screen is
    // what leaves `state.authView` at 'forgot' when the link comes back.
    await u.click(screen.getByRole('button', { name: /already have an account/i }));
    await u.click(screen.getByRole('button', { name: /already have an account/i }));
    await u.click(screen.getByRole('button', { name: /i forgot my password/i }));

    rerender(<AthlyApp userId="athlete-1" userEmail="eva@example.com" recovering />);

    expect(await screen.findByText(/choose a new password/i)).toBeInTheDocument();
    await u.type(await screen.findByLabelText('Password'), 'Wolverines7!');
    await u.click(screen.getByRole('button', { name: /save it/i }));

    expect(updatePassword).toHaveBeenCalledWith('Wolverines7!');
    expect(sendPasswordReset).not.toHaveBeenCalled();
  });
});
