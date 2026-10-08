import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'

// Cases of supabase/schema.sql that the first row level security suite does not
// reach: a name of blanks, several rows in one statement, and the lock that
// makes parallel requests count one after the other. Same setup as that suite:
// the little of Supabase the schema leans on, built by hand in PGlite.

const SCHEMA_FILE = resolve(process.cwd(), 'supabase/schema.sql')

const ALICE = '00000000-0000-4000-8000-0000000000a1'
const POST = '11111111-1111-4111-8111-111111111111'

const BOOTSTRAP = `
  create schema auth;
  create role anon nologin;
  create role authenticated nologin;
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema public to anon, authenticated;
  grant usage on schema auth to anon, authenticated;
  grant execute on function auth.uid() to anon, authenticated;
  alter default privileges in schema public grant all on tables to anon, authenticated;
`

let db: PGlite
let ready: Promise<void> | undefined

function setUp(): Promise<void> {
  ready ??= (async () => {
    db = new PGlite()
    await db.exec(BOOTSTRAP)
    await db.exec(readFileSync(SCHEMA_FILE, 'utf8'))
  })()
  return ready
}

/** Runs one statement as the signed-in user, then goes back to the table owner. */
async function asAlice(sql: string, params: unknown[] = []) {
  await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [ALICE])
  await db.exec('set role authenticated')
  try {
    await db.query(sql, params)
    return { ok: true as const, code: undefined }
  } catch (error) {
    return { ok: false as const, code: (error as { code?: string }).code }
  } finally {
    await db.exec('reset role')
  }
}

afterAll(async () => {
  await db?.close()
})

beforeEach(async () => {
  await setUp()
  await db.exec('truncate comments')
})

describe('the comments table, further cases', () => {
  it('S4 a name of only blanks is refused', async () => {
    for (const name of [' ', '   ', '\t', ' \n ']) {
      const outcome = await asAlice(
        'insert into comments (post_id, display_name, body) values ($1, $2, $3)',
        [POST, name, 'hello'],
      )
      expect(outcome.ok, JSON.stringify(name)).toBe(false)
      expect(outcome.code, JSON.stringify(name)).toBe('23514')
    }
  })

  it('S7 four rows in one statement are refused as a whole', async () => {
    const outcome = await asAlice(
      `insert into comments (post_id, display_name, body)
       values ($1, 'Ann', 'a'), ($1, 'Ann', 'b'), ($1, 'Ann', 'c'), ($1, 'Ann', 'd')`,
      [POST],
    )
    expect(outcome.ok, 'a single insert of four rows').toBe(false)
    expect(outcome.code).toBe('42501')
    expect((await db.query('select 1 from comments')).rows).toHaveLength(0)
  })

  it('S7 the count function is volatile and takes a lock per user before counting', async () => {
    const { rows } = await db.query<{ prosrc: string; provolatile: string }>(
      `select prosrc, provolatile from pg_proc where proname = 'comments_sent_last_minute'`,
    )
    expect(rows).toHaveLength(1)
    expect(rows[0].provolatile, 'volatility').toBe('v')
    const lock = rows[0].prosrc.search(/pg_advisory_xact_lock\(/)
    const count = rows[0].prosrc.search(/select\s+count\(\*\)/i)
    expect(lock, 'the function takes the advisory lock').toBeGreaterThanOrEqual(0)
    expect(lock, 'the lock comes before the count').toBeLessThan(count)
  })
})
