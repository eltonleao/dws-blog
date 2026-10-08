/** The languages of the interface, English first: the one a first visit gets. */
export const LOCALES = ['en', 'es'] as const

export type Locale = (typeof LOCALES)[number]

const STORAGE_KEY = 'dws-blog:locale'

function isLocale(value: string | null): value is Locale {
  return (LOCALES as readonly (string | null)[]).includes(value)
}

/**
 * The language the reader chose on an earlier visit. A first visit, a value
 * this version does not know and a storage that throws (blocked, or a private
 * window that refuses it) all read as English.
 */
export function readStoredLocale(): Locale {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    return isLocale(value) ? value : 'en'
  } catch {
    return 'en'
  }
}

/**
 * Keeps the choice for the next visit. A storage that throws only costs the
 * next visit: the store already holds the choice for this one.
 */
export function storeLocale(locale: Locale): void {
  try {
    localStorage.setItem(STORAGE_KEY, locale)
  } catch {
    // Nothing to do: the language still changes for the session.
  }
}
