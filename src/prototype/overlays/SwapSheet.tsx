// Converted from the ATHLY Claude Design prototype (ATHLY.dc.html).
// Markup and inline styles are preserved verbatim; only the template syntax
// (sc-if / sc-for / {{ }}) was translated to JSX.

import React from 'react';
import type { ViewModel, VmRow } from '../viewModel';
import { S } from '../styles';

export function SwapSheet({ v }: { v: ViewModel }) {
  return (
    <>
      <div
        style={S(
          'position:absolute;inset:0;z-index:60;background:rgba(17,24,21,.5);animation:ffFade .2s ease',
        )}
        onClick={v.closeOverlay}
      />
      {v.swapSheet ? (
        <>
          <div
            className={'ffs'}
            style={S(
              'position:absolute;left:0;right:0;bottom:0;top:52px;z-index:61;background:#F4F2ED;border-radius:24px 24px 0 0;overflow-y:auto;animation:ffUp .34s cubic-bezier(.2,.85,.25,1)',
            )}
          >
            <div
              style={S('background:#111815;border-radius:24px 24px 0 0;padding:20px 22px 18px;color:#F4F2ED')}
            >
              <div style={S('display:flex;align-items:flex-start;justify-content:space-between;gap:12px')}>
                <div style={S('display:flex;align-items:center;gap:8px')}>
                  <div
                    style={S(
                      'width:20px;height:20px;border-radius:6px;background:#5BE3A0;display:flex;align-items:center;justify-content:center;flex:none',
                    )}
                  >
                    <span style={S('font-size:8.5px;font-weight:900;color:#111815;letter-spacing:-.04em')}>
                      A
                    </span>
                  </div>
                  <div
                    style={S(
                      'font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;font-weight:800;color:#5BE3A0',
                    )}
                  >
                    Athly swap
                  </div>
                </div>
                <button
                  onClick={v.closeOverlay}
                  style={S(
                    'width:32px;height:32px;border-radius:50%;background:rgba(244,242,237,.12);display:flex;align-items:center;justify-content:center;flex:none',
                  )}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#F4F2ED"
                    strokeWidth="2.8"
                    strokeLinecap="round"
                  >
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              </div>
              <h2
                style={S(
                  'margin:14px 0 6px;font-size:25px;font-weight:900;font-stretch:113%;letter-spacing:-.013em;line-height:1.1',
                )}
              >
                Three ways to hit the same numbers
              </h2>
              <p style={S('margin:0 0 16px;font-size:13.5px;line-height:1.45;color:rgba(244,242,237,.6)')}>
                Each one lands within 60 calories and 3g of protein of your dinner, and clears your allergies,
                dislikes and weeknight time.
              </p>
              <div
                style={S(
                  'display:flex;align-items:center;gap:12px;padding:12px 14px;background:rgba(244,242,237,.08);border-radius:12px',
                )}
              >
                <div
                  style={S(
                    'font-size:9.5px;letter-spacing:.12em;text-transform:uppercase;font-weight:800;color:rgba(244,242,237,.45);flex:none',
                  )}
                >
                  Out
                </div>
                <div style={S('flex:1;min-width:0')}>
                  <div style={S('font-size:14.5px;font-weight:800;letter-spacing:-.015em')}>
                    Chicken pasta
                  </div>
                  <div style={S('font-size:12px;color:rgba(244,242,237,.55);font-weight:700;margin-top:2px')}>
                    750 cal · 45g protein · 62g carbs
                  </div>
                </div>
              </div>
            </div>
            <div style={S('padding:18px 22px 0;display:flex;flex-direction:column;gap:12px')}>
              {(v.swapOptions ?? []).map((s: VmRow, i: number) => (
                <React.Fragment key={i}>
                  <button onClick={s.pick} style={S(s.cardStyle)}>
                    <div style={S('height:132px;position:relative')}>
                      <div style={S(s.fieldStyle)}>
                        <span style={S(s.wordStyle)}>{s.word}</span>
                      </div>
                      <div style={S(s.matchStyle)}>{s.match}</div>
                    </div>
                    <div style={S('padding:15px 16px 16px;text-align:left')}>
                      <div
                        style={S(
                          'display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:11px',
                        )}
                      >
                        <div
                          style={S(
                            'font-size:18px;font-weight:900;letter-spacing:-.025em;line-height:1.15;flex:1',
                          )}
                        >
                          {s.name}
                        </div>
                        <div style={S(s.checkStyle)} />
                      </div>
                      <div style={S('display:flex;gap:16px;margin-bottom:13px')}>
                        {(s.stats ?? []).map((m: VmRow, i1: number) => (
                          <React.Fragment key={i1}>
                            <div>
                              <div style={S('display:flex;align-items:baseline;gap:4px')}>
                                <div style={S('font-size:16px;font-weight:900;letter-spacing:-.025em')}>
                                  {m.value}
                                </div>
                                <div style={S(m.deltaStyle)}>{m.delta}</div>
                              </div>
                              <div
                                style={S(
                                  'font-size:9.5px;letter-spacing:.1em;text-transform:uppercase;font-weight:800;color:#8C8779;margin-top:3px',
                                )}
                              >
                                {m.label}
                              </div>
                            </div>
                          </React.Fragment>
                        ))}
                      </div>
                      <div
                        style={S(
                          'display:flex;gap:9px;align-items:flex-start;padding-top:12px;border-top:2px solid rgba(17,24,21,.1)',
                        )}
                      >
                        <div
                          style={S(
                            'width:18px;height:18px;border-radius:5px;background:#111815;display:flex;align-items:center;justify-content:center;flex:none;margin-top:1px',
                          )}
                        >
                          <span
                            style={S('font-size:7.5px;font-weight:900;color:#F4F2ED;letter-spacing:-.04em')}
                          >
                            A
                          </span>
                        </div>
                        <div style={S('font-size:13px;line-height:1.45;color:#3B3831;font-weight:600')}>
                          {s.why}
                        </div>
                      </div>
                    </div>
                  </button>
                </React.Fragment>
              ))}
              <button
                className={'dc-ho13'}
                onClick={v.moreSwaps}
                style={S(
                  'padding:15px 18px;border:2px dashed rgba(17,24,21,.18);border-radius:14px;font-weight:800;font-size:13.5px;color:#6E6A60;text-align:left',
                )}
              >
                Show me three more
              </button>
            </div>
            <div
              style={S(
                'position:sticky;bottom:0;padding:16px 22px 32px;margin-top:16px;background:linear-gradient(to top,#F4F2ED 72%,rgba(244,242,237,0))',
              )}
            >
              <button onClick={v.confirmSwap} disabled={v.swapBlocked} style={S(v.swapCtaStyle)}>
                <span>{v.swapCtaLabel}</span>
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
          </div>
        </>
      ) : null}
      {v.swapDeck ? (
        <>
          <div
            style={S(
              'position:absolute;left:0;right:0;bottom:0;top:64px;z-index:61;background:#F4F2ED;border-radius:24px 24px 0 0;animation:ffUp .34s cubic-bezier(.2,.85,.25,1);display:flex;flex-direction:column;overflow:hidden',
            )}
          >
            <div
              style={S(
                'padding:20px 22px 0;display:flex;align-items:flex-start;justify-content:space-between',
              )}
            >
              <div>
                <div style={S('display:flex;align-items:center;gap:8px;margin-bottom:7px')}>
                  <div
                    style={S(
                      'width:19px;height:19px;border-radius:6px;background:#17A05E;display:flex;align-items:center;justify-content:center;flex:none',
                    )}
                  >
                    <span style={S('font-size:8px;font-weight:900;color:#fff;letter-spacing:-.04em')}>A</span>
                  </div>
                  <div
                    style={S(
                      'font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;font-weight:800;color:#17A05E',
                    )}
                  >
                    Athly swap
                  </div>
                </div>
                <h2
                  style={S(
                    'margin:0;font-size:23px;font-weight:900;font-stretch:113%;letter-spacing:-.013em',
                  )}
                >
                  Instead of chicken pasta
                </h2>
                <div style={S('font-size:12.5px;color:#6E6A60;font-weight:700;margin-top:5px')}>
                  750 cal · 45g protein — everything here lands within 5%
                </div>
              </div>
              <button
                onClick={v.closeOverlay}
                style={S(
                  'width:34px;height:34px;border-radius:50%;background:rgba(17,24,21,.08);display:flex;align-items:center;justify-content:center;flex:none',
                )}
              >
                <svg
                  width="15"
                  height="15"
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
            <div
              style={S('flex:1;display:flex;align-items:center;justify-content:center;margin:14px 22px 0')}
            >
              <div style={S('position:relative;width:100%;height:414px')}>
                {(v.swapDeckCards ?? []).map((c: VmRow, i: number) => (
                  <React.Fragment key={i}>
                    <div style={S(c.cardStyle)}>
                      <div style={S('height:196px;position:relative')}>
                        <div style={S(c.fieldStyle)}>
                          <span style={S(c.wordStyle)}>{c.word}</span>
                        </div>
                        <div style={S(c.matchStyle)}>{c.match}</div>
                      </div>
                      <div style={S('padding:16px 18px 18px')}>
                        <div
                          style={S(
                            'font-size:21px;font-weight:900;font-stretch:113%;letter-spacing:-.012em;line-height:1.12;margin-bottom:11px',
                          )}
                        >
                          {c.name}
                        </div>
                        <div style={S('display:flex;gap:16px;margin-bottom:13px')}>
                          {(c.stats ?? []).map((m: VmRow, i1: number) => (
                            <React.Fragment key={i1}>
                              <div>
                                <div style={S('display:flex;align-items:baseline;gap:4px')}>
                                  <div style={S('font-size:16px;font-weight:900;letter-spacing:-.025em')}>
                                    {m.value}
                                  </div>
                                  <div style={S(m.deltaStyle)}>{m.delta}</div>
                                </div>
                                <div
                                  style={S(
                                    'font-size:9.5px;letter-spacing:.1em;text-transform:uppercase;font-weight:800;color:#8C8779;margin-top:3px',
                                  )}
                                >
                                  {m.label}
                                </div>
                              </div>
                            </React.Fragment>
                          ))}
                        </div>
                        <div
                          style={S(
                            'display:flex;gap:9px;align-items:flex-start;padding-top:12px;border-top:2px solid rgba(17,24,21,.1)',
                          )}
                        >
                          <div
                            style={S(
                              'width:18px;height:18px;border-radius:5px;background:#111815;display:flex;align-items:center;justify-content:center;flex:none;margin-top:1px',
                            )}
                          >
                            <span
                              style={S('font-size:7.5px;font-weight:900;color:#F4F2ED;letter-spacing:-.04em')}
                            >
                              A
                            </span>
                          </div>
                          <div style={S('font-size:12.5px;line-height:1.45;color:#3B3831;font-weight:600')}>
                            {c.why}
                          </div>
                        </div>
                      </div>
                    </div>
                  </React.Fragment>
                ))}
              </div>
            </div>
            <div style={S('padding:16px 22px 30px;display:flex;gap:12px;align-items:center')}>
              <button
                className={'dc-ho3'}
                onClick={v.deckSkip}
                style={S(
                  'flex:1;padding:16px;border:2px solid rgba(17,24,21,.16);border-radius:14px;font-weight:800;font-size:14.5px',
                )}
              >
                Not this one
              </button>
              <button
                className={'dc-ho1'}
                onClick={v.deckKeep}
                style={S(
                  'flex:1.4;padding:16px;background:#17A05E;color:#fff;border-radius:14px;font-weight:800;font-size:14.5px',
                )}
              >
                Swap it in
              </button>
            </div>
          </div>
        </>
      ) : null}
    </>
  );
}
