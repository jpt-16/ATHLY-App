// Converted from the ATHLY Claude Design prototype (ATHLY.dc.html).
// Markup and inline styles are preserved verbatim; only the template syntax
// (sc-if / sc-for / {{ }}) was translated to JSX.

import React from 'react';
import type { ViewModel, VmRow } from '../viewModel';
import { S } from '../styles';

export function ProgressScreen({ v }: { v: ViewModel }) {
  return (
    <>
      <div
        className={'ffs'}
        style={S(
          'position:absolute;inset:0;overflow-y:auto;padding-bottom:130px;background:#F4F2ED;animation:ffFade .3s ease;z-index:20',
        )}
      >
        <div style={S('padding:62px 22px 16px;display:flex;align-items:center;gap:12px')}>
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
            Progress
          </h1>
        </div>
        <div style={S('padding:0 22px 14px')}>
          <div style={S('background:#111815;border-radius:18px;padding:20px;color:#F4F2ED')}>
            <div
              style={S(
                'font-size:10px;letter-spacing:.12em;text-transform:uppercase;font-weight:800;color:#5BE3A0;margin-bottom:12px',
              )}
            >
              Consistency, last 8 weeks
            </div>
            {v.progressHasData ? (
              <div style={S('display:flex;align-items:flex-end;gap:7px;height:96px')}>
                {(v.weeks ?? []).map((w: VmRow, i: number) => (
                  <React.Fragment key={i}>
                    <div style={S('flex:1;display:flex;flex-direction:column;align-items:center;gap:8px')}>
                      <div style={S(w.bar)} />
                      <div style={S('font-size:9.5px;font-weight:700;color:rgba(244,242,237,.45)')}>
                        {w.label}
                      </div>
                    </div>
                  </React.Fragment>
                ))}
              </div>
            ) : null}
            <div style={S('height:2px;background:rgba(244,242,237,.12);margin:18px -20px 14px')} />
            <div style={S('font-size:13.5px;line-height:1.5;color:rgba(244,242,237,.72)')}>
              {v.progressSummary}
            </div>
          </div>
        </div>
        <div style={S('padding:0 22px;display:grid;grid-template-columns:1fr 1fr;gap:10px')}>
          {(v.progressStats ?? []).map((s: VmRow, i: number) => (
            <React.Fragment key={i}>
              <div
                style={S(
                  'background:#fff;box-shadow:0 1px 2px rgba(17,24,21,.045),0 12px 28px -18px rgba(17,24,21,.28);border-radius:18px;padding:16px',
                )}
              >
                <div
                  style={S(
                    'font-size:10px;letter-spacing:.11em;text-transform:uppercase;font-weight:800;color:#8C8779;margin-bottom:9px',
                  )}
                >
                  {s.label}
                </div>
                <div
                  style={S(
                    'font-size:28px;font-weight:900;font-stretch:113%;letter-spacing:-.015em;line-height:1',
                  )}
                >
                  {s.value}
                </div>
                <div style={S('font-size:11.5px;font-weight:600;color:#6E6A60;margin-top:5px')}>{s.note}</div>
              </div>
            </React.Fragment>
          ))}
        </div>
        {/*
          Calories a day, weight over the season, water and sleep. Everything
          here is drawn from what was recorded — a day nobody logged shows a
          track and no bar, because an empty column at zero is the chart telling
          an athlete they ate nothing. See `data/series.ts`.
        */}
        <div style={S('padding:18px 22px 0')}>
          <div
            style={S(
              'font-size:10px;letter-spacing:.11em;text-transform:uppercase;font-weight:800;color:#8C8779;margin-bottom:9px',
            )}
          >
            Calories a day
          </div>
          <div
            style={S(
              'background:#fff;box-shadow:0 1px 2px rgba(17,24,21,.045),0 12px 28px -18px rgba(17,24,21,.28);border-radius:18px;padding:16px',
            )}
          >
            <div style={S('position:relative;display:flex;align-items:flex-end;gap:5px;height:104px')}>
              <div style={S(v.calorieTargetStyle)} />
              {(v.calorieBars ?? []).map((b: VmRow, i: number) => (
                <React.Fragment key={i}>
                  <div
                    style={S(
                      'flex:1;display:flex;flex-direction:column;justify-content:flex-end;height:100%;gap:6px',
                    )}
                  >
                    <div style={S(b.bar)} />
                  </div>
                </React.Fragment>
              ))}
            </div>
            <div style={S('display:flex;gap:5px;margin-top:7px')}>
              {(v.calorieBars ?? []).map((b: VmRow, i: number) => (
                <React.Fragment key={i}>
                  <div style={S('flex:1;text-align:center')}>
                    <span style={S(b.labelStyle)}>{b.label}</span>
                  </div>
                </React.Fragment>
              ))}
            </div>
            <div style={S('font-size:11.5px;font-weight:600;color:#6E6A60;margin-top:10px')}>
              {v.calorieCaption}
            </div>
          </div>
        </div>

        <div style={S('padding:18px 22px 0')}>
          <div
            style={S(
              'font-size:10px;letter-spacing:.11em;text-transform:uppercase;font-weight:800;color:#8C8779;margin-bottom:9px',
            )}
          >
            Weight
          </div>
          <div
            style={S(
              'background:#fff;box-shadow:0 1px 2px rgba(17,24,21,.045),0 12px 28px -18px rgba(17,24,21,.28);border-radius:18px;padding:16px',
            )}
          >
            <div style={S('display:flex;align-items:baseline;gap:10px')}>
              <div
                style={S(
                  'font-size:28px;font-weight:900;font-stretch:113%;letter-spacing:-.015em;line-height:1',
                )}
              >
                {v.weightLatest}
              </div>
              <div style={S('font-size:11.5px;font-weight:700;color:#6E6A60')}>{v.weightGoal}</div>
            </div>
            <div style={S('font-size:11.5px;font-weight:600;color:#6E6A60;margin-top:5px')}>
              {v.weightChange}
            </div>
            {v.hasWeight ? (
              <div style={S('position:relative;margin-top:14px')}>
                <div
                  style={S('position:absolute;top:0;right:0;font-size:9.5px;font-weight:700;color:#A5A093')}
                >
                  {v.weightHigh}
                </div>
                <div
                  style={S(
                    'position:absolute;bottom:0;right:0;font-size:9.5px;font-weight:700;color:#A5A093',
                  )}
                >
                  {v.weightLow}
                </div>
                <svg
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                  style={S('display:block;width:100%;height:88px;overflow:visible')}
                  aria-label="Weight over time"
                >
                  <polyline
                    points={v.weightLine}
                    fill="none"
                    stroke="#17A05E"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                  />
                  {(v.weightDots ?? []).map((d: VmRow, i: number) => (
                    <circle
                      key={i}
                      cx={d.cx}
                      cy={d.cy}
                      r="2.5"
                      fill="#17A05E"
                      vectorEffect="non-scaling-stroke"
                    />
                  ))}
                </svg>
              </div>
            ) : null}
            <div style={S('display:flex;gap:8px;margin-top:14px')}>
              <input
                type="number"
                inputMode="decimal"
                step="0.1"
                value={v.weightDraft}
                onChange={(e) => v.setWeightDraft(e.target.value)}
                placeholder="Today's weight"
                aria-label="Today's weight in pounds"
                style={S(
                  'flex:1;min-width:0;padding:11px 13px;border-radius:11px;border:2px solid rgba(17,24,21,.12);font-size:14px;font-weight:700;font-family:inherit;background:#fff;color:#111815',
                )}
              />
              <button
                onClick={v.saveWeight}
                aria-label="Log today's weight"
                style={S(
                  'padding:11px 16px;border-radius:11px;background:#111815;color:#F4F2ED;font-size:13.5px;font-weight:800;flex:none',
                )}
              >
                Log
              </button>
            </div>
          </div>
        </div>

        <div style={S('padding:18px 22px 0')}>
          <div
            style={S(
              'font-size:10px;letter-spacing:.11em;text-transform:uppercase;font-weight:800;color:#8C8779;margin-bottom:9px',
            )}
          >
            Water today
          </div>
          <div
            style={S(
              'background:#fff;box-shadow:0 1px 2px rgba(17,24,21,.045),0 12px 28px -18px rgba(17,24,21,.28);border-radius:18px;padding:16px',
            )}
          >
            <div style={S('display:flex;align-items:baseline;justify-content:space-between;gap:10px')}>
              <div
                style={S(
                  'font-size:22px;font-weight:900;font-stretch:113%;letter-spacing:-.015em;line-height:1',
                )}
              >
                {v.waterLabel}
              </div>
              <div style={S('font-size:11.5px;font-weight:600;color:#6E6A60')}>{v.waterNote}</div>
            </div>
            <div style={S('display:flex;gap:4px;margin-top:12px')}>
              {(v.waterMarks ?? []).map((m: VmRow, i: number) => (
                <React.Fragment key={i}>
                  <div style={S(m.style)} />
                </React.Fragment>
              ))}
            </div>
            <div style={S('display:flex;gap:8px;margin-top:12px')}>
              <button
                onClick={v.addWater}
                style={S(
                  'flex:1;padding:11px;border-radius:11px;background:#111815;color:#F4F2ED;font-size:13.5px;font-weight:800',
                )}
              >
                Add a glass
              </button>
              <button
                onClick={v.undoWater}
                style={S(
                  'padding:11px 16px;border-radius:11px;border:2px solid rgba(17,24,21,.12);background:#fff;font-size:13.5px;font-weight:800;flex:none',
                )}
              >
                Undo
              </button>
            </div>
          </div>
        </div>

        <div style={S('padding:18px 22px 0')}>
          <div
            style={S(
              'font-size:10px;letter-spacing:.11em;text-transform:uppercase;font-weight:800;color:#8C8779;margin-bottom:9px',
            )}
          >
            Sleep last night
          </div>
          <div
            style={S(
              'background:#fff;box-shadow:0 1px 2px rgba(17,24,21,.045),0 12px 28px -18px rgba(17,24,21,.28);border-radius:18px;padding:16px',
            )}
          >
            <div style={S('display:flex;align-items:baseline;gap:10px')}>
              <div
                style={S(
                  'font-size:28px;font-weight:900;font-stretch:113%;letter-spacing:-.015em;line-height:1',
                )}
              >
                {v.sleepLabel}
              </div>
              {v.sleepMet ? (
                <div style={S('font-size:11.5px;font-weight:800;color:#17A05E')}>On target</div>
              ) : null}
            </div>
            <div style={S('font-size:11.5px;font-weight:600;color:#6E6A60;margin-top:5px')}>
              {v.sleepNote}
            </div>
            <div style={S('display:flex;gap:8px;margin-top:14px')}>
              <input
                type="number"
                inputMode="decimal"
                step="0.5"
                value={v.sleepDraft}
                onChange={(e) => v.setSleepDraft(e.target.value)}
                placeholder="Hours slept"
                aria-label="Hours slept last night"
                style={S(
                  'flex:1;min-width:0;padding:11px 13px;border-radius:11px;border:2px solid rgba(17,24,21,.12);font-size:14px;font-weight:700;font-family:inherit;background:#fff;color:#111815',
                )}
              />
              <button
                onClick={v.saveSleep}
                aria-label="Log last night's sleep"
                style={S(
                  'padding:11px 16px;border-radius:11px;background:#111815;color:#F4F2ED;font-size:13.5px;font-weight:800;flex:none',
                )}
              >
                Log
              </button>
            </div>
          </div>
        </div>
        {v.microRows?.length ? (
          <div style={S('padding:18px 22px 0')}>
            <div
              style={S(
                'font-size:10px;letter-spacing:.12em;text-transform:uppercase;font-weight:800;color:#8C8779;margin-bottom:9px',
              )}
            >
              {v.microHeading}
            </div>
            <div
              style={S(
                'background:#fff;box-shadow:0 1px 2px rgba(17,24,21,.045),0 12px 28px -18px rgba(17,24,21,.28);border-radius:18px;overflow:hidden',
              )}
            >
              {(v.microRows ?? []).map((m: VmRow, i: number) => (
                <React.Fragment key={i}>
                  <div style={S(m.rowStyle)}>
                    <div style={S('flex:1;min-width:0')}>
                      <div style={S('font-size:13.5px;font-weight:700')}>{m.label}</div>
                      <div
                        style={S('height:5px;border-radius:3px;background:rgba(17,24,21,.08);margin-top:7px')}
                      >
                        <div style={S(m.barStyle)} />
                      </div>
                    </div>
                    <div style={S('text-align:right;flex:none;min-width:96px')}>
                      <div style={S('font-size:13.5px;font-weight:800;letter-spacing:-.01em')}>{m.value}</div>
                      <div style={S('font-size:11px;font-weight:600;color:#8C8779;margin-top:3px')}>
                        {m.note}
                      </div>
                    </div>
                  </div>
                </React.Fragment>
              ))}
            </div>
          </div>
        ) : null}
        {/*
          A "What Athly learned" card used to sit here, listing three things the
          app had noticed about the athlete — which foods they swapped out, how
          long they were willing to cook. It had noticed none of them: the three
          lines were literals, identical for every user. Nothing in the app
          tracks swaps or cook time yet, so there is nothing honest to put in
          its place, and a card that makes things up about someone is worse than
          no card. It comes back when the data behind it exists.
        */}
      </div>
    </>
  );
}
