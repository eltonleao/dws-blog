import { describe, expect, it } from 'vitest'
import { parsePostFile } from './parsePostFile'

const FILE = 'src/content/posts/broken-post.en.md'

const valid = [
  '---',
  'id: 0b1c2d3e-0000-4000-8000-000000000001',
  '---',
  '# A clear title',
  '',
  'First paragraph.',
  '',
  'Second paragraph.',
  '',
].join('\n')

// The error has to name the file, so a broken post breaks the build with a
// message someone can act on.
function messageOf(raw: string): string {
  try {
    parsePostFile(raw, FILE)
  } catch (error) {
    return error instanceof Error ? error.message : String(error)
  }
  return ''
}

describe('parsePostFile', () => {
  it('K1 reads the id, the title and the paragraphs joined by a blank line', () => {
    expect(parsePostFile(valid, FILE)).toEqual({
      id: '0b1c2d3e-0000-4000-8000-000000000001',
      title: 'A clear title',
      content: 'First paragraph.\n\nSecond paragraph.',
    })
  })

  it('K1 throws an error that names the file when the id is missing', () => {
    const raw = valid.replace(/^id: .*\n/m, '')
    expect(() => parsePostFile(raw, FILE)).toThrow()
    expect(messageOf(raw)).toContain(FILE)
  })

  it('K1 throws an error that names the file when there is no front matter at all', () => {
    const raw = '# A clear title\n\nFirst paragraph.\n'
    expect(() => parsePostFile(raw, FILE)).toThrow()
    expect(messageOf(raw)).toContain(FILE)
  })

  it('K1 throws an error that names the file when the title line "# " is missing', () => {
    const raw = valid.replace('# A clear title', 'A clear title')
    expect(() => parsePostFile(raw, FILE)).toThrow()
    expect(messageOf(raw)).toContain(FILE)
  })

  it('K1 throws an error that names the file when there is no body after the title', () => {
    const raw = '---\nid: 0b1c2d3e-0000-4000-8000-000000000001\n---\n# A clear title\n\n   \n'
    expect(() => parsePostFile(raw, FILE)).toThrow()
    expect(messageOf(raw)).toContain(FILE)
  })
})
