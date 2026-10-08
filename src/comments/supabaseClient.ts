import type { SupabaseClient } from '@supabase/supabase-js'

// The comments live in a Supabase project. This module and the package load
// only when the comments section asks for them: the list never downloads
// them, and the main chunk does not carry them.

/** How long a request to the project may take before it counts as failed. */
const REQUEST_TIMEOUT_MS = 10_000

interface Current {
  url: string
  key: string
  client: Promise<SupabaseClient>
}

let current: Current | undefined

// A project that does not answer fails like one that answers with an error,
// instead of leaving the section loading for good.
const fetchWithTimeout: typeof fetch = (input, init) => {
  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS)
  const signal = init?.signal ? AbortSignal.any([init.signal, timeout]) : timeout
  return fetch(input, { ...init, signal })
}

async function createSupabase(url: string, key: string): Promise<SupabaseClient> {
  const { createClient } = await import('@supabase/supabase-js')
  return createClient(url, key, {
    auth: {
      // The session of the visitor stays in the browser (localStorage) until
      // Leave. No sign-in ever comes back through a link, and the token is
      // refreshed by the request that needs it, not by a timer on every post.
      persistSession: true,
      detectSessionInUrl: false,
      autoRefreshToken: false,
    },
    // A failed read shows Try again at once, instead of the client retrying
    // for seconds behind "Loading comments".
    db: { retry: false },
    global: { fetch: fetchWithTimeout },
  })
}

/**
 * The client of the comments project, created once, or `null` when the build
 * has no address or no key: the section then says comments are unavailable,
 * and nothing is requested. The variables are read on every call; a test
 * changes them between cases, a build never does.
 */
export async function getSupabase(): Promise<SupabaseClient | null> {
  const url = import.meta.env.VITE_SUPABASE_URL
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY
  if (!url || !key) return null
  if (current && current.url === url && current.key === key) return current.client
  const client = createSupabase(url, key)
  current = { url, key, client }
  // A package that fails to load (offline, or a deploy that replaced the
  // chunk) is tried again on the next call.
  client.catch(() => {
    if (current?.client === client) current = undefined
  })
  return client
}
