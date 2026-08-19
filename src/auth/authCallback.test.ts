import { describe, expect, it } from 'vitest';

import { parseAuthCallback } from './authCallback';

/**
 * Reading a sign-in out of a deep link.
 *
 * The cases matter more than they look. A link that is not an auth callback has
 * to be ordinary rather than exceptional, because iOS hands this app every link
 * addressed to it; and an error has to survive both of the places Supabase puts
 * one, or an expired link becomes a silent no-op — which reads to the athlete as
 * the app ignoring them.
 */
describe('parseAuthCallback', () => {
  it('reads the PKCE code out of the query', () => {
    expect(parseAuthCallback('com.athly.app://auth-callback?code=abc123')).toEqual({
      kind: 'code',
      code: 'abc123',
    });
  });

  it('reads an implicit token pair out of the fragment', () => {
    expect(
      parseAuthCallback('com.athly.app://auth-callback#access_token=at&refresh_token=rt&type=signup'),
    ).toEqual({ kind: 'tokens', accessToken: 'at', refreshToken: 'rt' });
  });

  it('finds an error in the query', () => {
    expect(
      parseAuthCallback(
        'com.athly.app://auth-callback?error=access_denied&error_description=Email+link+is+invalid',
      ),
    ).toEqual({ kind: 'error', message: 'Email link is invalid' });
  });

  it('finds an error in the fragment, where Supabase also puts them', () => {
    const out = parseAuthCallback('com.athly.app://auth-callback#error=server_error');
    expect(out).toEqual({ kind: 'error', message: 'server_error' });
  });

  it('prefers the error to a code, when a link carries both', () => {
    // An expired link can come back with both. Exchanging the code would fail a
    // moment later anyway; reporting the error says why.
    const out = parseAuthCallback('com.athly.app://auth-callback?code=abc&error_description=expired');
    expect(out).toEqual({ kind: 'error', message: 'expired' });
  });

  it('ignores a link that has nothing to do with signing in', () => {
    expect(parseAuthCallback('com.athly.app://open/recipe/chicken-pasta')).toBeNull();
    expect(parseAuthCallback('https://athly.app/')).toBeNull();
  });

  it('ignores a half-finished token pair rather than acting on it', () => {
    expect(parseAuthCallback('com.athly.app://auth-callback#access_token=at')).toBeNull();
  });

  it('does not throw on something that is not a URL', () => {
    expect(parseAuthCallback('not a url')).toBeNull();
    expect(parseAuthCallback('')).toBeNull();
  });
});
