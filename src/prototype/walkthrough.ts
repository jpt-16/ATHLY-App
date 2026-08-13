import { screen, within } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';

import { MEALS } from './data';

/**
 * Getting an athlete from the intro screen to Home, for tests.
 *
 * Thirteen questions and a four-second build animation stand between the first
 * screen and anything worth asserting on, and more than one test file needs to
 * cross them. Entering the app the way an athlete does is the only way to catch
 * a value that is right in the view model and wrong on the screen, so the walk
 * is shared rather than shortcut.
 *
 * Not a `.test.ts` file, so vitest does not collect it as a suite.
 */

/** Longer than the default five seconds, because the walk really does take it. */
export const SLOW = 30_000;

/** The thirteen answers, ending on the targets screen. */
export async function runOnboarding(u: UserEvent) {
  await u.click(screen.getByRole('button', { name: /let's set you up/i }));
  await u.type(screen.getByPlaceholderText(/jordan/i), 'Sam');
  const next = () => u.click(screen.getByRole('button', { name: /^next$/i }));
  await next();
  await u.click(screen.getByRole('button', { name: /gain lean weight/i }));
  await u.click(await screen.findByRole('button', { name: /^male/i }));
  await screen.findByRole('heading', { name: /a few numbers/i });
  await next();
  await next();
  await u.click(screen.getByRole('button', { name: /^soccer$/i }));
  await next();
  await next();
  await u.click(screen.getByRole('button', { name: /^chicken$/i }));
  await next();
  await u.click(screen.getByRole('button', { name: /nothing to avoid/i }));
  await u.click(screen.getByRole('button', { name: /nothing to avoid/i }));
  await u.click(screen.getByRole('button', { name: /i can follow a recipe/i }));
  await u.click(await screen.findByRole('button', { name: /middle of the road/i }));
  await u.click(await screen.findByRole('button', { name: /about 20 minutes/i }));
}

/**
 * Onboard, then sit through the build animation and land on Home.
 *
 * Callers render with `navPrimary="Even tabs"`: the default nav puts the Log tab
 * behind an unlabelled `+` button (`AppShell.tsx`), which a test cannot address
 * and a screen reader cannot announce either. The even-tab layout is an existing
 * design variant, not a change to anything under test.
 */
export async function reachHome(u: UserEvent) {
  await runOnboarding(u);
  await u.click(await screen.findByRole('button', { name: /build my week/i }));
  await screen.findByText(/still to eat today/i, undefined, { timeout: 8000 });
}

/**
 * The plan list on Home, without the toast.
 *
 * Logging a meal names it in a toast — "Peanut butter banana oats logged — 142g
 * protein to go" — so a document-wide query still finds the meal after it has
 * left the plan. This asks the hero card and the list below it.
 */
export function planArea(): HTMLElement {
  return screen.getByText(/eat this next/i).closest('div')!.parentElement as HTMLElement;
}

/** Meals by their display name, for asserting on what the screen shows. */
export const MEALS_BY_NAME = Object.fromEntries(Object.values(MEALS).map((m) => [m.name, m]));

/**
 * The meal Home is currently leading with, read off the screen.
 *
 * Tests used to name it — "Peanut butter banana oats" — because the planner
 * returned the first safe candidate and so served the identical day to everyone,
 * forever. It varies by date now, which is the point of a weekly plan, so the
 * name is read back instead of frozen.
 */
export function leadMeal(): string {
  const area = planArea();
  const found = Object.values(MEALS)
    .map((m) => ({ name: m.name, el: within(area).queryAllByText(m.name)[0] }))
    .filter((x): x is { name: string; el: HTMLElement } => !!x.el);
  // Document order: the hero card renders above the rest of the day.
  found.sort((a, b) => (a.el.compareDocumentPosition(b.el) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
  if (!found.length) throw new Error('no meal is on screen');
  return found[0].name;
}
