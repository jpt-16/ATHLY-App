import type { DayMode, Sex, TargetInputs, Targets } from './types';
import type { Micronutrient } from './nutrients';

/**
 * Every number ATHLY holds an athlete to, and where it comes from.
 *
 * Each formula below is named, sourced and bounded. The point is not that these
 * are the only defensible choices — it is that a Registered Dietitian reading
 * this file can see exactly what was chosen and change one line. See
 * `docs/NUTRITION.md` for the same material in prose, and
 * `docs/PRODUCTION_READINESS.md` Blocking #1 for what still needs their sign-off.
 *
 * ## 1. The basis weight
 *
 * **Everything is computed from the athlete's *goal* weight, not their current
 * one.** An athlete who wants to be 180 lb is fed like a 180 lb athlete; one who
 * wants to be 150 lb is fed like a 150 lb athlete. Maintaining means the two are
 * the same number and nothing changes.
 *
 * This is the single largest change to the arithmetic, and it has a
 * consequence worth stating plainly: for a weight-loss goal it produces a
 * deficit *before* the pace adjustment is applied, because a smaller body burns
 * less. Applying both without a floor would stack two deficits on a teenager.
 * See §5.
 *
 * ## 2. Resting energy — Mifflin–St Jeor
 *
 *     BMR = 10·kg + 6.25·cm − 5·age + s     s = +5 male, −161 female, −78 unstated
 *
 * The −78 for an unstated sex is the midpoint of the other two, so declining to
 * answer lands between rather than defaulting to either.
 *
 * ## 3. Activity — training days per week
 *
 *     multiplier = 1.34 + 0.06 · trainingDays        (1.34 … 1.76)
 *     maintenance = round(BMR · multiplier, to 10)
 *
 * A day counts if it has a session or a lift. This is a weekly average, and
 * `docs/UX_AUDIT.md` §2 argues it should become per-day — that is a clinical
 * question, deliberately not answered here.
 *
 * ## 4. The goal adjustment
 *
 *     perDay = round(paceLbPerWeek · 3500 / 7, to 25)
 *
 * 3500 kcal per pound is the standard approximation. Losing is capped at about
 * 1% of bodyweight a week and lower under 18; gaining is not capped — see the
 * note on `loseCap`.
 *
 * ## 5. The floor
 *
 *     calories = max(maintenance + adjustment, BMR at *current* weight)
 *
 * The guard §1 requires. Resting metabolism is what the body spends doing
 * nothing; a growing athlete should not be given a target beneath it, and an
 * ambitious goal weight is exactly how that would otherwise happen.
 *
 * ## 6. Protein — from the goal weight, and only from it
 *
 *     gPerLb  = 1.10 · paceFactor   losing
 *             = 1.00 · paceFactor   gaining
 *             = 0.95                maintaining
 *     paceFactor = 1 + (pace − 1) · 0.2
 *     protein = round(goalWeight · gPerLb, to 5)
 *
 * Set against goal weight because protein needs scale with the lean mass an
 * athlete is building or defending, not with fat they are carrying. The manual
 * override is gone: it let an athlete type a number that silently contradicted
 * everything else on the screen.
 *
 * ## 7. Fat, then carbohydrate
 *
 *     fat   = round(0.27 · calories / 9, to 5)
 *     carbs = round((calories − 4·protein − 9·fat) / 4, to 5)
 *
 * Fat at 27% of energy sits inside the 20–35% AMDR. Carbohydrate takes the
 * remainder because for an athlete it is the flexible one.
 *
 * ## 8. Micronutrients — DRIs, by age and sex
 *
 * Fibre and sugar scale with energy; the rest are flat intakes from the Dietary
 * Reference Intakes. See `MICRO_TARGETS`.
 */

// ---------------------------------------------------------------------------
// Micronutrient reference intakes
// ---------------------------------------------------------------------------

/**
 * Dietary Reference Intakes for the ages ATHLY serves.
 *
 * Values are the RDA where one exists, and the Adequate Intake where it does
 * not (potassium, fibre). Sodium is the Chronic Disease Risk Reduction intake —
 * a ceiling to stay under, not a goal to reach, which is why the screens read it
 * differently from the rest.
 *
 * Bands follow the DRI life-stage groups. `na` takes the midpoint of the two,
 * for the same reason Mifflin–St Jeor does.
 */
