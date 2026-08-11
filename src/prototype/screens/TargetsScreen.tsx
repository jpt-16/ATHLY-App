// Converted from the ATHLY Claude Design prototype (ATHLY.dc.html).
// Markup and inline styles are preserved verbatim; only the template syntax
// (sc-if / sc-for / {{ }}) was translated to JSX.

import React from 'react';
import type { ViewModel, VmRow } from '../viewModel';
import { S } from '../styles';

export function TargetsScreen({ v }: { v: ViewModel }) {
  return (
    <>
      <div
        className={'ffs'}
        style={S(
          'position:absolute;inset:0;background:#111815;overflow-y:auto;padding:0 26px 34px;animation:ffFade .35s ease',
        )}
      >
        <div style={S('padding-top:62px;display:flex;align-items:center;gap:10px;margin-bottom:24px')}>
          <div
            style={S(
              'width:26px;height:26px;border-radius:8px;background:#F4F2ED;display:flex;align-items:center;justify-content:center;flex:none',
            )}
          >
            <span style={S('font-size:10.5px;font-weight:900;color:#111815;letter-spacing:-.04em')}>A</span>
          </div>
          <span style={S('font-size:13px;font-weight:900;color:rgba(244,242,237,.65)')}>ATHLY</span>
        </div>
        <div
          style={S(
            'font-size:11px;letter-spacing:.14em;text-transform:uppercase;font-weight:800;color:#5BE3A0;margin-bottom:10px',
          )}
        >
          {v.targets.mode}
        </div>
        <h2
          style={S(
            'margin:0 0 8px;font-size:31px;font-weight:900;font-stretch:113%;letter-spacing:-.015em;line-height:1.05;color:#F4F2ED',
          )}
        >
          {v.targets.headline}
        </h2>
        <p style={S('margin:0 0 22px;font-size:14px;line-height:1.5;color:rgba(244,242,237,.55)')}>
          {v.targets.sub}
        </p>
        <div style={S('display:flex;align-items:baseline;gap:8px;margin-bottom:18px')}>
          <div
            style={S(
              'font-size:60px;font-weight:900;font-stretch:113%;letter-spacing:-.021em;line-height:.9;color:#F4F2ED',
            )}
          >
            {v.targets.calText}
          </div>
          <div style={S('font-size:15px;font-weight:800;color:rgba(244,242,237,.5)')}>cal / day</div>
        </div>
        <div
          style={S('background:rgba(244,242,237,.07);border-radius:18px;overflow:hidden;margin-bottom:14px')}
        >
          {(v.targets.math ?? []).map((m: VmRow, i: number) => (
            <React.Fragment key={i}>
              <div style={S(m.style)}>
                <div>
                  <div style={S('font-size:13.5px;font-weight:700;color:#F4F2ED')}>{m.label}</div>
                  <div style={S('font-size:11.5px;color:rgba(244,242,237,.45);margin-top:2px')}>{m.note}</div>
                </div>
                <div style={S(m.valueStyle)}>{m.value}</div>
              </div>
            </React.Fragment>
          ))}
        </div>
        <div style={S('display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:16px')}>
          {(v.targets.macros ?? []).map((m: VmRow, i: number) => (
            <React.Fragment key={i}>
              <div style={S('background:rgba(244,242,237,.07);border-radius:14px;padding:14px')}>
                <div
                  style={S(
                    'font-size:22px;font-weight:900;font-stretch:113%;letter-spacing:-.013em;color:#F4F2ED;line-height:1',
                  )}
                >
                  {m.value}
                </div>
                <div
                  style={S(
                    'font-size:9.5px;letter-spacing:.11em;text-transform:uppercase;font-weight:800;color:#5BE3A0;margin-top:6px',
                  )}
                >
                  {m.label}
                </div>
              </div>
            </React.Fragment>
          ))}
        </div>
        <div style={S('font-size:12px;line-height:1.5;color:rgba(244,242,237,.5);margin:-6px 0 12px')}>
          {v.targets.proteinBasis}
        </div>
        <div
          style={S(
            'font-size:9.5px;letter-spacing:.12em;text-transform:uppercase;font-weight:800;color:rgba(244,242,237,.38);margin-bottom:9px',
          )}
        >
          How protein is set
        </div>
        <div style={S('display:flex;gap:8px;margin-bottom:10px')}>
          {(v.targets.pOpts ?? []).map((p: VmRow, i: number) => (
            <React.Fragment key={i}>
              <button onClick={p.pick} style={S(p.style)}>
                <div style={S(p.labelStyle)}>{p.label}</div>
                <div style={S(p.subStyle)}>{p.sub}</div>
              </button>
            </React.Fragment>
          ))}
        </div>
        {v.targets.pCustomOn ? (
          <>
            <div
              style={S(
                'display:flex;align-items:center;justify-content:space-between;gap:12px;background:rgba(244,242,237,.07);border-radius:14px;padding:11px 11px 11px 15px;margin-bottom:16px',
              )}
            >
              <div style={S('font-size:12.5px;font-weight:700;color:rgba(244,242,237,.72)')}>
                Daily protein
              </div>
              <div style={S('display:flex;align-items:center;gap:10px')}>
                <button
                  className={'dc-ho6'}
                  onClick={v.targets.pDown}
                  style={S(
                    'width:34px;height:32px;border-radius:10px;background:rgba(244,242,237,.12);display:flex;align-items:center;justify-content:center',
                  )}
                >
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#F4F2ED"
                    strokeWidth="3"
                    strokeLinecap="round"
                  >
                    <path d="M5 12h14" />
                  </svg>
                </button>
                <div
                  style={S(
                    'font-size:17px;font-weight:900;font-stretch:113%;color:#F4F2ED;min-width:52px;text-align:center',
                  )}
                >
                  {v.targets.pCustomVal}
                </div>
                <button
                  className={'dc-ho6'}
                  onClick={v.targets.pUp}
                  style={S(
                    'width:34px;height:32px;border-radius:10px;background:rgba(244,242,237,.12);display:flex;align-items:center;justify-content:center',
                  )}
                >
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#F4F2ED"
                    strokeWidth="3"
                    strokeLinecap="round"
                  >
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </button>
              </div>
            </div>
          </>
        ) : null}
        <div
          style={S(
            'display:flex;gap:10px;align-items:flex-start;background:rgba(91,227,160,.1);border-radius:14px;padding:14px 15px;margin-bottom:16px',
          )}
        >
          <div
            style={S(
              'width:18px;height:18px;border-radius:5px;background:#5BE3A0;display:flex;align-items:center;justify-content:center;flex:none;margin-top:1px',
            )}
          >
            <span style={S('font-size:7.5px;font-weight:900;color:#111815;letter-spacing:-.04em')}>A</span>
          </div>
          <div style={S('font-size:12.5px;line-height:1.45;color:#5BE3A0;font-weight:600')}>
            {v.targets.tuning}
          </div>
        </div>
        <div style={S('font-size:12px;line-height:1.55;color:rgba(244,242,237,.42);margin-bottom:20px')}>
          {v.targets.disclaimer}
        </div>
        <button
          className={'dc-ho1'}
          onClick={v.startBuild}
          style={S(
            'width:100%;display:flex;align-items:center;justify-content:space-between;padding:18px 20px;background:#17A05E;color:#fff;font-weight:800;font-size:16px;border-radius:14px',
          )}
        >
          <span>Build my week</span>
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
        <button
          onClick={v.obBack}
          style={S(
            'width:100%;padding:14px;margin-top:8px;font-weight:700;font-size:13.5px;color:rgba(244,242,237,.5)',
          )}
        >
          Back to my numbers
        </button>
      </div>
    </>
  );
}
