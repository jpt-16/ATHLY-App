// Converted from the ATHLY Claude Design prototype (ATHLY.dc.html).
// Markup and inline styles are preserved verbatim; only the template syntax
// (sc-if / sc-for / {{ }}) was translated to JSX.

import React from 'react';
import type { ViewModel, VmRow } from '../viewModel';
import { S } from '../styles';

export function GroceryScreen({ v }: { v: ViewModel }) {
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
            Grocery list
          </h1>
        </div>
        <div style={S('padding:0 22px')}>
          {(v.groceryGroups ?? []).map((g: VmRow, i: number) => (
            <React.Fragment key={i}>
              <div style={S('margin-bottom:20px')}>
                <div style={S('display:flex;align-items:center;gap:10px;margin-bottom:8px')}>
                  <div
                    style={S(
                      'font-size:10px;letter-spacing:.12em;text-transform:uppercase;font-weight:800;color:#8C8779',
                    )}
                  >
                    {g.title}
                  </div>
                  <div style={S('flex:1;height:2px;background:rgba(17,24,21,.12)')} />
                </div>
                {(g.items ?? []).map((i: VmRow, i1: number) => (
                  <React.Fragment key={i1}>
                    <button onClick={i.tap} style={S(i.rowStyle)}>
                      <div style={S(i.box)} />
                      <span style={S(i.text)}>{i.name}</span>
                      <span style={S('font-size:12px;color:#8C8779;font-weight:600')}>{i.qty}</span>
                    </button>
                  </React.Fragment>
                ))}
              </div>
            </React.Fragment>
          ))}
        </div>
      </div>
    </>
  );
}
