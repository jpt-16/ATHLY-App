import { defineConfig } from 'vitest/config';
import { loadEnv } from 'vite';
import type { Plugin } from 'vite';
import react from '@vitejs/plugin-react';

import { buildCsp } from './tools/csp.mjs';

/**
 * Refuse to build a production bundle that has no backend to talk to.
 *
 * Without Supabase configured the app runs local-only: no sign-in, nothing
 * persisted. That is the right behaviour for `npm run dev` and for the test
 * suite, and the wrong behaviour to deploy — it looks like a working product and
 * quietly saves nothing, which is the kind of failure nobody notices until an
 * athlete loses a week of answers.
 *
 * A build that stops is louder than a runtime error, and stops before anything
 * reaches a user. `src/lib/env.ts` throws too, as a backstop for a bundle that
 * got past this somehow.
 *
 * `ATHLY_ALLOW_LOCAL_BUILD=1` opts out, for the one case that needs it: the
 * pixel-diff harness builds and photographs the local-only app deliberately.
 */
function requireBackendConfig(mode: string): Plugin {
  return {
    name: 'athly:require-backend-config',
    apply: 'build',
    config() {
      if (process.env.ATHLY_ALLOW_LOCAL_BUILD === '1') return;
      const env = loadEnv(mode, process.cwd(), '');
      if (env.VITE_SUPABASE_URL?.trim() && env.VITE_SUPABASE_ANON_KEY?.trim()) return;
      throw new Error(
        'ATHLY: refusing to build without VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.\n' +
          '  Set them in .env (see .env.example) or in your host’s environment settings.\n' +
          '  To build the local-only app on purpose — the visual harness does — set ATHLY_ALLOW_LOCAL_BUILD=1.',
      );
    },
  };
}

/**
 * Write a Content-Security-Policy into the built page.
 *
 * Generated rather than written into `vercel.json` because one directive cannot
 * be static: `connect-src` has to name the Supabase project this bundle talks
 * to, and that origin is an environment variable. A hardcoded
 * `https://*.supabase.co` would permit exfiltration to any Supabase project
 * anyone can create in a minute, which is most of the value gone.
 *
 * The policy itself, and the reasoning behind each concession in it, is in
 * `tools/csp.mjs` — separated so `tools/csp.test.mjs` can assert on it. A policy
 * is one long line in which a wrong token silently stops protecting anything,
 * without producing a broken page anyone would notice.
 */
function contentSecurityPolicy(mode: string): Plugin {
  return {
    name: 'athly:csp',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        const policy = buildCsp(loadEnv(mode, process.cwd(), '').VITE_SUPABASE_URL);
        return html.replace(
          '<head>',
          `<head>\n    <meta http-equiv="Content-Security-Policy" content="${policy}" />`,
        );
      },
    },
  };
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react(), requireBackendConfig(mode), contentSecurityPolicy(mode)],
  server: {
    port: 5173,
    strictPort: false,
  },
  preview: {
    port: 4173,
  },
  build: {
    outDir: 'dist',
    // Off entirely: `'hidden'` still writes the .map into dist, where a public
    // host serves it at a guessable path — obscurity, not privacy. Switch to
    // `'hidden'` once an error tracker is wired up to consume and strip them.
    sourcemap: false,
    target: 'es2022',
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    // The suite is of the local-only app: no account gate, no network, first
    // paint is the final one. Vite loads `.env` for tests as readily as for a
    // build, so a developer following the README's `cp .env.example .env` would
    // flip `isBackendConfigured` to true and fail every test in the file that
    // renders the app — for a reason with nothing to do with their change. CI
    // has no `.env`, so CI would stay green and only the human would be stuck.
    //
    // Cleared here rather than in a setup file: `src/lib/env.ts` reads these at
    // module scope, which runs before any setup hook could get to them.
    env: { VITE_SUPABASE_URL: '', VITE_SUPABASE_ANON_KEY: '', VITE_ENABLE_APPLE: '' },
    // `tools/` is in here because the USDA ingest parses this repo's own recipe
    // data, and the assertion that it reads all 44 meals rather than six is only
    // useful if it runs with everything else.
    include: [
      'src/**/*.{test,spec}.{ts,tsx}',
      'tools/**/*.{test,spec}.mjs',
      // The nutrition providers. Pure functions over a JSON document, so they
      // are tested here against committed fixtures rather than against a live
      // API — the same bargain `tools/usda/` strikes.
      'supabase/functions/_shared/**/*.{test,spec}.ts',
    ],
    css: false,
  },
}));
