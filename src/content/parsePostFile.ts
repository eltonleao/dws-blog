import { toParagraphs } from '../lib/paragraphs'

/** One post file: the id of the post in the API, its title and its paragraphs. */
export interface PostFile {
  id: string
  title: string
  /** The paragraphs joined by a blank line, the shape toParagraphs reads. */
  content: string
}

/**
 * Reads one Markdown file of src/content/posts/: the front matter with the
 * `id`, a `# ` title line, then the paragraphs, separated by blank lines.
 * Anything else throws an error that names the file, so a broken post stops
 * the build with a message someone can act on.
 */
export function parsePostFile(raw: string, file: string): PostFile {
  const fail = (problem: string) => new Error(`${file}: ${problem}`)
  const lines = raw.replace(/^﻿/, '').split(/\r?\n/)

  if (lines[0]?.trim() !== '---') throw fail('the file does not open with the front matter (---)')
  const end = lines.findIndex((line, index) => index > 0 && line.trim() === '---')
  if (end === -1) throw fail('the front matter is never closed (---)')
  const id = lines
    .slice(1, end)
    .map((line) => /^id:\s*(.*)$/.exec(line.trim())?.[1].trim())
    .find((value) => value !== undefined && value !== '')
  if (id === undefined) throw fail('the front matter has no id')

  const rest = lines.slice(end + 1)
  const headingIndex = rest.findIndex((line) => line.trim() !== '')
  const heading = headingIndex === -1 ? '' : rest[headingIndex].trim()
  const title = heading.startsWith('# ') ? heading.slice(2).trim() : ''
  if (title === '') throw fail('the title line (# ) is missing after the front matter')

  const content = toParagraphs(rest.slice(headingIndex + 1).join('\n')).join('\n\n')
  if (content === '') throw fail('there is no text after the title')

  return { id, title, content }
}
