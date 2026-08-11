import { AthlyApp } from './prototype/AthlyApp';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useSession } from './auth/useSession';

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
      />
    </ErrorBoundary>
  );
}
