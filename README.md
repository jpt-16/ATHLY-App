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

| Script            | What it does                                   |
| ----------------- | ---------------------------------------------- |
| `npm run dev`     | Vite dev server with fast refresh              |
| `npm run build`   | Typecheck, then build to `dist/`               |
| `npm run preview` | Serve the production build locally             |
| `npm test`        | Vitest suite (`npm run test:watch` to iterate) |
| `npm run lint`    | ESLint (`lint:fix` to autofix)                 |
| `npm run format`  | Prettier (`format:check` in CI)                |
| `npm run verify`  | Everything CI runs, in one command             |

## What is in the app

A complete, self-contained walkthrough of the product, with no backend:

- **Onboarding** — thirteen questions covering goal, body, training week, food
  likes and dislikes, allergies, kitchen, budget and time. The answers are used:
  see [Allergies are a hard filter](#allergies-are-a-hard-filter).
- **Targets** — calories and macros derived from those answers, with the
  arithmetic shown: resting burn, training on top, the goal adjustment.
- **Home** — the next meal, what's left of the day's calories and protein, and
  the shape of a training day.
- **Plan** — ask in words or dial in constraints, then generate meals.
- **Calendar, Log, Recipes, Grocery, Progress, Profile** — the rest of the tabs.
- **Meal and swap sheets** — why a meal was chosen, its recipe, and three
  alternatives with the same numbers.

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

## Architecture

```
src/
├── main.tsx                     entry point
├── App.tsx                      root; sets the design's layout variants
├── components/
│   ├── ErrorBoundary.tsx        keeps a render failure off the whole page
│   └── ios/IOSFrame.tsx         the iOS 26 device shell the screens sit in
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
│   ├── screens/                 one file per screen
│   └── overlays/                meal sheet, swap sheet, generating, toast
└── styles/global.css            page ground, keyframes, hover rules
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
that read server data and the screens do not change. `nutrition.ts` is already
pure and independently testable, and is the piece most likely to be shared with
a backend.

## Fidelity

The port is checked, not assumed. The original prototype and this build were
driven through the same twenty-step walkthrough in Chromium — onboarding start
to finish, then each app tab — and the phone frame was captured at 2× on both
and compared pixel by pixel.

**Nineteen of twenty screens are byte-identical. The twentieth differs by one
word, on purpose:** the "what won't you eat" step shipped without a `tag`, so its
kicker rendered as `STEP 9 · UNDEFINED`. Its intended label was in the data all
along (`kicker: "Step 8 · Nope"`), so the step now carries `tag: 'Nope'` and
reads `STEP 9 · NOPE`, numbered like every other step. That is the only
deliberate visual change in the port.

That comparison still passes after allergy filtering was added, and it is meant
to: an athlete who declares nothing sees exactly the meals the design shipped,
because each slot's candidate list is ordered with the original first. The
screens change only once an allergy is declared — which is the point. Re-run the
comparison after any change that touches rendering.

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
| No types, no tests, no build                    | strict TypeScript, 69 tests, ESLint, Prettier, CI |

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

The build is a static bundle in `dist/` — any static host will serve it
(Vercel, Netlify, Cloudflare Pages, S3 + CloudFront, nginx). There is no server,
no API and no runtime configuration. CI builds every push and uploads `dist/` as
an artifact.

## License

[MIT](./LICENSE)
