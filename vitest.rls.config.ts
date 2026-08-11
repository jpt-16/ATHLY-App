import { defineConfig } from 'vitest/config';

/**
 * The Row Level Security suite, kept apart from `npm test`.
 *
 * That suite is hermetic: jsdom, no network, no services, and it runs in CI on
 * every push. This one needs Docker, a local Postgres and a running auth
 * server, so mixing them would mean either a CI job that cannot run or a local
 * `npm test` that fails for anyone without Supabase installed.
 *
 *     supabase start
 *     npm run test:rls
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['supabase/tests/**/*.test.ts'],
    // A real database, real auth round trips and user creation — the default
    // 5s is not enough for the setup step.
    testTimeout: 30_000,
    hookTimeout: 60_000,
    // Shared seed rows in one database: parallel files would race each other.
    fileParallelism: false,
  },
});