interface MicroBand {
  potassium: number;
  sodium: number;
  calcium: number;
  iron: number;
  vitaminC: number;
  vitaminD: number;
}

const DRI: Record<'9-13' | '14-18' | '19+', { male: MicroBand; female: MicroBand }> = {
  '9-13': {
    male: { potassium: 2500, sodium: 1800, calcium: 1300, iron: 8, vitaminC: 45, vitaminD: 15 },
    female: { potassium: 2300, sodium: 1800, calcium: 1300, iron: 8, vitaminC: 45, vitaminD: 15 },
  },
  '14-18': {
    male: { potassium: 3000, sodium: 2300, calcium: 1300, iron: 11, vitaminC: 75, vitaminD: 15 },
    // Iron is higher for menstruating athletes, and it is the deficiency most
    // often found in this group.
    female: { potassium: 2300, sodium: 2300, calcium: 1300, iron: 15, vitaminC: 65, vitaminD: 15 },
  },
  '19+': {
    male: { potassium: 3400, sodium: 2300, calcium: 1000, iron: 8, vitaminC: 90, vitaminD: 15 },
    female: { potassium: 2600, sodium: 2300, calcium: 1000, iron: 18, vitaminC: 75, vitaminD: 15 },
  },
};

/** Grams of fibre per 1000 kcal — the DRI's own formulation, not a flat number. */
const FIBER_PER_1000_KCAL = 14;

/**
 * Sugar, and the caveat that comes with it.
 *
 * The 10%-of-energy guidance is about *added* sugar. What the app can measure
 * from an ingredient table is *total* sugar, which counts the fructose in a
 * banana and the lactose in milk — neither of which the guidance is aimed at. So
 * this is a reference line rather than a limit, and the screens say so.
 */
const SUGAR_ENERGY_FRACTION = 0.1;

function bandFor(age: number): '9-13' | '14-18' | '19+' {
  if (age <= 13) return '9-13';
  if (age <= 18) return '14-18';
  return '19+';
}

/** Micronutrient targets for one athlete at one calorie level. */
export function microTargets(age: number, sex: Sex, calories: number): Record<Micronutrient, number> {
  const band = DRI[bandFor(age)];
  const pick = (key: keyof MicroBand) =>
    sex === 'male'
      ? band.male[key]
      : sex === 'female'
        ? band.female[key]
        : Math.round((band.male[key] + band.female[key]) / 2);

  return {
    fiber: Math.round((calories / 1000) * FIBER_PER_1000_KCAL),
    sugar: Math.round((calories * SUGAR_ENERGY_FRACTION) / 4),
    sodium: pick('sodium'),
    potassium: pick('potassium'),
    calcium: pick('calcium'),
    iron: pick('iron'),
    vitaminC: pick('vitaminC'),
    vitaminD: pick('vitaminD'),
  };
}

/** Nutrients an athlete should stay *under* rather than reach. */
export const CEILING_NUTRIENTS: readonly Micronutrient[] = ['sodium', 'sugar'];

// ---------------------------------------------------------------------------
// Targets
// ---------------------------------------------------------------------------

/** Mifflin–St Jeor. Pounds and inches in, kcal out. */
function restingBurn(lb: number, ft: number, inch: number, age: number, sex: Sex): number {
  const kg = lb * 0.4536;
  const cm = (ft * 12 + inch) * 2.54;
  const s = sex === 'male' ? 5 : sex === 'female' ? -161 : -78;
  return Math.round(10 * kg + 6.25 * cm - 5 * age + s);
}

/**
 * Derive every target from a set of answers.
 *
 * Pure, and deliberately so: the goal weight is an argument like any other, so
 * changing it recomputes calories, protein, carbohydrate, fat and all eight
 * micronutrients in one pass, and everything downstream — the plan, the swap
 * ranking, the shopping list — follows from those.
 */
