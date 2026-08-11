/**
 * Builds the app *with* a backend configured, then photographs the account
 * screens and compares them with their own baseline.
 *
 *   node tools/visual/run-auth.mjs            compare (fails on any difference)
 *   node tools/visual/run-auth.mjs --update   accept the current rendering
 *
 * Separate from `run.mjs` because it needs a different build. The twenty
 * original baselines are of the app with no Supabase project configured — the
 * app the design shipped — and adding an account gate to that walkthrough would
 * invalidate every screen after it. So this builds a second time with
 * credentials that point nowhere, walks the same thirteen questions, and
 * captures what happens next.
 *
 * The URL is deliberately unreachable. Every screen here renders before any
 * request is made, so a real project would only make the capture depend on a
 * network and an account.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '../..');
const BASELINE = path.join(HERE, 'baseline-auth');
const CAPTURE = path.join(HERE, '.capture-auth');
const PORT = 4174;
const update = process.argv.includes('--update');

const BUILD_ENV = {
  ...process.env,
  VITE_SUPABASE_URL: 'https://visual-harness.supabase.invalid',
  VITE_SUPABASE_ANON_KEY: 'visual-harness-anon-key',
  VITE_ENABLE_APPLE: 'false',
};

const run = (cmd, args, opts = {}) =>
  new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      stdio: 'inherit',
      cwd: ROOT,
      shell: process.platform === 'win32',
      ...opts,
    });
    child.on('error', reject);
    child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}`))));
  });

console.log('Building with a backend configured…');
await run('npx', ['vite', 'build'], { env: BUILD_ENV });

const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
  cwd: ROOT,
  stdio: 'ignore',
  shell: process.platform === 'win32',
});

async function waitForServer(timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`http://localhost:${PORT}/`);
      if (res.ok) return;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`preview server did not start on port ${PORT}`);
}

let exitCode = 0;
try {
  await waitForServer();
  fs.rmSync(CAPTURE, { recursive: true, force: true });
  await run('node', [path.join(HERE, 'capture-auth.mjs'), CAPTURE, `http://localhost:${PORT}/`]);

  if (update) {
    fs.rmSync(BASELINE, { recursive: true, force: true });
    fs.cpSync(CAPTURE, BASELINE, { recursive: true });
    console.log(`\nAuth baseline updated from this capture (${fs.readdirSync(BASELINE).length} screens).`);
  } else {
    await run('node', [path.join(HERE, 'compare.mjs'), BASELINE, CAPTURE, path.join(HERE, 'diffs-auth')]);
  }
} catch (err) {
  console.error(String(err.message || err));
  exitCode = 1;
} finally {
  server.kill('SIGTERM');
}

// The local-only bundle is what everything else expects to find in dist/.
// Leaving a configured build there would make the next `npm run test:visual`
// photograph the wrong app.
await run('node', [path.join(ROOT, 'tools/build-local.mjs')]).catch(() => {});

process.exit(exitCode);
