import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { AthlyApp } from './AthlyApp';
import { SLOW, reachHome } from './walkthrough';

/**
 * Typing in a food the app has never heard of.
 *
 * Everything loggable used to come from the plan, the recipe library or a
 * barcode. A sandwich somebody's mum makes fits none of those, and "log it from
 * your plan" is not an answer when the plan does not contain it — so "My foods"
 * was a tab that could only ever be empty, above a button that raised a toast
 * saying the feature did not exist.
 */

const user = () => userEvent.setup();

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 7, 19, 9, 0));
});

afterEach(() => vi.useRealTimers());

async function openMyFoods(u: ReturnType<typeof user>) {
  await u.click(screen.getByRole('button', { name: /^log$/i }));
  await u.click(screen.getByRole('button', { name: /my foods/i }));
}

describe('foods of your own', () => {
  it(
    'logs one, and keeps it for next time',
    async () => {
      const u = user();
      render(<AthlyApp navPrimary="Even tabs" />);
      await reachHome(u);
      await openMyFoods(u);

      await u.type(screen.getByLabelText(/what was it/i), "Mum's turkey sandwich");
      await u.type(screen.getByLabelText(/^calories$/i), '480');
      await u.type(screen.getByLabelText(/protein/i), '32');
      await u.click(screen.getByRole('button', { name: /log it/i }));

      // Still on the tab, now listed — the log is the library, so there is no
      // second place for it to live.
      expect(await screen.findByText("Mum's turkey sandwich")).toBeInTheDocument();
      expect(screen.getByText(/480 cal/)).toBeInTheDocument();
    },
    SLOW,
  );

  it(
    'insists on calories and refuses to invent them',
    async () => {
      const u = user();
      render(<AthlyApp navPrimary="Even tabs" />);
      await reachHome(u);
      await openMyFoods(u);

      await u.type(screen.getByLabelText(/what was it/i), 'Something');
      await u.click(screen.getByRole('button', { name: /log it/i }));

      expect(await screen.findByText(/calories are the one number/i)).toBeInTheDocument();
    },
    SLOW,
  );

  it(
    'wants a name it can be found by',
    async () => {
      const u = user();
      render(<AthlyApp navPrimary="Even tabs" />);
      await reachHome(u);
      await openMyFoods(u);

      await u.type(screen.getByLabelText(/^calories$/i), '300');
      await u.click(screen.getByRole('button', { name: /log it/i }));

      expect(await screen.findByText(/give it a name/i)).toBeInTheDocument();
    },
    SLOW,
  );

  it(
    'explains itself rather than promising a feature that does not exist',
    async () => {
      const u = user();
      render(<AthlyApp navPrimary="Even tabs" />);
      await reachHome(u);
      await openMyFoods(u);

      expect(screen.getByText(/no foods of your own yet/i)).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /create a food/i })).not.toBeInTheDocument();
    },
    SLOW,
  );
});
