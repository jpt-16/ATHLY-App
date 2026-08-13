import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { UserEvent } from '@testing-library/user-event';

import { AthlyApp } from './AthlyApp';
import { MEALS_BY_NAME, SLOW, leadMeal, planArea, reachHome } from './walkthrough';
import { rankSwaps } from './swaps';

/**
 * Swapping a meal, end to end.
 *
 * `swaps.ts` is unit-tested on its own; this covers the wiring around it, which
 * is where the old version went wrong. The sheet used to offer four hand-written
 * dinners whatever meal you tapped, compare them against a hardcoded 750
 * calories and 45g of protein, and — on confirming — replace dinner on every day
 * of the calendar at once. None of that was visible from the engine's side.
 */

const user = () => userEvent.setup();

beforeEach(() => {
  // Which meals a day calls for now depends on the date, so the clock is pinned.
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 7, 12, 9, 0));
});

afterEach(() => {
  vi.useRealTimers();
});

/** Open the swap sheet from the hero card on Home. */
async function openSwap(u: UserEvent) {
  await u.click(screen.getByRole('button', { name: /swap/i }));
  await screen.findByText(/to hit the same numbers/i);
}

describe('the swap sheet', () => {
  it(
    'is about the meal being replaced, not a fixed example',
    async () => {
      const u = user();
      render(<AthlyApp navPrimary="Even tabs" />);
      await reachHome(u);

      const lead = leadMeal();
      const outgoing = MEALS_BY_NAME[lead];
      await openSwap(u);

      // The header names the actual meal and its actual macros. It used to read
      // "Chicken pasta / 750 cal · 45g protein · 62g carbs" for everyone.
      //
      // `getAllByText`: the sheet is an overlay, so the plan underneath still
      // carries the outgoing meal's name too.
      expect(screen.getAllByText(lead).length).toBeGreaterThan(0);
      expect(
        screen.getByText(`${outgoing.kcal} cal · ${outgoing.p}g protein · ${outgoing.c}g carbs`),
      ).toBeInTheDocument();
    },
    SLOW,
  );

  it(
    'offers replacements from the same slot',
    async () => {
      const u = user();
      render(<AthlyApp navPrimary="Even tabs" />);
      await reachHome(u);

      const outgoing = MEALS_BY_NAME[leadMeal()];
      await openSwap(u);

      // A breakfast is replaced by breakfasts. The authored list offered dinners
      // regardless, so tapping "swap" on oats proposed steak pot roast.
      const offered = rankSwaps(outgoing.id, { allergens: [], dislikes: [], maxMinutes: 20 }, 9);
      const onScreen = offered.filter((o) => screen.queryByText(o.meal.name));
      expect(onScreen.length).toBeGreaterThan(0);
      for (const o of onScreen) expect(o.meal.slot).toBe(outgoing.slot);
    },
    SLOW,
  );

  it(
    'shows a match percentage that follows from the macros',
    async () => {
      const u = user();
      render(<AthlyApp navPrimary="Even tabs" />);
      await reachHome(u);

      const outgoing = MEALS_BY_NAME[leadMeal()];
      await openSwap(u);

      // Every percentage on screen must be the one the engine computed for that
      // meal against this outgoing meal — not an authored "98% match".
      const ranked = rankSwaps(outgoing.id, { allergens: [], dislikes: [], maxMinutes: 20 }, 9);
      let checked = 0;
      for (const o of ranked) {
        if (!screen.queryByText(o.meal.name)) continue;
        expect(screen.getAllByText(`${o.match}% match`).length).toBeGreaterThan(0);
        checked++;
      }
      expect(checked).toBeGreaterThan(0);
    },
    SLOW,
  );

  it(
    'puts the chosen meal into the plan',
    async () => {
      const u = user();
      render(<AthlyApp navPrimary="Even tabs" />);
      await reachHome(u);

      const lead = leadMeal();
      await openSwap(u);

      const outgoing = MEALS_BY_NAME[lead];
      const first = rankSwaps(outgoing.id, { allergens: [], dislikes: [], maxMinutes: 20 }, 9).find((o) =>
        screen.queryByText(o.meal.name),
      )!;
      await u.click(screen.getByText(first.meal.name).closest('button') as HTMLElement);
      await u.click(screen.getByRole('button', { name: /swap it into/i }));

      // The replacement leads the day, and the meal it replaced is gone.
      expect(within(planArea()).getAllByText(first.meal.name).length).toBeGreaterThan(0);
      expect(within(planArea()).queryByText(lead)).not.toBeInTheDocument();
    },
    SLOW,
  );

  it(
    'changes one day rather than the whole calendar',
    async () => {
      const u = user();
      render(<AthlyApp navPrimary="Even tabs" />);
      await reachHome(u);

      const lead = leadMeal();
      await openSwap(u);
      const outgoing = MEALS_BY_NAME[lead];
      const first = rankSwaps(outgoing.id, { allergens: [], dislikes: [], maxMinutes: 20 }, 9).find((o) =>
        screen.queryByText(o.meal.name),
      )!;
      await u.click(screen.getByText(first.meal.name).closest('button') as HTMLElement);
      await u.click(screen.getByRole('button', { name: /swap it into/i }));

      // A committed swap was a single field on the whole app, so swapping one
      // dinner changed every day at once. It is filed against a date now: move
      // to another day and the swap does not follow.
      await u.click(screen.getByRole('button', { name: /calendar/i }));
      const other = await screen.findByRole('button', { name: /^19$/ });
      await u.click(other);
      const meals = screen.getByText(/meals that day/i).closest('div')!.parentElement as HTMLElement;
      expect(within(meals).queryByText(first.meal.name)).not.toBeInTheDocument();
    },
    SLOW,
  );
});
