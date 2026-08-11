// Converted from the ATHLY Claude Design prototype (ATHLY.dc.html).
// Markup and inline styles are preserved verbatim; only the template syntax
// (sc-if / sc-for / {{ }}) was translated to JSX.

import type { ViewModel } from '../viewModel';
import { S } from '../styles';

export function OnboardingIntro({ v }: { v: ViewModel }) {
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
            ATHLY
          </span>
        </div>
        <div style={S('position:relative')}>
          <h1
            style={S(
              'margin:0 0 14px;font-size:47px;line-height:.98;font-weight:900;font-stretch:113%;letter-spacing:-.015em;color:#F4F2ED;text-wrap:balance',
            )}
          >
            Eat food you actually like.
          </h1>
          <p
            style={S(
              'margin:0 0 34px;font-size:16px;line-height:1.5;color:rgba(244,242,237,.65);max-width:305px',
            )}
          >
            Tell us what you love, what you won't touch, and when you train. Athly handles the rest — no
            spreadsheets.
          </p>
          <button
            className={'dc-ho1'}
            onClick={v.obNext}
            style={S(
              'width:100%;display:flex;align-items:center;justify-content:space-between;padding:18px 20px;background:#17A05E;color:#fff;font-weight:800;font-size:16px;border-radius:14px',
            )}
          >
            <span>Let's set you up</span>
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
          <div style={S('margin-top:16px;font-size:12px;color:rgba(244,242,237,.4);text-align:center')}>
            Takes about two minutes
          </div>
        </div>
      </div>
    </>
  );
}
