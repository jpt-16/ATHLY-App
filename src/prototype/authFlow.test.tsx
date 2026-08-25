import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { UserEvent } from '@testing-library/user-event';

/**
 * The account gate, with a backend pretending to exist.
 *
 * `App.test.tsx` walks the same onboarding with no backend and lands in the app;
 * this walks it with one and lands at the gate. Between them they pin down the
 * decision the whole phase rests on — that configuration, not code, decides
 * whether an athlete is asked for an account.
 *
 * The gate comes *after* the thirteen questions on purpose. Asking someone to
 * make an account before they have seen anything is the cheapest way to lose
 * them, and the questions are this app's best argument for itself.
 */

vi.mock('../lib/env', () => ({
  isBackendConfigured: true,
  isAppleEnabled: false,
  env: { supabaseUrl: 'https://example.supabase.co', supabaseAnonKey: 'test-anon-key' },
}));

// No network, and no client either: every account action is stubbed, so this
// exercises the app's flow rather than Supabase's.
const signInWithProvider = vi.fn(async () => ({ error: null }));
const signUpWithEmail = vi.fn(async () => ({ error: null }));

vi.mock('../auth/authActions', () => ({
  signInWithProvider: (...args: unknown[]) => signInWithProvider(...(args as [])),
  signUpWithEmail: (...args: unknown[]) => signUpWithEmail(...(args as [])),
  signInWithEmail: vi.fn(async () => ({ error: null })),
  sendPasswordReset: vi.fn(async () => ({ error: null })),
  updatePassword: vi.fn(async () => ({ error: null })),
  signOut: vi.fn(async () => ({ error: null })),
  deleteAccount: vi.fn(async () => ({ error: null })),
}));

const saveAccount = vi.fn(async () => undefined);
const loadAccount = vi.fn<() => Promise<unknown>>(async () => null);

vi.mock('../data/profileRepo', () => ({
  saveAccount: (...args: unknown[]) => saveAccount(...(args as [])),
  loadAccount: () => loadAccount(),
}));

// Signed-in tests render past the consent gate; what they are about is
// elsewhere. `consentGate.test.tsx` is where the gate itself is checked.
vi.mock('../data/consentRepo', async (orig) => ({
  ...(await orig<Record<string, unknown>>()),
  loadConsents: vi.fn(async () => ({ privacy: true, ai: true })),
  recordAllConsents: vi.fn(async () => undefined),
}));

const { AthlyApp } = await import('./AthlyApp');
const { stashOnboarding } = await import('../data/pendingOnboarding');

const next = (user: UserEvent) => user.click(screen.getByRole('button', { name: /^next$/i }));

