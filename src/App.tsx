import { useEffect, useState } from 'react';

import { AthlyApp } from './prototype/AthlyApp';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useSession } from './auth/useSession';
import { listenForAuthCallback } from './auth/deepLink';

/**
 * Application root.
 *
 * The four layout props are the design's A/B knobs, kept from the prototype so
 * alternatives can still be compared side by side; the values here are the ones
 * the design shipped as its default.
 *
 * Everything else here is the session. `AthlyApp` is a class component, so who
 * is signed in arrives as props rather than through a hook — which is no loss:
 * one place reads the session, one place passes it down, and the component keeps
 * the single-state-owner shape the whole app is built on.
 */
export function App() {
  const { session, loading, recovering, endRecovery } = useSession();
  const [linkError, setLinkError] = useState<string | null>(null);

  // Sign-ins that finish outside the app — a provider's consent screen, an
  // email link — come back to iOS as a URL rather than a page load. On the web
  // this listener does nothing and the Supabase client handles the redirect
  // itself. See `auth/deepLink.ts`.
  useEffect(() => listenForAuthCallback(setLinkError), []);

  return (
    <ErrorBoundary>
      <AthlyApp
        homeLayout="Focus"
        swapMode="Compare three"
        plannerInput="Ask in words"
        navPrimary="Center action"
        userId={session?.user.id ?? null}
        userEmail={session?.user.email ?? null}
        sessionLoading={loading}
        recovering={recovering}
        onRecoveryHandled={endRecovery}
        authLinkError={linkError}
      />
    </ErrorBoundary>
  );
}
