// Converted from the ATHLY Claude Design prototype (ATHLY.dc.html).
// Markup and inline styles are preserved verbatim; only the template syntax
// (sc-if / sc-for / {{ }}) was translated to JSX.

import type { ViewModel } from '../viewModel';
import { S } from '../styles';

export function Toast({ v }: { v: ViewModel }) {
  return (
    <>
      <div
        style={S(
          'position:absolute;left:16px;right:16px;bottom:112px;z-index:80;background:#111815;border-radius:14px;padding:15px 17px;display:flex;align-items:center;gap:12px;box-shadow:0 14px 34px rgba(17,24,21,.3);animation:ffToast 2.6s ease forwards',
        )}
      >
        <div
          style={S(
            'width:24px;height:24px;border-radius:50%;background:#17A05E;display:flex;align-items:center;justify-content:center;flex:none',
          )}
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#fff"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4 12.5l5 5L20 6.5" />
          </svg>
        </div>
        <div style={S('font-size:13.5px;font-weight:700;color:#F4F2ED;line-height:1.35')}>{v.toast}</div>
      </div>
    </>
  );
}
