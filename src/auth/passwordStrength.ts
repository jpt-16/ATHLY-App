/**
 * Refusing the passwords everybody picks.
 *
 * ## Why this exists, and what it is not
 *
 * Supabase can check a candidate password against HaveIBeenPwned's corpus of
 * breached credentials. That is the right way to do this, and it is a **Pro plan
 * feature** — unavailable on the plan this project is on. Until the plan
 * changes, the app's entire password policy was "at least 8 characters", which
 * accepts `password`, `12345678`, `iloveyou` and `football` — the exact
 * passwords the feature exists to stop.
 *
 * This closes most of that gap and is honest about the part it does not:
 *
 * - **It runs in the browser, so a determined person can skip it.** Supabase's
 *   version runs on the server and cannot be skipped. That is a real difference
 *   and this is not a replacement.
 * - **It is not defending against an attacker.** Nobody attacks a system by
 *   choosing a weak password for their own account. It is defending the athlete
 *   from a password that will be guessed, and someone who edits it out of the
 *   bundle to pick `qwerty123` has only harmed themselves.
 * - **A few hundred passwords is not five hundred million.** This catches the
 *   head of the distribution, which is where almost everybody lands. HIBP's
 *   k-anonymity API would catch the tail without sending the password anywhere,
 *   but it means a third-party request from a client used by minors and a
 *   `connect-src` entry in the CSP — a privacy trade to make deliberately, in
 *   the privacy review, not in passing here.
 *
 * The upgrade path, in order of preference: Supabase Pro, then HIBP, then this.
 */

/**
 * The head of every leaked-password list, lowercased.
 *
 * Drawn from the passwords that recur across public breach corpora. Kept short
 * enough to read and to ship — a few hundred entries is a couple of kilobytes,
 * and it is the first few hundred that matter: password choice is heavily
 * concentrated, so a small list rejects a large share of real attempts.
 *
 * Sports entries are deliberately over-represented for this audience.
 */
const COMMON = new Set([
  '123456',
  '123456789',
  '12345678',
  '1234567',
  '12345',
  '1234567890',
  '1234',
  'password',
  'password1',
  'password123',
  'passw0rd',
  'p@ssword',
  'p@ssw0rd',
  'qwerty',
  'qwerty123',
  'qwertyuiop',
  'qwerty12345',
  '1q2w3e4r',
  '1qaz2wsx',
  'abc123',
  'abcd1234',
  'a1b2c3d4',
  'asdfghjkl',
  'zxcvbnm',
  'asdf1234',
  'iloveyou',
  'princess',
  'sunshine',
  'welcome',
  'welcome1',
  'monkey',
  'dragon',
  'letmein',
  'trustno1',
  'master',
  'shadow',
  'superman',
  'batman',
  'michael',
  'jennifer',
  'jordan23',
  'harley',
  'ranger',
  'hunter',
  'buster',
  'thomas',
  'robert',
  'daniel',
  'joshua',
  'matthew',
  'andrew',
  'charlie',
  'jessica',
  'ashley',
  'nicole',
  'hannah',
  'samantha',
  'anthony',
  'william',
  'football',
  'baseball',
  'basketball',
  'soccer',
  'softball',
  'volleyball',
  'lacrosse',
  'wrestling',
  'swimming',
  'football1',
  'soccer123',
  'hockey',
  'sports',
  'athlete',
  'champion',
  'winner',
  'gymnast',
  'runner',
  'trackstar',
  'jordan',
  'lebron',
  'kobebryant',
  'messi',
  'ronaldo',
  'brady',
  'curry',
  'liverpool',
  'chelsea',
  'arsenal',
  'barcelona',
  'realmadrid',
  'yankees',
  'lakers',
  'cowboys',
  'steelers',
  'packers',
  'patriots',
  'celtics',
  'protein',
  'gains',
  'gainz',
  'workout',
  'fitness',
  'muscle',
  'beastmode',
  'letsgo',
  'training',
  'nutrition',
  'healthy',
  'gymrat',
  'admin',
  'administrator',
  'root',
  'guest',
  'test',
  'test123',
  'demo',
  'login',
  'user',
  'default',
  'changeme',
  'secret',
  'access',
  'temp123',
  'sunshine1',
  'flower',
  'butterfly',
  'chocolate',
  'cookie',
  'summer',
  'winter',
  'spring2024',
  'summer2024',
  'autumn',
  'freedom',
  'whatever',
  'starwars',
  'pokemon',
  'minecraft',
  'fortnite',
  'roblox',
  'nintendo',
  'xbox360',
  'playstation',
  'gamer123',
  'gaming',
  'twitch',
  'youtube',
  'snapchat',
  'instagram',
  'tiktok',
  'facebook',
  'spotify',
  'netflix',
  '000000',
  '111111',
  '123123',
  '121212',
  '112233',
  '654321',
  '666666',
  '696969',
  '777777',
  '888888',
  '999999',
  '11111111',
  '00000000',
  '123321',
  '987654321',
  '789456123',
  '147258369',
  '159753',
  '55555',
  '5555555',
  'zaq12wsx',
  'qazwsx',
  'qweasdzxc',
  'q1w2e3r4',
  'asdfasdf',
  'qwertyui',
  'michelle',
  'jonathan',
  'benjamin',
  'nathan',
  'brandon',
  'justin',
  'amanda',
  'melissa',
  'stephanie',
  'elizabeth',
  'victoria',
  'olivia',
  'computer',
  'internet',
  'samsung',
  'iphone',
  'android',
  'google',
  'mustang',
  'corvette',
  'ferrari',
  'harleydavidson',
  'chevrolet',
  'pepper',
  'cheese',
  'banana',
  'orange',
  'purple',
  'yellow',
  'silver',
  'george',
  'charlie1',
  'ginger',
  'jasper',
  'bailey',
  'maggie',
  'lucky',
  'family',
  'forever',
  'lovely',
  'angel',
  'baby',
  'sweetie',
  'honey',
  'nothing',
  'nopass',
  'nopassword',
  'trustme',
  'iamgod',
  'whocares',
  'blink182',
  'metallica',
  'nirvana',
  'slipknot',
  'greenday',
  'eminem',
  'liverpool1',
  'ilovegod',
  'jesus',
  'jesus123',
  'heaven',
  'blessed',
  'school',
  'college',
  'student',
  'homework',
  'teacher',
  'graduate',
  'newyork',
  'california',
  'chicago',
  'canada',
  'london',
  'texas',
]);

