// Converted from the ATHLY Claude Design prototype (ATHLY.dc.html).
// Markup and inline styles are preserved verbatim; only the template syntax
// (sc-if / sc-for / {{ }}) was translated to JSX.

import React from 'react';
import type { ViewModel, VmRow } from '../viewModel';
import { S } from '../styles';

export function CalendarScreen({ v }: { v: ViewModel }) {
  return (
    <>
      <div
        className={'ffs'}
        style={S(
          'position:absolute;inset:0;overflow-y:auto;padding-bottom:130px;background:#F4F2ED;animation:ffFade .3s ease;z-index:20',
        )}
      >
        <div style={S('padding:58px 22px 14px;display:flex;align-items:center;gap:12px')}>
          <button
            className={'dc-ho0'}
            onClick={v.goHome}
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
          <h1 style={S('margin:0;font-size:25px;font-weight:900;font-stretch:113%;letter-spacing:-.013em')}>
            {v.calMonth}
          </h1>
        </div>
        <div style={S('padding:0 22px 14px')}>
          <div
            style={S('display:flex;border:2px solid rgba(17,24,21,.12);border-radius:12px;overflow:hidden')}
          >
            {(v.calViews ?? []).map((t: VmRow, i: number) => (
              <React.Fragment key={i}>
                <button onClick={t.pick} style={S(t.style)}>
                  {t.label}
                </button>
              </React.Fragment>
            ))}
          </div>
        </div>
        {v.calShowWeek ? (
          <>
            <div style={S('padding:0 22px;display:flex;flex-direction:column;gap:10px')}>
              {(v.weekDays ?? []).map((d: VmRow) => (
                <React.Fragment key={d.key}>
                  <button className={'dc-ho10'} onClick={d.open} style={S(d.cardStyle)}>
                    <div
                      style={S(
                        'display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:8px',
                      )}
                    >
                      <div style={S('display:flex;align-items:baseline;gap:8px')}>
                        <span style={S(d.dayStyle)}>{d.day}</span>
                        <span style={S('font-size:15px;font-weight:900;letter-spacing:-.02em')}>{d.num}</span>
                        {d.isToday ? (
                          <span
                            style={S(
                              'font-size:9.5px;letter-spacing:.1em;text-transform:uppercase;font-weight:800;color:#17A05E',
                            )}
                          >
                            {d.todayLabel}
                          </span>
                        ) : null}
                      </div>
                      <span style={S(d.badgeStyle)}>{d.badge}</span>
                    </div>
                    <div
                      style={S(
                        'font-size:12px;font-weight:700;color:#6E6A60;margin-bottom:10px;padding-bottom:10px;border-bottom:2px solid rgba(17,24,21,.08)',
                      )}
                    >
                      {d.trainingLine}
                    </div>
                    {(d.meals ?? []).map((m: VmRow, j: number) => (
                      <React.Fragment key={j}>
                        <div style={S(m.style)}>
                          <span
                            style={S(
                              'font-size:9.5px;letter-spacing:.09em;text-transform:uppercase;font-weight:800;color:#A9A498;width:74px;flex:none',
                            )}
                          >
                            {m.slot}
                          </span>
                          <span
                            style={S(
                              'flex:1;min-width:0;font-size:13.5px;font-weight:700;letter-spacing:-.01em',
                            )}
                          >
                            {m.name}
                          </span>
                          <span style={S('font-size:11.5px;font-weight:700;color:#8C8779;flex:none')}>
                            {m.macroText}
                          </span>
                        </div>
                      </React.Fragment>
                    ))}
                    <div
                      style={S('margin-top:10px;padding-top:10px;border-top:2px solid rgba(17,24,21,.08)')}
                    >
                      <span style={S(d.totalsStyle)}>{d.totals}</span>
                    </div>
                  </button>
                </React.Fragment>
              ))}
              <div style={S('display:flex;gap:10px;padding:2px 0 4px')}>
                <button
                  className={'dc-ho3'}
                  onClick={() => v.weekShift(-1)}
                  style={S(
                    'flex:1;padding:13px;border:2px solid rgba(17,24,21,.16);border-radius:13px;font-weight:800;font-size:13px',
                  )}
                >
                  Last week
                </button>
                <button
                  className={'dc-ho3'}
                  onClick={() => v.weekShift(1)}
                  style={S(
                    'flex:1;padding:13px;border:2px solid rgba(17,24,21,.16);border-radius:13px;font-weight:800;font-size:13px',
                  )}
                >
                  Next week
                </button>
              </div>
            </div>
          </>
        ) : null}
        {v.calShowMonth ? (
          <>
            <div style={S('padding:0 22px')}>
              <div
                style={S(
                  'background:#fff;box-shadow:0 1px 2px rgba(17,24,21,.045),0 12px 28px -18px rgba(17,24,21,.28);border-radius:18px;padding:16px 14px 12px',
                )}
              >
                <div style={S('display:grid;grid-template-columns:repeat(7,1fr);margin-bottom:8px')}>
                  {(v.calHeads ?? []).map((h: VmRow, i: number) => (
                    <React.Fragment key={i}>
                      <div
                        style={S(
                          'text-align:center;font-size:9.5px;letter-spacing:.1em;text-transform:uppercase;font-weight:800;color:#A9A498',
                        )}
                      >
                        {h.label}
                      </div>
                    </React.Fragment>
                  ))}
                </div>
                <div style={S('display:grid;grid-template-columns:repeat(7,1fr);gap:2px')}>
                  {(v.calCells ?? []).map((c: VmRow, i: number) => (
                    <React.Fragment key={i}>
                      <button onClick={c.tap} style={S(c.style)}>
                        <span style={S(c.numStyle)}>{c.num}</span>
                        <span style={S(c.dot)} />
                      </button>
                    </React.Fragment>
                  ))}
                </div>
                <div
                  style={S(
                    'display:flex;gap:14px;justify-content:center;padding:12px 0 2px;border-top:2px solid rgba(17,24,21,.08);margin-top:10px',
                  )}
                >
                  {(v.calLegend ?? []).map((l: VmRow, i: number) => (
                    <React.Fragment key={i}>
                      <div style={S('display:flex;align-items:center;gap:6px')}>
                        <span style={S(l.dot)} />
                        <span style={S('font-size:10.5px;font-weight:700;color:#6E6A60')}>{l.label}</span>
                      </div>
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>
            <div style={S('padding:16px 22px 0')}>
              <div
                style={S(
                  'font-size:11px;letter-spacing:.12em;text-transform:uppercase;font-weight:800;color:#8C8779;margin-bottom:9px',
                )}
              >
                {v.sel.dateLabel}
              </div>
              <div
                style={S(
                  'background:#fff;box-shadow:0 1px 2px rgba(17,24,21,.045),0 12px 28px -18px rgba(17,24,21,.28);border-radius:18px;padding:16px',
                )}
              >
                {v.sel.hasDur ? (
                  <>
                    <div
                      style={S(
                        'font-size:12px;line-height:1.5;color:#6E6A60;font-weight:600;margin-bottom:14px',
                      )}
                    >
                      {v.sel.durNote}
                    </div>
                  </>
                ) : null}
                <div
                  style={S(
                    'font-size:10px;letter-spacing:.12em;text-transform:uppercase;font-weight:800;color:#8C8779;margin-bottom:10px',
                  )}
                >
                  What's on
                </div>
                <div
                  style={S(
                    'display:flex;border:2px solid rgba(17,24,21,.12);border-radius:12px;overflow:hidden;margin-bottom:12px',
                  )}
                >
                  {(v.sel.modes ?? []).map((m: VmRow, i: number) => (
                    <React.Fragment key={i}>
                      <button onClick={m.pick} style={S(m.style)}>
                        {m.label}
                      </button>
                    </React.Fragment>
                  ))}
                </div>
                {v.sel.hasTime ? (
                  <>
                    <div>
                      <div
                        style={S(
                          'font-size:10px;letter-spacing:.12em;text-transform:uppercase;font-weight:800;color:#8C8779;margin-bottom:9px',
                        )}
                      >
                        {v.sel.timeLabel}
                      </div>
                      <div
                        className={'ffs'}
                        style={S('display:flex;gap:7px;overflow-x:auto;padding-bottom:2px')}
                      >
                        {(v.sel.times ?? []).map((t: VmRow, i: number) => (
                          <React.Fragment key={i}>
                            <button onClick={t.pick} style={S(t.style)}>
                              {t.label}
                            </button>
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  </>
                ) : null}
                <button onClick={v.sel.liftToggle} style={S(v.sel.liftStyle)}>
                  <span style={S(v.sel.liftLabelStyle)}>
                    <svg
                      width="15"
                      height="15"
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
                  <span style={S(v.sel.liftStateStyle)}>{v.sel.liftState}</span>
                </button>
                {v.sel.liftOn ? (
                  <>
                    <div style={S('margin-top:12px')}>
                      <div
                        style={S(
                          'font-size:10px;letter-spacing:.12em;text-transform:uppercase;font-weight:800;color:#8C8779;margin-bottom:9px',
                        )}
                      >
                        Lift starts
                      </div>
                      <div
                        className={'ffs'}
                        style={S('display:flex;gap:7px;overflow-x:auto;padding-bottom:2px')}
                      >
                        {(v.sel.liftTimes ?? []).map((t: VmRow, i: number) => (
                          <React.Fragment key={i}>
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
            </div>
            <div style={S('padding:16px 22px 0')}>
              <div
                style={S(
                  'display:flex;align-items:baseline;justify-content:space-between;margin-bottom:10px',
                )}
              >
                <h3 style={S('margin:0;font-size:17px;font-weight:900;letter-spacing:-.02em')}>
                  Meals that day
                </h3>
                <div
                  style={S(
                    'font-size:11px;letter-spacing:.1em;text-transform:uppercase;font-weight:800;color:#8C8779',
                  )}
                >
                  {v.sel.mealsCount}
                </div>
              </div>
              <div style={S('border-top:2px solid rgba(17,24,21,.12)')}>
                {(v.sel.meals ?? []).map((m: VmRow, i: number) => (
                  <React.Fragment key={i}>
                    <button className={'dc-ho10'} onClick={m.open} style={S(m.rowStyle)}>
                      <div style={S(m.tileStyle)}>
                        <div style={S(m.fieldStyle)}>
                          <span style={S(m.wordStyle)}>{m.word}</span>
                        </div>
                      </div>
                      <div style={S('flex:1;min-width:0;text-align:left')}>
                        <div
                          style={S(
                            'font-size:10px;letter-spacing:.11em;text-transform:uppercase;font-weight:800;color:#8C8779;margin-bottom:3px',
                          )}
                        >
                          {m.slot}
                        </div>
                        <div
                          style={S(
                            'font-size:15px;font-weight:800;letter-spacing:-.015em;line-height:1.25;margin-bottom:4px',
                          )}
                        >
                          {m.name}
                        </div>
                        <div style={S('font-size:12px;color:#6E6A60;font-weight:600')}>{m.macroText}</div>
                      </div>
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
                    </button>
                  </React.Fragment>
                ))}
              </div>
            </div>
            <div style={S('padding:18px 22px 0')}>
              <div
                style={S(
                  'display:flex;gap:10px;align-items:flex-start;background:#111815;border-radius:18px;padding:16px 17px;margin-bottom:12px',
                )}
              >
                <div
                  style={S(
                    'width:19px;height:19px;border-radius:6px;background:#5BE3A0;display:flex;align-items:center;justify-content:center;flex:none;margin-top:1px',
                  )}
                >
                  <span style={S('font-size:8px;font-weight:900;color:#111815;letter-spacing:-.04em')}>
                    A
                  </span>
                </div>
                <div style={S('font-size:13px;line-height:1.45;color:rgba(244,242,237,.82);font-weight:600')}>
                  {v.sel.note}
                </div>
              </div>
              <button
                className={'dc-ho1'}
                onClick={v.replanDay}
                style={S(
                  'width:100%;display:flex;align-items:center;justify-content:space-between;padding:16px 18px;background:#17A05E;color:#fff;border-radius:14px;font-weight:800;font-size:15px',
                )}
              >
                <span>Replan this day</span>
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
        ) : null}
      </div>
    </>
  );
}
