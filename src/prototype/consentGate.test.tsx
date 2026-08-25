import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

/**
 * The gate between signing in and the app.
 *
 * The assertions that matter are the negative ones. A consent screen that can
 * be dismissed, scrolled past, or satisfied by ticking one of two boxes is not
 * a consent screen — it is a dialog. And a gate that lifts before the agreement
 * is written lets somebody into the app having agreed to nothing the moment the
 * network is bad, which is the one failure this feature exists to prevent.
 */

vi.mock('../lib/env', () => ({
  isBackendConfigured: true,
  isAppleEnabled: false,
  siteUrl: 'https://example.test',
  env: { supabaseUrl: 'https://example.supabase.co', supabaseAnonKey: 'test-anon-key' },
}));

const loadConsents = vi.fn(async () => ({ privacy: false, ai: false }));
const recordAllConsents = vi.fn(async () => undefined);

vi.mock('../data/consentRepo', async (orig) => ({
  ...(await orig<Record<string, unknown>>()),
  loadConsents: () => loadConsents(),
  recordAllConsents: (...args: unknown[]) => recordAllConsents(...(args as [])),
}));

vi.mock('../data/profileRepo', () => ({
  loadAccount: vi.fn(async () => null),
  saveAccount: vi.fn(async () => undefined),
}));

vi.mock('../data/logRepo', async (orig) => ({
  ...(await orig<Record<string, unknown>>()),
  loadWindow: vi.fn(async () => []),
}));

vi.mock('../data/metricsRepo', async (orig) => ({
  ...(await orig<Record<string, unknown>>()),
  loadMetrics: vi.fn(async () => []),
}));

vi.mock('../data/planRepo', () => ({
  loadPlan: vi.fn(async () => ({ swaps: {}, replans: {} })),
  savePlanSwap: vi.fn(async () => undefined),
  savePlanReplans: vi.fn(async () => undefined),
}));

const { AthlyApp } = await import('./AthlyApp');

const signedIn = {
  userId: 'athlete-1',
  userEmail: 'sam@example.com',
  sessionLoading: false,
  recovering: false,
};

beforeEach(() => {
  window.localStorage.clear();
  vi.clearAllMocks();
  loadConsents.mockResolvedValue({ privacy: false, ai: false });
  recordAllConsents.mockResolvedValue(undefined);
});

const user = () => userEvent.setup();

describe('the consent gate', () => {
  it('stands between a signed-in athlete and the app', async () => {
    render(<AthlyApp {...signedIn} />);

    expect(await screen.findByText(/before you start/i)).toBeInTheDocument();
    // Nothing behind it is reachable — not the app, not onboarding.
    expect(screen.queryByRole('button', { name: /let's set you up/i })).not.toBeInTheDocument();
  });

  it('asks separately about AI, because it is the surprising one', async () => {
    render(<AthlyApp {...signedIn} />);
    await screen.findByText(/before you start/i);

    expect(screen.getByRole('checkbox', { name: /privacy policy and terms/i })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /ai reading my meal/i })).toBeInTheDocument();
    // Says what actually leaves the device, in those words.
    expect(screen.getByText(/text is sent to an ai service/i)).toBeInTheDocument();
  });

  it('will not continue on one box out of two', async () => {
    const u = user();
    render(<AthlyApp {...signedIn} />);
    await screen.findByText(/before you start/i);

    await u.click(screen.getByRole('checkbox', { name: /privacy policy and terms/i }));
    await u.click(screen.getByRole('button', { name: /tick both to continue/i }));

    expect(recordAllConsents).not.toHaveBeenCalled();
    expect(screen.getByText(/before you start/i)).toBeInTheDocument();
  });

  it('records the agreement and then lifts', async () => {
    const u = user();
    render(<AthlyApp {...signedIn} />);
    await screen.findByText(/before you start/i);

    await u.click(screen.getByRole('checkbox', { name: /privacy policy and terms/i }));
    await u.click(screen.getByRole('checkbox', { name: /ai reading my meal/i }));
    await u.click(screen.getByRole('button', { name: /agree and continue/i }));

    expect(recordAllConsents).toHaveBeenCalledWith('athlete-1');
    expect(await screen.findByRole('button', { name: /let's set you up/i })).toBeInTheDocument();
  });

  it('holds the gate when the agreement could not be written', async () => {
    // The whole point. An optimistic gate lets somebody in having agreed to
    // nothing, and nobody ever finds out.
    recordAllConsents.mockRejectedValueOnce(new Error('offline'));
    const u = user();
    render(<AthlyApp {...signedIn} />);
    await screen.findByText(/before you start/i);

    await u.click(screen.getByRole('checkbox', { name: /privacy policy and terms/i }));
    await u.click(screen.getByRole('checkbox', { name: /ai reading my meal/i }));
    await u.click(screen.getByRole('button', { name: /agree and continue/i }));

    expect(await screen.findByText(/didn't save/i)).toBeInTheDocument();
    expect(screen.getByText(/before you start/i)).toBeInTheDocument();
  });

  it('asks again when it cannot read what was agreed', async () => {
    // Fails closed: asking twice is harmless, letting somebody past a consent
    // nobody could confirm is not.
    loadConsents.mockRejectedValueOnce(new Error('offline'));
    render(<AthlyApp {...signedIn} />);

    expect(await screen.findByText(/before you start/i)).toBeInTheDocument();
  });

  it('does not appear for an athlete who has already agreed', async () => {
    loadConsents.mockResolvedValue({ privacy: true, ai: true });
    render(<AthlyApp {...signedIn} />);

    expect(await screen.findByRole('button', { name: /let's set you up/i })).toBeInTheDocument();
    expect(screen.queryByText(/before you start/i)).not.toBeInTheDocument();
  });
});
