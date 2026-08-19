import { LocalNotifications } from '@capacitor/local-notifications';

import { isNative } from '../lib/platform';

/**
 * Reminders to log, scheduled on the device.
 *
 * **Local notifications, not push.** Push would need an APNs certificate, a
 * paid Apple Developer membership and a server willing to decide, every
 * evening, which athletes have not logged. Local notifications need none of
 * that and do the actual job: this app's retention problem is not that people
 * dislike it, it is that they forget it exists between meals.
 *
 * The trade is that the device cannot check anything before it fires. A local
 * notification is scheduled once and repeats blind, so it will nudge an athlete
 * who has already logged dinner. That is why the copy asks rather than
 * accuses — "did dinner happen?" survives being wrong; "you forgot dinner"
 * does not.
 *
 * Whether they are on is a device preference rather than an account one, and it
 * is stored as such: notifications belong to the phone that shows them, and
 * signing in on a tablet should not start it buzzing.
 */

const CHANNEL = 'athly-log-reminders';

/** Fixed ids, so re-scheduling replaces rather than accumulates. */
const REMINDERS = [
  {
    id: 1,
    hour: 9,
    minute: 30,
    title: 'Breakfast in?',
    body: 'Log it and your ring is honest for the rest of the day.',
  },
  { id: 2, hour: 13, minute: 30, title: 'Lunch logged?', body: 'Takes a tap from your plan.' },
  { id: 3, hour: 20, minute: 0, title: 'How did today go?', body: 'Log dinner and see where you landed.' },
] as const;

export const REMINDERS_KEY = 'athly.reminders';

/** Whether this device has reminders switched on. Off until asked for. */
export function remindersOn(): boolean {
  try {
    return window.localStorage.getItem(REMINDERS_KEY) === 'on';
  } catch {
    // Private browsing, or storage disabled. Silence is the safe default.
    return false;
  }
}

function remember(on: boolean): void {
  try {
    window.localStorage.setItem(REMINDERS_KEY, on ? 'on' : 'off');
  } catch {
    // Nothing to do: the toggle still works for this session.
  }
}

export type ReminderResult = 'on' | 'off' | 'denied' | 'unavailable';

/**
 * Turn reminders on or off, and report what actually happened.
 *
 * Permission is the reason this returns a result rather than a boolean. iOS
 * asks once, ever; someone who said no gets `denied` for good and needs sending
 * to Settings, which is a different sentence from "off".
 */
export async function setReminders(on: boolean): Promise<ReminderResult> {
  if (!isNative) return 'unavailable';

  // Cancelling first makes this idempotent: scheduling over an existing set
  // would otherwise leave duplicates behind after a settings change.
  await LocalNotifications.cancel({ notifications: REMINDERS.map(({ id }) => ({ id })) }).catch(() => {});

  if (!on) {
    remember(false);
    return 'off';
  }

  const { display } = await LocalNotifications.requestPermissions();
  if (display !== 'granted') {
    remember(false);
    return 'denied';
  }

  await LocalNotifications.schedule({
    notifications: REMINDERS.map((r) => ({
      id: r.id,
      title: r.title,
      body: r.body,
      channelId: CHANNEL,
      // `repeats` with an `on` time is a daily alarm at that clock time, which
      // follows the athlete across timezones rather than drifting by the hours
      // they travelled.
      schedule: { on: { hour: r.hour, minute: r.minute }, repeats: true, allowWhileIdle: true },
    })),
  });
  remember(true);
  return 'on';
}
