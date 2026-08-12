/**
 * Serves the production build, captures the walkthrough, and either compares it
 * with the baseline or replaces the baseline.
 *
 *   node tools/visual/run.mjs            compare (fails on any difference)
 *   node tools/visual/run.mjs --update   accept the current rendering
 *
 * Run `npm run build` first; this serves `dist/` rather than the dev server, so
 * what is photographed is what would be deployed.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '../..');
const BASELINE = path.join(HERE, 'baseline');
const CAPTURE = path.join(HERE, '.capture');
const PORT = 4173;
const update = process.argv.includes('--update');

if (!fs.existsSync(path.join(ROOT, 'dist/index.html'))) {
  console.error('No build found. Run `npm run build` first.');
  process.exit(2);
}

const run = (cmd, args, opts = {}) =>
  new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: 'inherit', cwd: ROOT, ...opts });
    child.on('error', reject);
    child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}`))));
  });

// `127.0.0.1`, never `localhost`, on both ends.
//
// Vite binds the preview server to IPv4 loopback; Node's `fetch` resolves
// `localhost` and, on a machine that answers for `::1` first, tries IPv6 and is
// refused. The server is up, the poll never sees it, and the harness reports
// "did not start" — which is what happened the moment CI moved into a container.
const HOST = '127.0.0.1';
const ORIGIN = `http://${HOST}:${PORT}/`;

const server = spawn('npx', ['vite', 'preview', '--host', HOST, '--port', String(PORT), '--strictPort'], {
  cwd: ROOT,
  stdio: ['ignore', 'pipe', 'pipe'],
});

// Kept, not discarded. This used to be `stdio: 'ignore'`, so when the server
// failed to start the only thing anyone got was the timeout message — the
// reason went to /dev/null.
let serverLog = '';
server.stdout.on('data', (d) => (serverLog += d));
server.stderr.on('data', (d) => (serverLog += d));
server.on('exit', (code) => {
  if (code !== 0 && code !== null) serverLog += `\nvite preview exited ${code}`;
});

// Poll rather than parse the server's banner: the banner format is Vite's to
// change, but a socket that answers is a socket that answers.
async function waitForServer(timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(ORIGIN);
      if (res.ok) return;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(
    `preview server did not start on ${ORIGIN}\n\nvite preview said:\n${serverLog.trim() || '(nothing)'}`,
  );
}

let exitCode = 0;
try {
  await waitForServer();
  fs.rmSync(CAPTURE, { recursive: true, force: true });
  await run('node', [path.join(HERE, 'capture.mjs'), CAPTURE, ORIGIN]);

  if (update) {
    fs.rmSync(BASELINE, { recursive: true, force: true });
    fs.cpSync(CAPTURE, BASELINE, { recursive: true });
    console.log(`\nBaseline updated from this capture (${fs.readdirSync(BASELINE).length} screens).`);
  } else {
    await run('node', [path.join(HERE, 'compare.mjs'), BASELINE, CAPTURE]);
  }
} catch (err) {
  console.error(String(err.message || err));
  exitCode = 1;
} finally {
  server.kill('SIGTERM');
}
process.exit(exitCode);
