# ATHLY

Nutrition planning for athletes. Tell ATHLY what you love to eat, what you won't
touch and when you train, and it builds the week around all three — meals timed
to practices and lifts, a grocery list, and targets it can show its working for.

This repository is the production codebase for the ATHLY product prototype: a
React + TypeScript app built with Vite. It began as a Claude Design prototype
(`design/prototype/ATHLY.dc.html`) and was ported screen for screen, so what
runs here is what was designed — verified pixel for pixel, see
[Fidelity](#fidelity).

## Quick start

```bash
nvm use            # Node 22 (>= 20.19 works)
npm install
npm run dev        # http://localhost:5173
```

No configuration needed. With no Supabase project set up the app runs
local-only: every screen works, nothing is saved, and no account is asked for.
See [Accounts and data](#accounts-and-data) to connect a backend.

| Script                   | What it does                                      |
| ------------------------ | ------------------------------------------------- |
| `npm run dev`            | Vite dev server with fast refresh                 |
| `npm run build`          | Typecheck, then build to `dist/` — needs config   |
| `npm run build:local`    | Same, but builds the local-only app deliberately  |
| `npm run preview`        | Serve the production build locally                |
| `npm test`               | Vitest suite (`npm run test:watch` to iterate)    |
| `npm run test:rls`       | Row Level Security suite — needs a local Supabase |
| `npm run test:roundtrip` | End-to-end against a real project — needs `.env`  |
| `npm run lint`           | ESLint (`lint:fix` to autofix)                    |
| `npm run format`         | Prettier (`format:check` in CI)                   |
| `npm run verify`         | Everything CI runs, in one command                |

Two more, both needing a build first and a Chromium
(`npx playwright install chromium`):

| Script                     | What it does                                           |
| -------------------------- | ------------------------------------------------------ |
| `npm run test:visual`      | Pixel-diffs the app against the baseline — see below   |
| `npm run test:visual:auth` | Same, for the account screens (builds with config)     |
| `npm run icons`            | Regenerates the PNG app icons from the mark's geometry |

`npm run build` **refuses to run without Supabase credentials.** A bundle with
none looks like a working product and quietly saves nothing, which is a failure
nobody notices until an athlete loses a week of answers — so the build stops
instead. `build:local` is the deliberate opt-out, and it is what `verify`, CI and
the visual harness use.

## What is in the app

- **Onboarding** — thirteen questions covering goal, body, training week, food
  likes and dislikes, allergies, kitchen, budget and time. The answers are used:
  see [Allergies are a hard filter](#allergies-are-a-hard-filter).
- **Accounts** — Google, Apple and email/password, with verification, password
  reset, sign out and deletion. Only when a backend is configured; see
  [Accounts and data](#accounts-and-data).
- **Targets** — calories and macros derived from those answers, with the
  arithmetic shown: resting burn, training on top, the goal adjustment.
- **Home** — the next meal, what's left of the day's calories and protein
  measured against what was actually logged, and the shape of a training day.
- **Plan** — ask in words or dial in constraints, then generate meals.
- **Log** — record what was eaten; the ring on Home moves with it.
- **Calendar, Recipes, Grocery, Progress, Profile** — the rest of the tabs.
- **Meal and swap sheets** — why a meal was chosen, its recipe, and three
  alternatives with the same numbers.

### What is real, and what is not

The distinction is worth stating plainly, because an app that reports on a
teenager's eating should not be vague about which of its numbers are
measurements.

**Real:** the targets, the allergy filter, the calendar, and — since the food log
landed — everything on Home and Progress. Log a meal and the ring moves; log
nothing and it says nothing. A fresh account sees an empty ring and empty stats,
which is the truth about a fresh account.

**Not yet:** the meal _plan_ is still the same slots every day, the grocery list
is a fixed list rather than one built from the week, and barcode and photo
logging are still buttons that raise a toast.

**Estimates, not measurements:** every recipe's calories and macros were authored
by hand for the design prototype. They are plausible and unverified.
[`tools/usda/`](#nutrition-data) exists to check them against USDA FoodData
Central; until someone has run it and read the diff, treat those four numbers per
meal as the estimates they are.

Several things were **removed** rather than kept: a Progress tab whose adherence
percentages and "what Athly learned" bullets were literals shown identically to
every user, and a Home card that told everyone they had "swapped mushrooms out
three times this week". Nothing records a swap, so nothing could have noticed
one. They come back when there is data behind them.

## Accounts and data

Supabase — Postgres, Auth, Row Level Security, Edge Functions. Configuration
decides whether any of it is used: with none, the app is exactly what it was
before there was a backend.

```bash
cp .env.example .env    # then fill in the two values
```

| Variable                 | Where to find it            | Secret? |
| ------------------------ | --------------------------- | ------- |
| `VITE_SUPABASE_URL`      | Supabase → Settings → API   | No      |
| `VITE_SUPABASE_ANON_KEY` | Supabase → Settings → API   | No      |
| `VITE_ENABLE_APPLE`      | `true` once Apple is set up | No      |

The `anon` key is public by design — it is compiled into the bundle and anyone
can read it out. **The access boundary is Row Level Security, not key secrecy.**
Every table requires `auth.uid() = user_id` on select, insert, update and delete,
so the database refuses to return another athlete's rows rather than trusting the
client not to ask. `supabase/tests/rls.test.ts` proves it against a real
Postgres: an anonymous client and a wrong-user client are both denied on every
table, and a table added later without policies fails the suite by construction.

**Views need their own guard, and it is easy to miss.** `daily_totals` sums
`meal_logs` per day. A Postgres view runs with its _owner's_ privileges unless it
is declared `security_invoker`, and the owner is the migration role, which RLS
does not constrain — so a view over a perfectly protected table will hand every
athlete every other athlete's totals. The migration sets the flag, and
`rls_coverage()` was rewritten to report views as well as tables so the test
catches the next one from the catalog rather than from a list somebody remembered
to update.

Food logs are the most sensitive rows here: what a named minor ate, by day. The
macros are copied onto each log row rather than referenced, so editing a recipe —
or revising its numbers after the USDA pass — cannot rewrite someone's history
underneath them.

The `service_role` key bypasses all of that. It never appears in `.env`, in the
bundle, or in this repository — Supabase injects it into Edge Functions, which is
the only place it is needed.

### Setting up the database

```bash
supabase start                       # local Postgres + auth, applies migrations
npm run test:rls                     # with the keys `supabase start` prints
supabase db push                     # apply to the hosted project
supabase functions deploy delete-account
npm run test:roundtrip               # against the project in .env
```

Two suites, two different claims, and it is worth keeping them apart.
`test:rls` needs the `service_role` key and proves **the database refuses the
wrong request** — an anonymous client and a wrong-user client denied on every
table, and any view that ships without `security_invoker` failing from the
catalog. `test:roundtrip` needs only the two public values from `.env` and proves
**the app makes the right request**: it signs up a throwaway account, saves the
thirteen answers, reads them back field by field, logs a meal, totals it, checks
a second athlete sees none of it, and then deletes both accounts through the same
Edge Function the Profile screen calls. A repository writing a column the
migration does not have fails there rather than in front of an athlete.

It creates and deletes real accounts, so point it at an empty project or a
branch. If sign-up returns no session it will say so: the project has email
confirmation on, and the suite cannot proceed past it.

### Where accounts fit in the flow

Onboarding first, account at the save point: thirteen questions → targets →
account → app. Asking someone to sign up before they have seen anything is the
cheapest way to lose them, and the questions are this app's best argument for
itself. Answers are parked in `localStorage` across the redirect — OAuth and
email links both tear the page down — then written to the database and cleared.

Signing in on another device pulls the answers back down.

### Google

In Google Cloud Console: an OAuth consent screen with scopes `email`, `profile`,
`openid` (none sensitive, so no verification review), published to **In
production** — Testing caps you at 100 users and expires refresh tokens after
seven days. Then a **Web application** OAuth client with:

- Authorized redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`
- JavaScript origins: `http://localhost:5173` and your production URL

Paste the Client ID and Secret into Supabase → Authentication → Providers →
Google. Neither belongs in this repository.

### Apple — built, switched off

`VITE_ENABLE_APPLE=false` until there is an Apple Developer membership. The
button, the callback and the account plumbing are all in place, so turning it on
is configuration rather than code. Apple requires this option on iOS once Google
sign-in exists (App Store Guideline 4.8), so it has to be on before submission.

When you enrol you will need a Team ID, an App ID with the Sign in with Apple
capability, a Services ID, and a `.p8` signing key. Two things bite later:
**Apple caps the derived client secret at six months**, so sign-in breaks
silently unless someone rotates it; and **Apple sends the user's name exactly
once**, on first authorization, so it must be captured then or it is gone.

### Email

Supabase's built-in mailer is rate-limited to a handful of messages an hour and
is not for production. Verification and reset work for testing; a real sender
(Resend, Postmark) is a dashboard change plus SPF/DKIM records, no code.

### Account deletion

`supabase/functions/delete-account` — verifies the caller's JWT, resolves the
user ID **from the token and never from the request body**, writes an audit row,
then deletes the user. `on delete cascade` takes everything else. Reachable from
Profile in three taps, which is Apple's limit.

## Allergies are a hard filter

The design collected allergies and never used them — the build screen animated
"Blocking your allergies" while blocking nothing. It blocks now, and the rules
are deliberately asymmetric:

- **Allergens are hard.** A meal containing a declared allergen is never shown,
  never offered as a swap, never generated into a plan, and never listed under
  Recipes. There is no override and no warning-banner fallback. If that empties
  a slot, the slot says so and names the allergen.
- **Dislikes and time are soft.** When they cannot both be met they are dropped
  in a fixed order — time first, then dislikes. An allergen is never a rung on
  that ladder. (Budget belongs on it and is absent: meals carry no cost yet, so
  a budget rung would be a step that never changes the outcome.)

Two design decisions hold this together:

**Allergens are derived, never authored.** No meal carries a hand-written
allergen list, because one drifts from its ingredients the first time a recipe
is edited. `foodFacts.ts` maps each ingredient to what it contains, and a meal's
allergens are computed from its ingredient list.

**Unknown ingredients fail closed.** An ingredient with no entry in the facts
table is treated as carrying _every_ allergen, so a missing entry hides the meal
rather than silently marking it safe. A test asserts every ingredient in every
recipe has an entry, so that path should never fire — it exists so the failure
mode is refusal rather than exposure.

The library grew from 14 meals to 44 for this. Fourteen could not absorb a real
filter: dairy or gluten alone emptied most slots. Every slot now has at least
two options free of _all nine_ allergens, which a test enforces.

Where the facts table is deliberately over-cautious — uncertified oats and
granola marked gluten, granola marked tree nuts, soy sauce marked gluten, Caesar
dressing marked fish and egg and dairy — the reasoning is written down beside
each entry. A tag that is too broad costs someone a meal; one that is too narrow
costs them a reaction.

## Nutrition data

Every recipe's four numbers — 620 calories, 28g of protein, and so on — were
written by hand for the design prototype. They look right. Nobody has checked
them, and the app now does arithmetic on them and shows the result to a
sixteen-year-old as a fact about their day.

`tools/usda/` closes that gap against USDA FoodData Central. It runs locally,
against your own key, and its output is committed data — **the app ships no key
and makes no request to USDA.**

```bash
FDC_API_KEY=… node tools/usda/ingest.mjs   # propose matches, then build
node tools/usda/report.mjs                 # computed vs authored, per meal
```

A key is free and instant from
[api-key-signup](https://fdc.nal.usda.gov/api-key-signup.html). Keep it in your
shell; it does not belong in this repo.

Three rules, each because the alternative is a number nobody can defend:

1. **No auto-accepted match.** The ingest _proposes_ FDC foods for each of the 88
   ingredients and writes them to `candidates.json`. Nothing is used until an
   `fdcId` appears in `matches.json`, put there by a person who read the
   candidates. "Cheese" returns forty foods and the first and fourth differ by a
   hundred calories an ounce; a search ranking is not evidence.
2. **No invented gram weights.** Recipe quantities are free text — `1 cup`,
   `2 tbsp`, `1 large`. Grams come from the matched food's own USDA portions,
   because a cup of oats is 81g and a cup of rice is 185g and no general rule
   gets you between them. A pair that cannot be resolved is _reported_, with the
   portions USDA does publish, so you can add a weight you chose deliberately.
3. **The switchover is a separate decision.** `report.mjs` prints computed
   against authored for all 44 meals. Discrepancies are findings about the
   authored numbers, not bugs to tune away — and the app keeps showing the
   authored figures until someone has read the diff and decided.

**One honest limitation.** These scripts were written against the FDC
documentation, not against a live response: the environment they were built in
cannot reach `api.nal.usda.gov`. The tests run on hand-written fixtures whose
_shapes_ are researched and whose _numbers_ are invented (see
`tools/usda/fixtures/README.md`). They validate hard and fail loudly with the raw
payload rather than writing zeros, so expect the first real run to want a
fix-up — that is the cheap failure, and the one worth designing for.

## Two presentations

The design draws a phone: a bezel, a dynamic island, a status bar reading 9:41,
a home indicator. On a desktop that framing is the point. On an actual phone it
is a 402px bezel crammed into a 390px viewport with a fake clock above the real
one.

So below 500px — the frame's own width plus its page padding, so the crossover
is where the bezel stops fitting rather than a guess at a device size — the page
chrome and the drawn hardware go away and the screens fill the viewport. The app
is untouched by this; `IOSDevice` is the only component that knows the
difference, and `useIsCompact` is the only thing that decides.

The compact branch needs `matchMedia` to say so. Where it is missing, or cannot
evaluate a query — jsdom, which is every test — the answer is the framed branch,
which is what the suite and the visual baselines are written against.

**Safe areas.** Added to the Home Screen the app runs under the status bar and
over the home indicator, so anything anchored to the bottom edge — the tab bar,
the onboarding CTA, the swap sheet's commit button — carries
`calc(Npx + env(safe-area-inset-bottom, 0px))`. Where there is no inset that is
exactly the design's original value, which is why none of it moved a pixel.
`env()` reads 0 without `viewport-fit=cover` in `index.html`; the two go
together.

The top edge needed nothing: the design already opens each screen 60–62px down,
which is where it put its own drawn status bar, and that clears the real one on
every iPhone since the notch.

## Architecture

```
src/
├── main.tsx                     entry point
├── App.tsx                      root; layout variants + the session
├── auth/
│   ├── useSession.ts            the current session, from onAuthStateChange
│   └── authActions.ts           sign up, sign in, reset, sign out, delete
├── components/
│   ├── ErrorBoundary.tsx        keeps a render failure off the whole page
│   └── ios/IOSFrame.tsx         the iOS 26 device shell the screens sit in
├── data/
│   ├── profileRepo.ts           AppState ↔ database rows, both directions
│   └── pendingOnboarding.ts     answers parked across the sign-in redirect
├── hooks/
│   └── useIsCompact.ts          phone viewport, or desktop
├── lib/
│   ├── env.ts                   configuration; nothing secret
│   ├── supabase.ts              the client, or null when unconfigured
│   └── database.types.ts        the schema, as TypeScript sees it
├── prototype/
│   ├── AthlyApp.tsx             all state; derives the view model
│   ├── viewModel.ts             ViewModel type, inferred from AthlyApp
│   ├── nutrition.ts             targets + day-shape maths (pure, tested)
│   ├── foodFacts.ts             what each ingredient contains (allergens, tags)
│   ├── filtering.ts             the hard allergen gate + soft preference ladder
│   ├── data.ts                  meals, onboarding script, tokens
│   ├── types.ts                 state shapes
│   ├── styles.ts                CSS-string → React style
│   ├── PrototypeShell.tsx       page chrome + device frame
│   ├── screens/                 one file per screen (auth/ for the account ones)
│   └── overlays/                meal sheet, swap sheet, generating, toast
└── styles/global.css            page ground, keyframes, hover rules

supabase/
├── migrations/0001_init.sql     schema, RLS policies, triggers
├── functions/delete-account/    service-role deletion, JWT-verified
└── tests/rls.test.ts            the access-control suite
```

The shape is deliberately simple and comes straight from the design:

**One component owns state.** `AthlyApp` holds the entire walkthrough in a
single state object and, on every render, derives a flat **view model** — a bag
of strings, numbers and callbacks, one key per thing a screen needs.

**Screens are pure functions of that view model.** Every file under `screens/`
and `overlays/` takes `v: ViewModel` and renders. None of them holds state,
fetches, or computes anything; if a screen shows the wrong number, the bug is in
`renderVals`. `ViewModel` is inferred from `AthlyApp.renderVals()`, so renaming a
key breaks every screen that reads it at compile time.

**Styles stay as strings.** The design expressed each element's style as a CSS
string, and the view model computes strings for anything conditional. `S()`
(`prototype/styles.ts`) parses them into React style objects, memoised. Keeping
that representation is what made a pixel-exact port possible; rewriting ~640
style attributes by hand would not have been.

### Where to extend it

`data.ts` is static sample content — the meal library, the onboarding script.
`renderVals()` is the seam: swap the derivations that read `this.state` for ones
that read server data and the screens do not change. The account screens were
built through that seam and added no new visual vocabulary — every style string
under `screens/auth/` is copied from `OnboardingIntro` or `OnboardingQuestion`,
and the Account rows in Profile reuse the existing data-driven row component.

`nutrition.ts` is pure, dependency-free and takes a narrow `TargetInputs` rather
than the whole state, so the same file computes targets in the browser and in an
Edge Function — a target recomputed server-side must never disagree with the one
the athlete was shown.

## Fidelity

The port is checked, not assumed, and the check is a gate rather than a one-off:
`npm run test:visual` drives the app through a twenty-step walkthrough in
Chromium — onboarding start to finish, then each app tab — captures the phone
frame at 2×, and pixel-diffs it against a committed baseline. CI runs it on
every push. See [`tools/visual/`](./tools/visual/README.md).

The baseline was itself verified against the original prototype running under
the design tool's runtime, driven through that same walkthrough and compared the
same way.

**Nineteen of twenty screens are byte-identical. The twentieth differs by one
word, on purpose:** the "what won't you eat" step shipped without a `tag`, so its
kicker rendered as `STEP 9 · UNDEFINED`. Its intended label was in the data all
along (`kicker: "Step 8 · Nope"`), so the step now carries `tag: 'Nope'` and
reads `STEP 9 · NOPE`, numbered like every other step. That is the only
deliberate visual change in the port.

That comparison still passes after allergy filtering was added, and it is meant
to: an athlete who declares nothing sees exactly the meals the design shipped,
because each slot's candidate list is ordered with the original first. The
screens change only once an allergy is declared — which is the point.

It passes after the compact and safe-area work too, and for a similar reason:
every inset is `calc(Npx + env(…, 0px))`, which is the design's own value
wherever there is no inset.

It passes after accounts arrived because the harness builds the app without a
backend, which is the app those twenty screens are of. The account screens have
their own five-screen baseline, captured from a second build with credentials
that point nowhere — `npm run test:visual:auth`.

**Three baselines changed when the food log landed**, and only three: Home, the
Log tab and Profile. Those screens used to show numbers nobody had measured — a
ring fixed at `target − 1840`, a list of four meals ending in "Rice cakes & honey
· Monday", `6/7 days on plan` — and now show an athlete's own, which for a fresh
account means an empty ring and an empty list. The other seventeen are unchanged
to the pixel.

The harness freezes the browser clock (`tools/visual/clock.mjs`) before the app
loads. The calendar and the week strip are drawn from the real date now, so
without the pin every baseline would expire at midnight and again every month.

### What changed underneath

The prototype ran on the design tool's runtime: it fetched React and Babel from
a CDN at page load, compiled JSX in the browser, and interpreted a custom
template language (`sc-if`, `sc-for`, `{{ }}`) on every render. None of that
survives here.

| Prototype                                       | Production                                        |
| ----------------------------------------------- | ------------------------------------------------- |
| React + Babel from unpkg at runtime             | bundled by Vite, no CDN, no runtime compile       |
| Template interpreted each render                | real JSX, compiled once at build time             |
| `style="…"` parsed by the tool's runtime        | same strings, parsed by `S()` and memoised        |
| `style-hover="…"` → classes injected at runtime | static CSS classes in `global.css`                |
| One 2,000-line HTML file                        | typed modules, one file per screen                |
| No types, no tests, no build                    | strict TypeScript, 99 tests, ESLint, Prettier, CI |

Hover rules carry `!important` because the elements they apply to have inline
styles — that is how the design tool did it too, and dropping it would silently
kill every hover state.

## Fonts

Archivo is loaded from Google Fonts, using the same request the design was drawn
against, including the width axis (`font-stretch: 113–125%`) the headings lean
on. Self-hosting it via `@fontsource-variable/archivo` is a reasonable next step
for privacy and load time, but it is a change worth re-running the pixel
comparison over rather than a free swap.

## Conventions

- Strict TypeScript. `noUnusedLocals`, `noUnusedParameters` and
  `verbatimModuleSyntax` are on.
- One deliberate exception: rows inside the view model are typed `VmRow`
  (`any`). Each is built ad hoc for the markup that consumes it, and naming ~40
  near-identical shapes would add ceremony without safety. Top-level view-model
  keys are fully checked.
- Prettier owns formatting; run `npm run format` before committing.
- `design/` is frozen reference material — not built, not linted, not formatted.

## Deployment

The build is a static bundle in `dist/` — any static host will serve it (Vercel,
Netlify, Cloudflare Pages, S3 + CloudFront, nginx). CI builds every push and
uploads `dist/` as an artifact.

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the host's environment
settings before the first deploy. Without them the build fails rather than
shipping an app that saves nothing. Add the deployed origin to Supabase →
Authentication → URL Configuration, or its sign-in redirects will be rejected —
including each preview URL you want sign-in to work on.

`vercel.json` carries the build config and four security headers. It has no SPA
rewrite: with a single route, a catch-all rewrite would turn genuine 404s into
200s. That lands with routing. When a Content-Security-Policy is added, its
`connect-src` needs the Supabase project origin.

Source maps are off. `'hidden'` still writes the `.map` into `dist/`, where a
public host serves it at a guessable path — obscurity, not privacy. It goes back
on once an error tracker exists to consume them.

**Note for Vercel:** this repository has no `main` branch. Set the production
branch to the one you are deploying, or Vercel will look for `main` and find
nothing.

## Before this is public

Three things are outstanding, and none of them is a code change.

**This is not medical or dietary advice, and the app does not say so anywhere
yet.** It computes calorie and protein targets for 13–17-year-olds and now keeps
a record of what they eat. A Registered Dietitian should review the targets
arithmetic in `nutrition.ts` and the under-18 guardrails before anyone follows
them — particularly the deficit path, where the interesting question is what the
app should refuse to recommend.

**The privacy posture needs a lawyer, not a developer's reading of a blog post.**
Logged food intake tied to a named minor is health data about a child. Whatever
that requires — parental consent, retention limits, a Privacy Policy and Terms,
regional rules like COPPA or GDPR-K — is a question for someone qualified to
answer it. Nothing in this repository should be read as a compliance claim. What
it does have is the technical groundwork: RLS on every table, an audited
deletion path, and no analytics or third-party trackers.

**The macros are estimates.** See [Nutrition data](#nutrition-data). Shipping
authored figures to people making decisions from them is the part to fix first.

## License

[MIT](./LICENSE)
