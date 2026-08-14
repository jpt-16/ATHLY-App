# Production readiness

What has been done, what has to be done outside this repository, and what is
still missing before anyone who is not us uses ATHLY.

Written after a security and architecture audit of everything on
`claude/design-prototype-production-setup-yhq9pd` as of `3a19e48`. Three
sections, in the order they matter:

1. [Blocking](#blocking) — do not put this in front of a real athlete until
   these are done.
2. [Required configuration](#required-configuration) — settings that live in the
   Supabase and Vercel dashboards. **Nothing in this repository can assert
   them**, which is the reason they are written down.
3. [Verified](#verified) — what the audit checked and found sound, so the next
   person does not re-derive it.

For what would most improve the athlete's experience next — as opposed to what
blocks a launch — see [`UX_AUDIT.md`](UX_AUDIT.md).

A note on what this document is not. It is an engineering checklist. It is not a
compliance assessment, it is not legal advice, and nothing in it should be read
as a claim that ATHLY meets COPPA, GDPR-K, HIPAA or any other regime. See
[Blocking](#blocking).

---

## Blocking

### 1. Nobody qualified has reviewed the nutrition targets

`src/prototype/nutrition.ts` computes calorie and protein targets for
13–17-year-olds, and the app now records what they eat against those targets.
Two judgements in it are ours and should not be:

- **The deficit ceiling** — about 1% of bodyweight a week, 1.5 lb under 18. The
  interesting question is not what the app recommends but what it should
  _refuse_ to, and that is a clinical question.
- **The absence of a gain ceiling.** There was one, at 1 lb a week for anyone
  under 18. It was removed in `3a19e48` by product decision, because its real
  effect was a picker offering five paces and delivering three identical ones.
  That reasoning is sound and it is still not a dietitian's sign-off.

A Registered Dietitian should review both before launch. Neither is a code
change; both are marked in the source.

**This grew in the nutrition pass.** Energy is now derived from the athlete's
_goal_ weight rather than their current one, which is the largest single change
to the arithmetic and the one with the most room to be wrong. A safety floor
stops it stacking two deficits on a teenager, and that floor is itself a
judgement. Micronutrient targets were added from the DRIs. Every formula, its
source, and the six questions worth asking first are written out in
[`NUTRITION.md`](NUTRITION.md) — that document is the agenda for the review, not
a substitute for it.

### 2. No privacy review, and the app holds health data about minors

Logged food intake tied to a named 13-year-old is health data about a child.
Whatever that requires — parental consent, retention limits, a Privacy Policy
and Terms, regional rules — is a question for a lawyer, and one has not been
asked.

What exists is the technical groundwork, not a compliance position: RLS on every
table, an audited deletion path, no analytics, no third-party trackers, and no
data sold or shared. What does not exist: a Privacy Policy, Terms of Service, an
in-app disclosure that this is not medical advice, a retention policy, or any
answer at all on parental consent.

### 3. The nutrition values are authored estimates

Recipes no longer carry hand-written macros — a meal's nutrition is summed from
the per-100g ingredient table in `src/prototype/nutrients.ts`, which also carries
the eight micronutrients. That is better provenance and not proof: the table is
still authored rather than sourced.

The USDA ingest (`tools/usda/`) now targets exactly this table, which is what it
was always for, and has never been run against the live API — this environment
cannot reach `api.nal.usda.gov`. Until `FDC_API_KEY=… node tools/usda/ingest.mjs`
runs and someone reads `tools/usda/report.mjs`'s diff, the app is stating
estimates as fact to people making decisions from them.

Two things did improve. The old per-meal figures did not agree with themselves —
only 17 of 44 stated a calorie count within 2% of their own macro breakdown — and
an ingredient is checkable in a way a composed meal is not.

### 4. Nobody has ever created an account

Zero rows in every table, zero signups in the auth log. Every sign-in path is
built and none has completed end to end. Before public testing, walk all of
them on the deployed site: email sign-up → confirmation link → sign-in, Google,
password reset, sign-out, and account deletion. Then run `npm run test:rls`
against a real Postgres and `npm run test:roundtrip` against the project —
neither has ever executed.

### 5. No error tracking

`ErrorBoundary` writes to a console nobody will read. A crash on an athlete's
phone is currently invisible. Source maps are off (`vite.config.ts`) precisely
because there is nothing to consume them; both switch on together.

---

## Required configuration

Settings outside the repository. The audit could not verify most of these, and
`git` will never tell you when one changes.

### Supabase → Authentication → URL Configuration

| Setting       | Value                                                          |
| ------------- | -------------------------------------------------------------- |
| Site URL      | `https://athly-app-five.vercel.app`                            |
| Redirect URLs | `https://athly-app-five.vercel.app/`, `http://localhost:5173/` |

**Do not add `https://*.vercel.app/**`.** Every preview deployment on Vercel —
including anyone else's — would become a valid place to send an athlete's
session. Add preview URLs one at a time, or not at all.

### Supabase → Authentication → Providers and settings

- [ ] **Confirm email: ON.** With it off, anyone can create an account against
      an email address that is not theirs. `authActions.ts` already renders the
      "confirm your email first" case, so the app is ready for it.
- [~] **Leaked-password protection: not available on this plan.** Supabase's
  HaveIBeenPwned check is a **Pro feature**, and this project is on Free.
  The advisor will keep reporting it; it is not something a setting can fix
  here.

      What was done instead: `src/auth/passwordStrength.ts` refuses the head of
      the leaked-password distribution — a bundled list, plus checks for
      repeated characters, keyboard runs, all-digit passwords, and passwords
      built from the athlete's own email — on both the sign-up and the
      password-reset paths. Before it, the entire policy was
      `MIN_PASSWORD_LENGTH = 8`, which accepts `password` and `12345678`.

      **It is not equivalent, and should not be recorded as if it were.** It
      runs in the browser and can be skipped; Supabase's runs on the server and
      cannot. It knows a few hundred passwords; HIBP knows hundreds of millions.
      Upgrade path, in order: Supabase Pro → the HIBP k-anonymity API from the
      client (a third-party request from an app used by minors, plus a
      `connect-src` entry, so it belongs in the privacy review) → what is there
      now.

- [ ] **Google: enabled** (confirmed as of 03:37 UTC — the provider returns a
      302 to Google). The round trip has still never completed; see Blocking #4.
- [ ] **Apple: still off**, deliberately. `VITE_ENABLE_APPLE` gates only whether
      the button renders. Apple requires it on iOS once Google is offered
      (App Store Guideline 4.8), so it must be on before submission.

### Supabase → Authentication → Rate limits

**This is the item the brief asked for that code cannot deliver.** GoTrue's
endpoints — `/auth/v1/token`, `/auth/v1/signup`, `/auth/v1/recover` — are
reached directly with the public anon key and never pass through anything in
this repository. Their limits are project settings and nothing else. Set them
deliberately rather than inheriting defaults:

- [ ] Sign-in / token requests per hour per IP
- [ ] Sign-ups per hour per IP
- [ ] Password-reset emails per hour
- [ ] Confirmation emails per hour

Related: the built-in SMTP sender is heavily rate-limited and not intended for
production. A real SMTP provider is needed before more than a handful of people
sign up, or confirmation emails will silently stop arriving.

What _is_ in code: `consume_rate_limit()` in `0004_limits.sql`, a
service-role-only counter in Postgres, applied to the `delete-account` Edge
Function at 5 calls an hour per account. Any function added later — including
the meal planner, when it becomes a real model call rather than a timed overlay
— should use it. There is no AI endpoint today, so there is nothing else to
limit yet; that is a fact about the current build, not an omission.

### Supabase → Edge Functions → Secrets

- [ ] `ALLOWED_ORIGINS` — comma-separated, e.g.
      `https://athly-app-five.vercel.app,http://localhost:5173`.
      **`delete-account` returns 500 without it**, by design: a CORS allow-list
      that falls back to permissive when unset is an allow-list nobody sets.
      Still unset as of the last check, and the redeployed function is live, so
      account deletion answers 500 until it is added. Nobody has an account yet,
      so nothing is currently broken by it — but it blocks Blocking #4.

`SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are injected
by the platform. The service-role key must appear nowhere else — not in `.env`,
not in the bundle, not in the repository.

### Vercel

- [ ] `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` set. Without them the
      build fails rather than shipping an app that saves nothing.
- [ ] Production branch set explicitly — this repository has no `main`.
- [ ] Redeploy. Production is several commits behind.

### Migrations

- [x] `0004_limits.sql` — **applied**, and `delete-account` redeployed against
      it (function version 4). The rate-limit table, the `consume_rate_limit`
      function and the column bounds are all live and verified: RLS on with no
      policies, `security definer` with `search_path = ''`, execute revoked from
      `anon` and `authenticated`.
- [ ] **`0006_micronutrients.sql` has not been applied.** It adds the eight
      micronutrient columns to `meal_logs`, rebuilds `daily_totals` to sum them
      (restating `security_invoker = on`), and drops the `protein_mode` /
      `protein_custom_g` columns the app no longer writes. Until it is applied,
      logging fails against the live project: the client sends columns that do
      not exist.
- [x] `0005_plan.sql` — **applied**. `plan_swaps` and `plan_days` hold the meals
      an athlete swapped into their week and how many times they re-rolled a
      day. Verified against the catalog: RLS on, four policies each, and the
      advisors report nothing new.

`rls_coverage()` now reports **11 tables, all with RLS enabled**, and one view
(`daily_totals`) running `security_invoker = true`.

### Supabase advisors

Checked against the live project. Four findings, three of which are noise, and
they are recorded here so nobody re-investigates them:

- `deleted_accounts` and `rate_limits` have RLS enabled and no policies. That is
  the deliberate deny-all posture — service-role only — not an oversight.
- `rls_auto_enable()` is reported as a `SECURITY DEFINER` function callable by
  `anon` and `authenticated`. It is Supabase's own platform function, owned by
  `postgres` and wired to the `ensure_rls` event trigger. It returns
  `event_trigger`, a type PostgREST cannot call and Postgres refuses outside a
  DDL event, so neither warning is reachable. Its only effect is enabling RLS,
  which is the safe direction anyway.
- **Leaked-password protection is off.** Real, and **not fixable on this plan** —
  it is a Pro feature. See the Providers section above for what was done in code
  instead, and why that is not the same thing. Expect this advisor to stay red
  until the project moves to Pro.

---

## Verified

Checked during the audit and found sound. Recorded so it does not get
re-litigated.

### Data access

- **RLS enabled on all 9 tables**, confirmed against the live project, not just
  the migration. `rls_coverage()` reads this from the catalog rather than a
  hand-kept list, so a table added later without policies fails
  `supabase/tests/rls.test.ts` the day it appears.
- **Four policies per user-owned table** (select/insert/update/delete), each
  requiring `auth.uid() = user_id`, with `with check` on every write — without
  which a user could reassign a row to someone else's id.
- **`entitlements` is read-only to the athlete.** No insert, update or delete
  policy exists, so nobody can grant themselves a subscription.
- **`deleted_accounts` and `rate_limits` have RLS on and no policies at all** —
  unreachable to every client, service-role only. Deliberate.
- **`daily_totals` runs `security_invoker = on`**, confirmed live. A Postgres
  view otherwise runs with its _owner's_ rights, and this one would have handed
  every athlete every other athlete's totals through a table whose policies are
  perfect. The guard that reports it was itself wrong in `0002` and fixed in
  `0003`.
- **Every `SECURITY DEFINER` function pins `search_path = ''`** and is revoked
  from `anon` and `authenticated`.

### Secrets

- The client bundle contains the project URL and the anon key, both public by
  design — the access boundary is RLS, not the secrecy of that key.
- The service-role key exists only in the Edge Function environment.
- The app ships no USDA key and makes no USDA request; the ingest is a local
  tool.
- `.env` is gitignored; `.env.example` carries no values.
- `npm audit`: **0 vulnerabilities** across 297 dependencies. 13 in production.

### Account handling

- **PKCE, not implicit.** The OAuth return carries a single-use code exchanged
  over a POST, rather than an access token in the URL fragment where it lands in
  browser history.
- **Account deletion reads its identity from the verified JWT**, never from the
  request body, and writes the audit row before the delete rather than after.
- **No account-enumeration oracle.** "Invalid login credentials" is deliberately
  ambiguous, password reset always reports success, and sign-up says the same
  thing whether or not the address was taken.
- **Password reset holds the athlete at "choose a new password"** rather than
  letting a recovery session drop them into the app with the forgotten password
  still live.

### Client

- **No `dangerouslySetInnerHTML`, no `eval`, no `innerHTML`, no `document.write`,
  no raw `fetch`.** Every string reaching the DOM goes through React's escaping.
- **CSP added in this pass** (`tools/csp.mjs`, injected by `vite.config.ts`),
  with `script-src 'self'` and a `connect-src` naming the one configured
  Supabase project rather than a wildcard. This matters more here than it looks:
  the session lives in `localStorage` and refreshes itself, so injected script
  would be a durable copy of an account.
- **HSTS, `frame-ancestors 'none'`, COOP** added alongside the four headers that
  were already there.
- **Numeric inputs are steppers with clamps, and every numeric column carries a
  CHECK constraint** — age 13–120, weight 50–700 lb, kcal 0–10000, and so on. A
  tampered client cannot write a nonsense profile.
- **Free-text columns bounded in `0004`.** `meal_logs.name` always was; the
  columns from `0001` were not, and now are.

---

## Known, accepted, not blocking

Real findings that were judged not worth acting on now. Listed so the judgement
is visible rather than implicit.

- **Fonts load from Google's CDN** (`index.html`). Every page view tells Google
  an athlete's IP and user-agent, which for an app serving minors is a privacy
  question worth asking even though it is not a security one — Germany's courts
  have treated exactly this as a GDPR matter. `@fontsource-variable/archivo` is
  already a dependency, and the visual harness already proves the self-hosted
  file renders identically, so self-hosting is a small change. It belongs in the
  privacy review (Blocking #2), not before it.
- **`style-src` allows `'unsafe-inline'`.** The screens are a design-tool port
  and carry their styles as strings. What this forgoes is CSS injection; what
  takes accounts is script, and `script-src 'self'` has no exceptions.
- **`saveAccount` is not transactional.** PostgREST has no multi-statement
  transaction, so a failure part-way writes the profile and not the allergens.
  The caller treats a failed save as failed and offers a retry. Worth an RPC
  eventually; not a correctness risk today because the next save rewrites
  everything.
- **No MFA.** Appropriate to the audience and stage.
- **Onboarding answers sit in `localStorage`** for up to 24 hours between the
  last question and a confirmed account, because both sign-up paths leave the
  page. Written on the athlete's own device, sent nowhere, deleted on arrival in
  the database, and expiring on their own.