export function computeTargets(s: TargetInputs): Targets {
  const a = s.a;
  const sex: Sex = a.sex || 'na';
  const goal = a.goal || 'gain';
  const young = s.age < 18;

  // §1 — the basis weight.
  const goalLb =
    s.goalLb != null && (goal === 'gain' || goal === 'lose')
      ? s.goalLb
      : goal === 'gain'
        ? s.lb + 15
        : goal === 'lose'
          ? s.lb - 15
          : s.lb;
  const basisLb = goal === 'perform' || goal === 'habits' ? s.lb : goalLb;

  // §2, §3 — resting burn at the basis weight, scaled by the training week.
  const bmr = restingBurn(basisLb, s.ft, s.inch, s.age, sex);
  const days = Object.keys(s.week).filter((k) => s.week[+k][0] !== 'rest' || s.week[+k][2]).length;
  const mult = 1.34 + 0.06 * days;
  const maint = Math.round((bmr * mult) / 10) * 10;

  // §4 — the pace adjustment.
  //
  // Losing is capped. Gaining is not. A deficit that outruns what the body can
  // give up takes muscle with the fat, and the ceiling for that is roughly 1% of
  // bodyweight a week — lower for an athlete still growing, who has less to
  // spare. The matching gain cap was removed by product decision in `3a19e48`,
  // because its real effect was a picker offering five paces and delivering
  // three identical ones. Both are on the list for a dietitian.
  const loseCap = Math.max(0.5, Math.min(young ? 1.5 : 2.5, Math.round(s.lb * 0.01 * 4) / 4));
  const rate = goal === 'lose' ? Math.min(s.rate, loseCap) : s.rate;
  const perDay = Math.round((rate * 3500) / 7 / 25) * 25;
  const adj = goal === 'gain' ? perDay : goal === 'lose' ? -perDay : 0;

  // §5 — the floor, which only ever binds on the way down.
  const floor = restingBurn(s.lb, s.ft, s.inch, s.age, sex);
  const unfloored = maint + adj;
  const cal = Math.max(unfloored, floor);
  const floored = cal > unfloored;

  // §6 — protein, from the goal weight and nothing else.
  const paceFactor = 1 + (rate - 1) * 0.2;
  const gPerLb = goal === 'lose' ? 1.1 * paceFactor : goal === 'gain' ? paceFactor : 0.95;
  const protein = Math.round((goalLb * gPerLb) / 5) * 5;

  // §7 — fat at 27% of energy, carbohydrate taking the remainder.
  const fat = Math.round((cal * 0.27) / 9 / 5) * 5;
  const carbs = Math.round((cal - protein * 4 - fat * 9) / 4 / 5) * 5;

  return {
    bmr,
    maint,
    adj,
    cal,
    floored,
    basisLb,
    protein,
    gPerLb,
    paceFactor,
    fat,
    carbs,
    micros: microTargets(s.age, sex, cal),
    days,
    young,
    goal,
    rate,
    goalLb,
    sex,
  };
}

/**
 * Grams of protein per pound of goal weight, as actually served.
 *
 * Not `Targets.gPerLb`, which is the coefficient *before* protein is rounded to
 * the nearest 5 g. For the default athlete the coefficient is 0.95 but the
 * shipped target is 170 g against a 180 lb goal, which is 0.94 — so a screen
 * quoting the coefficient states a rate that does not divide into the number
 * printed beside it. Every screen naming this rate reads it from here.
 */
export function proteinPerLb(t: Targets): number {
  return t.goalLb > 0 ? t.protein / t.goalLb : 0;
}

/**
 * The meals that make up a day, in the order they are eaten. A lift splits the
 * day differently depending on whether it lands in the morning or afternoon.
 */
export function dayMeals(mode: DayMode, lift: string): string[] {
  const base =
    mode === 'game'
      ? ['breakfast', 'pregame', 'recovery', 'dinner']
      : mode === 'practice'
        ? ['breakfast', 'lunch', 'snack', 'recovery', 'dinner']
        : ['breakfast', 'lunch', 'snack', 'dinner'];
  if (!lift) return base;
  const out = base.slice();
  if (/am$/.test(lift)) {
    out.splice(0, 0, 'prelift');
    out.splice(2, 0, 'postlift');
  } else {
    out.splice(out.indexOf('dinner'), 0, 'preliftPm', 'postliftPm');
  }
  return out;
}
