import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'

// The row level security of supabase/schema.sql, run in PGlite. PGlite has no
// Supabase around it, so this file builds the little that the schema leans on:
// the auth schema with auth.uid() reading the claim the request carries, the
// anon and authenticated roles, and the default privileges Supabase gives every
// table of the public schema (all rights to both roles). With those in place
// the schema has to take away what it does not allow, as it does on the real
// project. Every case sets the role and the user the way a request does.

// Vitest runs from the root of the repository.
const SCHEMA_FILE = resolve(process.cwd(), 'supabase/schema.sql')

const ALICE = '00000000-0000-4000-8000-0000000000a1'
const BOB = '00000000-0000-4000-8000-0000000000b2'
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

type Who = 'anon' | { user: string }

interface Outcome {
  ok: boolean
  code?: string
  rows: number
}

let db: PGlite

/** Runs one statement the way a request of `who` does, then goes back to the table owner. */
async function as(who: Who, sql: string, params: unknown[] = []): Promise<Outcome> {
  const role = who === 'anon' ? 'anon' : 'authenticated'
  const sub = who === 'anon' ? '' : who.user
  await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [sub])
  await db.exec(`set role ${role}`)
  try {
    const result = await db.query(sql, params)
    const isSelect = /^\s*select/i.test(sql)
    return { ok: true, rows: isSelect ? result.rows.length : (result.affectedRows ?? 0) }
  } catch (error) {
    return { ok: false, code: (error as { code?: string }).code, rows: 0 }
  } finally {
    await db.exec('reset role')
  }
}

async function ownerRows(sql = 'select * from comments order by created_at') {
  return (await db.query<Record<string, unknown>>(sql)).rows
}

const insertAs = (who: Who, body = 'hello', name = 'Visitor 1234') =>
  as(who, 'insert into comments (post_id, display_name, body) values ($1, $2, $3)', [POST, name, body])

// Built once, on the first case: a missing schema.sql then fails each case with
// the reason (a hook that fails in beforeAll only skips the cases).
let ready: Promise<void> | undefined
function setUp(): Promise<void> {
  ready ??= (async () => {
    const schema = readFileSync(SCHEMA_FILE, 'utf8')
    db = new PGlite()
    await db.exec(BOOTSTRAP)
    await db.exec(schema)
  })()
  return ready
}

afterAll(async () => {
  await db?.close()
})

beforeEach(async () => {
  await setUp()
  await db.exec('truncate comments')
})

