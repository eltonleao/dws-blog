import { expect, it } from 'vitest'
import { formatDate } from './formatDate'

// The suite runs in São Paulo: 02:26 UTC of the 19th is still the 18th there,
// and 01:30 UTC of the 6th is still the 5th. A formatter on the local zone
// would show those days.
const MORNING_UTC = '2026-09-19T02:26:27.250Z'
const EARLY_UTC = '2026-01-06T01:30:00.000Z'

it('L8 formats the date in English as Sep 19, 2026, and English is the default language', () => {
  expect(new Date(MORNING_UTC).getDate()).toBe(18)
  expect(formatDate(MORNING_UTC, 'en')).toBe('Sep 19, 2026')
  expect(formatDate(MORNING_UTC)).toBe('Sep 19, 2026')
})

it('L8 formats the date in Spanish as 19 sept 2026, the output of Intl for es', () => {
  expect(formatDate(MORNING_UTC, 'es')).toBe('19 sept 2026')
})

it('L8 reads the day in UTC in both languages', () => {
  expect(new Date(EARLY_UTC).getDate()).toBe(5)
  expect(formatDate(EARLY_UTC, 'en')).toBe('Jan 6, 2026')
  expect(formatDate(EARLY_UTC, 'es')).toBe('6 ene 2026')
})

it('L8 gives an empty text for an invalid date, in both languages', () => {
  for (const locale of ['en', 'es'] as const) {
    expect(formatDate('not a date', locale), `${locale}: text`).toBe('')
    expect(formatDate('', locale), `${locale}: empty`).toBe('')
  }
})
