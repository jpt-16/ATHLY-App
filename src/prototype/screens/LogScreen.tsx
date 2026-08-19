// Converted from the ATHLY Claude Design prototype (ATHLY.dc.html).
// Markup and inline styles are preserved verbatim; only the template syntax
// (sc-if / sc-for / {{ }}) was translated to JSX.

import React from 'react';
import type { ViewModel, VmRow } from '../viewModel';
import { S } from '../styles';

export function LogScreen({ v }: { v: ViewModel }) {
  return (
    <>
      <div
        className={'ffs'}
        style={S('position:absolute;inset:0;overflow-y:auto;padding-bottom:130px;animation:ffFade .3s ease')}
      >
        <div style={S('padding:62px 22px 16px')}>
          <h1 style={S('margin:0;font-size:29px;font-weight:900;font-stretch:113%;letter-spacing:-.013em')}>
            Log food
          </h1>
        </div>
        <div style={S('padding:0 22px 16px')}>
          <div
            style={S(
              'display:flex;align-items:center;gap:10px;padding:14px 15px;background:#fff;border-radius:14px;border:2px solid rgba(17,24,21,.1)',
            )}
          >
            <svg
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#8C8779"
              strokeWidth="2.4"
              strokeLinecap="round"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" />
            </svg>
            <input
              value={v.search}
              onChange={v.searchChange}
              placeholder="Search your foods"
              style={S(
                'flex:1;border:0;outline:none;background:transparent;font:inherit;font-size:14.5px;caret-color:#17A05E',
              )}
            />
          </div>
        </div>
        <div style={S('padding:0 22px 20px;display:grid;grid-template-columns:1fr 1fr;gap:10px')}>
          <button
            className={'dc-ho12'}
            onClick={v.toastScan}
            style={S(
              'background:#111815;color:#F4F2ED;border-radius:14px;padding:16px;display:flex;flex-direction:column;gap:10px;align-items:flex-start',
            )}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#5BE3A0"
              strokeWidth="2.2"
              strokeLinecap="round"
            >
              <path d="M4 7V5a1 1 0 011-1h2M17 4h2a1 1 0 011 1v2M20 17v2a1 1 0 01-1 1h-2M7 20H5a1 1 0 01-1-1v-2M8 8v8M12 8v8M16 8v8" />
            </svg>
            <span style={S('font-size:14px;font-weight:800;text-align:left')}>Scan barcode</span>
          </button>
          <button
            className={'dc-ho1'}
            onClick={v.toastPhoto}
            style={S(
              'background:#17A05E;color:#fff;border-radius:14px;padding:16px;display:flex;flex-direction:column;gap:10px;align-items:flex-start',
            )}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 8a2 2 0 012-2h2l1.5-2h7L17 6h2a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
              <circle cx="12" cy="12.5" r="3.4" />
            </svg>
            <span style={S('font-size:14px;font-weight:800;text-align:left')}>Snap a photo</span>
          </button>
        </div>
        <div style={S('padding:0 22px')}>
          <div
            style={S('display:flex;gap:18px;border-bottom:2px solid rgba(17,24,21,.12);margin-bottom:4px')}
          >
            {(v.logTabs ?? []).map((t: VmRow, i: number) => (
              <React.Fragment key={i}>
                <button onClick={t.pick} style={S(t.style)}>
                  {t.label}
                </button>
              </React.Fragment>
            ))}
          </div>
          {v.logCustom ? (
            <div
              style={S(
                'margin:12px 0 6px;background:#fff;box-shadow:0 1px 2px rgba(17,24,21,.045),0 12px 28px -18px rgba(17,24,21,.28);border-radius:18px;padding:16px',
              )}
            >
              <div
                style={S(
                  'font-size:10px;letter-spacing:.11em;text-transform:uppercase;font-weight:800;color:#8C8779;margin-bottom:11px',
                )}
              >
                Add a food of your own
              </div>
              <div style={S('display:flex;flex-wrap:wrap;gap:8px')}>
                {(v.foodForm ?? []).map((f: VmRow, i: number) => (
                  <React.Fragment key={i}>
                    <input
                      type={f.type}
                      inputMode={f.type === 'number' ? 'numeric' : 'text'}
                      value={f.value}
                      onChange={(e) => f.set(e.target.value)}
                      placeholder={f.label}
                      aria-label={f.label}
                      style={S(
                        `${f.key === 'name' ? 'flex:1 0 100%' : 'flex:1 1 40%'};min-width:0;padding:11px 13px;border-radius:11px;border:2px solid rgba(17,24,21,.12);font-size:14px;font-weight:700;font-family:inherit;background:#fff;color:#111815`,
                      )}
                    />
                  </React.Fragment>
                ))}
              </div>
              <button
                onClick={v.saveFood}
                style={S(
                  'width:100%;margin-top:10px;padding:12px;border-radius:12px;background:#111815;color:#F4F2ED;font-size:13.5px;font-weight:800',
                )}
              >
                Log it
              </button>
              <div style={S('font-size:11px;color:#8C8779;margin-top:9px;line-height:1.45')}>
                Calories are the only one this needs. Leave the rest blank and they stay blank — the app will
                not invent them.
              </div>
            </div>
          ) : null}
          {v.logEmpty ? (
            <>
              <div style={S('padding:52px 12px;text-align:center;animation:ffIn .3s ease')}>
                <div
                  style={S(
                    'width:52px;height:52px;border-radius:18px;border:2px dashed rgba(17,24,21,.22);margin:0 auto 16px',
                  )}
                />
                <div style={S('font-size:16px;font-weight:900;letter-spacing:-.02em;margin-bottom:6px')}>
                  {v.logEmptyTitle}
                </div>
                <div
                  style={S('font-size:13px;color:#6E6A60;line-height:1.5;max-width:230px;margin:0 auto 16px')}
                >
                  {v.logEmptyBody}
                </div>
                {v.logEmptyCta ? (
                  <button
                    onClick={v.logEmptyAction}
                    style={S(
                      'padding:11px 18px;background:#111815;color:#fff;font-weight:800;font-size:13px;border-radius:12px',
                    )}
                  >
                    {v.logEmptyCta}
                  </button>
                ) : null}
              </div>
            </>
          ) : null}
          {v.logList ? (
            <>
              <div>
                {(v.logItems ?? []).map((f: VmRow, i: number) => (
                  <React.Fragment key={i}>
                    <div
                      style={S(
                        'display:flex;align-items:center;gap:13px;padding:14px 2px;border-bottom:1px solid rgba(17,24,21,.1)',
                      )}
                    >
                      <div style={S(f.tileStyle)}>
                        <div style={S(f.fieldStyle)}>
                          <span style={S(f.wordStyle)}>{f.word}</span>
                        </div>
                      </div>
                      <div style={S('flex:1;min-width:0')}>
                        <div style={S('font-size:14.5px;font-weight:800;margin-bottom:2px')}>{f.name}</div>
                        <div style={S('font-size:12px;color:#6E6A60;font-weight:600')}>{f.meta}</div>
                      </div>
                      <button onClick={f.add} style={S(f.btnStyle)}>
                        {f.btnText}
                      </button>
                    </div>
                  </React.Fragment>
                ))}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </>
  );
}
