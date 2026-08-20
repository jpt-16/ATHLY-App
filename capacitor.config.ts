import type { CapacitorConfig } from '@capacitor/cli';

/**
 * The iOS shell around the web build.
 *
 * Capacitor serves `dist/` from inside a WKWebView, so the app that runs on a
 * phone is byte-for-byte the app that runs in a browser. Nothing here changes
 * what ATHLY is; it decides how iOS presents it.
 *
 * `npx cap add ios` generates the Xcode project from this file. That project is
 * a build artefact of a sort, but it is also where signing, capabilities and
 * Info.plist edits live once anyone touches them — so it is committed, as
 * Capacitor intends, rather than regenerated.
 *
 * See `README.md` → Running on iOS.
 */
const config: CapacitorConfig = {
  // Reverse-DNS, and it has to match the App ID registered in the Apple
  // Developer account before anything can be signed. Changing it later means a
  // new app as far as the App Store is concerned, so it is worth being sure.
  appId: 'com.athly.app',
  appName: 'ATHLY IQ',

  // The Vite build output. `npm run build` refuses to run without Supabase
  // credentials, which is the behaviour we want here more than anywhere: an
  // iOS build that quietly saves nothing cannot be fixed by redeploying.
  webDir: 'dist',

  ios: {
    // The design already handles the notch and the home indicator itself —
    // `viewport-fit=cover` in `index.html`, `env(safe-area-inset-*)` under the
    // bottom nav. Letting the web view inset its own content as well would
    // apply that padding twice and leave a band of dead space above the tabs.
    contentInset: 'never',

    // Behind the web view, so an overscroll bounce shows the app's own ground
    // rather than a strip of white.
    backgroundColor: '#F4F2ED',
  },
};

export default config;
