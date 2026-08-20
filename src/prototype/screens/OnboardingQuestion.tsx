// Converted from the ATHLY Claude Design prototype (ATHLY.dc.html).
// Markup and inline styles are preserved verbatim; only the template syntax
// (sc-if / sc-for / {{ }}) was translated to JSX.

import React from 'react';
import type { ViewModel, VmRow } from '../viewModel';
import { S } from '../styles';
import { TimePicker } from './TimePicker';

/**
 * Ceilings on the two fields an athlete types freely into.
 *
 * Both mirror CHECK constraints added in `0004_limits.sql`, and neither is the
 * enforcement — a `maxLength` attribute is a courtesy to someone using the app,
 * not an obstacle to someone using the API. What it buys is that a name the
 * column would reject cannot be typed in the first place, so the failure never
 * arrives thirteen questions later as a save that did not work.
 */
const NAME_MAX = 60;
const ENTRY_MAX = 40;

export function OnboardingQuestion({ v }: { v: ViewModel }) {
  return (
    <>
      <div className={'ffs'} style={S('flex:1;overflow-y:auto;padding:26px 22px 0')}>
        <div
          style={S(
            'font-size:11px;letter-spacing:.14em;text-transform:uppercase;font-weight:800;color:#17A05E;margin-bottom:10px',
          )}
        >
          {v.obKicker}
        </div>
        <h2
          style={S(
            'margin:0 0 8px;font-size:31px;line-height:1.05;font-weight:900;font-stretch:113%;letter-spacing:-.013em;text-wrap:balance',
          )}
        >
          {v.obTitle}
        </h2>
        <p style={S('margin:0 0 22px;font-size:14px;line-height:1.5;color:#6E6A60')}>{v.obSub}</p>
        {v.obIsText ? (
          <>
            <div style={S('padding-bottom:20px')}>
              <input
                value={v.nameDraft}
                onChange={v.nameChange}
                // Matches `profiles_name_length` in 0004. The database is where
                // the bound holds — a client can be replaced — but a field that
                // accepts more than the column will is a save that fails at the
                // end of onboarding for a reason nobody can see.
                maxLength={NAME_MAX}
                placeholder="e.g. Jordan"
                style={S(
                  'width:100%;padding:18px;font:inherit;font-size:24px;font-weight:800;letter-spacing:-.02em;background:#fff;border:2px solid rgba(17,24,21,.12);border-radius:14px;color:#111815;caret-color:#17A05E',
                )}
              />
              <div style={S('margin-top:12px;font-size:12.5px;color:#8C8779;line-height:1.5')}>
                Athly IQ uses it to talk to you, nothing else.
              </div>
            </div>
          </>
        ) : null}
        {v.obIsList ? (
          <>
            <div style={S('display:flex;flex-direction:column;gap:10px;padding-bottom:20px')}>
              {(v.obOptions ?? []).map((opt: VmRow, i: number) => (
                <React.Fragment key={i}>
                  <button className={'dc-ho2'} onClick={opt.pick} style={S(opt.rowStyle)}>
                    <div style={S('display:flex;flex-direction:column;gap:3px;text-align:left')}>
                      <div style={S('font-weight:800;font-size:16px;letter-spacing:-.01em')}>{opt.label}</div>
                      <div style={S('font-size:12.5px;color:#6E6A60;line-height:1.35')}>{opt.hint}</div>
                    </div>
                    <div style={S(opt.dotStyle)} />
                  </button>
                </React.Fragment>
              ))}
            </div>
          </>
        ) : null}
        {v.obIsBody ? (
          <>
            <div style={S('display:flex;flex-direction:column;gap:10px;padding-bottom:20px')}>
              {(v.bodyRows ?? []).map((b: VmRow, i: number) => (
                <React.Fragment key={i}>
                  <div
                    style={S(
                      'display:flex;align-items:center;justify-content:space-between;gap:12px;background:#fff;border-radius:14px;padding:14px 14px 14px 17px',
                    )}
                  >
                    <div>
                      <div
                        style={S(
                          'font-size:10px;letter-spacing:.12em;text-transform:uppercase;font-weight:800;color:#8C8779;margin-bottom:5px',
                        )}
                      >
                        {b.label}
                      </div>
                      <div
                        style={S(
                          'font-size:26px;font-weight:900;font-stretch:113%;letter-spacing:-.013em;line-height:1',
                        )}
                      >
                        {b.value}
                      </div>
                    </div>
                    <div style={S('display:flex;gap:8px')}>
                      <button
                        className={'dc-ho3'}
                        onClick={b.dec}
                        style={S(
                          'width:44px;height:44px;border-radius:12px;border:2px solid rgba(17,24,21,.13);display:flex;align-items:center;justify-content:center',
                        )}
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#111815"
                          strokeWidth="3"
                          strokeLinecap="round"
                        >
                          <path d="M5 12h14" />
                        </svg>
                      </button>
                      <button
                        className={'dc-ho4'}
                        onClick={b.inc}
                        style={S(
                          'width:44px;height:44px;border-radius:12px;background:#111815;display:flex;align-items:center;justify-content:center',
                        )}
                      >
                        <svg
                          width="16"
                          height="16"
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
                </React.Fragment>
              ))}
              <div
                style={S(
                  'display:flex;gap:10px;align-items:flex-start;background:rgba(23,160,94,.08);border-radius:14px;padding:14px 15px',
                )}
              >
                <div
                  style={S(
                    'width:18px;height:18px;border-radius:5px;background:#17A05E;display:flex;align-items:center;justify-content:center;flex:none;margin-top:1px',
                  )}
                >
                  <span style={S('font-size:7.5px;font-weight:900;color:#fff;letter-spacing:-.04em')}>A</span>
                </div>
                <div style={S('font-size:12.5px;line-height:1.45;color:#0E7B47;font-weight:600')}>
                  These set your starting calorie and protein numbers. You'll see the math before we build
                  anything.
                </div>
              </div>
            </div>
          </>
        ) : null}
        {v.obIsTarget ? (
          <>
            <div style={S('display:flex;flex-direction:column;gap:10px;padding-bottom:20px')}>
              <div style={S('display:flex;gap:10px')}>
                <div style={S('flex:1;background:#fff;border-radius:14px;padding:15px 16px')}>
                  <div
                    style={S(
                      'font-size:10px;letter-spacing:.12em;text-transform:uppercase;font-weight:800;color:#8C8779;margin-bottom:6px',
                    )}
                  >
                    Now
                  </div>
                  <div
                    style={S(
                      'font-size:25px;font-weight:900;font-stretch:113%;letter-spacing:-.013em;line-height:1',
                    )}
                  >
                    {v.nowWeight}
                  </div>
                </div>
                <div
                  style={S(
                    'flex:1.3;background:#111815;border-radius:14px;padding:13px 13px 13px 16px;display:flex;align-items:center;justify-content:space-between;gap:10px',
                  )}
                >
                  <div>
                    <div
                      style={S(
                        'font-size:10px;letter-spacing:.12em;text-transform:uppercase;font-weight:800;color:#5BE3A0;margin-bottom:6px',
                      )}
                    >
                      Goal
                    </div>
                    <div
                      style={S(
                        'font-size:25px;font-weight:900;font-stretch:113%;letter-spacing:-.013em;line-height:1;color:#F4F2ED',
                      )}
                    >
                      {v.goalWeight}
                    </div>
                  </div>
                  <div style={S('display:flex;flex-direction:column;gap:6px')}>
                    <button
                      className={'dc-ho5'}
                      onClick={v.goalUp}
                      style={S(
                        'width:40px;height:32px;border-radius:9px;background:rgba(244,242,237,.14);display:flex;align-items:center;justify-content:center',
                      )}
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#F4F2ED"
                        strokeWidth="3"
                        strokeLinecap="round"
                      >
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                    </button>
                    <button
                      className={'dc-ho5'}
                      onClick={v.goalDown}
                      style={S(
                        'width:40px;height:32px;border-radius:9px;background:rgba(244,242,237,.14);display:flex;align-items:center;justify-content:center',
                      )}
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#F4F2ED"
                        strokeWidth="3"
                        strokeLinecap="round"
                      >
                        <path d="M5 12h14" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
              <div style={S('background:#fff;border-radius:14px;padding:16px')}>
                <div
                  style={S(
                    'font-size:10px;letter-spacing:.12em;text-transform:uppercase;font-weight:800;color:#8C8779;margin-bottom:11px',
                  )}
                >
                  {v.rateLabel}
                </div>
                <div style={S('display:flex;gap:6px')}>
                  {(v.rateOpts ?? []).map((r: VmRow, i: number) => (
                    <React.Fragment key={i}>
                      <button onClick={r.pick} style={S(r.style)}>
                        {r.label}
                      </button>
                    </React.Fragment>
                  ))}
                </div>
              </div>
              <div
                style={S(
                  'display:flex;gap:10px;align-items:flex-start;background:rgba(23,160,94,.08);border-radius:14px;padding:14px 15px',
                )}
              >
                <div
                  style={S(
                    'width:18px;height:18px;border-radius:5px;background:#17A05E;display:flex;align-items:center;justify-content:center;flex:none;margin-top:1px',
                  )}
                >
                  <span style={S('font-size:7.5px;font-weight:900;color:#fff;letter-spacing:-.04em')}>A</span>
                </div>
                <div style={S('font-size:12.5px;line-height:1.45;color:#0E7B47;font-weight:600')}>
                  {v.paceNote}
                </div>
              </div>
              <div style={S('font-size:11.5px;line-height:1.5;color:#8C8779;font-weight:600;padding:0 2px')}>
                {v.paceScope}
              </div>
            </div>
          </>
        ) : null}
        {v.obIsChips ? (
          <>
            {v.obHasNote ? (
              <>
                <div
                  style={S(
                    'margin:-8px 0 16px;font-size:12.5px;line-height:1.45;color:#0E7B47;font-weight:700;background:rgba(23,160,94,.09);border-radius:11px;padding:11px 13px',
                  )}
                >
                  {v.obNote}
                </div>
              </>
            ) : null}
            <div style={S('display:flex;flex-wrap:wrap;gap:8px;padding-bottom:22px')}>
              {(v.obOptions ?? []).map((opt: VmRow, i: number) => (
                <React.Fragment key={i}>
                  <button onClick={opt.pick} style={S(opt.chipStyle)}>
                    {opt.label}
                  </button>
                </React.Fragment>
              ))}
            </div>
            <div style={S('padding-bottom:20px')}>
              <div
                style={S(
                  'font-size:11px;letter-spacing:.1em;text-transform:uppercase;font-weight:800;color:#8C8779;margin-bottom:8px',
                )}
              >
                Or type your own
              </div>
              <input
                value={v.obDraft}
                onChange={v.obDraftChange}
                onKeyDown={v.obDraftKey}
                maxLength={ENTRY_MAX}
                placeholder={v.obDraftHint}
                style={S(
                  'width:100%;padding:13px 14px;font:inherit;font-size:14px;background:#fff;border:2px solid rgba(17,24,21,.12);border-radius:12px;color:#111815;caret-color:#17A05E',
                )}
              />
            </div>
          </>
        ) : null}
        {v.obIsWeek ? (
          <>
            <div style={S('display:flex;flex-direction:column;gap:8px;padding-bottom:22px')}>
              {(v.weekRows ?? []).map((d: VmRow, i: number) => (
                <React.Fragment key={i}>
                  <div style={S(d.rowStyle)}>
                    <button onClick={d.toggle} style={S(d.headStyle)}>
                      <span style={S(d.dayStyle)}>{d.day}</span>
                      <span style={S(d.dotStyle)} />
                      <span style={S(d.sumStyle)}>{d.summary}</span>
                      <svg
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#B5B0A4"
                        strokeWidth="2.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={S(d.caretStyle)}
                      >
                        <path d="M6 9l6 6 6-6" />
                      </svg>
                    </button>
                    {d.open ? (
                      <>
                        <div style={S('display:flex;flex-direction:column;gap:14px;padding:2px 14px 15px')}>
                          <div
                            style={S(
                              'display:flex;border:2px solid rgba(17,24,21,.12);border-radius:11px;overflow:hidden',
                            )}
                          >
                            {(d.modes ?? []).map((m: VmRow, i1: number) => (
                              <React.Fragment key={i1}>
                                <button onClick={m.pick} style={S(m.style)}>
                                  {m.label}
                                </button>
                              </React.Fragment>
                            ))}
                          </div>
                          {d.hasTime ? (
                            <>
                              <div>
                                <div
                                  style={S(
                                    'font-size:9.5px;letter-spacing:.12em;text-transform:uppercase;font-weight:800;color:#8C8779;margin-bottom:8px',
                                  )}
                                >
                                  {d.timeLabel}
                                </div>
                                <div
                                  className={'ffs'}
                                  style={S('display:flex;gap:7px;overflow-x:auto;padding-bottom:2px')}
                                >
                                  {(d.times ?? []).map((t: VmRow, i1: number) => (
                                    <React.Fragment key={i1}>
                                      <button onClick={t.pick} style={S(t.style)}>
                                        {t.label}
                                      </button>
                                    </React.Fragment>
                                  ))}
                                  <TimePicker value={d.timeValue ?? ''} onChange={d.setTime} />
                                </div>
                              </div>
                            </>
                          ) : null}
                          <div>
                            <button onClick={d.liftToggle} style={S(d.liftStyle)}>
                              <span
                                style={S(
                                  'display:flex;align-items:center;gap:9px;font-size:13px;font-weight:800',
                                )}
                              >
                                <svg
                                  width="14"
                                  height="14"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2.6"
                                  strokeLinecap="round"
                                >
                                  <path d="M6 6v12M18 6v12M2 9v6M22 9v6M6 12h12" />
                                </svg>
                                <span>Strength session</span>
                              </span>
                              <span style={S(d.liftStateStyle)}>{d.liftState}</span>
                            </button>
                            {d.lift ? (
                              <>
                                <div
                                  className={'ffs'}
                                  style={S('display:flex;gap:7px;overflow-x:auto;padding:10px 0 2px')}
                                >
                                  {(d.liftTimes ?? []).map((t: VmRow, i1: number) => (
                                    <React.Fragment key={i1}>
                                      <button onClick={t.pick} style={S(t.style)}>
                                        {t.label}
                                      </button>
                                    </React.Fragment>
                                  ))}
                                  <TimePicker value={d.liftTimeValue ?? ''} onChange={d.setLiftTime} />
                                </div>
                              </>
                            ) : null}
                          </div>
                          {d.durOpen ? (
                            <>
                              <div>
                                <div
                                  style={S(
                                    'font-size:9.5px;letter-spacing:.12em;text-transform:uppercase;font-weight:800;color:#8C8779;margin-bottom:8px',
                                  )}
                                >
                                  How long{' '}
                                  <span
                                    style={S(
                                      'text-transform:none;letter-spacing:0;font-weight:700;color:#B5B0A4',
                                    )}
                                  >
                                    · optional
                                  </span>
                                </div>
                                <div style={S('display:flex;gap:7px')}>
                                  {(d.durs ?? []).map((t: VmRow, i1: number) => (
                                    <React.Fragment key={i1}>
                                      <button onClick={t.pick} style={S(t.style)}>
                                        {t.label}
                                      </button>
                                    </React.Fragment>
                                  ))}
                                </div>
                              </div>
                            </>
                          ) : null}
                        </div>
                      </>
                    ) : null}
                  </div>
                </React.Fragment>
              ))}
              <div
                style={S(
                  'display:flex;gap:10px;align-items:flex-start;background:rgba(23,160,94,.08);border-radius:14px;padding:14px 15px;margin-top:6px',
                )}
              >
                <div
                  style={S(
                    'width:18px;height:18px;border-radius:5px;background:#17A05E;display:flex;align-items:center;justify-content:center;flex:none;margin-top:1px',
                  )}
                >
                  <span style={S('font-size:7.5px;font-weight:900;color:#fff;letter-spacing:-.04em')}>A</span>
                </div>
                <div style={S('font-size:12.5px;line-height:1.45;color:#0E7B47;font-weight:600')}>
                  {v.weekSummary}
                </div>
              </div>
            </div>
          </>
        ) : null}
      </div>
      <div
        style={S(
          'padding:14px 22px calc(30px + env(safe-area-inset-bottom, 0px));border-top:2px solid rgba(17,24,21,.1);background:#F4F2ED',
        )}
      >
        <button onClick={v.obNext} disabled={v.obBlocked} style={S(v.obCtaStyle)}>
          <span>{v.obCta}</span>
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
