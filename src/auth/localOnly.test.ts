import { describe, expect, it } from 'vitest';

import { isAppleEnabled, isBackendConfigured } from '../lib/env';
import { supabase } from '../lib/supabase';

/**
 * The guarantee the rest of the test suite quietly depends on.
 *
 * With no Supabase project configured the app is what it was before there was a
 * backend: local state, nothing saved, no account gate. Seventy-seven tests and
 * twenty pixel baselines were written against that app and none of them were
 * changed when auth arrived — which is only true while these hold.
 *
 * If this file ever fails, the visual baselines are not measuring what they
 * claim to and the walkthrough tests are exercising a different application.
 */
describe('with no backend configured', () => {
  it('reports itself unconfigured', () => {
    expect(isBackendConfigured).toBe(false);
  });

  it('constructs no client at all', () => {
    // Not merely unused — absent. A constructed client opens an auth listener
    // and a refresh timer, and would make the test environment answer
    // differently from a plain page load.
    expect(supabase).toBeNull();
  });

  it('does not offer Sign in with Apple', () => {
    // Off until an Apple Developer membership, a Services ID and a signing key
    // exist. The button is built; this is the switch.
    expect(isAppleEnabled).toBe(false);
  });
});
