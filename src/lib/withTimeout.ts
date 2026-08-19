/**
 * Bound a promise that has no business taking forever.
 *
 * The app's startup waits on two answers from Supabase: whether anyone is
 * signed in, and what that person's account holds. Both are written as plain
 * `await`s with their failures handled — but a request that never settles is
 * not a failure. It is silence, and silence walks straight past every `catch`
 * in the file. The athlete gets the splash screen and no way out of it.
 *
 * So the rule is: anything the first paint waits on gets a deadline. A rejected
 * promise the surrounding code already knows how to handle is strictly better
 * than a pending one it does not.
 *
 * The timer is cleared on settle either way, so this does not keep a test's
 * fake clock — or a real event loop — alive after the work is done.
 */
export function withTimeout<T>(work: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label} did not answer within ${ms}ms`));
    }, ms);

    work.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error instanceof Error ? error : new Error(String(error)));
      },
    );
  });
}

/**
 * How long the first paint will wait for Supabase before giving up on it.
 *
 * Long enough that a slow connection is not mistaken for a broken one, short
 * enough that nobody sits looking at a logo wondering whether to reload. Both
 * startup waits use the same number deliberately: they are the same promise to
 * the athlete, which is "the app is opening".
 */
export const STARTUP_TIMEOUT_MS = 8000;
