import { describe, expect, it } from 'vitest'
import { parseContent } from './parseContent'

const file = (id: string, title: string, ...paragraphs: string[]) =>
  `---\nid: ${id}\n---\n# ${title}\n\n${paragraphs.join('\n\n')}\n`

const A = 'src/content/posts/first.en.md'
const B = 'src/content/posts/second.en.md'
const BROKEN = 'src/content/posts/broken.en.md'

describe('parseContent', () => {
  it('K1 builds the map from the id to the title and the content', () => {
    const map = parseContent({
      [A]: file('id-a', 'First', 'One.', 'Two.'),
      [B]: file('id-b', 'Second', 'Three.'),
    })
    expect(map).toEqual({
      'id-a': { title: 'First', content: 'One.\n\nTwo.' },
      'id-b': { title: 'Second', content: 'Three.' },
    })
  })

  it('K1 throws an error that names the file when a repeated id shows up', () => {
    const files = {
      [A]: file('id-a', 'First', 'One.'),
      [B]: file('id-a', 'Second', 'Two.'),
    }
    expect(() => parseContent(files)).toThrow()
    let message = ''
    try {
      parseContent(files)
    } catch (error) {
      message = error instanceof Error ? error.message : String(error)
    }
    expect(message).toMatch(/first\.en\.md|second\.en\.md/)
  })

  it('K1 throws an error that names the file when one of the files is malformed', () => {
    const files = {
      [A]: file('id-a', 'First', 'One.'),
      [BROKEN]: '---\nid: id-c\n---\nno heading here\n',
    }
    expect(() => parseContent(files)).toThrow(BROKEN)
  })
})
