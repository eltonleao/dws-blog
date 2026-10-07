/** Splits the content of a post at its blank lines (LF or CRLF) into trimmed, non-empty paragraphs. */
export function toParagraphs(content: string): string[] {
  return content
    .split(/\r?\n\s*\r?\n/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph !== '')
}
