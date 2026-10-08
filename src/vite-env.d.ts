/// <reference types="vite/client" />

// The variables the build reads. Both are public: the anon key ships in the
// bundle by design, and the row level security of the table protects it.
interface ImportMetaEnv {
  /** Address of the Supabase project of the comments. */
  readonly VITE_SUPABASE_URL?: string
  /** Its public (anon) key. */
  readonly VITE_SUPABASE_ANON_KEY?: string
}
