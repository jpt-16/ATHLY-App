// The email form, wearing `OnboardingQuestion`'s clothes: same cream ground,
// same kicker/heading/subheading stack, same input, same sticky footer CTA with
// its top rule and safe-area padding. An athlete arriving here should not feel
// they have left onboarding, because in every way that matters they have not.

import type { ViewModel } from '../../viewModel';
import { S } from '../../styles';

/** Lifted from the name step in `OnboardingQuestion.tsx`. */
const FIELD =
  'width:100%;padding:16px 18px;font:inherit;font-size:17px;font-weight:700;letter-spacing:-.01em;background:#fff;border:2px solid rgba(17,24,21,.12);border-radius:14px;color:#111815;caret-color:#17A05E';

export function AuthEmail({ v }: { v: ViewModel }) {
  return (
    <>
      <div className={'ffs'} style={S('flex:1;overflow-y:auto;padding:26px 22px 0')}>
        <div
          style={S(
            'font-size:11px;letter-spacing:.14em;text-transform:uppercase;font-weight:800;color:#17A05E;margin-bottom:10px',
          )}
        >
          {v.authKicker}
        </div>
        <h2
          style={S(
            'margin:0 0 8px;font-size:31px;line-height:1.05;font-weight:900;font-stretch:113%;letter-spacing:-.013em;text-wrap:balance',
          )}
        >
          {v.authTitle}
        </h2>
        <p style={S('margin:0 0 22px;font-size:14px;line-height:1.5;color:#6E6A60')}>{v.authSub}</p>

        <div style={S('display:flex;flex-direction:column;gap:10px;padding-bottom:16px')}>
          {v.authNeedsEmail ? (
            <input
              type="email"
              autoComplete="email"
              inputMode="email"
              autoCapitalize="none"
              spellCheck={false}
              value={v.authEmail}
              onChange={v.authEmailChange}
              placeholder="you@example.com"
              aria-label="Email"
              style={S(FIELD)}
            />
          ) : null}
          {v.authNeedsPassword ? (
            <input
              type="password"
              // Tells a password manager to offer a new strong password on
              // sign-up and the saved one on sign-in — different hints, and
              // getting them the wrong way round is a small daily annoyance.
              autoComplete={v.authPasswordAutocomplete}
              value={v.authPassword}
              onChange={v.authPasswordChange}
              onKeyDown={v.authKeyDown}
              placeholder="Password"
              aria-label="Password"
              style={S(FIELD)}
            />
          ) : null}
        </div>

        {v.authError ? (
          <div
            style={S(
              'margin-bottom:16px;padding:13px 15px;border-radius:12px;background:rgba(200,60,40,.07);border:1px solid rgba(200,60,40,.22);font-size:13.5px;line-height:1.45;color:#8C2F20',
            )}
          >
            {v.authError}
          </div>
        ) : null}

        <div style={S('font-size:12.5px;color:#8C8779;line-height:1.5;padding-bottom:18px')}>
          {v.authHint}
        </div>

        {v.authShowForgot ? (
          <button
            className={'dc-ho3'}
            onClick={v.authForgot}
            style={S('font-size:13.5px;font-weight:700;color:#17A05E;text-align:left;padding-bottom:20px')}
          >
            I forgot my password
          </button>
        ) : null}
      </div>
      <div
        style={S(
          'padding:14px 22px calc(30px + env(safe-area-inset-bottom, 0px));border-top:2px solid rgba(17,24,21,.1);background:#F4F2ED',
        )}
      >
        <button onClick={v.authSubmit} disabled={v.authSubmitBlocked} style={S(v.authCtaStyle)}>
          <span>{v.authCta}</span>
          <svg
            width="19"
            height="19"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </button>
      </div>
    </>
  );
}
