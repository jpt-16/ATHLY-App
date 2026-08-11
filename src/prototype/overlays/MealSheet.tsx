// Converted from the ATHLY Claude Design prototype (ATHLY.dc.html).
// Markup and inline styles are preserved verbatim; only the template syntax
// (sc-if / sc-for / {{ }}) was translated to JSX.

import React from 'react';
import type { ViewModel, VmRow } from '../viewModel';
import { S } from '../styles';

export function MealSheet({ v }: { v: ViewModel }) {
  return (
    <>
      <div
        style={S(
          'position:absolute;inset:0;z-index:60;background:rgba(17,24,21,.4);animation:ffFade .2s ease',
        )}
        onClick={v.closeOverlay}
      />
      <div
        className={'ffs'}
        style={S(
          'position:absolute;left:0;right:0;bottom:0;top:34px;z-index:61;background:#F4F2ED;border-radius:24px 24px 0 0;overflow-y:auto;animation:ffUp .34s cubic-bezier(.2,.85,.25,1)',
        )}
      >
        <div style={S('position:relative;height:220px;overflow:hidden;border-radius:24px 24px 0 0')}>
          <div style={S(v.meal.fieldStyle)}>
            <span style={S(v.meal.wordStyle)}>{v.meal.word}</span>
          </div>
          <button
            onClick={v.closeOverlay}
            style={S(
              'position:absolute;right:16px;top:16px;width:36px;height:36px;border-radius:50%;background:rgba(244,242,237,.92);display:flex;align-items:center;justify-content:center;z-index:2',
            )}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#111815"
              strokeWidth="2.8"
              strokeLinecap="round"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        <div style={S('padding:20px 22px 0')}>
          <div
            style={S(
              'font-size:11px;letter-spacing:.12em;text-transform:uppercase;font-weight:800;color:#17A05E;margin-bottom:7px',
            )}
          >
            {v.meal.slot} · {v.meal.timeText}
          </div>
          <h2
            style={S(
              'margin:0 0 14px;font-size:28px;font-weight:900;font-stretch:113%;letter-spacing:-.013em;line-height:1.08',
            )}
          >
            {v.meal.name}
          </h2>
          <div
            style={S(
              'display:grid;grid-template-columns:repeat(4,1fr);background:#fff;box-shadow:0 1px 2px rgba(17,24,21,.045),0 12px 28px -18px rgba(17,24,21,.28);border-radius:18px;overflow:hidden',
            )}
          >
            {(v.meal.macros ?? []).map((m: VmRow, i: number) => (
              <React.Fragment key={i}>
                <div style={S(m.style)}>
                  <div
                    style={S(
                      'font-size:20px;font-weight:900;font-stretch:113%;letter-spacing:-.013em;line-height:1',
                    )}
                  >
                    {m.value}
                  </div>
                  <div
                    style={S(
                      'font-size:9.5px;letter-spacing:.1em;text-transform:uppercase;font-weight:800;color:#8C8779;margin-top:5px',
                    )}
                  >
                    {m.label}
                  </div>
                </div>
              </React.Fragment>
            ))}
          </div>
        </div>
        <div style={S('padding:14px 22px 0')}>
          <div style={S('background:#111815;border-radius:18px;padding:16px 17px;color:#F4F2ED')}>
            <div style={S('display:flex;align-items:center;gap:8px;margin-bottom:11px')}>
              <div
                style={S(
                  'width:19px;height:19px;border-radius:6px;background:#5BE3A0;display:flex;align-items:center;justify-content:center;flex:none',
                )}
              >
                <span style={S('font-size:8px;font-weight:900;color:#111815;letter-spacing:-.04em')}>A</span>
              </div>
              <div
                style={S(
                  'font-size:10px;letter-spacing:.12em;text-transform:uppercase;font-weight:800;color:#5BE3A0',
                )}
              >
                Why you got this one
              </div>
            </div>
            <div style={S('display:flex;flex-direction:column;gap:9px')}>
              {(v.meal.reasons ?? []).map((r: VmRow, i: number) => (
                <React.Fragment key={i}>
                  <div style={S('display:flex;gap:10px;align-items:flex-start')}>
                    <div
                      style={S(
                        'width:5px;height:5px;border-radius:50%;background:#5BE3A0;margin-top:7px;flex:none',
                      )}
                    />
                    <div
                      style={S('font-size:13px;line-height:1.45;color:rgba(244,242,237,.82);font-weight:600')}
                    >
                      {r}
                    </div>
                  </div>
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
        <div className={'ffs'} style={S('padding:16px 22px 0;display:flex;gap:8px;overflow-x:auto')}>
          {(v.mealActions ?? []).map((a: VmRow, i: number) => (
            <React.Fragment key={i}>
              <button onClick={a.tap} style={S(a.style)}>
                {a.label}
              </button>
            </React.Fragment>
          ))}
        </div>
        <div style={S('padding:24px 22px 0')}>
          <div
            style={S('display:flex;align-items:baseline;justify-content:space-between;margin-bottom:10px')}
          >
            <h3 style={S('margin:0;font-size:17px;font-weight:900;letter-spacing:-.02em')}>Ingredients</h3>
            <div
              style={S(
                'font-size:11px;letter-spacing:.1em;text-transform:uppercase;font-weight:800;color:#8C8779',
              )}
            >
              Serves 1
            </div>
          </div>
          <div
            style={S(
              'background:#fff;box-shadow:0 1px 2px rgba(17,24,21,.045),0 12px 28px -18px rgba(17,24,21,.28);border-radius:18px;padding:4px 16px',
            )}
          >
            {(v.meal.ingredients ?? []).map((i: VmRow, i_: number) => (
              <React.Fragment key={i_}>
                <div style={S(i.style)}>
                  <span style={S('font-size:14px;font-weight:600')}>{i.name}</span>
                  <span style={S('display:flex;align-items:center;gap:8px')}>
                    <span style={S('font-size:13px;color:#6E6A60;font-weight:600')}>{i.qty}</span>
                    <span style={S(i.have)}>{i.haveText}</span>
                  </span>
                </div>
              </React.Fragment>
            ))}
          </div>
        </div>
        <div style={S('padding:24px 22px 0')}>
          <h3 style={S('margin:0 0 10px;font-size:17px;font-weight:900;letter-spacing:-.02em')}>
            How to make it
          </h3>
          <div style={S('display:flex;flex-direction:column;gap:2px')}>
            {(v.meal.steps ?? []).map((s: VmRow, i: number) => (
              <React.Fragment key={i}>
                <div style={S('display:flex;gap:14px;padding:14px 0;border-top:2px solid rgba(17,24,21,.1)')}>
                  <div
                    style={S(
                      'width:26px;height:26px;border-radius:50%;background:#111815;color:#F4F2ED;font-size:12px;font-weight:800;display:flex;align-items:center;justify-content:center;flex:none',
                    )}
                  >
                    {s.n}
                  </div>
                  <div style={S('font-size:14px;line-height:1.5;color:#3B3831;padding-top:2px')}>
                    {s.text}
                  </div>
                </div>
              </React.Fragment>
            ))}
          </div>
        </div>
        <div style={S('padding:22px 22px 40px')}>
          <button
            className={'dc-ho12'}
            onClick={v.addGrocery}
            style={S(
              'width:100%;display:flex;align-items:center;justify-content:space-between;padding:17px 20px;background:#111815;color:#fff;font-weight:800;font-size:15px;border-radius:14px',
            )}
          >
            <span>Add missing items to grocery list</span>
            <svg
              width="19"
              height="19"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.6"
              strokeLinecap="round"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
        </div>
      </div>
    </>
  );
}
