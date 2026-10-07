import { expect, it } from 'vitest'
import { formatDate } from './formatDate'

it('D13 formats the date in UTC, so it reads "Sep 19, 2026" with TZ America/Sao_Paulo', () => {
  const iso = '2026-09-19T02:26:27.250Z'

  // The suite runs in São Paulo, where that instant is still the 18th. Without
  // this guard a formatter that used the local zone could pass in UTC.
  expect(new Date(iso).getDate()).toBe(18)

  expect(formatDate(iso)).toBe('Sep 19, 2026')
})
