import type { AppState } from './types';

/**
 * What a Profile row can be changed to, and what it refuses.
 *
 * Every row on the Profile screen used to route to the same place —
 * `toast('editor would open')` — so an athlete who gained ten pounds, changed
 * sport or developed an allergy had one option: delete the account and start
 * again. This is the descriptor those rows are edited through.
 *
 * Kept apart from `AthlyApp` because the rules are worth testing on their own.
 * Age has a floor of 13 and weight has bounds a scale could show, and both are
 * claims the app makes elsewhere — the privacy policy says 13 and over, and the
 * database has check constraints. Three statements of the same rule that can
 * drift apart is exactly the kind of thing this file exists to stop.
 */

export type ProfileFieldKind = 'text' | 'number' | 'height' | 'choice';

export interface ProfileField {
  /** The Profile row's label, which is also how the row finds its field. */
  label: string;
  kind: ProfileFieldKind;
  /** What the sheet says above the input. */
  title: string;
  /** A sentence under it, when the change has consequences worth naming. */
  hint?: string;
  unit?: string;
  min?: number;
  max?: number;
  /** Whole numbers only, or one decimal place. */
  step?: number;
  options?: [string, string][];
}

/**
 * The minimum age ATHLY will accept.
 *
 * The privacy policy says 13 and over; until now nothing in the app enforced
 * it, which made the sentence aspirational. Onboarding asks for an age and this
 * is where changing it is refused, so the two now agree.
 */
export const MIN_AGE = 13;
export const MAX_AGE = 100;

export const PROFILE_FIELDS: ProfileField[] = [
  { label: 'Name', kind: 'text', title: 'What should we call you?' },
  {
    label: 'Age',
    kind: 'number',
    title: 'How old are you?',
    unit: 'years',
    min: MIN_AGE,
    max: MAX_AGE,
    step: 1,
    hint: 'Your age changes your calorie target and the reference intakes behind every micronutrient.',
  },
  { label: 'Height', kind: 'height', title: 'How tall are you?' },
  {
    label: 'Weight',
    kind: 'number',
    title: 'What do you weigh?',
    unit: 'lb',
    min: 40,
    max: 700,
    step: 0.1,
    hint: 'This is the floor your calorie target can never fall below. Logging a weigh-in on Progress updates it too.',
  },
  {
    label: 'Baseline',
    kind: 'choice',
    title: 'Which baseline should we use?',
    hint: 'It changes the resting-burn equation and the iron target. Not answering lands between the two rather than defaulting to either.',
    options: [
      ['male', 'Male'],
      ['female', 'Female'],
      ['na', 'Rather not say'],
    ],
  },
  {
    label: 'Goal weight',
    kind: 'number',
    title: 'What are you aiming for?',
    unit: 'lb',
    min: 40,
    max: 700,
    step: 1,
    hint: 'Everything is calculated from this rather than from what you weigh now — see how the numbers work.',
  },
  {
    label: 'Pace',
    kind: 'choice',
    title: 'How fast?',
    hint: 'Losing is capped at about 1% of bodyweight a week, and lower under 18. Ask for more and you will be eased back.',
    options: [
      ['0.25', '0.25 lb a week'],
      ['0.5', '0.5 lb a week'],
      ['0.75', '0.75 lb a week'],
      ['1', '1 lb a week'],
      ['1.5', '1.5 lb a week'],
      ['2', '2 lb a week'],
    ],
  },
  {
    label: 'Goal',
    kind: 'choice',
    title: 'What are you here for?',
    options: [
      ['gain', 'Gain lean weight'],
      ['lose', 'Lose fat steadily'],
      ['perform', 'Fuel my sport'],
      ['habits', 'Build better habits'],
    ],
  },
  {
    label: 'Cooking level',
    kind: 'choice',
    title: 'How much cooking?',
    options: [
      ['micro', 'Microwave and toaster'],
      ['ok', 'Can follow a recipe'],
      ['good', 'I know my way around'],
    ],
  },
  {
    label: 'Weekday time',
    kind: 'choice',
    title: 'How long on a weekday?',
    options: [
      ['10', '10 minutes'],
      ['20', '20 minutes'],
      ['40', '30–40 minutes'],
      ['prep', 'Sunday prep'],
    ],
  },
  {
    label: 'Budget',
    kind: 'choice',
    title: "What's the budget?",
    options: [
      ['low', 'Under $4 a meal'],
      ['mid', '$4–8 a meal'],
      ['high', 'Any budget'],
    ],
  },
];

export function fieldFor(label: string): ProfileField | undefined {
  return PROFILE_FIELDS.find((f) => f.label === label);
}

/**
 * Check one typed value, and say why not in words an athlete can act on.
 *
 * Returns `null` when it is fine. Deliberately not a boolean: "that isn't a
 * number" and "you have to be at least 13" send someone to different places.
 */
export function invalidReason(field: ProfileField, raw: string): string | null {
  if (field.kind === 'text') {
    return raw.trim().length === 0 ? 'Give us something to call you.' : null;
  }
  if (field.kind === 'choice') {
    return field.options?.some(([v]) => v === raw) ? null : 'Pick one of these.';
  }

  const n = Number(raw);
  if (raw.trim() === '' || !Number.isFinite(n)) return 'That needs to be a number.';
  if (field.label === 'Age' && n < MIN_AGE) {
    // The one bound that is a rule rather than a sanity check.
    return `ATHLY is for athletes ${MIN_AGE} and over.`;
  }
  if (field.min !== undefined && n < field.min) return `That is below ${field.min}${unit(field)}.`;
  if (field.max !== undefined && n > field.max) return `That is above ${field.max}${unit(field)}.`;
  return null;
}

function unit(field: ProfileField): string {
  return field.unit ? ` ${field.unit}` : '';
}

/** Height is two numbers and gets its own check. */
export function invalidHeight(ft: string, inch: string): string | null {
  const f = Number(ft);
  const i = Number(inch);
  if (!Number.isFinite(f) || !Number.isFinite(i)) return 'Feet and inches, both numbers.';
  if (f < 3 || f > 8) return 'That is not a height we can work with.';
  if (i < 0 || i > 11) return 'Inches go from 0 to 11.';
  return null;
}

/** What a field currently reads, as the string its input wants. */
export function currentValue(field: ProfileField, s: AppState): string {
  switch (field.label) {
    case 'Name':
      return s.a.name ?? '';
    case 'Age':
      return String(s.age);
    case 'Weight':
      return String(s.lb);
    case 'Baseline':
      return s.a.sex ?? 'na';
    case 'Goal weight':
      return String(s.goalLb ?? s.lb);
    case 'Pace':
      return String(s.rate);
    case 'Goal':
      return s.a.goal ?? 'gain';
    case 'Cooking level':
      return s.a.cook ?? 'ok';
    case 'Weekday time':
      return s.a.time ?? '20';
    case 'Budget':
      return s.a.budget ?? 'mid';
    default:
      return '';
  }
}
