import type { Provider } from '@supabase/supabase-js';

import { Browser } from '@capacitor/browser';

import { requireSupabase, supabase } from '../lib/supabase';
import { NATIVE_AUTH_CALLBACK, isNative } from '../lib/platform';
import { weakPasswordReason } from './passwordStrength';

/**
 * Every account action the app can take.
 *
 * These return a result rather than throwing. An auth failure is an ordinary
 * outcome — a wrong password, a network drop — and the screens need to render it
 * as copy, not catch it as an exception.
 */

export interface AuthResult {
  /** A message fit to show an athlete, or `null` on success. */
  error: string | null;
}

const OK: AuthResult = { error: null };

/**
 * Turn a Supabase error into something worth reading.
 *
 * Supabase's messages are written for developers ("Invalid login credentials",
 * "AuthApiError"), and some of them answer questions we would rather not: a
 * distinct "user not found" tells anyone with a login form which email addresses
 * have accounts. Both problems are fixed in the same place.
 */
function readable(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('invalid login credentials')) {
    // Deliberately ambiguous about which of the two was wrong.
    return "That email and password don't match an account.";
  }
  if (m.includes('email not confirmed')) {
    return 'Confirm your email first — check your inbox for the link we sent.';
  }
  if (m.includes('already registered') || m.includes('already been registered')) {
    return 'There is already an account with that email. Try signing in.';
  }
  if (m.includes('password') && m.includes('at least')) {
    return 'Passwords need to be at least 8 characters.';
  }
  if (m.includes('rate limit') || m.includes('too many')) {
    return 'Too many attempts just now. Give it a minute and try again.';
  }
  if (m.includes('failed to fetch') || m.includes('network')) {
    return "Couldn't reach the server. Check your connection and try again.";
  }
  if (m.includes('provider is not enabled') || m.includes('unsupported provider')) {
    // The catch-all used to answer this one, and it said "try again in a
    // moment" — advice for a transient fault, offered for a permanent one. The
    // provider is switched off in the project's settings and no amount of
    // waiting will turn it on, so say what will actually work instead.
    return 'That sign-in option is not set up yet. Use your email and a password for now.';
  }
  return 'Something went wrong. Try again in a moment.';
}

/**
 * Where a provider or an email link should send the athlete back to.
 *
 * The origin is read from the browser rather than configured, so the same build
 * works on localhost, on a Vercel preview and in production. Supabase will only
 * honour URLs on its redirect allow-list, so a preview deployment needs adding
 * there before its sign-in works — that check is Supabase's, and it is the
 * reason this cannot simply be trusted from the page.
 */
function redirectTo(): string | undefined {
  // Native has no origin worth returning to — `capacitor://localhost` is not a
  // place Supabase can redirect to. The custom scheme is, and iOS hands it back
  // to the app; `deepLink.ts` is what catches it.
  if (isNative) return NATIVE_AUTH_CALLBACK;
  if (typeof window === 'undefined') return undefined;
  return `${window.location.origin}/`;
}

/** Minimum we will accept. Supabase's own floor is 6; 8 is not much, but it is more. */
export const MIN_PASSWORD_LENGTH = 8;

/**
 * Local checks, before a round trip.
 *
 * Not a security control — the server validates independently, and anything
 * here can be skipped by anyone who wants to. It exists so a typo comes back
 * instantly instead of after a network round trip.
 */
