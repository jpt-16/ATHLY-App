import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { UserEvent } from '@testing-library/user-event';

import { AthlyApp } from './AthlyApp';
import { SLOW, reachHome } from './walkthrough';

/**
 * Weight, water and sleep on the Progress tab.
 *
 * Local-only, so nothing here touches Supabase: this checks that what the
 * athlete types becomes what the screen states. The persistence path is the
 * same optimistic write the food log uses and is covered by the round-trip
 * suite.
 */

const user = () => userEvent.setup();

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 7, 19, 9, 0));
});

afterEach(() => vi.useRealTimers());

async function openProgress(u: UserEvent) {
  await u.click(screen.getByText(/still to eat today/i).closest('button') as HTMLElement);
}

describe('the body cards', () => {
  it(
    'says it has no weigh-ins rather than drawing a chart of none',
    async () => {
      const u = user();
      render(<AthlyApp navPrimary="Even tabs" />);
      await reachHome(u);
      await openProgress(u);

      expect(await screen.findByText(/no weigh-ins yet/i)).toBeInTheDocument();
      // An empty chart with an axis would look like a measurement of zero.
      expect(screen.queryByLabelText(/weight over time/i)).not.toBeInTheDocument();
    },
    SLOW,
  );

  it(
    'states the weight it was given, and draws it',
    async () => {
      const u = user();
      render(<AthlyApp navPrimary="Even tabs" />);
      await reachHome(u);
      await openProgress(u);

      await u.type(screen.getByLabelText(/weight in pounds/i), '171.4');
      await u.click(screen.getByRole('button', { name: /log today's weight/i }));

      expect(await screen.findByText('171.4 lb')).toBeInTheDocument();
      expect(screen.getByText(/one weigh-in so far/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/weight over time/i)).toBeInTheDocument();
    },
    SLOW,
  );

  it(
    'refuses a weight no scale would show',
    async () => {
      const u = user();
      render(<AthlyApp navPrimary="Even tabs" />);
      await reachHome(u);
      await openProgress(u);

      await u.type(screen.getByLabelText(/weight in pounds/i), '1710');
      await u.click(screen.getByRole('button', { name: /log today's weight/i }));

      // Refused here rather than by Postgres after a round trip.
      expect(await screen.findByText(/between 40 and 700/i)).toBeInTheDocument();
      expect(screen.getByText(/no weigh-ins yet/i)).toBeInTheDocument();
    },
    SLOW,
  );

  it(
    'counts water a glass at a time, and can take one back',
    async () => {
      const u = user();
      render(<AthlyApp navPrimary="Even tabs" />);
      await reachHome(u);
      await openProgress(u);

      await u.click(screen.getByRole('button', { name: /add a glass/i }));
      await u.click(screen.getByRole('button', { name: /add a glass/i }));
      expect(await screen.findByText(/^0\.5 L of/)).toBeInTheDocument();

      await u.click(screen.getByRole('button', { name: /undo/i }));
      expect(await screen.findByText(/^0\.3 L of/)).toBeInTheDocument();
    },
    SLOW,
  );

  it(
    'turns hours slept into hours and minutes',
    async () => {
      const u = user();
      render(<AthlyApp navPrimary="Even tabs" />);
      await reachHome(u);
      await openProgress(u);

      await u.type(screen.getByLabelText(/hours slept last night/i), '7.5');
      await u.click(screen.getByRole('button', { name: /log last night's sleep/i }));

      expect(await screen.findByText('7h 30m')).toBeInTheDocument();
    },
    SLOW,
  );
});
