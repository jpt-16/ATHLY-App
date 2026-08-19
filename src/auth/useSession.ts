import { useCallback, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';

import { supabase } from '../lib/supabase';
import { STARTUP_TIMEOUT_MS } from '../lib/withTimeout';

export interface SessionState {
  session: Session | null;
  /**
   * True until we know whether there is a session.
   *
   * Worth having its own flag rather than inferring from `session === null`:
   * "nobody is signed in" and "we have not looked yet" want different screens,
   * and conflating them shows the sign-in gate for a frame to someone who is
   * already signed in.
   */
  loading: boolean;
  /**
   * True when the athlete arrived by following a password-reset link.
   *
   * A reset link grants a real session, so without this flag they would simply
   * land in the app — signed in, with the password they had forgotten still on
   * the account. The flag holds them at "choose a new password" instead.
   */
  recovering: boolean;
}

export interface SessionApi extends SessionState {
  /** Call once the new password is saved, to release the recovery hold. */
  endRecovery: () => void;
}

/**
 * The current session, kept in step with Supabase.
 *
 * With no backend configured this resolves synchronously to "signed out, and we
 * are sure" — no effect runs, no state settles a tick later, and the first paint
 * is the final one. That is what lets the existing tests and the pixel-diff
 * harness render the app exactly as they did before auth existed.
 */
export function useSession(): SessionApi {
  const [state, setState] = useState<SessionState>(() => ({
    session: null,
    loading: supabase !== null,
    recovering: false,
  }));

  useEffect(() => {
    if (!supabase) return;
    let live = true;

    // `onAuthStateChange` fires an INITIAL_SESSION event on subscribe, which
    // covers startup, the OAuth redirect, sign-in, sign-out and token refresh
    // alike — so this is the only listener needed.
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (!live) return;
      setState((prev) => ({
        session,
        loading: false,
        // Sticky while a session lasts. The events that follow a reset link
        // (USER_UPDATED, TOKEN_REFRESHED) would otherwise clear the flag and
        // drop the athlete into the app mid-reset; `endRecovery` is what
        // releases it, once the new password is actually saved.
        recovering: event === 'PASSWORD_RECOVERY' || (prev.recovering && session !== null),
      }));
    });

    // `onAuthStateChange` normally fires INITIAL_SESSION within a tick, because
    // it reads local storage rather than the network. But a stored session whose
    // refresh cannot complete leaves it unfired, and nothing else clears
    // `loading` — the athlete is held on the splash screen indefinitely, with no
    // error, no control and no way back. That is worse than being wrong: being
    // wrong here means showing the sign-in gate to someone whose session turns
    // up a moment later, and the listener above puts them straight back.
    const deadline = setTimeout(() => {
      if (!live) return;
      setState((prev) => (prev.loading ? { ...prev, loading: false } : prev));
    }, STARTUP_TIMEOUT_MS);

    return () => {
      live = false;
      clearTimeout(deadline);
      data.subscription.unsubscribe();
    };
  }, []);

  const endRecovery = useCallback(() => {
    setState((prev) => (prev.recovering ? { ...prev, recovering: false } : prev));
  }, []);

  return { ...state, endRecovery };
}
