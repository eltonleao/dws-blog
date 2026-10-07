/**
 * The form in which texts are compared by the search: NFD, without the combining
 * accents, lower case and without the spaces at the edges.
 */
export function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Mn}/gu, '')
    .toLowerCase()
    .trim()
}
