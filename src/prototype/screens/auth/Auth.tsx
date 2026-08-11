import type { ViewModel } from '../../viewModel';
import { S } from '../../styles';
import { AuthEmail } from './AuthEmail';
import { AuthGate } from './AuthGate';
import { AuthNotice } from './AuthNotice';

/**
 * The account stage.
 *
 * Mirrors `Onboarding.tsx` exactly — the same cream column, the same back
 * button and progress rail — because this *is* part of onboarding as far as the
 * athlete is concerned: the last step, where the plan they just built gets
 * somewhere to live. The gate itself is dark and fills the frame, so the rail
 * only appears on the screens behind it.
 */
export function Auth({ v }: { v: ViewModel }) {
  return (
    <>
      <div style={S('position:absolute;inset:0;display:flex;flex-direction:column;background:#F4F2ED')}>
        {v.authShowBar ? (
          <>
            <div style={S('padding:60px 22px 0;display:flex;align-items:center;gap:12px')}>
              <button
                className={'dc-ho0'}
                onClick={v.authBack}
                style={S(
                  'width:34px;height:34px;border:2px solid rgba(17,24,21,.14);display:flex;align-items:center;justify-content:center;border-radius:10px;flex:none',
                )}
              >
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#111815"
                  strokeWidth="2.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
              <div
                style={S('flex:1;height:4px;background:rgba(17,24,21,.1);border-radius:99px;overflow:hidden')}
              >
                <div
                  style={S(
                    'height:100%;background:#17A05E;border-radius:99px;transition:width .45s cubic-bezier(.2,.8,.2,1);width:100%',
                  )}
                />
              </div>
              <div style={S('font-size:11px;font-weight:700;color:#8C8779;min-width:34px;text-align:right')}>
                {v.authStepLabel}
              </div>
            </div>
          </>
        ) : null}
        {v.authIsGate ? <AuthGate v={v} /> : null}
        {v.authIsForm ? <AuthEmail v={v} /> : null}
        {v.authIsNotice ? <AuthNotice v={v} /> : null}
      </div>
    </>
  );
}
