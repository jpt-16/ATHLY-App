/**
 * The app's Content-Security-Policy, as a string.
 *
 * Its own module so it can be asserted on. A policy is one long line of text
 * where a single wrong token silently stops protecting anything — `connect-src`
 * falling back to `*`, a directive misspelled and therefore ignored — and none
 * of that shows up as a broken page. `csp.test.mjs` is the only thing that
 * looks.
 *
 * Used by the `athly:csp` plugin in `vite.config.ts`, which explains why this
 * is generated at build time rather than written into `vercel.json`.
 */

/**
 * @param {string | undefined} supabaseUrl The configured project origin, or
 *   nothing at all for the local-only build, which talks to no backend.
 * @returns {string} A policy fit for a `<meta http-equiv>` tag.
 */
export function buildCsp(supabaseUrl) {
  const url = supabaseUrl?.trim();

  // The realtime socket shares the project host, and `connect-src` matches on
  // scheme — `https:` does not cover `wss:`, so both are named.
  const backend = url ? [url, url.replace(/^https:/, 'wss:').replace(/^http:/, 'ws:')] : [];

  return [
    "default-src 'self'",
    // The directive that carries this policy. The session Supabase issues lives
    // in localStorage and refreshes itself, so injected script is not a defaced
    // page — it is a durable copy of an athlete's account.
    "script-src 'self'",
    // `'unsafe-inline'` is a real concession. The screens are a design-tool port
    // and carry their styles as strings (`prototype/styles.ts`), and the font
    // arrives as Google's stylesheet. What it forgoes is CSS injection; what
    // takes accounts is script, and that stays locked. Self-hosting the font
    // would shorten this line without changing the threat model.
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data:",
    "manifest-src 'self'",
    `connect-src ${["'self'", ...backend].join(' ')}`,
    // Nothing here frames anything, submits a form, embeds an object or needs a
    // <base>. Each is a documented way to escalate an injection, and each costs
    // nothing to close.
    "frame-src 'none'",
    "object-src 'none'",
    "form-action 'none'",
    "base-uri 'none'",
    'upgrade-insecure-requests',
  ].join('; ');
}

/**
 * `frame-ancestors` is deliberately not above: a `<meta>` policy is *required*
 * to ignore it, so it has to be a real header. It is set in `vercel.json`,
 * exported here so the test can state that the two halves add up.
 */
export const FRAME_ANCESTORS = "frame-ancestors 'none'";