export function validateCredentials(email: string, password: string): string | null {
  if (!email.includes('@') || email.startsWith('@') || email.endsWith('@')) {
    return "That doesn't look like an email address.";
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Passwords need to be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  // Length was the whole policy, which accepted `password` and `12345678`.
  // Supabase's breach-corpus check is a Pro feature and this project is not on
  // Pro; see `passwordStrength.ts` for what this does and does not replace.
  return weakPasswordReason(password, email);
}

/**
 * Create an account with an email and a password.
 *
 * Succeeds without a session: Supabase sends a confirmation link and the account
 * cannot sign in until it is followed. The caller shows "check your email"
 * regardless of whether the address was already registered, because a different
 * answer for a taken address is an account-enumeration oracle.
 */
export async function signUpWithEmail(email: string, password: string): Promise<AuthResult> {
  const local = validateCredentials(email, password);
  if (local) return { error: local };

  const { error } = await requireSupabase().auth.signUp({
    email,
    password,
    options: { emailRedirectTo: redirectTo() },
  });
  return error ? { error: readable(error.message) } : OK;
}

/**
 * Send the confirmation email again.
 *
 * The gap this closes. Supabase answers a signup for an address that already
 * has an account with a 200 and **no email** — deliberately, because a
 * different answer would tell anyone with a login form which addresses are
 * registered. This app then says "check your email", for the same reason. Both
 * decisions are right and together they strand somebody: they sign up, they are
 * told to check their email, and no email was ever going to arrive.
 *
 * Resending is the way out that does not give the game away. It works for an
 * account that exists and is unconfirmed, and for anything else it reports
 * success without sending — so the screen stays uninformative about whether the
 * address is registered, and the athlete who is genuinely waiting gets their
 * link.
 */
export async function resendConfirmation(email: string): Promise<AuthResult> {
  if (!email.includes('@')) return { error: "That doesn't look like an email address." };
  const { error } = await requireSupabase().auth.resend({
    type: 'signup',
    email,
    options: { emailRedirectTo: redirectTo() },
  });
  // A rate limit is worth saying out loud — it is the difference between "wait
  // a minute" and "this is broken". Everything else is swallowed for the same
  // reason the sign-up path swallows it.
  if (error && /rate limit|too many/i.test(error.message)) return { error: readable(error.message) };
  return OK;
}

export async function signInWithEmail(email: string, password: string): Promise<AuthResult> {
  const { error } = await requireSupabase().auth.signInWithPassword({ email, password });
  return error ? { error: readable(error.message) } : OK;
}

/**
 * Start an OAuth sign-in. Navigates away; nothing after this runs.
 *
 * The client is configured for PKCE, so what comes back in the URL is a
 * single-use code rather than a token, and it is exchanged over a POST by
 * `detectSessionInUrl`.
 */
export async function signInWithProvider(
  provider: Extract<Provider, 'google' | 'apple'>,
): Promise<AuthResult> {
  const { data, error } = await requireSupabase().auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: redirectTo(),
      // On the web this navigates the tab away and nothing after it runs. In a
      // web view that navigation is the bug: Google refuses to render its
      // consent screen inside an embedded browser, and even where it did, the
      // athlete would be typing a password into a page the app controls. So
      // native asks for the URL instead and opens it in the system browser,
      // which is both the only thing Google will accept and the only place a
      // password belongs.
      skipBrowserRedirect: isNative,
      // Ask Google for a refresh token and force the account chooser, so
      // someone with two accounts on one device can pick.
      queryParams: provider === 'google' ? { access_type: 'offline', prompt: 'select_account' } : undefined,
    },
  });
  if (error) return { error: readable(error.message) };

  if (isNative) {
    if (!data?.url) return { error: 'Something went wrong. Try again in a moment.' };
    await Browser.open({ url: data.url, presentationStyle: 'popover' });
  }
  return OK;
}

/**
 * Send a password reset link.
 *
 * Always reports success. Supabase does not say whether the address exists, and
 * neither do we — "no account with that email" is a free membership check for
 * anyone who wants one.
 */
export async function sendPasswordReset(email: string): Promise<AuthResult> {
  if (!email.includes('@')) return { error: "That doesn't look like an email address." };
  await requireSupabase().auth.resetPasswordForEmail(email, { redirectTo: redirectTo() });
  return OK;
}

/** Set a new password. Only valid while holding the session a reset link grants. */
export async function updatePassword(password: string): Promise<AuthResult> {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { error: `Passwords need to be at least ${MIN_PASSWORD_LENGTH} characters.` };
  }
  // The reset path deserves the same policy as the sign-up path. An athlete who
  // has just been through "I forgot my password" is exactly the one most likely
  // to reach for one they cannot forget again.
  const weak = weakPasswordReason(password);
  if (weak) return { error: weak };
  const { error } = await requireSupabase().auth.updateUser({ password });
  return error ? { error: readable(error.message) } : OK;
}

export async function signOut(): Promise<AuthResult> {
  if (!supabase) return OK;
  const { error } = await supabase.auth.signOut();
  return error ? { error: readable(error.message) } : OK;
}

/**
 * Delete the account and everything attached to it.
 *
 * The client cannot do this itself: deleting a user is an admin operation, and
 * the key that permits it would bypass every access control in the database if
 * it were ever in the bundle. So this calls an Edge Function, which reads the
 * caller's identity from the verified JWT — never from anything the client sends
 * — and performs the deletion server-side.
 *
 * Apple requires account deletion to be reachable from inside the app, in a few
 * taps, for any app that offers account creation.
 */
export async function deleteAccount(): Promise<AuthResult> {
  const client = requireSupabase();
  const { error } = await client.functions.invoke('delete-account', { method: 'POST' });
  if (error) return { error: "Couldn't delete the account just now. Try again in a moment." };
  // The user is gone; the local session is now a token for nothing.
  await client.auth.signOut();
  return OK;
}
