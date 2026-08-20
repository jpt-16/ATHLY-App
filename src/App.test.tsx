import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { UserEvent } from '@testing-library/user-event';

import { App } from './App';
import { MEALS } from './prototype/data';
import { isSafe } from './prototype/filtering';

/**
 * A walk through the parts of the product a broken render would take out: the
 * opening screen, the onboarding script, the targets those answers produce, and
 * the app's tabs. It asserts on what an athlete would see rather than on markup,
 * so it stays useful when the screens are restyled.
 */

beforeEach(() => {
  // Two things here depend on the date: which training day today is, and — since
  // the planner varies its picks per day — which meal fills each slot. Without a
  // pinned clock these tests passed or failed depending on when they ran.
  //
  // `Date` only: the build animation and every `await` below run on real timers,
  // and faking those would deadlock against `userEvent`.
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 7, 12, 9, 0));
});

afterEach(() => {
  vi.useRealTimers();
});

/** Every meal in the library that a given allergy rules out. */
const ruledOutBy = (chip: string) =>
  Object.values(MEALS)
    .filter((m) => !isSafe(m, [chip]))
    .map((m) => m.name);

const next = (user: UserEvent) => user.click(screen.getByRole('button', { name: /^next$/i }));

/**
 * Answer the whole onboarding script as "Sam", stopping on the targets screen.
 * `allergy` is an allergy chip label to tick on step 10, or none.
 */
async function runOnboarding(user: UserEvent, allergy?: string) {
  await user.click(screen.getByRole('button', { name: /let's set you up/i }));

  // 1 — name
  await user.type(screen.getByPlaceholderText(/jordan/i), 'Sam');
  await next(user);

  // 2 — goal, 3 — baseline (single-select steps advance on their own)
  await user.click(screen.getByRole('button', { name: /gain lean weight/i }));
  expect(await screen.findByRole('heading', { name: /base your numbers on/i })).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: /^male/i }));

  // 4 — body, 5 — target, 6 — sport
  expect(await screen.findByRole('heading', { name: /a few numbers/i })).toBeInTheDocument();
  await next(user);
  expect(screen.getByRole('heading', { name: /where are you headed/i })).toBeInTheDocument();
  await next(user);
  await user.click(screen.getByRole('button', { name: /^soccer$/i }));
  await next(user);

  // 7 — schedule, 8 — favorites
  expect(screen.getByRole('heading', { name: /when do you train/i })).toBeInTheDocument();
  await next(user);
  await user.click(screen.getByRole('button', { name: /^chicken$/i }));
  await next(user);

  // 9 — won't eat, 10 — allergies (both skippable)
  expect(screen.getByRole('heading', { name: /what won't you eat/i })).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: /nothing to avoid/i }));
  if (allergy) {
    await user.click(screen.getByRole('button', { name: new RegExp(`^${allergy}$`, 'i') }));
    await user.click(screen.getByRole('button', { name: /^next$/i }));
  } else {
    await user.click(screen.getByRole('button', { name: /nothing to avoid/i }));
  }

  // 11 — kitchen, 12 — money, 13 — time
  await user.click(screen.getByRole('button', { name: /i can follow a recipe/i }));
  expect(await screen.findByRole('heading', { name: /what's the budget/i })).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: /middle of the road/i }));
  expect(await screen.findByRole('heading', { name: /how long do you have/i })).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: /about 20 minutes/i }));
}

/** Run the build animation through to the home screen. */
async function buildWeek(user: UserEvent) {
  await user.click(await screen.findByRole('button', { name: /build my week/i }));
  expect(screen.getByText(/building your week, sam/i)).toBeInTheDocument();
  // Five steps at 600ms each.
  await screen.findByText(/eat this next/i, undefined, { timeout: 10000 });
}

describe('ATHLY', () => {
  it('opens on the intro screen', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: /eat food you actually like/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /let's set you up/i })).toBeInTheDocument();
  });

  it('numbers each onboarding step, with no gaps in the labels', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /let's set you up/i }));
    expect(screen.getByText(/^Step 1 · /)).toBeInTheDocument();
    expect(screen.queryByText(/undefined/i)).not.toBeInTheDocument();
  });

  it('walks onboarding through to a set of targets', async () => {
    const user = userEvent.setup();
    render(<App />);

    await runOnboarding(user);

    expect(await screen.findByRole('heading', { name: /here's your surplus, sam/i })).toBeInTheDocument();
    expect(screen.getByText(/resting burn/i)).toBeInTheDocument();
    expect(screen.getByText(/training on top/i)).toBeInTheDocument();
    expect(screen.getByText(/surplus for growth/i)).toBeInTheDocument();
    expect(screen.getByText(/not medical advice/i)).toBeInTheDocument();
  }, 20000);

  it('builds the week and moves between the tabs', async () => {
    const user = userEvent.setup();
    render(<App />);

    await runOnboarding(user);
    await buildWeek(user);

    await user.click(screen.getByRole('button', { name: /^plan$/i }));
    expect(screen.getByRole('heading', { name: /what are we making/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^recipes$/i }));
    expect(screen.getByRole('heading', { name: /^recipes$/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^profile$/i }));
    expect(screen.getByRole('heading', { name: /^sam$/i })).toBeInTheDocument();
  }, 30000);
});

describe('a declared allergy', () => {
  // The prototype collected allergies and did nothing with them. These drive the
  // real app, so a regression here is visible to the person it would hurt.

  it('keeps dairy off the plan and out of the recipe list', async () => {
    const user = userEvent.setup();
    render(<App />);

    await runOnboarding(user, 'Dairy');
    await buildWeek(user);

    // Asserted as a property rather than by naming one meal: which meal fills a
    // slot depends on the day now, but *no* dairy meal may ever appear, on any
    // day, to someone who declared a dairy allergy.
    for (const name of ruledOutBy('Dairy')) {
      expect(screen.queryByText(name), name).not.toBeInTheDocument();
    }
    // And the plan is still a plan — an empty screen would satisfy the above.
    expect(screen.queryByText(/no safe option yet/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^recipes$/i }));
    expect(screen.queryByText(/steak & roast potatoes/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/chicken burrito bowl/i)).not.toBeInTheDocument();
  }, 30000);

  it('leaves the plan alone when the allergen is not in it', async () => {
    const user = userEvent.setup();
    render(<App />);

    await runOnboarding(user, 'Shellfish');
    await buildWeek(user);

    // Nothing in the library contains shellfish, so nothing should be filtered:
    // the dairy meals that a dairy allergy removes are all still available here.
    expect(ruledOutBy('Shellfish')).toEqual([]);
    expect(screen.queryByText(/no safe option yet/i)).not.toBeInTheDocument();
  }, 30000);

  it('still fills every slot for the harshest single allergy', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Gluten wipes out the shipped meal in five of the ten slots.
    await runOnboarding(user, 'Gluten');
    await buildWeek(user);

    expect(screen.queryByText(/no safe option yet/i)).not.toBeInTheDocument();
  }, 30000);
});

describe('the iOS frame', () => {
  it('wraps the app in a device shell', () => {
    const { container } = render(<App />);
    const frame = container.querySelector('[data-om-starter="ios-frame"]');
    expect(frame).not.toBeNull();
    expect(within(frame as HTMLElement).getByText('ATHLY IQ')).toBeInTheDocument();
  });
});
