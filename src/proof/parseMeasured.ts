import { ProofBuildError } from './buildProof.ts'

const MEASURED = /^\d+ falha\(s\) por asserção: (.*), (\d+) s$/
const MAX_LINES = 6
const MAX_LENGTH = 200

export function parseMeasured(text: string): { failure: string[]; seconds: number } {
  const match = MEASURED.exec(text)
  if (!match) throw new ProofBuildError(`unreadable Measured text: ${text.slice(0, 80)}`)
  const failure = match[1]
    .split(' / ')
    .map((line) => line.trim())
    .filter((line) => line !== '')
    .slice(0, MAX_LINES)
    .map((line) => (line.length > MAX_LENGTH ? `${line.slice(0, MAX_LENGTH - 1)}…` : line))
  return { failure, seconds: Number(match[2]) }
}
