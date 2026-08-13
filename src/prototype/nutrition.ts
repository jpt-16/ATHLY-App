import type { DayMode, TargetInputs, Targets } from './types';

/**
 * Derive an athlete's daily targets from their onboarding answers.
 *
 * Lifted verbatim out of the prototype component so the numbers behind every
 * screen can be exercised on their own — see `nutrition.test.ts`. The shape:
 *
 *   1. Mifflin–St Jeor resting burn from age, height, weight and baseline.
 *   2. An activity multiplier that scales with training days in the week.
 *   3. A goal adjustment derived from the chosen pace. Losing is capped for
 *      safety (about 1% of bodyweight a week, lower again under 18); gaining
 *      is not — see the note on `loseCap` below.
 *   4. Protein set against *goal* weight, then fat at 27% of calories, with
 *      carbohydrate taking the remainder.
 *
 * General nutrition guidance, not medical advice — the same caveat the
 * targets screen puts in front of the athlete.
 */
export function computeTargets(s: TargetInputs): Targets {
  const a = s.a;
  const kg = s.lb * 0.4536;
  const cm = (s.ft * 12 + s.inch) * 2.54;
  const sexAdj = a.sex === 'male' ? 5 : a.sex === 'female' ? -161 : -78;
  const bmr = Math.round(10 * kg + 6.25 * cm - 5 * s.age + sexAdj);
  const days = Object.keys(s.week).filter((k) => s.week[+k][0] !== 'rest' || s.week[+k][2]).length;
  const mult = 1.34 + 0.06 * days;
  const maint = Math.round((bmr * mult) / 10) * 10;
  const goal = a.goal || 'gain';
  const young = s.age < 18;

  let rate = s.rate;

  // Losing is capped. Gaining is not.
  //
  // A deficit that outruns what the body can give up takes muscle with the
  // fat, and the ceiling for that is roughly 1% of bodyweight a week — set
  // lower for an athlete still growing, who has less to spare.
  //
  // Gaining had a matching cap at 1 lb a week for anyone under 18, on the
  // reasoning that a bigger surplus lands more of the gain as fat. It is gone
  // by decision: this app's athletes are training hard enough to spend a
  // surplus, and the cap's real effect was a picker offering five paces while
  // silently delivering three identical ones — a worse failure than the one it
  // was hedging against. Every offered pace now moves the target.
  //
  // Both of these are on the list for a Registered Dietitian to review before
  // launch; neither is a clinical judgement.
  const loseCap = Math.max(0.5, Math.min(young ? 1.5 : 2.5, Math.round(s.lb * 0.01 * 4) / 4));
  if (goal === 'lose') rate = Math.min(rate, loseCap);

  const perDay = Math.round((rate * 3500) / 7 / 25) * 25;
  const adj = goal === 'gain' ? perDay : goal === 'lose' ? -perDay : 0;
  const cal = maint + adj;

  const goalLb =
    s.goalLb != null && (goal === 'gain' || goal === 'lose')
      ? s.goalLb
      : goal === 'gain'
        ? s.lb + 15
        : goal === 'lose'
          ? s.lb - 15
          : s.lb;

  const paceFactor = 1 + (rate - 1) * 0.2;
  const gPerLb = goal === 'lose' ? 1.1 * paceFactor : goal === 'gain' ? paceFactor : 0.95;
  const recProtein = Math.round((goalLb * gPerLb) / 5) * 5;
  const pMode = s.pMode || 'rec';
  const protein =
    pMode === 'gpp' ? goalLb : pMode === 'custom' ? (s.pCustom != null ? s.pCustom : recProtein) : recProtein;
  const fat = Math.round((cal * 0.27) / 9 / 5) * 5;
  const carbs = Math.round((cal - protein * 4 - fat * 9) / 4 / 5) * 5;

  return {
    bmr,
    maint,
    adj,
    cal,
    protein,
    recProtein,
    gPerLb,
    paceFactor,
    pMode,
    fat,
    carbs,
    days,
    young,
    goal,
    rate,
    goalLb,
    sex: a.sex || 'na',
  };
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
