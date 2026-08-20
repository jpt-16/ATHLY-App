import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { UserEvent } from '@testing-library/user-event';

import { AthlyApp } from './AthlyApp';
import { SLOW, reachHome } from './walkthrough';
import { MIN_AGE, invalidHeight, invalidReason, fieldFor } from './profileFields';

/**
 * Changing an answer, and everything that follows from it.
 *
 * Every Profile row used to end at `toast('editor would open')`, so an athlete
 * who gained ten pounds, changed sport or developed an allergy had exactly one
 * option: delete the account and start again. These check that an edit lands
 * *and* that the numbers it feeds move with it — the point is not the sheet, it
 * is that `computeTargets` is a pure function of these answers.
 */

const user = () => userEvent.setup();

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 7, 19, 9, 0));
});

afterEach(() => vi.useRealTimers());

async function openProfile(u: UserEvent) {
  await u.click(screen.getByRole('button', { name: /^profile$/i }));
}

/** The calorie figure Profile states, as a number. */
function dailyCalories(): number {
  const row = screen.getByText('Daily calories').closest('button');
  return Number((row?.textContent ?? '').replace(/[^\d]/g, ''));
}

describe('the profile editor', () => {
  it(
    'changes the goal weight, and every number derived from it',
    async () => {
      const u = user();
      render(<AthlyApp navPrimary="Even tabs" />);
      await reachHome(u);
      await openProfile(u);

      const before = dailyCalories();
      await u.click(screen.getByText('Goal weight').closest('button') as HTMLElement);
      const input = await screen.findByLabelText(/what are you aiming for/i);
      await u.clear(input);
      await u.type(input, '200');
      await u.click(screen.getByRole('button', { name: /^save$/i }));

      expect(await screen.findByText('200 lb')).toBeInTheDocument();
      // Targets are computed from the goal weight, so a heavier goal is a
      // bigger number without anything here recomputing it.
      expect(dailyCalories()).toBeGreaterThan(before);
    },
    SLOW,
  );

  it(
    'refuses an age below the floor the privacy policy promises',
    async () => {
      const u = user();
      render(<AthlyApp navPrimary="Even tabs" />);
      await reachHome(u);
      await openProfile(u);

      await u.click(screen.getByText('Age').closest('button') as HTMLElement);
      const input = await screen.findByLabelText(/how old are you/i);
      await u.clear(input);
      await u.type(input, '11');
      await u.click(screen.getByRole('button', { name: /^save$/i }));

      expect(await screen.findByText(/for athletes 13 and over/i)).toBeInTheDocument();
    },
    SLOW,
  );

  it(
    'lets a choice be picked rather than typed',
    async () => {
      const u = user();
      render(<AthlyApp navPrimary="Even tabs" />);
      await reachHome(u);
      await openProfile(u);

      await u.click(screen.getByText('Goal').closest('button') as HTMLElement);
      await u.click(await screen.findByRole('button', { name: /lose fat steadily/i }));
      await u.click(screen.getByRole('button', { name: /^save$/i }));

      expect(await screen.findByText('Lose fat steadily')).toBeInTheDocument();
    },
    SLOW,
  );

  it(
    'leaves everything alone when the sheet is dismissed',
    async () => {
      const u = user();
      render(<AthlyApp navPrimary="Even tabs" />);
      await reachHome(u);
      await openProfile(u);

      const before = dailyCalories();
      await u.click(screen.getByText('Weight').closest('button') as HTMLElement);
      const input = await screen.findByLabelText(/what do you weigh/i);
      await u.clear(input);
      await u.type(input, '250');
      await u.click(screen.getByRole('button', { name: /cancel/i }));

      expect(dailyCalories()).toBe(before);
    },
    SLOW,
  );
});

describe('the rules, on their own', () => {
  it('states the age floor once, and it is the one the policy promises', () => {
    expect(MIN_AGE).toBe(13);
    expect(invalidReason(fieldFor('Age')!, '12')).toMatch(/13 and over/);
    expect(invalidReason(fieldFor('Age')!, '13')).toBeNull();
  });

  it('bounds a weight to what a scale could show', () => {
    const weight = fieldFor('Weight')!;
    expect(invalidReason(weight, '39')).toMatch(/below 40/);
    expect(invalidReason(weight, '701')).toMatch(/above 700/);
    expect(invalidReason(weight, '171.4')).toBeNull();
  });

  it('says which of the two height boxes is wrong', () => {
    expect(invalidHeight('5', '12')).toMatch(/inches go from 0 to 11/i);
    expect(invalidHeight('2', '0')).toMatch(/not a height/i);
    expect(invalidHeight('5', '10')).toBeNull();
  });

  it('refuses a choice that is not on the list', () => {
    expect(invalidReason(fieldFor('Goal')!, 'sideways')).toBe('Pick one of these.');
  });
});
