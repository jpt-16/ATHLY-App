# The three changes worth making next

An audit of the whole app against one question: **what would most improve the
experience without redesigning the UI?**

Written after the feature pass on `claude/design-prototype-production-setup-yhq9pd`
(`0d14247`). Each finding names the code it is about, so it can be checked rather
than believed. None of the three needs a new screen, a new component, or a change
to the visual design — all three are wiring, arithmetic, or routing behind
surfaces that already exist.

---

## 1. Nothing on the Profile screen can be changed — **fixed**

> Built in `profileFields.ts` and `overlays/EditSheet.tsx`. Eleven rows are now
> editable; a weigh-in on Progress updates the weight the arithmetic uses; and
> the 13+ floor the privacy policy promises is enforced rather than stated.
>
> Still not editable: sports, favourite foods, foods to avoid and allergies. All
> four are chip lists rather than single values and want the onboarding picker,
> not this sheet. **Allergies is the one that matters**, because it is a safety
> filter an athlete cannot currently correct.

## 1. Nothing on the Profile screen can be changed

**The evidence.** Every row in `profileGroups` (`AthlyApp.tsx`) routes to the
same place:

```ts
tap: () =>
  label === 'Schedule' ? this.update({ tab: 'calendar' })
  : label === 'Sign out' ? this.doSignOut()
  : label === 'Email' ? undefined
  : this.toast(`${label} — editor would open`),
```

Two rows work. Eighteen do not. Each has a chevron promising otherwise.

**Why it is first.** Three separate failures fall out of one missing behaviour:

- **Allergies cannot be corrected.** An athlete who mis-tapped, or who develops
  an allergy, has no way to tell the app. Everything in `filtering.ts` exists to
  make the allergen rule absolute — it is filtered before any ranking, never
  relaxed by the ladder, re-checked when a stored swap is read — and all of that
  rigour hangs off an answer given once, in a hurry, during a thirteen-question
  onboarding, that can never be revised. That is a safety property with a
  usability hole underneath it.
- **Targets go stale and never recover.** `computeTargets` derives everything
  from `lb`, and `lb` is captured at onboarding and never written again. The
  app's default goal is _gain lean weight_. An athlete who succeeds at the thing
  the app is for is, within a few weeks, being fed numbers computed for a body
  they no longer have — silently, with no prompt and no way to fix it.
- **The plan stops being personal.** Dislikes, cooking level, weekday minutes and
  budget are exactly the inputs that make a generated day feel like _theirs_.
  A summer where practice moves from mornings to evenings, or a month of a
  broken microwave, cannot be told to the app.

The only escape today is **Restart the prototype**, which discards everything.

**Why it is cheap.** Nothing new needs designing. `OnboardingQuestion.tsx`
already renders every one of these questions, `OB` in `data.ts` already describes
them, and `saveAccount` already writes all of it. The work is routing a Profile
row back into the question it came from and saving on the way out — the screens
exist, the persistence exists, and the two are not connected.

---

## 2. Every day gets the same calorie target

**The evidence.** `nutrition.ts` folds the whole training week into a single
scalar:

```ts
const days = Object.keys(s.week).filter((k) => s.week[+k][0] !== 'rest' || s.week[+k][2]).length;
const mult = 1.34 + 0.06 * days;
```

One number, for all seven days. A rest day and a game day are handed the
identical calorie and protein target.

**Why it matters.** This is the gap between what the app _knows_ and what it
_says_. It knows each day's exact shape — mode, session time, lift time,
duration — because the athlete entered it and the calendar stores it. It uses
that knowledge everywhere except the number it is actually for: `dayMeals()`
reshapes the slots around training, the Home badge announces "Game day", the week
view colours each day by it, and then the target underneath is the weekly
average. An athlete eating to the number on a rest day is eating a game day's
food; on a game day they are underfed by the same amount.

For an app whose whole proposition is _personalised nutrition for athletes_, this
is the largest remaining distance between the promise and the arithmetic.

**Why it is cheap.** No UI at all. The ring, the targets screen, the day badge
and the week view all already read from `targets()`; making it take the day would
change every one of them at once.

**The caveat, which is not small.** How much a target should move with training
load is a clinical judgement, and it is exactly the kind flagged in
[`PRODUCTION_READINESS.md`](PRODUCTION_READINESS.md) Blocking #1. This should be
built _after_ a Registered Dietitian sets the shape, not before — the engineering
is easy and the numbers are not ours to choose. It belongs on the list of what
to ask them, not on the list of what to ship this week.

---

## 3. The plan never reacts to what has been logged

**The evidence.** `renderVals` computes `eaten` from the day's logs and shows the
gap on the ring. Nothing else reads it. `todaySlots` is resolved from the
training day alone; the meals below the ring are the same meals whatever the ring
says.

**What that looks like.** It is six in the evening. The ring says 900 calories
and 40g of protein still to eat, because practice ran long and lunch was a
sandwich. Home offers the same dinner it would have offered if the day had gone
perfectly. The app has noticed the gap, told the athlete about it, and has no
opinion about how to close it — which is the moment it is most useful and least
present.

**Why it is cheap now, specifically.** `swaps.ts` already ranks meals by distance
to a macro target. It currently takes that target from the meal being replaced;
pointing the same function at _what is left today_ is a change of argument, not a
change of algorithm. The swap sheet, the ring, and "Eat this next" are all built.
The honest version stays inside the same guard rails everything else does —
allergens filtered first, a bounded suggestion rather than a 1,400-calorie
dinner, and silence when nothing sensible fits.

---

## Considered, and not in the top three

- **Onboarding is thirteen questions before anything is shown**, with no way
  back to a previous answer. A real drop-off risk, but shortening it is a design
  question, not a wiring one, and finding #1 removes most of its sting: answers
  become correctable, so getting one wrong stops being permanent.
- **Barcode, photo and custom foods do not exist.** Each is a genuine feature
  with real infrastructure behind it, not a gap to close by rerouting a tap.
  They now say so plainly instead of implying otherwise.
- **No reminders or notifications.** Probably the largest single lever on whether
  anyone logs anything at all — and it needs push infrastructure, a permissions
  story, and a policy about messaging minors. Out of scope for "without
  redesigning the UI", and it belongs after the privacy review.
- **No error tracking.** Already Blocking #5 in the readiness checklist. It
  improves _our_ experience, not the athlete's.
- **The recipe library is 60-odd meals.** Variety runs out faster than a season
  does. That is a content problem, and the USDA ingest is the path to it.

---

## What this pass already changed

For contrast, and so none of the above is read as still-open:

| Was                                                                                                   | Now                                                                          |
| ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Swaps: four authored dinners, `98% match` typed by hand, compared against a hardcoded 750 cal / 45g   | Ranked by macro distance from the meal actually being replaced, for any slot |
| A swap replaced dinner on every day at once                                                           | Filed by date and slot, and stored in the database                           |
| Every day of the week resolved to identical meals                                                     | Deterministic per-day variety; a week is seven different days                |
| The calendar showed one day at a time                                                                 | A week of meals against the week's training                                  |
| Grocery list: fourteen hand-written rows                                                              | Derived from the meals actually planned                                      |
| "Make it faster" / "Use what I have" / "Replan this day" answered with a sentence and changed nothing | All three do the thing, or say why they cannot                               |
| "Make it cheaper" quoted `$4.20`                                                                      | Deleted — recipes carry no cost                                              |
| Log search filtered an empty history and found nothing on day one                                     | Falls through to the allergen-filtered recipe library                        |
