/// <reference types="vite/client" />

/**
 * The environment variables this app reads.
 *
 * Vite's own types declare `import.meta.env` with an `any` index signature, so a
 * typo in a variable name would compile silently and read `undefined` at
 * runtime. Naming them here turns that into a compile error.
 *
 * Everything under `VITE_` is compiled into the client bundle and is public.
 * Nothing secret belongs in this interface — see `src/lib/env.ts`.
 */
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  /** `'true'` to offer Sign in with Apple. See `isAppleEnabled`. */
  readonly VITE_ENABLE_APPLE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
