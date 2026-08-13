import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { UserEvent } from '@testing-library/user-event';

import { AthlyApp } from './AthlyApp';
import { MEALS } from './data';
import { SLOW, reachHome } from './walkthrough';

/**
 * The weekly plan, end to end.
 *
 * The calendar could only ever show one day: a month of training dots, and
 * whichever single day you tapped underneath. Worse, every day resolved to the
 * same meals, so tapping through the week showed the identical breakfast seven
 * times. These tests are about both halves — that a week is visible at once, and
 * that it is actually seven different days.
 */

const user = () => userEvent.setup();

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 7, 12, 9, 0));
});

afterEach(() => {
  vi.useRealTimers();
});

async function openCalendar(u: UserEvent) {
  await u.click(screen.getByRole('button', { name: /calendar/i }));
  await screen.findByRole('button', { name: /^week$/i });
}

/** The seven day cards, each one a button. */
function dayCards(): HTMLElement[] {
  return screen
    .getAllByRole('button')
    .filter((b) => /^(Sun|Mon|Tue|Wed|Thu|Fri|Sat)\d/.test(b.textContent ?? ''));
}

describe('the week view', () => {
  it(
    'shows seven days at once',
    async () => {
      const u = user();
      render(<AthlyApp navPrimary="Even tabs" />);
      await reachHome(u);
      await openCalendar(u);

      expect(dayCards()).toHaveLength(7);
    },
    SLOW,
  );

  it(
    'puts each day’s training next to the meals it shapes',
    async () => {
      const u = user();
      render(<AthlyApp navPrimary="Even tabs" />);
      await reachHome(u);
      await openCalendar(u);

      // The point of the view: the meals are there *because* of the training, so
      // both have to be on screen together.
      for (const card of dayCards()) {
        const text = card.textContent ?? '';
        expect(text).toMatch(/Game day|Practice|Lift only|Rest/);
        expect(text).toMatch(/\d+ cal · \d+g protein/);
      }
    },
    SLOW,
  );

  it(
    'is seven different days, not one day seven times',
    async () => {
      const u = user();
      render(<AthlyApp navPrimary="Even tabs" />);
      await reachHome(u);
      await openCalendar(u);

      // The failure this exists for: `selectForSlot` returned the first safe
      // candidate with nothing to vary on, so the whole week was one repeated
      // day. Breakfast is the cleanest probe — every day has one.
      const breakfasts = new Set<string>();
      const names = Object.values(MEALS)
        .filter((m) => m.slot === 'Breakfast')
        .map((m) => m.name);
      for (const card of dayCards()) {
        for (const n of names) {
          if (within(card).queryByText(n)) breakfasts.add(n);
        }
      }
      expect(breakfasts.size).toBeGreaterThan(1);
    },
    SLOW,
  );

  it(
    'still lets the month grid through',
    async () => {
      const u = user();
      render(<AthlyApp navPrimary="Even tabs" />);
      await reachHome(u);
      await openCalendar(u);

      // The training editor lives on the month view; the week reports, it does
      // not duplicate. Switching must not lose it.
      await u.click(screen.getByRole('button', { name: /^month$/i }));
      expect(await screen.findByText(/what's on/i)).toBeInTheDocument();
      expect(screen.getByText(/meals that day/i)).toBeInTheDocument();
      expect(dayCards()).toHaveLength(0);
    },
    SLOW,
  );

  it(
    'walks to the next week',
    async () => {
      const u = user();
      render(<AthlyApp navPrimary="Even tabs" />);
      await reachHome(u);
      await openCalendar(u);

      const before = dayCards().map((c) => c.textContent);
      await u.click(screen.getByRole('button', { name: /next week/i }));
      const after = dayCards().map((c) => c.textContent);
      expect(after).toHaveLength(7);
      expect(after).not.toEqual(before);
    },
    SLOW,
  );
});
