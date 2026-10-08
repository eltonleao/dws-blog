import type { Locale } from './locale'

// The categories the API has today. A Map, so a name such as "constructor"
// finds nothing instead of a property of Object.
const SPANISH = new Map([
  ['Technology', 'Tecnología'],
  ['Science', 'Ciencia'],
  ['Sports', 'Deportes'],
  ['Travel', 'Viajes'],
  ['Food', 'Comida'],
  ['Fashion', 'Moda'],
])

/**
 * The label of a category in the language of the interface. Only the label:
 * the filter and the URL keep the API name, so an address means the same
 * posts in every language. A name this list does not know comes back as it
 * came, which is still a readable label.
 */
export function categoryLabel(name: string, locale: Locale): string {
  return locale === 'es' ? (SPANISH.get(name) ?? name) : name
}
