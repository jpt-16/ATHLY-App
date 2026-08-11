// "Check your email", and the other moments where the next thing to happen
// happens somewhere else. Same cream frame and type scale as the question
// screens; the only ornament is the dot badge already used on the ATHLY lockup.

import type { ViewModel } from '../../viewModel';
import { S } from '../../styles';

export function AuthNotice({ v }: { v: ViewModel }) {
  return (
    <>
      <div className={'ffs'} style={S('flex:1;overflow-y:auto;padding:26px 22px 0')}>
        <div
          style={S(
            'width:44px;height:44px;border-radius:13px;background:#111815;display:flex;align-items:center;justify-content:center;position:relative;margin-bottom:20px',
          )}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#F4F2ED"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="2.5" y="4.5" width="19" height="15" rx="2.5" />
            <path d="M3 7l9 6 9-6" />
          </svg>
          <div
            style={S(
              'position:absolute;top:-4px;right:-4px;width:12px;height:12px;border-radius:50%;background:#5BE3A0;border:2px solid #F4F2ED',
            )}
          />
        </div>
        <h2
          style={S(
            'margin:0 0 8px;font-size:31px;line-height:1.05;font-weight:900;font-stretch:113%;letter-spacing:-.013em;text-wrap:balance',
          )}
        >
          {v.authTitle}
        </h2>
        <p style={S('margin:0 0 22px;font-size:14px;line-height:1.5;color:#6E6A60')}>{v.authSub}</p>
        <div style={S('font-size:12.5px;color:#8C8779;line-height:1.5;padding-bottom:18px')}>
          {v.authHint}
        </div>
      </div>
      <div
        style={S(
          'padding:14px 22px calc(30px + env(safe-area-inset-bottom, 0px));border-top:2px solid rgba(17,24,21,.1);background:#F4F2ED',
        )}
      >
        <button onClick={v.authSubmit} style={S(v.authCtaStyle)}>
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
