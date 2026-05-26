// Capture window.location.hash at the absolute first moment of script
// execution — BEFORE any Supabase client is created anywhere in the
// codebase. Supabase JS auto-consumes the URL fragment when
// createClient() runs (when detectSessionInUrl is true, the default)
// and clears it via history.replaceState. If we read the hash any
// later than this, the recovery token (`type=recovery`) is already
// gone.
//
// THIS MODULE MUST BE IMPORTED FIRST IN main.tsx — before App, before
// any service, before anything that imports backendApi or
// supabaseClient. ES module evaluation is depth-first; the first
// import you write is the first module that gets evaluated. Keeping
// this file dependency-free (no other imports) means it has nothing
// to wait for and runs immediately.
//
// Added 2026-05-26 after a multi-step diagnosis traced the
// password-recovery bug to a module-load ordering issue: backendApi.ts
// creates a Supabase client at line 24 as a module-level side effect,
// which beat both useAuth's useEffect and an earlier snapshot in
// supabaseClient.ts to the hash.

export const INITIAL_URL_HASH: string =
  typeof window !== 'undefined' ? window.location.hash : ''
