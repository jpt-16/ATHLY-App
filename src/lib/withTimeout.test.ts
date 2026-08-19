import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { STARTUP_TIMEOUT_MS, withTimeout } from './withTimeout';

/**
 * The deadline that keeps a silent request from becoming a blank screen.
 *
 * The case that matters is the third one: a promise that never settles used to
 * walk past every `catch` in the startup path, because silence is not an error.
 */
describe('withTimeout', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('passes a value through untouched', async () => {
    await expect(withTimeout(Promise.resolve('ok'), 1000, 'work')).resolves.toBe('ok');
  });

  it('passes a rejection through untouched', async () => {
    const boom = new Error('boom');
    await expect(withTimeout(Promise.reject(boom), 1000, 'work')).rejects.toBe(boom);
  });

  it('rejects a promise that never settles, naming what did not answer', async () => {
    const forever = new Promise<string>(() => {});
    const bounded = withTimeout(forever, 5000, 'Reading your account');
    const settled = expect(bounded).rejects.toThrow(/Reading your account did not answer/);
    await vi.advanceTimersByTimeAsync(5000);
    await settled;
  });

  it('does not fire the deadline once the work has settled', async () => {
    await expect(withTimeout(Promise.resolve(1), 1000, 'work')).resolves.toBe(1);
    // A timer left armed would reject an already-resolved promise here, which
    // surfaces as an unhandled rejection rather than a failed assertion.
    await vi.advanceTimersByTimeAsync(5000);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('waits long enough that a slow connection is not called a broken one', () => {
    expect(STARTUP_TIMEOUT_MS).toBeGreaterThanOrEqual(5000);
  });
});
