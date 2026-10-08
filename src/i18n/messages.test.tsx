import { renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { Provider } from 'react-redux'
import { expect, it } from 'vitest'
import { makeStore } from '../app/store'
import { en, es } from '../test/dictionaries'
import type { Locale } from './locale'
import { useT } from './useT'

const placeholdersOf = (text: string) =>
  [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort()

// The base names of the plurals: 'comments.count' for 'comments.count.one'.
const pluralBases = Object.keys(en)
  .filter((key) => key.endsWith('.one'))
  .map((key) => key.slice(0, -'.one'.length))

function translator(locale: Locale) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <Provider store={makeStore({ locale })}>{children}</Provider>
  )
  return renderHook(() => useT(), { wrapper }).result.current
}

const fill = (text: string, count: number) => text.replaceAll('{count}', String(count))

it('L6 gives the Spanish dictionary exactly the keys of the English one', () => {
  expect(Object.keys(en).length, 'the English dictionary has keys').toBeGreaterThan(0)
  expect(Object.keys(es).sort()).toEqual(Object.keys(en).sort())
})

it('L6 uses the same {placeholders} in both languages for every key', () => {
  for (const key of Object.keys(en)) {
    expect(placeholdersOf(es[key]), `placeholders of ${key}`).toEqual(placeholdersOf(en[key]))
  }
})

it('L6 has the .one and .other forms of every plural, in both languages, and no .other without .one', () => {
  expect(pluralBases.length, 'the dictionaries have at least one plural').toBeGreaterThan(0)
  for (const base of pluralBases) {
    for (const dictionary of [en, es]) {
      expect(dictionary[`${base}.one`], `${base}.one`).toBeTypeOf('string')
      expect(dictionary[`${base}.other`], `${base}.other`).toBeTypeOf('string')
    }
  }
  const others = Object.keys(en)
    .filter((key) => key.endsWith('.other'))
    .map((key) => key.slice(0, -'.other'.length))
  expect(others.sort()).toEqual([...pluralBases].sort())
})

it('L6 picks the .one form for a count of 1 and the .other form for 0 and 2, in English and in Spanish', () => {
  for (const [locale, dictionary] of [['en', en], ['es', es]] as const) {
    const { t } = translator(locale)
    for (const base of pluralBases) {
      expect(t(base, { count: 1 }), `${locale} ${base} 1`).toBe(fill(dictionary[`${base}.one`], 1))
      expect(t(base, { count: 2 }), `${locale} ${base} 2`).toBe(fill(dictionary[`${base}.other`], 2))
      expect(t(base, { count: 0 }), `${locale} ${base} 0`).toBe(fill(dictionary[`${base}.other`], 0))
    }
  }
})

it('L6 translates a plain key by the language of the store', () => {
  const [key] = Object.keys(en).filter(
    (candidate) => !candidate.endsWith('.one') && !candidate.endsWith('.other') && en[candidate] !== es[candidate],
  )
  expect(key, 'a key whose text differs between the languages').toBeDefined()
  expect(translator('en').t(key)).toBe(en[key])
  expect(translator('es').t(key)).toBe(es[key])
})
