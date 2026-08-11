// Converted from the ATHLY Claude Design prototype (ATHLY.dc.html).
// Markup and inline styles are preserved verbatim; only the template syntax
// (sc-if / sc-for / {{ }}) was translated to JSX.

import React from 'react';
import type { ViewModel, VmRow } from '../viewModel';
import { S } from '../styles';
import { CalendarScreen } from './CalendarScreen';
import { GroceryScreen } from './GroceryScreen';
import { HomeScreen } from './HomeScreen';
import { LogScreen } from './LogScreen';
import { PlanScreen } from './PlanScreen';
import { ProfileScreen } from './ProfileScreen';
import { ProgressScreen } from './ProgressScreen';
import { RecipesScreen } from './RecipesScreen';

export function AppShell({ v }: { v: ViewModel }) {
  return (
    <>
      {v.isHome ? <HomeScreen v={v} /> : null}
      {v.isCalendar ? <CalendarScreen v={v} /> : null}
      {v.isPlan ? <PlanScreen v={v} /> : null}
      {v.isLog ? <LogScreen v={v} /> : null}
      {v.isRecipes ? <RecipesScreen v={v} /> : null}
      {v.isProfile ? <ProfileScreen v={v} /> : null}
      {v.isGrocery ? <GroceryScreen v={v} /> : null}
      {v.isProgress ? <ProgressScreen v={v} /> : null}
      <div
        style={S(
          'position:absolute;left:0;right:0;bottom:0;z-index:30;padding:0 14px 26px;background:linear-gradient(to top,#F4F2ED 62%,rgba(244,242,237,0))',
        )}
      >
        {v.navEven ? (
          <>
            <div
              style={S(
                'display:grid;grid-template-columns:repeat(5,1fr);background:#111815;border-radius:22px;padding:9px 4px',
              )}
            >
              {(v.tabs ?? []).map((t: VmRow, i: number) => (
                <React.Fragment key={i}>
                  <button onClick={t.pick} style={S(t.style)}>
                    <div style={S(t.mark)} />
                    <span style={S(t.text)}>{t.label}</span>
                  </button>
                </React.Fragment>
              ))}
            </div>
          </>
        ) : null}
        {v.navCenter ? (
          <>
            <div
              style={S(
                'position:relative;display:grid;grid-template-columns:1fr 1fr 74px 1fr 1fr;align-items:center;background:#111815;border-radius:22px;padding:9px 4px',
              )}
            >
              {(v.tabsSplitL ?? []).map((t: VmRow, i: number) => (
                <React.Fragment key={i}>
                  <button onClick={t.pick} style={S(t.style)}>
                    <div style={S(t.mark)} />
                    <span style={S(t.text)}>{t.label}</span>
                  </button>
                </React.Fragment>
              ))}
              <div />
              {(v.tabsSplitR ?? []).map((t: VmRow, i: number) => (
                <React.Fragment key={i}>
                  <button onClick={t.pick} style={S(t.style)}>
                    <div style={S(t.mark)} />
                    <span style={S(t.text)}>{t.label}</span>
                  </button>
                </React.Fragment>
              ))}
              <button
                className={'dc-ho1'}
                onClick={v.goLog}
                style={S(
                  'position:absolute;left:50%;top:-24px;transform:translateX(-50%);width:64px;height:64px;border-radius:22px;background:#17A05E;color:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 10px 22px rgba(23,160,94,.4)',
                )}
              >
                <svg
                  width="26"
                  height="26"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.8"
                  strokeLinecap="round"
                >
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </button>
            </div>
          </>
        ) : null}
      </div>
    </>
  );
}
