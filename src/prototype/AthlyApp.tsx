import React from 'react';
import type { ChangeEvent, KeyboardEvent } from 'react';

import type { Meal, Tile } from './data';
import {
  CHIPS,
  DAYS,
  GREEN,
  INK,
  LIFT_TIMES,
  LINE,
  MEALS,
  OB,
  RECIPE_SETS,
  SLOT_CANDIDATES,
  RESULTS,
  TILES,
  TIMES,
  field,
  shapes,
} from './data';
import { CEILING_NUTRIENTS, computeTargets, dayMeals, proteinPerLb } from './nutrition';
import { MICRONUTRIENTS, NUTRIENT_LABEL, NUTRIENT_UNIT } from './nutrients';
import { baseNutrition, nutritionOf, portionDay, servingLabel } from './portions';
import { isSafe, minutesAvailable, safeMealIds, selectForSlot } from './filtering';
import type { SlotConstraints } from './filtering';
import { CAL_TOLERANCE, PROTEIN_TOLERANCE, rankSwaps, slotFamilyOf } from './swaps';
import { groceryCount, groceryFor } from './grocery';
import type { SwapOption } from './swaps';
import { ALLERGEN_LABEL } from './foodFacts';
import type { Allergen } from './foodFacts';
import { PrototypeShell } from './PrototypeShell';
import type {
  AppState,
  AthlyProps,
  AuthView,
  CalView,
  DayMode,
  DaySpec,
  LogSource,
  MealLog,
  PlanScope,
  Tab,
  Targets,
} from './types';
import { isAppleEnabled, isBackendConfigured } from '../lib/env';
import { STARTUP_TIMEOUT_MS, withTimeout } from '../lib/withTimeout';
import {
  addDays,
  daysInMonth,
  longDateLabel,
  monthLabel,
  relativeDayLabel,
  shortDateLabel,
  startOfMonth,
  today as rightNow,
  todayIso,
  weekAround,
  weekdayOf,
} from '../lib/clock';
import type { IsoDate } from '../lib/clock';
import {
  EMPTY_TOTALS,
  adherence,
  favoriteItems,
  recentItems,
  totalsFor,
  weeklyCalories,
} from '../data/dailyTotals';
import type { LoggedItem } from '../data/dailyTotals';
import { deleteLog, loadWindow, localLog, logMeal } from '../data/logRepo';
import type { NewLog } from '../data/logRepo';
import {
  deleteAccount,
  sendPasswordReset,
  signInWithEmail,
  signInWithProvider,
  signOut,
  signUpWithEmail,
  updatePassword,
} from '../auth/authActions';
import { loadAccount, saveAccount } from '../data/profileRepo';
import { loadPlan, savePlanReplans, savePlanSwap } from '../data/planRepo';
import type { PersistedState } from '../data/profileRepo';
import { clearOnboarding, readOnboarding, stashOnboarding } from '../data/pendingOnboarding';

/**
 * A tile for a food the app has no recipe for.
 *
 * Hashed from the name rather than picked at random, so a food someone types in
 * looks the same every time they see it. `TILES.blocked` is not in the list: it
 * means "the allergy filter emptied this slot" everywhere else, and reusing it
 * for a hand-entered food would say something untrue.
 */
const FOOD_TILES: Tile[] = [
  TILES.oats,
  TILES.bowl,
  TILES.snack,
  TILES.steak,
  TILES.shake,
  TILES.salmon,
  TILES.taco,
  TILES.wrap,
];

/**
 * A row in the Log tab.
 *
 * `LoggedItem` always has a last-logged entry, because it is rolled up from the
 * log. A library search result has none — the athlete has never eaten it — and
 * the row says its macros instead of a date.
 */
type LogRow = Omit<LoggedItem, 'lastLogged'> & { lastLogged: MealLog | null };

function tileForName(name: string): Tile {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return FOOD_TILES[h % FOOD_TILES.length];
}

/**
 * Copy for each account screen, in one table.
 *
 * Six screens differing only in their words is six screens' worth of markup if
 * the words live in the markup. Here it is one component and a lookup, which is
 * also why they cannot drift apart visually.
 */
const AUTH_COPY: Record<
  AuthView,
  Record<'stepLabel' | 'kicker' | 'title' | 'sub' | 'hint' | 'cta' | 'busy', string>
> = {
  gate: { stepLabel: '', kicker: '', title: '', sub: '', hint: '', cta: '', busy: '' },
  signUp: {
    stepLabel: 'Last',
    kicker: 'Last step · Account',
    title: 'Make it yours.',
    sub: 'An email and a password, and your plan is saved for good.',
    hint: 'We send one email to confirm it is you. At least 8 characters for the password.',
    cta: 'Create my account',
    busy: 'Creating…',
  },
  signIn: {
    stepLabel: '',
    kicker: 'Account',
    title: 'Welcome back.',
    sub: 'Sign in and everything you set up comes with you.',
    hint: 'Signing in on a new device pulls down your targets, schedule and food preferences.',
    cta: 'Sign in',
    busy: 'Signing in…',
  },
  forgot: {
    stepLabel: '',
    kicker: 'Account',
    title: 'Reset your password.',
    sub: 'Tell us the email on the account and we will send a link.',
    hint: 'If there is an account with that address, the link is on its way. It is good for one hour.',
    cta: 'Send the link',
    busy: 'Sending…',
  },
  setPassword: {
    stepLabel: '',
    kicker: 'Account',
    title: 'Choose a new password.',
    sub: 'Pick something you have not used here before.',
    hint: 'At least 8 characters.',
    cta: 'Save it',
    busy: 'Saving…',
  },
  checkEmail: {
    stepLabel: '',
    kicker: 'Account',
    title: 'Check your email.',
    sub: 'We sent a link to confirm your address. Open it and your plan is saved.',
    hint: 'Nothing there? Look in spam. Your answers are safe on this device until you confirm.',
    cta: 'Back to sign in',
    busy: '',
  },
  resetSent: {
    stepLabel: '',
    kicker: 'Account',
    title: 'Link sent.',
    sub: 'If that address has an account, a reset link is in the inbox now.',
    hint: 'The link expires in an hour. You can ask for another one if it does.',
    cta: 'Back to sign in',
    busy: '',
  },
  confirmDelete: {
    stepLabel: '',
    kicker: 'Account',
    title: 'Delete your account?',
    sub: 'Your targets, schedule, food preferences and allergies are removed. This cannot be undone.',
    hint: 'You can make a new account any time, but nothing from this one comes back.',
    cta: 'Delete it',
    busy: 'Deleting…',
  },
};

/** One slot of a day after the allergy filter has had its say. */
interface ResolvedSlot {
  slot: string;
  /** `null` when nothing in the library is safe for this athlete. */
  mealId: string | null;
  /** Allergens responsible, when `mealId` is null. */
  blockedBy: string[];
}

/**
 * The ATHLY prototype, as one stateful component.
 *
 * This is the Claude Design prototype's logic, carried over intact. It keeps
 * the whole walkthrough — onboarding, targets, the app tabs and the overlays —
 * in a single piece of state and derives a flat view model from it on every
 * render (`renderVals`). The screens under `screens/` and `overlays/` are pure
 * functions of that view model, which is what makes the production build render
 * exactly what the prototype did.
 *
 * When the real backend arrives, the seam is `renderVals`: swap the derivations
 * that read `this.state` for ones that read server data, and the screens do not
 * change.
 */

export class AthlyApp extends React.Component<AthlyProps, AppState> {
  state: AppState = {
    stage: 'onboarding',
    ob: 0,
    a: { likes: [], dislikes: [], allergies: [], sports: [] },
    draft: '',
    nameDraft: '',
    age: 17,
    ft: 5,
    inch: 10,
    lb: 165,
    goalLb: null,
    rate: 0.75,
    openDay: null,
    week: {
      0: ['rest', '', '', ''],
      1: ['practice', '4:30 pm', '6:30 am', '90'],
      2: ['practice', '4:30 pm', '', '90'],
      3: ['practice', '4:30 pm', '', '90'],
      4: ['practice', '4:30 pm', '6:30 am', '90'],
      5: ['rest', '', '3:30 pm', ''],
      6: ['game', '11:00 am', '', ''],
    },
    overrides: {},
    selDate: todayIso(),
    tab: 'home',
    overlay: null,
    mealId: 'snack',
    toast: null,
    genOn: false,
    genStep: 0,
    genDone: false,
    scope: 'day',
    buildStep: 0,
    planText: '',
    cal: 700,
    pro: 45,
    timeSel: '20',
    budgetSel: 'mid',
    include: ['Chicken', 'Rice'],
    deckIdx: 0,
    swapPick: null,
    swapSet: 0,
    logTab: 'recent',
    search: '',
    checked: {},
    swapFor: null,
    swaps: {},
    calView: 'week',
    replans: {},
    cat: 0,
    authView: 'gate',
    authEmail: '',
    authPassword: '',
    authError: null,
    authBusy: false,
    // With no backend there is nothing to read back, so the first paint is the
    // final one — the same reasoning as `useSession`, and the reason the pixel
    // baselines are unaffected by any of this.
    hydrating: isBackendConfigured,
    logs: [],
    logsLoading: isBackendConfigured,
  };

  /** Planner "generating…" ticker. */
  private _t: ReturnType<typeof setInterval> | undefined;
  /** Onboarding "building your week" ticker. */
  private _b: ReturnType<typeof setInterval> | undefined;
  /** Auto-dismiss for the toast. */
  private _to: ReturnType<typeof setTimeout> | undefined;

  /**
   * `setState`, typed for the partial-state patches this component writes.
   * Most updates touch several unrelated keys at once, or return one of two
   * different shapes from a single updater, which `setState`'s `Pick<S, K>`
   * signature cannot express.
   */
  private update(patch: Partial<AppState> | ((s: AppState) => Partial<AppState>)): void {
    this.setState(patch as Pick<AppState, keyof AppState>);
  }

  componentDidMount() {
    // Set here, not only at the field, because this component mounts twice in
    // development. React's StrictMode deliberately mounts, unmounts and remounts
    // to surface effects that do not clean up after themselves — and for a class
    // component that means `componentWillUnmount` runs on this same instance,
    // leaving `_alive` false for the whole of the second, real mount. Every
    // `if (!this._alive) return` after an await then fires on a tree that is very
    // much alive, so the account never loads and the splash screen never lifts.
    //
    // It only bites where a guard sits after an await, which is why signing in
    // hung while a signed-out start did not, and why production — no StrictMode
    // — was fine. `_alive` means mounted; this is where that becomes true.
    this._alive = true;
    this.syncSession(null);
  }

  componentDidUpdate(prev: AthlyProps) {
    this.syncSession(prev);
    // A deep link that failed. Reported once, on the change, so a re-render
    // does not repeat it.
    const link = this.props.authLinkError;
    if (link && link !== prev.authLinkError) this.toast(link);
  }

  componentWillUnmount() {
    this._alive = false;
    clearInterval(this._t);
    clearInterval(this._b);
    clearTimeout(this._to);
  }

  /** True while mounted, so an in-flight request cannot set state on a dead tree. */
  private _alive = true;

  // -------------------------------------------------------------------------
  // Account
  // -------------------------------------------------------------------------

  /**
   * React to who is signed in.
   *
   * Called on mount and on every prop change, and deliberately written as a
   * comparison of "who was signed in" against "who is signed in" rather than as
   * a set of event handlers: the session arrives by four different routes — a
   * fresh page load, an OAuth redirect, an email link, a sign-out — and only one
   * of them is a click this component saw.
   */
  private syncSession(prev: AthlyProps | null) {
    if (!isBackendConfigured) return;
    if (this.props.sessionLoading) return;

    const was = prev?.userId ?? null;
    const now = this.props.userId ?? null;

    if (now && now !== was) {
      this.beginSignedIn(now);
      return;
    }
    if (!now && was) {
      this.onSignedOut();
      return;
    }
    // Signed out and staying that way: the session is known, so stop waiting.
    if (!now && this.state.hydrating) this.update({ hydrating: false });
  }

  /**
   * Start `onSignedIn`, and make sure it cannot fail silently.
   *
   * `hydrating` is cleared by `onSignedIn` on every route through it, which
   * means an exception on any of those routes clears it on none of them: the
   * promise rejects into nothing, React never re-renders, and the athlete keeps
   * the splash screen for as long as they are willing to look at it. A floating
   * `void` call is what let that happen, so there are no floating calls to it
   * any more.
   *
   * The recovery is the sign-in gate with the reason on it. They are signed in,
   * so nothing has been lost; the app simply could not finish opening, and that
   * is a sentence worth showing instead of a logo.
   */
  private beginSignedIn(userId: string) {
    this.onSignedIn(userId).catch((error: unknown) => {
      if (!this._alive) return;
      console.error('ATHLY: could not finish signing in.', error);
      this.update({
        stage: 'auth',
        authView: 'gate',
        authBusy: false,
        hydrating: false,
        authError: "You're signed in, but the app couldn't finish opening. Try once more.",
      });
    });
  }

  /**
   * Someone just became signed in.
   *
   * Three ways to arrive: a returning athlete whose answers are in the database,
   * a new one whose answers are parked in local storage from before the redirect,
   * or someone with an account who has not finished onboarding.
   *
   * **The saved account always wins over the parked answers**, and the order of
   * these two reads is the whole reason why. Everyone reaching the gate has just
   * answered thirteen questions, so a stash exists even for someone choosing
   * "already have an account". Writing it first would overwrite a real profile —
   * schedule, preferences, allergies — with whatever was typed on this device, in
   * a way nobody would see happen and nobody could undo. Preferring the saved
   * account risks the opposite and much smaller error: freshly typed answers are
   * discarded, which is visible on the next screen and fixable in Profile. So the
   * database is read first, and the athlete is told which way it went.
   */
  private async onSignedIn(userId: string) {
    const pending = readOnboarding();
    // Whatever brought them here, the typed password has done its job. No reason
    // for it to sit in a React tree for the rest of the session.
    if (this.state.authPassword) this.update({ authPassword: '' });

    let saved: Awaited<ReturnType<typeof loadAccount>> = null;
    // Bounded, because an unanswered read is not an error and would otherwise
    // hold the splash screen open forever — see `withTimeout`.
    let readFailed = false;
    try {
      saved = await withTimeout(loadAccount(), STARTUP_TIMEOUT_MS, 'Reading your account');
    } catch {
      // An unreadable account is treated as no account rather than a dead end,
      // but only where that is safe. `readFailed` marks the difference between
      // "there is nothing saved" and "we could not find out", which matters
      // below: the two look identical here and must not be acted on alike.
      saved = null;
      readFailed = true;
    }
    if (!this._alive) return;

    // The food log and the plan edits are loaded either way and never block the
    // app: an athlete whose history fails to arrive should still see today's
    // plan, with an empty ring, rather than a spinner.
    void this.loadLogs();
    void this.loadPlanEdits();

    if (saved) {
      clearOnboarding();
      this.update({ ...saved, stage: 'app', tab: 'home', hydrating: false, authBusy: false });
      if (pending) this.toast('Signed in — kept the plan already on your account.');
      return;
    }

    if (pending) {
      // The read failed rather than came back empty, so whether this athlete
      // already has a profile is unknown. Writing the stash now is the one
      // mistake this method is built to avoid: it would overwrite a real
      // account — schedule, preferences, allergies — with whatever was typed on
      // this device, invisibly and irreversibly. A retry is the cheaper error.
      if (readFailed) {
        this.update({
          stage: 'auth',
          authView: 'gate',
          authBusy: false,
          hydrating: false,
          authError: "You're signed in, but we couldn't reach your account. Try once more.",
        });
        return;
      }
      try {
        await saveAccount(userId, pending);
        clearOnboarding();
      } catch {
        // The account exists but its answers did not land. Say so rather than
        // dropping them into an app built on defaults, and keep the stash so a
        // retry still has something to send.
        if (!this._alive) return;
        this.update({
          stage: 'auth',
          authView: 'gate',
          authBusy: false,
          hydrating: false,
          authError: "You're signed in, but saving your answers failed. Try once more.",
        });
        return;
      }
      if (!this._alive) return;
      this.update({ ...pending, hydrating: false, authError: null, authBusy: false });
      this.runBuild();
      return;
    }

    // Signed in with nothing saved and nothing parked — an account made but
    // onboarding abandoned.
    this.update({ stage: 'onboarding', ob: 0, hydrating: false, authBusy: false });
  }

