// Converted from the ATHLY Claude Design prototype (ATHLY.dc.html).
// Markup and inline styles are preserved verbatim; only the template syntax
// (sc-if / sc-for / {{ }}) was translated to JSX.

import React from 'react';
import type { ViewModel, VmRow } from '../viewModel';
import { S } from '../styles';

export function HomeScreen({ v }: { v: ViewModel }) {
  return (
    <>
      <div
        className={'ffs'}
        style={S('position:absolute;inset:0;overflow-y:auto;padding-bottom:130px;animation:ffFade .3s ease')}
      >
        <div
          style={S(
            'padding:58px 22px 12px;display:flex;align-items:center;justify-content:space-between;gap:12px',
          )}
        >
          <div style={S('display:flex;align-items:center;gap:9px')}>
            <div
              style={S(
                'width:26px;height:26px;border-radius:8px;background:#111815;display:flex;align-items:center;justify-content:center;position:relative;flex:none',
              )}
            >
              <span style={S('font-size:10.5px;font-weight:900;color:#F4F2ED;letter-spacing:-.04em')}>A</span>
              <div
                style={S(
                  'position:absolute;top:-3px;right:-3px;width:9px;height:9px;border-radius:50%;background:#17A05E;border:2px solid #F4F2ED',
                )}
              />
            </div>
            <span style={S('font-size:13.5px;font-weight:900;font-stretch:125%;letter-spacing:.01em')}>
              ATHLY IQ
            </span>
          </div>
          <button
            onClick={v.goProfile}
            style={S(
              'width:38px;height:38px;border-radius:50%;background:#111815;color:#F4F2ED;font-weight:800;font-size:14px;display:flex;align-items:center;justify-content:center;flex:none',
            )}
          >
            {v.initial}
          </button>
        </div>
        <div className={'ffs'} style={S('padding:0 22px 14px;display:flex;gap:7px;overflow-x:auto')}>
          {(v.weekStrip ?? []).map((d: VmRow, i: number) => (
            <React.Fragment key={i}>
              <button onClick={d.tap} style={S(d.style)}>
                <span style={S(d.dayStyle)}>{d.day}</span>
                <span style={S(d.numStyle)}>{d.num}</span>
                <span style={S(d.dot)} />
              </button>
            </React.Fragment>
          ))}
        </div>
        <div style={S('padding:0 22px 14px')}>
          <div
            style={S(
              'font-size:11px;letter-spacing:.12em;text-transform:uppercase;font-weight:800;color:#8C8779;margin-bottom:5px',
            )}
          >
            {v.todayLine}
          </div>
          <h1
            style={S(
              'margin:0;font-size:30px;font-weight:900;font-stretch:113%;letter-spacing:-.015em;line-height:1.02',
            )}
          >
            Eat this next
          </h1>
        </div>
        {v.homeFocus ? (
          <>
            <div style={S('padding:0 22px')}>
              <div style={S('background:#111815;border-radius:22px;overflow:hidden;color:#F4F2ED')}>
                <div style={S('display:flex;gap:15px;padding:16px 16px 14px')}>
                  <div
                    style={S(
                      'width:104px;height:104px;border-radius:18px;overflow:hidden;flex:none;position:relative',
                    )}
                  >
                    <div style={S(v.nextMeal.fieldA)}>
                      <span style={S(v.nextMeal.wordA)}>{v.nextMeal.word}</span>
                    </div>
                  </div>
                  <div
                    style={S('flex:1;min-width:0;display:flex;flex-direction:column;justify-content:center')}
                  >
                    <div
                      style={S(
                        'font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;font-weight:800;color:#5BE3A0;margin-bottom:6px',
                      )}
                    >
                      {v.nextMeal.when}
                    </div>
                    <div
                      style={S(
                        'font-size:19px;font-weight:900;font-stretch:113%;letter-spacing:-.011em;line-height:1.15;margin-bottom:9px',
                      )}
                    >
                      {v.nextMeal.name}
                    </div>
                    <div
                      style={S(
                        'display:flex;gap:12px;font-size:12px;color:rgba(244,242,237,.6);font-weight:700',
                      )}
                    >
                      <span>{v.nextMeal.kcal} cal</span>
                      <span>{v.nextMeal.protein}</span>
                      <span>{v.nextMeal.time}</span>
                    </div>
                  </div>
                </div>
                <div style={S('padding:0 16px 14px;display:flex;flex-wrap:wrap;gap:6px')}>
                  {(v.nextMeal.why ?? []).map((w: VmRow, i: number) => (
                    <React.Fragment key={i}>
                      <span
                        style={S(
                          'padding:5px 10px;border-radius:99px;background:rgba(91,227,160,.14);color:#5BE3A0;font-size:11px;font-weight:700',
                        )}
                      >
                        {w}
                      </span>
                    </React.Fragment>
                  ))}
                </div>
                <div
                  style={S(
                    'display:grid;grid-template-columns:1.3fr 1fr 1fr;border-top:2px solid rgba(244,242,237,.12)',
                  )}
                >
                  <button
                    className={'dc-ho7'}
                    onClick={v.eatNext}
                    style={S(
                      'padding:16px 18px;font-weight:800;font-size:14px;color:#5BE3A0;text-align:left;border-right:2px solid rgba(244,242,237,.12)',
                    )}
                  >
                    Ate it
                  </button>
                  <button
                    className={'dc-ho8'}
                    onClick={v.openSwap}
                    style={S(
                      'padding:16px 14px;font-weight:800;font-size:14px;color:#F4F2ED;text-align:left;border-right:2px solid rgba(244,242,237,.12)',
                    )}
                  >
                    Swap
                  </button>
                  <button
                    className={'dc-ho8'}
                    onClick={v.openNext}
                    style={S(
                      'padding:16px 14px;font-weight:800;font-size:14px;color:#F4F2ED;text-align:left',
                    )}
                  >
                    Recipe
                  </button>
                </div>
              </div>
            </div>
            <div style={S('padding:12px 22px 0')}>
              <button
                className={'dc-ho9'}
                onClick={v.goProgress}
                style={S(
                  'width:100%;background:#fff;box-shadow:0 1px 2px rgba(17,24,21,.045),0 12px 28px -18px rgba(17,24,21,.28);border-radius:18px;padding:16px 17px 14px;display:flex;flex-direction:column;gap:14px;text-align:left',
                )}
              >
                <div
                  style={S(
                    'display:flex;align-items:flex-end;justify-content:space-between;gap:12px;width:100%',
                  )}
                >
                  <div>
                    <div
                      style={S(
                        'font-size:10px;letter-spacing:.11em;text-transform:uppercase;font-weight:800;color:#8C8779;margin-bottom:5px',
                      )}
                    >
                      Still to eat today
                    </div>
                    <div style={S('display:flex;align-items:baseline;gap:5px')}>
                      <div
                        style={S(
                          'font-size:27px;font-weight:900;font-stretch:113%;letter-spacing:-.015em;line-height:1',
                        )}
                      >
                        {v.remain.cal}
                      </div>
                      <div style={S('font-size:12px;font-weight:700;color:#8C8779')}>cal</div>
                      <div
                        style={S(
                          'font-size:27px;font-weight:900;font-stretch:113%;letter-spacing:-.015em;line-height:1;margin-left:11px;color:#17A05E',
                        )}
                      >
                        {v.remain.pro}
                      </div>
                      <div style={S('font-size:12px;font-weight:700;color:#8C8779')}>g protein</div>
                    </div>
                  </div>
                  <div
                    style={S(
                      'display:flex;align-items:center;gap:6px;padding:5px 10px 5px 8px;border-radius:99px;background:rgba(23,160,94,.1);flex:none',
                    )}
                  >
                    <div style={S('width:7px;height:7px;border-radius:50%;background:#17A05E')} />
                    <span style={S('font-size:11px;font-weight:800;color:#0E7B47;letter-spacing:.01em')}>
                      {v.remain.pct}
                    </span>
                  </div>
                </div>
                <div style={S('display:flex;gap:10px;width:100%')}>
                  {(v.macroBars ?? []).map((m: VmRow, i: number) => (
                    <React.Fragment key={i}>
                      <div style={S('flex:1;min-width:0')}>
                        <div
                          style={S(
                            'height:6px;background:rgba(17,24,21,.09);border-radius:99px;overflow:hidden',
                          )}
                        >
                          <div style={S(m.fill)} />
                        </div>
                        <div style={S('display:flex;justify-content:space-between;gap:4px;margin-top:7px')}>
                          <span
                            style={S(
                              'font-size:10px;letter-spacing:.07em;text-transform:uppercase;font-weight:800;color:#8C8779',
                            )}
                          >
                            {m.short}
                          </span>
                          <span style={S('font-size:10.5px;font-weight:800;white-space:nowrap')}>
                            {m.text}
                          </span>
                        </div>
                      </div>
                    </React.Fragment>
                  ))}
                </div>
              </button>
            </div>
          </>
        ) : null}
        {v.homeDash ? (
          <>
            <div style={S('padding:0 22px')}>
              <div
                style={S(
                  'background:#fff;box-shadow:0 1px 2px rgba(17,24,21,.045),0 12px 28px -18px rgba(17,24,21,.28);border-radius:22px;padding:18px',
                )}
              >
                <div style={S('display:flex;align-items:center;gap:18px')}>
                  <div style={S(v.ringStyle)}>
                    <div
                      style={S(
                        'width:76px;height:76px;border-radius:50%;background:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center',
                      )}
                    >
                      <div
                        style={S(
                          'font-size:22px;font-weight:900;font-stretch:113%;letter-spacing:-.013em;line-height:1',
                        )}
                      >
                        {v.remain.pct}
                      </div>
                      <div
                        style={S(
                          'font-size:9.5px;letter-spacing:.1em;text-transform:uppercase;font-weight:800;color:#8C8779',
                        )}
                      >
                        fueled
                      </div>
                    </div>
                  </div>
                  <div style={S('flex:1;display:flex;flex-direction:column;gap:11px')}>
                    {(v.macroBars ?? []).map((m: VmRow, i: number) => (
                      <React.Fragment key={i}>
                        <div>
                          <div
                            style={S(
                              'display:flex;justify-content:space-between;font-size:11.5px;font-weight:700;margin-bottom:4px',
                            )}
                          >
                            <span>{m.name}</span>
                            <span style={S('color:#8C8779')}>{m.text}</span>
                          </div>
                          <div
                            style={S(
                              'height:6px;background:rgba(17,24,21,.09);border-radius:99px;overflow:hidden',
                            )}
                          >
                            <div style={S(m.fill)} />
                          </div>
                        </div>
                      </React.Fragment>
                    ))}
                  </div>
                </div>
                <div style={S('height:2px;background:rgba(17,24,21,.1);margin:16px -18px 14px')} />
                <div style={S('display:flex;gap:13px;align-items:center')}>
                  <div
                    style={S(
                      'width:66px;height:66px;border-radius:14px;overflow:hidden;flex:none;position:relative',
                    )}
                  >
                    <div style={S(v.nextMeal.fieldB)}>
                      <span style={S(v.nextMeal.wordB)}>{v.nextMeal.word}</span>
                    </div>
                  </div>
                  <div style={S('flex:1;min-width:0')}>
                    <div
                      style={S(
                        'font-size:10px;letter-spacing:.12em;text-transform:uppercase;font-weight:800;color:#17A05E;margin-bottom:3px',
                      )}
                    >
                      {v.nextMeal.when}
                    </div>
                    <div style={S('font-size:16.5px;font-weight:900;letter-spacing:-.02em;line-height:1.2')}>
                      {v.nextMeal.name}
                    </div>
                  </div>
                  <button
                    onClick={v.openNext}
                    style={S(
                      'width:38px;height:38px;border-radius:12px;background:#111815;color:#fff;display:flex;align-items:center;justify-content:center;flex:none',
                    )}
                  >
                    <svg
                      width="17"
                      height="17"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M9 6l6 6-6 6" />
                    </svg>
                  </button>
                </div>
                <div style={S('display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:14px')}>
                  <button
                    className={'dc-ho1'}
                    onClick={v.eatNext}
                    style={S(
                      'padding:13px 16px;border-radius:12px;background:#17A05E;color:#fff;font-weight:800;font-size:13.5px;text-align:left',
                    )}
                  >
                    Ate it
                  </button>
                  <button
                    className={'dc-ho3'}
                    onClick={v.openSwap}
                    style={S(
                      'padding:13px 16px;border-radius:12px;border:2px solid rgba(17,24,21,.14);font-weight:800;font-size:13.5px;text-align:left',
                    )}
                  >
                    Swap it
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : null}
        <div style={S('padding:14px 22px 0')}>
          <div style={S('display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px')}>
            <button
              className={'dc-ho3'}
              onClick={v.goLog}
              style={S(
                'background:#fff;border:2px solid rgba(17,24,21,.1);border-radius:14px;padding:14px 12px;display:flex;flex-direction:column;gap:9px;align-items:flex-start',
              )}
            >
              <svg
                width="19"
                height="19"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#111815"
                strokeWidth="2.4"
                strokeLinecap="round"
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
              <span style={S('font-size:13px;font-weight:800;text-align:left')}>Log food</span>
            </button>
            <button
              className={'dc-ho3'}
              onClick={v.goPlan}
              style={S(
                'background:#fff;border:2px solid rgba(17,24,21,.1);border-radius:14px;padding:14px 12px;display:flex;flex-direction:column;gap:9px;align-items:flex-start',
              )}
            >
              <svg
                width="19"
                height="19"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#111815"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
                <circle cx="12" cy="12" r="3.4" />
              </svg>
              <span style={S('font-size:13px;font-weight:800;text-align:left')}>Build a meal</span>
            </button>
            <button
              className={'dc-ho3'}
              onClick={v.goCalendar}
              style={S(
                'background:#fff;border:2px solid rgba(17,24,21,.1);border-radius:14px;padding:14px 12px;display:flex;flex-direction:column;gap:9px;align-items:flex-start',
              )}
            >
              <svg
                width="19"
                height="19"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#111815"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="5" width="18" height="16" rx="2" />
                <path d="M3 10h18M8 3v4M16 3v4" />
              </svg>
              <span style={S('font-size:13px;font-weight:800;text-align:left')}>Calendar</span>
            </button>
          </div>
        </div>
        {/*
          An "Athly noticed" card sat here, telling every athlete they had
          "swapped mushrooms out three times this week" and offering to drop the
          ingredient for them. Nothing in the app records a swap: the count was a
          literal, the ingredient came from whatever they had listed as a
          dislike, and the two buttons dismissed a prompt about something that
          never happened. Same call as the Progress tab's "What Athly learned" —
          it can come back when there is swap history to draw it from.
        */}
        <div style={S('padding:26px 22px 0')}>
          <div
            style={S('display:flex;align-items:baseline;justify-content:space-between;margin-bottom:12px')}
          >
            <h3 style={S('margin:0;font-size:19px;font-weight:900;font-stretch:113%;letter-spacing:-.011em')}>
              Rest of today
            </h3>
            <div
              style={S(
                'font-size:11px;letter-spacing:.1em;text-transform:uppercase;font-weight:800;color:#8C8779',
              )}
            >
              {v.dayShape}
            </div>
          </div>
          <div style={S('border-top:2px solid rgba(17,24,21,.12)')}>
            {(v.todayMeals ?? []).map((m: VmRow, i: number) => (
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
                        'font-size:15.5px;font-weight:800;letter-spacing:-.015em;line-height:1.25;margin-bottom:4px',
                      )}
                    >
                      {m.name}
                    </div>
                    <div style={S('font-size:12px;color:#6E6A60;font-weight:600')}>{m.macroText}</div>
                  </div>
                  <div
                    style={S(
                      'width:22px;height:22px;border-radius:50%;border:2px solid rgba(17,24,21,.16);flex:none',
                    )}
                  />
                </button>
              </React.Fragment>
            ))}
          </div>
        </div>
        <div style={S('padding:24px 22px 0')}>
          <div
            style={S(
              'background:#fff;box-shadow:0 1px 2px rgba(17,24,21,.045),0 12px 28px -18px rgba(17,24,21,.28);border-radius:18px;padding:18px;border:2px solid rgba(17,24,21,.1)',
            )}
          >
            <div
              style={S('display:flex;align-items:center;justify-content:space-between;margin-bottom:14px')}
            >
              <div
                style={S(
                  'font-size:10px;letter-spacing:.12em;text-transform:uppercase;font-weight:800;color:#8C8779',
                )}
              >
                Training today
              </div>
              <div style={S(v.trainingBadgeStyle)}>{v.trainingBadge}</div>
            </div>
            <div style={S('display:flex;align-items:center;gap:0')}>
              {(v.trainingRail ?? []).map((t: VmRow, i: number) => (
                <React.Fragment key={i}>
                  <div style={S(t.wrap)}>
                    <div style={S(t.dot)} />
                    <div style={S('font-size:11px;font-weight:800;margin-top:8px')}>{t.time}</div>
                    <div style={S('font-size:11px;color:#6E6A60;margin-top:2px;line-height:1.3')}>
                      {t.label}
                    </div>
                  </div>
                </React.Fragment>
              ))}
            </div>
            <div style={S('height:2px;background:rgba(17,24,21,.1);margin:16px -18px 12px')} />
            <div style={S('font-size:13px;line-height:1.5;color:#4A4740;margin-bottom:13px')}>
              {v.trainingNote}
            </div>
            <button
              className={'dc-ho3'}
              onClick={v.goCalendar}
              style={S(
                'width:100%;display:flex;align-items:center;justify-content:space-between;padding:13px 15px;border:2px solid rgba(17,24,21,.12);border-radius:12px;font-weight:800;font-size:13.5px',
              )}
            >
              <span>Edit my schedule</span>
              <svg
                width="17"
                height="17"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 6l6 6-6 6" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
