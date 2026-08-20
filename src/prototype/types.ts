/**
 * State shapes for the ATHLY prototype.
 *
 * These mirror the state the Claude Design prototype carried; giving them names
 * is the one thing added on the way to production, so the screens and the
 * nutrition math can be checked at compile time.
 */

import type { IsoDate } from '../lib/clock';
import type { Micronutrient, Nutrients } from './nutrients';
import type { DayMetrics } from '../data/metricsRepo';

export type Goal = 'gain' | 'perform' | 'lose' | 'habits';
export type Sex = 'male' | 'female' | 'na';
export type Stage = 'onboarding' | 'building' | 'targets' | 'auth' | 'app';

/**
 * Which account screen the `'auth'` stage is showing.
 *
 * `'gate'` is the provider chooser, `'signUp'` / `'signIn'` / `'forgot'` are the
 * email form wearing three different hats, `'setPassword'` is where a reset link
 * lands, and the two notices are the screens that say "now go and read your
 * email".
 */
export type AuthView =
  'gate' | 'signUp' | 'signIn' | 'forgot' | 'setPassword' | 'checkEmail' | 'resetSent' | 'confirmDelete';
export type Tab = 'home' | 'plan' | 'log' | 'recipes' | 'profile' | 'grocery' | 'progress' | 'calendar';
export type DayMode = 'rest' | 'practice' | 'game';

/**
 * The two ways the calendar reads.
 *
 * `month` is the training grid the design shipped: dots for what is on, and one
 * day's detail underneath. `week` shows seven days of meals at once, which is
 * what an athlete shopping or prepping on a Sunday actually needs.
 */
export type CalView = 'week' | 'month';
export type PlanScope = 'meal' | 'day' | 'week';

/** `[mode, sessionTime, liftTime, durationMinutes]` — empty string means "unset". */
export type DaySpec = [DayMode, string, string, string];

/** Day-of-week (0 = Sunday) to that day's training shape. */
export type Week = Record<number, DaySpec>;

/**
 * Where a logged meal came from. Kept because "I tapped the meal the plan gave
 * me" and "I typed something in myself" are different claims about the numbers
 * that follow, and Phase 4 has to be able to tell them apart.
 */
export type LogSource = 'plan' | 'recent' | 'favorite' | 'custom' | 'swap';

/**
 * One thing an athlete ate.
 *
 * The macros are values on the log, not a pointer to a recipe. A log is a record
 * of what happened; when a recipe is edited, or when the USDA pass revises its
 * numbers, last Tuesday must not quietly become a different Tuesday.
 */
export interface MealLog extends Nutrients {
  id: string;
  date: IsoDate;
  /** Timestamp, for ordering within a day and for "this morning" style copy. */
  loggedAt: string;
  source: LogSource;
  /** The recipe it came from, when it came from one. */
  mealId: string | null;
  name: string;
  /**
   * How much of the recipe. The plan portions each day to the athlete's target,
   * so this is rarely 1 — and the macros above are already scaled to it rather
   * than needing to be multiplied by it.
   */
  servings: number;
}

/**
 * Onboarding answers. Questions are addressed by key at runtime (`a[step.key]`),
 * which is why the index signature is here alongside the known fields.
 */