  private onSignedOut() {
    this.update({
      stage: 'onboarding',
      ob: 0,
      hydrating: false,
      authView: 'gate',
      authEmail: '',
      authPassword: '',
      authError: null,
      authBusy: false,
      // Somebody else may be about to use this phone. What they ate is not the
      // next person's business.
      logs: [],
      logsLoading: false,
    });
  }

  // -------------------------------------------------------------------------
  // The food log
  // -------------------------------------------------------------------------

  /**
   * Read back the swaps and re-rolls the athlete made.
   *
   * Merged over whatever is already in state rather than replacing it, so a
   * swap made while this request was in flight is not undone by its answer.
   * Failure is silent and leaves the generated plan showing, which is a valid
   * plan — the athlete's edits reappear on the next successful load.
   */
  private async loadPlanEdits() {
    if (!isBackendConfigured) return;
    try {
      const stored = await loadPlan();
      if (!this._alive) return;
      this.update((st) => ({
        swaps: Object.assign({}, stored.swaps, st.swaps),
        replans: Object.assign({}, stored.replans, st.replans),
      }));
    } catch {
      // See above.
    }
  }

  /** Read back the window the Home ring and the Progress tab are drawn from. */
  private async loadLogs() {
    if (!isBackendConfigured) return;
    this.update({ logsLoading: true });
    try {
      const logs = await loadWindow(todayIso());
      if (!this._alive) return;
      this.update({ logs, logsLoading: false });
    } catch {
      // An unreadable log is an empty log rather than a broken screen. The ring
      // shows nothing eaten, which is wrong but visibly so, and the next write
      // reloads the window.
      if (!this._alive) return;
      this.update({ logsLoading: false });
    }
  }

  /**
   * Record something eaten.
   *
   * Optimistic: the entry goes into state immediately so the ring moves under
   * the athlete's thumb, and is reconciled with the stored row when it lands. A
   * failed write is taken back out and said out loud — a log that silently did
   * not save is worse than one that visibly did not, because the athlete plans
   * the rest of their day around the number.
   */
  private async addLog(entry: NewLog, toast: (l: MealLog) => string) {
    const userId = this.props.userId;
    const optimistic = localLog(entry, rightNow());
    this.update((st) => ({ logs: st.logs.concat(optimistic) }));
    this.toast(toast(optimistic));

    if (!isBackendConfigured || !userId) return;
    try {
      const stored = await logMeal(userId, entry);
      if (!this._alive) return;
      this.update((st) => ({ logs: st.logs.map((l) => (l.id === optimistic.id ? stored : l)) }));
    } catch {
      if (!this._alive) return;
      this.update((st) => ({ logs: st.logs.filter((l) => l.id !== optimistic.id) }));
      this.toast("That didn't save — check your connection and log it again.");
    }
  }

  /** Take an entry back out, in both places it lives. */
  private async removeLog(id: string) {
    const gone = this.state.logs.find((l) => l.id === id);
    if (!gone) return;
    this.update((st) => ({ logs: st.logs.filter((l) => l.id !== id) }));
    this.toast(`${gone.name} removed`);

    if (!isBackendConfigured || !this.props.userId) return;
    try {
      await deleteLog(id);
    } catch {
      if (!this._alive) return;
      this.update((st) => ({ logs: st.logs.concat(gone) }));
      this.toast("That didn't delete — try again.");
    }
  }

  /** One log entry from a recipe in the plan. */
  private mealEntry(mealId: string, source: LogSource, servings = 1): NewLog {
    const m = MEALS[mealId];
    // Scaled to what the plan actually asked for. Logging one serving of a meal
    // the plan portioned at 1½ would under-count by half a meal.
    return {
      date: todayIso(),
      source,
      mealId,
      name: m.name,
      servings,
      ...nutritionOf(m, servings),
    };
  }

  /**
   * Run an account request, with the busy flag and error handling around it.
   *
   * Every one of these follows the same shape, and the shape matters: the CTA is
   * disabled while a request is in flight, so a second tap cannot create a
   * second account, and a failure always clears the flag — otherwise a dropped
   * connection leaves a button that never works again.
   */
  private async runAuth(action: () => Promise<{ error: string | null }>, onSuccess?: () => void) {
    if (this.state.authBusy) return;
    this.update({ authBusy: true, authError: null });
    let error: string | null = null;
    try {
      ({ error } = await action());
    } catch {
      error = 'Something went wrong. Try again in a moment.';
    }
    if (!this._alive) return;
    this.update({ authBusy: false, authError: error });
    if (!error) onSuccess?.();
  }

  /** The account's own slice of state, ready for the database. */
  private persistable(): PersistedState {
    const s = this.state;
    return {
      a: s.a,
      age: s.age,
      ft: s.ft,
      inch: s.inch,
      lb: s.lb,
      goalLb: s.goalLb,
      rate: s.rate,
      week: s.week,
      overrides: s.overrides,
    };
  }

  /**
   * Finish onboarding.
   *
   * With no backend, or already signed in, this is what it always was: build the
   * week and go. Otherwise the answers are parked and the account gate opens —
   * the one new step, and it comes after the work rather than before it, so
   * nobody is asked to make an account before they have seen what it is for.
   */
  finishOnboarding = () => {
    if (!isBackendConfigured) {
      this.runBuild();
      return;
    }
    const userId = this.props.userId;
    if (userId) {
      const state = this.persistable();
      void saveAccount(userId, state).catch(() => this.toast("Couldn't save your answers."));
      this.runBuild();
      return;
    }
    stashOnboarding(this.persistable());
    this.update({ stage: 'auth', authView: 'gate', authError: null, authBusy: false });
  };

  /** Where the back arrow goes from each account screen. */
  private authBack = () => {
    const view = this.state.authView;
    if (view === 'gate') {
      this.update({ stage: 'targets', authError: null });
      return;
    }
    if (view === 'signIn' || view === 'signUp') {
      this.update({ authView: 'gate', authError: null, authPassword: '' });
      return;
    }
    if (view === 'forgot') {
      this.update({ authView: 'signIn', authError: null });
      return;
    }
    this.update({ authView: 'gate', authError: null });
  };

  private setAuthView = (authView: AuthView) => this.update({ authView, authError: null });

  private submitAuth = () => {
    const { authView, authEmail, authPassword } = this.state;
    switch (authView) {
      case 'signUp':
        void this.runAuth(
          () => signUpWithEmail(authEmail.trim(), authPassword),
          // No session yet — Supabase sends a confirmation link first, and the
          // answers stay parked until it is followed.
          () => this.update({ authView: 'checkEmail', authPassword: '' }),
        );
        return;
      case 'signIn':
        // Success needs no follow-up here: the session change arrives as a prop
        // and `syncSession` takes it from there.
        void this.runAuth(() => signInWithEmail(authEmail.trim(), authPassword));
        return;
      case 'forgot':
        void this.runAuth(
          () => sendPasswordReset(authEmail.trim()),
          () => this.update({ authView: 'resetSent' }),
        );
        return;
      case 'setPassword':
        void this.runAuth(
          () => updatePassword(authPassword),
          () => this.finishRecovery(),
        );
        return;
      case 'checkEmail':
      case 'resetSent':
        this.update({ authView: 'signIn', authPassword: '' });
        return;
      default:
        this.update({ authView: 'signUp' });
    }
  };

  private finishRecovery = () => {
    this.update({ authPassword: '', authError: null });
    this.props.onRecoveryHandled?.();
    // The session is real, so the ordinary signed-in path can take over from
    // here: load the account if there is one, or start onboarding if not.
    const userId = this.props.userId;
    if (userId) this.beginSignedIn(userId);
  };

  private doSignOut = () => {
    void this.runAuth(() => signOut());
  };

  private doDeleteAccount = () => {
    void this.runAuth(
      () => deleteAccount(),
      () => clearOnboarding(),
    );
  };
  toast(m: string) {
    clearTimeout(this._to);
    this.update({ toast: m });
    this._to = setTimeout(() => this.update({ toast: null }), 2500);
  }
  runBuild = () => {
    this.update({ stage: 'building', buildStep: 0 });
    clearInterval(this._b);
    this._b = setInterval(
      () =>
        this.update((s) =>
          s.buildStep >= 4
            ? (clearInterval(this._b), { stage: 'app', tab: 'home' })
            : { buildStep: s.buildStep + 1 },
        ),
      600,
    );
  };
  runGen = () => {
    if (this.state.budgetSel === 'low' && this.state.pro > 55) {
      this.update({ genErr: 1, genDone: false });
      return;
    }
    this.update({ genErr: 0, genOn: true, genStep: 0, genDone: false });
    clearInterval(this._t);
    this._t = setInterval(
      () =>
        this.update((s) =>
          s.genStep >= 4
            ? (clearInterval(this._t), { genOn: false, genDone: true })
            : { genStep: s.genStep + 1 },
        ),
      500,
    );
  };
  toggle(key: string, val: string) {
    this.update((s) => {
      const a = Object.assign({}, s.a);
      const cur: string[] = a[key] || [];
      a[key] = cur.includes(val) ? cur.filter((x) => x !== val) : cur.concat(val);
      let note: string | null = null;
      if (!cur.includes(val)) {
        const other = key === 'likes' ? 'dislikes' : key === 'dislikes' ? 'likes' : null;
        if (other && (a[other] || []).includes(val)) {
          a[other] = a[other].filter((x) => x !== val);
          note =
            key === 'likes'
              ? `Moved ${val} out of your "won't eat" list.`
              : `Took ${val} off your favorites.`;
        }
      }
      return { a, note };
    });
  }
  stepsList() {
    const g = this.state.a.goal;
    return OB.filter((x) => x.key !== 'target' || g === 'gain' || g === 'lose');
  }
  advance = () => {
    const i = this.state.ob;
    if (i >= this.stepsList().length) {
      this.update({ stage: 'targets' });
      return;
    }
    this.update({ ob: i + 1, draft: '', note: null });
  };
  back = () =>
    this.update((s) =>
      s.stage === 'targets' ? { stage: 'onboarding' } : { ob: Math.max(0, s.ob - 1), note: null },
    );
  pickOne(key: string, v: string) {
    this.update((s) => {
      const next: Partial<AppState> = { a: Object.assign({}, s.a, { [key]: v }) };
      if (key === 'goal') {
        const set = v === 'lose' ? [0.5, 1, 1.5, 2, 2.5] : [0.5, 0.75, 1, 1.25, 1.5];
        if (set.indexOf(s.rate) < 0) next.rate = v === 'lose' ? 1 : 0.75;
      }
      return next;
    });
    setTimeout(this.advance, 220);
  }
  chip(on: boolean, danger: boolean) {
    return `padding:10px 15px;border-radius:99px;border:2px solid ${on ? 'transparent' : 'rgba(17,24,21,.14)'};font-size:13.5px;font-weight:700;letter-spacing:-.01em;transition:all .15s;${on ? (danger ? 'background:#111815;color:#F4F2ED' : `background:${GREEN};color:#fff`) : 'background:#fff;color:#111815'}`;
  }
  small(on: boolean) {
    return `padding:8px 13px;border-radius:99px;border:2px solid ${on ? GREEN : 'rgba(17,24,21,.13)'};font-size:12.5px;font-weight:700;background:${on ? 'rgba(23,160,94,.1)' : '#fff'};color:${on ? '#0E7B47' : INK}`;
  }

  targets(): Targets {
    return computeTargets(this.state);
  }

  /**
   * What a given date looks like: its own override if one was set, otherwise
   * the weekly pattern for that weekday.
   */
  dayType(date: IsoDate): DaySpec {
    const s = this.state;
    if (s.overrides[date]) return s.overrides[date];
    return s.week[weekdayOf(date)];
  }
  setDay(date: IsoDate, mode: DayMode, time?: string) {
    const cur = this.dayType(date);
    this.update((st) => ({
      overrides: Object.assign({}, st.overrides, {
        [date]: [
          mode,
          time !== undefined ? time : mode === 'rest' ? '' : cur[1] || '4:30 pm',
          cur[2] || '',
          cur[3] || '',
        ],
      }),
    }));
  }
  setLift(date: IsoDate, lift: string) {
    const cur = this.dayType(date);
    this.update((st) => ({
      overrides: Object.assign({}, st.overrides, { [date]: [cur[0], cur[1], lift, cur[3] || ''] }),
    }));
  }
  /**
   * The day a plan edit applies to.
   *
   * The calendar edits the day it is showing; everywhere else edits today. This
   * is the difference between "swap Thursday's dinner" and "swap dinner", and
   * the old code could only express the second — and then applied it to all
   * seven days at once.
   */
  private planDate(): IsoDate {
    return this.state.tab === 'calendar' ? this.state.selDate : todayIso();
  }

  /**
   * Record a swap against the day and slot it belongs to.
   *
   * Filed by slot rather than by the meal it replaced, so that re-planning the
   * day still honours the choice: the athlete picked what goes in the dinner
   * position, not what goes next to one particular pasta.
   */
  private commitSwap(mealId: string) {
    const from = this.state.swapFor;
    const slot = from ? slotFamilyOf(from) : null;
    if (!slot || !MEALS[mealId]) {
      this.update({ overlay: null, swapPick: null });
      return;
    }
    const date = this.planDate();
    this.update((st) => ({
      overlay: null,
      swapPick: null,
      swapFor: null,
      swaps: Object.assign({}, st.swaps, { [`${date}|${slot}`]: mealId }),
    }));
    this.toast(`Swapped in ${MEALS[mealId].name}`);
    this.persistSwap(date, slot, mealId);
  }

  /**
   * Send a plan edit to the database, without making the athlete wait for it.
   *
   * The state is already updated when this runs, so the screen has moved. A
   * failure is said out loud rather than swallowed: an athlete who swapped
   * Thursday's dinner and comes back to find the old one needs to know it did
   * not take, and the swap is cheap to redo.
   */
  private persistSwap(date: IsoDate, slot: string, mealId: string) {
    if (!isBackendConfigured || !this.props.userId) return;
    void savePlanSwap(this.props.userId, date, slot, mealId).catch(() => {
      if (this._alive) this.toast("That swap didn't save — try it again.");
    });
  }

