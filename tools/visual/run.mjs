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

const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
  cwd: ROOT,
  stdio: 'ignore',
});

// Poll rather than parse the server's banner: the banner format is Vite's to
// change, but a socket that answers is a socket that answers.
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
  await run('node', [path.join(HERE, 'capture.mjs'), CAPTURE, `http://localhost:${PORT}/`]);

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
