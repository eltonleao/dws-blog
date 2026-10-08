import { parseContent } from './parseContent'

// Every Spanish post file, as text, in this module: the chunk of Spanish.
export const content = parseContent(
  import.meta.glob<string>('./posts/*.es.md', { query: '?raw', import: 'default', eager: true }),
)