  /**
   * Ask the planner for a different answer for one day.
   *
   * The planner is deterministic on purpose — the same day resolves the same way
   * every render, or the plan would move under the athlete's thumb. That left
   * "Replan this day" with nothing to do, so it announced a rebuild and changed
   * nothing. The counter here joins the rotation seed, so each tap is a fresh
   * deal for that day alone while every other day holds still.
   *
   * Swaps the athlete committed by hand survive it. They chose those; a replan
   * is a request for a better suggestion, not for their choices to be discarded.
   */
  private replanDay(date: IsoDate) {
    const kept = Object.keys(this.state.swaps).filter((k) => k.startsWith(`${date}|`)).length;
    const next = (this.state.replans[date] ?? 0) + 1;
    this.update((st) => ({
      replans: Object.assign({}, st.replans, { [date]: next }),
    }));
    if (isBackendConfigured && this.props.userId) {
      // Quietly: a lost re-roll costs the athlete one tap, and the day they get
      // back is still a valid plan. A lost *swap* is a decision, which is why
      // that one speaks up.
      void savePlanReplans(this.props.userId, date, next).catch(() => {});
    }
    this.toast(
      kept
        ? `${shortDateLabel(date)} replanned — your ${kept === 1 ? 'swap' : 'swaps'} kept`
        : `${shortDateLabel(date)} replanned`,
    );
  }

  /**
   * "Make it faster" and "Use what I have", done rather than described.
   *
   * Both used to be a toast. This re-ranks the meal's own slot on the axis the
   * athlete asked about — prep time, or how much of the recipe they already have
   * — subject to the same macro tolerance the swap sheet holds everything else
   * to, so a faster meal is still a meal that hits the day's numbers. If nothing
   * clears that bar the app says so instead of claiming a rebuild.
   */
  private rebuild(goal: 'faster' | 'pantry') {
    const from = this.state.mealId;
    const current = from ? MEALS[from] : null;
    const slot = from ? slotFamilyOf(from) : null;
    if (!current || !slot) return;

    const ranked = rankSwaps(current.id, this.constraints(), 12).filter((o) => o.withinTolerance);
    const inKitchen = (m: Meal) => m.ingredients.filter(([, , have]) => have).length;

    const better =
      goal === 'faster'
        ? ranked.filter((o) => o.dMinutes < 0).sort((a, b) => a.dMinutes - b.dMinutes)[0]
        : ranked
            .filter((o) => inKitchen(o.meal) > inKitchen(current))
            .sort((a, b) => inKitchen(b.meal) - inKitchen(a.meal))[0];

    if (!better) {
      this.toast(
        goal === 'faster'
          ? `Nothing quicker hits the same numbers — ${current.prep} is the fastest that does`
          : 'Nothing else uses more of what you already have',
      );
      return;
    }

    const date = this.planDate();
    this.update((st) => ({
      overlay: null,
      swaps: Object.assign({}, st.swaps, { [`${date}|${slot}`]: better.meal.id }),
    }));
    this.persistSwap(date, slot, better.meal.id);
    this.toast(
      goal === 'faster'
        ? `${better.meal.name} — ${better.meal.prep}, ${-better.dMinutes} min quicker`
        : `${better.meal.name} — uses ${inKitchen(better.meal)} things you already have`,
    );
  }

  /** The athlete's declared constraints, in the shape the filter expects. */
  private constraints(): SlotConstraints {
    const a = this.state.a;
    return {
      allergens: a.allergies || [],
      dislikes: a.dislikes || [],
      maxMinutes: minutesAvailable(a.time),
    };
  }

  /**
   * Turn the slots a day calls for into the meals this athlete may actually be
   * shown. A slot with no safe meal comes back with `mealId: null` rather than
   * silently falling back to something they cannot eat.
   */
  private resolveSlots(slotIds: string[], date: IsoDate): ResolvedSlot[] {
    const c = this.constraints();
    const allergens = c.allergens;
    return slotIds.map((slot) => {
      // A swap the athlete committed for this day and slot wins over whatever
      // the planner would have picked — but it is re-checked against the hard
      // filter every time it is read. Allergies can change after a swap was
      // made, and a stored meal id must not outlive its safety.
      const picked = this.state.swaps[`${date}|${slot}`];
      if (picked && safeMealIds([picked], allergens).length) {
        return { slot, mealId: picked, blockedBy: [] };
      }
      // "Replan this day" bumps a counter per date; folding it into the seed is
      // what makes a second tap produce a second answer.
      const nonce = this.state.replans[date];
      const seed = nonce ? `${date}#${nonce}` : date;
      const result = selectForSlot(SLOT_CANDIDATES[slot] ?? [slot], c, seed);
      return result.meal
        ? { slot, mealId: result.meal.id, blockedBy: [] }
        : { slot, mealId: null, blockedBy: result.blockedBy };
    });
  }

  /** How the app explains an empty slot, in the athlete's own terms. */
  private blockedReason(blockedBy: string[]): string {
    const names = blockedBy.map((b) => ALLERGEN_LABEL[b as Allergen] ?? b);
    if (!names.length) return 'Nothing here fits yet';
    if (names.length === 1) return `Nothing here is ${names[0]}-free yet`;
    return 'Nothing here clears your allergies yet';
  }

  /**
   * A row for a slot the filter emptied.
   *
   * Deliberately the same shape as `row()` so the screens render it without
   * knowing the difference — an absence in the design's own vocabulary rather
   * than a new component. Tapping it explains itself.
   */
  blockedRow(slot: string, blockedBy: string[], size?: number) {
    const px = size || 62;
    const sh = shapes(TILES.blocked, px);
    const label = MEALS[SLOT_CANDIDATES[slot]?.[0]]?.slot ?? '';
    const reason = this.blockedReason(blockedBy);
    return {
      slot: label,
      name: 'No safe option yet',
      macroText: reason,
      open: () => this.toast(`${reason}. Add more favourites, or check your allergies in Profile.`),
      rowStyle:
        'display:flex;align-items:center;gap:14px;padding:14px 4px;width:100%;border-bottom:1px solid rgba(17,24,21,.1);transition:background .15s;opacity:.72',
      tileStyle: sh.tileStyle,
      s1: sh.s1,
      s2: sh.s2,
      s3: sh.s3,
      word: '—',
      fieldStyle: `position:absolute;inset:0;background:${TILES.blocked.bg};display:flex;align-items:flex-end;padding:8px;box-sizing:border-box`,
      wordStyle: `font-size:${px < 55 ? 11 : 12}px;font-weight:900;font-stretch:118%;letter-spacing:-.035em;line-height:.88;color:${TILES.blocked.ink};text-transform:uppercase`,
    };
  }

  /** Render a resolved slot, whichever way it resolved. */
  slotRow(r: ResolvedSlot, size?: number, servings = 1) {
    return r.mealId ? this.row(r.mealId, size, servings) : this.blockedRow(r.slot, r.blockedBy, size);
  }

  /**
   * Portion a day's resolved slots against the athlete's calorie target.
   *
   * The plan was a list of fixed recipes handed to everybody, so it matched the
   * target only by accident. See `portions.ts`.
   */
  private portionedDay(slots: ResolvedSlot[], targetCal: number) {
    const meals = slots.map((r) => (r.mealId ? MEALS[r.mealId] : null)).filter((m): m is Meal => !!m);
    const day = portionDay(meals, targetCal);
    const byId = new Map(day.meals.map((p) => [p.meal.id, p]));
    return { day, servingsFor: (id: string | null) => (id ? (byId.get(id)?.servings ?? 1) : 1) };
  }

  row(id: string, size?: number, servings = 1) {
    const m = MEALS[id];
    const sh = shapes(m.tile, size || 62);
    const fd = field(id, (size || 62) < 55 ? 11 : 12, 8);
    const v = nutritionOf(m, servings);
    return {
      slot: m.slot,
      name: m.name,
      // The serving count only appears when it is not one, so a plain day reads
      // exactly as it always did.
      macroText: `${v.kcal} cal · ${v.protein}g protein · ${m.prep}${servings === 1 ? '' : ` · ${servingLabel(servings)}×`}`,
      open: () => this.update({ overlay: 'meal', mealId: id }),
      rowStyle:
        'display:flex;align-items:center;gap:14px;padding:14px 4px;width:100%;border-bottom:1px solid rgba(17,24,21,.1);transition:background .15s',
      tileStyle: sh.tileStyle,
      s1: sh.s1,
      s2: sh.s2,
      s3: sh.s3,
      word: fd.word,
      fieldStyle: fd.fieldStyle,
      wordStyle: fd.wordStyle,
    };
  }
  /**
   * The numbers under a swap card, measured against the meal it would replace.
   *
   * The deltas used to be `m.kcal - 750` and `m.p - 45` — the outgoing dinner
   * hardcoded, so an athlete swapping a 310-calorie snack was shown how far it
   * sat from a meal that was not on their plan. They now come from `SwapOption`,
   * which computed them against the actual meal.
   *
   * The fourth stat used to be cost, read from an authored `'$6.40'` on the swap
   * list. Recipes carry no cost, so that number could only ever be decoration;
   * it is carbohydrate now, which the meal actually has.
   */
  swapStats(o: SwapOption, full: boolean) {
    const sign = (n: number, unit = '') => (n >= 0 ? '+' : '') + n + unit;
    const tone = (ok: boolean) => `font-size:11px;font-weight:800;color:${ok ? '#0E7B47' : '#B0553C'}`;
    const v = baseNutrition(o.meal);
    const base = [
      {
        label: 'calories',
        value: v.kcal,
        delta: sign(o.dCal),
        deltaStyle: tone(Math.abs(o.dCal) <= CAL_TOLERANCE),
      },
      {
        label: 'protein',
        value: v.protein + 'g',
        delta: sign(o.dProtein, 'g'),
        deltaStyle: tone(Math.abs(o.dProtein) <= PROTEIN_TOLERANCE),
      },
      {
        label: 'time',
        value: o.meal.prep,
        delta: o.dMinutes === 0 ? '' : sign(o.dMinutes, 'm'),
        deltaStyle: o.dMinutes === 0 ? 'display:none' : tone(o.dMinutes <= 0),
      },
    ];
    return full
      ? base.concat([
          {
            label: 'carbs',
            value: v.carbs + 'g',
            delta: sign(o.dCarbs, 'g'),
            deltaStyle: tone(Math.abs(o.dCarbs) <= 15),
          },
        ])
      : base;
  }

