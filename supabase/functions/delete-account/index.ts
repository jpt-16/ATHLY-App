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
//
// Apple requires account deletion to be available from inside the app for any
// app that offers account creation, which is what this backs.

import { createClient } from 'jsr:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const url = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !anonKey || !serviceKey) {
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
