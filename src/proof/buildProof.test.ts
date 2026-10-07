import { expect, it } from 'vitest'
import { AREA_ORDER } from './areas.ts'
import { buildProof, ProofBuildError } from './buildProof.ts'
import type { ProofChange } from './types.ts'

// Small records written here, in the shape the CLI reads from the mutation
// records: nothing comes from outside the repository.

const COMMIT = '6afa3e34bd7937b6f6b5c3937463671c11dda8d6'
const RAN_AT = '2026-10-07T10:43:00.000Z'

const change = (file: string, before: string, after: string): ProofChange => ({
  file,
  before,
  after,
})

const MEASURED = '1 falha(s) por asserção: expected 1 to be 2 / second line, 4 s'

const record = (id: string) => ({
  result: 'MORTO',
  measured: MEASURED,
  title: { test: `${id} does something`, file: `src/${id}.test.ts` },
})

interface Overrides {
  mutants?: { id: string; changes: ProofChange[] }[]
  results?: Record<string, { result: string; measured: string }>
  titles?: Record<string, { test: string; file: string }>
}

function inputFor(ids: string[], overrides: Overrides = {}) {
  const results: Record<string, { result: string; measured: string }> = {}
  const titles: Record<string, { test: string; file: string }> = {}
  for (const id of ids) {
    results[id] = { result: record(id).result, measured: record(id).measured }
    titles[id] = record(id).title
  }
  return {
    commit: COMMIT,
    ranAt: RAN_AT,
    mutants: ids.map((id) => ({ id, changes: [change('src/a.ts', 'one', 'two')] })),
    results,
    titles,
    ...overrides,
  }
}

function refusal(run: () => unknown): Error {
  try {
    run()
  } catch (error) {
    return error as Error
  }
  throw new Error('buildProof did not refuse')
}

function expectRefusal(run: () => unknown, id: string) {
  const error = refusal(run)
  expect(error, 'the refusal is a ProofBuildError').toBeInstanceOf(ProofBuildError)
  expect(error.message.startsWith(id), `the message starts with ${id}: ${error.message}`).toBe(true)
}

it('D19 joins the records into lines ordered by AREA_ORDER, with area, level, changes, failure and seconds', () => {
  // D1 is in Sort and D11 in Data; Data comes first in AREA_ORDER, so the
  // input order (D1 first) is not the output order.
  expect(AREA_ORDER.indexOf('Data')).toBeLessThan(AREA_ORDER.indexOf('Sort'))
  const single = [change('src/features/sort.ts', 'a < b', 'a > b')]
  const double = [
    change('src/features/data.ts', 'x = 1', 'x = 2'),
    change('src/features/data.ts', 'y = 1', 'y = 2'),
  ]
  const input = inputFor(['D1', 'D11'], {
    mutants: [
      { id: 'D1', changes: single },
      { id: 'D11', changes: double },
    ],
  })

  const proof = buildProof(input)

  expect(proof.commit).toBe(COMMIT)
  expect(proof.ranAt).toBe(RAN_AT)
  expect(proof.lines.map((line) => line.id)).toEqual(['D11', 'D1'])
  expect(proof.lines[0]).toEqual({
    id: 'D11',
    area: 'Data',
    level: 'unit',
    test: 'D11 does something',
    testFile: 'src/D11.test.ts',
    changes: double,
    caught: true,
    failure: ['expected 1 to be 2', 'second line'],
    seconds: 4,
  })
  expect(proof.lines[1]).toEqual({
    id: 'D1',
    area: 'Sort',
    level: 'unit',
    test: 'D1 does something',
    testFile: 'src/D1.test.ts',
    changes: single,
    caught: true,
    failure: ['expected 1 to be 2', 'second line'],
    seconds: 4,
  })
})

it('D20 refuses a missing result and a result that is not MORTO, with the id first in the message', () => {
  const missing = inputFor(['D1', 'D2'])
  delete missing.results.D2
  expectRefusal(() => buildProof(missing), 'D2')

  const survived = inputFor(['D1', 'D2'])
  survived.results.D1 = { result: 'SOBREVIVEU', measured: MEASURED }
  expectRefusal(() => buildProof(survived), 'D1')
})

it('D21 refuses a missing title, an id outside AREA_BY_ID, a repeated id and a mutant without changes, with the id', () => {
  const untitled = inputFor(['D1', 'D2'])
  delete untitled.titles.D2
  expectRefusal(() => buildProof(untitled), 'D2')

  expectRefusal(() => buildProof(inputFor(['D1', 'X99'])), 'X99')

  const repeated = inputFor(['D1', 'D2'])
  repeated.mutants = [...repeated.mutants, { id: 'D1', changes: [change('src/b.ts', 'p', 'q')] }]
  expectRefusal(() => buildProof(repeated), 'D1')

  const bare = inputFor(['D1', 'D2'])
  bare.mutants = [bare.mutants[0], { id: 'D2', changes: [] }]
  expectRefusal(() => buildProof(bare), 'D2')
})
