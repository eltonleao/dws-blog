import * as enModule from '../i18n/messages/en'
import * as esModule from '../i18n/messages/es'

// The two dictionaries as the tests of the language read them. The design names
// the constants `en` and `es`; a default export is accepted too, so a test
// never fails on how the module is exported, only on what it holds.

export type Dictionary = Record<string, string>

function dictionaryOf(module: object, name: string): Dictionary {
  const exports = module as Record<string, unknown>
  return (exports[name] ?? exports.default) as Dictionary
}

export const en = dictionaryOf(enModule, 'en')
export const es = dictionaryOf(esModule, 'es')

/** The keys of the English dictionary whose text is exactly `english`. */
export function keysOf(english: string): string[] {
  return Object.keys(en).filter((key) => en[key] === english)
}

/**
 * The Spanish text of a string the interface shows today. The English
 * dictionary is born from the text already in the components, so every one of
 * those strings is the value of some key.
 */
export function spanishOf(english: string): string {
  const [key] = keysOf(english)
  if (key === undefined) {
    throw new Error(`No key of the English dictionary holds "${english}"`)
  }
  return es[key]
}

/** Whether the text has {placeholders}: those values are filled at run time and are not matched as text. */
export const hasPlaceholder = (text: string) => /\{\w+\}/.test(text)
