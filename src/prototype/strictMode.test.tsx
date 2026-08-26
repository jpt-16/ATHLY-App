import { StrictMode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

/**
 * The app survives being mounted twice.
 *
 * React's StrictMode deliberately mounts, unmounts and remounts every component
 * in development, to surface the ones that do not clean up after themselves. For
 * a class component that means `componentWillUnmount` runs on the same instance
 * that is about to be mounted again — so a `_alive = false` set there, and never
 * set back, disarms every `if (!this._alive) return` guard for the whole of the
 * real mount.
 *
 * The symptom was specific and awful: signing in left the athlete on the splash
 * screen permanently, with no error anywhere, because `onSignedIn` bailed on the
 * line after `await loadAccount()` and nothing ever cleared `hydrating`. Signing
 * out was fine, because that path has no await before it clears the flag — and
 * production was fine, because StrictMode is a development behaviour. Which is
 * the worst combination available: invisible to the tests, invisible to the
 * deployed build, and reproducible only on the machine of whoever is working on
 * it.
 *
 * So this renders the way `main.tsx` renders, which no other test does.
 */

vi.mock('../lib/env', () => ({
  isBackendConfigured: true,
  isAppleEnabled: false,
  env: { supabaseUrl: 'https://example.supabase.co', supabaseAnonKey: 'test-anon-key' },
}));

const loadAccount = vi.fn<() => Promise<unknown>>(async () => null);

vi.mock('../data/profileRepo', () => ({
  loadAccount: () => loadAccount(),
  saveAccount: vi.fn(async () => undefined),
}));

vi.mock('../data/logRepo', async (orig) => ({
  ...(await orig<Record<string, unknown>>()),
  loadWindow: vi.fn(async () => []),
}));

vi.mock('../data/planRepo', () => ({
  loadPlan: vi.fn(async () => ({ swaps: {}, replans: {} })),
  savePlanSwap: vi.fn(async () => undefined),
  savePlanReplans: vi.fn(async () => undefined),
}));

// Signed-in tests render past the consent gate; what they are about is
// elsewhere. `consentGate.test.tsx` is where the gate itself is checked.
vi.mock('../data/consentRepo', async (orig) => ({
  ...(await orig<Record<string, unknown>>()),
  loadConsents: vi.fn(async () => ({ privacy: true, ai: true })),
  recordAllConsents: vi.fn(async () => undefined),
}));

const { AthlyApp } = await import('./AthlyApp');

/** Signed in, session resolved — the state that used to hang. */
const signedIn = {
  userId: 'athlete-1',
  userEmail: 'sam@example.com',
  sessionLoading: false,
  recovering: false,
};

beforeEach(() => {
  window.localStorage.clear();
  vi.clearAllMocks();
  loadAccount.mockResolvedValue(null);
});

describe('under StrictMode', () => {
  it('gets past the splash screen for a signed-in athlete', async () => {
    render(
      <StrictMode>
        <AthlyApp {...signedIn} />
      </StrictMode>,
    );

    // An account with nothing saved starts onboarding, and says so — the intro
    // offers a signed-in athlete "pick up where you left off" rather than the
    // stranger's "let's set you up". Reaching it at all is the assertion: before
    // the fix this stayed on the splash for good.
    expect(await screen.findByRole('button', { name: /pick up where you left off/i })).toBeInTheDocument();
  });

  it('still reads the account rather than skipping straight past it', async () => {
    render(
      <StrictMode>
        <AthlyApp {...signedIn} />
      </StrictMode>,
    );

    await screen.findByRole('button', { name: /pick up where you left off/i });
    // The guard exists to stop a dead tree being written to, not to stop the
    // request. A fix that simply deleted it would pass the test above.
    expect(loadAccount).toHaveBeenCalled();
  });
});