describe('the comments table', () => {
  it('S1 a visitor without a session reads the comments, and so does a signed-in one', async () => {
    await db.query(
      `insert into comments (post_id, user_id, display_name, body) values ($1, $2, 'Ann', 'one'), ($1, $3, 'Bo', 'two')`,
      [POST, ALICE, BOB],
    )
    const anon = await as('anon', 'select id, body from comments')
    expect(anon, 'anon can read').toMatchObject({ ok: true, rows: 2 })
    const signedIn = await as({ user: ALICE }, 'select id, body from comments')
    expect(signedIn, 'authenticated can read').toMatchObject({ ok: true, rows: 2 })
  })

  it('S2 without a session, inserting is refused', async () => {
    const outcome = await insertAs('anon')
    expect(outcome.ok, 'anon insert').toBe(false)
    expect(outcome.code).toBe('42501')
    expect(await ownerRows()).toHaveLength(0)
  })

  it('S3 a row for another user is refused, and a row without user_id belongs to the one inserting', async () => {
    const foreign = await as(
      { user: ALICE },
      'insert into comments (post_id, user_id, display_name, body) values ($1, $2, $3, $4)',
      [POST, BOB, 'Visitor 1', 'forged'],
    )
    expect(foreign.ok, 'insert with the user_id of someone else').toBe(false)
    expect(foreign.code).toBe('42501')

    const own = await insertAs({ user: ALICE }, 'mine')
    expect(own.ok, 'insert without user_id').toBe(true)
    const rows = await ownerRows()
    expect(rows).toHaveLength(1)
    expect(rows[0].user_id).toBe(ALICE)
  })

  it('S4 the body and the name keep their limits: empty, blank and 501 characters fail; 1 and 500 pass; names of 0 and 41 fail', async () => {
    const alice = { user: ALICE }
    for (const [label, body] of [
      ['an empty body', ''],
      ['a body of spaces', '   '],
      ['a body of 501 characters', 'x'.repeat(501)],
    ] as const) {
      const outcome = await insertAs(alice, body)
      expect(outcome.ok, label).toBe(false)
      expect(outcome.code, label).toBe('23514')
    }
    expect(await insertAs(alice, 'x'), 'a body of 1 character').toMatchObject({ ok: true })
    expect(await insertAs(alice, 'x'.repeat(500)), 'a body of 500 characters').toMatchObject({ ok: true })

    for (const [label, name] of [
      ['a name of 0 characters', ''],
      ['a name of 41 characters', 'n'.repeat(41)],
    ] as const) {
      const outcome = await insertAs(alice, 'fine', name)
      expect(outcome.ok, label).toBe(false)
      expect(outcome.code, label).toBe('23514')
    }
    expect(await ownerRows()).toHaveLength(2)
  })

  it('S5 nobody updates a comment, not even its author', async () => {
    await insertAs({ user: ALICE }, 'original')
    for (const who of [{ user: ALICE }, { user: BOB }, 'anon'] as const) {
      const outcome = await as(who, `update comments set body = 'changed'`)
      expect(outcome.ok ? outcome.rows : 0, 'rows an update touched').toBe(0)
    }
    expect((await ownerRows())[0].body).toBe('original')
  })

  it('S6 the author deletes the own comment, and the comment of someone else is not touched', async () => {
    await db.query(
      `insert into comments (post_id, user_id, display_name, body) values ($1, $2, 'Ann', 'mine'), ($1, $3, 'Bo', 'theirs')`,
      [POST, ALICE, BOB],
    )
    const [mine] = await ownerRows(`select id from comments where body = 'mine'`)
    const [theirs] = await ownerRows(`select id from comments where body = 'theirs'`)

    const own = await as({ user: ALICE }, 'delete from comments where id = $1', [mine.id])
    expect(own, 'deleting the own comment').toMatchObject({ ok: true, rows: 1 })
    const other = await as({ user: ALICE }, 'delete from comments where id = $1', [theirs.id])
    expect(other.ok ? other.rows : 0, 'rows deleted of someone else').toBe(0)
    const anon = await as('anon', 'delete from comments')
    expect(anon.ok ? anon.rows : 0, 'rows deleted by anon').toBe(0)

    expect((await ownerRows()).map((row) => row.body)).toEqual(['theirs'])
  })

  it('S7 the fourth comment of one user in a minute is refused, and older ones do not count', async () => {
    const alice = { user: ALICE }
    for (let sent = 1; sent <= 3; sent += 1) {
      expect(await insertAs(alice, `c${sent}`), `comment ${sent}`).toMatchObject({ ok: true })
    }
    const fourth = await insertAs(alice, 'c4')
    expect(fourth.ok, 'the fourth comment in the same minute').toBe(false)
    expect(fourth.code).toBe('42501')
    expect(await insertAs({ user: BOB }, 'bob'), 'another user is not limited by Alice').toMatchObject({ ok: true })

    await db.exec('truncate comments')
    await db.query(
      `insert into comments (post_id, user_id, display_name, body, created_at)
       select $1, $2, 'Ann', 'old ' || n, now() - interval '2 minutes' from generate_series(1, 5) as n`,
      [POST, ALICE],
    )
    for (let sent = 1; sent <= 3; sent += 1) {
      expect(await insertAs(alice, `new${sent}`), `new comment ${sent} after older ones`).toMatchObject({ ok: true })
    }
  })

  it('S7 the client cannot choose created_at or id', async () => {
    const dated = await as(
      { user: ALICE },
      `insert into comments (post_id, display_name, body, created_at) values ($1, 'Ann', 'back in time', now() - interval '1 day')`,
      [POST],
    )
    expect(dated.ok, 'insert with created_at').toBe(false)
    expect(dated.code).toBe('42501')
    const withId = await as(
      { user: ALICE },
      `insert into comments (id, post_id, display_name, body) values (gen_random_uuid(), $1, 'Ann', 'chosen id')`,
      [POST],
    )
    expect(withId.ok, 'insert with id').toBe(false)
    expect(withId.code).toBe('42501')
  })
})