  renderVals() {
    const s = this.state,
      a = s.a,
      p = this.props;
    const homeLayout = p.homeLayout ?? 'Focus',
      swapMode = p.swapMode ?? 'Compare three';
    const plannerInput = p.plannerInput ?? 'Ask in words',
      navPrimary = p.navPrimary ?? 'Center action';
    // The hard filter, applied to every list of meals this method builds. A meal
    // blocked on one screen must be blocked on all of them.
    const allergyLabels = a.allergies || [];
    const STEPS = this.stepsList();
    const step = STEPS[s.ob - 1];
    const goalLb = s.goalLb == null ? s.lb + (a.goal === 'lose' ? -15 : 15) : s.goalLb;
    const lbDiff = Math.abs(goalLb - s.lb);
    const name = (a.name || '').trim() || 'there';
    const tg = this.targets();
    // Today, read once. Every date on every screen is derived from this, so a
    // render that straddles midnight is still internally consistent.
    const iso = todayIso();
    // What has actually been eaten today. `1840` used to live here.
    const logsToday = s.logs.filter((l) => l.date === iso);
    const eaten = s.logs.length ? totalsFor(s.logs, iso) : EMPTY_TOTALS;
    const weekBars = weeklyCalories(s.logs, tg.cal, iso, 8);
    const adhere = adherence(s.logs, {
      today: iso,
      window: 7,
      targetCal: tg.cal,
      targetProtein: tg.protein,
      week: s.week,
    });

    const stepRow = (done: boolean, active: boolean, label: string) => ({
      label,
      style: `display:flex;align-items:center;gap:12px;font-size:14.5px;font-weight:600;color:${done ? '#F4F2ED' : active ? 'rgba(244,242,237,.9)' : 'rgba(244,242,237,.32)'};transition:color .3s`,
      dot: done
        ? `width:18px;height:18px;border-radius:50%;background:${GREEN};flex:none`
        : active
          ? 'width:18px;height:18px;border-radius:50%;background:#5BE3A0;flex:none;animation:ffPulse 1s ease infinite'
          : 'width:18px;height:18px;border-radius:50%;border:2px solid rgba(244,242,237,.2);flex:none',
    });

    // chips options, with love/hate exclusion
    let chipOpts: { label: string; pick: () => void; chipStyle: string }[] = [];
    if (step && step.type === 'chips') {
      let pool = step.options;
      if (step.key === 'dislikes') pool = pool.filter((x) => !(a.likes || []).includes(x));
      if (step.key === 'likes') pool = pool.filter((x) => !(a.dislikes || []).includes(x));
      const extra: string[] = (a[step.key] || []).filter((x: string) => pool.indexOf(x) === -1);
      chipOpts = pool.concat(extra).map((label) => ({
        label,
        pick: () => this.toggle(step.key, label),
        chipStyle: this.chip(
          (a[step.key] || []).includes(label),
          step.key === 'dislikes' || step.key === 'allergies',
        ),
      }));
    }

    const listOpts =
      step && step.type === 'list'
        ? step.options.map((o) => ({
            label: o.label,
            hint: o.hint,
            pick: () => this.pickOne(step.key, o.v),
            rowStyle: `display:flex;align-items:center;justify-content:space-between;gap:12px;padding:16px 17px;border:2px solid ${a[step.key] === o.v ? GREEN : 'rgba(17,24,21,.12)'};border-radius:14px;background:${a[step.key] === o.v ? 'rgba(23,160,94,.07)' : '#fff'};width:100%;transition:all .15s`,
            dotStyle: `width:20px;height:20px;border-radius:50%;flex:none;border:2px solid ${a[step.key] === o.v ? GREEN : 'rgba(17,24,21,.2)'};background:${a[step.key] === o.v ? GREEN : 'transparent'};box-shadow:${a[step.key] === o.v ? 'inset 0 0 0 3.5px #fff' : 'none'}`,
          }))
        : [];

    const bodyRows = [
      {
        label: 'Age',
        value: s.age + ' yrs',
        // Floor is 13, not 12: under-13s put the app inside COPPA, which brings
        // verifiable parental consent and a separate data regime with it.
        dec: () => this.update((st) => ({ age: Math.max(13, st.age - 1) })),
        inc: () => this.update((st) => ({ age: Math.min(60, st.age + 1) })),
      },
      {
        label: 'Height',
        value: s.ft + "' " + s.inch + '"',
        dec: () =>
          this.update((st) =>
            st.inch > 0 ? { inch: st.inch - 1 } : { ft: Math.max(4, st.ft - 1), inch: 11 },
          ),
        inc: () =>
          this.update((st) =>
            st.inch < 11 ? { inch: st.inch + 1 } : { ft: Math.min(7, st.ft + 1), inch: 0 },
          ),
      },
      {
        label: 'Weight',
        value: s.lb + ' lb',
        dec: () => this.update((st) => ({ lb: Math.max(70, st.lb - 5) })),
        inc: () => this.update((st) => ({ lb: Math.min(400, st.lb + 5) })),
      },
    ];

    const modeBtn = (cur: DayMode, v: DayMode, label: string, w?: number) => ({
      label,
      style: `flex:1;padding:${w || 9}px 4px;font-size:12px;font-weight:800;background:${cur === v ? (v === 'game' ? '#B4462F' : v === 'practice' ? GREEN : INK) : 'transparent'};color:${cur === v ? '#fff' : '#6E6A60'};transition:all .15s`,
    });

    const weekRows = [1, 2, 3, 4, 5, 6, 0].map((wd) => {
      const [mode, time, lift, dur] = s.week[wd];
      const open = s.openDay === wd;
      const training = mode !== 'rest' || !!lift;
      const setWd = (v: DaySpec) => this.update((st) => ({ week: Object.assign({}, st.week, { [wd]: v }) }));
      const parts: string[] = [];
      if (mode !== 'rest') parts.push((mode === 'game' ? 'Game' : 'Practice') + ' ' + time);
      if (lift) parts.push('Lift ' + lift);
      const chip = (on: boolean, extra?: string) =>
        `padding:8px 12px;border-radius:10px;font-size:12px;font-weight:800;white-space:nowrap;flex:none;border:2px solid ${on ? GREEN : 'rgba(17,24,21,.12)'};background:${on ? 'rgba(23,160,94,.11)' : '#fff'};color:${on ? '#0E7B47' : '#6E6A60'}` +
        (extra || '');
      return {
        day: DAYS[wd],
        open,
        summary: parts.length ? parts.join(' · ') : 'Rest day',
        rowStyle: `background:#fff;border-radius:14px;overflow:hidden;border:2px solid ${open ? INK : 'transparent'};box-shadow:0 1px 2px rgba(17,24,21,.045)`,
        headStyle: 'width:100%;display:flex;align-items:center;gap:12px;padding:13px 14px;text-align:left',
        dayStyle: `width:34px;flex:none;font-size:13px;font-weight:900;font-stretch:113%;color:${training ? INK : '#B5B0A4'}`,
        sumStyle: `flex:1;min-width:0;font-size:12.5px;font-weight:700;color:${training ? '#4A5550' : '#B5B0A4'}`,
        dotStyle: `width:7px;height:7px;border-radius:50%;flex:none;background:${mode === 'game' ? '#D4573A' : mode === 'practice' ? GREEN : lift ? '#8C8779' : 'transparent'}`,
        caretStyle: `flex:none;transition:transform .2s;transform:rotate(${open ? 180 : 0}deg)`,
        toggle: () => this.update({ openDay: open ? null : wd }),
        modes: (
          [
            ['rest', 'Rest'],
            ['practice', 'Practice'],
            ['game', 'Game'],
          ] as [DayMode, string][]
        ).map(([v, l]) =>
          Object.assign(modeBtn(mode, v, l), {
            pick: () => setWd([v, v === 'rest' ? '' : time || '4:30 pm', lift, dur]),
          }),
        ),
        hasTime: mode !== 'rest',
        timeLabel: mode === 'game' ? 'Game starts' : 'Practice starts',
        times: TIMES.map((t) => ({
          label: t,
          pick: () => setWd([mode, t, lift, dur]),
          style: chip(time === t),
        })),
        lift: !!lift,
        liftStyle: `display:flex;align-items:center;justify-content:space-between;width:100%;padding:11px 13px;border-radius:11px;border:2px solid ${lift ? INK : 'rgba(17,24,21,.12)'};background:${lift ? INK : '#fff'};color:${lift ? '#F4F2ED' : INK}`,
        liftState: lift ? 'On' : 'Off',
        liftStateStyle: `font-size:11px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:${lift ? '#5BE3A0' : '#B5B0A4'}`,
        liftToggle: () => setWd([mode, time, lift ? '' : '6:30 am', dur]),
        liftTimes: LIFT_TIMES.map((t) => ({
          label: t,
          pick: () => setWd([mode, time, t, dur]),
          style: chip(lift === t),
        })),
        durOpen: training,
        durs: [
          ['', 'Not set'],
          ['60', '1 hr'],
          ['90', '1.5 hr'],
          ['120', '2 hr'],
        ].map(([v, l]) => ({
          label: l,
          pick: () => setWd([mode, time, lift, v]),
          style: chip((dur || '') === v),
        })),
      };
    });
    const trainCount = Object.keys(s.week).filter((k) => s.week[+k][0] !== 'rest' || s.week[+k][2]).length;
    const liftCount = Object.keys(s.week).filter((k) => s.week[+k][2]).length;

    // calendar — the month `selDate` falls in, not a month the app made up
    const monthStart = startOfMonth(s.selDate);
    const first = weekdayOf(monthStart),
      dim = daysInMonth(s.selDate);
    const cells: { num: number | ''; blank?: number }[] = [];
    for (let i = 0; i < first; i++) cells.push({ num: '', blank: 1 });
    for (let d = 1; d <= dim; d++) cells.push({ num: d });
    const calCells = cells.map((c) => {
      if (c.blank || c.num === '')
        return {
          num: '',
          style: 'height:44px',
          numStyle: 'display:none',
          dot: 'display:none',
          tap: () => {},
        };
      const num = c.num;
      const date = addDays(monthStart, num - 1);
      const [mode, , lift] = this.dayType(date);
      const on = s.selDate === date,
        today = date === iso;
      return {
        num,
        tap: () => this.update({ selDate: date }),
        style: `height:44px;border-radius:11px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;background:${on ? INK : today ? 'rgba(17,24,21,.06)' : 'transparent'};transition:all .15s`,
        numStyle: `font-size:13px;font-weight:${today || on ? 800 : 600};color:${on ? '#F4F2ED' : INK}`,
        dot: `width:${lift && mode === 'rest' ? 9 : 5}px;height:5px;border-radius:3px;background:${mode === 'game' ? '#D4573A' : mode === 'practice' ? (on ? '#5BE3A0' : GREEN) : lift ? (on ? 'rgba(244,242,237,.55)' : '#8C8779') : 'transparent'}`,
      };
    });
    // ── the week view ────────────────────────────────────────────────────
    //
    // The calendar could only ever show one day at a time: a month of dots, and
    // whichever day you tapped underneath it. An athlete planning Thursday's
    // shopping around Wednesday's game had to tap through the week a day at a
    // time and hold it in their head.
    //
    // Every day here is resolved through the same `resolveSlots` the rest of the
    // app uses, so the week shows the plan rather than a summary of it — the
    // training shape, the meals it calls for, and what those meals add up to
    // against the day's target.
    const weekDates = weekAround(s.selDate);
    const weekRangeLabel = `${shortDateLabel(weekDates[0])} — ${shortDateLabel(weekDates[6])}`;
    /** Every meal the week actually calls for, which the shopping list is built from. */
    const weekPlanned: Meal[] = [];
    const weekDays = weekDates.map((date) => {
      const [mode, time, lift] = this.dayType(date);
      const slots = this.resolveSlots(dayMeals(mode, lift), date);
      const planned = slots.map((r) => (r.mealId ? MEALS[r.mealId] : null)).filter((m): m is Meal => !!m);
      weekPlanned.push(...planned);
      // Portioned against the same target Home uses, so the week's totals are
      // the totals of the day the athlete would actually be served.
      const { day: portioned, servingsFor } = this.portionedDay(slots, tg.cal);
      const kcal = portioned.total.kcal;
      const protein = portioned.total.protein;
      const isToday = date === iso;
      const label =
        mode === 'game' ? 'Game day' : mode === 'practice' ? 'Practice' : lift ? 'Lift only' : 'Rest';
      return {
        key: date,
        day: DAYS[weekdayOf(date)],
        num: Number(date.slice(8, 10)),
        isToday,
        todayLabel: isToday ? 'Today' : '',
        // Tapping a day opens it in the month view's day editor, which is where
        // training is changed — the week view reports, it does not duplicate.
        open: () => this.update({ calView: 'month', selDate: date }),
        cardStyle: `width:100%;text-align:left;background:#fff;border-radius:18px;padding:14px 16px 12px;box-shadow:0 1px 2px rgba(17,24,21,.045),0 12px 28px -18px rgba(17,24,21,.28);border:2px solid ${isToday ? INK : 'transparent'}`,
        dayStyle: `font-size:11px;letter-spacing:.12em;text-transform:uppercase;font-weight:800;color:${isToday ? INK : '#8C8779'}`,
        badge: label,
        badgeStyle: `padding:3px 9px;border-radius:99px;font-size:10px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;${mode === 'game' ? 'background:rgba(212,87,58,.14);color:#A03A22' : mode === 'practice' ? 'background:rgba(23,160,94,.12);color:#0E7B47' : 'background:rgba(17,24,21,.07);color:#6E6A60'}`,
        // The training line is the reason this view exists: the meals below it
        // are the ones that shape calls for.
        trainingLine:
          mode === 'rest' && !lift
            ? 'No training'
            : [
                mode === 'game' ? `Game ${time}` : mode === 'practice' ? `Practice ${time}` : '',
                lift ? `lift ${lift}` : '',
              ]
                .filter(Boolean)
                .join(' · '),
        totals: `${kcal.toLocaleString()} cal · ${protein}g protein`,
        // Against the target rather than in isolation, because "2,900 calories"
        // means nothing without the number it is meant to hit.
        totalsStyle: `font-size:11.5px;font-weight:700;color:${Math.abs(kcal - tg.cal) <= 150 ? '#0E7B47' : '#8C8779'}`,
        meals: slots.map((r) => {
          const m = r.mealId ? MEALS[r.mealId] : null;
          return {
            slot: m ? m.slot : this.blockedReason(r.blockedBy),
            name: m ? m.name : 'No safe option yet',
            macroText: m
              ? `${nutritionOf(m, servingsFor(m.id)).kcal} cal · ${nutritionOf(m, servingsFor(m.id)).protein}g`
              : '',
            style: `display:flex;align-items:baseline;gap:8px;padding:5px 0;${m ? '' : 'opacity:.6'}`,
          };
        }),
      };
    });

    // The shopping list is the week above, not a fixed fourteen rows: a swap the
    // athlete made on Wednesday changes what they buy on Sunday.
    const groceryAisles = groceryFor(weekPlanned);

    const [selMode, selTime, selLift, selDur] = this.dayType(s.selDate);
    const selMeals = this.resolveSlots(dayMeals(selMode, selLift), s.selDate);
    const { servingsFor: selServings } = this.portionedDay(selMeals, tg.cal);
    const sel = {
      dateLabel: longDateLabel(s.selDate),
      modes: (
        [
          ['rest', 'Rest day'],
          ['practice', 'Practice'],
          ['game', 'Game'],
        ] as [DayMode, string][]
      ).map(([v, l]) =>
        Object.assign(modeBtn(selMode, v, l, 12), {
          pick: () => {
            this.setDay(s.selDate, v);
            this.toast(
              v === 'rest'
                ? 'Rest day — lighter carbs, same protein'
                : v === 'game'
                  ? 'Rebuilt around a game: pre-game and recovery added'
                  : 'Rebuilt around practice',
            );
          },
        }),
      ),
      hasTime: selMode !== 'rest',
      liftOn: !!selLift,
      liftStyle: `display:flex;align-items:center;justify-content:space-between;width:100%;padding:13px 15px;border-radius:12px;margin-top:12px;border:2px solid ${selLift ? INK : 'rgba(17,24,21,.12)'};background:${selLift ? INK : 'transparent'};color:${selLift ? '#F4F2ED' : INK}`,
      liftLabelStyle: 'display:flex;align-items:center;gap:9px;font-size:13.5px;font-weight:800',
      liftState: selLift ? 'On · ' + selLift : 'Off',
      liftStateStyle: `font-size:11.5px;font-weight:800;letter-spacing:.04em;color:${selLift ? '#5BE3A0' : 'rgba(17,24,21,.4)'}`,
      liftToggle: () => {
        const v = selLift ? '' : '6:30 am';
        this.setLift(s.selDate, v);
        this.toast(v ? 'Lift added — pre-lift carbs and a recovery snack slotted in' : 'Lift removed');
      },
      liftTimes: LIFT_TIMES.map((t) => ({
        label: t,
        pick: () => {
          this.setLift(s.selDate, t);
          this.toast('Lifting snacks moved around ' + t);
        },
        style: this.small(selLift === t) + ';white-space:nowrap;flex:none',
      })),
      timeLabel: selMode === 'game' ? 'First whistle' : 'Practice starts',
      times: TIMES.map((t) => ({
        label: t,
        pick: () => {
          this.setDay(s.selDate, selMode, t);
          this.toast('Meals shifted around ' + t);
        },
        style: this.small(selTime === t) + ';white-space:nowrap;flex:none',
      })),
      mealsCount: selMeals.length + ' meals',
      meals: selMeals.map((r) => this.slotRow(r, 54, selServings(r.mealId))),
      durNote: selDur
        ? (selMode === 'game' ? 'Game' : 'Practice') +
          ' runs about ' +
          (selDur === '60' ? '1 hour' : selDur === '90' ? '1.5 hours' : '2 hours') +
          ', so the recovery meal lands right after.'
        : '',
      hasDur: !!selDur && selMode !== 'rest',
      note:
        (selLift
          ? `Lifting at ${selLift} — fast carbs 40 minutes before, protein and carbs inside 30 minutes after. `
          : '') +
        (selMode === 'game'
          ? `Game at ${selTime}. You get a familiar pre-game meal three hours out and recovery food in the 30 minutes after.`
          : selMode === 'practice'
            ? `Practice at ${selTime}. Carbs stack before it, protein lands after — that's the shape of the day.`
            : 'Rest day. Protein stays where it is, carbs come down a little, and nothing takes longer than 20 minutes.'),
    };

    const todayMode = this.dayType(iso)[0],
      todayTime = this.dayType(iso)[1];
    const todaySlots = this.resolveSlots(dayMeals(todayMode, this.dayType(iso)[2]), iso);
    // Today's plan, portioned to today's target. Every macro Home shows — the
    // hero, the list below it, what "Ate it" logs — comes through this.
    const { servingsFor: todayServings } = this.portionedDay(todaySlots, tg.cal);

    // What is left of today, decided by what has actually been logged.
    //
    // The prototype assumed the first two meals of the day were already eaten
    // and started the list at index 2 — which was fine for a screenshot taken at
    // lunchtime and wrong every other hour. A slot drops off this list when
    // something logged today came from it, so logging lunch first moves lunch
    // out of the way rather than breakfast.
    const eatenIds = new Set(logsToday.map((l) => l.mealId).filter((id): id is string => !!id));
    const remaining = todaySlots.filter((r) => !r.mealId || !eatenIds.has(r.mealId));
    // The hero is the next meal the athlete can actually eat. If the slot the
    // day called for was emptied by an allergy, skip past it rather than lead
    // with a hole; only an entirely blocked day falls through to `null`.
    const heroSlot = remaining.find((r) => r.mealId) ?? todaySlots.find((r) => r.mealId) ?? null;
    const nm = heroSlot?.mealId ? MEALS[heroSlot.mealId] : null;
    const upcoming = remaining.filter((r) => r !== heroSlot);
    const blockedHero = remaining[0] ?? todaySlots[todaySlots.length - 1];
    const nfA = nm ? field(nm.id, 18, 12) : null;
    const nfB = nm ? field(nm.id, 13, 9) : null;
    const heroField = (fs: number, pad: number) =>
      `position:absolute;inset:0;background:${TILES.blocked.bg};display:flex;align-items:flex-end;padding:${pad}px;box-sizing:border-box;font-size:${fs}px`;
    const nextMeal = nm
      ? {
          name: nm.name,
          kcal: nutritionOf(nm, todayServings(nm.id)).kcal,
          protein: nutritionOf(nm, todayServings(nm.id)).protein + 'g protein',
          time: nm.prep,
          word: nfA!.word,
          fieldA: nfA!.fieldStyle,
          wordA: nfA!.wordStyle,
          fieldB: nfB!.fieldStyle,
          wordB: nfB!.wordStyle,
          when: `${nm.slot} · ${nm.timeText}`,
          why: CHIPS[nm.id] || ['Matched to your macros', 'Fits your time', 'Allergy-safe'],
        }
      : {
          name: 'No safe option yet',
          kcal: 0,
          protein: '—',
          time: '—',
          word: '—',
          fieldA: heroField(18, 12),
          wordA: `font-size:18px;font-weight:900;font-stretch:118%;letter-spacing:-.035em;line-height:.88;color:${TILES.blocked.ink};text-transform:uppercase`,
          fieldB: heroField(13, 9),
          wordB: `font-size:13px;font-weight:900;font-stretch:118%;letter-spacing:-.035em;line-height:.88;color:${TILES.blocked.ink};text-transform:uppercase`,
          when: this.blockedReason(blockedHero?.blockedBy ?? []),
          why: ['Check your allergies in Profile', 'Add more favourites'],
        };

    const remainCal = Math.max(0, tg.cal - eaten.kcal),
      remainPro = Math.max(0, tg.protein - eaten.protein);
    const pctCal = tg.cal > 0 ? Math.min(100, Math.round((eaten.kcal / tg.cal) * 100)) : 0;

    const weekStrip = weekAround(iso).map((date) => {
      const [mode, , lift] = this.dayType(date),
        today = date === iso;
      return {
        day: DAYS[weekdayOf(date)][0],
        num: Number(date.slice(8, 10)),
        tap: () => this.update({ tab: 'calendar', selDate: date }),
        style: `flex:1;min-width:44px;display:flex;flex-direction:column;align-items:center;gap:4px;padding:9px 0 8px;border-radius:14px;background:${today ? INK : '#fff'};transition:all .15s`,
        dayStyle: `font-size:9.5px;font-weight:800;letter-spacing:.06em;color:${today ? 'rgba(244,242,237,.55)' : '#A9A498'}`,
        numStyle: `font-size:14px;font-weight:900;letter-spacing:-.02em;color:${today ? '#F4F2ED' : INK}`,
        dot: `width:${lift && mode === 'rest' ? 9 : 5}px;height:5px;border-radius:3px;background:${mode === 'game' ? '#D4573A' : mode === 'practice' ? (today ? '#5BE3A0' : GREEN) : lift ? (today ? 'rgba(244,242,237,.55)' : '#8C8779') : 'transparent'}`,
      };
    });

    // ── swaps ────────────────────────────────────────────────────────────
    //
    // Everything here used to come from `SWAPS`: four hand-written dinners with
    // authored "98% match" strings, ranked against a meal the code assumed was
    // 750 calories and 45g of protein whatever the athlete had actually tapped.
    // It is now computed from the meal being replaced — see `swaps.ts`.
    const swapFor = s.swapFor ?? heroSlot?.mealId ?? null;
    const outgoing = swapFor ? MEALS[swapFor] : null;
    // Ranked once, then split into pages of three so "Show me three more" walks
    // further down the same honest ranking instead of re-showing two of the
    // three it just offered.
    const ranked = outgoing ? rankSwaps(outgoing.id, this.constraints(), 9) : [];
    const pages = Math.max(1, Math.ceil(ranked.length / 3));
    const activeSwaps = ranked.slice((s.swapSet % pages) * 3, (s.swapSet % pages) * 3 + 3);

    const mk = (o: SwapOption, pre: string) =>
      Object.assign(
        {
          name: o.meal.name,
          why: o.why,
          match: `${o.match}% match`,
          stats: this.swapStats(o, pre === 'fq-swap-'),
        },
        field(o.meal.id, pre === 'fq-swap-' ? 30 : 36, pre === 'fq-swap-' ? 16 : 18),
      );
    const swapOptions = activeSwaps.map((o) =>
      Object.assign(mk(o, 'fq-swap-'), {
        pick: () => this.update({ swapPick: o.meal.id }),
        cardStyle: `display:block;width:100%;background:#fff;box-shadow:0 1px 2px rgba(17,24,21,.045),0 12px 28px -18px rgba(17,24,21,.28);border-radius:18px;overflow:hidden;border:2px solid ${s.swapPick === o.meal.id ? GREEN : 'transparent'};box-shadow:${s.swapPick === o.meal.id ? '0 8px 22px rgba(23,160,94,.18)' : '0 1px 3px rgba(17,24,21,.07)'};transition:all .18s`,
        matchStyle:
          'position:absolute;left:12px;top:12px;z-index:2;padding:5px 11px;border-radius:99px;background:rgba(17,24,21,.82);color:#5BE3A0;font-size:10.5px;font-weight:800;pointer-events:none',
        checkStyle:
          s.swapPick === o.meal.id
            ? `width:24px;height:24px;border-radius:50%;background:${GREEN};flex:none;box-shadow:inset 0 0 0 3px #fff, inset 0 0 0 4.5px ${GREEN}`
            : 'width:24px;height:24px;border-radius:50%;border:2px solid rgba(17,24,21,.16);flex:none',
      }),
    );
    const turn = activeSwaps.length ? s.deckIdx % activeSwaps.length : 0;
    const deckOrder = activeSwaps.slice(turn).concat(activeSwaps.slice(0, turn));
    const swapDeckCards = deckOrder
      .slice(0, 3)
      .map((o, n) =>
        Object.assign(mk(o, 'fq-deck-'), {
          cardStyle: `position:absolute;left:${n * 8}px;right:${n * 8}px;top:${n * 14}px;background:#fff;box-shadow:0 1px 2px rgba(17,24,21,.045),0 12px 28px -18px rgba(17,24,21,.28);border-radius:22px;overflow:hidden;box-shadow:0 ${12 - n * 3}px ${30 - n * 8}px rgba(17,24,21,${0.15 - n * 0.04});z-index:${10 - n};transition:all .28s cubic-bezier(.2,.85,.25,1);${n ? 'opacity:.55' : ''}`,
          matchStyle:
            'position:absolute;left:14px;top:14px;z-index:2;padding:5px 11px;border-radius:99px;background:rgba(17,24,21,.82);color:#5BE3A0;font-size:10.5px;font-weight:800;pointer-events:none',
        }),
      )
      .reverse();

    const cChip = (t?: number) =>
      `padding:6px 11px;border-radius:99px;font-size:11.5px;font-weight:700;${t ? 'background:rgba(17,24,21,.08);color:#6E6A60;text-decoration:line-through' : 'background:rgba(23,160,94,.1);color:#0E7B47'}`;
    const constraints: { label: string; style: string }[] = ([] as { l: string; t?: number }[])
      .concat([
        { l: tg.cal.toLocaleString() + ' cal' },
        { l: tg.protein + 'g protein' },
        { l: (a.sports || []).slice(0, 2).join(' + ') || 'No sport' },
        { l: trainCount + ' training days' },
        {
          l:
            a.time === '10'
              ? '10 min'
              : a.time === '40'
                ? '30–40 min'
                : a.time === 'prep'
                  ? 'Sunday prep'
                  : '20 min',
        },
        { l: a.budget === 'low' ? 'Under $4' : a.budget === 'high' ? 'Any budget' : '$4–8 a meal' },
      ])
      .concat(
        (a.dislikes || []).slice(0, 2).map((x: string) => ({ l: x, t: 1 })),
        (a.allergies || [])
          .filter((x: string) => x !== 'None of these')
          .slice(0, 2)
          .map((x: string) => ({ l: x, t: 1 })),
      )
      .map((c) => ({ label: c.l, style: cChip(c.t) }));

    // The Log tab, from the athlete's own entries.
    //
    // These four lines used to be a fixed list ending in "Rice cakes & honey ·
    // Monday", shown to everyone on every Monday and every other day. Recent is
    // what they last logged; Favorites is what they log repeatedly — a fact the
    // app can observe, unlike a rating it never asked for.
    //
    // The search field filters these. It was bound to state and filtered nothing,
    // under a placeholder promising "Search 400,000 foods" — a database that does
    // not exist. It searches what the athlete has actually logged, and says so.
    const logSearch = s.search.trim().toLowerCase();
    // What the athlete has eaten before.
    const history = (
      s.logTab === 'favorites'
        ? favoriteItems(s.logs, 40)
        : s.logTab === 'recent'
          ? recentItems(s.logs, 40)
          : []
    )
      .filter((item) => !logSearch || item.name.toLowerCase().includes(logSearch))
      .slice(0, 8);

    /**
     * …and, when they are searching, anything in the library they could eat.
     *
     * The search box was dead on the first day and stayed dead for anything
     * never logged: it filtered the athlete's own history and nothing else, so a
     * new athlete typing "chicken" into "Search your foods" got an empty screen
     * above an empty list. The only food loggable at all was whatever the plan
     * had already offered.
     *
     * Allergen-filtered, like every other list of meals in the app — a search
     * result is a suggestion, and the hard rule does not care which screen it is
     * on.
     */
    const fromLibrary: LogRow[] =
      logSearch && s.logTab !== 'custom'
        ? Object.values(MEALS)
            .filter((m) => m.name.toLowerCase().includes(logSearch))
            .filter((m) => isSafe(m, allergyLabels))
            .filter((m) => !history.some((h) => h.mealId === m.id))
            .slice(0, Math.max(0, 8 - history.length))
            .map((m) => ({
              name: m.name,
              mealId: m.id,
              ...nutritionOf(m),
              // Never eaten, so there is no last time. The row reads its macros
              // instead of a date.
              lastLogged: null,
              count: 0,
            }))
        : [];
    const logItems: LogRow[] = [...history, ...fromLibrary];
    const nowHour = rightNow().getHours();

    const tabsDef: [Tab, string][] = [
      ['home', 'Home'],
      ['plan', 'Plan'],
      ['log', 'Log'],
      ['recipes', 'Recipes'],
      ['profile', 'Profile'],
    ];
    const marks: Record<string, string> = {
      home: 'width:15px;height:15px;border-radius:4px',
      plan: 'width:15px;height:15px;border-radius:4px;border-width:2px;border-style:solid',
      log: 'width:15px;height:15px;border-radius:50%',
      recipes: 'width:15px;height:4px;border-radius:99px',
      profile: 'width:15px;height:15px;border-radius:50%;border-width:2px;border-style:solid',
    };
    const mkTab = ([id, label]: [Tab, string]) => {
      const on = s.tab === id;
      return {
        label,
        pick: () => this.update({ tab: id, overlay: null }),
        style: 'display:flex;flex-direction:column;align-items:center;gap:6px;padding:9px 0',
        mark: `${marks[id]};background:${id === 'plan' || id === 'profile' ? 'transparent' : on ? '#5BE3A0' : 'rgba(244,242,237,.42)'};border-color:${on ? '#5BE3A0' : 'rgba(244,242,237,.42)'};transition:all .2s`,
        text: `font-size:10px;font-weight:800;color:${on ? '#F4F2ED' : 'rgba(244,242,237,.45)'}`,
      };
    };

    const mm = MEALS[s.mealId] || MEALS.snack;
    // At the portion today's plan asks for, so the recipe sheet and the plan row
    // never disagree about the same meal.
    const mmServings = todayServings(mm.id);
    const mmV = nutritionOf(mm, mmServings);
    const meal = Object.assign(field(mm.id, 46, 22), {
      name: mm.name,
      slot: mm.slot,
      timeText: mm.timeText,
      reasons: mm.reasons,
      macros: [
        ['calories', mmV.kcal],
        ['protein', mmV.protein + 'g'],
        ['carbs', mmV.carbs + 'g'],
        ['fat', mmV.fat + 'g'],
      ].map(([label, value], i) => ({
        label,
        value,
        style: `padding:15px 12px;${i < 3 ? 'border-right:2px solid ' + LINE : ''}`,
      })),
      ingredients: mm.ingredients.map(([n, q, have], i) => ({
        name: n,
        qty: q,
        style: `display:flex;align-items:center;justify-content:space-between;padding:13px 0;${i ? 'border-top:1px solid rgba(17,24,21,.1)' : ''}`,
        haveText: have ? 'have it' : 'need it',
        have: `font-size:10px;letter-spacing:.06em;text-transform:uppercase;font-weight:800;padding:3px 8px;border-radius:99px;${have ? 'color:#0E7B47;background:rgba(23,160,94,.12)' : 'color:#8C8779;background:rgba(17,24,21,.07)'}`,
      })),
      steps: mm.steps.map((t, i) => ({ n: i + 1, text: t })),
    });

    const ctaBase =
      'width:100%;display:flex;align-items:center;justify-content:space-between;padding:17px 20px;font-weight:800;font-size:15.5px;border-radius:14px;transition:all .18s';
    const answered = !step
      ? false
      : step.type === 'text'
        ? !!(s.nameDraft || a.name || '').trim()
        : step.type === 'body' || step.type === 'week' || step.type === 'target'
          ? true
          : step.key === 'dislikes' || step.key === 'allergies'
            ? true
            : step.type === 'list'
              ? !!a[step.key]
              : (a[step.key] || []).length > 0;

    // A password-reset link overrides whatever stage the app would otherwise be
    // in: the link grants a real session, so without this the athlete lands in
    // the app still holding the password they came here to change.
    const recovering = !!this.props.recovering;
    const authView: AuthView = recovering ? 'setPassword' : s.authView;
    const inAuth = recovering || s.stage === 'auth';
    const copy = AUTH_COPY[authView];
    const canSubmit =
      authView === 'signUp' || authView === 'signIn'
        ? s.authEmail.trim().length > 2 && s.authPassword.length > 0
        : authView === 'forgot'
          ? s.authEmail.trim().length > 2
          : authView === 'setPassword'
            ? s.authPassword.length > 0
            : true;

    return {
      // Nothing renders until the session is known. Without this the app shows
      // the intro screen for a frame to someone who is already signed in, then
      // yanks it away — worse than a beat of nothing.
      isHydrating: s.hydrating,
      isOnboarding:
        !inAuth &&
        !s.hydrating &&
        (s.stage === 'onboarding' || s.stage === 'building' || s.stage === 'targets'),
      isApp: !inAuth && !s.hydrating && s.stage === 'app',

      // --- account ---------------------------------------------------------
      isAuth: inAuth && !s.hydrating,
      authIsGate: authView === 'gate',
      authIsForm:
        authView === 'signUp' || authView === 'signIn' || authView === 'forgot' || authView === 'setPassword',
      authIsNotice: authView === 'checkEmail' || authView === 'resetSent',
      // The gate paints its own dark ground edge to edge; the rail belongs to
      // the cream screens behind it.
      authShowBar: authView !== 'gate',
      authStepLabel: copy.stepLabel,
      authGateTitle: authView === 'signIn' ? 'Welcome back.' : 'Save your plan.',
      authGateSub:
        authView === 'signIn'
          ? 'Sign in and your targets, schedule and food preferences come with you.'
          : 'Your targets are ready. Make an account to keep them — and to pick up where you left off on any device.',
      authEmailCta: authView === 'signIn' ? 'Sign in with email' : 'Sign up with email',
      authSwapLabel:
        authView === 'signIn' ? 'New here? Create an account' : 'Already have an account? Sign in',
      authSwapMode: () => this.setAuthView(authView === 'signIn' ? 'gate' : 'signIn'),
      authFootnote: 'Athly keeps your answers to build your plan. Nothing else.',
      authShowApple: isAppleEnabled,
      authKicker: copy.kicker,
      authTitle: copy.title,
      authSub: copy.sub,
      authHint: copy.hint,
      authCta: s.authBusy ? copy.busy : copy.cta,
      authNeedsEmail: authView !== 'setPassword',
      authNeedsPassword: authView !== 'forgot',
      authPasswordAutocomplete:
        authView === 'signUp' || authView === 'setPassword' ? 'new-password' : 'current-password',
      authShowForgot: authView === 'signIn',
      authEmail: s.authEmail,
      authPassword: s.authPassword,
      authError: s.authError,
      authBusy: s.authBusy,
      authSubmitBlocked: s.authBusy || !canSubmit,
      authCtaStyle:
        ctaBase +
        (!s.authBusy && canSubmit
          ? `;background:${GREEN};color:#fff`
          : ';background:rgba(17,24,21,.09);color:#A9A498;cursor:not-allowed'),
      authEmailChange: (e: ChangeEvent<HTMLInputElement>) =>
        this.update({ authEmail: e.target.value, authError: null }),
      authPasswordChange: (e: ChangeEvent<HTMLInputElement>) =>
        this.update({ authPassword: e.target.value, authError: null }),
      authKeyDown: (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !s.authBusy && canSubmit) this.submitAuth();
      },
      authSubmit: this.submitAuth,
      authBack: this.authBack,

      // Deletion, from the Profile screen. Apple requires this to be reachable
      // from inside the app: Profile tab, "Delete account", confirm — three
      // taps, which is their limit.
      showDeleteAccount: !!this.props.userId,
      deleteConfirming: s.authView === 'confirmDelete',
      deleteTitle: AUTH_COPY.confirmDelete.title,
      deleteSub: AUTH_COPY.confirmDelete.sub,
      deleteCta: s.authBusy ? AUTH_COPY.confirmDelete.busy : AUTH_COPY.confirmDelete.cta,
      deleteStart: () => this.update({ authView: 'confirmDelete', authError: null }),
      deleteCancel: () => this.update({ authView: 'gate', authError: null }),
      deleteConfirm: this.doDeleteAccount,
      authForgot: () => this.setAuthView('forgot'),
      authEmailStart: () => this.setAuthView(authView === 'signIn' ? 'signIn' : 'signUp'),
      authGoogle: () =>
        void this.runAuth(() => {
          // Parked before we navigate away, because navigating away is exactly
          // what loses them.
          if (s.stage === 'auth') stashOnboarding(this.persistable());
          return signInWithProvider('google');
        }),
      authApple: () =>
        void this.runAuth(() => {
          if (s.stage === 'auth') stashOnboarding(this.persistable());
          return signInWithProvider('apple');
        }),

      obShowBar: s.stage === 'onboarding' && s.ob > 0,
      ob0: s.stage === 'onboarding' && s.ob === 0,
      obQuestion: s.stage === 'onboarding' && s.ob > 0,
      obBuilding: s.stage === 'building',
      isTargets: s.stage === 'targets',
      obPct: `${(s.ob / STEPS.length) * 100}%`,
      obCount: `${Math.min(s.ob, STEPS.length)}/${STEPS.length}`,
      obKicker: step ? 'Step ' + s.ob + ' · ' + step.tag : '',
      obTitle: step ? step.title : '',
      obSub: step ? step.sub : '',
      obIsText: !!step && step.type === 'text',
      obIsList: !!step && step.type === 'list',
      obIsBody: !!step && step.type === 'body',
      obIsChips: !!step && step.type === 'chips',
      obIsWeek: !!step && step.type === 'week',
      obIsTarget: !!step && step.type === 'target',
      nowWeight: s.lb + ' lb',
      goalWeight: goalLb + ' lb',
      goalUp: () => this.update({ goalLb: goalLb + 5 }),
      goalDown: () => this.update({ goalLb: goalLb - 5 }),
      rateLabel: a.goal === 'lose' ? 'Pounds to lose per week' : 'Pounds to gain per week',
      rateOpts: (a.goal === 'lose' ? [0.5, 1, 1.5, 2, 2.5] : [0.5, 0.75, 1, 1.25, 1.5]).map((v) => ({
        label: v,
        pick: () => this.update({ rate: v }),
        style: `flex:1;padding:12px 0;border-radius:11px;border:2px solid ${s.rate === v ? GREEN : 'rgba(17,24,21,.13)'};font-size:13.5px;font-weight:800;background:${s.rate === v ? 'rgba(23,160,94,.1)' : '#fff'};color:${s.rate === v ? '#0E7B47' : INK}`,
      })),
      paceScope:
        'Pace sets your calories, and nudges the recommended protein — 1 lb a week means 1g of protein per pound of goal weight. You can lock protein to a fixed number on the next screen.',
      paceNote:
        lbDiff === 0
          ? 'Same as where you are now — we\u2019ll hold you steady.'
          : `${lbDiff} lb to ${a.goal === 'lose' ? 'lose' : 'gain'} at ${tg.rate} lb a week is about ${Math.max(1, Math.round(lbDiff / tg.rate))} weeks. That works out to ${a.goal === 'lose' ? '-' : '+'}${Math.round((tg.rate * 3500) / 7 / 25) * 25} calories a day.${
              // Only a deficit gets eased now, so this no longer has to ask
              // which goal it is explaining. The line that used to sit here
              // for gaining — "you picked 1.5, but you are 16" — went with the
              // cap it was apologising for.
              tg.rate < s.rate
                ? ` You picked ${s.rate}, but that\u2019s past the ceiling — about 1% of your bodyweight a week is as fast as you can go without losing muscle with it.${s.age < 18 ? ' Your age factors in too.' : ''}`
                : a.goal === 'lose' && s.rate >= 1.5
                  ? ` That pace is within range for your size — protein stays high so what comes off is fat.`
                  : ''
            }`,
      obOptions: step && step.type === 'list' ? listOpts : chipOpts,
      obHasNote: !!s.note,
      obNote: s.note,
      obDraft: s.draft,
      obDraftHint: step ? step.hint || 'Add your own' : '',
      obDraftChange: (e: ChangeEvent<HTMLInputElement>) => this.update({ draft: e.target.value }),
      obDraftKey: (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && this.state.draft.trim()) {
          this.toggle(step.key, this.state.draft.trim());
          this.update({ draft: '' });
        }
      },
      nameDraft: s.nameDraft,
      nameChange: (e: ChangeEvent<HTMLInputElement>) => this.update({ nameDraft: e.target.value }),
      bodyRows,
      weekRows,
      weekSummary:
        trainCount === 0
          ? 'No training days yet — meals will just follow the clock.'
          : `${trainCount} training days${liftCount ? `, ${liftCount} with a lift` : ''}. Lift days get fast carbs before and a protein-and-carb snack inside 30 minutes after.` +
            ` ` +
            `Practice days get a pre-fuel and a recovery meal; game days get a familiar pre-game meal three hours out.`,
      obBack: this.back,
      obNext: () => {
        if (s.ob === 0) {
          this.update({ ob: 1 });
          return;
        }
        if (step.type === 'text')
          this.update((st) => ({ a: Object.assign({}, st.a, { name: st.nameDraft.trim() }) }));
        this.advance();
      },
      obBlocked: !answered,
      obCta: !answered
        ? step && step.type === 'text'
          ? 'Type your name'
          : step && step.type === 'chips'
            ? 'Pick at least one'
            : 'Choose an option'
        : s.ob === STEPS.length
          ? 'See my numbers'
          : (step.key === 'dislikes' || step.key === 'allergies') && !(a[step.key] || []).length
            ? 'Nothing to avoid'
            : 'Next',
      obCtaStyle:
        ctaBase +
        (answered
          ? `;background:${GREEN};color:#fff`
          : ';background:rgba(17,24,21,.09);color:#A9A498;cursor:not-allowed'),
      buildTitle: `Building your week, ${name}`,
      buildSteps: [
        'Reading your favorites',
        'Blocking your allergies',
        'Fitting meals to practice',
        'Balancing the week',
        'Writing your grocery list',
      ].map((l, i) => stepRow(s.buildStep > i, s.buildStep === i, l)),

