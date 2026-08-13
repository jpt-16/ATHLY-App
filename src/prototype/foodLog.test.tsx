import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { UserEvent } from '@testing-library/user-event';

import { AthlyApp } from './AthlyApp';
import { MEALS_BY_NAME, SLOW, leadMeal, planArea, reachHome } from './walkthrough';

/**
 * The Home ring, end to end, with no backend.
 *
 * Until this phase the ring was `tg.cal - 1840`: a constant dressed as a
 * measurement, identical for every athlete on every day, and unmoved by logging
 * anything. These tests exist to make that impossible to reintroduce — they
 * assert on the number, before and after.
 *
 * No Supabase is configured here, which is the local-only path: the logs live in
 * component state, nothing is written anywhere, and the arithmetic is the same
 * arithmetic the signed-in path runs.
 */

const user = () => userEvent.setup();

beforeEach(() => {
  // The app renders a real calendar, and the planner varies the day's meals by
  // date. Pinning the clock keeps "today" — and so the training day, the meals
  // it calls for, and the week strip — the same on every run and in every
  // timezone.
  //
  // `Date` only: the build animation and every `await` in here run on real
  // timers, and faking those would deadlock against `userEvent`.
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 7, 12, 9, 0));
});

afterEach(() => {
  vi.useRealTimers();
});

/** The two numbers on the ring: calories left, protein left. */
function stillToEat() {
  const heading = screen.getByText(/still to eat today/i);
  const block = heading.parentElement as HTMLElement;
  const [cal, pro] = within(block)
    .getAllByText(/^[\d,]+$/)
    .map((el) => Number(el.textContent?.replace(/,/g, '')));
  return { cal, pro };
}

/** Open the Progress screen from the card on Home. */
async function openProgress(u: UserEvent) {
  await u.click(screen.getByText(/still to eat today/i).closest('button') as HTMLElement);
}

describe('the home ring', () => {
  it(
    'starts the day at the full target, because nothing has been eaten',
    async () => {
      const u = user();
      render(<AthlyApp navPrimary="Even tabs" />);
      await reachHome(u);

      const { cal, pro } = stillToEat();
      // Whatever the targets work out to for this athlete, all of it is still to
      // eat. The old code answered `target - 1840` here no matter what.
      expect(cal).toBeGreaterThan(1500);
      expect(pro).toBeGreaterThan(50);
      expect(screen.getByText('0%')).toBeInTheDocument();
    },
    SLOW,
  );

  it(
    'moves when a meal is logged',
    async () => {
      const u = user();
      render(<AthlyApp navPrimary="Even tabs" />);
      await reachHome(u);

      const before = stillToEat();
      await u.click(screen.getByRole('button', { name: /ate it/i }));

      const after = stillToEat();
      expect(after.cal).toBeLessThan(before.cal);
      expect(after.pro).toBeLessThan(before.pro);
      expect(screen.queryByText('0%')).not.toBeInTheDocument();
    },
    SLOW,
  );

  it(
    'offers the next meal rather than the one just logged',
    async () => {
      const u = user();
      render(<AthlyApp navPrimary="Even tabs" />);
      await reachHome(u);

      // Breakfast leads the day before anything is logged — the prototype used to
      // skip the first two slots on the assumption they were already eaten, which
      // was true at the hour the screenshot was taken and at no other.
      const lead = leadMeal();
      expect(MEALS_BY_NAME[lead].slot).toBe('Breakfast');
      expect(within(planArea()).getAllByText(lead).length).toBeGreaterThan(0);

      await u.click(screen.getByRole('button', { name: /ate it/i }));
      expect(within(planArea()).queryByText(lead)).not.toBeInTheDocument();
    },
    SLOW,
  );
});

describe('the log tab', () => {
  it(
    'says so when there is nothing to show, instead of inventing a history',
    async () => {
      const u = user();
      render(<AthlyApp navPrimary="Even tabs" />);
      await reachHome(u);
      await u.click(screen.getByRole('button', { name: /^log$/i }));

      expect(await screen.findByText(/nothing logged yet/i)).toBeInTheDocument();
      // The four entries that used to live here — "Rice cakes & honey · Monday"
      // among them — were shown to everyone, every day, forever.
      expect(screen.queryByText(/rice cakes & honey/i)).not.toBeInTheDocument();
    },
    SLOW,
  );

  it(
    'lists what was actually logged',
    async () => {
      const u = user();
      render(<AthlyApp navPrimary="Even tabs" />);
      await reachHome(u);
      const lead = leadMeal();
      await u.click(screen.getByRole('button', { name: /ate it/i }));
      await u.click(screen.getByRole('button', { name: /^log$/i }));

      // Exact text, not a pattern: the toast that confirms the log also names the
      // meal, and only the list row is the meal's own name and nothing else.
      expect(await screen.findByText(lead)).toBeInTheDocument();
      expect(screen.getByText(/this morning/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^logged$/i })).toBeInTheDocument();
    },
    SLOW,
  );

  it(
    'takes an entry back when the same button is tapped again',
    async () => {
      const u = user();
      render(<AthlyApp navPrimary="Even tabs" />);
      await reachHome(u);
      await u.click(screen.getByRole('button', { name: /ate it/i }));
      const after = stillToEat();

      await u.click(screen.getByRole('button', { name: /^log$/i }));
      await u.click(await screen.findByRole('button', { name: /^logged$/i }));

      await u.click(screen.getByRole('button', { name: /^home$/i }));
      // A mis-tap is 620 calories sitting on the ring all day otherwise.
      expect(stillToEat().cal).toBeGreaterThan(after.cal);
    },
    SLOW,
  );
});

describe('the progress tab', () => {
  it(
    'asserts nothing about an athlete it has no data on',
    async () => {
      const u = user();
      render(<AthlyApp navPrimary="Even tabs" />);
      await reachHome(u);
      await openProgress(u);

      expect(await screen.findByText(/nothing logged yet/i)).toBeInTheDocument();
      // Every one of these was a literal, shown to every user as a fact about
      // themselves.
      expect(screen.queryByText(/86%/)).not.toBeInTheDocument();
      expect(screen.queryByText(/up from 71%/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/what athly learned/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/you swap eggs out/i)).not.toBeInTheDocument();
    },
    SLOW,
  );

  it(
    'counts the days it does have',
    async () => {
      const u = user();
      render(<AthlyApp navPrimary="Even tabs" />);
      await reachHome(u);
      await u.click(screen.getByRole('button', { name: /ate it/i }));
      await openProgress(u);

      expect(await screen.findByText('1/7')).toBeInTheDocument();
      expect(screen.getByText(/you logged food on 1 of the last 7 days/i)).toBeInTheDocument();
    },
    SLOW,
  );
});
