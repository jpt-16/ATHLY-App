import { Capacitor } from '@capacitor/core';

/**
 * Where this build is running, and how a sign-in gets back to it.
 *
 * The same bundle serves a browser tab and an iOS web view, and almost nothing
 * needs to know the difference. Auth does. A redirect that assumes a web origin
 * sends someone signing in on their phone to the website instead of back to the
 * app they started in — which is not a broken page, it is a working page in the
 * wrong place, and it looks to the athlete like the app simply failed.
 */
export const isNative: boolean = Capacitor.isNativePlatform();

/**
 * The custom scheme iOS uses to hand a finished sign-in back to the app.
 *
 * Must match three things or the round trip breaks silently, each in its own
 * way:
 *
 * 1. `appId` in `capacitor.config.ts`, which is what iOS registers as the app's
 *    URL scheme.
 * 2. Supabase → Authentication → URL Configuration → Redirect URLs. Supabase
 *    refuses to redirect anywhere it has not been told about, so an unlisted
 *    scheme lands the athlete on the Site URL instead — the website, again.
 * 3. The `CFBundleURLSchemes` entry in the iOS project's Info.plist.
 *
 * See `README.md` → Running on iOS.
 */
export const NATIVE_AUTH_CALLBACK = 'com.athly.app://auth-callback';
