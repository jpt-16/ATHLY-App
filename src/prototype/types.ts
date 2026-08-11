/**
 * State shapes for the ATHLY prototype.
 *
 * These mirror the state the Claude Design prototype carried; giving them names
 * is the one thing added on the way to production, so the screens and the
 * nutrition math can be checked at compile time.
 */

export type Goal = 'gain' | 'perform' | 'lose' | 'habits';
export type Sex = 'male' | 'female' | 'na';
export type ProteinMode = 'rec' | 'gpp' | 'custom';
export type Stage = 'onboarding' | 'building' | 'targets' | 'app';
export type Tab = 'home' | 'plan' | 'log' | 'recipes' | 'profile' | 'grocery' | 'progress' | 'calendar';
export type DayMode = 'rest' | 'practice' | 'game';
export type PlanScope = 'meal' | 'day' | 'week';

/** `[mode, sessionTime, liftTime, durationMinutes]` — empty string means "unset". */
export type DaySpec = [DayMode, string, string, string];

/** Day-of-week (0 = Sunday) to that day's training shape. */
export type Week = Record<number, DaySpec>;

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
  pMode: ProteinMode;
  pCustom: number | null;
  /** Day-of-week whose editor is expanded on the schedule question. */
  openDay: number | null;
  week: Week;
  /** Per-date overrides of the weekly pattern, keyed by day of month. */
  overrides: Record<number, DaySpec>;
  selDay: number;
  tab: Tab;
  overlay: 'meal' | 'swap' | null;
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
  added: string[];
  checked: Record<string, boolean>;
  insight: boolean;
  nextEaten: boolean;
  swapCommitted: string | null;
  cat: number;
  /** Transient note shown when a pick moved an item between lists. */
  note?: string | null;
}

/** Layout variants the prototype exposes; these were the design's A/B knobs. */
export interface AthlyProps {
  homeLayout?: 'Focus' | 'Dashboard';
  swapMode?: 'Compare three' | 'Card deck';
  plannerInput?: 'Ask in words' | 'Dial it in';
  navPrimary?: 'Center action' | 'Even tabs';
}

/** Everything `computeTargets` derives from a set of answers. */
export interface Targets {
  bmr: number;
  maint: number;
  adj: number;
  cal: number;
  protein: number;
  recProtein: number;
  gPerLb: number;
  paceFactor: number;
  pMode: ProteinMode;
  fat: number;
  carbs: number;
  days: number;
  young: boolean;
  goal: Goal;
  rate: number;
  goalLb: number;
  sex: Sex;
}
