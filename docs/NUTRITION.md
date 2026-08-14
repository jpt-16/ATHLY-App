# How ATHLY works out the numbers

Every figure the app states about an athlete, the formula behind it, and where
that formula comes from.

This exists because the alternative is a number nobody can argue with. A
Registered Dietitian reading this should be able to disagree with a specific
line and know which one to change — see
[`PRODUCTION_READINESS.md`](PRODUCTION_READINESS.md) Blocking #1, which this
document does not discharge.

**This is general nutrition guidance, not medical advice, and none of it has been
reviewed by a clinician.**

---

## The short version

| Question                           | Answer                                                     |
| ---------------------------------- | ---------------------------------------------------------- |
| What weight is used?               | The **goal** weight — current weight only when maintaining |
| Where do calories come from?       | Mifflin–St Jeor at that weight × activity, ± pace          |
| Where does protein come from?      | Grams per pound of goal weight. Not adjustable             |
| Where do meals' numbers come from? | Summed from an ingredient table, per 100 g                 |
| How does the plan fit the target?  | Each day's recipes are scaled to quarter servings          |

---

## 1. The basis weight

> Requirement 4: _the user's selected goal weight should become the primary input
> for nutrition calculations._

```
basis = goal weight        gaining or losing
      = current weight     maintaining ("Fuel my sport", "Build habits")
```

An athlete who wants to be 180 lb is fed like a 180 lb athlete. One who wants to
be 150 lb is fed like a 150 lb athlete. Maintaining means the two are the same
number and nothing changes.

**The consequence to be aware of.** For a weight-loss goal this produces a
deficit _before_ the pace adjustment, because a smaller body burns less. Applying
both without a guard would stack two deficits on a teenager. See §5.

## 2. Resting energy — Mifflin–St Jeor

```
BMR = 10·kg + 6.25·cm − 5·age + s

s = +5     male
  = −161   female
  = −78    not stated
```

Mifflin–St Jeor is the equation most commonly used for this, and it is validated
against adults. The −78 is the midpoint of the other two, so declining to answer
lands between rather than defaulting to either.

**Worth a dietitian's attention:** it is not validated for 13-year-olds, and it
does not include the energy cost of growth. That is a real gap for this audience.

## 3. Activity

```
trainingDays = days in the week with a session or a lift
multiplier   = 1.34 + 0.06 · trainingDays          → 1.34 … 1.76
maintenance  = round(BMR · multiplier, to 10)
```

This is a weekly average. [`UX_AUDIT.md`](UX_AUDIT.md) §2 argues it should be
per-day — a rest day and a game day currently get the same number from an app
that labels them differently on the same screen. That is a clinical question and
is deliberately still open.

## 4. The goal adjustment

```
perDay = round(pace · 3500 / 7, to 25)
target = maintenance + perDay     gaining
       = maintenance − perDay     losing
       = maintenance              maintaining
```

3500 kcal per pound of body mass is the standard approximation.

**Losing is capped:**

```
loseCap = clamp(round(currentWeight · 0.01, to ¼), 0.5, under 18 ? 1.5 : 2.5)
```

About 1% of bodyweight a week, lower for an athlete still growing. A deficit that
outruns what the body can give up takes muscle with the fat.

**Gaining is not capped.** There was a 1 lb/week ceiling for under-18s; it was
removed by product decision because its real effect was a picker offering five
paces and silently delivering three identical ones. That reasoning is about
interface honesty, not physiology, and it needs review.

## 5. The floor

```
target = max(maintenance + adjustment, BMR at current weight)
```

The guard §1 requires. Resting metabolism is what the body spends doing nothing.
A growing athlete should not be handed a target beneath it, and an ambitious goal
weight is exactly how that would otherwise happen — a 260 lb 15-year-old aiming
for 150 lb at 2.5 lb a week would otherwise be given maintenance for a 150 lb
body _minus_ 1,250 calories.

`Targets.floored` records when this bound, and the targets screen adds a fourth
row — _Held at your floor_ — for the difference. Without it the three rows an
athlete can see would add up to less than the number at the top of the same
screen, which is the app quietly serving a target its own arithmetic disowns.

## 6. Protein

> Requirements 2 and 5: _remove manual protein goal customization; automatically
> calculate protein targets from the selected goal weight._

```
paceFactor = 1 + (pace − 1) · 0.2

gPerLb = 1.10 · paceFactor    losing
       = 1.00 · paceFactor    gaining
       = 0.95                 maintaining

protein = round(goalWeight · gPerLb, to 5)
```

Set against goal weight because protein needs scale with the lean mass an athlete
is building or defending, not with fat they are carrying. Higher while losing,
because protein is what decides whether lost weight comes off fat or muscle.

The three-way picker — Recommended / 1g per lb / Custom — is **gone**. It let an
athlete type a number that silently contradicted every other figure on the
screen, and a target the app cannot explain is not a target.

## 7. Fat, then carbohydrate

```
fat   = round(0.27 · calories / 9, to 5)
carbs = round((calories − 4·protein − 9·fat) / 4, to 5)
```

Fat at 27% of energy sits inside the 20–35% AMDR. Carbohydrate takes the
remainder because for an athlete it is the flexible one — the fuel that moves
with training load rather than a floor to defend.

## 8. Micronutrients

> Requirement 1: _add both macronutrient and micronutrient tracking._

Eight, tracked against the Dietary Reference Intakes for the athlete's age band
and sex. Two scale with energy; the rest are flat intakes.

