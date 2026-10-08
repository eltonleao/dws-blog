import type { Session } from '@supabase/supabase-js'
import { getSupabase } from './supabaseClient'

// The login of the blog is make-believe: a visitor is an anonymous user of the
// Supabase project, born with the first comment under a name such as
// "Visitor 4821". The session stays in the browser, so the visitor can delete
// their comments after a reload; Leave ends it, and the next comment is born
// as a new visitor with another name.

export interface Visitor {
  userId: string
  displayName: string
}

/** The longest name the table accepts. */
const NAME_MAX_LENGTH = 40

// The name of the visitor who just left, so the next one is not born with it.
let leftName: string | undefined

/** "Visitor" and four digits, never `avoid`. */
export function drawVisitorName(avoid?: string): string {
  for (;;) {
    const name = `Visitor ${1000 + Math.floor(Math.random() * 9000)}`
    if (name !== avoid) return name
  }
}

function visitorOf(session: Session | null): Visitor | null {
  const name: unknown = session?.user.user_metadata?.display_name
  if (!session || typeof name !== 'string') return null
  if (name.trim() === '' || name.length > NAME_MAX_LENGTH) return null
  return { userId: session.user.id, displayName: name }
}

async function supabase() {
  const client = await getSupabase()
  if (!client) throw new Error('The comments project is not configured')
  return client
}

/** The visitor of the session kept in the browser: `null` before the first comment and after Leave. */
export async function currentVisitor(): Promise<Visitor | null> {
  const client = await getSupabase()
  if (!client) return null
  const { data, error } = await client.auth.getSession()
  if (error) throw error
  return visitorOf(data.session)
}

/**
 * The visitor of the session, or a new one: an anonymous sign-in that carries
 * the name in the user metadata. A session without a usable name starts a new
 * visitor too. Rejects when the project refuses anonymous sign-ins.
 */
export async function ensureVisitor(): Promise<Visitor> {
  const client = await supabase()
  const { data: stored } = await client.auth.getSession()
  const existing = visitorOf(stored.session)
  if (existing) return existing

  const displayName = drawVisitorName(leftName)
  const { data, error } = await client.auth.signInAnonymously({
    options: { data: { display_name: displayName } },
  })
  if (error) throw error
  if (!data.user) throw new Error('The anonymous sign-in returned no user')
  return { userId: data.user.id, displayName }
}

/**
 * Ends the session of the visitor. The client drops the stored session even
 * when the server does not answer the logout, and that is all Leave needs: the
 * next comment is born as a new visitor.
 */
export async function leaveVisitor(): Promise<void> {
  const client = await getSupabase()
  if (!client) return
  const { data } = await client.auth.getSession()
  leftName = visitorOf(data.session)?.displayName ?? leftName
  await client.auth.signOut()
}
