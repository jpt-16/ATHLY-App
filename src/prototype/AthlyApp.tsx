import React from 'react';
import type { ChangeEvent, KeyboardEvent } from 'react';

import type { Tile } from './data';
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
  SWAPS,
  TILES,
  TIMES,
  field,
  shapes,
} from './data';
import { computeTargets, dayMeals } from './nutrition';
import { minutesAvailable, safeMealIds, selectForSlot } from './filtering';
import type { SlotConstraints } from './filtering';
import { ALLERGEN_LABEL } from './foodFacts';
import type { Allergen } from './foodFacts';
import { PrototypeShell } from './PrototypeShell';
import type { AppState, AthlyProps, DayMode, DaySpec, PlanScope, ProteinMode, Tab, Targets } from './types';

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
    pMode: 'rec',
    pCustom: null,
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
    selDay: 12,
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
    added: [],
    checked: {},
    insight: true,
    nextEaten: false,
    swapCommitted: null,
    cat: 0,
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

  componentWillUnmount() {
    clearInterval(this._t);
    clearInterval(this._b);
    clearTimeout(this._to);
  }
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

  dayType(dateNum: number): DaySpec {
    const s = this.state;
    if (s.overrides[dateNum]) return s.overrides[dateNum];
    const wd = new Date(2026, 7, dateNum).getDay();
    return s.week[wd];
  }
  setDay(dateNum: number, mode: DayMode, time?: string) {
    const cur = this.dayType(dateNum);
    this.update((st) => ({
      overrides: Object.assign({}, st.overrides, {
        [dateNum]: [
          mode,
          time !== undefined ? time : mode === 'rest' ? '' : cur[1] || '4:30 pm',
          cur[2] || '',
          cur[3] || '',
        ],
      }),
    }));
  }
  setLift(dateNum: number, lift: string) {
    const cur = this.dayType(dateNum);
    this.update((st) => ({
      overrides: Object.assign({}, st.overrides, { [dateNum]: [cur[0], cur[1], lift, cur[3] || ''] }),
    }));
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
  private resolveSlots(slotIds: string[]): ResolvedSlot[] {
    const c = this.constraints();
    return slotIds.map((slot) => {
      const result = selectForSlot(SLOT_CANDIDATES[slot] ?? [slot], c);
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
  slotRow(r: ResolvedSlot, size?: number) {
    return r.mealId ? this.row(r.mealId, size) : this.blockedRow(r.slot, r.blockedBy, size);
  }

  row(id: string, size?: number) {
    const m = MEALS[id];
    const sh = shapes(m.tile, size || 62);
    const fd = field(id, (size || 62) < 55 ? 11 : 12, 8);
    return {
      slot: m.slot,
      name: m.name,
      macroText: `${m.kcal} cal · ${m.p}g protein · ${m.prep}`,
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
  stats(id: string, full: boolean) {
    const m = MEALS[id];
    const o: Partial<(typeof SWAPS)[number]> = SWAPS.find((x) => x.id === id) || {};
    const dc = m.kcal - 750,
      dp = m.p - 45;
    const tone = (ok: boolean) => `font-size:11px;font-weight:800;color:${ok ? '#0E7B47' : '#B0553C'}`;
    const base = [
      {
        label: 'calories',
        value: m.kcal,
        delta: (dc >= 0 ? '+' : '') + dc,
        deltaStyle: tone(Math.abs(dc) <= 60),
      },
      {
        label: 'protein',
        value: m.p + 'g',
        delta: (dp >= 0 ? '+' : '') + dp + 'g',
        deltaStyle: tone(Math.abs(dp) <= 3),
      },
      { label: 'time', value: o.time || m.prep, delta: '', deltaStyle: 'display:none' },
    ];
    return full
      ? base.concat([{ label: 'cost', value: o.cost || '', delta: '', deltaStyle: 'display:none' }])
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

    // calendar
    const first = new Date(2026, 7, 1).getDay(),
      dim = 31;
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
      const [mode, , lift] = this.dayType(num);
      const on = s.selDay === num,
        today = num === 12;
      return {
        num,
        tap: () => this.update({ selDay: num }),
        style: `height:44px;border-radius:11px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;background:${on ? INK : today ? 'rgba(17,24,21,.06)' : 'transparent'};transition:all .15s`,
        numStyle: `font-size:13px;font-weight:${today || on ? 800 : 600};color:${on ? '#F4F2ED' : INK}`,
        dot: `width:${lift && mode === 'rest' ? 9 : 5}px;height:5px;border-radius:3px;background:${mode === 'game' ? '#D4573A' : mode === 'practice' ? (on ? '#5BE3A0' : GREEN) : lift ? (on ? 'rgba(244,242,237,.55)' : '#8C8779') : 'transparent'}`,
      };
    });
    const [selMode, selTime, selLift, selDur] = this.dayType(s.selDay);
    const selDate = new Date(2026, 7, s.selDay);
    const selMeals = this.resolveSlots(dayMeals(selMode, selLift));
    const sel = {
      dateLabel:
        ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][selDate.getDay()] +
        ', August ' +
        s.selDay,
      modes: (
        [
          ['rest', 'Rest day'],
          ['practice', 'Practice'],
          ['game', 'Game'],
        ] as [DayMode, string][]
      ).map(([v, l]) =>
        Object.assign(modeBtn(selMode, v, l, 12), {
          pick: () => {
            this.setDay(s.selDay, v);
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
        this.setLift(s.selDay, v);
        this.toast(v ? 'Lift added — pre-lift carbs and a recovery snack slotted in' : 'Lift removed');
      },
      liftTimes: LIFT_TIMES.map((t) => ({
        label: t,
        pick: () => {
          this.setLift(s.selDay, t);
          this.toast('Lifting snacks moved around ' + t);
        },
        style: this.small(selLift === t) + ';white-space:nowrap;flex:none',
      })),
      timeLabel: selMode === 'game' ? 'First whistle' : 'Practice starts',
      times: TIMES.map((t) => ({
        label: t,
        pick: () => {
          this.setDay(s.selDay, selMode, t);
          this.toast('Meals shifted around ' + t);
        },
        style: this.small(selTime === t) + ';white-space:nowrap;flex:none',
      })),
      mealsCount: selMeals.length + ' meals',
      meals: selMeals.map((r) => this.slotRow(r, 54)),
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

    const todayMode = this.dayType(12)[0],
      todayTime = this.dayType(12)[1];
    const todaySlots = this.resolveSlots(dayMeals(todayMode, this.dayType(12)[2]));
    const eatenIdx = s.nextEaten ? 1 : 0;
    const upcoming = todaySlots.slice(2 + eatenIdx);
    // The hero shows the next meal the athlete can actually eat. If the slot the
    // day called for was emptied by an allergy, skip past it rather than lead
    // with a hole; only an entirely blocked day falls through to `null`.
    const heroIdx = 2 + eatenIdx;
    const heroSlot =
      todaySlots.slice(heroIdx).find((r) => r.mealId) ?? todaySlots.find((r) => r.mealId) ?? null;
    const nm = heroSlot?.mealId ? MEALS[heroSlot.mealId] : null;
    const blockedHero = todaySlots[heroIdx] ?? todaySlots[todaySlots.length - 1];
    const nfA = nm ? field(nm.id, 18, 12) : null;
    const nfB = nm ? field(nm.id, 13, 9) : null;
    const heroField = (fs: number, pad: number) =>
      `position:absolute;inset:0;background:${TILES.blocked.bg};display:flex;align-items:flex-end;padding:${pad}px;box-sizing:border-box;font-size:${fs}px`;
    const nextMeal = nm
      ? {
          name: nm.name,
          kcal: nm.kcal,
          protein: nm.p + 'g protein',
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

    const remainCal = Math.max(0, tg.cal - 1840),
      remainPro = Math.max(0, tg.protein - 98);
    const pctCal = Math.min(100, Math.round((1840 / tg.cal) * 100));

    const weekStrip = [0, 1, 2, 3, 4, 5, 6].map((i) => {
      const d = 9 + i,
        [mode, , lift] = this.dayType(d),
        today = d === 12;
      return {
        day: DAYS[new Date(2026, 7, d).getDay()][0],
        num: d,
        tap: () => this.update({ tab: 'calendar', selDay: d }),
        style: `flex:1;min-width:44px;display:flex;flex-direction:column;align-items:center;gap:4px;padding:9px 0 8px;border-radius:14px;background:${today ? INK : '#fff'};transition:all .15s`,
        dayStyle: `font-size:9.5px;font-weight:800;letter-spacing:.06em;color:${today ? 'rgba(244,242,237,.55)' : '#A9A498'}`,
        numStyle: `font-size:14px;font-weight:900;letter-spacing:-.02em;color:${today ? '#F4F2ED' : INK}`,
        dot: `width:${lift && mode === 'rest' ? 9 : 5}px;height:5px;border-radius:3px;background:${mode === 'game' ? '#D4573A' : mode === 'practice' ? (today ? '#5BE3A0' : GREEN) : lift ? (today ? 'rgba(244,242,237,.55)' : '#8C8779') : 'transparent'}`,
      };
    });

    // A swap is a meal like any other: never offer one the athlete cannot eat.
    const safeSwaps = SWAPS.filter((o) => safeMealIds([o.id], allergyLabels).length > 0);
    const swapDeck = safeSwaps.length ? safeSwaps : [];
    const activeSwaps =
      s.swapSet === 0
        ? swapDeck.slice(0, 3)
        : [swapDeck[3], swapDeck[0], swapDeck[2]].filter((x): x is (typeof SWAPS)[number] => !!x);
    const mk = (o: (typeof SWAPS)[number], pre: string) =>
      Object.assign(
        { name: MEALS[o.id].name, why: o.why, match: o.match, stats: this.stats(o.id, pre === 'fq-swap-') },
        field(o.id, pre === 'fq-swap-' ? 30 : 36, pre === 'fq-swap-' ? 16 : 18),
      );
    const swapOptions = activeSwaps.map((o) =>
      Object.assign(mk(o, 'fq-swap-'), {
        pick: () => this.update({ swapPick: o.id }),
        cardStyle: `display:block;width:100%;background:#fff;box-shadow:0 1px 2px rgba(17,24,21,.045),0 12px 28px -18px rgba(17,24,21,.28);border-radius:18px;overflow:hidden;border:2px solid ${s.swapPick === o.id ? GREEN : 'transparent'};box-shadow:${s.swapPick === o.id ? '0 8px 22px rgba(23,160,94,.18)' : '0 1px 3px rgba(17,24,21,.07)'};transition:all .18s`,
        matchStyle:
          'position:absolute;left:12px;top:12px;z-index:2;padding:5px 11px;border-radius:99px;background:rgba(17,24,21,.82);color:#5BE3A0;font-size:10.5px;font-weight:800;pointer-events:none',
        checkStyle:
          s.swapPick === o.id
            ? `width:24px;height:24px;border-radius:50%;background:${GREEN};flex:none;box-shadow:inset 0 0 0 3px #fff, inset 0 0 0 4.5px ${GREEN}`
            : 'width:24px;height:24px;border-radius:50%;border:2px solid rgba(17,24,21,.16);flex:none',
      }),
    );
    const deckOrder = activeSwaps.slice(s.deckIdx % 3).concat(activeSwaps.slice(0, s.deckIdx % 3));
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

    const logData: Record<string, [string, string, Tile][]> = {
      recent: [
        ['Peanut butter banana oats', '620 cal · this morning', TILES.oats],
        ['Chicken burrito bowl', '780 cal · yesterday', TILES.bowl],
        ['Chocolate milk', '210 cal · yesterday', TILES.shake],
        ['Rice cakes & honey', '190 cal · Monday', TILES.snack],
      ],
      favorites: [
        ['Steak & roast potatoes', '765 cal · 47g protein', TILES.steak],
        ['Chicken burrito bowl', '780 cal · 52g protein', TILES.bowl],
        ['Greek yogurt & granola', '320 cal · 22g protein', TILES.shake],
      ],
    };

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
    const meal = Object.assign(field(mm.id, 46, 22), {
      name: mm.name,
      slot: mm.slot,
      timeText: mm.timeText,
      reasons: mm.reasons,
      macros: [
        ['calories', mm.kcal],
        ['protein', mm.p + 'g'],
        ['carbs', mm.c + 'g'],
        ['fat', mm.f + 'g'],
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

    return {
      isOnboarding: s.stage === 'onboarding' || s.stage === 'building' || s.stage === 'targets',
      isApp: s.stage === 'app',
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
              tg.rate < s.rate
                ? a.goal === 'lose'
                  ? ` You picked ${s.rate}, but that\u2019s past the ceiling — about 1% of your bodyweight a week is as fast as you can go without losing muscle with it.${s.age < 18 ? ' Your age factors in too.' : ''}`
                  : ` You picked ${s.rate}, but you\u2019re ${s.age} — steady beats fast while you\u2019re still growing.`
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
            note: `${tg.sex === 'male' ? 'Male' : tg.sex === 'female' ? 'Female' : 'Averaged'} baseline · ${s.age} yrs, ${s.ft}'${s.inch}", ${s.lb} lb`,
            value: tg.bmr.toLocaleString(),
          },
          {
            label: 'Training on top',
            note: `${tg.days} training days a week`,
            value: '+' + (tg.maint - tg.bmr).toLocaleString(),
          },
          {
            label: tg.adj === 0 ? 'Goal adjustment' : tg.adj > 0 ? 'Surplus for growth' : 'Deficit',
            note:
              tg.adj === 0
                ? 'Holding steady'
                : tg.rate + ' lb a week' + (tg.rate < s.rate ? ' — eased from ' + s.rate : ''),
            value: (tg.adj > 0 ? '+' : '') + tg.adj,
          },
        ].map((m, i) => ({
          label: m.label,
          note: m.note,
          value: m.value,
          style: `display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 16px;${i ? 'border-top:1px solid rgba(244,242,237,.1)' : ''}`,
          valueStyle: `font-size:17px;font-weight:900;letter-spacing:-.02em;color:${i === 2 && tg.adj !== 0 ? '#5BE3A0' : '#F4F2ED'}`,
        })),
        macros: [
          { label: 'protein', value: tg.protein + 'g' },
          { label: 'carbs', value: tg.carbs + 'g' },
          { label: 'fat', value: tg.fat + 'g' },
        ],
        proteinBasis:
          tg.pMode === 'rec'
            ? `${(tg.protein / tg.goalLb).toFixed(2)}g per pound of your ${tg.goalLb} lb goal weight. One pound a week sits at 1g per pound; ${tg.rate} lb a week ${tg.rate > 1 ? 'asks for more' : tg.rate < 1 ? 'needs less' : 'is the baseline'}. Lock it with one of the fixed options below if you'd rather pace didn't move it.`
            : `Fixed at ${(tg.protein / tg.goalLb).toFixed(2)}g per pound of your ${tg.goalLb} lb goal weight. Changing your pace moves calories only — this number stays put.`,
        pOpts: [
          { v: 'rec' as ProteinMode, label: 'Recommended', sub: tg.recProtein + 'g · tracks pace' },
          { v: 'gpp' as ProteinMode, label: '1g per lb of goal', sub: tg.goalLb + 'g · fixed' },
          {
            v: 'custom' as ProteinMode,
            label: 'Custom',
            sub: tg.pMode === 'custom' ? tg.protein + 'g' : 'Set it',
          },
        ].map((o) => ({
          label: o.label,
          sub: o.sub,
          pick: () =>
            this.update({
              pMode: o.v,
              pCustom: o.v === 'custom' && s.pCustom == null ? tg.recProtein : s.pCustom,
            }),
          style: `flex:1;min-width:0;text-align:left;padding:12px 10px;border-radius:14px;border:2px solid ${tg.pMode === o.v ? '#5BE3A0' : 'rgba(244,242,237,.14)'};background:${tg.pMode === o.v ? 'rgba(91,227,160,.13)' : 'transparent'}`,
          labelStyle: `font-size:11px;font-weight:800;line-height:1.25;letter-spacing:-.01em;color:${tg.pMode === o.v ? '#5BE3A0' : 'rgba(244,242,237,.72)'}`,
          subStyle: `font-size:11px;font-weight:700;margin-top:4px;color:${tg.pMode === o.v ? 'rgba(91,227,160,.7)' : 'rgba(244,242,237,.38)'}`,
        })),
        pCustomOn: tg.pMode === 'custom',
        pCustomVal: tg.protein + 'g',
        pUp: () => this.update({ pCustom: Math.min(320, tg.protein + 5) }),
        pDown: () => this.update({ pCustom: Math.max(60, tg.protein - 5) }),
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
      startBuild: this.runBuild,

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
          swapCommitted: null,
          insight: true,
          nextEaten: false,
          overrides: {},
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
        proBar: `width:${Math.min(100, Math.round((98 / tg.protein) * 100))}%;height:100%;background:${GREEN};border-radius:99px`,
      },
      macroBars: (
        [
          ['Protein', 'Pro', 98, tg.protein, GREEN],
          ['Carbs', 'Carb', 240, tg.carbs, '#111815'],
          ['Fat', 'Fat', 58, tg.fat, '#C08B4A'],
        ] as [string, string, number, number, string][]
      ).map(([name, short, had, goal2, col]) => ({
        name,
        short,
        text: `${had}/${goal2}g`,
        fill: `width:${Math.min(100, (had / goal2) * 100)}%;height:100%;background:${col};border-radius:99px`,
      })),
      eatNext: () => {
        if (!nm) return;
        this.update({ nextEaten: true });
        this.toast(`${nm.name} logged — ${remainPro}g protein to go`);
      },
      openNext: () => {
        if (!nm) {
          this.toast(this.blockedReason(blockedHero?.blockedBy ?? []));
          return;
        }
        this.update({ overlay: 'meal', mealId: nm.id });
      },
      openSwap: () => this.update({ overlay: 'swap', deckIdx: 0, swapPick: null }),
      todayMeals: upcoming.map((r) =>
        // A committed swap replaces dinner, but only if it is safe to eat.
        s.swapCommitted && r.slot === 'dinner' && safeMealIds([s.swapCommitted], allergyLabels).length
          ? this.row(s.swapCommitted)
          : this.slotRow(r),
      ),
      dayShape: todayMode === 'game' ? 'Game day' : todayMode === 'practice' ? 'Hard day' : 'Rest day',
      showInsight: s.insight && s.tab === 'home',
      insightText: (a.dislikes || []).length
        ? `You've swapped ${(a.dislikes[0] || 'eggs').toLowerCase()} out three times this week. Want me to stop putting it in your meals?`
        : "You've swapped eggs out three times this week. Want me to stop putting them in your breakfasts?",
      learnYes: () => {
        this.update({ insight: false });
        this.toast('Got it — dropped from your rotation');
      },
      learnNo: () => {
        this.update({ insight: false });
        this.toast('Keeping them in rotation');
      },
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

      calMonth: 'August 2026',
      calHeads: ['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((label, i) => ({
        label: label + (i === 0 ? '' : ''),
      })),
      calCells,
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
      replanDay: () =>
        this.toast(
          `August ${s.selDay} rebuilt — ${selMeals.length} meals around your ${selMode === 'rest' ? 'rest day' : selMode}`,
        ),

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
          macroText: `${MEALS[r.id].kcal} cal · ${MEALS[r.id].p}g protein · ${MEALS[r.id].c}g carbs`,
          tags: r.tags,
          why: r.why,
          slotId: 'fq-res-' + r.id,
          open: () => this.update({ overlay: 'meal', mealId: r.id }),
        }),
      ),

      search: s.search,
      searchChange: (e: ChangeEvent<HTMLInputElement>) => this.update({ search: e.target.value }),
      toastScan: () => this.toast('Point at a barcode — camera would open here'),
      toastPhoto: () => this.toast('Snap the plate, we estimate the macros'),
      toastCustom: () => this.toast('Custom food builder would open'),
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
      logEmpty: s.logTab === 'custom',
      logList: s.logTab !== 'custom',
      logItems: (logData[s.logTab] || []).map(([nm2, meta, t], i) => {
        const sh = shapes(t, 46),
          on = s.added.includes(s.logTab + i);
        return {
          name: nm2,
          meta,
          tileStyle: sh.tileStyle,
          s1: sh.s1,
          s2: sh.s2,
          btnText: on ? 'Logged' : 'Log',
          btnStyle: `padding:8px 15px;border-radius:99px;font-size:12.5px;font-weight:800;${on ? 'background:rgba(23,160,94,.13);color:#0E7B47' : `background:${INK};color:#F4F2ED`}`,
          add: () => {
            if (!on) {
              this.update((st) => ({ added: st.added.concat(st.logTab + i) }));
              this.toast(`${nm2} logged`);
            }
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
          macroText: `${MEALS[id].kcal} cal · ${MEALS[id].p}g protein`,
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
            [
              'Protein',
              tg.protein +
                'g · ' +
                (tg.pMode === 'gpp' ? '1g per lb of goal' : tg.pMode === 'custom' ? 'Custom' : 'Recommended'),
            ],
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
      ].map((g) => ({
        title: g.title,
        rows: g.rows.map(([label, value], i) => ({
          label,
          value,
          tap: () =>
            label === 'Schedule'
              ? this.update({ tab: 'calendar' })
              : this.toast(`${label} — editor would open`),
          style: `display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 16px;width:100%;text-align:left;${i ? 'border-top:1px solid rgba(17,24,21,.09)' : ''}`,
        })),
      })),

      groceryGroups: (
        [
          [
            'Produce',
            [
              ['Bananas', '6'],
              ['Baby potatoes', '2 lb'],
              ['Spinach', '1 bag'],
              ['Green beans', '1 lb'],
            ],
          ],
          [
            'Meat',
            [
              ['Chicken breast', '3 lb'],
              ['Sirloin', '2 steaks'],
              ['Ground beef', '1 lb'],
            ],
          ],
          [
            'Dairy',
            [
              ['Whole milk', '1 gal'],
              ['Greek yogurt', '32 oz'],
              ['Shredded cheese', '8 oz'],
            ],
          ],
          [
            'Grains & pantry',
            [
              ['Rolled oats', '1 canister'],
              ['Jasmine rice', '2 lb'],
              ['Penne', '1 box'],
              ['Honey', '1 jar'],
            ],
          ],
        ] as [string, [string, string][]][]
      ).map(([title, items]) => ({
        title,
        items: items.map(([nm3, qty]) => {
          const key = title + nm3,
            on = !!s.checked[key];
          return {
            name: nm3,
            qty,
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

      weeks: [58, 66, 71, 64, 79, 84, 88, 92].map((v, i) => ({
        label: 'W' + (i + 1),
        bar: `width:100%;height:${v}%;border-radius:6px;background:${i === 7 ? '#5BE3A0' : 'rgba(244,242,237,' + (0.18 + i * 0.04) + ')'}`,
      })),
      progressStats: (
        [
          ['Protein days hit', '6/7', 'Third week running'],
          ['Plan adherence', '86%', 'Up from 71%'],
          ['Training days fueled', trainCount + '/' + trainCount, 'Pre and post, every session'],
          ['Avg cook time', '17m', 'You pick fast meals'],
        ] as [string, string, string][]
      ).map(([label, value, note]) => ({ label, value, note })),
      learnings: [
        'You swap eggs out most mornings — breakfasts now lean oats and yogurt.',
        'You almost never cook past 20 minutes on practice days.',
        'Steak and rice bowls get rated highest, so they come up more often.',
      ],

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
        ['Swap meal', () => this.update({ overlay: 'swap', deckIdx: 0, swapPick: null }), 1],
        ['Make it faster', () => this.toast('Rebuilt at 12 minutes')],
        ['Make it cheaper', () => this.toast('Swapped to thighs — now $4.20')],
        ['Use what I have', () => this.toast('Rebuilt around chicken, rice, cheese')],
      ].map(([label, tap, primary]) => ({
        label,
        tap,
        style: `padding:11px 16px;border-radius:99px;white-space:nowrap;flex:none;font-size:13px;font-weight:800;border:2px solid ${primary ? GREEN : 'rgba(17,24,21,.14)'};background:${primary ? GREEN : 'transparent'};color:${primary ? '#fff' : INK}`,
      })),
      addGrocery: () => {
        this.update({ overlay: null, tab: 'grocery' });
        this.toast('4 items added to your grocery list');
      },

      swapSheet: swapMode === 'Compare three',
      swapDeck: swapMode === 'Card deck',
      swapOptions,
      swapDeckCards,
      moreSwaps: () => {
        this.update((st) => ({ swapSet: (st.swapSet + 1) % 2, swapPick: null }));
        this.toast('Three more, same numbers');
      },
      deckSkip: () => this.update((st) => ({ deckIdx: st.deckIdx + 1 })),
      deckKeep: () => {
        const pick = deckOrder[0];
        this.update({ overlay: null, swapCommitted: pick.id });
        this.toast(`Swapped in ${MEALS[pick.id].name}`);
      },
      swapBlocked: !s.swapPick,
      swapCtaLabel: s.swapPick ? 'Swap it into tonight' : 'Pick a replacement',
      swapCtaStyle:
        ctaBase +
        (s.swapPick
          ? `;background:${GREEN};color:#fff;box-shadow:0 8px 20px rgba(23,160,94,.28)`
          : ';background:rgba(17,24,21,.09);color:#A9A498;cursor:not-allowed'),
      confirmSwap: () => {
        if (!s.swapPick) return;
        this.update({ overlay: null, swapCommitted: s.swapPick });
        this.toast(`Swapped in ${MEALS[s.swapPick].name}`);
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
