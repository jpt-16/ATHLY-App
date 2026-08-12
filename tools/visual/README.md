# Visual regression harness

The design is what this project was built to preserve. This is what holds it.

The app is driven through a twenty-step walkthrough in Chromium — onboarding
start to finish, then each app tab — and the phone frame is captured at 2× and
compared with `baseline/` pixel by pixel. Any difference fails, and a diff image
is written so the change can be looked at rather than guessed at.

```bash
npm run build:local          # the harness serves dist/, not the dev server
npm run test:visual:docker   # in the same image CI uses
```

## The renderer is part of the input

A pixel comparison compares two renderings, so the thing doing the rendering has
to be pinned or the comparison is noise. Chromium's build, freetype's version
and the system fonts all change how a glyph lands on a pixel grid, and none of
them is held still by `npx playwright install`.

This was not a theoretical problem. The gate ran unpinned on CI for five commits
and failed every one of them: all twenty screens differed, between 0.25% and 6%
of their pixels, including screens nobody had edited. Two machines drawing the
same words slightly differently, reported as a design regression.

So both CI and the `:docker` scripts run
`mcr.microsoft.com/playwright:v1.62.1-noble` — the tag matches the `playwright`
version in `package.json`, and the two must be bumped together.

**Regenerate baselines in that image, never on the host.** A baseline captured
anywhere else disagrees with CI on every screen, and the failure looks exactly
like a real regression, which is the worst kind of false alarm: the one that
teaches people to run `--update` without looking.

Running without Docker still works and is useful while iterating — you are
comparing your machine against itself — but the result is not what CI will say.

`build:local`, not `build`: a production build refuses to run without Supabase
credentials, and the local-only app — no account gate, no network — is the one
these twenty screens are of.

There is a second suite for the account screens, which only exist when a backend
is configured. It builds a second time with credentials pointing at a host that
does not resolve, since every one of those screens renders before any request is
made:

```bash
npm run test:visual:auth
```

It leaves `dist/` holding the local-only build again on the way out, so the two
suites can be run in either order. CI runs both on every push.

## When it fails

Look at `tools/visual/diffs/` first. Changed pixels are highlighted; the capture
that produced them is in `tools/visual/.capture/`. Neither directory is
committed.

If the change is wrong, fix it. If it is intended — a deliberate design change —
review each diff, then:

```bash
npm run test:visual:update:docker
```

That replaces the baseline with the current rendering. Commit the changed PNGs
with the change that caused them, never on their own: a baseline updated in
isolation is a record of nothing.

The account suite works the same way — `diffs-auth/`, `.capture-auth/`, and
`npm run test:visual:auth:update`.

## What is in the baseline

Twenty screens, captured from the port at the commit that introduced it. That
capture was itself verified against the original Claude Design prototype running
under the design tool's runtime: nineteen of the twenty were byte-identical, and
the twentieth differs by one word on purpose (see **Fidelity** in the root
README).

The allergy filter shipped after that verification and did not move a pixel,
which is the point — an athlete who declares nothing sees exactly the meals the
design shipped. Neither did the compact/PWA work: the safe-area insets are added
as `calc(Npx + env(safe-area-inset-bottom, 0px))`, which resolves to the design's
original value wherever there is no inset, and the compact branch does not
trigger at the harness's 520px viewport.

Nor did accounts, because they are absent from this build entirely.

`baseline-auth/` holds five more: the account gate, the sign-up form empty and
filled, sign-in, and the password reset request. The design has no screens of its
own for any of these, so they were assembled from the ones it does have — the
gate is `OnboardingIntro`'s ground, circles, lockup and CTA; the forms are
`OnboardingQuestion`'s frame, kicker, heading and input. Nothing here is a new
visual idea, and this baseline is what keeps it that way.

## Reproducibility

Two details keep the capture from drifting:

**The font is stubbed, not fetched.** `index.html` loads Archivo from Google
Fonts. Waiting on a third party would make the baseline depend on network
weather and on whatever Google is serving that week, so the request is
intercepted and answered with the same variable font from
`@fontsource-variable/archivo`, width axis included.

**Only the frame is captured**, via the `data-om-starter` marker, so page chrome
and scrollbar differences stay out of the comparison. Keep that attribute on the
frame's root element.

## Files

| File               | What it does                                                   |
| ------------------ | -------------------------------------------------------------- |
| `run.mjs`          | Serves `dist/`, captures, then compares or updates             |
| `capture.mjs`      | The walkthrough itself — add a step here to cover a new screen |
| `run-auth.mjs`     | Builds _with_ config, then the same for the account screens    |
| `capture-auth.mjs` | The account walkthrough                                        |
| `compare.mjs`      | Pixel diff; non-zero exit on any difference                    |
| `baseline/`        | Committed reference PNGs — the local-only app                  |
| `baseline-auth/`   | Committed reference PNGs — the account screens                 |
