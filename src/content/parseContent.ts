import { parsePostFile } from './parsePostFile'

/** The written text of each post, by the id of the post in the API. */
export type ContentMap = Record<string, { title: string; content: string }>

/**
 * The map of one language, from its files (path to text). A malformed file or
 * an id that two files claim throws an error that names the file: half the
 * text never reaches the page.
 */
export function parseContent(files: Record<string, string>): ContentMap {
  const map: ContentMap = {}
  const fileOf = new Map<string, string>()
  for (const [file, raw] of Object.entries(files)) {
    const { id, title, content } = parsePostFile(raw, file)
    const first = fileOf.get(id)
    if (first !== undefined) throw new Error(`${file}: the id ${id} is already the one of ${first}`)
    fileOf.set(id, file)
    map[id] = { title, content }
  }
  return map
}