      targets: {
        mode:
          tg.goal === 'gain'
            ? 'Surplus'
            : tg.goal === 'lose'
              ? tg.rate >= 1.5
                ? 'Aggressive deficit'
                : tg.rate >= 1
                  ? 'Steady deficit'
                  : 'Gentle deficit'
              : 'Maintenance',
        headline:
          tg.goal === 'gain'
            ? `Here's your surplus, ${name}`
            : tg.goal === 'lose'
              ? tg.rate >= 1.5
                ? `Time to move fast, ${name}`
                : `A steady deficit, ${name}`
              : `Your maintenance, ${name}`,
        sub:
          tg.goal === 'gain'
            ? 'Enough over maintenance to add lean weight without feeling stuffed.'
            : tg.goal === 'lose'
              ? tg.rate >= 1.5
                ? `${tg.rate} lb a week is a real deficit, and at ${s.lb} lb your body can carry it. Protein stays high so what you lose is fat.`
                : 'Small enough that training quality holds up.'
              : 'Enough to hold your weight and train hard.',
        calText: tg.cal.toLocaleString(),
        math: [
          {
            label: 'Resting burn',
            // The weight named here has to be the weight the number was
            // computed from — `tg.basisLb`, which is the goal weight unless the
            // athlete is maintaining. Reading `s.lb` here stated the current
            // weight beside a figure derived from a different one, which is
            // exactly the kind of quiet contradiction this pass set out to end.
            note: `${tg.sex === 'male' ? 'Male' : tg.sex === 'female' ? 'Female' : 'Averaged'} baseline · ${s.age} yrs, ${s.ft}'${s.inch}", ${tg.basisLb === s.lb ? `${s.lb} lb` : `at your ${tg.basisLb} lb goal weight`}`,
            value: tg.bmr.toLocaleString(),
            accent: false,
          },
          {
            label: 'Training on top',
            note: `${tg.days} training days a week`,
            value: '+' + (tg.maint - tg.bmr).toLocaleString(),
            accent: false,
          },
          {
            label: tg.adj === 0 ? 'Goal adjustment' : tg.adj > 0 ? 'Surplus for growth' : 'Deficit',
            note:
              tg.adj === 0
                ? 'Holding steady'
                : tg.rate + ' lb a week' + (tg.rate < s.rate ? ' — eased from ' + s.rate : ''),
            value: (tg.adj > 0 ? '+' : '') + tg.adj,
            accent: tg.adj !== 0,
          },
          // The floor, shown only when it bound. Without this row the three
          // above add up to less than the number at the top of the screen — the
          // app would be serving a calorie target its own arithmetic disowns.
          // `nutrition.ts` §5: an ambitious goal weight can otherwise put a
          // growing athlete under what their body spends doing nothing.
          ...(tg.floored
            ? [
                {
                  label: 'Held at your floor',
                  note: `Never below what you burn at rest at ${s.lb} lb`,
                  value: '+' + (tg.cal - (tg.maint + tg.adj)).toLocaleString(),
                  accent: true,
                },
              ]
            : []),
        ].map((m, i) => ({
          label: m.label,
          note: m.note,
          value: m.value,
          style: `display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 16px;${i ? 'border-top:1px solid rgba(244,242,237,.1)' : ''}`,
          valueStyle: `font-size:17px;font-weight:900;letter-spacing:-.02em;color:${m.accent ? '#5BE3A0' : '#F4F2ED'}`,
        })),
        macros: [
          { label: 'protein', value: tg.protein + 'g' },
          { label: 'carbs', value: tg.carbs + 'g' },
          { label: 'fat', value: tg.fat + 'g' },
        ],
        // Protein is derived and no longer chooseable. The three-option picker
        // and its custom stepper are gone: they let an athlete type a number
        // that silently contradicted every other figure on the screen, and the
        // brief for this pass was that the goal weight decides it.
        proteinBasis: `${proteinPerLb(tg).toFixed(2)}g per pound of your ${tg.goalLb} lb goal weight — ${tg.goal === 'lose' ? 'higher while losing, to keep the weight you lose off the fat' : tg.goal === 'gain' ? 'set against the weight you are building toward, not the one you have' : 'enough to hold what you have'}. ${tg.rate === 1 || tg.goal === 'perform' || tg.goal === 'habits' ? 'Change your goal weight and this changes with it.' : `A pace of ${tg.rate} lb a week ${tg.rate > 1 ? 'raises' : 'lowers'} it slightly; change your goal weight and it moves too.`}`,
        // Every micronutrient, against the reference intake for this age and
        // sex. `ceiling` marks the two an athlete stays under rather than
        // reaches, which is the difference between sodium and calcium.
        micros: MICRONUTRIENTS.map((key) => ({
          key,
          label: NUTRIENT_LABEL[key],
          value: `${tg.micros[key]}${NUTRIENT_UNIT[key]}`,
          ceiling: CEILING_NUTRIENTS.includes(key),
          note: key === 'sugar' ? 'total, including fruit and milk' : key === 'sodium' ? 'stay under' : '',
        })),
        tuning:
          tg.sex === 'female'
            ? 'Female baseline runs lower for the same height and weight, so your calories sit below a male athlete your size. Iron-rich meals — red meat, beans, dark greens — get priority, and we keep fueling steady rather than skipping meals.'
            : tg.sex === 'male'
              ? 'Male baseline runs higher for the same height and weight. Protein gets spread across four or five feeds a day rather than stacked into dinner.'
              : 'Without a baseline we average the two, so treat this number as a starting point and adjust after a couple of weeks.',
        disclaimer:
          tg.goal === 'lose' && tg.rate >= 1
            ? `Athly caps fat loss at about 1% of your bodyweight a week — ${tg.rate} lb for you — and holds protein at ${tg.protein}g so the weight you lose is fat.${tg.young ? ' Under 18, that ceiling is lower than it would be for an adult.' : ''} Worth running past a doctor or dietitian; this is general guidance, not medical advice.`
            : tg.young
              ? 'You\u2019re under 18, so Athly keeps things on the side of fueling, recovery and growth. No aggressive cuts. This is general guidance, not medical advice.'
              : 'General nutrition guidance to help you fuel and recover. Not medical advice.',
      },
      startBuild: this.finishOnboarding,

