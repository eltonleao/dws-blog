import { parseContent } from './parseContent'

// Every English post file, as text, in this module: the chunk of English.
export const content = parseContent(
  import.meta.glob<string>('./posts/*.en.md', { query: '?raw', import: 'default', eager: true }),
)
