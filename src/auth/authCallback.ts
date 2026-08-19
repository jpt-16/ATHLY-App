/**
 * Reading a sign-in result out of a URL.
 *
 * Kept as a pure function away from the Capacitor listener that calls it,
 * because this is the part with cases in it: a code to exchange, an error to
 * show, a token pair from the implicit flow, or a link that has nothing to do
 * with auth at all. The listener should not be where that is decided, and this
 * way it can be tested without a phone.
 */

export type AuthCallback =
  /** PKCE: a single-use code to exchange for a session over a POST. */
  | { kind: 'code'; code: string }
  /** The implicit flow's token pair, arriving in the fragment. */
  | { kind: 'tokens'; accessToken: string; refreshToken: string }
  /** Supabase said no — an expired link, a cancelled consent screen. */
  | { kind: 'error'; message: string };

/**
 * What, if anything, this URL is telling us about a sign-in.
 *
 * Returns `null` for any link that is not an auth callback. Deep links are a
 * shared channel — a share sheet, a push notification, a universal link — so
 * "not for me" has to be an ordinary answer rather than a thrown error.
 */
export function parseAuthCallback(url: string): AuthCallback | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  // Supabase puts PKCE results in the query and implicit results in the
  // fragment, and an error can arrive in either. Reading both means the parser
  // does not depend on which flow the client happens to be configured for.
  const query = parsed.searchParams;
  const fragment = new URLSearchParams(parsed.hash.replace(/^#/, ''));
  const at = (key: string) => query.get(key) ?? fragment.get(key);

  const error = at('error_description') ?? at('error');
  if (error) return { kind: 'error', message: error.replace(/\+/g, ' ') };

  const code = query.get('code');
  if (code) return { kind: 'code', code };

  const accessToken = fragment.get('access_token');
  const refreshToken = fragment.get('refresh_token');
  if (accessToken && refreshToken) return { kind: 'tokens', accessToken, refreshToken };

  return null;
}
