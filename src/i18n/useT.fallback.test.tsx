import { renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { Provider } from 'react-redux'
import { expect, it, vi } from 'vitest'
import { makeStore } from '../app/store'
import { en } from '../test/dictionaries'
import { useT } from './useT'

// The Spanish dictionary of this file lacks its first key, which is the case a
// build would refuse: at run time the English text has to stand in for it.
vi.mock('./messages/es', async (importActual) => {
  const actual = await importActual<Record<string, unknown>>()
  const english = (await import('./messages/en')) as Record<string, unknown>
  const [missing] = Object.keys((english.en ?? english.default) as Record<string, string>)
  const name = 'es' in actual ? 'es' : 'default'
  const incomplete = Object.fromEntries(
    Object.entries(actual[name] as Record<string, string>).filter(([key]) => key !== missing),
  )
  return { ...actual, [name]: incomplete }
})

it('L5 falls back to the English text when a key is missing in the Spanish dictionary', () => {
  const [missing] = Object.keys(en)
  const wrapper = ({ children }: { children: ReactNode }) => (
    <Provider store={makeStore({ locale: 'es' })}>{children}</Provider>
  )
  const { t } = renderHook(() => useT(), { wrapper }).result.current

  expect(t(missing)).toBe(en[missing])
})
