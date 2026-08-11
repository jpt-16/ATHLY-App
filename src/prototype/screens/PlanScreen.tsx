// Converted from the ATHLY Claude Design prototype (ATHLY.dc.html).
// Markup and inline styles are preserved verbatim; only the template syntax
// (sc-if / sc-for / {{ }}) was translated to JSX.

import React from 'react';
import type { ViewModel, VmRow } from '../viewModel';
import { S } from '../styles';

export function PlanScreen({ v }: { v: ViewModel }) {
  return (
    <>
      <div
        className={'ffs'}
        style={S('position:absolute;inset:0;overflow-y:auto;padding-bottom:130px;animation:ffFade .3s ease')}
      >
        <div style={S('padding:58px 22px 14px')}>
          <div style={S('display:flex;align-items:center;gap:8px;margin-bottom:8px')}>
            <div
              style={S(
                'width:20px;height:20px;border-radius:6px;background:#17A05E;display:flex;align-items:center;justify-content:center;flex:none',
              )}
            >
              <span style={S('font-size:8.5px;font-weight:900;color:#fff;letter-spacing:-.04em')}>A</span>
            </div>
            <div
              style={S(
                'font-size:11px;letter-spacing:.12em;text-transform:uppercase;font-weight:800;color:#17A05E',
              )}
            >
              Athly planner
            </div>
          </div>
          <h1
            style={S(
              'margin:0;font-size:29px;font-weight:900;font-stretch:113%;letter-spacing:-.013em;line-height:1.05',
            )}
          >
            What are we making?
          </h1>
        </div>
        <div style={S('padding:0 22px 14px')}>
          <button
            className={'dc-ho9'}
            onClick={v.goProfile}
            style={S('width:100%;text-align:left;background:#fff;border-radius:14px;padding:13px 15px')}
          >
            <div style={S('display:flex;align-items:center;justify-content:space-between;margin-bottom:9px')}>
              <div
                style={S(
                  'font-size:10px;letter-spacing:.12em;text-transform:uppercase;font-weight:800;color:#8C8779',
                )}
              >
                Every result respects
              </div>
              <span style={S('font-size:11.5px;font-weight:800;color:#17A05E')}>Edit</span>
            </div>
            <div style={S('display:flex;flex-wrap:wrap;gap:6px')}>
              {(v.constraints ?? []).map((c: VmRow, i: number) => (
                <React.Fragment key={i}>
                  <span style={S(c.style)}>{c.label}</span>
                </React.Fragment>
              ))}
            </div>
          </button>
        </div>
        <div style={S('padding:0 22px 18px')}>
          <div
            style={S('display:flex;border:2px solid rgba(17,24,21,.14);border-radius:14px;overflow:hidden')}
          >
            {(v.scopes ?? []).map((s: VmRow, i: number) => (
              <React.Fragment key={i}>
                <button onClick={s.pick} style={S(s.style)}>
                  {s.label}
                </button>
              </React.Fragment>
            ))}
          </div>
        </div>
        {v.plannerChat ? (
          <>
            <div style={S('padding:0 22px')}>
              <div style={S('background:#111815;border-radius:18px;padding:18px;color:#F4F2ED')}>
                <div
                  style={S(
                    'font-size:10px;letter-spacing:.12em;text-transform:uppercase;font-weight:800;color:#5BE3A0;margin-bottom:10px',
                  )}
                >
                  Just tell me
                </div>
                <textarea
                  value={v.planText}
                  onChange={v.planTextChange}
                  placeholder="I have chicken, rice and cheese at home. Something under 20 minutes, high protein."
                  style={S(
                    'width:100%;min-height:96px;resize:none;background:transparent;border:0;outline:none;color:#F4F2ED;font:inherit;font-size:15.5px;line-height:1.5;caret-color:#5BE3A0',
                  )}
                />
                <div style={S('height:2px;background:rgba(244,242,237,.14);margin:6px 0 14px')} />
                <div style={S('display:flex;flex-wrap:wrap;gap:7px')}>
                  {(v.prompts ?? []).map((p: VmRow, i: number) => (
                    <React.Fragment key={i}>
                      <button
                        className={'dc-ho11'}
                        onClick={p.pick}
                        style={S(
                          'padding:7px 12px;border:1.5px solid rgba(244,242,237,.22);border-radius:99px;font-size:12px;font-weight:600;color:rgba(244,242,237,.8)',
                        )}
                      >
                        {p.label}
                      </button>
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>
          </>
        ) : null}
        {v.plannerForm ? (
          <>
            <div style={S('padding:0 22px;display:flex;flex-direction:column;gap:14px')}>
              <div
                style={S(
                  'background:#fff;box-shadow:0 1px 2px rgba(17,24,21,.045),0 12px 28px -18px rgba(17,24,21,.28);border-radius:18px;padding:17px',
                )}
              >
                <div
                  style={S(
                    'display:flex;justify-content:space-between;align-items:baseline;margin-bottom:12px',
                  )}
                >
                  <div
                    style={S(
                      'font-size:10px;letter-spacing:.12em;text-transform:uppercase;font-weight:800;color:#8C8779',
                    )}
                  >
                    Calories
                  </div>
                  <div style={S('font-size:19px;font-weight:900;font-stretch:113%;letter-spacing:-.008em')}>
                    {v.calVal}
                  </div>
                </div>
                <input
                  type="range"
                  min="300"
                  max="1200"
                  step="50"
                  value={v.cal}
                  onChange={v.calChange}
                  style={S('width:100%;accent-color:#17A05E')}
                />
                <div style={S('height:2px;background:rgba(17,24,21,.1);margin:16px 0 12px')} />
                <div
                  style={S(
                    'display:flex;justify-content:space-between;align-items:baseline;margin-bottom:12px',
                  )}
                >
                  <div
                    style={S(
                      'font-size:10px;letter-spacing:.12em;text-transform:uppercase;font-weight:800;color:#8C8779',
                    )}
                  >
                    Protein floor
                  </div>
                  <div style={S('font-size:19px;font-weight:900;font-stretch:113%;letter-spacing:-.008em')}>
                    {v.proVal}
                  </div>
                </div>
                <input
                  type="range"
                  min="10"
                  max="80"
                  step="5"
                  value={v.pro}
                  onChange={v.proChange}
                  style={S('width:100%;accent-color:#17A05E')}
                />
              </div>
              <div
                style={S(
                  'background:#fff;box-shadow:0 1px 2px rgba(17,24,21,.045),0 12px 28px -18px rgba(17,24,21,.28);border-radius:18px;padding:17px',
                )}
              >
                <div
                  style={S(
                    'font-size:10px;letter-spacing:.12em;text-transform:uppercase;font-weight:800;color:#8C8779;margin-bottom:10px',
                  )}
                >
                  Time I've got
                </div>
                <div style={S('display:flex;gap:8px;margin-bottom:16px')}>
                  {(v.timeOpts ?? []).map((t: VmRow, i: number) => (
                    <React.Fragment key={i}>
                      <button onClick={t.pick} style={S(t.style)}>
                        {t.label}
                      </button>
                    </React.Fragment>
                  ))}
                </div>
                <div
                  style={S(
                    'font-size:10px;letter-spacing:.12em;text-transform:uppercase;font-weight:800;color:#8C8779;margin-bottom:10px',
                  )}
                >
                  Budget per meal
                </div>
                <div style={S('display:flex;gap:8px')}>
                  {(v.budgetOpts ?? []).map((b: VmRow, i: number) => (
                    <React.Fragment key={i}>
                      <button onClick={b.pick} style={S(b.style)}>
                        {b.label}
                      </button>
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>
          </>
        ) : null}
        {v.planError ? (
          <>
            <div style={S('padding:16px 22px 0;animation:ffIn .3s ease')}>
              <div
                style={S(
                  'border:2px solid #C4472C;border-radius:14px;padding:15px 16px;background:rgba(196,71,44,.06)',
                )}
              >
                <div style={S('font-size:13.5px;font-weight:800;color:#A03A22;margin-bottom:5px')}>
                  That combo is tight.
                </div>
                <div style={S('font-size:13px;line-height:1.45;color:#6E6A60')}>
                  {v.proVal} protein under a $ budget doesn't leave much. Loosen the budget one notch and I'll
                  find eight options.
                </div>
                <button
                  onClick={v.fixBudget}
                  style={S(
                    'margin-top:11px;padding:8px 14px;background:#111815;color:#fff;font-weight:800;font-size:12.5px;border-radius:10px',
                  )}
                >
                  Loosen budget
                </button>
              </div>
            </div>
          </>
        ) : null}
        <div style={S('padding:20px 22px 0')}>
          <button
            className={'dc-ho1'}
            onClick={v.generate}
            style={S(
              'width:100%;display:flex;align-items:center;justify-content:space-between;padding:18px 20px;background:#17A05E;color:#fff;font-weight:800;font-size:16px;border-radius:14px',
            )}
          >
            <span>{v.generateLabel}</span>
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
        {v.hasResults ? (
          <>
            <div style={S('padding:28px 22px 0;animation:ffIn .4s ease')}>
              <div
                style={S(
                  'display:flex;align-items:baseline;justify-content:space-between;margin-bottom:12px',
                )}
              >
                <h3
                  style={S(
                    'margin:0;font-size:19px;font-weight:900;font-stretch:113%;letter-spacing:-.011em',
                  )}
                >
                  Three that fit you
                </h3>
                <button onClick={v.generate} style={S('font-size:12px;font-weight:800;color:#17A05E')}>
                  Regenerate
                </button>
              </div>
              <div style={S('display:flex;flex-direction:column;gap:10px')}>
                {(v.results ?? []).map((r: VmRow, i: number) => (
                  <React.Fragment key={i}>
                    <button
                      className={'dc-ho9'}
                      onClick={r.open}
                      style={S(
                        'display:flex;flex-direction:column;padding:12px;background:#fff;box-shadow:0 1px 2px rgba(17,24,21,.045),0 12px 28px -18px rgba(17,24,21,.28);border-radius:18px;width:100%;text-align:left;gap:11px',
                      )}
                    >
                      <div style={S('display:flex;gap:13px;align-items:center;width:100%')}>
                        <div
                          style={S(
                            'width:74px;height:74px;border-radius:14px;overflow:hidden;flex:none;position:relative',
                          )}
                        >
                          <div style={S(r.fieldStyle)}>
                            <span style={S(r.wordStyle)}>{r.word}</span>
                          </div>
                        </div>
                        <div style={S('flex:1;min-width:0')}>
                          <div
                            style={S(
                              'font-size:15.5px;font-weight:800;letter-spacing:-.015em;line-height:1.25;margin-bottom:5px',
                            )}
                          >
                            {r.name}
                          </div>
                          <div style={S('font-size:12px;color:#6E6A60;font-weight:700;margin-bottom:7px')}>
                            {r.macroText}
                          </div>
                          <div style={S('display:flex;gap:6px;flex-wrap:wrap')}>
                            {(r.tags ?? []).map((t: VmRow, i1: number) => (
                              <React.Fragment key={i1}>
                                <span
                                  style={S(
                                    'padding:3px 9px;border-radius:99px;background:rgba(23,160,94,.11);color:#0E7B47;font-size:10.5px;font-weight:800',
                                  )}
                                >
                                  {t}
                                </span>
                              </React.Fragment>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div
                        style={S(
                          'display:flex;gap:9px;align-items:flex-start;padding-top:11px;border-top:1px solid rgba(17,24,21,.09);width:100%',
                        )}
                      >
                        <div
                          style={S(
                            'width:17px;height:17px;border-radius:5px;background:#111815;display:flex;align-items:center;justify-content:center;flex:none;margin-top:1px',
                          )}
                        >
                          <span
                            style={S('font-size:7px;font-weight:900;color:#F4F2ED;letter-spacing:-.04em')}
                          >
                            A
                          </span>
                        </div>
                        <div style={S('font-size:12.5px;line-height:1.4;color:#4A4740;font-weight:600')}>
                          {r.why}
                        </div>
                      </div>
                    </button>
                  </React.Fragment>
                ))}
              </div>
            </div>
          </>
        ) : null}
      </div>
    </>
  );
}
