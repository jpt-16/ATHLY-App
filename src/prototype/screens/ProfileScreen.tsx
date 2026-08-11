// Converted from the ATHLY Claude Design prototype (ATHLY.dc.html).
// Markup and inline styles are preserved verbatim; only the template syntax
// (sc-if / sc-for / {{ }}) was translated to JSX.

import React from 'react';
import type { ViewModel, VmRow } from '../viewModel';
import { S } from '../styles';

export function ProfileScreen({ v }: { v: ViewModel }) {
  return (
    <>
      <div
        className={'ffs'}
        style={S('position:absolute;inset:0;overflow-y:auto;padding-bottom:130px;animation:ffFade .3s ease')}
      >
        <div style={S('padding:62px 22px 18px;display:flex;align-items:center;gap:14px')}>
          <div
            style={S(
              'width:56px;height:56px;border-radius:50%;background:#111815;color:#F4F2ED;font-weight:900;font-stretch:113%;font-size:21px;display:flex;align-items:center;justify-content:center',
            )}
          >
            {v.initial}
          </div>
          <div>
            <h1 style={S('margin:0;font-size:24px;font-weight:900;font-stretch:113%;letter-spacing:-.013em')}>
              {v.name}
            </h1>
            <div style={S('font-size:12.5px;color:#6E6A60;font-weight:600;margin-top:2px')}>
              {v.profileLine}
            </div>
          </div>
        </div>
        <div style={S('padding:0 22px 18px;display:grid;grid-template-columns:1fr 1fr;gap:10px')}>
          <button
            className={'dc-ho9'}
            onClick={v.goGrocery}
            style={S('background:#fff;border-radius:14px;padding:15px;text-align:left')}
          >
            <div style={S('font-size:22px;font-weight:900;font-stretch:113%;letter-spacing:-.013em')}>18</div>
            <div style={S('font-size:12px;font-weight:700;color:#6E6A60;margin-top:2px')}>
              on the grocery list
            </div>
          </button>
          <button
            className={'dc-ho9'}
            onClick={v.goProgress}
            style={S('background:#fff;border-radius:14px;padding:15px;text-align:left')}
          >
            <div style={S('font-size:22px;font-weight:900;font-stretch:113%;letter-spacing:-.013em')}>
              6/7
            </div>
            <div style={S('font-size:12px;font-weight:700;color:#6E6A60;margin-top:2px')}>days on plan</div>
          </button>
        </div>
        <div style={S('padding:0 22px')}>
          {(v.profileGroups ?? []).map((g: VmRow, i: number) => (
            <React.Fragment key={i}>
              <div style={S('margin-bottom:16px')}>
                <div
                  style={S(
                    'font-size:10px;letter-spacing:.12em;text-transform:uppercase;font-weight:800;color:#8C8779;margin-bottom:9px',
                  )}
                >
                  {g.title}
                </div>
                <div
                  style={S(
                    'background:#fff;box-shadow:0 1px 2px rgba(17,24,21,.045),0 12px 28px -18px rgba(17,24,21,.28);border-radius:18px;overflow:hidden',
                  )}
                >
                  {(g.rows ?? []).map((r: VmRow, i1: number) => (
                    <React.Fragment key={i1}>
                      <button className={'dc-ho9'} onClick={r.tap} style={S(r.style)}>
                        <span style={S('font-size:14px;font-weight:700')}>{r.label}</span>
                        <span style={S('display:flex;align-items:center;gap:8px')}>
                          <span
                            style={S(
                              'font-size:13px;color:#6E6A60;font-weight:600;max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap',
                            )}
                          >
                            {r.value}
                          </span>
                          <svg
                            width="15"
                            height="15"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#B5B0A4"
                            strokeWidth="2.6"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M9 6l6 6-6 6" />
                          </svg>
                        </span>
                      </button>
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </React.Fragment>
          ))}
          <div style={S('padding:6px 0 10px;font-size:12px;line-height:1.55;color:#8C8779')}>
            Athly gives general nutrition guidance to help you fuel, recover and grow. It isn't medical
            advice, and it won't set aggressive weight targets for anyone under 18.
          </div>
          <button
            className={'dc-ho3'}
            onClick={v.restart}
            style={S(
              'width:100%;padding:15px 18px;border:2px solid rgba(17,24,21,.14);border-radius:14px;font-weight:800;font-size:14px;text-align:left',
            )}
          >
            Restart the prototype
          </button>
        </div>
      </div>
    </>
  );
}
