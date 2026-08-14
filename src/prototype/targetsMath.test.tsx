import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { AthlyApp } from './AthlyApp';
import { SLOW, runOnboarding } from './walkthrough';

/**
 * The calorie breakdown on the targets screen, checked against itself.
 *
 * This screen is the app's whole argument: here is your number, and here is
 * every step that produced it. That argument only holds if the steps shown add
 * up to the number shown, and if each step names the weight it was actually
 * computed from.
 *
 * Both had drifted. The resting-burn line printed the athlete's *current*
 * weight beside a figure derived from their *goal* weight, and the safety floor
 * — which can add several hundred calories — was applied silently, leaving the
 * rows adding up to less than the headline.
 */

const user = () => userEvent.setup();

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 7, 12, 9, 0));
});

afterEach(() => {
  vi.useRealTimers();
});

/**
 * The value shown against a breakdown row, by the row's label.
 *
 * The label sits two levels inside the row, with the value as the row's last
 * child — see the `math` mapping in `AthlyApp.renderVals`.
 */
function rowValue(label: RegExp): number {
  const row = screen.getByText(label).parentElement?.parentElement;
  if (!row) throw new Error(`no row for ${label}`);
  return num(row.lastElementChild?.textContent ?? '');
}

/** `'+1,292'` → `1292`. */
function num(text: string): number {
  const parsed = Number(text.replace(/[+,\s]/g, ''));
  if (Number.isNaN(parsed)) throw new Error(`not a number: ${text}`);
  return parsed;
}

/** The headline calorie figure, which sits immediately before its `cal / day` unit. */
function headline(): number {
  return num(screen.getByText('cal / day').previousElementSibling?.textContent ?? '');
}

async function reachTargets() {
  const u = user();
  render(<AthlyApp />);
  await runOnboarding(u);
  await screen.findByRole('button', { name: /build my week/i });
}

describe('the calorie breakdown', () => {
  it(
    'names the goal weight the resting burn was computed from',
    async () => {
      await reachTargets();

      // The default athlete is gaining: 165 lb now, 180 lb goal. `computeTargets`
      // runs Mifflin–St Jeor at the *basis* weight, which for a gaining athlete
      // is the goal — so a line reading "165 lb" would be describing a number
      // the app did not calculate.
      expect(screen.getByText(/at your 180 lb goal weight/i)).toBeTruthy();
      expect(screen.queryByText(/165 lb/)).toBeNull();
    },
    SLOW,
  );

  it(
    'shows steps that add up to the number at the top',
    async () => {
      await reachTargets();

      const parts =
        rowValue(/^Resting burn$/) + rowValue(/^Training on top$/) + rowValue(/^Surplus for growth$/);
      expect(parts).toBe(headline());
    },
    SLOW,
  );

  it(
    'leaves the floor row off when the floor did not bind',
    async () => {
      await reachTargets();

      // A gaining athlete is never floored, so the row must not appear — it
      // would otherwise read as an intervention that never happened.
      expect(screen.queryByText(/held at your floor/i)).toBeNull();
    },
    SLOW,
  );
});
