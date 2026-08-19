/**
 * Times of day, in the two forms this app needs them.
 *
 * The schedule stores and shows `'4:30 pm'`, because that is what an athlete
 * reads. `<input type="time">` speaks `'16:30'` and nothing else. Both
 * conversions live here so the screens never do string surgery on a time, and
 * so the round trip can be tested without one.
 */

/** Minutes from midnight, or `null` if this is not a time we wrote. */
export function toMinutes(display: string): number | null {
  const m = /^(\d{1,2}):(\d{2})\s*(am|pm)$/i.exec(display.trim());
  if (!m) return null;
  const hour12 = Number(m[1]);
  const minute = Number(m[2]);
  if (hour12 < 1 || hour12 > 12 || minute > 59) return null;
  const pm = m[3].toLowerCase() === 'pm';
  const hour24 = (hour12 % 12) + (pm ? 12 : 0);
  return hour24 * 60 + minute;
}

/** `975` → `'4:15 pm'`. The form the schedule stores and every screen shows. */
export function toDisplay(minutes: number): string {
  const wrapped = ((minutes % 1440) + 1440) % 1440;
  const hour24 = Math.floor(wrapped / 60);
  const minute = wrapped % 60;
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${hour12}:${String(minute).padStart(2, '0')} ${hour24 < 12 ? 'am' : 'pm'}`;
}

/** `'4:15 pm'` → `'16:15'`, the only thing `<input type="time">` accepts. */
export function toInputValue(display: string): string {
  const minutes = toMinutes(display);
  if (minutes === null) return '';
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

/** `'16:15'` back to `'4:15 pm'`, or `''` for the empty input. */
export function fromInputValue(value: string): string {
  const m = /^(\d{2}):(\d{2})$/.exec(value.trim());
  if (!m) return '';
  const hour = Number(m[1]);
  const minute = Number(m[2]);
  if (hour > 23 || minute > 59) return '';
  return toDisplay(hour * 60 + minute);
}

/**
 * Every half hour between two times, as quick picks.
 *
 * The schedule used to offer six fixed times — 6:00 am, 7:00 am and four in the
 * afternoon — which covered the practice that starts at 4:30 and nothing else. A
 * 5:45 lift or a 12:30 game had no answer, and the athlete's real week had to be
 * rounded to fit the app. Half-hour steps across the hours anyone actually
 * trains cover most of it, and the picker beside them covers the rest.
 */
function every30(fromHour: number, toHour: number): string[] {
  const out: string[] = [];
  for (let m = fromHour * 60; m <= toHour * 60; m += 30) out.push(toDisplay(m));
  return out;
}

/** Practices and games: 5 am to 10 pm. */
export const TIMES: string[] = every30(5, 22);

/** Lifts, which start earlier and end later than a team session. */
export const LIFT_TIMES: string[] = every30(5, 21);
