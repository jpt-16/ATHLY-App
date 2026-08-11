// Converted from the ATHLY Claude Design prototype (ATHLY.dc.html).
// Markup and inline styles are preserved verbatim; only the template syntax
// (sc-if / sc-for / {{ }}) was translated to JSX.

import React from 'react';
import type { ViewModel, VmRow } from '../viewModel';
import { S } from '../styles';

export function RecipesScreen({ v }: { v: ViewModel }) {
  return (
    <>
      <div
        className={'ffs'}
        style={S('position:absolute;inset:0;overflow-y:auto;padding-bottom:130px;animation:ffFade .3s ease')}
      >
        <div style={S('padding:62px 22px 14px')}>
          <h1 style={S('margin:0;font-size:29px;font-weight:900;font-stretch:113%;letter-spacing:-.013em')}>
            Recipes
          </h1>
        </div>
        <div className={'ffs'} style={S('padding:0 22px 18px;display:flex;gap:8px;overflow-x:auto')}>
          {(v.recipeCats ?? []).map((c: VmRow, i: number) => (
            <React.Fragment key={i}>
              <button onClick={c.pick} style={S(c.style)}>
                {c.label}
              </button>
            </React.Fragment>
          ))}
        </div>
        <div style={S('padding:0 22px;display:grid;grid-template-columns:1fr 1fr;gap:12px')}>
          {(v.recipes ?? []).map((r: VmRow, i: number) => (
            <React.Fragment key={i}>
              <button
                className={'dc-ho9'}
                onClick={r.open}
                style={S(
                  'background:#fff;box-shadow:0 1px 2px rgba(17,24,21,.045),0 12px 28px -18px rgba(17,24,21,.28);border-radius:18px;overflow:hidden;text-align:left',
                )}
              >
                <div style={S('height:104px;position:relative')}>
                  <div style={S(r.fieldStyle)}>
                    <span style={S(r.wordStyle)}>{r.word}</span>
                  </div>
                </div>
                <div style={S('padding:12px')}>
                  <div
                    style={S(
                      'font-size:14px;font-weight:800;letter-spacing:-.015em;line-height:1.25;margin-bottom:5px',
                    )}
                  >
                    {r.name}
                  </div>
                  <div style={S('font-size:11.5px;color:#6E6A60;font-weight:700')}>{r.macroText}</div>
                </div>
              </button>
            </React.Fragment>
          ))}
        </div>
      </div>
    </>
  );
}
