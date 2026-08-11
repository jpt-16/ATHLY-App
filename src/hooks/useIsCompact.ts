import { useSyncExternalStore } from 'react';

/**
 * True when the viewport is too narrow for the desktop presentation — a drawn
 * phone bezel with the app inside it — to make sense, and the app should fill
 * the screen instead.
 *
 * The breakpoint is the frame's own width (402px) plus the page padding either
 * side, rounded up: below it the bezel no longer fits, above it there is room
 * to draw it. That is a layout fact rather than a device guess, so it does not
 * need revisiting when phones change size.
 *
 * **Defaults to `false` — the framed branch — when `matchMedia` is missing.**
 * jsdom does provide it but cannot evaluate a query, so it reports `false` for
 * everything; either way the tests and the pixel-diff baselines get the framed
 * layout they are written against, and a test that wants the compact branch
 * stubs `window.matchMedia` explicitly.
 *
 * `useSyncExternalStore` rather than `useState` + `useEffect`: the viewport is
 * an external store, and reading it through the effect route means the first
 * paint uses a value captured before subscribing — which then needs a
 * corrective `setState` inside the effect to cover a resize in that gap. This
 * hook has no such gap.
 */
const COMPACT_QUERY = '(max-width: 500px)';

function query(): MediaQueryList | null {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return null;
  return window.matchMedia(COMPACT_QUERY);
}

function subscribe(onStoreChange: () => void): () => void {
  const mql = query();
  if (!mql) return () => {};
  mql.addEventListener('change', onStoreChange);
  return () => mql.removeEventListener('change', onStoreChange);
}

const getSnapshot = (): boolean => query()?.matches ?? false;

/** No DOM to measure, so the framed layout — the same answer jsdom gives. */
const getServerSnapshot = (): boolean => false;

export function useIsCompact(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