/** The same thirteen answers `App.test.tsx` gives, stopping on the targets screen. */
async function runOnboarding(user: UserEvent) {
  await user.click(screen.getByRole('button', { name: /let's set you up/i }));
  await user.type(screen.getByPlaceholderText(/jordan/i), 'Sam');
  await next(user);

  await user.click(screen.getByRole('button', { name: /gain lean weight/i }));
  await user.click(await screen.findByRole('button', { name: /^male/i }));

  await screen.findByRole('heading', { name: /a few numbers/i });
  await next(user);
  await next(user);
  await user.click(screen.getByRole('button', { name: /^soccer$/i }));
  await next(user);
  await next(user);
  await user.click(screen.getByRole('button', { name: /^chicken$/i }));
  await next(user);
  await user.click(screen.getByRole('button', { name: /nothing to avoid/i }));
  await user.click(screen.getByRole('button', { name: /nothing to avoid/i }));
  await user.click(screen.getByRole('button', { name: /i can follow a recipe/i }));
  await user.click(await screen.findByRole('button', { name: /middle of the road/i }));
  await user.click(await screen.findByRole('button', { name: /about 20 minutes/i }));
}

/** Signed out, session resolved — the state a first-time visitor arrives in. */
const signedOut = { userId: null, userEmail: null, sessionLoading: false, recovering: false };

beforeEach(() => {
  window.localStorage.clear();
  vi.clearAllMocks();
  loadAccount.mockResolvedValue(null);
});

/** Answers as they would be parked before a sign-in redirect. */
const parked = {
  a: { likes: [], dislikes: [], allergies: [], sports: ['Soccer'], name: 'Sam' },
  age: 17,
  ft: 5,
  inch: 10,
  lb: 165,
  goalLb: 180,
  rate: 0.75,
  pMode: 'rec' as const,
  pCustom: null,
  week: {
    0: ['rest', '', '', ''],
    1: ['practice', '4:30 pm', '', '90'],
    2: ['rest', '', '', ''],
    3: ['practice', '4:30 pm', '', '90'],
    4: ['rest', '', '', ''],
    5: ['rest', '', '', ''],
    6: ['game', '11:00 am', '', ''],
  },
  overrides: {},
};

describe('the account gate', () => {
  it('does not appear until the questions are answered', async () => {
    const user = userEvent.setup();
    render(<AthlyApp {...signedOut} />);

    expect(screen.getByRole('heading', { name: /eat food you actually like/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /continue with google/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /let's set you up/i }));
    expect(screen.queryByRole('button', { name: /continue with google/i })).not.toBeInTheDocument();
  });

  it('opens after the targets, not before them', async () => {
    const user = userEvent.setup();
    render(<AthlyApp {...signedOut} />);

    await runOnboarding(user);
    // The targets are shown first: the athlete sees what they get before being
    // asked for anything.
    await user.click(await screen.findByRole('button', { name: /build my week/i }));

    expect(await screen.findByRole('heading', { name: /save your plan/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign up with email/i })).toBeInTheDocument();
  });

  it('offers a way in for someone who already has an account', async () => {
    const user = userEvent.setup();
    render(<AthlyApp {...signedOut} />);

    // The intro used to offer one button, so the only route to the gate ran
    // through all thirteen questions — and `onSignedIn` then threw the answers
    // away in favour of the saved profile, which is correct and makes the detour
    // pure waste.
    await user.click(screen.getByRole('button', { name: /already have an account/i }));

    expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /let's set you up/i })).not.toBeInTheDocument();
  });

  it('hides Sign in with Apple until it is configured', async () => {
    const user = userEvent.setup();
    render(<AthlyApp {...signedOut} />);
    await runOnboarding(user);
    await user.click(await screen.findByRole('button', { name: /build my week/i }));

    await screen.findByRole('heading', { name: /save your plan/i });
    expect(screen.queryByRole('button', { name: /continue with apple/i })).not.toBeInTheDocument();
  });

  it('parks the answers before sending anyone to Google', async () => {
    const user = userEvent.setup();
    render(<AthlyApp {...signedOut} />);
    await runOnboarding(user);
    await user.click(await screen.findByRole('button', { name: /build my week/i }));
    await screen.findByRole('heading', { name: /save your plan/i });

    await user.click(screen.getByRole('button', { name: /continue with google/i }));

    expect(signInWithProvider).toHaveBeenCalledWith('google');
    // The redirect tears down the page. Without this the athlete comes back
    // signed in and starts onboarding again from question one.
    const parked = window.localStorage.getItem('athly.pendingOnboarding');
    expect(parked).not.toBeNull();
    expect(JSON.parse(parked ?? '{}').state.a.name).toBe('Sam');
  });

  it('goes back to the targets rather than trapping anyone at the gate', async () => {
    const user = userEvent.setup();
    render(<AthlyApp {...signedOut} />);
    await runOnboarding(user);
    await user.click(await screen.findByRole('button', { name: /build my week/i }));
    await screen.findByRole('heading', { name: /save your plan/i });

    await user.click(screen.getByRole('button', { name: /sign up with email/i }));
    expect(await screen.findByRole('heading', { name: /make it yours/i })).toBeInTheDocument();

    // One back to the gate, one more to the targets.
    const back = () => screen.getAllByRole('button')[0];
    await user.click(back());
    expect(await screen.findByRole('heading', { name: /save your plan/i })).toBeInTheDocument();
  });

  it('will not submit an email sign-up until both fields are filled', async () => {
    const user = userEvent.setup();
    render(<AthlyApp {...signedOut} />);
    await runOnboarding(user);
    await user.click(await screen.findByRole('button', { name: /build my week/i }));
    await screen.findByRole('heading', { name: /save your plan/i });
    await user.click(screen.getByRole('button', { name: /sign up with email/i }));

    const cta = await screen.findByRole('button', { name: /create my account/i });
    expect(cta).toBeDisabled();

    await user.type(screen.getByLabelText(/email/i), 'sam@example.com');
    expect(cta).toBeDisabled();

    await user.type(screen.getByLabelText(/password/i), 'a-good-password');
    expect(cta).toBeEnabled();
  });

  it('sends people to check their email after signing up', async () => {
    const user = userEvent.setup();
    render(<AthlyApp {...signedOut} />);
    await runOnboarding(user);
    await user.click(await screen.findByRole('button', { name: /build my week/i }));
    await screen.findByRole('heading', { name: /save your plan/i });
    await user.click(screen.getByRole('button', { name: /sign up with email/i }));

    await user.type(await screen.findByLabelText(/email/i), 'sam@example.com');
    await user.type(screen.getByLabelText(/password/i), 'a-good-password');
    await user.click(screen.getByRole('button', { name: /create my account/i }));

    expect(signUpWithEmail).toHaveBeenCalledWith('sam@example.com', 'a-good-password');
    // No session yet — Supabase sends a confirmation link first, and the parked
    // answers wait for it to be followed.
    expect(await screen.findByRole('heading', { name: /check your email/i })).toBeInTheDocument();
  });
});

describe('a returning athlete', () => {
  it('sees nothing at all until the session is known', () => {
    render(<AthlyApp userId={null} userEmail={null} sessionLoading recovering={false} />);
    // Not the intro screen: showing it for a frame to someone already signed in,
    // then yanking it away, is worse than a beat of nothing.
    expect(screen.queryByRole('heading', { name: /eat food you actually like/i })).not.toBeInTheDocument();
  });

  it('never lets parked answers overwrite a saved account', async () => {
    // Everyone who reaches the gate has just answered thirteen questions, so a
    // stash exists even for someone choosing "already have an account". Writing
    // it would replace a real profile — schedule, preferences, allergies — with
    // whatever was typed on this device, invisibly and irreversibly.
    stashOnboarding(parked as never);
    loadAccount.mockResolvedValue({ ...parked, a: { ...parked.a, name: 'Alex' } });

    render(<AthlyApp userId="user-1" userEmail="alex@example.com" sessionLoading={false} />);

    // Lands in the app on the saved profile, not the parked one.
    await screen.findByText(/eat this next/i, undefined, { timeout: 5000 });
    expect(saveAccount).not.toHaveBeenCalled();
    // And the stash is gone, so it cannot surprise anyone on the next sign-in.
    expect(window.localStorage.getItem('athly.pendingOnboarding')).toBeNull();
  });

  it('saves the parked answers when the account has none', async () => {
    stashOnboarding(parked as never);
    loadAccount.mockResolvedValue(null);

    render(<AthlyApp userId="user-1" userEmail="sam@example.com" sessionLoading={false} />);

    await vi.waitFor(() => expect(saveAccount).toHaveBeenCalledTimes(1));
    expect(saveAccount).toHaveBeenCalledWith('user-1', expect.objectContaining({ age: 17 }));
  });

  it('is asked for a new password when they arrive on a reset link', async () => {
    render(
      <AthlyApp
        userId="user-1"
        userEmail="sam@example.com"
        sessionLoading={false}
        recovering
        onRecoveryHandled={() => {}}
      />,
    );
    // A reset link grants a real session. Without the hold they would land in
    // the app still holding the password they came to change.
    expect(await screen.findByRole('heading', { name: /choose a new password/i })).toBeInTheDocument();
  });
});