```
fiber = 14 g per 1000 kcal          the DRI's own formulation, not a flat number
sugar = 10% of energy ÷ 4 kcal/g
```

| Nutrient  | 9–13        | 14–18 M | 14–18 F | 19+ M | 19+ F | Kind    |
| --------- | ----------- | ------- | ------- | ----- | ----- | ------- |
| Sodium    | 1800 mg     | 2300    | 2300    | 2300  | 2300  | ceiling |
| Potassium | 2500 / 2300 | 3000    | 2300    | 3400  | 2600  | AI      |
| Calcium   | 1300 mg     | 1300    | 1300    | 1000  | 1000  | RDA     |
| Iron      | 8 mg        | 11      | **15**  | 8     | 18    | RDA     |
| Vitamin C | 45 mg       | 75      | 65      | 90    | 75    | RDA     |
| Vitamin D | 15 mcg      | 15      | 15      | 15    | 15    | RDA     |

Sodium is the Chronic Disease Risk Reduction intake — a ceiling to stay under,
not a goal to reach — which is why the screens read it differently from the rest.
Where sex is not stated, the midpoint of the two is used, as in §2.

**Two caveats stated in the code as well as here:**

- **Sugar is measured as total, and the guidance is about added sugar.** The
  10%-of-energy line is aimed at added sugar; what an ingredient table can
  measure is total sugar, which counts the fructose in a banana and the lactose
  in milk. It is a reference line, not a limit, and the screen says so.
- **Iron for 14–18 F is 15 mg** against 11 for male athletes the same age. It is
  the deficiency most often found in this group, and it is the main reason the
  app asks about sex at all.

## 9. Where a meal's numbers come from

> Requirement 7: _replace all hardcoded nutrition values with real calculations._

There is an important distinction here. Targets are **calculated**. Food
nutrition is **data** — no formula turns "780 calories" into a milligram of iron,
and any app claiming otherwise is making it up.

So the calculation is the summing, and the data lives one level down:

```
meal nutrition = Σ over ingredients:  per100g × (portion grams ÷ 100)
```

`src/prototype/nutrients.ts` holds all twelve figures per ingredient per 100 g,
plus a stated gram weight for every quantity string the recipes use. **No unit
conversions are inferred** — "1 cup" of oats and "1 cup" of rice are separate
entries because they weigh different amounts.

### What this replaced, and why

Each meal used to carry four hand-written numbers. They were not merely
unsourced, they were internally inconsistent: **only 17 of the 44 meals stated a
calorie count within 2% of `4·protein + 4·carbs + 9·fat`.** Chicken pasta claimed
750 kcal against a breakdown worth 680.

Summed from the ingredients, the recipes turn out to contain considerably more
food than they claimed — 1/3 cup of heavy cream is 269 calories, 16 oz of
chocolate milk is 405:

| Meal                     | Claimed | Actually contains |
| ------------------------ | ------- | ----------------- |
| Chicken pasta            | 750     | 1023              |
| Chocolate milk & granola | 400     | 775               |
| Peanut butter oats       | 620     | 837               |

An athlete eating the recipe and logging the stated figure was under-counting by
200–375 calories a meal.

### Status of the values

**Authored reference values, pending the USDA pass.** Better provenance than what
they replace, not proof. An ingredient is checkable in a way a composed meal is
not — "chicken breast has 31 g of protein per 100 g" is a number anyone can look
up; "the burrito bowl has 52 g" is not. `tools/usda/` produces exactly this shape
and will fill the table in place. See `PRODUCTION_READINESS.md` Blocking #3.

## 10. Fitting the plan to the target

> Requirement 6: _recalculate calories, protein, carbohydrates, fat, meal plans,
> recipes and nutrition recommendations whenever the goal weight changes._

The first four fall out of §1–§7 automatically, because `computeTargets` is a
pure function of the answers and the goal weight is one of them.

Meal plans and recipes did not, and could not: the plan was a list of fixed
recipes handed to everybody. Measured against the ingredient table, a planned
practice day came to about 3,660 calories _for every athlete_ — sometimes 250
over target, sometimes 1,100 under, never on purpose.

```
factor   = clamp(target ÷ what the day's recipes come to, 0.5, 2)
servings = round(factor + accumulated rounding error, to ¼)
```

One proportional factor per day, so the day keeps its shape rather than one meal
absorbing the whole correction. Servings round to quarters because "1¼ recipes"
is an instruction a person can follow. The day is walked in order carrying the
running difference, so rounding error stays bounded by one quarter-serving
instead of accumulating down the list.

**Portions past half or double a recipe are refused.** Beyond that the
instruction stops being sensible — a fifth of a bagel, four helpings of pot
roast — and `PortionedDay.shortfall` reports that this plan cannot reach this
target rather than hiding it. The fix for a clamped day is a different plan, not
a stranger portion.

---

## What a dietitian should look at first

1. **Mifflin–St Jeor on adolescents**, and the absence of any growth allowance
   (§2).
2. **Basing energy on goal rather than current weight** (§1) — the central change
   here, and the one with the most room to be wrong.
3. **Whether the floor is the right floor** (§5). Resting burn at current weight
   is defensible and arbitrary.
4. **The uncapped gain rate** (§4).
5. **One target for all seven days** (§3), which the UX audit also flags.
6. **Whether 27% fat and remainder-carbohydrate suit an in-season athlete** (§7).
