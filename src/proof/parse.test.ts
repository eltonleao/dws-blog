import { expect, it } from 'vitest'
import { parseMeasured } from './parseMeasured.ts'
import { parseProof, ProofShapeError } from './parseProof.ts'

// The Measured column of line C16 of the P1 records, word for word.
const C16_MEASURED =
  '1 falha(s) por asserção: Error: Unable to find role="heading" and name "Climate Change and Its Effects" / Ignored nodes: comments, script, style / <body> / <div> / <div / class="_page_d72aeb" / > / <div / aria-hidden="true" / class="_backdrop_21…, 4 s'

it('D22 reads the Measured column into at most 6 lines of at most 200 characters and the seconds', () => {
  const measured = parseMeasured(C16_MEASURED)
  expect(measured.seconds).toBe(4)
  expect(measured.failure).toEqual([
    'Error: Unable to find role="heading" and name "Climate Change and Its Effects"',
    'Ignored nodes: comments, script, style',
    '<body>',
    '<div>',
    '<div',
    'class="_page_d72aeb"',
  ])

  expect(parseMeasured('2 falha(s) por asserção: x, 3 s')).toEqual({
    failure: ['x'],
    seconds: 3,
  })

  const long = parseMeasured(`1 falha(s) por asserção: ${'y'.repeat(250)}, 7 s`)
  expect(long.failure).toHaveLength(1)
  expect(long.failure[0].length).toBeLessThanOrEqual(200)
  expect(long.failure[0].endsWith('…')).toBe(true)

  expect(() => parseMeasured('nothing that looks like a measure')).toThrow()
  expect(() => parseMeasured('1 falha(s) por asserção: x')).toThrow()
})

const validLine = {
  id: 'D1',
  area: 'Sort',
  level: 'unit',
  test: 'D1 sorts the posts',
  testFile: 'src/features/sort.test.ts',
  changes: [{ file: 'src/features/sort.ts', before: 'a < b', after: 'a > b' }],
  caught: true,
  failure: ['expected 1 to be 2'],
  seconds: 4,
}

const validProof = {
  commit: '6afa3e34bd7937b6f6b5c3937463671c11dda8d6',
  ranAt: '2026-10-07T10:43:00.000Z',
  lines: [validLine],
}

const withLine = (patch: Record<string, unknown>) => ({
  ...validProof,
  lines: [{ ...validLine, ...patch }],
})

it('D23 accepts a valid Proof and refuses lines that are not a list, an unknown area, caught false, seconds that are not finite and a short commit', () => {
  expect(parseProof(validProof)).toEqual(validProof)

  const bad: Record<string, unknown> = {
    'lines that is not a list': { ...validProof, lines: 'D1' },
    'an unknown area': withLine({ area: 'Cooking' }),
    'caught false': withLine({ caught: false }),
    'seconds that are not finite': withLine({ seconds: Infinity }),
    'a short commit': { ...validProof, commit: '6afa3e3' },
  }
  for (const [name, data] of Object.entries(bad)) {
    let thrown: unknown
    try {
      parseProof(data)
    } catch (error) {
      thrown = error
    }
    expect(thrown, `parseProof refuses ${name}`).toBeInstanceOf(ProofShapeError)
  }
})
