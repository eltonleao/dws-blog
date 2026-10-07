import { AREA_BY_ID, AREA_ORDER, levelOf } from './areas.ts'
import { parseMeasured } from './parseMeasured.ts'
import type { Proof, ProofChange, ProofLine } from './types.ts'

export class ProofBuildError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ProofBuildError'
  }
}

export interface ProofInput {
  commit: string
  ranAt: string
  mutants: { id: string; changes: ProofChange[] }[]
  results: Record<string, { result: string; measured: string }>
  titles: Record<string, { test: string; file: string }>
}

export function buildProof(input: ProofInput): Proof {
  const seen = new Set<string>()
  const lines = new Map<string, ProofLine>()

  for (const { id, changes } of input.mutants) {
    if (!Object.hasOwn(AREA_BY_ID, id)) throw new ProofBuildError(`${id}: not a line of the matrix`)
    if (seen.has(id)) throw new ProofBuildError(`${id}: appears more than once`)
    seen.add(id)
    if (changes.length === 0) throw new ProofBuildError(`${id}: the mutant has no change`)

    const outcome = input.results[id]
    if (!outcome) throw new ProofBuildError(`${id}: no result`)
    if (outcome.result !== 'MORTO') {
      throw new ProofBuildError(`${id}: the result is ${outcome.result}, not MORTO`)
    }
    const title = input.titles[id]
    if (!title) throw new ProofBuildError(`${id}: no test title`)

    let measured
    try {
      measured = parseMeasured(outcome.measured)
    } catch (error) {
      throw new ProofBuildError(`${id}: ${(error as Error).message}`)
    }

    lines.set(id, {
      id,
      area: AREA_BY_ID[id],
      level: levelOf(id),
      test: title.test,
      testFile: title.file,
      changes,
      caught: true,
      failure: measured.failure,
      seconds: measured.seconds,
    })
  }

  const ordered: ProofLine[] = []
  for (const area of AREA_ORDER) {
    for (const id of Object.keys(AREA_BY_ID)) {
      const line = lines.get(id)
      if (line && AREA_BY_ID[id] === area) ordered.push(line)
    }
  }
  return { commit: input.commit, ranAt: input.ranAt, lines: ordered }
}
