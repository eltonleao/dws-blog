export type Area =
  | 'Data'
  | 'Sort'
  | 'Filters'
  | 'Search'
  | 'Post'
  | 'Navigation'
  | 'Accessibility'
  | 'Layout'
export type Level = 'unit' | 'component' | 'browser' | 'design'
export interface ProofChange {
  file: string
  before: string
  after: string
}
export interface ProofLine {
  id: string
  area: Area
  level: Level
  test: string
  testFile: string
  changes: ProofChange[]
  caught: true
  failure: string[]
  seconds: number
}
export interface Proof {
  commit: string
  ranAt: string
  lines: ProofLine[]
}
