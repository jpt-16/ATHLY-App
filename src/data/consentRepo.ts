import { requireSupabase } from '../lib/supabase';
import type { ConsentKind, ConsentRow } from '../lib/database.types';

/**
 * Recording what an athlete agreed to.
 *
 * **Bump this when either document changes in a way that matters**, and every
 * athlete is asked again on their next launch. It is the date on the "Last
 * updated" line of `public/privacy.html` and `public/terms.html`, so a person
 * can compare the two without reading code.
 *
 * Agreeing to the old text is not agreeing to the new one. Carrying an old tick
 * forward silently is the precise thing consent exists to prevent, and it is
 * the easy mistake here — nothing breaks, and nobody finds out.
 */
export const CONSENT_VERSION = '2026-08-20';

/** Which agreements are outstanding for this athlete. */
export interface ConsentState {
  privacy: boolean;
  ai: boolean;
}

export const NO_CONSENT: ConsentState = { privacy: false, ai: false };

/**
 * What this athlete has agreed to, at the *current* version.
 *
 * A row at an older version reads as `false`, which is the whole point of
 * storing the version at all.
 */
export async function loadConsents(): Promise<ConsentState> {
  const db = requireSupabase();
  const { data, error } = await db.from('consents').select('*');
  if (error) throw error;

  const current = (kind: ConsentKind) =>
    (data ?? []).some((row: ConsentRow) => row.kind === kind && row.document_version === CONSENT_VERSION);

  return { privacy: current('privacy'), ai: current('ai') };
}

/**
 * Record one agreement, at the version that was on screen.
 *
 * Upsert rather than insert: re-consenting after a version bump replaces the
 * old row. The date they *first* agreed is deliberately not kept — it would be
 * a second thing to reason about in a deletion request, and the agreement that
 * governs is the current one.
 */
export async function recordConsent(userId: string, kind: ConsentKind): Promise<void> {
  const db = requireSupabase();
  const { error } = await db.from('consents').upsert(
    {
      user_id: userId,
      kind,
      document_version: CONSENT_VERSION,
      agreed_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,kind' },
  );
  if (error) throw error;
}

/** Both, for the gate that asks for both at once. */
export async function recordAllConsents(userId: string): Promise<void> {
  await Promise.all([recordConsent(userId, 'privacy'), recordConsent(userId, 'ai')]);
}

/** Whether the athlete still owes an agreement. */
export function consentOutstanding(state: ConsentState): boolean {
  return !state.privacy || !state.ai;
}
