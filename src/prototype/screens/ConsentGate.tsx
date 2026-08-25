import { S } from '../styles';
import type { ViewModel } from '../viewModel';

/**
 * The two agreements, before the app opens.
 *
 * Shown once after signing in and again whenever either document changes — the
 * version that was on screen is what gets recorded, so agreeing to the old text
 * is never carried forward as agreement to the new.
 *
 * Two boxes rather than one, because they are two different things. Bundling
 * "here is what we store about you" with "your typed meals are sent to a model
 * to be read" into a single tick would make the second one invisible, and it is
 * the one an athlete is least likely to expect.
 *
 * Continue stays disabled until both are ticked. A button that works regardless
 * would make the boxes decoration, which is worse than not asking.
 */
export function ConsentGate({ v }: { v: ViewModel }) {
  const box = (checked: boolean, onClick: () => void, label: string, body: React.ReactNode) => (
    <button
      onClick={onClick}
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      style={S(
        `display:flex;align-items:flex-start;gap:12px;width:100%;text-align:left;padding:16px;border-radius:16px;border:2px solid ${
          checked ? '#17A05E' : 'rgba(244,242,237,.16)'
        };background:${checked ? 'rgba(23,160,94,.12)' : 'rgba(244,242,237,.04)'};margin-bottom:10px`,
      )}
    >
      <span
        style={S(
          `width:22px;height:22px;border-radius:7px;flex:none;margin-top:1px;display:flex;align-items:center;justify-content:center;border:2px solid ${
            checked ? '#17A05E' : 'rgba(244,242,237,.3)'
          };background:${checked ? '#17A05E' : 'transparent'}`,
        )}
      >
        {checked ? (
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#fff"
            strokeWidth="3.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 6L9 17l-5-5" />
          </svg>
        ) : null}
      </span>
      <span style={S('flex:1;min-width:0;font-size:13.5px;line-height:1.5;color:rgba(244,242,237,.86)')}>
        {body}
      </span>
    </button>
  );

  const link = (text: string, onClick: () => void) => (
    <span
      onClick={(e) => {
        // The row is a checkbox; a link inside it must not tick the box on its
        // way to opening a document.
        e.stopPropagation();
        onClick();
      }}
      style={S('color:#5BE3A0;font-weight:800;text-decoration:underline;cursor:pointer')}
    >
      {text}
    </span>
  );

  return (
    <div
      className={'ffs'}
      style={S(
        'position:absolute;inset:0;z-index:70;background:#111815;overflow-y:auto;padding:calc(58px + env(safe-area-inset-top, 0px)) 24px calc(30px + env(safe-area-inset-bottom, 0px));animation:ffFade .3s ease',
      )}
    >
      <div style={S('display:flex;align-items:center;gap:10px;margin-bottom:26px')}>
        <div
          style={S(
            'width:26px;height:26px;border-radius:8px;background:#F4F2ED;display:flex;align-items:center;justify-content:center;flex:none',
          )}
        >
          <span style={S('font-size:11px;font-weight:900;color:#111815;letter-spacing:-.04em')}>A</span>
        </div>
        <div style={S('font-size:13px;font-weight:900;color:rgba(244,242,237,.6);letter-spacing:.02em')}>
          ATHLY IQ
        </div>
      </div>

      <h1
        style={S(
          'margin:0 0 10px;font-size:29px;line-height:1.08;font-weight:900;font-stretch:113%;letter-spacing:-.018em;color:#F4F2ED',
        )}
      >
        Before you start.
      </h1>
      <p style={S('margin:0 0 24px;font-size:14.5px;line-height:1.55;color:rgba(244,242,237,.6)')}>
        Two things worth knowing, and worth agreeing to on purpose rather than by scrolling past.
      </p>

      {box(
        v.consentPrivacy,
        v.toggleConsentPrivacy,
        'I agree to the privacy policy and terms of use',
        <>
          I've read the {link('Privacy Policy', v.openConsentPrivacy)} and the{' '}
          {link('Terms of Use', v.openConsentTerms)}, and I agree to them. I understand ATHLY IQ gives general
          nutrition guidance and is <strong>not medical advice</strong>, and that if I'm under 18 I should
          have a parent or guardian's permission.
        </>,
      )}

      {box(
        v.consentAi,
        v.toggleConsentAi,
        'I agree to AI reading my meal descriptions',
        <>
          When I describe a meal in my own words, I understand that{' '}
          <strong>text is sent to an AI service</strong> to work out which foods I meant. Nutrition figures
          then come from a food database, not from the AI. It's an estimate I can edit before anything is
          logged, and I can always log food by hand or by barcode instead.
        </>,
      )}

      <button
        onClick={v.agreeToAll}
        disabled={!v.consentReady}
        style={S(
          `width:100%;margin-top:14px;padding:17px;border-radius:15px;font-size:15.5px;font-weight:800;${
            v.consentReady
              ? 'background:#17A05E;color:#fff'
              : 'background:rgba(244,242,237,.1);color:rgba(244,242,237,.35)'
          }`,
        )}
      >
        {v.consentBusy ? 'Saving…' : v.consentReady ? 'Agree and continue' : 'Tick both to continue'}
      </button>

      <p style={S('margin:16px 0 0;font-size:11.5px;line-height:1.5;color:rgba(244,242,237,.35)')}>
        Recorded against version {v.consentVersion}. If either document changes in a way that matters, we'll
        ask again rather than assume.
      </p>
    </div>
  );
}