      name: a.name || 'Athlete',
      initial: (a.name || 'A').trim().charAt(0).toUpperCase(),
      profileLine: `${(a.sports || []).slice(0, 2).join(', ') || 'No sport'} · ${tg.goal === 'gain' ? 'gaining lean weight' : tg.goal === 'lose' ? (tg.rate >= 1.5 ? 'cutting fat' : 'losing steadily') : 'fueling training'}`,
      todayLine: `Hey ${name} · ${todayMode === 'game' ? 'Game ' + todayTime : todayMode === 'practice' ? 'Practice ' + todayTime : 'Rest day'}`,
      weekStrip,
      isHome: s.tab === 'home',
      isPlan: s.tab === 'plan',
      isLog: s.tab === 'log',
      isRecipes: s.tab === 'recipes',
      isProfile: s.tab === 'profile',
      isGrocery: s.tab === 'grocery',
      isProgress: s.tab === 'progress',
      isCalendar: s.tab === 'calendar',
      goHome: () => this.update({ tab: 'home' }),
      goPlan: () => this.update({ tab: 'plan' }),
      goLog: () => this.update({ tab: 'log' }),
      goProfile: () => this.update({ tab: 'profile' }),
      goGrocery: () => this.update({ tab: 'grocery' }),
      goProgress: () => this.update({ tab: 'progress' }),
      goCalendar: () => this.update({ tab: 'calendar' }),
      restart: () =>
        this.update({
          stage: 'onboarding',
          ob: 0,
          a: { likes: [], dislikes: [], allergies: [], sports: [] },
          nameDraft: '',
          tab: 'home',
          overlay: null,
          genDone: false,
          swapFor: null,
          swaps: {},
          calView: 'week',
          replans: {},
          overrides: {},
          selDate: iso,
          // Local-only restart. With an account the rows stay in the database —
          // "restart the prototype" is a demo control, not account deletion,
          // which lives in Profile and says so.
          logs: isBackendConfigured ? s.logs : [],
        }),
      noop: () => this.toast('Kitchen inventory lives in Profile'),

