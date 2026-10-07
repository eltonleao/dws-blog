import { expect, it } from 'vitest'
import proofCount from './proof-count.json'
import proofJson from './proof.json'
import { parseProof } from './parseProof.ts'

// The 56 lines of the P1 matrix, by id: the product of the bug hunt.
const P1_IDS = [
  'D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8', 'D9', 'D10',
  'D11', 'D12', 'D13', 'D14', 'D15', 'D16', 'D17', 'D18',
  'C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8', 'C9', 'C10',
  'C11', 'C12', 'C13', 'C14', 'C15', 'C16', 'C17', 'C18', 'C19', 'C20',
  'E1', 'E2', 'E3', 'E4', 'E5', 'E6', 'E7', 'E8', 'E9', 'E10', 'E11', 'E12',
  'M1', 'M2', 'M3', 'M4', 'M5', 'M6',
]

it('D24 keeps proof.json valid with exactly the 56 ids of the P1, once each, and proof-count.json equal to its line count', () => {
  expect(P1_IDS).toHaveLength(56)
  expect(new Set(P1_IDS).size).toBe(56)

  const proof = parseProof(proofJson)
  const ids = proof.lines.map((line) => line.id)
  expect(ids).toHaveLength(56)
  expect([...ids].sort()).toEqual([...P1_IDS].sort())
  expect(proofCount).toEqual({ total: proof.lines.length })
})
