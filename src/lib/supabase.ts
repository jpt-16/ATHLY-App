import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

import { env } from './env';
import type { Database } from './database.types';

/**
 * The Supabase client, or `null` when no project is configured.
 *
 * A single instance for the whole app: each client opens its own auth listener
 * and token-refresh timer, so constructing a second one gives two of them
 * fighting over the same stored session.
 *
 * `flowType: 'pkce'` matters for the OAuth providers. The implicit flow returns
 * the access token in the URL fragment, where it lands in browser history and in
 * anything reading `location.href`. PKCE returns a single-use code that is
 * exchanged for the session over a POST, and the code is worthless without the
 * verifier this client holds.
 */
export const supabase: SupabaseClient<Database> | null = env
  ? createClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
      auth: {
        flowType: 'pkce',
        persistSession: true,
        autoRefreshToken: true,
        // The OAuth and email-confirmation redirects come back with a code in
        // the URL; this hands it to the client to exchange on load.
        detectSessionInUrl: true,
      },
    })
  : null;

/**
 * The client, or a thrown error.
 *
 * For call sites that only run once a session exists — by then a client must
 * exist too, since there is no way to sign in without one. Keeps the nullable
 * check out of every data call while still failing loudly if that reasoning is
 * ever wrong.
 */
export function requireSupabase(): SupabaseClient<Database> {
  if (!supabase) {
    throw new Error('ATHLY: no Supabase project is configured; this code path should not have run.');
  }
  return supabase;
}
