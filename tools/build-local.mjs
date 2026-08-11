/**
 * Build the local-only app, on purpose.
 *
 * `npm run build` refuses to produce a bundle with no Supabase project
 * configured, because such a bundle looks like a working product and quietly
 * saves nothing — see the `athly:require-backend-config` plugin in
 * `vite.config.ts`. That refusal is right for a deploy and wrong for two jobs
 * that need exactly that bundle:
 *
 *   * `npm run verify`, which checks that the code compiles and the tests pass.
 *     It is not a deploy and has no business demanding credentials.
 *   * the pixel-diff harness, which photographs the local-only app — that is the
 *     app the twenty committed baselines are of.
 *
 * A script rather than `ATHLY_ALLOW_LOCAL_BUILD=1 vite build` inline, because
 * that syntax does not work in cmd.exe and the rest of the scripts in
 * package.json are portable.
 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

const child = spawn('npx', ['vite', 'build'], {
  cwd: ROOT,
  stdio: 'inherit',
  shell: process.platform === 'win32',
  env: { ...process.env, ATHLY_ALLOW_LOCAL_BUILD: '1' },
});

child.on('exit', (code) => process.exit(code ?? 1));
child.on('error', (err) => {
  console.error(String(err.message || err));
  process.exit(1);
});
