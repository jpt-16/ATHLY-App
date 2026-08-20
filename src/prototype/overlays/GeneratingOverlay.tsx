// Converted from the ATHLY Claude Design prototype (ATHLY.dc.html).
// Markup and inline styles are preserved verbatim; only the template syntax
// (sc-if / sc-for / {{ }}) was translated to JSX.

import React from 'react';
import type { ViewModel, VmRow } from '../viewModel';
import { S } from '../styles';

export function GeneratingOverlay({ v }: { v: ViewModel }) {
  return (
    <>
      <div
        style={S(
          'position:absolute;inset:0;z-index:70;background:#111815;display:flex;flex-direction:column;justify-content:center;padding:0 30px;animation:ffFade .25s ease',
        )}
      >
        <div style={S('display:flex;align-items:center;gap:10px;margin-bottom:30px')}>
          <div
            style={S(
              'width:30px;height:30px;border-radius:9px;background:#F4F2ED;display:flex;align-items:center;justify-content:center;position:relative;flex:none',
            )}
          >
            <span style={S('font-size:12px;font-weight:900;color:#111815;letter-spacing:-.04em')}>A</span>
            <div
              style={S(
                'position:absolute;top:-3px;right:-3px;width:10px;height:10px;border-radius:50%;background:#5BE3A0;border:2px solid #111815;animation:ffPulse 1.1s ease infinite',
              )}
            />
          </div>
          <span style={S('font-size:14px;font-weight:900;color:rgba(244,242,237,.7)')}>ATHLY IQ</span>
        </div>
        <h2
          style={S(
            'margin:0 0 8px;font-size:27px;font-weight:900;font-stretch:113%;letter-spacing:-.013em;color:#F4F2ED',
          )}
        >
          {v.genTitle}
        </h2>
        <p style={S('margin:0 0 28px;font-size:14px;color:rgba(244,242,237,.55);line-height:1.5')}>
          {v.genSub}
        </p>
        <div style={S('display:flex;flex-direction:column;gap:14px')}>
          {(v.genSteps ?? []).map((s: VmRow, i: number) => (
            <React.Fragment key={i}>
              <div style={S(s.style)}>
                <div style={S(s.dot)} />
                <span>{s.label}</span>
              </div>
            </React.Fragment>
          ))}
        </div>
      </div>
    </>
  );
}
