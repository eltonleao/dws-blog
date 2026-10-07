import { AREA_ORDER } from './areas.ts'
import type { Area, Level, Proof, ProofChange, ProofLine } from './types.ts'

export class ProofShapeError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ProofShapeError'
  }
}

const LEVELS: Level[] = ['unit', 'component', 'browser', 'design']

const fail = (where: string, what: string): never => {
  throw new ProofShapeError(`${where}: ${what}`)
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

function text(where: string, value: unknown): string {
  if (typeof value !== 'string') fail(where, 'expected a string')
  return value as string
}

function parseChange(where: string, data: unknown): ProofChange {
  if (!isRecord(data)) return fail(where, 'expected an object')
  return {
    file: text(`${where}.file`, data.file),
    before: text(`${where}.before`, data.before),
    after: text(`${where}.after`, data.after),
  }
}

function parseLine(where: string, data: unknown): ProofLine {
  if (!isRecord(data)) return fail(where, 'expected an object')
  const area = data.area
  if (!AREA_ORDER.includes(area as Area)) fail(`${where}.area`, 'unknown area')
  const level = data.level
  if (!LEVELS.includes(level as Level)) fail(`${where}.level`, 'unknown level')
  if (data.caught !== true) fail(`${where}.caught`, 'expected true')
  const { changes, failure, seconds } = data
  if (!Array.isArray(changes)) fail(`${where}.changes`, 'expected a list')
  if (!Array.isArray(failure) || !failure.every((item) => typeof item === 'string')) {
    fail(`${where}.failure`, 'expected a list of strings')
  }
  if (typeof seconds !== 'number' || !Number.isFinite(seconds)) {
    fail(`${where}.seconds`, 'expected a finite number')
  }
  return {
    id: text(`${where}.id`, data.id),
    area: area as Area,
    level: level as Level,
    test: text(`${where}.test`, data.test),
    testFile: text(`${where}.testFile`, data.testFile),
    changes: (changes as unknown[]).map((change, index) =>
      parseChange(`${where}.changes[${index}]`, change),
    ),
    caught: true,
    failure: failure as string[],
    seconds: seconds as number,
  }
}

export function parseProof(data: unknown): Proof {
  if (!isRecord(data)) return fail('proof', 'expected an object')
  const commit = text('proof.commit', data.commit)
  if (!/^[0-9a-f]{40}$/.test(commit)) fail('proof.commit', 'expected 40 hex characters')
  const ranAt = text('proof.ranAt', data.ranAt)
  if (!Array.isArray(data.lines)) return fail('proof.lines', 'expected a list')
  return {
    commit,
    ranAt,
    lines: data.lines.map((line, index) => parseLine(`proof.lines[${index}]`, line)),
  }
}