/** Sequences whose reversal is also a sequence, so both directions are covered. */
const RUNS = ['0123456789', 'abcdefghijklmnopqrstuvwxyz', 'qwertyuiop', 'asdfghjkl', 'zxcvbnm'];

/**
 * Strip the decoration people add to a common password to satisfy a rule.
 *
 * `Password1!` is `password` with a shift key and two keystrokes, and every list
 * of "strong password requirements" produces thousands of them. Trailing digits
 * and punctuation come off before the lookup so the base word is still caught.
 */
function base(password: string): string {
  return password.toLowerCase().replace(/[^a-z]+$/, '');
}

/** Is every character the same? `aaaaaaaa` is eight characters and one secret. */
function allOneCharacter(password: string): boolean {
  return password.length > 0 && new Set(password).size === 1;
}

/** Is it a straight run off the keyboard or the alphabet, forwards or back? */
function isRun(password: string): boolean {
  const p = password.toLowerCase();
  if (p.length < 4) return false;
  const reversed = [...p].reverse().join('');
  return RUNS.some((run) => run.includes(p) || run.includes(reversed));
}

/**
 * Reject a password an athlete will regret, or return `null`.
 *
 * `email` is optional and used only to catch a password built from the address
 * it protects — `sam@example.com` / `sam12345` is a password anyone who knows
 * the account can guess.
 */
export function weakPasswordReason(password: string, email?: string): string | null {
  const lower = password.toLowerCase();

  if (COMMON.has(lower) || COMMON.has(base(password))) {
    return 'That password turns up in breach lists. Pick something less common.';
  }
  if (allOneCharacter(password)) {
    return 'That is the same character repeated. Pick something less predictable.';
  }
  if (isRun(password)) {
    return 'That is a straight run across the keyboard. Pick something less predictable.';
  }
  if (/^\d+$/.test(password)) {
    return 'All-number passwords are guessed first. Add some letters.';
  }

  const local = (email ?? '').split('@')[0]?.toLowerCase() ?? '';
  // Short local parts would match too eagerly — "sam" is inside "samurai".
  if (local.length >= 4 && lower.includes(local)) {
    return 'That password contains your email address. Pick something unrelated to it.';
  }

  return null;
}