      homeFocus: homeLayout === 'Focus',
      homeDash: homeLayout === 'Dashboard',
      nextMeal,
      ringStyle: `width:98px;height:98px;border-radius:50%;flex:none;background:conic-gradient(${GREEN} 0 ${pctCal * 3.6}deg, rgba(17,24,21,.09) ${pctCal * 3.6}deg 360deg);display:flex;align-items:center;justify-content:center`,
      remain: {
        cal: remainCal.toLocaleString(),
        pro: remainPro,
        pct: pctCal + '%',
        calBar: `width:${pctCal}%;height:100%;background:#111815;border-radius:99px`,
        proBar: `width:${tg.protein > 0 ? Math.min(100, Math.round((eaten.protein / tg.protein) * 100)) : 0}%;height:100%;background:${GREEN};border-radius:99px`,
      },
      macroBars: (
        [
          ['Protein', 'Pro', eaten.protein, tg.protein, GREEN],
          ['Carbs', 'Carb', eaten.carbs, tg.carbs, '#111815'],
          ['Fat', 'Fat', eaten.fat, tg.fat, '#C08B4A'],
        ] as [string, string, number, number, string][]
      ).map(([name, short, had, goal2, col]) => ({
        name,
        short,
        text: `${had}/${goal2}g`,
        fill: `width:${goal2 > 0 ? Math.min(100, (had / goal2) * 100) : 0}%;height:100%;background:${col};border-radius:99px`,
      })),
      eatNext: () => {
        if (!nm) return;
        const left = Math.max(0, tg.protein - eaten.protein - nutritionOf(nm, todayServings(nm.id)).protein);
        void this.addLog(this.mealEntry(nm.id, 'plan'), () =>
          left ? `${nm.name} logged — ${left}g protein to go` : `${nm.name} logged — protein target hit`,
        );
      },
      openNext: () => {
        if (!nm) {
          this.toast(this.blockedReason(blockedHero?.blockedBy ?? []));
          return;
        }
        this.update({ overlay: 'meal', mealId: nm.id });
      },
      // The hero's own meal is what the sheet will offer alternatives to. It
      // used to open on whatever `SWAPS` listed, which meant tapping "swap" on
      // breakfast offered three dinners.
      openSwap: () => this.update({ overlay: 'swap', deckIdx: 0, swapPick: null, swapFor: nm?.id ?? null }),
      // Committed swaps are applied in `resolveSlots` now, for every slot and
      // every day, so this is just the resolved plan.
      todayMeals: upcoming.map((r) => this.slotRow(r, undefined, todayServings(r.mealId))),
      dayShape: todayMode === 'game' ? 'Game day' : todayMode === 'practice' ? 'Hard day' : 'Rest day',
      trainingBadge: todayMode === 'game' ? 'Game day' : todayMode === 'practice' ? 'Hard day' : 'Rest day',
      trainingBadgeStyle: `padding:3px 10px;border-radius:99px;font-size:10.5px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;${todayMode === 'game' ? 'background:rgba(212,87,58,.14);color:#A03A22' : todayMode === 'practice' ? 'background:rgba(23,160,94,.12);color:#0E7B47' : 'background:rgba(17,24,21,.07);color:#6E6A60'}`,
      trainingRail: (todayMode === 'rest'
        ? [
            ['8:00', 'Breakfast'],
            ['12:30', 'Lunch'],
            ['3:30', 'Snack'],
            ['7:00', 'Dinner'],
          ]
        : [
            ['2:30', 'Pre-fuel'],
            [todayTime.replace(' pm', '').replace(' am', ''), todayMode === 'game' ? 'Game' : 'Practice'],
            ['6:15', 'Recovery'],
            ['7:00', 'Dinner'],
          ]
      ).map(([time, label], i) => ({
        time,
        label,
        wrap: `flex:1;text-align:center;${i ? 'border-left:2px solid rgba(17,24,21,.1)' : ''}`,
        dot:
          i === 1 && todayMode !== 'rest'
            ? `width:12px;height:12px;border-radius:50%;background:${todayMode === 'game' ? '#D4573A' : GREEN};margin:0 auto;box-shadow:0 0 0 5px ${todayMode === 'game' ? 'rgba(212,87,58,.15)' : 'rgba(23,160,94,.15)'}`
            : 'width:9px;height:9px;border-radius:50%;background:rgba(17,24,21,.2);margin:0 auto',
      })),
      trainingNote:
        todayMode === 'game'
          ? `Game at ${todayTime}. Nothing new today — the pre-game meal is food you've eaten before.`
          : todayMode === 'practice'
            ? `Practice at ${todayTime}. Carbs are stacked before it and protein lands after.`
            : 'No training today, so carbs come down a little and protein holds.',

