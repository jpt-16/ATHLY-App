import { describe, expect, it } from 'vitest';

import { validateCredentials } from './authActions';
import { weakPasswordReason } from './passwordStrength';

/**
 * The passwords that used to get through.
 *
 * Supabase's breach-corpus check is a Pro feature and this project is not on
 * Pro, so the entire policy was "at least 8 characters" — which `password` and
 * `12345678` both satisfy. These are the cases that motivated the list.
 */
describe('the passwords eight-characters accepted', () => {
  const NOTORIOUS = [
    'password',
    'password1',
    'Password1',
    'Password1!',
    '12345678',
    '123456789',
    'qwerty123',
    'iloveyou',
    'football',
    'baseball',
    'basketball',
    'letmein1',
    'trustno1',
    'superman',
    'princess',
    'sunshine',
    'welcome1',
    'minecraft',
    'fortnite',
    'instagram',
  ];

  it.each(NOTORIOUS)('refuses %s', (password) => {
    expect(weakPasswordReason(password)).not.toBeNull();
  });

  it('refuses them through the real sign-up path, not just directly', () => {
    // The check is worth nothing if it is not wired in.
    for (const password of NOTORIOUS) {
      expect(validateCredentials('sam@example.com', password)).not.toBeNull();
    }
  });
});

describe('decoration does not rescue a common password', () => {
  it('sees through trailing digits and punctuation', () => {
    // Every "must contain a number" rule produces thousands of these.
    for (const p of ['password12', 'dragon99', 'monkey1!', 'soccer2024', 'welcome!!']) {
      expect(weakPasswordReason(p), p).not.toBeNull();
    }
  });

  it('is case-insensitive', () => {
    expect(weakPasswordReason('PASSWORD')).not.toBeNull();
    expect(weakPasswordReason('PaSsWoRd')).not.toBeNull();
  });
});

describe('structure, not just the list', () => {
  it('refuses one character repeated', () => {
    expect(weakPasswordReason('aaaaaaaa')).not.toBeNull();
    expect(weakPasswordReason('11111111')).not.toBeNull();
  });

  it('refuses a run across the keyboard, either direction', () => {
    expect(weakPasswordReason('abcdefgh')).not.toBeNull();
    expect(weakPasswordReason('hgfedcba')).not.toBeNull();
    expect(weakPasswordReason('qwertyui')).not.toBeNull();
    expect(weakPasswordReason('0987654321')).not.toBeNull();
  });

  it('refuses an all-digit password', () => {
    expect(weakPasswordReason('83920174')).not.toBeNull();
  });

  it('refuses a password built from the email it protects', () => {
    expect(weakPasswordReason('jacob-twohig-99', 'jacob@example.com')).not.toBeNull();
    // Short local parts would match far too eagerly — "sam" is inside "samurai".
    expect(weakPasswordReason('samurai-elephant', 'sam@example.com')).toBeNull();
  });
});

describe('what it lets through', () => {
  it('accepts an ordinary decent password', () => {
    for (const p of ['correct-horse-battery', 'Tr0ubad0ur-Kestrel', 'my dog ate the wifi', 'gLxq82Kd0Pm']) {
      expect(weakPasswordReason(p), p).toBeNull();
    }
  });

  it('does not reject a strong password for containing a common word', () => {
    // The check is on the whole password, not a substring hunt — otherwise
    // every passphrase with "summer" in it is refused.
    expect(weakPasswordReason('summer-rain-on-the-quarry-road')).toBeNull();
  });

  it('still lets a good password through the sign-up path', () => {
    expect(validateCredentials('sam@example.com', 'correct-horse-battery')).toBeNull();
  });

  it('leaves the other validation rules alone', () => {
    expect(validateCredentials('not-an-email', 'correct-horse-battery')).toMatch(/email/i);
    expect(validateCredentials('sam@example.com', 'short')).toMatch(/8 characters/);
  });
});
