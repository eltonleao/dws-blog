import { useAppDispatch, useAppSelector } from '../app/hooks'
import { storeLocale } from './locale'
import type { Locale } from './locale'
import { selectLocale, setLocale as localeChosen } from './localeSlice'
import { en } from './messages/en'
import type { MessageKey } from './messages/en'
import { es } from './messages/es'

/** The base of a plural: 'list.count' for 'list.count.one' and 'list.count.other'. */
type PluralBase<Key = MessageKey> = Key extends `${infer Base}.one` ? Base : never

/**
 * What `t` takes: a key of the dictionary or the base of a plural. Any string
 * type-checks too, for a key computed at run time; the editor still offers the
 * literal ones.
 */
export type TranslationKey = MessageKey | PluralBase | (string & {})

/** The values of the {placeholders}. `count` also picks the form of a plural. */
export type TranslationVars = Record<string, string | number>

export interface Translator {
  t(key: TranslationKey, vars?: TranslationVars): string
  locale: Locale
  /** Changes the language of the store and keeps it for the next visit. */
  setLocale(locale: Locale): void
}

const DICTIONARIES: Record<Locale, Record<string, string>> = { en, es }

// One per language, as formatDate keeps one formatter per language.
const PLURAL_RULES: Record<Locale, Intl.PluralRules> = {
  en: new Intl.PluralRules('en'),
  es: new Intl.PluralRules('es'),
}

// Own keys only: a key such as "constructor" is not a text of the dictionary.
// A key the language lacks takes the English text.
function lookup(locale: Locale, key: string): string | undefined {
  const dictionary = DICTIONARIES[locale]
  if (Object.hasOwn(dictionary, key)) return dictionary[key]
  if (Object.hasOwn(en, key)) return en[key as MessageKey]
  return undefined
}

/**
 * The text of `key` in `locale`, with the {placeholders} filled from `vars`.
 * With a `count` and no text of its own, the key is the base of a plural, and
 * Intl.PluralRules picks `.one` or `.other`; a form the dictionaries do not
 * have (`many`, which Spanish uses for a million) falls back to `.other`. A key
 * no dictionary has comes back as itself, so the miss shows on the screen.
 */
export function translate(locale: Locale, key: TranslationKey, vars?: TranslationVars): string {
  const count = vars?.count
  const text =
    typeof count === 'number' && lookup(locale, key) === undefined
      ? (lookup(locale, `${key}.${PLURAL_RULES[locale].select(count)}`) ??
        lookup(locale, `${key}.other`))
      : lookup(locale, key)
  if (text === undefined) return key
  if (vars === undefined) return text
  return text.replace(/\{(\w+)\}/g, (placeholder, name: string) =>
    Object.hasOwn(vars, name) ? String(vars[name]) : placeholder,
  )
}

/** The texts of the interface in the language of the store, and the way to change it. */
export function useT(): Translator {
  const locale = useAppSelector(selectLocale)
  const dispatch = useAppDispatch()
  return {
    t: (key, vars) => translate(locale, key, vars),
    locale,
    setLocale: (next) => {
      dispatch(localeChosen(next))
      storeLocale(next)
    },
  }
}
