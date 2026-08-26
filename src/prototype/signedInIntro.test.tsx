import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

/**
 * The screen an athlete sees when a sign-in link works and nothing happens.
 *
 * Signing in with no saved account lands on onboarding question zero, which is
 * the same screen a signed-out stranger sees. A tester followed a working link,
 * arrived here, and reported that it "only brought her to the homepage" — then
 * asked for more links, none of which could have behaved any differently.
 *
 * So the intro has to distinguish the two states. It is the only place in the
 * app where being signed in is otherwise invisible.
 */

vi.mock('../lib/env', () => ({
  isBackendConfigured: true,
  isAppleEnabled: false,
  env: { supabaseUrl: 'https://example.supabase.co', supabaseAnonKey: 'test-anon-key' },
}));

vi.mock('../auth/authActions', () => ({
  signInWithProvider: vi.fn(async () => ({ error: null })),
  signUpWithEmail: vi.fn(async () => ({ error: null })),
  signInWithEmail: vi.fn(async () => ({ error: null })),
  sendPasswordReset: vi.fn(async () => ({ error: null })),
  resendConfirmation: vi.fn(async () => ({ error: null })),
  updatePassword: vi.fn(async () => ({ error: null })),
  signOut: vi.fn(async () => ({ error: null })),
  deleteAccount: vi.fn(async () => ({ error: null })),
}));

// No account saved, which is the whole point: this is the athlete who made an
// account and never answered the questions.
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

describe('the intro screen, for someone already signed in', () => {
  it('says who they are signed in as, so a working link does not read as a broken one', async () => {
    render(<AthlyApp userId="user-1" userEmail="eva@example.com" />);

    expect(await screen.findByText(/eva@example.com/)).toBeInTheDocument();
    expect(screen.getByText(/signed in as/i)).toBeInTheDocument();
    // "Let's set you up" is what a stranger is offered. Someone with an account
    // is being asked to resume, and the button should not pretend otherwise.
    expect(await screen.findByRole('button', { name: /pick up where you left off/i })).toBeInTheDocument();
  });

  it('says nothing of the sort to someone who is not signed in', () => {
    render(<AthlyApp />);

    expect(screen.queryByText(/signed in as/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /let's set you up/i })).toBeInTheDocument();
  });
});
