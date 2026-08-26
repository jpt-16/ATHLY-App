import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The two screens that say an email is on its way.
 *
 * Both are deliberately vague about whether the address is registered — telling
 * a stranger which emails have accounts is a membership check nobody asked for
 * — and that vagueness used to be implemented by discarding every error the
 * server returned. Which meant the one error that is not about the address at
 * all got discarded too.
 *
 * It happened. A tester asked for a password reset while the project's built-in
 * email quota was spent; Supabase answered `429: email rate limit exceeded`,
 * sent nothing, and the app told her the link was in her inbox. She waited for
 * a message that did not exist. These tests are that bug, written down.
 */

const resetPasswordForEmail = vi.fn(async (_email: string, _opts: unknown) => ({ error: null as unknown }));
const resend = vi.fn(async (_opts: unknown) => ({ error: null as unknown }));

vi.mock('../lib/supabase', () => ({
  supabase: null,
  requireSupabase: () => ({
    auth: {
      resetPasswordForEmail: (email: string, opts: unknown) => resetPasswordForEmail(email, opts),
      resend: (opts: unknown) => resend(opts),
    },
  }),
}));

vi.mock('../lib/platform', () => ({ isNative: false, NATIVE_AUTH_CALLBACK: 'app://auth-callback' }));

const { sendPasswordReset, resendConfirmation } = await import('./authActions');

beforeEach(() => {
  resetPasswordForEmail.mockClear();
  resend.mockClear();
  resetPasswordForEmail.mockResolvedValue({ error: null });
  resend.mockResolvedValue({ error: null });
});

describe('sendPasswordReset', () => {
  it('says nothing about whether the address has an account', async () => {
    // Supabase reports a missing user as an ordinary error. Passing it through
    // would turn this form into a way of testing whether somebody is a member.
    resetPasswordForEmail.mockResolvedValue({ error: { message: 'User not found' } });
    expect(await sendPasswordReset('stranger@example.com')).toEqual({ error: null });
  });

  it('reports a rate limit, because no email was sent and nothing else would say so', async () => {
    resetPasswordForEmail.mockResolvedValue({ error: { message: '429: email rate limit exceeded' } });
    const { error } = await sendPasswordReset('athlete@example.com');
    expect(error).toMatch(/few minutes/i);
  });

  it('rejects something that is not an email without asking the server', async () => {
    expect(await sendPasswordReset('athlete')).toEqual({ error: "That doesn't look like an email address." });
    expect(resetPasswordForEmail).not.toHaveBeenCalled();
  });
});

describe('resendConfirmation', () => {
  it('stays quiet about an address that has no unconfirmed account', async () => {
    resend.mockResolvedValue({ error: { message: 'User not found' } });
    expect(await resendConfirmation('stranger@example.com')).toEqual({ error: null });
  });

  it('reports a rate limit here too — it is the same quota', async () => {
    resend.mockResolvedValue({ error: { message: 'email rate limit exceeded' } });
    const { error } = await resendConfirmation('athlete@example.com');
    expect(error).toMatch(/few minutes/i);
  });
});