      calMonth: s.calView === 'week' ? weekRangeLabel : monthLabel(s.selDate),
      calHeads: ['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((label, i) => ({
        label: label + (i === 0 ? '' : ''),
      })),
      calCells,
      calShowMonth: s.calView === 'month',
      calShowWeek: s.calView === 'week',
      calViews: (
        [
          ['week', 'Week'],
          ['month', 'Month'],
        ] as [CalView, string][]
      ).map(([v, label]) => ({
        label,
        pick: () => this.update({ calView: v }),
        style: `flex:1;padding:10px 0;font-size:12.5px;font-weight:800;${s.calView === v ? `background:${INK};color:#F4F2ED` : 'background:transparent;color:#8C8779'}`,
      })),
      weekDays,
      weekShift: (n: number) => this.update({ selDate: addDays(s.selDate, n * 7) }),
      calLegend: [
        ['Practice', GREEN],
        ['Game', '#D4573A'],
        ['Lift', '#8C8779'],
        ['Rest', 'rgba(17,24,21,.18)'],
      ].map(([label, c], i) => ({
        label,
        dot: `width:${i === 2 ? 11 : 7}px;height:${i === 2 ? 5 : 7}px;border-radius:3px;background:${c}`,
      })),
      sel,
      // It said "rebuilt" and rebuilt nothing: the same meals were on screen
      // before and after, because the planner had no way to produce a second
      // answer. It re-rolls the day's picks now, and keeps whatever the athlete
      // swapped in by hand — those were choices, not suggestions.
      replanDay: () => this.replanDay(s.selDate),

      constraints,
      scopes: (
        [
          ['meal', 'One meal'],
          ['day', 'A day'],
          ['week', 'A week'],
        ] as [PlanScope, string][]
      ).map(([v, label]) => ({
        label,
        pick: () => this.update({ scope: v }),
        style: `flex:1;padding:12px;font-size:13.5px;font-weight:800;background:${s.scope === v ? INK : 'transparent'};color:${s.scope === v ? '#F4F2ED' : INK};transition:all .15s`,
      })),
      plannerChat: plannerInput === 'Ask in words',
      plannerForm: plannerInput === 'Dial it in',
      planText: s.planText,
      planTextChange: (e: ChangeEvent<HTMLTextAreaElement>) => this.update({ planText: e.target.value }),
      prompts: ['Use what I have', 'Under 15 minutes', 'High protein', 'Cheap week'].map((label) => ({
        label,
        pick: () =>
          this.update({
            planText: label === 'Use what I have' ? 'I have chicken, rice and cheese at home.' : label,
          }),
      })),
      cal: s.cal,
      calVal: s.cal + ' cal',
      calChange: (e: ChangeEvent<HTMLInputElement>) => this.update({ cal: +e.target.value }),
      pro: s.pro,
      proVal: s.pro + 'g',
      proChange: (e: ChangeEvent<HTMLInputElement>) => this.update({ pro: +e.target.value, genErr: 0 }),
      timeOpts: (
        [
          ['10', '10 min'],
          ['20', '20 min'],
          ['40', '40 min'],
          ['prep', 'Prep'],
        ] as [string, string][]
      ).map(([v, label]) => ({
        label,
        pick: () => this.update({ timeSel: v }),
        style: this.small(s.timeSel === v),
      })),
      budgetOpts: (
        [
          ['low', '$'],
          ['mid', '$$'],
          ['high', '$$$'],
        ] as [string, string][]
      ).map(([v, label]) => ({
        label,
        pick: () => this.update({ budgetSel: v, genErr: 0 }),
        style: this.small(s.budgetSel === v),
      })),
      includeChips: ['Chicken', 'Rice', 'Cheese', 'Pasta', 'Beef'].map((label) => ({
        label,
        pick: () =>
          this.update((st) => ({
            include: st.include.includes(label)
              ? st.include.filter((x) => x !== label)
              : st.include.concat(label),
          })),
        style: this.small(s.include.includes(label)),
      })),
      planError: !!s.genErr,
      fixBudget: () => this.update({ budgetSel: 'mid', genErr: 0 }),
      generate: this.runGen,
      generateLabel:
        s.scope === 'week' ? 'Generate my week' : s.scope === 'day' ? 'Generate my day' : 'Generate a meal',
      hasResults: !!s.genDone,
      results: RESULTS.filter((r) => safeMealIds([r.id], allergyLabels).length > 0).map((r) =>
        Object.assign(field(r.id, 13, 9), {
          name: MEALS[r.id].name,
          macroText: `${nutritionOf(MEALS[r.id]).kcal} cal · ${nutritionOf(MEALS[r.id]).protein}g protein · ${nutritionOf(MEALS[r.id]).carbs}g carbs`,
          tags: r.tags,
          why: r.why,
          slotId: 'fq-res-' + r.id,
          open: () => this.update({ overlay: 'meal', mealId: r.id }),
        }),
      ),

      search: s.search,
      searchChange: (e: ChangeEvent<HTMLInputElement>) => this.update({ search: e.target.value }),
      // Three things the app does not do yet, saying so.
      //
      // "Snap the plate, we estimate the macros" was the worst of them: present
      // tense, first person plural, describing a capability that does not exist
      // — an athlete could reasonably read it as having worked. A stub should be
      // legible as a stub.
      toastScan: () => this.toast('Barcode scanning is not built yet'),
      toastPhoto: () => this.toast('Photo logging is not built yet'),
      toastCustom: () => this.toast('Saving your own foods is not built yet'),
      logTabs: (
        [
          ['recent', 'Recent'],
          ['favorites', 'Favorites'],
          ['custom', 'My foods'],
        ] as [string, string][]
      ).map(([v, label]) => ({
        label,
        pick: () => this.update({ logTab: v }),
        style: `padding:12px 0;font-size:13.5px;font-weight:800;color:${s.logTab === v ? INK : '#A9A498'};border-bottom:3px solid ${s.logTab === v ? GREEN : 'transparent'};margin-bottom:-2px`,
      })),
      logEmpty: s.logTab === 'custom' || logItems.length === 0,
      logList: s.logTab !== 'custom' && logItems.length > 0,
      // The empty states were three strings baked into the screen, which was
      // fine while only one list could be empty. All three can be now.
      ...(s.logTab === 'custom'
        ? {
            logEmptyTitle: 'No custom foods yet',
            logEmptyBody: "Made something of your own? Save it once and it's a one-tap log forever.",
            logEmptyCta: 'Create a food',
            logEmptyAction: () => this.toast('Saving your own foods is not built yet'),
          }
        : // A search that found nothing is not the same as a log with nothing in
          // it, and telling an athlete "nothing logged yet" while they are
          // looking at their own search term reads as a broken box.
          logSearch
          ? {
              logEmptyTitle: 'Nothing matched',
              logEmptyBody: `No food here is called "${s.search.trim()}". Try a shorter word, or log it from your plan.`,
              logEmptyCta: '',
              logEmptyAction: () => {},
            }
          : s.logTab === 'favorites'
            ? {
                logEmptyTitle: 'No favourites yet',
                // Deliberately explains the rule rather than inventing entries:
                // a favourite here means something logged more than once.
                logEmptyBody: 'Log a meal more than once and it turns up here, ready to tap.',
                logEmptyCta: '',
                logEmptyAction: () => {},
              }
            : {
                logEmptyTitle: 'Nothing logged yet',
                logEmptyBody: 'Log what you eat and it lands here, along with your rings on Home.',
                logEmptyCta: 'Back to today',
                logEmptyAction: () => this.update({ tab: 'home' }),
              }),
      logItems: logItems.map((item) => {
        const sh = shapes(item.mealId ? MEALS[item.mealId].tile : tileForName(item.name), 46);
        const loggedToday = logsToday.filter((l) =>
          item.mealId ? l.mealId === item.mealId : l.name.toLowerCase() === item.name.toLowerCase(),
        );
        const on = loggedToday.length > 0;
        return {
          name: item.name,
          meta:
            s.logTab === 'favorites' || !item.lastLogged
              ? `${item.kcal} cal · ${item.protein}g protein`
              : `${item.kcal} cal · ${relativeDayLabel(item.lastLogged.date, iso, nowHour)}`,
          tileStyle: sh.tileStyle,
          s1: sh.s1,
          s2: sh.s2,
          btnText: on ? 'Logged' : 'Log',
          btnStyle: `padding:8px 15px;border-radius:99px;font-size:12.5px;font-weight:800;${on ? 'background:rgba(23,160,94,.13);color:#0E7B47' : `background:${INK};color:#F4F2ED`}`,
          add: () => {
            // The same button undoes it. A mis-tap here is 780 calories the
            // athlete did not eat, sitting on their ring for the rest of the
            // day, and the design has nowhere else to put an undo.
            if (on) {
              void this.removeLog(loggedToday[loggedToday.length - 1].id);
              return;
            }
            void this.addLog(
              {
                date: iso,
                // A library result is `'plan'`: the macros came from one of our
                // recipes rather than from the athlete, which is the distinction
                // `LogSource` exists to record. It is not `'recent'` — they have
                // never eaten it — and not `'custom'`, which means they typed
                // the numbers themselves.
                source: !item.lastLogged ? 'plan' : s.logTab === 'favorites' ? 'favorite' : 'recent',
                mealId: item.mealId,
                name: item.name,
                servings: 1,
                ...(({
                  kcal,
                  protein,
                  carbs,
                  fat,
                  fiber,
                  sugar,
                  sodium,
                  potassium,
                  calcium,
                  iron,
                  vitaminC,
                  vitaminD,
                }) => ({
                  kcal,
                  protein,
                  carbs,
                  fat,
                  fiber,
                  sugar,
                  sodium,
                  potassium,
                  calcium,
                  iron,
                  vitaminC,
                  vitaminD,
                }))(item),
              },
              () => `${item.name} logged`,
            );
          },
        };
      }),

      recipeCats: [
        'High protein',
        'Quick',
        'Budget',
        'Athlete',
        'Breakfast',
        'Dinner',
        'Snacks',
        'Picky eater',
      ].map((label, i) => ({
        label,
        pick: () => this.update({ cat: i }),
        style: `padding:9px 15px;border-radius:99px;white-space:nowrap;font-size:12.5px;font-weight:800;flex:none;border:2px solid ${s.cat === i ? INK : 'rgba(17,24,21,.13)'};background:${s.cat === i ? INK : 'transparent'};color:${s.cat === i ? '#F4F2ED' : INK}`,
      })),
      recipes: safeMealIds(RECIPE_SETS[s.cat] || RECIPE_SETS[0], allergyLabels).map((id) =>
        Object.assign(field(id, 21, 12), {
          name: MEALS[id].name,
          macroText: `${nutritionOf(MEALS[id]).kcal} cal · ${nutritionOf(MEALS[id]).protein}g protein`,
          open: () => this.update({ overlay: 'meal', mealId: id }),
        }),
      ),

      profileGroups: [
        {
          title: 'You',
          rows: [
            ['Name', a.name || '—'],
            ['Age', s.age + ' years'],
            ['Height', s.ft + "' " + s.inch + '"'],
            ['Weight', s.lb + ' lb'],
            ['Baseline', tg.sex === 'male' ? 'Male' : tg.sex === 'female' ? 'Female' : 'Averaged'],
          ],
        },
        {
          title: 'Targets',
          rows: [
            ['Daily calories', tg.cal.toLocaleString()],
            // Derived, so the row says what it is derived from rather than
            // which of three modes produced it.
            ['Protein', `${tg.protein}g · ${proteinPerLb(tg).toFixed(2)}g per lb of goal`],
            [
              'Goal weight',
              tg.goal === 'perform' || tg.goal === 'habits' ? 'Holding ' + s.lb + ' lb' : goalLb + ' lb',
            ],
            ['Pace', tg.goal === 'perform' || tg.goal === 'habits' ? 'Maintain' : tg.rate + ' lb / week'],
            [
              'Goal',
              tg.goal === 'gain'
                ? 'Gain lean weight'
                : tg.goal === 'lose'
                  ? 'Lose fat steadily'
                  : 'Fuel my sport',
            ],
          ],
        },
        {
          title: 'Training',
          rows: [
            ['Sports', (a.sports || []).join(', ') || '—'],
            ['Training days', trainCount + ' a week'],
            ['Schedule', 'Open the calendar'],
          ],
        },
        {
          title: 'Food',
          rows: [
            ['Favorites', (a.likes || []).slice(0, 3).join(', ') || '—'],
            ["Won't eat", (a.dislikes || []).slice(0, 3).join(', ') || '—'],
            ['Allergies', (a.allergies || []).join(', ') || 'None'],
          ],
        },
        {
          title: 'Kitchen',
          rows: [
            [
              'Cooking level',
              a.cook === 'micro'
                ? 'Microwave and toaster'
                : a.cook === 'good'
                  ? 'I know my way around'
                  : 'Can follow a recipe',
            ],
            [
              'Weekday time',
              a.time === '10'
                ? '10 minutes'
                : a.time === '40'
                  ? '30–40 minutes'
                  : a.time === 'prep'
                    ? 'Sunday prep'
                    : '20 minutes',
            ],
            ['Budget', a.budget === 'low' ? 'Under $4' : a.budget === 'high' ? 'Any budget' : '$4–8 a meal'],
          ],
        },
        // Only when there is an account to manage. With no backend configured
        // there is no session, no email and nothing to sign out of, so the group
        // is absent rather than present and inert.
        ...(this.props.userId
          ? [
              {
                title: 'Account',
                rows: [
                  ['Email', this.props.userEmail || '—'],
                  ['Sign out', ''],
                ] as [string, string][],
              },
            ]
          : []),
      ].map((g) => ({
        title: g.title,
        rows: g.rows.map(([label, value], i) => ({
          label,
          value,
          tap: () =>
            label === 'Schedule'
              ? this.update({ tab: 'calendar' })
              : label === 'Sign out'
                ? this.doSignOut()
                : label === 'Email'
                  ? undefined
                  : this.toast(`${label} — editor would open`),
          style: `display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 16px;width:100%;text-align:left;${i ? 'border-top:1px solid rgba(17,24,21,.09)' : ''}`,
        })),
      })),

      groceryGroups: groceryAisles.map(({ title, items }) => ({
        title,
        items: items.map((item) => {
          const key = title + item.name,
            on = !!s.checked[key];
          return {
            name: item.name,
            qty: item.qty,
            tap: () =>
              this.update((st) => ({ checked: Object.assign({}, st.checked, { [key]: !st.checked[key] }) })),
            rowStyle:
              'display:flex;align-items:center;gap:12px;padding:12px 2px;width:100%;text-align:left;border-bottom:1px solid rgba(17,24,21,.08)',
            box: on
              ? `width:21px;height:21px;border-radius:7px;background:${GREEN};flex:none;box-shadow:inset 0 0 0 3px #fff, inset 0 0 0 4px ${GREEN}`
              : 'width:21px;height:21px;border-radius:7px;border:2px solid rgba(17,24,21,.18);flex:none',
            text: `flex:1;font-size:14.5px;font-weight:700;${on ? 'color:#B5B0A4;text-decoration:line-through' : ''}`,
          };
        }),
      })),

      // Progress, entirely from the logs.
      //
      // Every number on this screen used to be a literal — `86%` adherence, `up
      // from 71%`, `17m` average cook time — shown identically to everyone. They
      // read as facts about the person looking at them, which is exactly what
      // they were not. What survives is what the app can actually observe.
      // Profile's second stat card said `6/7 days on plan` to everyone, forever.
      daysLogged: `${adhere.daysLogged}/${adhere.window}`,
      groceryCount: groceryCount(groceryAisles),
      progressHasData: weekBars.some((w) => w.hasData),

      // Today's micronutrients against today's reference intakes.
      //
      // Only shown once something has been logged: a row of eight zeros is not
      // information, it is a reminder that the app knows nothing yet, and the
      // empty state above already says that better.
      microHeading: `Micronutrients · ${logsToday.length === 1 ? '1 meal' : `${logsToday.length} meals`} today`,
      microRows: logsToday.length
        ? MICRONUTRIENTS.map((key) => {
            const had = eaten[key];
            const target = tg.micros[key];
            const pct = target > 0 ? Math.round((had / target) * 100) : 0;
            const ceiling = CEILING_NUTRIENTS.includes(key);
            // A ceiling nutrient is doing well when it is *low*, so the bar
            // turns amber going over rather than green arriving.
            const good = ceiling ? pct <= 100 : pct >= 80;
            const unit = NUTRIENT_UNIT[key];
            const show = (v: number) =>
              key === 'iron' || key === 'vitaminD' ? Math.round(v * 10) / 10 : Math.round(v);
            return {
              key,
              label: NUTRIENT_LABEL[key],
              value: `${show(had)}${unit}`,
              note: `${ceiling ? 'limit' : 'of'} ${show(target)}${unit}`,
              rowStyle: `display:flex;align-items:center;gap:14px;padding:13px 16px;${MICRONUTRIENTS.indexOf(key) ? 'border-top:1px solid rgba(17,24,21,.08)' : ''}`,
              barStyle: `width:${Math.min(100, pct)}%;height:5px;border-radius:3px;background:${good ? GREEN : '#D4573A'}`,
            };
          })
        : [],
      weeks: weekBars.map((w, i) => ({
        label: w.label,
        // Uncapped percentages would run off the top of a 96px row, so the bar
        // stops at 100 while the stat cards below still tell the truth.
        bar: `width:100%;height:${Math.min(100, w.pct)}%;border-radius:6px;background:${i === weekBars.length - 1 ? '#5BE3A0' : 'rgba(244,242,237,' + (0.18 + i * 0.04) + ')'}`,
      })),
      progressSummary: !weekBars.some((w) => w.hasData)
        ? 'Nothing logged yet. Log what you eat and this fills in — one bar a week, and the numbers below start counting.'
        : `You logged food on ${adhere.daysLogged} of the last ${adhere.window} days${
            adhere.proteinDays ? `, and hit your protein target on ${adhere.proteinDays} of them` : ''
          }.`,
      progressStats: (
        [
          ['Days logged', `${adhere.daysLogged}/${adhere.window}`, 'Last seven days'],
          ['Protein hit', `${adhere.proteinDays}/${adhere.window}`, `Target is ${tg.protein}g a day`],
          [
            'Calories on target',
            `${adhere.calorieDays}/${adhere.window}`,
            `Within 10% of ${tg.cal.toLocaleString()}`,
          ],
          [
            'Training days fueled',
            `${adhere.trainingFueled}/${adhere.trainingDays}`,
            adhere.trainingDays ? 'Training days with food logged' : 'No training this week',
          ],
        ] as [string, string, string][]
      ).map(([label, value, note]) => ({ label, value, note })),

      navEven: navPrimary === 'Even tabs',
      navCenter: navPrimary === 'Center action',
      tabs: tabsDef.map(mkTab),
      tabsSplitL: tabsDef.slice(0, 2).map(mkTab),
      tabsSplitR: tabsDef.slice(3).map(mkTab),

      showMeal: s.overlay === 'meal',
      showSwap: s.overlay === 'swap',
      closeOverlay: () => this.update({ overlay: null }),
      meal,
      mealActions: [
        [
          'Swap meal',
          // Swap *this* meal — the one the overlay is showing — rather than
          // whatever the authored list happened to be about.
          () => this.update({ overlay: 'swap', deckIdx: 0, swapPick: null, swapFor: s.mealId }),
          1,
        ],
        // Both of these answered with a sentence and changed nothing: "Rebuilt
        // at 12 minutes" on a meal that stayed 28, "Rebuilt around chicken,
        // rice, cheese" on a meal whose ingredients never moved. They run
        // through the swap ranking now, so they either do the thing or say they
        // could not.
        ['Make it faster', () => this.rebuild('faster')],
        ['Use what I have', () => this.rebuild('pantry')],
        // "Make it cheaper" is gone rather than rewritten. Recipes carry no
        // cost — the '$4.20' it quoted came from an authored string on the swap
        // list — so there is nothing to rank a cheaper meal by. It comes back
        // when meals carry a cost band, which is also when `filtering.ts` gets
        // its 'budget' rung.
      ].map(([label, tap, primary]) => ({
        label,
        tap,
        style: `padding:11px 16px;border-radius:99px;white-space:nowrap;flex:none;font-size:13px;font-weight:800;border:2px solid ${primary ? GREEN : 'rgba(17,24,21,.14)'};background:${primary ? GREEN : 'transparent'};color:${primary ? '#fff' : INK}`,
      })),
      addGrocery: () => {
        this.update({ overlay: null, tab: 'grocery' });
        // Counted, not asserted. This said "4 items" whatever the recipe was.
        const n = mm ? mm.ingredients.length : 0;
        this.toast(n ? `${n} ${n === 1 ? 'item' : 'items'} are on your list` : 'Your list is empty');
      },

      swapSheet: swapMode === 'Compare three',
      swapDeck: swapMode === 'Card deck',
      swapOptions,
      swapDeckCards,
      // The sheet's header, which was three lines of copy about a chicken pasta
      // nobody was necessarily eating.
      swapOutName: outgoing?.name ?? '',
      swapOutMacros: outgoing
        ? `${baseNutrition(outgoing).kcal} cal · ${baseNutrition(outgoing).protein}g protein · ${baseNutrition(outgoing).carbs}g carbs`
        : '',
      swapOutHeading: outgoing ? `Instead of ${outgoing.name.toLowerCase()}` : 'Instead of this meal',
      swapTitle: `${activeSwaps.length === 1 ? 'One way' : activeSwaps.length === 2 ? 'Two ways' : 'Three ways'} to hit the same numbers`,
      swapSub: outgoing
        ? `Each one is ranked by how close it lands to your ${outgoing.slot.toLowerCase()}, and clears your allergies, dislikes and weeknight time.`
        : '',
      swapDeckSub: outgoing
        ? `${baseNutrition(outgoing).kcal} cal · ${baseNutrition(outgoing).protein}g protein — ranked by how close each one lands`
        : '',
      moreSwaps: () => {
        if (pages < 2) {
          this.toast('That is every safe option in this slot');
          return;
        }
        this.update((st) => ({ swapSet: (st.swapSet + 1) % pages, swapPick: null }));
      },
      deckSkip: () => this.update((st) => ({ deckIdx: st.deckIdx + 1 })),
      deckKeep: () => {
        const pick = deckOrder[0];
        if (pick) this.commitSwap(pick.meal.id);
      },
      swapBlocked: !s.swapPick,
      swapCtaLabel: s.swapPick
        ? `Swap it into ${outgoing ? outgoing.slot.toLowerCase() : 'the plan'}`
        : 'Pick a replacement',
      swapCtaStyle:
        ctaBase +
        (s.swapPick
          ? `;background:${GREEN};color:#fff;box-shadow:0 8px 20px rgba(23,160,94,.28)`
          : ';background:rgba(17,24,21,.09);color:#A9A498;cursor:not-allowed'),
      confirmSwap: () => {
        if (s.swapPick) this.commitSwap(s.swapPick);
      },

      showGen: s.genOn,
      genTitle:
        s.scope === 'week'
          ? 'Planning your week'
          : s.scope === 'day'
            ? 'Planning your day'
            : 'Finding your meal',
      genSub: 'Working around your allergies, your kitchen and your training days.',
      genSteps: [
        'Reading your preferences',
        'Checking your kitchen',
        'Matching your macros',
        'Costing it out',
        'Picking the best three',
      ].map((l, i) => stepRow(s.genStep > i, s.genStep === i, l)),
      showToast: !!s.toast,
      toast: s.toast,
    };
  }

  render() {
    return <PrototypeShell v={this.renderVals()} />;
  }
}
