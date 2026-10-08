import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { LOCALES, readStoredLocale, storeLocale } from './locale'

const KEY = 'dws-blog:locale'

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  vi.restoreAllMocks()
})

it('L3 offers English and Spanish and stores the choice under dws-blog:locale', () => {
  expect([...LOCALES]).toEqual(['en', 'es'])

  storeLocale('es')
  expect(localStorage.getItem(KEY)).toBe('es')
  expect(readStoredLocale()).toBe('es')

  storeLocale('en')
  expect(localStorage.getItem(KEY)).toBe('en')
  expect(readStoredLocale()).toBe('en')
})

it('L3 reads en when the stored value is outside LOCALES', () => {
  for (const value of ['fr', 'pt', 'ES', ' es', 'undefined', 'null', '']) {
    localStorage.setItem(KEY, value)
    expect(readStoredLocale(), `stored value "${value}"`).toBe('en')
  }
})

it('L3 reads en when the storage throws, and storeLocale swallows the error of a storage that throws', () => {
  const blocked = () => {
    throw new DOMException('The storage is blocked', 'SecurityError')
  }

  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(blocked)
  expect(readStoredLocale()).toBe('en')

  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(blocked)
  expect(() => storeLocale('es')).not.toThrow()
})

it('L4 reads en on a first visit and es once es is stored, so the first paint can already be in Spanish', () => {
  expect(localStorage.getItem(KEY)).toBeNull()
  expect(readStoredLocale()).toBe('en')

  localStorage.setItem(KEY, 'es')
  expect(readStoredLocale()).toBe('es')
})
