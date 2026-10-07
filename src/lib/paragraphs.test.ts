import { expect, it } from 'vitest'
import rawPosts from '../test/fixtures/posts.json'
import { toParagraphs } from './paragraphs'

it('D14 splits the API content in 3 paragraphs, splits on CRLF too, and never returns an empty paragraph', () => {
  expect(toParagraphs(rawPosts[0].content)).toHaveLength(3)

  expect(toParagraphs('first\r\n\r\nsecond')).toEqual(['first', 'second'])

  expect(toParagraphs('\n\n first \n\n\n\n \n second \n\n')).toEqual([
    'first',
    'second',
  ])
})
