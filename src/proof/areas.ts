import type { Area, Level } from './types.ts'

export const AREA_ORDER: Area[] = [
  'Data',
  'Sort',
  'Filters',
  'Search',
  'Post',
  'Navigation',
  'Accessibility',
  'Layout',
]

const IDS_BY_AREA: Record<Area, string[]> = {
  Data: ['D11', 'D12', 'D13', 'D14', 'C1', 'C2', 'C3', 'C4', 'C12', 'C13'],
  Sort: ['D1', 'D2', 'D3', 'C8'],
  Filters: ['D4', 'D5', 'D6', 'D7', 'D15', 'C5', 'C6', 'C7'],
  Search: ['D8', 'D9', 'D10', 'C9', 'C20'],
  Post: ['D16', 'C14', 'C15', 'C16', 'E4', 'E5'],
  Navigation: ['D17', 'D18', 'C11', 'C17', 'C19', 'E1', 'E2', 'E3', 'E6', 'E11', 'E12'],
  Accessibility: ['C10', 'C18', 'E9', 'E10'],
  Layout: ['E7', 'E8', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6'],
}

// Insertion order is the order of the table: area by area, row by row.
export const AREA_BY_ID: Record<string, Area> = Object.fromEntries(
  AREA_ORDER.flatMap((area) => IDS_BY_AREA[area].map((id) => [id, area] as const)),
)

const LEVEL_BY_PREFIX: Record<string, Level> = {
  D: 'unit',
  C: 'component',
  E: 'browser',
  M: 'design',
}

export function levelOf(id: string): Level {
  const level = LEVEL_BY_PREFIX[id.charAt(0)]
  if (!level) throw new Error(`${id}: no level for this prefix`)
  return level
}
