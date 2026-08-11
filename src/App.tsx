import { AthlyApp } from './prototype/AthlyApp';
import { ErrorBoundary } from './components/ErrorBoundary';

/**
 * Application root.
 *
 * The four props below are the design's layout variants, kept from the
 * prototype so alternatives can still be compared side by side. The values here
 * are the ones the design shipped as its default.
 */
export function App() {
  return (
    <ErrorBoundary>
      <AthlyApp
        homeLayout="Focus"
        swapMode="Compare three"
        plannerInput="Ask in words"
        navPrimary="Center action"
      />
    </ErrorBoundary>
  );
}
