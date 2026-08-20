// Drawn entirely from the design's existing vocabulary — every style string
// here is lifted from `OnboardingIntro.tsx`, which is the screen an athlete saw
// two minutes earlier. Same dark ground, same decorative circles, same lockup
// placement, same headline scale, same CTA geometry. Nothing new was invented
// for this screen, because nothing needed to be.

import type { ViewModel } from '../../viewModel';
import { S } from '../../styles';

/** Google's mark, in its brand colours. Using anything else breaks their terms. */
function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"
      />
      <path
        fill="#34A853"
        d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"
      />
      <path
        fill="#FBBC05"
        d="M11.69 28.18c-.44-1.32-.69-2.73-.69-4.18s.25-2.86.69-4.18v-5.7H4.34C2.85 17.09 2 20.45 2 24s.85 6.91 2.34 9.88l7.35-5.7z"
      />
      <path
        fill="#EA4335"
        d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z"
      />
    </svg>
  );
}

/** Apple's mark, monochrome, per their Sign in with Apple guidelines. */
function AppleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.05 12.54c-.03-2.6 2.12-3.85 2.22-3.91-1.21-1.77-3.09-2.01-3.76-2.04-1.6-.16-3.12.94-3.93.94-.81 0-2.06-.92-3.39-.9-1.74.03-3.35 1.01-4.25 2.57-1.81 3.14-.46 7.79 1.3 10.34.86 1.25 1.89 2.65 3.24 2.6 1.3-.05 1.79-.84 3.36-.84s2.01.84 3.39.81c1.4-.02 2.28-1.27 3.13-2.53.99-1.45 1.4-2.85 1.42-2.92-.03-.01-2.72-1.04-2.75-4.13M14.63 4.83c.71-.87 1.19-2.07 1.06-3.27-1.02.04-2.26.68-3 1.54-.66.77-1.24 2-1.09 3.18 1.14.09 2.31-.58 3.03-1.45" />
    </svg>
  );
}

export function AuthGate({ v }: { v: ViewModel }) {
  return (
    <>
      <div
        style={S(
          'position:absolute;inset:0;background:#111815;display:flex;flex-direction:column;justify-content:flex-end;padding:0 26px calc(46px + env(safe-area-inset-bottom, 0px));animation:ffFade .4s ease',
        )}
      >
        <div style={S('position:absolute;top:0;left:0;right:0;height:430px;overflow:hidden')}>
          <div
            style={S(
              'position:absolute;top:-90px;right:-70px;width:340px;height:340px;border-radius:50%;background:#17A05E;opacity:.92',
            )}
          />
          <div
            style={S(
              'position:absolute;top:130px;left:-60px;width:180px;height:180px;border-radius:50%;background:#F4F2ED;opacity:.1',
            )}
          />
          <div
            style={S(
              'position:absolute;top:262px;right:44px;width:120px;height:26px;border-radius:99px;background:#5BE3A0;opacity:.45',
            )}
          />
        </div>
        <div style={S('position:absolute;top:70px;left:26px;display:flex;align-items:center;gap:10px')}>
          <div
            style={S(
              'width:30px;height:30px;border-radius:9px;background:#F4F2ED;display:flex;align-items:center;justify-content:center;position:relative;flex:none',
            )}
          >
            <span style={S('font-size:12px;font-weight:900;color:#111815;letter-spacing:-.04em')}>A</span>
            <div
              style={S(
                'position:absolute;top:-3px;right:-3px;width:10px;height:10px;border-radius:50%;background:#5BE3A0;border:2px solid #111815',
              )}
            />
          </div>
          <span
            style={S('font-size:15px;font-weight:900;font-stretch:125%;letter-spacing:.01em;color:#F4F2ED')}
          >
            ATHLY IQ
          </span>
        </div>
        <div style={S('position:relative')}>
          <h1
            style={S(
              'margin:0 0 14px;font-size:47px;line-height:.98;font-weight:900;font-stretch:113%;letter-spacing:-.015em;color:#F4F2ED;text-wrap:balance',
            )}
          >
            {v.authGateTitle}
          </h1>
          <p
            style={S(
              'margin:0 0 26px;font-size:16px;line-height:1.5;color:rgba(244,242,237,.65);max-width:305px',
            )}
          >
            {v.authGateSub}
          </p>

          {v.authError ? (
            <div
              style={S(
                'margin:0 0 14px;padding:13px 15px;border-radius:12px;background:rgba(244,242,237,.08);border:1px solid rgba(244,242,237,.16);font-size:13.5px;line-height:1.45;color:#F4F2ED',
              )}
            >
              {v.authError}
            </div>
          ) : null}

          <div style={S('display:flex;flex-direction:column;gap:10px')}>
            <button
              className={'dc-ho1'}
              onClick={v.authGoogle}
              disabled={v.authBusy}
              style={S(
                'width:100%;display:flex;align-items:center;justify-content:center;gap:10px;padding:18px 20px;background:#F4F2ED;color:#111815;font-weight:800;font-size:16px;border-radius:14px',
              )}
            >
              <GoogleMark />
              <span>Continue with Google</span>
            </button>

            {v.authShowApple ? (
              <button
                className={'dc-ho1'}
                onClick={v.authApple}
                disabled={v.authBusy}
                style={S(
                  'width:100%;display:flex;align-items:center;justify-content:center;gap:10px;padding:18px 20px;background:#F4F2ED;color:#111815;font-weight:800;font-size:16px;border-radius:14px',
                )}
              >
                <AppleMark />
                <span>Continue with Apple</span>
              </button>
            ) : null}

            <button
              className={'dc-ho1'}
              onClick={v.authEmailStart}
              disabled={v.authBusy}
              style={S(
                'width:100%;display:flex;align-items:center;justify-content:space-between;padding:18px 20px;background:#17A05E;color:#fff;font-weight:800;font-size:16px;border-radius:14px',
              )}
            >
              <span>{v.authEmailCta}</span>
              <svg
                width="20"
                height="20"
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

          <button
            className={'dc-ho1'}
            onClick={v.authSwapMode}
            style={S(
              'width:100%;margin-top:16px;font-size:13px;color:rgba(244,242,237,.55);text-align:center;font-weight:600',
            )}
          >
            {v.authSwapLabel}
          </button>
          <div style={S('margin-top:10px;font-size:12px;color:rgba(244,242,237,.4);text-align:center')}>
            {v.authFootnote}
          </div>
        </div>
      </div>
    </>
  );
}
