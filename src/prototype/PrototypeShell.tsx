// Converted from the ATHLY Claude Design prototype (ATHLY.dc.html).
// Markup and inline styles are preserved verbatim; only the template syntax
// (sc-if / sc-for / {{ }}) was translated to JSX.
//
// The one addition the design has no opinion on: below 500px the page chrome
// and the drawn phone go away and the screens fill the viewport. See
// `useIsCompact`.

import type { ViewModel } from './viewModel';
import { S } from './styles';
import { AppShell } from './screens/AppShell';
import { GeneratingOverlay } from './overlays/GeneratingOverlay';
import { MealSheet } from './overlays/MealSheet';
import { Onboarding } from './screens/Onboarding';
import { SwapSheet } from './overlays/SwapSheet';
import { Toast } from './overlays/Toast';
import { IOSDevice } from '../components/ios/IOSFrame';
import { useIsCompact } from '../hooks/useIsCompact';

/** The app itself — identical in both presentations. */
function Screens({ v }: { v: ViewModel }) {
  return (
    <div
      style={S(
        'position:relative;height:100%;min-height:100%;width:100%;overflow:hidden;background:#F4F2ED;color:#111815;font-family:Archivo,system-ui,sans-serif',
      )}
    >
      {v.isOnboarding ? <Onboarding v={v} /> : null}
      {v.isApp ? <AppShell v={v} /> : null}
      {v.showMeal ? <MealSheet v={v} /> : null}
      {v.showSwap ? <SwapSheet v={v} /> : null}
      {v.showGen ? <GeneratingOverlay v={v} /> : null}
      {v.showToast ? <Toast v={v} /> : null}
    </div>
  );
}

export function PrototypeShell({ v }: { v: ViewModel }) {
  const compact = useIsCompact();

  // Phone: no page chrome, no bezel, no page ground. The wordmark and the
  // footer note explain the prototype to someone looking at it on a desktop;
  // on a phone they are a header bar stealing a tenth of the screen from the
  // app they are describing.
  if (compact) {
    return (
      <IOSDevice bare>
        <Screens v={v} />
      </IOSDevice>
    );
  }

  return (
    <div
      style={S(
        'min-height:100vh;display:flex;flex-direction:column;align-items:center;gap:18px;padding:36px 20px 56px;background:#E8E5DE',
      )}
    >
      <div style={S('display:flex;align-items:center;gap:12px;width:402px;max-width:100%')}>
        <div
          style={S(
            'width:26px;height:26px;border-radius:8px;background:#111815;display:flex;align-items:center;justify-content:center;position:relative;flex:none',
          )}
        >
          <span style={S('font-size:10.5px;font-weight:900;color:#F4F2ED;letter-spacing:-.04em')}>A</span>
          <div
            style={S(
              'position:absolute;top:-3px;right:-3px;width:9px;height:9px;border-radius:50%;background:#17A05E;border:2px solid #E8E5DE',
            )}
          />
        </div>
        <div style={S('font-weight:900;font-stretch:125%;font-size:17px;letter-spacing:.01em;color:#111815')}>
          ATHLY
        </div>
        <div
          style={S(
            'font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;font-weight:800;color:#A5A093;margin-left:auto',
          )}
        >
          Interactive prototype
        </div>
      </div>
      <IOSDevice>
        <Screens v={v} />
      </IOSDevice>
      <div style={S('width:402px;max-width:100%;font-size:12px;line-height:1.6;color:#6E6A60')}>
        Tweaks switch the home layout, swap interaction, planner input and bottom nav.
      </div>
    </div>
  );
}
