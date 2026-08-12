import { defineConfig } from 'vitest/config';

/**
 * The end-to-end round trip, kept apart from both other suites.
 *
 * `npm test` is hermetic. `npm run test:rls` needs the `service_role` key and
 * proves the database refuses the wrong request. This one needs only the two
 * public values from `.env` — the same pair the browser bundle carries — and
 * proves the app's own repository code makes the right request.
 *
 *     npm run test:roundtrip
 *
 * It creates two throwaway accounts and deletes them again, so point it at an
 * empty project or a branch, never at one with real athletes in it.
 *
 * `environment: 'node'` and not jsdom: the point is to make real network calls,
 * and jsdom's fetch and storage shims are exactly the layer this is trying to
 * see past. Vite loads `.env` itself, which is how `import.meta.env` inside
 * `src/lib/env.ts` gets its values here.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['supabase/tests/roundTrip.test.ts'],
    // Sign-up, six round trips and an Edge Function call. The default 5s is a
    // flake waiting to happen on a cold project.
    testTimeout: 45_000,
    hookTimeout: 60_000,
    // The steps share one account and one signed-in client, so they are
    // ordered, not independent.
    fileParallelism: false,
    sequence: { concurrent: false },
  },
});