export interface Answers {
  likes: string[];
  dislikes: string[];
  allergies: string[];
  sports: string[];
  name?: string;
  goal?: Goal;
  sex?: Sex;
  cook?: string;
  budget?: string;
  time?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export interface AppState {
  stage: Stage;
  /** Index into the onboarding script; 0 is the intro screen. */
  ob: number;
  a: Answers;
  /** Free-text entry on a chip question, before it is committed. */
  draft: string;
  nameDraft: string;
  age: number;
  ft: number;
  inch: number;
  lb: number;
  goalLb: number | null;
  /** Pounds per week, gained or lost. */
  rate: number;
  /** Day-of-week whose editor is expanded on the schedule question. */
  openDay: number | null;
  week: Week;
  /** Per-date overrides of the weekly pattern, keyed by ISO date. */
  overrides: Record<IsoDate, DaySpec>;
  /** The calendar day being viewed or edited. */
  selDate: IsoDate;
  tab: Tab;
  overlay: 'meal' | 'swap' | 'edit' | null;
  mealId: string;
  toast: string | null;
  genOn: boolean;
  genStep: number;
  genDone: boolean;
  /** Set when the planner's constraints cannot be satisfied together. */
  genErr?: number;
  scope: PlanScope;
  buildStep: number;
  planText: string;
  cal: number;
  pro: number;
  timeSel: string;
  budgetSel: string;
  include: string[];
  deckIdx: number;
  swapPick: string | null;
  swapSet: number;
  logTab: string;
  search: string;
  checked: Record<string, boolean>;
  /**
   * The meal the open swap sheet is replacing. Everything the sheet shows —
   * which alternatives, how far off each one is, the sentence under each card —
   * is derived from this, so opening the sheet without setting it is a bug
   * rather than a default.
   */
  swapFor: string | null;
  /**
   * Committed swaps, keyed `${isoDate}|${slot}`.
   *
   * Was a single `swapCommitted: string | null` that only ever replaced dinner,
   * on every day at once: swapping Tuesday's dinner changed Saturday's too, and
   * breakfast could not be swapped at all.
   */
  swaps: Record<string, string>;
  /** Whether the calendar shows the week's meals or the month's training dots. */
  calView: CalView;
  /**
   * How many times each day has been replanned, keyed by ISO date.
   *
   * Folded into the planner's rotation seed, which is what lets "Replan this
   * day" produce a genuinely different day while the planner stays
   * deterministic everywhere else.
   */
  replans: Record<string, number>;
  cat: number;
  /** Transient note shown when a pick moved an item between lists. */
  note?: string | null;

  // --- account ------------------------------------------------------------
  authView: AuthView;
  authEmail: string;
  authPassword: string;
  /** Message from the last failed attempt, shown on the account screens. */
  authError: string | null;
  /** True while a request is in flight, so the CTA cannot be double-fired. */
  authBusy: boolean;
  /** True while onboarding answers are being read back for a returning athlete. */
  hydrating: boolean;

  // --- food log -----------------------------------------------------------
  /**
   * Everything logged in the loaded window — the last four weeks, including
   * today. One array rather than one per screen: Home totals today's entries,
   * the Log tab reads the most recent, and Progress rolls the window up by week.
   *
   * With no backend configured these live here and nowhere else, which is the
   * same bargain the rest of the app strikes: no account, no persistence.
   */
  logs: MealLog[];
  /** True while that window is being read back. */
  logsLoading: boolean;

  // --- body ---------------------------------------------------------------
  /**
   * Weight, water and sleep for the last twelve weeks, oldest first.
   *
   * Separate from `logs` because they answer a different question. What an
   * athlete ate is a claim about food; what they weigh is a claim about whether
   * the plan is working, and it is the one a teenager checks first.
   */
  metrics: DayMetrics[];
  /** Typed into the weigh-in field, before it is committed. */
  weightDraft: string;
  /** Hours slept, as typed. */
  sleepDraft: string;

  /**
   * The custom-food form, as typed.
   *
   * Strings rather than numbers: an empty field and a zero are different
   * answers, and a half-typed "17" should not briefly become 17 calories.
   */
  foodDraft: { name: string; kcal: string; protein: string; carbs: string; fat: string };

  /**
   * Whether this device shows log reminders.
   *
   * A device preference, not an account one — notifications belong to the phone
   * that shows them, and signing in on a tablet should not start it buzzing. So
   * it lives in local storage rather than in `profiles`, and it is mirrored here
   * only so a toggle re-renders.
   */
  reminders: boolean;

  /**
   * Which Profile row is being edited, by its label, or `null`.
   *
   * The label rather than a key, because the row and the field are the same
   * thing to the athlete and one name for both means they cannot drift apart.
   */
  editing: string | null;
  /** What is typed into the editor, before it is committed. */
  editDraft: string;
  /** Inches, for the one field that is two numbers. */
  editDraft2: string;
  /**
   * The chips chosen in the editor, before Save.
   *
   * A copy rather than the answers themselves, so Cancel actually cancels — a
   * chip list edited in place has already happened by the time anyone reaches
   * the buttons.
   */
  editChips: string[];
}

/** What the app needs to know about who is signed in. */
export interface SessionProps {
  /** The signed-in user's ID, or `null`. Absent entirely with no backend. */
  userId?: string | null;
  /** The signed-in user's email, for the Profile screen. */
  userEmail?: string | null;
  /** True until the session is known; the app holds its first paint. */
  sessionLoading?: boolean;
  /** True when the athlete arrived by following a password-reset link. */
  recovering?: boolean;
  /** Releases the recovery hold once a new password is saved. */
  onRecoveryHandled?: () => void;
  /**
   * A sign-in link that came back from iOS and did not work.
   *
   * Native only. The web equivalent surfaces on the gate itself, because the
   * redirect lands on a page this app rendered; a deep link arrives from
   * outside, so there is nowhere for it to land and no reason for the athlete
   * to know the difference — hence a toast rather than a screen.
   */
  authLinkError?: string | null;
}

/**
 * The part of the state the targets are actually derived from.
 *
 * `computeTargets` used to take the whole `AppState`, which meant anything
 * holding these ten fields — a row loaded back from the database, say — had to
 * be cast into a shape carrying thirty more it does not have. Naming the real
 * input is both honest and less code. `AppState` still satisfies it.
 */
export type TargetInputs = Pick<AppState, 'a' | 'age' | 'ft' | 'inch' | 'lb' | 'goalLb' | 'rate' | 'week'> & {
  /**
   * The day being computed for.
   *
   * Omitted means "a typical week" — the average across the seven, which is what
   * the stored `goals` row and the onboarding summary describe. Anything showing
   * an athlete a number for a particular day passes that day, because a rest day
   * and a game day are not the same day.
   */
  day?: DaySpec;
};

/** Layout variants the prototype exposes; these were the design's A/B knobs. */
export interface AthlyProps extends SessionProps {
  homeLayout?: 'Focus' | 'Dashboard';
  swapMode?: 'Compare three' | 'Card deck';
  plannerInput?: 'Ask in words' | 'Dial it in';
  navPrimary?: 'Center action' | 'Even tabs';
}

/** Everything `computeTargets` derives from a set of answers. */
export interface Targets {
  /** Resting burn at the *basis* weight — see `nutrition.ts` §2. */
  bmr: number;
  maint: number;
  adj: number;
  cal: number;
  /** True when the safety floor raised `cal` above maintenance + adjustment. */
  floored: boolean;
  /** The weight every number here was computed from: goal weight, or current when maintaining. */
  basisLb: number;
  protein: number;
  gPerLb: number;
  paceFactor: number;
  fat: number;
  carbs: number;
  /** The eight micronutrients, from the DRIs for this age and sex. */
  micros: Record<Micronutrient, number>;
  days: number;
  young: boolean;
  goal: Goal;
  rate: number;
  goalLb: number;
  sex: Sex;
}
