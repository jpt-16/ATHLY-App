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
import { Auth } from './screens/auth/Auth';
import { GeneratingOverlay } from './overlays/GeneratingOverlay';
import { MealSheet } from './overlays/MealSheet';
import { Onboarding } from './screens/Onboarding';
import { SwapSheet } from './overlays/SwapSheet';
import { Toast } from './overlays/Toast';
import { IOSDevice } from '../components/ios/IOSFrame';
import { useIsCompact } from '../hooks/useIsCompact';

/**
 * The beat before the app knows who is signed in.
 *
 * `isOnboarding`, `isAuth` and `isApp` are all gated on `!hydrating`, and until
 * this existed nothing was gated *on* it — so with a backend configured the app
 * rendered an empty div until Supabase answered. A flash at best; a permanently
 * blank page if the answer never came, with nothing on screen to say why.
 *
 * Locally and in CI there is no backend, so `hydrating` is false from the first
 * render and none of that ever happened. It only appeared once the app was
 * deployed with credentials, which is the worst place to find out.
 *
 * Deliberately just the mark on the app's own ground: an athlete opening a
 * saved plan should see the app arrive, not a spinner announcing a wait.
 */
function Hydrating() {
  return (
    <div
      style={S(
        'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:#F4F2ED',
      )}
    >
      <div
        style={S(
          'width:34px;height:34px;border-radius:11px;background:#111815;display:flex;align-items:center;justify-content:center;opacity:.9',
        )}
      >
        <span style={S('font-size:14px;font-weight:900;color:#F4F2ED;letter-spacing:-.04em')}>A</span>
      </div>
    </div>
  );
}

/** The app itself — identical in both presentations. */
function Screens({ v }: { v: ViewModel }) {
  return (
    <div
      style={S(
        'position:relative;height:100%;min-height:100%;width:100%;overflow:hidden;background:#F4F2ED;color:#111815;font-family:Archivo,system-ui,sans-serif',
      )}
    >
      {v.isHydrating ? <Hydrating /> : null}
      {v.isOnboarding ? <Onboarding v={v} /> : null}
      {v.isAuth ? <Auth v={v} /> : null}
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
          Early access
        </div>
      </div>
      <IOSDevice>
        <Screens v={v} />
      </IOSDevice>
      {/*
        A line reading "Tweaks switch the home layout, swap interaction, planner
        input and bottom nav" used to sit here. It described the design tool's
        A/B controls, which do not exist in a built bundle — so on the deployed
        site it explained a set of knobs nobody could see or use. "Interactive
        prototype" went at the same time: accurate in the design tool, and on a
        public URL it reads as "this is a mockup" about an app that saves your
        account and logs your food.

        What is genuinely unfinished — the fixed meal plan, macros that are
        authored estimates — is not something a label in the page chrome can
        carry honestly. That belongs in the app, next to the numbers it applies
        to, and it is not built yet.
      */}
    </div>
  );
}
