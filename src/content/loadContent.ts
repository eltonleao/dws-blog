import type { Locale } from '../i18n/locale'
import type { ContentMap } from './parseContent'

/**
 * The written text of each language, a chunk of its own that loads the first
 * time the language is asked for: a reader in English never downloads Spanish.
 */
export const contentLoaders: Record<Locale, () => Promise<ContentMap>> = {
  en: () => import('./en.ts').then((module) => module.content),
  es: () => import('./es.ts').then((module) => module.content),
}
