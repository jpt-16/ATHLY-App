/**
 * The app's configuration, read once and typed.
 *
 * Two rules govern this file.
 *
 * **Nothing secret goes in it.** Everything Vite exposes under `VITE_` is
 * compiled into the bundle and served to anyone who loads the page. The Supabase
 * `anon` key is here because it is *designed* to be public — the access boundary
 * is Row Level Security in the database, not the secrecy of this key. The
 * `service_role` key, which bypasses RLS entirely, must never appear here, in
 * `.env`, or anywhere else the client can reach; it lives only in Edge Function
 * secrets, where Supabase injects it.
 *
 * **Absent configuration is a supported mode.** With no Supabase project
 * configured the app runs exactly as it did before there was a backend: local
 * state, nothing persisted, no auth gate. That keeps `npm run dev`, the test
 * suite and the pixel-diff harness working with zero setup.
 *
 * Shipping that bundle would be a bug — it looks like a working product and
 * quietly saves nothing — but the check for it does not live here. It lives in
 * `vite.config.ts`, where `athly:require-backend-config` refuses to produce the
 * bundle at all unless `ATHLY_ALLOW_LOCAL_BUILD=1` says the local-only app is
 * what was wanted. A build that stops is louder than a runtime error, it stops
 * before anything reaches a user, and it does not turn the deliberate local
 * build into a white screen — which is what a throw here did.
 */

interface Env {
  supabaseUrl: string;
  supabaseAnonKey: string;
}

const rawUrl = import.meta.env.VITE_SUPABASE_URL?.trim() ?? '';
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? '';

/**
 * A URL that `createClient` will accept.
 *
 * Worth checking here rather than finding out later, because `createClient`
 * runs at module scope in `supabase.ts` and throws on a malformed URL — before
 * React has mounted, so before any error boundary exists to catch it. The whole
 * bundle dies and the athlete gets a white page with the reason visible only in
 * a console they will never open. A pasted value missing its scheme, or with a
 * stray character from a dashboard field, is enough to do it.
 */
function usableUrl(raw: string): boolean {
  if (raw === '') return false;
  try {
    const parsed = new URL(raw);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

if (rawUrl !== '' && !usableUrl(rawUrl)) {
  // Loud, and still standing. Falling back to local-only is not silent success
  // — the app says "no account needed" on every screen — but it beats a page
  // that renders nothing and explains nothing.
  console.error(
    `ATHLY: VITE_SUPABASE_URL is not a usable URL (${JSON.stringify(rawUrl)}).\n` +
      'Expected something like https://<project-ref>.supabase.co — check for a missing\n' +
      'scheme or a stray character. Running local-only until it is fixed: nothing will save.',
  );
}

/**
 * Whether a Supabase project is configured. When false, every backend-touching
 * path in the app is skipped rather than failing — see the module comment.
 */
export const isBackendConfigured: boolean = usableUrl(rawUrl) && rawKey !== '';

/**
 * Configuration, or `null` when there is no backend.
 *
 * Returning `null` rather than throwing is deliberate: callers have a real
 * local-only path to take, and a nullable value makes the type system ask them
 * to handle it.
 */
export const env: Env | null = isBackendConfigured ? { supabaseUrl: rawUrl, supabaseAnonKey: rawKey } : null;

/**
 * Whether to offer Sign in with Apple.
 *
 * Off until an Apple Developer membership, a Services ID and a signing key
 * exist. The button, the callback and the account plumbing are all built; this
 * flag decides only whether the button renders, so enabling it later is
 * configuration rather than a code change. Note that Apple requires this option
 * on iOS once Google sign-in is offered (App Store Guideline 4.8), so it has to
 * be on before an App Store submission.
 */
export const isAppleEnabled: boolean = import.meta.env.VITE_ENABLE_APPLE === 'true';
