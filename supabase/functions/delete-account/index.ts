// Deletes the calling athlete's account.
//
// Runs on Deno, in Supabase Edge Functions — not in the browser, and that is the
// whole reason it exists. Deleting a user is an admin operation, and the key
// that permits it (`service_role`) bypasses Row Level Security on every table
// for every user. If that key were in the client bundle, every access control in
// this project would be decorative. So it stays here, in the function
// environment, where Supabase injects it and nothing ships it anywhere.
//
// The rule this file is built around: **the caller's identity comes from the
// verified JWT, never from the request.** A body saying `{"userId": "..."}`
// would be an invitation to delete somebody else's account, so the body is not
// read at all.
//
// Deploy:
//   supabase functions deploy delete-account
//   supabase secrets set ALLOWED_ORIGINS=https://athly-app-five.vercel.app,http://localhost:5173
//
// Apple requires account deletion to be available from inside the app for any
// app that offers account creation, which is what this backs.

import { createClient } from 'jsr:@supabase/supabase-js@2';

/**
 * How often one athlete may ask.
 *
 * Deleting an account is idempotent to the point of being meaningless twice —
 * the second call has no user to find — so this is not protecting the outcome.
 * It bounds the work: every call costs a service-role round trip and an audit
 * insert, and an authenticated client in a loop should not be able to spend that
 * without limit. Generous enough that a real athlete retrying a failure never
 * meets it.
 */
const LIMIT = 5;
const WINDOW = '1 hour';

/**
 * Which origins may call this from a browser.
 *
 * Required, not optional. The function answered `Access-Control-Allow-Origin: *`
 * until this audit — which is *not* the hole it looks like, because the only way
 * to reach this endpoint is with a bearer token, and a cross-origin page cannot
 * read one out of another origin's `localStorage`. CORS is not what protects
 * this; the JWT check is.
 *
 * It is narrowed anyway, and it is required rather than defaulted, because a
 * config that silently falls back to the permissive case is a config nobody
 * sets. Missing it fails the same way a missing service-role key does: loudly,
 * at the first request, before anything happens.
 */
function allowedOrigins(): string[] {
  return (Deno.env.get('ALLOWED_ORIGINS') ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
}

function corsHeaders(origin: string | null, allowed: string[]): Record<string, string> {
  const base: Record<string, string> = {
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    // The response differs by origin, so a cache keyed without it would serve
    // one caller's allow header to another.
    Vary: 'Origin',
  };
  // No echo for an origin we do not know. The browser refuses the response,
  // which is the whole mechanism — there is nothing to add by lying.
  if (origin && allowed.includes(origin)) base['Access-Control-Allow-Origin'] = origin;
  return base;
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('Origin');

  const url = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const allowed = allowedOrigins();

  const cors = corsHeaders(origin, allowed);
  const json = (body: unknown, status: number) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });

  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  if (!url || !anonKey || !serviceKey || allowed.length === 0) {
    console.error('delete-account: function environment is incomplete');
    return json({ error: 'Server misconfigured' }, 500);
  }

  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) return json({ error: 'Not signed in' }, 401);

  // Who is calling? Ask the auth server to verify the token rather than
  // decoding it here — an unverified JWT is a string anyone can write.
  const caller = createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userError } = await caller.auth.getUser();
  const user = userData?.user;
  if (userError || !user) return json({ error: 'Not signed in' }, 401);

  // From here on, and only from here on, the service role.
  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Keyed on the verified user id, so the limit follows the account rather than
  // an IP address that a phone changes by walking down the street. Counted after
  // the JWT check, so an unauthenticated flood cannot fill the table.
  const { data: allowedNow, error: limitError } = await admin.rpc('consume_rate_limit', {
    p_bucket: 'delete-account',
    p_subject: `user:${user.id}`,
    p_limit: LIMIT,
    p_window: WINDOW,
  });
  if (limitError) {
    // Fail closed. A limiter that waves everything through when it breaks is
    // not a limiter, and this endpoint is not one anybody needs urgently.
    console.error('delete-account: rate limit check failed', limitError.message);
    return json({ error: 'Could not delete the account' }, 503);
  }
  if (!allowedNow) return json({ error: 'Too many attempts. Try again later.' }, 429);

  // Audit first. If the delete succeeds and the audit write had been left until
  // afterwards, a failure between the two would erase the account with no record
  // that it ever existed. In the other order the worst case is an audit row for
  // an account that is still there, which is a discrepancy someone can see.
  const { error: auditError } = await admin
    .from('deleted_accounts')
    .insert({ deleted_user_id: user.id, requested_by: 'user' });
  if (auditError) {
    console.error('delete-account: audit insert failed', auditError.message);
    return json({ error: 'Could not delete the account' }, 500);
  }

  // `on delete cascade` on every table's `user_id` takes the rest with it.
  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
  if (deleteError) {
    console.error('delete-account: deleteUser failed', deleteError.message);
    return json({ error: 'Could not delete the account' }, 500);
  }

  return json({ ok: true }, 200);
});
