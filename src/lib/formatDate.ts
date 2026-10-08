import type { Locale } from '../i18n/locale'

// UTC on purpose: the API dates are UTC instants, and the reader has to see the
// same day in every time zone (2026-09-19T02:26:27Z is still the 18th in São Paulo).
const OPTIONS: Intl.DateTimeFormatOptions = {
  timeZone: 'UTC',
  month: 'short',
  day: 'numeric',
  year: 'numeric',
}

// One formatter per language: "Sep 19, 2026" and "19 sept 2026".
const FORMATTERS: Record<Locale, Intl.DateTimeFormat> = {
  en: new Intl.DateTimeFormat('en-US', OPTIONS),
  es: new Intl.DateTimeFormat('es', OPTIONS),
}

export function formatDate(iso: string, locale: Locale = 'en'): string {
  const date = new Date(iso)
  // sortPosts keeps a post with a broken date in the list, so it has to render
  // too: Intl throws a RangeError on an invalid date.
  return Number.isNaN(date.getTime()) ? '' : FORMATTERS[locale].format(date)
}
