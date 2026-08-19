import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';

import { supabase } from '../lib/supabase';
import { isNative } from '../lib/platform';
import { parseAuthCallback } from './authCallback';

/**
 * Finishing a sign-in that happened outside the app.
 *
 * On the web this is free: the provider redirects the same tab back, and the
 * Supabase client's `detectSessionInUrl` picks the result out of the address
 * bar. Native has no address bar. The sign-in happens in a system browser and
 * comes back as a URL handed to the app by iOS, so something has to be listening
 * for it — otherwise the athlete completes a perfectly good sign-in and the app
 * never hears about it.
 *
 * That is exactly what a missing deep link looks like from the outside: sign in
 * with Google, watch Safari open, watch it land on the website, and wonder why
 * the app you started in is still asking you to sign in.
 *
 * @param onError shown to the athlete; an expired link or a cancelled consent
 *   screen is an ordinary outcome, not a crash.
 * @returns a function that stops listening.
 */
export function listenForAuthCallback(onError: (message: string) => void): () => void {
  if (!isNative || !supabase) return () => {};
  const client = supabase;

  const handle = App.addListener('appUrlOpen', ({ url }) => {
    const result = parseAuthCallback(url);
    if (!result) return;

    // The system browser is still covering the app at this point. Close it
    // first, so whatever happens next happens in view.
    void Browser.close().catch(() => {
      // Already closed, or never opened — the sign-in still counts.
    });

    if (result.kind === 'error') {
      onError(result.message);
      return;
    }

    const finish =
      result.kind === 'code'
        ? client.auth.exchangeCodeForSession(result.code)
        : client.auth.setSession({
            access_token: result.accessToken,
            refresh_token: result.refreshToken,
          });

    void finish.then(({ error }) => {
      // Success needs no handling here: `onAuthStateChange` in `useSession` sees
      // the new session and the app follows, exactly as it does on the web.
      if (error) onError("That sign-in link didn't work. Try signing in again.");
    });
  });

  return () => {
    void handle.then((h) => h.remove());
  };
}
