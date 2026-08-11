import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useIsCompact } from './useIsCompact';

/**
 * jsdom does implement `matchMedia`, but it cannot evaluate a media query, so
 * everything reports `matches: false` — which is the framed branch, and why the
 * rest of the suite renders the framed layout without any setup here. Driving
 * the compact branch therefore needs a stub, and so does the case where
 * `matchMedia` is absent altogether (older WebViews, and any non-DOM renderer).
 */
type Listener = (e: MediaQueryListEvent) => void;

function stubMatchMedia(initial: boolean) {
  const listeners = new Set<Listener>();
  let matches = initial;
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches,
    media: query,
    addEventListener: (_: string, fn: Listener) => listeners.add(fn),
    removeEventListener: (_: string, fn: Listener) => listeners.delete(fn),
  }));
  return {
    set(next: boolean) {
      matches = next;
      for (const fn of listeners) fn({ matches: next } as MediaQueryListEvent);
    },
    get listenerCount() {
      return listeners.size;
    },
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useIsCompact', () => {
  it('falls back to the framed layout when matchMedia is missing', () => {
    vi.stubGlobal('matchMedia', undefined);
    const { result } = renderHook(() => useIsCompact());
    expect(result.current).toBe(false);
  });

  it('is framed under plain jsdom, which every other test relies on', () => {
    // No stub: jsdom's own matchMedia reports false for any query, which is the
    // framed branch — what the rest of the suite and the visual baselines are
    // written against.
    const { result } = renderHook(() => useIsCompact());
    expect(result.current).toBe(false);
  });

  it('reports compact on a narrow viewport', () => {
    stubMatchMedia(true);
    const { result } = renderHook(() => useIsCompact());
    expect(result.current).toBe(true);
  });

  it('reports framed on a wide viewport', () => {
    stubMatchMedia(false);
    const { result } = renderHook(() => useIsCompact());
    expect(result.current).toBe(false);
  });

  it('follows the viewport across a resize', () => {
    const mql = stubMatchMedia(false);
    const { result } = renderHook(() => useIsCompact());
    expect(result.current).toBe(false);

    act(() => mql.set(true));
    expect(result.current).toBe(true);

    act(() => mql.set(false));
    expect(result.current).toBe(false);
  });

  it('stops listening when unmounted', () => {
    const mql = stubMatchMedia(false);
    const { unmount } = renderHook(() => useIsCompact());
    expect(mql.listenerCount).toBe(1);
    unmount();
    expect(mql.listenerCount).toBe(0);
  });
});
